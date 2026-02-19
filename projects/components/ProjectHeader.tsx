
import React from 'react';
import { Search, LayoutGrid, List, PlusCircle, Save, HardDrive, Database } from 'lucide-react';

interface ProjectHeaderProps {
  projectsCount: number;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewClick: () => void;
  onSaveClick: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  projectsCount, searchQuery, onSearchChange, viewMode, onViewModeChange, onNewClick, onSaveClick
}) => {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 bg-slate-900/40 p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      
      <div className="flex flex-col md:flex-row items-center gap-10">
        <div className="p-7 bg-cyan-500/10 rounded-[2rem] border border-cyan-500/20 text-cyan-400 shadow-inner group-hover:scale-105 transition-transform duration-500">
          <HardDrive size={40}/>
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase flex flex-col md:flex-row items-center gap-3">
            Managed <span className="text-cyan-400">Workspace</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
               <Database size={14} className="text-cyan-500"/>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{projectsCount} Total Units</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Cloud Sync Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5">
        <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus-within:border-cyan-500/40 transition-all min-w-[320px] shadow-inner">
          <Search className="text-zinc-600" size={20}/>
          <input 
            type="text" 
            placeholder="Query stubs..." 
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-white ml-4 w-full placeholder:text-zinc-800 font-bold tracking-[0.1em]"
          />
        </div>
        
        <div className="flex bg-slate-950/40 p-2 rounded-2xl border border-white/5 shadow-inner">
           <button onClick={() => onViewModeChange('grid')} className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-600 hover:text-white'}`}><LayoutGrid size={20}/></button>
           <button onClick={() => onViewModeChange('list')} className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-cyan-600 text-white shadow-lg' : 'text-zinc-600 hover:text-white'}`}><List size={20}/></button>
        </div>

        <button 
          onClick={onNewClick}
          className="px-8 py-5 bg-slate-800 border border-slate-700 rounded-2xl font-black uppercase text-[10px] text-zinc-300 hover:text-white hover:border-cyan-500/50 transition-all flex items-center gap-3 active:scale-95 shadow-xl"
        >
          <PlusCircle size={20}/> New Stub
        </button>
        
        <button 
          onClick={onSaveClick}
          className="px-10 py-5 bg-cyan-600 rounded-2xl font-black uppercase text-[10px] text-white shadow-2xl shadow-cyan-900/30 hover:bg-cyan-500 transition-all flex items-center gap-3 active:scale-95"
        >
          <Save size={20}/> Archive Current
        </button>
      </div>
    </div>
  );
};

export default ProjectHeader;
