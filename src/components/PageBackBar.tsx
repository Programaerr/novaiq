import React from 'react';
import { ArrowRight, Home } from 'lucide-react';
import { Language } from '../lib/i18n';

interface PageBackBarProps {
  language: Language;
  title: string;
  onBack: () => void;
  onHome: () => void;
}

// A slim glass strip pinned right under the main Navbar on every inner page (anything
// other than 'home') — without it, the only way back was the Navbar's hamburger menu,
// which isn't obvious as a "back" affordance. Kept as its own small component (rather
// than inlined per-page) so the back/home behavior and styling stay identical everywhere
// it's used.
export const PageBackBar: React.FC<PageBackBarProps> = ({ language, title, onBack, onHome }) => {
  const isAr = language === 'ar';

  return (
    <div className="page-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="w-px h-4 bg-white/10" />

        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{isAr ? 'الرئيسية' : 'Home'}</span>
        </button>

        <span className="w-px h-4 bg-white/10 hidden sm:block" />

        <span className="hidden sm:block text-xs font-medium text-zinc-500 truncate">{title}</span>
      </div>
    </div>
  );
};
