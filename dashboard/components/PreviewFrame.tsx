
import React from 'react';
import { Smartphone, Monitor, Globe, ChevronLeft, ChevronRight, RotateCcw, ShieldCheck, SmartphoneNfc } from 'lucide-react';
import { WorkspaceType } from '../../types';

interface PreviewFrameProps {
  workspace: WorkspaceType;
  children: React.ReactNode;
  appName?: string;
  onReload?: () => void;
}

const PreviewFrame: React.FC<PreviewFrameProps> = ({ workspace, children, appName, onReload }) => {
  const isApp = workspace === 'app';

  return (
    <div className={`relative transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${
      isApp 
        ? 'w-[290px] h-[580px] shrink-0' 
        : 'w-full max-w-[90%] md:max-w-[1000px] aspect-video h-auto'
    }`}>
      
      {/* GLOW BACKGROUND EFFECT */}
      <div className={`absolute -inset-10 blur-[80px] opacity-20 transition-colors duration-1000 -z-10 ${isApp ? 'bg-pink-600' : 'bg-indigo-600'}`}></div>

      {/* THE ACTUAL FRAME */}
      <div className={`w-full h-full bg-black border-[12px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden transition-all duration-1000 ${
        isApp 
          ? 'rounded-[3.5rem] border-[#18181b] ring-1 ring-white/10' 
          : 'rounded-[1.5rem] border-zinc-800 ring-1 ring-white/5 shadow-2xl'
      }`}>
        
        {/* TOP BAR / BEZEL */}
        {isApp ? (
          <div className="h-7 w-full flex items-center justify-center relative bg-[#18181b] shrink-0">
             <div className="w-20 h-4 bg-black/40 rounded-b-2xl shadow-sm flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                <div className="w-6 h-1 rounded-full bg-zinc-800"></div>
             </div>
          </div>
        ) : (
          <div className="h-12 w-full bg-zinc-900 border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
             <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
             </div>
             
             <div className="flex-1 max-w-md bg-black/40 border border-white/5 rounded-lg h-7 flex items-center px-3 justify-between group">
                <div className="flex items-center gap-2 overflow-hidden">
                   <Globe size={10} className="text-zinc-500"/>
                   <span className="text-[10px] font-mono text-zinc-500 truncate select-none">https://admin.{appName?.toLowerCase() || 'studio'}.oneclick.io</span>
                </div>
                <RotateCcw 
                  size={10} 
                  className="text-zinc-600 cursor-pointer hover:text-white transition-colors" 
                  onClick={onReload}
                />
             </div>
             
             <div className="flex items-center gap-2 ml-auto">
                <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Verified Admin</div>
             </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 w-full bg-[#09090b] relative overflow-hidden">
           {children}
        </div>

        {/* BOTTOM NAV / BEZEL */}
        {isApp && (
          <div className="h-10 w-full flex items-center justify-center gap-14 bg-[#18181b] shrink-0">
             <div className="w-1.5 h-1.5 rounded-full bg-black/40"></div>
             <div className="w-10 h-1 rounded-full bg-black/40"></div>
          </div>
        )}
      </div>

      {/* DEVICE INDICATOR LABELS */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
         {isApp ? (
            <div className="flex items-center gap-2">
               <Smartphone size={12} className="text-pink-500"/>
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">High Performance Mobile Node</span>
            </div>
         ) : (
            <div className="flex items-center gap-2">
               <Monitor size={12} className="text-indigo-500"/>
               <span className="text-[9px] font-black uppercase tracking-[0.2em]">Enterprise Control Terminal</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default PreviewFrame;
