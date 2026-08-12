import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { templatesData } from '../data/templatesData';

interface FloatingTemplateCardsProps {
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
}

// Each column drifts at its own speed and against its neighbours — the same arrangement as the
// sign-in gallery, for the same reason. Columns moving together read as one sliding sheet cut
// into strips; different speeds and directions read as depth, which is the whole point of
// having three rather than one. Slow on purpose: this is the backdrop to a heading and a
// button, not the subject, and a belt that visibly races beside them competes with what the
// section is actually for.
const COLUMNS = [
  { duration: '38s', direction: 'up' as const },
  { duration: '50s', direction: 'down' as const },
  { duration: '44s', direction: 'up' as const },
];

/**
 * The "ready templates, every industry" section: a slow belt of the studio's own template
 * covers beside the heading that pitches them.
 *
 * ## Why this is not a 3D scene any more
 *
 * It used to be a real WebGL canvas — six lit, textured, physically damped cards under
 * three.js. It looked good and it was the single most expensive thing the site did, by a very
 * wide margin, for a reason no amount of tuning could remove: the cards drifted continuously,
 * so the renderer had to draw a new frame forever, and a phone answers a permanent 3D render
 * loop the way it answers a game — by running its GPU flat out until it is hot enough to
 * notice. Capping the frame rate helped; it did not change what the thing was.
 *
 * This does the same job — showing that there are many templates, in motion, attractively —
 * out of images and one CSS transform. The animation is a translate on a composited layer,
 * which the compositor runs off the main thread and which costs a modern device essentially
 * nothing whether it is on screen for five seconds or five minutes. Nothing here holds a GPU
 * context, and nothing draws a frame that is not a straight copy of pixels it already has.
 *
 * It also removes three.js, @react-three/fiber and drei from the page entirely: this was their
 * only consumer, so the ~890KB chunk they occupied is no longer built or fetched at all.
 */
export const FloatingTemplateCards: React.FC<FloatingTemplateCardsProps> = ({
  language,
  onExploreTemplates,
}) => {
  const isAr = language === 'ar';

  // Dealt round-robin rather than sliced into thirds, so three consecutive covers never end up
  // stacked in one column — sliced, the same categories would sit together and the belt would
  // read as sorted rather than scattered.
  const columns = useMemo(() => {
    const buckets: string[][] = COLUMNS.map(() => []);
    templatesData.forEach((t, i) => buckets[i % buckets.length].push(t.previewImage));
    // A short column still has to fill a tall frame twice over, so it repeats its own covers
    // until it can. Without this a column would show a visible gap sliding through the frame.
    return buckets.map((imgs) => {
      if (imgs.length === 0) return imgs;
      const filled = [...imgs];
      while (filled.length < 4) filled.push(...imgs);
      return filled;
    });
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 sm:mt-24 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-10">
      {/* The belt. Height is fixed so the section never reflows as the covers load. */}
      <div className="template-belt relative w-full sm:w-[30rem] h-72 sm:h-[26rem] shrink-0 select-none overflow-hidden">
        <div
          className="absolute inset-0 flex justify-center"
          style={{ gap: 'var(--belt-gap)' }}
          aria-hidden="true"
        >
          {columns.map((imgs, col) => {
            if (imgs.length === 0) return null;
            const { duration, direction } = COLUMNS[col];
            return (
              <div key={col} className="overflow-hidden shrink-0" style={{ width: 'var(--belt-w)' }}>
                {/* Spacing lives on the covers as margin, NOT as a flex `gap` on this track,
                    and that is load-bearing rather than stylistic. With `gap`, a track of 2n
                    items is 2n·item + (2n−1)·gap tall — one gap short of two identical halves —
                    so travelling exactly -50% lands half a gap from where the second copy
                    began, and the loop jumps once per cycle. Folding the gap into each item
                    makes the track exactly 2n·(item+gap), and -50% is then precisely one pass. */}
                <div
                  className="login-marquee__track flex flex-col"
                  style={{
                    animationName: direction === 'up' ? 'login-marquee-up' : 'login-marquee-down',
                    animationDuration: duration,
                    // Staggered starts so the seams between covers do not line up across the
                    // columns into one band marching down the frame.
                    marginTop: `calc(${-col} * (var(--belt-h) + var(--belt-gap)) / ${COLUMNS.length})`,
                  }}
                >
                  {/* Rendered twice — the second pass is what the -50% travel lands on, making
                      the loop seamless. */}
                  {[0, 1].map((pass) =>
                    imgs.map((src, i) => (
                      <div
                        key={`${pass}-${i}`}
                        className="relative shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10"
                        style={{ width: 'var(--belt-w)', height: 'var(--belt-h)', marginBottom: 'var(--belt-gap)' }}
                      >
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    )),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fades the columns into the page at top and bottom rather than letting them run into
            a hard cut. pointer-events-none so it cannot swallow anything. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, #000 0%, transparent 22%, transparent 78%, #000 100%)',
          }}
        />
      </div>

      {/* Text + single CTA, fully separate from the belt. */}
      <div className="text-center sm:text-start max-w-sm">
        <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
          {isAr ? 'قوالب جاهزة لكل قطاع' : 'Ready Templates, Every Industry'}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-5">
          {isAr
            ? 'تصفح مجموعة قوالبنا الاحترافية المصممة خصيصاً لقطاعك، وابدأ مشروعك خلال أيام بدل أسابيع.'
            : 'Browse our professional templates built for your industry, and launch your project in days instead of weeks.'}
        </p>
        <button
          type="button"
          onClick={onExploreTemplates}
          className="nq-btn nq-btn--solid px-6 py-3 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <span>{isAr ? 'استكشاف القوالب' : 'Explore Templates'}</span>
          {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
