
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
  const [selectedFile, setSelectedFile] = useState('app/index.html');
  const [openTabs, setOpenTabs] = useState<string[]>(['app/index.html']);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastThought, setLastThought] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string[]>([]);
  const [waitingForApproval, setWaitingForApproval] = useState(false);

  const [buildStatus, setBuildStatus] = useState({ status: 'idle', message: '', apkUrl: '', webUrl: '', runUrl: '' });
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
  }, [projectFiles]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage({
        data: (reader.result as string).split(',')[1],
        mimeType: file.type,
        preview: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (customPrompt?: string, isAuto: boolean = false, overrideQueue?: string[]) => {
    if (isGenerating && !isAuto) return;
    const promptText = (customPrompt || input).trim();
    const activeQueue = overrideQueue !== undefined ? overrideQueue : executionQueue;
    
    if (waitingForApproval && !isAuto) {
      const lowerInput = promptText.toLowerCase();
      if (['yes', 'ha', 'proceed', 'y'].includes(lowerInput)) {
        setWaitingForApproval(false);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: "Yes, proceed.", timestamp: Date.now() }]);
        setInput('');
        const nextTask = activeQueue[0];
        const newQueue = activeQueue.slice(1);
        setExecutionQueue(newQueue);
        handleSend(`EXECUTE PHASE: ${nextTask}. Update files.`, true, newQueue);
        return;
      } else {
        setWaitingForApproval(false);
        setExecutionQueue([]);
        setCurrentPlan([]);
        setInput('');
        return;
      }
    }

    const currentModel = projectConfig.selected_model || 'gemini-3-flash-preview';
    setIsGenerating(true);
    setCurrentAction("Engineering Node...");
    
    try {
      const currentImage = selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined;
      if (!isAuto) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: promptText, image: selectedImage?.preview, timestamp: Date.now() }]);
        setInput('');
        setSelectedImage(null);
      }

      const res = await gemini.current.generateWebsite(
        promptText, 
        projectFilesRef.current, 
        messages, 
        currentImage, 
        projectConfig, 
        workspace,
        currentModel
      );
      
      if (res.thought) setLastThought(res.thought);
      
      let updatedFiles = { ...projectFilesRef.current };
      if (res.files) {
        updatedFiles = { ...updatedFiles, ...res.files };
        setProjectFiles(updatedFiles);
        projectFilesRef.current = updatedFiles;
      }

      // Handle Master Plan logic
      let nextPlan = res.plan || [];
      if (nextPlan.length > 0 && !isAuto) {
        setCurrentPlan(nextPlan);
        setExecutionQueue(nextPlan.slice(1));
      } else if (nextPlan.length === 0 && !isAuto) {
        setCurrentPlan([]);
        setExecutionQueue([]);
      }

      const hasMoreSteps = (isAuto && activeQueue.length > 0) || (!isAuto && nextPlan.length > 1);
      let isApproval = false;
      let assistantResponse = res.answer;

      if (hasMoreSteps) {
        const nextStepName = isAuto ? activeQueue[0] : nextPlan[1];
        assistantResponse += `\n\n**Next Step:** ${nextStepName}\nShall I proceed?`;
        setWaitingForApproval(true);
        isApproval = true;
      }

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        role: 'assistant', 
        content: assistantResponse, 
        plan: isAuto ? currentPlan : (res.plan || []),
        questions: res.questions,
        timestamp: Date.now(),
        isApproval,
        model: currentModel,
        files: res.files 
      }]);

      if (currentProjectId && user) {
        await db.updateProject(user.id, currentProjectId, updatedFiles, projectConfig);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
      setCurrentAction(null);
    }
  };

  const handleBuildAPK = async (onMissingConfig: () => void) => {
    if (!user) return;
    if (!githubConfig.token || !githubConfig.owner || !githubConfig.repo) {
      onMissingConfig();
      return;
    }
    
    setBuildStatus({ status: 'pushing', message: 'Syncing source code to GitHub...', apkUrl: '', webUrl: '', runUrl: '' });
    setBuildSteps([{ name: 'Source Synchronization', status: 'in_progress', conclusion: null }]);

    try {
      const githubService = new GithubService();
      await githubService.pushToGithub(githubConfig, projectFiles, projectConfig);
      setBuildSteps(prev => [
        { ...prev[0], status: 'completed', conclusion: 'success' },
        { name: 'Build Engine Triggered', status: 'in_progress', conclusion: null }
      ]);
      
      setBuildStatus({ status: 'building', message: 'GitHub Actions is compiling...', apkUrl: '', webUrl: '', runUrl: '' });
      
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 60) { clearInterval(poll); setBuildStatus({ status: 'idle', message: 'Build timed out.' }); return; }

        const res = await githubService.getLatestApk(githubConfig);
        if (res && res.downloadUrl) {
          clearInterval(poll);
          setBuildStatus({ status: 'success', message: 'Build success!', apkUrl: res.downloadUrl, webUrl: res.webUrl, runUrl: res.runUrl });
          setBuildSteps(prev => [prev[0], { name: 'Build Engine Triggered', status: 'completed', conclusion: 'success' }, { name: 'Binary Generation', status: 'completed', conclusion: 'success' }]);
        }
      }, 10000);
    } catch (err: any) {
      addToast(err.message, 'error');
      setBuildStatus({ status: 'idle', message: err.message });
    }
  };

  const loadProject = (project: Project) => {
    setCurrentProjectId(project.id);
    localStorage.setItem('active_project_id', project.id);
    setProjectFiles(project.files || {});
    setProjectConfig(project.config || { appName: 'OneClickApp', packageName: 'com.oneclick.studio', selected_model: 'gemini-3-flash-preview' });
    const paths = Object.keys(project.files || {});
    if (paths.length > 0) {
      const entry = paths.find(p => p.includes('index.html')) || paths[0];
      setSelectedFile(entry);
      setOpenTabs([entry]);
    }
    addToast(`Project ${project.name} loaded`, 'success');
  };

  const handleRollback = async (files: Record<string, string>, message: string) => {
    setProjectFiles(files);
    setPreviewOverride(null);
    setShowHistory(false);
    addToast(`Restored to: ${message}`, 'success');
    if (currentProjectId && user) await db.updateProject(user.id, currentProjectId, files, projectConfig);
  };

  const addFile = (path: string) => { setProjectFiles(prev => ({ ...prev, [path]: '' })); openFile(path); };
  const deleteFile = (path: string) => {
    setProjectFiles(prev => { const next = { ...prev }; delete next[path]; return next; });
    setOpenTabs(prev => prev.filter(t => t !== path));
    if (selectedFile === path) setSelectedFile('');
  };
  const renameFile = (oldPath: string, newPath: string) => {
    setProjectFiles(prev => { const next = { ...prev }; next[newPath] = next[oldPath]; delete next[oldPath]; return next; });
    setOpenTabs(prev => prev.map(t => t === oldPath ? newPath : t));
    if (selectedFile === oldPath) setSelectedFile(newPath);
  };
  const openFile = (path: string) => { setSelectedFile(path); if (!openTabs.includes(path)) setOpenTabs(prev => [...prev, path]); };
  const closeFile = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextTabs = openTabs.filter(t => t !== path);
    setOpenTabs(nextTabs);
    if (selectedFile === path) setSelectedFile(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : '');
  };
  const refreshHistory = async () => {
    if (!currentProjectId) return;
    setIsHistoryLoading(true);
    try { setHistory(await db.getProjectHistory(currentProjectId)); } finally { setIsHistoryLoading(false); }
  };
  const handleDeleteSnapshot = async (id: string) => {
    if (!window.confirm("Delete snapshot?")) return;
    await db.deleteProjectSnapshot(id);
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  return {
    currentProjectId, workspace, setWorkspace, mobileTab, setMobileTab,
    messages, input, setInput, isGenerating, currentAction, executionQueue, 
    projectFiles, setProjectFiles, 
    projectConfig, setProjectConfig, selectedFile, setSelectedFile,
    openTabs, toasts, addToast, removeToast, lastThought, currentPlan,
    buildStatus, setBuildStatus, buildSteps, isDownloading, selectedImage,
    setSelectedImage, handleImageSelect, history, isHistoryLoading, showHistory,
    setShowHistory, handleRollback, previewOverride, setPreviewOverride,
    githubConfig, setGithubConfig, handleSend, handleBuildAPK,
    handleSecureDownload: () => addToast("Preparing download...", "info"),
    loadProject, addFile, deleteFile, renameFile, openFile, closeFile, waitingForApproval,
    refreshHistory, handleDeleteSnapshot
  };
};
