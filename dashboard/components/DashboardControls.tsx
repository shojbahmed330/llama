
import React, { useState } from 'react';
import { MessageSquare, Smartphone, Rocket, Zap, Settings, HelpCircle, History, X, SlidersHorizontal, LayoutGrid, Menu } from 'lucide-react';
import { WorkspaceType, AppMode } from '../../types';

interface DashboardControlsProps {
  mobileTab: 'chat' | 'preview';
  setMobileTab: (t: 'chat' | 'preview') => void;
  workspace: WorkspaceType;
  setWorkspace: (w: WorkspaceType) => void;
  handleBuildAPK: () => void;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  isGenerating?: boolean;
}

export const MobileControls: React.FC<DashboardControlsProps> = ({ 
  mobileTab, setMobileTab, workspace, setWorkspace, handleBuildAPK, 
  onOpenConfig, onOpenHistory, onOpenHelp, isGenerating 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 1. TOP CONTROL CENTER */}
      <div className={`lg:hidden fixed top-[75px] left-0 right-0 z-[450] px-4 pointer-events-none flex justify-between items-start transition-opacity duration-300 ${isGenerating ? 'opacity-0' : 'opacity-100'}`}>
        {/* Mode Pill */}
        <div className="bg-black/90 backdrop-blur-2xl p-1 rounded-full border border-white/10 flex gap-1 shadow-2xl pointer-events-auto ring-1 ring-white/5 w-[200px]">
          <button 
            onClick={() => setMobileTab('chat')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[9px] font-black uppercase transition-all duration-500 ${mobileTab === 'chat' ? 'bg-pink-600 text-white shadow-lg' : 'text-zinc-500'}`}
          >
            <MessageSquare size={12}/> <span>Chat</span>
          </button>
          <button 
            onClick={() => setMobileTab('preview')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[9px] font-black uppercase transition-all duration-500 ${mobileTab === 'preview' ? 'bg-pink-600 text-white shadow-lg' : 'text-zinc-500'}`}
          >
            <Smartphone size={12}/> <span>Visual</span>
          </button>
        </div>

        {/* 2. FLOATING ACTION HUB - Relocated to Top-Right to avoid Send Button confusion */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all duration-500 shadow-2xl border border-white/10 active:scale-95 ${isOpen ? 'bg-zinc-800 rotate-90 border-pink-500/50' : 'bg-black/80 backdrop-blur-xl'}`}
          >
            {isOpen ? <X size={20}/> : <Menu size={20} className="text-pink-500"/>}
          </button>

          {isOpen && (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <button onClick={() => { onOpenHistory(); setIsOpen(false); }} className="w-12 h-12 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-zinc-400 shadow-2xl active:scale-90 transition-all">
                <History size={18} />
              </button>
              <button onClick={() => { onOpenConfig(); setIsOpen(false); }} className="w-12 h-12 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-zinc-400 shadow-2xl active:scale-90 transition-all">
                <SlidersHorizontal size={18} />
              </button>
              <button onClick={() => { onOpenHelp(); setIsOpen(false); }} className="w-12 h-12 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-zinc-400 shadow-2xl active:scale-90 transition-all">
                <HelpCircle size={18} />
              </button>
              <button onClick={() => { handleBuildAPK(); setIsOpen(false); }} className="w-12 h-12 bg-pink-600 border border-white/20 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_30px_rgba(236,72,153,0.3)] active:scale-90 transition-all">
                <Rocket size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. CONTEXTUAL WORKSPACE TOGGLE (Inside Preview Area) */}
      {mobileTab === 'preview' && (
        <div className={`lg:hidden fixed top-[135px] left-1/2 -translate-x-1/2 z-[440] pointer-events-none transition-opacity duration-300 ${isGenerating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="bg-zinc-900/95 backdrop-blur-2xl p-0.5 rounded-full border border-white/5 flex gap-1 shadow-xl pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-700">
            <button 
              onClick={() => setWorkspace('app')}
              className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase transition-all ${workspace === 'app' ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' : 'text-zinc-600'}`}
            >
              App
            </button>
            <button 
              onClick={() => setWorkspace('admin')}
              className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase transition-all ${workspace === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-600'}`}
            >
              Admin
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const DesktopBuildButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div className="hidden lg:block fixed bottom-12 right-12 z-[200] animate-in slide-in-from-right-10 duration-1000">
    <button onClick={onClick} className="group relative flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 bg-[length:200%_auto] hover:bg-right rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] text-white shadow-[0_15px_40px_rgba(236,72,153,0.3)] hover:scale-105 active:scale-95 transition-all duration-700 ring-1 ring-white/20">
      <div className="relative z-10 flex items-center gap-3">
        <Rocket size={20} className="group-hover:animate-bounce" />
        <span>Execute Build</span>
        <Zap size={14} className="text-white/60 group-hover:animate-pulse" />
      </div>
    </button>
  </div>
);
