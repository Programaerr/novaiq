import React, { useMemo } from 'react';
import { templatesData } from '../data/templatesData';

interface HeroProofStripProps {
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
}

/**
 * The proof, moved to where it does its job: directly under the hero.
 *
 * ## What this is answering
 *
 * A visitor arriving at the site was given a headline, a paragraph and two buttons — all of them
 * claims. The evidence that this is a software studio at all, the studio's own screens, sat far
 * enough down the page that most people would never reach it. Nothing above the fold could be
 * told apart from any other agency's landing page, because words are the one thing every agency
 * has.
 *
 * So the work comes up to meet them. Within the first screenful you now get the claim and the
 * evidence for it in the same glance: a headline, a moving band of real interfaces this studio
 * built, and one way in. It takes about a second to read and it settles the question the copy
 * spends three lines trying to answer.
 *
 * ## Why it moves, and why that is free
 *
 * A still row of screenshots reads as a logo wall. A moving one reads as a portfolio that
 * continues past the edge of the screen — it implies there is more, which is the point.
 *
 * The motion is a single CSS translate on a composited layer, so the compositor runs it off the
 * main thread and it costs a modern device essentially nothing. It stops entirely when the tab
 * is hidden or the visitor has been still for a few seconds, through the same pause rules
 * everything else here obeys, and it never runs at all under reduced-motion.
 */
export const HeroProofStrip: React.FC<HeroProofStripProps> = ({ language, onExploreTemplates }) => {
  const isAr = language === 'ar';

  // Rendered twice so the -50% travel lands the second copy exactly where the first began. The
  // duplicate is the mechanism, not an oversight — see the marquee note in index.css.
  const covers = useMemo(() => templatesData.map((t) => t.previewImage), []);

  if (covers.length === 0) return null;

  return (
    <section
      className="hero-proof relative w-full mt-10 sm:mt-14"
      aria-label={isAr ? 'أعمال من صناعتنا' : 'Work from the studio'}
    >
      {/* One line of context above the evidence. Kept to a single clause: the band itself is the
          argument, and a paragraph over it would be the site explaining its own proof. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 flex items-baseline justify-between gap-4">
        <p className="text-xs sm:text-sm text-zinc-400">
          {isAr
            ? 'واجهات من تنفيذنا — جاهزة للتركيب على مشروعك'
            : 'Interfaces we built — ready to fit your project'}
        </p>
        <button
          type="button"
          onClick={onExploreTemplates}
          className="shrink-0 text-xs sm:text-sm font-bold text-white/90 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors cursor-pointer"
        >
          {isAr ? 'شاهد الكل' : 'See all'}
        </button>
      </div>

      {/* Masked rather than covered by a black gradient: a mask removes pixels, so the band
          dissolves into whatever is behind it instead of stamping two dark bars over it. */}
      <div
        className="hero-proof__frame relative overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        }}
      >
        <div className="hero-proof__track flex w-max" aria-hidden="true">
          {[0, 1].map((pass) =>
            covers.map((src, i) => (
              <div
                key={`${pass}-${i}`}
                className="hero-proof__cover relative shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-white/10"
              >
                <img
                  src={src}
                  alt=""
                  loading={pass === 0 && i < 4 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroProofStrip;
