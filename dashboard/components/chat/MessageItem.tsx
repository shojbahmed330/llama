
import React, { useState } from 'react';
import { Sparkles, Zap, Database, Copy, Check, ListChecks, ArrowUpRight, CheckCircle2, XCircle, Cpu, Cloud, Brain } from 'lucide-react';
import Questionnaire from '../Questionnaire';
import { useLanguage } from '../../../i18n/LanguageContext';

interface MessageItemProps {
  message: any;
  index: number;
  handleSend: (extraData?: string) => void;
  isLatest?: boolean;
  waitingForApproval?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message: m, index: idx, handleSend, isLatest }) => {
  const { t } = useLanguage();
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectionMade, setSelectionMade] = useState(false);

  const sqlFile = m.files && m.files['database.sql'];
  
  // Refined check for local models
  const isLocal = m.role === 'assistant' && (
    m.model?.toLowerCase().includes('local') || 
    m.model?.toLowerCase().includes('llama') || 
    m.model?.toLowerCase().includes('qwen') ||
    m.model?.toLowerCase().includes('coder')
  );

  const copySql = () => {
    if (sqlFile) {
      navigator.clipboard.writeText(sqlFile);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const onApprovalClick = (choice: 'Yes' | 'No') => {
    if (selectionMade) return;
    setSelectionMade(true);
    handleSend(choice);
  };
  
  return (
    <div 
      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both w-full`}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <div className="flex flex-col items-start w-full max-w-full">
        {m.role === 'assistant' && (
          <div className="flex items-center gap-3 mb-3 ml-2">
            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${isLocal ? 'bg-amber-500/10 border-amber-500/30' : 'bg-pink-500/10 border-pink-500/30'}`}>
              {isLocal ? <Cpu size={12} className="text-amber-500"/> : <Sparkles size={12} className="text-pink-500"/>}
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLocal ? 'text-amber-500' : 'text-pink-500'}`}>
                {isLocal ? 'Neural Local Agent' : 'Neural Cloud Agent'}
              </span>
              <span className="text-[7px] font-black uppercase text-zinc-600 tracking-[0.1em] flex items-center gap-1">
                {isLocal ? <><Cpu size={8}/> Local Host ({m.model?.split(':')[0] || 'Ollama'})</> : <><Cloud size={8}/> Google Cloud (Gemini)</>}
              </span>
            </div>
          </div>
        )}
        
        <div className="w-full">
          {m.role === 'assistant' && m.thought && (
            <div className="mb-4 ml-2 animate-in fade-in slide-in-from-top-2 duration-700">
               <div className="flex items-center gap-2 mb-2 text-zinc-600">
                  <Brain size={12}/>
                  <span className="text-[9px] font-black uppercase tracking-widest">Internal Reasoning Phase</span>
               </div>
               <p className="text-[11px] font-medium text-zinc-500 bg-white/5 border border-white/5 rounded-2xl p-4 italic border-l-2 border-l-pink-500/50 max-w-[90%]">
                 {m.thought}
               </p>
            </div>
          )}

          <div className={`
            max-w-[95%] md:max-w-[92%] p-5 rounded-3xl text-[13px] leading-relaxed transition-all relative break-words overflow-hidden w-full
            ${m.role === 'user' 
              ? 'bg-pink-600 text-white rounded-tr-sm self-end shadow-lg ml-auto' 
              : 'bg-white/5 border border-white/10 rounded-tl-sm self-start text-zinc-300'}
          `}>
            {m.image && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                <img src={m.image} className="w-full max-h-[300px] object-cover" alt="Uploaded" />
              </div>
            )}

            {m.plan && m.plan.length > 0 && m.role === 'assistant' && (
              <div className="mb-6 bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                   <ListChecks size={16} className={isLocal ? 'text-amber-500' : 'text-pink-500'} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Execution Plan</span>
                </div>
                <div className="space-y-3">
                  {m.plan.map((step: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${isLocal ? 'bg-amber-500/10 border-amber-500/30' : 'bg-pink-500/10 border-pink-500/30'}`}>
                         <span className={`text-[9px] font-black ${isLocal ? 'text-amber-500' : 'text-pink-500'}`}>{i + 1}</span>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-400 leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative z-10 whitespace-pre-wrap font-medium">
              {m.content && m.content.split(/(\*\*.*?\*\*)/g).map((part: string, i: number) => 
                part.startsWith('**') && part.endsWith('**') 
                ? <strong key={i} className={m.role === 'user' ? 'text-white' : (isLocal ? 'text-amber-500' : 'text-pink-400')} style={{fontWeight: 900}}>{part.slice(2, -2)}</strong> 
                : part
              )}
            </div>

            {m.isApproval && isLatest && !selectionMade && (
              <div className="mt-8 flex flex-col sm:flex-row gap-3 animate-in slide-in-from-top-6 duration-700">
                 <button 
                    onClick={() => onApprovalClick('Yes')}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-400/20"
                 >
                    <CheckCircle2 size={16} />
                    Yes, Proceed
                 </button>
                 <button 
                    onClick={() => onApprovalClick('No')}
                    className="flex-1 flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 hover:bg-red-600/10 hover:border-red-500/40 text-zinc-400 hover:text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                 >
                    <XCircle size={16} />
                    No, Stop
                 </button>
              </div>
            )}

            {sqlFile && m.role === 'assistant' && (
              <div className="mt-5 p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-500 rounded-xl text-white shadow-lg"><Database size={16}/></div>
                     <div className="text-[10px] font-black uppercase text-white">Database Schema</div>
                  </div>
                  <button onClick={copySql} className={`p-2 rounded-lg transition-all ${copiedSql ? 'bg-green-500 text-white' : 'bg-white/5 text-indigo-400'}`}>
                    {copiedSql ? <Check size={14}/> : <Copy size={14}/>}
                  </button>
                </div>
              </div>
            )}

            {m.questions && m.questions.length > 0 && !m.answersSummary && (
              <Questionnaire 
                questions={m.questions} 
                onComplete={(answers) => handleSend(answers)}
                onSkip={() => handleSend("Proceed with defaults.")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
