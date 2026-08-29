import React from 'react';
import { Rocket, ArrowLeft } from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language } from '../lib/i18n';
import { NqButton } from './ui/NqButton';

interface ProjectCtaButtonProps {
  onCreateContract: () => void;
  language?: Language;
}

// Its own component rather than markup inlined at the call site. It used to render twice — once
// bridging the timeline and about sections on the home page, once at the foot of the dedicated
// timeline page — and only the second survives the home page's rebuild. Kept as a component
// because the label and the two glyphs are a decision about the offer, not about layout.
export const ProjectCtaButton: React.FC<ProjectCtaButtonProps> = ({ onCreateContract, language = 'ar' }) => {
  return (
    <div className="flex justify-center">
      {/* `white`, matching the ground MilestoneTimeline actually paints on its third pass — a
          WARM WHITE flat section, with this button sitting directly on it rather than inside the
          frosted panel above. `white` gives a dark Obsidian solid pill, which is what reads on a
          light ground; `obsidian` (a light pill for a genuinely dark ground) is what the
          templates grid's own cards use instead, now that those are the dark surface. */}
      <NqButton
        tone="white"
        variant="solid"
        size="lg"
        onClick={() => {
          onCreateContract();
          cosmicAudio.playWarp();
        }}
        className="uppercase tracking-[0.1em]"
        icon={<Rocket className="w-4 h-4 sm:w-5 sm:h-5" />}
        /* Just the action. "…and sign the contract now" named a second step the button does not
           take you to — the contract is at the end of the builder, not behind this press — and a
           label that promises two things when it does one is a label people stop believing. */
        trailing={<ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${language === 'en' ? 'rotate-180' : ''}`} />}
      >
        {language === 'ar' ? 'ابدأ تنفيذ مشروعك' : 'Start Your Project'}
      </NqButton>
    </div>
  );
};
