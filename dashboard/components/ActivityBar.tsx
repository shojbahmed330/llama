
import React from 'react';
import { Files, Search, Settings, History, Code2, Sparkles, Brain, Terminal } from 'lucide-react';

export type SidebarView = 'explorer' | 'search' | 'history' | 'config' | 'thinking' | 'terminal';

interface ActivityBarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange }) => {
  const items = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'thinking', icon: Brain, label: 'Neural Insights' },
    { id: 'history', icon: History, label: 'Version Timeline' },
  ];

  return (
    <div className="w-14 bg-[#09090b] border-r border-white/5 flex flex-col items-center py-4 gap-4 shrink-0 z-20">
      <div className="mb-4 text-pink-500">
        <Sparkles size={24} className="animate-pulse" />
      </div>
      
      {items.map((item) => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as SidebarView)}
            title={item.label}
            className={`p-3 rounded-xl transition-all relative group ${isActive ? 'text-white bg-white/5' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
          >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-pink-500 rounded-r-full shadow-[0_0_10px_#ec4899]"></div>}
            <item.icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''} />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-[9px] text-white font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
               {item.label}
            </div>
          </button>
        );
      })}

      <div className="mt-auto flex flex-col gap-2">
        <button 
          onClick={() => onViewChange('config')}
          className={`p-3 transition-colors ${activeView === 'config' ? 'text-pink-500' : 'text-zinc-600 hover:text-white'}`}
          title="Project Config"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};

export default ActivityBar;
