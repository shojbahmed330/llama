
import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Sparkles } from 'lucide-react';

const ChatEmptyState: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-6">
      <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500 animate-pulse">
        <Sparkles size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-white uppercase tracking-tight">{t('chat.empty_title')}</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">{t('chat.secure_uplink')}</p>
      </div>
      <p className="text-xs text-zinc-500 max-w-[280px] leading-relaxed font-medium uppercase tracking-widest">
        {t('chat.empty_desc')}
      </p>
    </div>
  );
};

export default ChatEmptyState;
