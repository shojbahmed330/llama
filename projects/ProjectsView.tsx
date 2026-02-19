
import React, { useState, useEffect } from 'react';
import { Loader2, Terminal } from 'lucide-react';
import { Project } from '../types';
import { DatabaseService } from '../services/dbService';
import { useLanguage } from '../i18n/LanguageContext';

// Sub-components
import ProjectHeader from './components/ProjectHeader';
import ProjectCard from './components/ProjectCard';
import ProjectModals from './components/ProjectModals';

interface ProjectsViewProps {
  userId: string;
  currentFiles: Record<string, string>;
  onLoadProject: (project: Project) => void;
  onSaveCurrent: (name: string) => Promise<any>;
  onCreateNew: (name: string) => Promise<any>;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ 
  userId, onLoadProject, onSaveCurrent, onCreateNew 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();
  
  const [showModal, setShowModal] = useState<'save' | 'new' | null>(null);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const db = DatabaseService.getInstance();

  const fetchProjects = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await db.getProjects(userId);
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Projects Fetch Error:", e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const handleAction = async () => {
    if (!projectNameInput.trim()) return;
    setIsProcessing(true);
    try {
      const cleanName = projectNameInput.trim();
      let newProj;
      if (showModal === 'save') {
        newProj = await onSaveCurrent(cleanName);
      } else {
        newProj = await onCreateNew(cleanName);
      }
      
      setShowModal(null);
      setProjectNameInput('');
      await fetchProjects();
      
      if (newProj) onLoadProject(newProj);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      alert("Critical: No session detected.");
      return;
    }

    const confirmed = window.confirm("SECURITY ALERT: This will permanently erase this project stub from the cloud. Proceed?");
    if (!confirmed) return;
    
    setDeletingId(id);
    try {
      await db.deleteProject(userId, id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (localStorage.getItem('active_project_id') === id) {
        localStorage.removeItem('active_project_id');
      }
    } catch (err: any) {
      alert("System Error: Could not terminate project. Reason: " + (err.message || "Access Denied"));
      fetchProjects();
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    try {
      await db.renameProject(userId, id, renameValue);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameValue } : p));
      setIsRenaming(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-[#020617] custom-scrollbar text-zinc-100">
      <div className="max-w-7xl mx-auto space-y-10 pb-32 animate-in fade-in duration-1000">
        
        <ProjectHeader 
          projectsCount={projects.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewClick={() => setShowModal('new')}
          onSaveClick={() => setShowModal('save')}
        />

        {loading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-3xl animate-pulse rounded-full"></div>
              <Loader2 className="animate-spin text-cyan-500 relative z-10" size={60}/>
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-700">Polling Cloud Nodes...</span>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10" : "space-y-6"}>
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id}
                project={project}
                viewMode={viewMode}
                isActive={localStorage.getItem('active_project_id') === project.id}
                isRenaming={isRenaming === project.id}
                renameValue={renameValue}
                onRenameClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  setIsRenaming(project.id);
                  setRenameValue(project.name);
                }}
                onRenameChange={setRenameValue}
                onRenameCancel={() => setIsRenaming(null)}
                onRenameSubmit={(e) => handleRenameSubmit(e, project.id)}
                onDelete={(e) => handleDelete(e, project.id)}
                onLoad={() => onLoadProject(project)}
                isDeleting={deletingId === project.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/20 p-24 rounded-[4rem] text-center border-dashed border-zinc-800 border-2 max-w-4xl mx-auto space-y-12 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-cyan-500/[0.02] -z-10 group-hover:bg-cyan-500/[0.04] transition-colors"></div>
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full animate-pulse"></div>
               <div className="w-36 h-36 bg-cyan-600/10 rounded-[3rem] flex items-center justify-center mx-auto text-cyan-500 border border-cyan-500/20 relative z-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700 shadow-2xl">
                  <Terminal size={64}/>
               </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Repository Offline</h3>
              <p className="text-[11px] text-zinc-600 uppercase font-black tracking-[0.5em] max-w-sm mx-auto leading-loose">No active production stubs detected in your cloud storage cluster.</p>
            </div>
            <button 
              onClick={() => setShowModal('new')}
              className="px-16 py-7 bg-cyan-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] hover:bg-cyan-500 transition-all shadow-2xl shadow-cyan-950/40 active:scale-95"
            >
              Initialize Node
            </button>
          </div>
        )}
      </div>

      <ProjectModals 
        showModal={showModal}
        onClose={() => setShowModal(null)}
        projectNameInput={projectNameInput}
        onInputChange={setProjectNameInput}
        isProcessing={isProcessing}
        onAction={handleAction}
      />
    </div>
  );
};

export default ProjectsView;
