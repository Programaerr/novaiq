import React, { useEffect, useMemo, useRef } from 'react';
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
 * It also keeps three.js and @react-three/fiber off this page entirely. They are still built,
 * for CredentialCard3D, but that chunk is lazy — so nothing here fetches ~890KB of 3D engine.
 */
export const FloatingTemplateCards: React.FC<FloatingTemplateCardsProps> = ({
  language,
  onExploreTemplates,
}) => {
  const isAr = language === 'ar';

  // The belt only runs while it is on screen.
  //
  // This section sits well below the fold, so on an ordinary visit the three columns spent the
  // whole time the visitor was reading the hero animating six tall image layers nobody could
  // see. A composited transform is cheap per frame but it is not free, and — the part that
  // actually matters — it keeps the compositor producing frames continuously, which is the cost
  // that shows up as a warm device rather than as stutter. Paused rather than removed, so the
  // belt is exactly where it was when it scrolls back into view.
  const beltRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = beltRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) delete el.dataset.beltOff;
        else el.dataset.beltOff = 'true';
      },
      // A margin, so the belt is already moving by the time its first pixel appears — arriving
      // at a frozen belt that then starts is more noticeable than the saving is worth.
      { rootMargin: '200px 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

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
      <div
        ref={beltRef}
        className="template-belt relative w-full sm:w-[30rem] h-72 sm:h-[26rem] shrink-0 select-none overflow-hidden"
        // Faded top and bottom by a mask rather than by a black gradient laid over the top.
        //
        // The overlay that used to do this painted solid #000 at both ends, which worked only for
        // as long as the page behind it was solid black. With a lit background moving behind the
        // belt it stopped being a fade and became two black bars — a dark box bolted around the
        // section, which is exactly the "strange shadow" it looked like. A mask removes the
        // pixels instead of painting over them, so the belt dissolves into whatever is actually
        // behind it, whatever that happens to be at the time.
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)',
        }}
      >
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
