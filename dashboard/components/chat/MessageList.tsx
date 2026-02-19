
import React, { useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Cpu, Brain, Code, FileText, Save, Terminal, Zap, Clock } from 'lucide-react';
import MessageItem from './MessageItem';
import ChatEmptyState from './ChatEmptyState';
import { useLanguage } from '../../../i18n/LanguageContext';

interface MessageListProps {
  messages: any[];
  isGenerating: boolean;
  currentAction?: string | null;
  handleSend: (extraData?: string) => void;
  waitingForApproval?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isGenerating, currentAction, handleSend, waitingForApproval }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isGenerating, currentAction]);

  const getActionIcon = () => {
    if (!currentAction) return <RefreshCw className="animate-spin" size={16}/>;
    const action = currentAction.toLowerCase();
    if (action.includes('analyz')) return <Brain size={16} className="animate-pulse" />;
    if (action.includes('read')) return <FileText size={16} className="animate-bounce" />;
    if (action.includes('edit') || action.includes('patch')) return <Code size={16} className="animate-pulse" />;
    if (action.includes('save') || action.includes('synthes')) return <Save size={16} className="animate-bounce" />;
    return <Cpu size={16} className="animate-spin" />;
  };

  return (
    <div 
      ref={scrollRef}
      className="flex-1 p-6 overflow-y-auto space-y-10 pt-32 md:pt-6 pb-48 scroll-smooth custom-scrollbar relative"
    >
      {messages.length > 0 ? (
        messages.map((m, idx) => (
          <MessageItem 
            key={m.id || idx} 
            message={m} 
            index={idx} 
            handleSend={handleSend} 
            isLatest={idx === messages.length - 1}
            waitingForApproval={waitingForApproval}
          />
        ))
      ) : (
        <ChatEmptyState />
      )}
      
      {isGenerating && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[380px]">
           {/* Step Counter Style UI from Screenshot */}
           <div className="p-5 bg-[#121214] border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-1 bg-pink-500/20 w-full overflow-hidden">
                 <div className="h-full bg-pink-500 w-[40%] animate-[loading-bar_2s_infinite]"></div>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500">
                    {getActionIcon()}
                 </div>
                 <div className="flex flex-col flex-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500/80">Engineering Core</span>
                    <span className="text-[11px] font-bold text-white mt-0.5 animate-pulse">
                       {currentAction || 'Initializing Multi-Agent Node...'}
                    </span>
                 </div>
                 <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                    <Clock size={10} className="text-zinc-500"/>
                    <span className="text-[8px] font-black text-zinc-500">REALTIME</span>
                 </div>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-4">
                 <div className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-pink-500"></div>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Injecting Neural Logic</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                    <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Applying Code Patches</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
      `}</style>
    </div>
  );
};

export default MessageList;
