
import React from 'react';
import { Sparkles, Crown, Settings, HelpCircle } from 'lucide-react';
import { AppMode, User } from '../types';
import LanguageSelector from './LanguageSelector.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';

interface HeaderProps {
  user: User;
  path: string;
  mode: AppMode;
  navigateTo: (path: string, mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ user, path, mode, navigateTo }) => {
  const { t } = useLanguage();
  
  const navItems = [
    { label: t('nav.preview'), mode: AppMode.PREVIEW, path: '/dashboard' },
    { label: t('nav.edit'), mode: AppMode.EDIT, path: '/dashboard' },
    { label: t('nav.projects'), mode: AppMode.PROJECTS, path: '/projects' },
    { label: t('nav.shop'), mode: AppMode.SHOP, path: '/shop' },
    { label: t('nav.profile'), mode: AppMode.PROFILE, path: '/profile' },
  ];

  return (
    <header className="h-16 md:h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-3 md:px-8 z-50 shrink-0">
      <div className="flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0" onClick={() => navigateTo('/dashboard', AppMode.PREVIEW)}>
        <div className="relative">
          <Sparkles className="text-pink-500 relative z-10" size={22}/>
          <div className="absolute inset-0 bg-pink-500/20 blur-lg rounded-full animate-pulse"></div>
        </div>
        <span className="font-black text-[12px] md:text-sm uppercase tracking-[0.1em] md:tracking-[0.2em] flex flex-col md:flex-row md:gap-1 leading-tight">
          <span className="text-white">OneClick</span>
          <span className="text-pink-500">Studio</span>
        </span>
      </div>
      
      <nav className="hidden lg:flex bg-white/5 rounded-2xl p-1 items-center gap-1 border border-white/5 shadow-inner">
        {navItems.map((m) => (
          <button 
            key={m.label} 
            onClick={() => navigateTo(m.path, m.mode)} 
            className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all duration-300 ${((path === m.path && mode === m.mode)) ? 'nav-active bg-pink-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            {m.label}
          </button>
        ))}
        {user.isAdmin && (
          <button 
            onClick={() => navigateTo('/admin', AppMode.ADMIN)} 
            className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 border-l border-white/10 ml-2 ${path === '/admin' ? 'bg-pink-600 text-white' : 'text-pink-500 hover:bg-pink-500/5'}`}
          >
            <Crown size={12}/> 
            {t('nav.admin')}
          </button>
        )}
      </nav>
      
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="hidden sm:block">
          <LanguageSelector />
        </div>
        <button 
          onClick={() => navigateTo('/dashboard', AppMode.HELP)}
          className={`p-2 md:p-2.5 rounded-xl border border-white/5 transition-all ${mode === AppMode.HELP ? 'bg-pink-600 text-white border-pink-500' : 'bg-black/40 text-zinc-500 hover:text-white hover:border-white/10'}`}
          title={t('nav.help')}
        >
          <HelpCircle size={18} />
        </button>
        <button 
          onClick={() => navigateTo('/dashboard', AppMode.SETTINGS)}
          className={`p-2 md:p-2.5 rounded-xl border border-white/5 transition-all ${mode === AppMode.SETTINGS ? 'bg-pink-600 text-white' : 'bg-black/40 text-zinc-500 hover:text-white'}`}
          title={t('nav.settings')}
        >
          <Settings size={18} />
        </button>
        <div className="px-3 md:px-5 py-2 md:py-2.5 bg-black/40 border border-white/5 rounded-2xl text-[10px] md:text-[11px] font-black text-pink-500 shadow-sm uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]"></div>
          {user.tokens} <span className="hidden sm:inline">{t('common.tokens')}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
