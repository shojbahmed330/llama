
import React, { useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Cpu, Brain, Code, FileText, Save } from 'lucide-react';
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
    if (action.includes('save')) return <Save size={16} className="animate-bounce" />;
    return <Cpu size={16} className="animate-spin" />;
  };

  const isLocalActive = currentAction?.toLowerCase().includes('llama') || currentAction?.toLowerCase().includes('local');

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
        <div className={`flex flex-col gap-4 p-6 bg-black/40 backdrop-blur-2xl rounded-3xl border animate-in fade-in slide-in-from-left-4 duration-500 max-w-[340px] shadow-2xl relative overflow-hidden group ${isLocalActive ? 'border-amber-500/20' : 'border-pink-500/20'}`}>
          <div className="absolute top-0 left-0 h-1 bg-white/5 w-full overflow-hidden">
             <div className={`h-full w-[60%] animate-[loading-bar_1.5s_infinite] ${isLocalActive ? 'bg-amber-500' : 'bg-pink-500'}`}></div>
          </div>
          
          <div className={`flex items-center gap-4 ${isLocalActive ? 'text-amber-500' : 'text-pink-500'}`}>
             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${isLocalActive ? 'bg-amber-500/10 border-amber-500/20' : 'bg-pink-500/10 border-pink-500/20'}`}>
                {getActionIcon()}
             </div>
             <div className="flex flex-col flex-1 overflow-hidden">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLocalActive ? 'text-amber-500/80' : 'text-pink-500/80'}`}>
                    {isLocalActive ? 'Local Neural Engine' : 'Cloud Neural Engine'}
                </span>
                <span className="text-[11px] font-bold text-white truncate animate-pulse mt-0.5">
                   {currentAction || 'Processing Stream...'}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isLocalActive ? 'bg-amber-500' : 'bg-pink-500'}`}></div>
             <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Live Agent Activity Logs</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  );
};

export default MessageList;
