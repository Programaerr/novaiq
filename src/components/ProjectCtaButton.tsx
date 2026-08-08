import React from 'react';
import { Rocket, ArrowLeft } from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language } from '../lib/i18n';

interface ProjectCtaButtonProps {
  onCreateContract: () => void;
  language?: Language;
}

// Its own component rather than markup inlined at each call site: it renders twice —
// once bridging the timeline and about sections on the home page, once standing alone
// at the foot of the dedicated timeline page — and both need the exact same button.
export const ProjectCtaButton: React.FC<ProjectCtaButtonProps> = ({ onCreateContract, language = 'ar' }) => {
  return (
    <div className="flex justify-center">
      <button
        onClick={() => {
          onCreateContract();
          cosmicAudio.playWarp();
        }}
        className="nq-btn nq-btn--solid px-4 py-2.5 text-xs gap-2 sm:px-8 sm:py-4 sm:text-sm sm:gap-3 rounded-full font-extrabold uppercase tracking-[0.1em] inline-flex items-center cursor-pointer"
      >
        <span className="nq-btn-beam" aria-hidden="true" />
        <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>{language === 'ar' ? 'ابدأ تنفيذ مشروعك ووقع العقد الآن' : 'Start Your Project & Sign Contract Now'}</span>
        <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${language === 'en' ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};
