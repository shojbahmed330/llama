
import { GithubConfig, ProjectConfig } from "../types";
import { WORKFLOW_YAML } from "./github/workflow";
import { toBase64 } from "./github/utils";

export class GithubService {
  async createRepo(token: string, repoName: string): Promise<string> {
    const headers = { 
      'Authorization': `token ${token}`, 
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    
    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) throw new Error("GitHub authentication failed.");
    const userData = await userRes.json();
    const username = userData.login;
    
    const checkRes = await fetch(`https://api.github.com/repos/${username}/${repoName}`, { headers });
    
    if (!checkRes.ok) {
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: repoName, private: false, auto_init: true })
      });
      if (!createRes.ok && createRes.status !== 422) throw new Error("Failed to create repository.");
      
      // Wait longer to ensure repo metadata is initialized
      await new Promise(r => setTimeout(r, 3000));
      
      // Attempt to enable Pages multiple times if it fails
      for (let i = 0; i < 3; i++) {
        const pagesRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ build_type: 'workflow' })
        });
        if (pagesRes.ok) break;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return username;
  }

  async pushToGithub(config: GithubConfig, files: Record<string, string>, appConfig?: ProjectConfig, customMessage?: string) {
    const { token, owner, repo } = config;
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' };

    let sanitizedAppId = (appConfig?.packageName || 'com.oneclick.studio').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const capConfig = { appId: sanitizedAppId, appName: appConfig?.appName || 'OneClickApp', webDir: 'www' };
    
    // Prepare files, but keep workflow separate
    const allFiles: Record<string, string> = { 
        ...files, 
        'capacitor.config.json': JSON.stringify(capConfig, null, 2)
    };

    if (appConfig?.icon) allFiles['assets/icon-only.png'] = appConfig.icon;
    
    // Production Keystore Handling
    if (appConfig?.keystore_base64) {
      allFiles['android/app/release-key.jks'] = appConfig.keystore_base64;
      // Note: We are pushing a base64 string that contains the binary data. 
      // Our loop below handles the stripping of data URI prefix.
    }

    const filePaths = Object.keys(allFiles);
    
    // Push regular files first
    for (const path of filePaths) {
      const content = allFiles[path];
      const isBinary = content.startsWith('data:') || path.startsWith('assets/') || path.endsWith('.jks');
      const finalContent = isBinary ? content.split(',')[1] || content : toBase64(content);

      const getRes = await fetch(`${baseUrl}/contents/${path}`, { headers });
      let sha: string | undefined;
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }

      await fetch(`${baseUrl}/contents/${path}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${customMessage || "Sync"} [${path}]`, content: finalContent, sha })
      });
    }

    // CRITICAL: Push the workflow file LAST
    const workflowPath = '.github/workflows/android.yml';
    const getWorkflowRes = await fetch(`${baseUrl}/contents/${workflowPath}`, { headers });
    let workflowSha: string | undefined;
    if (getWorkflowRes.ok) {
      const data = await getWorkflowRes.json();
      workflowSha = data.sha;
    }

    // Prepare modified Workflow YAML with actual secrets from config
    let finalWorkflow = WORKFLOW_YAML;
    if (appConfig?.keystore_base64) {
        finalWorkflow = finalWorkflow
            .replace('SIGNING_STORE_PASSWORD: ""', `SIGNING_STORE_PASSWORD: "${appConfig.keystore_password}"`)
            .replace('SIGNING_KEY_ALIAS: ""', `SIGNING_KEY_ALIAS: "${appConfig.key_alias}"`)
            .replace('SIGNING_KEY_PASSWORD: ""', `SIGNING_KEY_PASSWORD: "${appConfig.key_password}"`);
    }

    await fetch(`${baseUrl}/contents/${workflowPath}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: `Trigger Build Engine [${workflowPath}]`, 
        content: toBase64(finalWorkflow), 
        sha: workflowSha 
      })
    });
  }

  async getRunDetails(config: GithubConfig) {
    const headers = { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' };
    const runsRes = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/actions/runs?per_page=1`, { headers });
    if (!runsRes.ok) return null;
    const data = await runsRes.json();
    const latestRun = data.workflow_runs?.[0];
    if (!latestRun) return null;

    const jobsRes = await fetch(latestRun.jobs_url, { headers });
    const jobsData = await jobsRes.json();
    return { run: latestRun, jobs: jobsData.jobs || [] };
  }

  async getLatestApk(config: GithubConfig) {
    const details = await this.getRunDetails(config);
    if (!details || details.run.status !== 'completed') return null;

    const headers = { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' };
    const artifactsRes = await fetch(details.run.artifacts_url, { headers });
    const data = await artifactsRes.json();
    
    const apk = data.artifacts?.find((a: any) => a.name === 'app-debug' || a.name === 'app-release');
    const bundle = data.artifacts?.find((a: any) => a.name === 'app-release-bundle');
    
    return { 
      downloadUrl: apk?.archive_download_url, 
      bundleUrl: bundle?.archive_download_url,
      webUrl: `https://${config.owner}.github.io/${config.repo}/`,
      runUrl: details.run.html_url
    };
  }

  async downloadArtifact(config: GithubConfig, url: string) {
    const res = await fetch(url, { headers: { 'Authorization': `token ${config.token}` } });
    if (!res.ok) throw new Error("Download failed.");
    return await res.blob();
  }
}
