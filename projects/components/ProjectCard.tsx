
import React from 'react';
import { FileCode, Clock, Layers, Trash2, Edit3, Box, ShieldCheck, ChevronRight, Loader2 } from 'lucide-react';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  viewMode: 'grid' | 'list';
  isRenaming: boolean;
  renameValue: string;
  onRenameClick: (e: React.MouseEvent) => void;
  onRenameSubmit: (e: React.FormEvent) => void;
  onRenameChange: (val: string) => void;
  onRenameCancel: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onLoad: () => void;
  isDeleting: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project, isActive, viewMode, isRenaming, renameValue, onRenameClick, onRenameSubmit, onRenameChange, onRenameCancel, onDelete, onLoad, isDeleting
}) => {
  const fileCount = project.files ? Object.keys(project.files).length : 0;

  if (viewMode === 'list') {
    return (
      <div className={`group flex items-center justify-between p-8 rounded-[2rem] bg-slate-900/30 border transition-all ${isActive ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5 hover:bg-slate-900/60 hover:border-cyan-500/20'} ${isDeleting ? 'opacity-30' : ''}`}>
        <div className="flex items-center gap-10">
          <div className={`p-5 rounded-2xl ${isActive ? 'bg-cyan-500 text-white shadow-xl' : 'bg-slate-800 text-zinc-500 group-hover:text-cyan-400'}`}>
            <FileCode size={24}/>
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-white text-xl group-hover:text-cyan-400 transition-colors tracking-tight">{project.name}</h4>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] flex items-center gap-2"><Clock size={14}/> {new Date(project.updated_at).toLocaleDateString()}</span>
              <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em] flex items-center gap-2"><Layers size={14}/> {fileCount} Files</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button 
            disabled={isDeleting}
            onClick={onDelete} 
            className="p-4 bg-red-500/5 text-zinc-800 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20"
          >
            {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20}/>}
          </button>
          <button onClick={onLoad} className={`px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] transition-all ${isActive ? 'bg-cyan-600 text-white shadow-xl' : 'bg-slate-800 text-zinc-400 hover:text-white hover:bg-cyan-600'}`}>Mount</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative p-10 rounded-[3.5rem] bg-slate-900/30 border transition-all duration-700 flex flex-col gap-12 overflow-hidden ${isActive ? 'border-cyan-500/40 ring-1 ring-cyan-500/20 shadow-2xl' : 'border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/60'} ${isDeleting ? 'opacity-30 grayscale' : ''}`}
    >
      <div className={`absolute -top-32 -right-32 w-80 h-80 blur-[120px] rounded-full transition-opacity duration-1000 ${isActive ? 'bg-cyan-500/10 opacity-100' : 'bg-cyan-500/5 opacity-0 group-hover:opacity-100'}`}></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-6 flex-1">
          <div className="flex items-center gap-5">
            <div className={`p-5 rounded-[1.75rem] transition-all ${isActive ? 'bg-cyan-600 text-white shadow-2xl shadow-cyan-900/40' : 'bg-slate-800 text-zinc-500 group-hover:text-cyan-400 group-hover:bg-cyan-500/5'}`}>
              <Box size={32}/>
            </div>
            {isActive && (
              <div className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Live Stub</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {isRenaming ? (
              <form onSubmit={onRenameSubmit} className="flex items-center gap-2">
                <input 
                  autoFocus 
                  value={renameValue} 
                  onChange={e => onRenameChange(e.target.value)} 
                  onBlur={onRenameCancel} 
                  className="bg-black/60 border border-cyan-500/40 rounded-2xl px-6 py-4 text-sm text-white outline-none w-full font-bold shadow-inner" 
                />
              </form>
            ) : (
              <h4 className="text-3xl font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-1 tracking-tighter uppercase">
                {project.name}
              </h4>
            )}
            <div className="flex items-center gap-4 text-[11px] font-black text-zinc-600 uppercase tracking-[0.3em]">
              <Clock size={16} className="opacity-40"/> {new Date(project.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-10 group-hover:translate-x-0 duration-500">
          <button onClick={onRenameClick} className="p-4 bg-slate-800 hover:bg-cyan-600 text-zinc-500 hover:text-white rounded-2xl transition-all border border-white/5 shadow-xl"><Edit3 size={18}/></button>
          <button 
            disabled={isDeleting}
            onClick={onDelete} 
            className="p-4 bg-red-900/10 hover:bg-red-600 text-zinc-800 hover:text-white rounded-2xl transition-all border border-red-500/10 shadow-xl"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin text-red-500" /> : <Trash2 size={18}/>}
          </button>
        </div>
      </div>

      <div className="mt-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-4">
              <Layers size={18} className="text-cyan-500/50"/>
              <span className="text-[11px] font-black uppercase text-zinc-500 tracking-[0.3em]">
                {fileCount} Production Files
              </span>
           </div>
           <div className="text-[11px] font-mono text-zinc-800">#{project.id.slice(0, 6)}</div>
        </div>
        
        <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden shadow-inner border border-white/5">
          <div className={`h-full transition-all duration-[2s] rounded-full ${isActive ? 'bg-cyan-500 w-full shadow-[0_0_20px_#06b6d4]' : 'bg-zinc-800 w-[60%]'}`}></div>
        </div>

        <button 
          onClick={onLoad}
          className={`w-full py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 group/btn shadow-2xl ${isActive ? 'bg-cyan-600 text-white shadow-cyan-950/40' : 'bg-slate-800 text-zinc-500 hover:text-white hover:bg-cyan-600'}`}
        >
          {isActive ? <ShieldCheck size={22}/> : <ChevronRight size={22} className="group-hover/btn:translate-x-2 transition-transform"/>}
          {isActive ? 'CURRENTLY ACTIVE' : 'INITIALIZE STUDIO'}
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
