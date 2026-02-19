
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User as UserType, ProjectConfig, Project, WorkspaceType, BuildStep, GithubConfig, ChatMessage, AIModel } from '../types';
import { GeminiService } from '../services/geminiService';
import { DatabaseService } from '../services/dbService';
import { GithubService } from '../services/githubService';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'healing';
}

export const useAppLogic = (user: UserType | null, setUser: (u: UserType | null) => void) => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(localStorage.getItem('active_project_id'));
  const [workspace, setWorkspace] = useState<WorkspaceType>('app');
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [executionQueue, setExecutionQueue] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const projectFilesRef = useRef<Record<string, string>>({});
  
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({ 
    appName: 'OneClickApp', 
    packageName: 'com.oneclick.studio',
    selected_model: 'gemini-3-flash-preview'
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedFile, setSelectedFile] = useState('app/index.html');
  const [openTabs, setOpenTabs] = useState<string[]>(['app/index.html']);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastThought, setLastThought] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string[]>([]);
  const [waitingForApproval, setWaitingForApproval] = useState(false);

  const [buildStatus, setBuildStatus] = useState<{status: string; message: string; apkUrl: string; webUrl: string; runUrl: string}>({ 
    status: 'idle', message: '', apkUrl: '', webUrl: '', runUrl: '' 
  });
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewOverride, setPreviewOverride] = useState<Record<string, string> | null>(null);
  
  const [githubConfig, setGithubConfig] = useState<GithubConfig>({ 
    token: user?.github_token || '', 
    owner: user?.github_owner || '', 
    repo: user?.github_repo || '' 
  });

  const gemini = useRef(new GeminiService());
  const github = useRef(new GithubService());
  const db = DatabaseService.getInstance();

  useEffect(() => {
    projectFilesRef.current = projectFiles;
    if (selectedFile && !projectFiles[selectedFile]) {
      const keys = Object.keys(projectFiles);
      if (keys.length > 0) setSelectedFile(keys[0]);
    }
  }, [projectFiles]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setCurrentAction(null);
      addToast("AI Output Terminated.", "info");
    }
  };

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setSelectedImage({
        data: base64.split(',')[1],
        mimeType: file.type,
        preview: base64
      });
    };
    reader.readAsDataURL(file);
  };

  const openFile = (path: string) => {
    setSelectedFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
  };

  const closeFile = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== path);
    setOpenTabs(newTabs);
    if (selectedFile === path && newTabs.length > 0) {
      setSelectedFile(newTabs[newTabs.length - 1]);
    } else if (newTabs.length === 0) {
      setSelectedFile('');
    }
  };

  const addFile = (path: string) => {
    if (projectFiles[path]) return;
    setProjectFiles(prev => ({ ...prev, [path]: '' }));
    openFile(path);
  };

  const deleteFile = (path: string) => {
    const newFiles = { ...projectFiles };
    delete newFiles[path];
    setProjectFiles(newFiles);
    closeFile(path);
  };

  const renameFile = (oldPath: string, newPath: string) => {
    if (projectFiles[newPath]) return;
    const content = projectFiles[oldPath];
    const newFiles = { ...projectFiles };
    delete newFiles[oldPath];
    newFiles[newPath] = content;
    setProjectFiles(newFiles);
    setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t));
    if (selectedFile === oldPath) setSelectedFile(newPath);
  };

  const handleSend = async (customPrompt?: string, isAuto: boolean = false, overrideQueue?: string[]) => {
    if (isGenerating && !isAuto) return;
    const promptText = (customPrompt || input).trim();
    if (!promptText && !selectedImage) return;

    const activeQueue = overrideQueue !== undefined ? overrideQueue : executionQueue;
    const currentModel = projectConfig.selected_model || 'gemini-3-flash-preview';

    // Handle Approval
    if (waitingForApproval && !isAuto) {
      const lowerInput = promptText.toLowerCase();
      if (['yes', 'ha', 'proceed', 'y', 'correct'].includes(lowerInput)) {
        setWaitingForApproval(false);
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: "Yes, proceed.", timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        const nextTask = activeQueue[0];
        const newQueue = activeQueue.slice(1);
        setExecutionQueue(newQueue);
        handleSend(`DECISION: User confirmed. Execute the plan: ${nextTask}`, true, newQueue);
        return;
      }
    }

    setIsGenerating(true);
    setCurrentAction("Engineering Node...");
    abortControllerRef.current = new AbortController();
    
    try {
      const currentImage = selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined;
      let currentMessages = [...messages];
      
      if (!isAuto) {
        const userMsg: ChatMessage = { 
          id: Date.now().toString(), 
          role: 'user', 
          content: promptText, 
          image: selectedImage?.preview, 
          timestamp: Date.now() 
        };
        currentMessages.push(userMsg);
        setMessages(currentMessages);
        setInput('');
        setSelectedImage(null);
      }

      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), model: currentModel }]);

      let fullJsonString = '';
      let streamedAnswer = '';
      
      const stream = gemini.current.generateWebsiteStream(
        promptText, 
        projectFilesRef.current, 
        currentMessages, 
        currentImage, 
        projectConfig, 
        workspace,
        currentModel,
        abortControllerRef.current.signal
      );

      for await (const chunk of stream) {
        fullJsonString += chunk;
        if (fullJsonString.includes('"answer":')) setCurrentAction("Drafting Implementation...");
        else if (fullJsonString.includes('"files":')) setCurrentAction("Writing Production Code...");
        else if (fullJsonString.includes('"questions":')) setCurrentAction("Analyzing Requirements...");

        try {
          const match = fullJsonString.match(/"answer":\s*"([^"]*)"/);
          if (match && match[1]) {
            const currentAnswerPart = match[1];
            if (currentAnswerPart !== streamedAnswer) {
              streamedAnswer = currentAnswerPart;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: streamedAnswer } : m));
            }
          }
        } catch (e) {}
      }

      const res = JSON.parse(fullJsonString);
      if (res.thought) setLastThought(res.thought);
      
      let updatedFiles = { ...projectFilesRef.current };
      if (res.files && Object.keys(res.files).length > 0) {
        updatedFiles = { ...updatedFiles, ...res.files };
        setProjectFiles(updatedFiles);
        projectFilesRef.current = updatedFiles;
        const firstFile = Object.keys(res.files)[0];
        if (firstFile) openFile(firstFile);
        addToast("Files implemented successfully!", "success");
      }

      let nextPlan = res.plan || [];
      if (nextPlan.length > 0 && !isAuto) {
        setCurrentPlan(nextPlan);
        setExecutionQueue(nextPlan.slice(1));
      }

      const hasMoreSteps = (isAuto && activeQueue.length > 0) || (!isAuto && nextPlan.length > 1);
      let isApproval = false;
      let finalAssistantResponse = res.answer;

      if (hasMoreSteps) {
        const nextStepName = isAuto ? activeQueue[0] : nextPlan[1];
        finalAssistantResponse += `\n\n**Next Objective:** ${nextStepName}\nShall I proceed with implementation?`;
        setWaitingForApproval(true);
        isApproval = true;
      }

      const finalAssistantMsg: ChatMessage = { 
        id: assistantId, role: 'assistant', content: finalAssistantResponse, 
        plan: isAuto ? currentPlan : (res.plan || []), questions: res.questions,
        isApproval, model: currentModel, files: res.files, thought: res.thought, timestamp: Date.now()
      };

      const finalMessages = [...currentMessages, finalAssistantMsg];
      setMessages(finalMessages);

      if (currentProjectId && user) {
        await db.updateProject(user.id, currentProjectId, updatedFiles, projectConfig);
        await db.supabase.from('projects').update({ messages: finalMessages }).eq('id', currentProjectId);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') console.log("Generation aborted");
      else addToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
      setCurrentAction(null);
      abortControllerRef.current = null;
    }
  };

  const handleBuildAPK = async (onRedirect?: () => void) => {
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      addToast("GitHub Infrastructure is not configured. Please setup in settings.", "error");
      onRedirect?.();
      return;
    }

    setBuildStatus({ status: 'pushing', message: 'Uplinking source code...', apkUrl: '', webUrl: '', runUrl: '' });
    setBuildSteps([{ name: 'Source Analysis', status: 'completed', conclusion: 'success' }, { name: 'Cloud Sync', status: 'in_progress', conclusion: null }]);

    try {
      await github.current.pushToGithub(githubConfig, projectFilesRef.current, projectConfig);
      setBuildSteps(prev => prev.map(s => s.name === 'Cloud Sync' ? { ...s, status: 'completed', conclusion: 'success' } : s).concat([{ name: 'Build Engine Trigger', status: 'in_progress', conclusion: null }]));
      
      setBuildStatus(prev => ({ ...prev, status: 'building', message: 'Build Engine Initialized. Polling status...' }));
      
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const details = await github.current.getRunDetails(githubConfig);
        if (details) {
          const { run, jobs } = details;
          const mappedSteps: BuildStep[] = jobs.flatMap((j: any) => (j.steps || []).map((s: any) => ({
            name: s.name,
            status: s.status === 'completed' ? 'completed' : s.status === 'in_progress' ? 'in_progress' : 'queued',
            conclusion: s.conclusion as any
          })));
          setBuildSteps(mappedSteps);

          if (run.status === 'completed') {
            clearInterval(interval);
            if (run.conclusion === 'success') {
              const apk = await github.current.getLatestApk(githubConfig);
              setBuildStatus({ status: 'success', message: 'Compilation successful!', apkUrl: apk?.downloadUrl || '', webUrl: apk?.webUrl || '', runUrl: apk?.runUrl || '' });
              addToast("Build engine completed successfully!", "success");
            } else {
              setBuildStatus({ status: 'error', message: 'Build failed. Check GitHub Actions for logs.', apkUrl: '', webUrl: '', runUrl: run.html_url });
              addToast("Build failed. See logs for details.", "error");
            }
          }
        }
        if (attempts > 120) { clearInterval(interval); setBuildStatus({ status: 'error', message: 'Timeout polling build status.', apkUrl: '', webUrl: '', runUrl: '' }); }
      }, 10000);
    } catch (e: any) {
      setBuildStatus({ status: 'error', message: e.message, apkUrl: '', webUrl: '', runUrl: '' });
      addToast(e.message, "error");
    }
  };

  const handleSecureDownload = async () => {
    if (!buildStatus.apkUrl) return;
    setIsDownloading(true);
    try {
      const blob = await github.current.downloadArtifact(githubConfig, buildStatus.apkUrl);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectConfig.appName || 'app'}-build.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      addToast("Secure download failed: " + e.message, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const loadProject = (project: Project) => {
    setCurrentProjectId(project.id);
    localStorage.setItem('active_project_id', project.id);
    setProjectFiles(project.files || {});
    projectFilesRef.current = project.files || {};
    setMessages(project.messages || []);
    setProjectConfig(project.config || { appName: 'OneClickApp', packageName: 'com.oneclick.studio', selected_model: 'gemini-3-flash-preview' });
    const keys = Object.keys(project.files || {});
    if (keys.length > 0) { setSelectedFile(keys[0]); setOpenTabs([keys[0]]); }
  };

  return {
    currentProjectId, workspace, setWorkspace, mobileTab, setMobileTab,
    messages, input, setInput, isGenerating, currentAction, executionQueue, 
    projectFiles, setProjectFiles, 
    projectConfig, setProjectConfig, selectedFile, setSelectedFile,
    openTabs, toasts, addToast, removeToast: (id: string) => setToasts(prev => prev.filter(t => t.id !== id)),
    lastThought, currentPlan,
    buildStatus, setBuildStatus, buildSteps, isDownloading, selectedImage,
    setSelectedImage, handleImageSelect, history, isHistoryLoading, showHistory,
    setShowHistory, handleRollback: async () => {}, previewOverride, setPreviewOverride,
    githubConfig, setGithubConfig, handleSend, handleStop, handleBuildAPK,
    handleSecureDownload, loadProject, addFile, deleteFile, renameFile, 
    openFile, closeFile, waitingForApproval,
    refreshHistory: async () => {}, handleDeleteSnapshot: async () => {}
  };
};
