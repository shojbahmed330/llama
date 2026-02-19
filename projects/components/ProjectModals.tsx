
import React from 'react';
import { X, Save, PlusCircle, Loader2, ChevronRight } from 'lucide-react';

interface ProjectModalsProps {
  showModal: 'save' | 'new' | null;
  onClose: () => void;
  projectNameInput: string;
  onInputChange: (val: string) => void;
  isProcessing: boolean;
  onAction: () => void;
}

const ProjectModals: React.FC<ProjectModalsProps> = ({
  showModal, onClose, projectNameInput, onInputChange, isProcessing, onAction
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/98 backdrop-blur-2xl p-6 animate-in fade-in duration-500">
       <div className="bg-slate-900 border border-white/5 p-16 rounded-[4rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-700 ring-1 ring-white/10">
          <button onClick={onClose} className="absolute top-12 right-12 p-4 bg-white/5 hover:bg-red-500/20 rounded-2xl text-zinc-600 hover:text-red-500 transition-all"><X size={28}/></button>
          
          <div className="text-center mb-14">
            <div className="w-28 h-28 bg-cyan-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-cyan-400 border border-cyan-500/20 shadow-inner">
              {showModal === 'save' ? <Save size={44}/> : <PlusCircle size={44}/>}
            </div>
            <h3 className="text-4xl font-black text-white uppercase tracking-tighter">
              {showModal === 'save' ? 'Archive' : 'Initialize'} <span className="text-cyan-500">Resource</span>
            </h3>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-5">Assign unique metadata identity</p>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase text-zinc-500 ml-8 tracking-[0.3em]">Resource Stub Name</label>
              <input 
                autoFocus 
                value={projectNameInput} 
                onChange={e => onInputChange(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && onAction()} 
                placeholder="e.g. Finance Hub v1.0" 
                className="w-full bg-black/50 border border-white/10 rounded-[2.5rem] p-8 text-white text-lg outline-none focus:border-cyan-500/50 transition-all font-black placeholder:text-zinc-800 shadow-inner" 
              />
            </div>
            
            <button 
              disabled={isProcessing || !projectNameInput.trim()} 
              onClick={onAction} 
              className="w-full py-8 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl shadow-cyan-900/40 active:scale-95 transition-all flex items-center justify-center gap-5 group"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={28}/>
              ) : (
                <>Deploy to Cluster <ChevronRight size={28} className="group-hover:translate-x-2 transition-transform"/></>
              )}
            </button>
          </div>
       </div>
    </div>
  );
};

export default ProjectModals;
