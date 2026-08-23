import React, { useEffect, useRef, useState } from 'react';

import dashboard from '../assets/images/templates/dashboard.webp';
import editor from '../assets/images/templates/editor.webp';
import storefront from '../assets/images/templates/storefront.webp';
import mobileApp from '../assets/images/templates/mobile-app.webp';
import landing from '../assets/images/templates/landing.webp';

/**
 * The five stills, in the order they play.
 *
 * Deliberately five different KINDS of software rather than five views of one product: a
 * dashboard, an IDE, a storefront, a phone app and a marketing page. Someone arriving at the
 * sign-in screen has usually not decided what they want built yet, and a panel that cycles
 * through one product's screens answers a question they did not ask. Five categories say
 * "this is the range", which is the only thing a sign-in screen has room to say.
 *
 * They are drawn in the site's own palette — INK ground, PERIWINKLE accents, SAND on the
 * second series — rather than in whatever colours a stock screenshot happens to carry. The
 * panel they sit on is periwinkle, and five unrelated colour schemes rotating against it
 * would read as a slideshow bolted onto the card rather than as part of it.
 *
 * Ordered so no two neighbours share a silhouette: the dashboard is dense and gridded, the
 * editor is a wall of text, the storefront is a grid of photographs, the app is one object
 * centred in space, the landing page is centred type. A crossfade between two frames that
 * look alike reads as a glitch rather than as a change.
 */
const SHOTS: readonly { src: string; key: string }[] = [
  { src: dashboard, key: 'dashboard' },
  { src: editor, key: 'editor' },
  { src: storefront, key: 'storefront' },
  { src: mobileApp, key: 'mobile-app' },
  { src: landing, key: 'landing' },
];

/** How long each still holds, and how long the crossfade between two of them takes. */
const HOLD_MS = 5000;
const FADE_MS = 900;

/**
 * The rotating template panel in the sign-in card's second half.
 *
 * Replaces a live cube field, and the trade is deliberate: the field was atmosphere, and this
 * says what the company sells. It is also a fraction of the cost — five WebP stills totalling
 * under 100 KB against a WebGL context, a shader compile and an animation loop, on the one
 * screen where the visitor is waiting on an auth round trip rather than looking around.
 *
 * Three things gate the rotation, all of them the same gates the cube fields use:
 *
 *   - `prefers-reduced-motion` stops it outright. This is also what answers WCAG 2.2.2: the
 *     sequence auto-updates and runs longer than five seconds, so it needs a way to be
 *     stopped, and the site's answer to that everywhere else is the same media query.
 *   - `html[data-idle]` pauses it while the tab is in the background or the window has lost
 *     focus. A timer swapping images for nobody is the same waste as a render loop doing it.
 *   - Hovering the panel pauses it, so a still that catches someone's eye can be looked at.
 *
 * Images are mounted progressively rather than all at once. This is the FIRST page of the
 * site a visitor sees, often on a phone connection, and five stills in the initial document
 * would be ~100 KB competing with the sign-in button for bandwidth. One is mounted at first
 * paint; each advance mounts one more, always keeping exactly one loaded ahead of what is on
 * screen — a crossfade into an undecoded image is a flash of empty panel.
 */
export const TemplateShowcase: React.FC = () => {
  const [shown, setShown] = useState(0);
  const [mounted, setMounted] = useState(1);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);
  const firstLoaded = useRef(false);

  /* `data-idle` is set on <html> when the tab is backgrounded, the window minimised or another
     window takes focus — see usePauseOffscreenWork(). Every CSS animation on the site stops on
     it, and so does every WebGL loop; a swap timer is no different. */
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    if (reduced || idle || hovered) return;
    const t = window.setInterval(() => {
      setShown((s) => (s + 1) % SHOTS.length);
      setMounted((m) => Math.min(SHOTS.length, m + 1));
    }, HOLD_MS);
    return () => window.clearInterval(t);
  }, [reduced, idle, hovered]);

  return (
    /* The periwinkle mat is the parent's (`.nq-coast`); this only insets the stills off it.
       Full bleed was the other option and it loses the blue entirely — the card's second half
       would go from the site's accent colour to a dark rectangle, which is a bigger change to
       the composition than the one that was asked for. Inset, the panel still reads as the
       blue half, with the work shown ON it. */
    <div
      className="absolute inset-0 p-4 sm:p-5 lg:p-7"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative w-full h-full rounded-[0.4rem] overflow-hidden"
        style={{
          /* A dark bed under the stills. They are all INK-grounded, so this is invisible once
             one has decoded — its job is the first paint and the phone band, where a very wide
             short slot can letterbox a portrait still rather than filling it. */
          background: '#101322',
          boxShadow: '0 18px 40px -18px rgba(16, 19, 34, 0.55), inset 0 0 0 1px rgba(246, 241, 233, 0.12)',
        }}
      >
        {SHOTS.slice(0, mounted).map((shot, i) => (
          <img
            key={shot.key}
            src={shot.src}
            alt=""
            /* Decorative, and the empty alt is the honest call: nothing in these stills is
               needed to sign in, and five descriptions of imaginary software read out before
               the Google button would be noise. The wrapper in LoginPage is aria-hidden. */
            aria-hidden="true"
            draggable={false}
            /* `object-top` and not `center`. Every still is a full page taller than the slot it
               lands in, so something has to be cropped; the top of a screen is the part that
               identifies it — a nav bar, a headline, a phone's status bar — and the bottom is
               usually a footer that identifies nothing. */
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{
              opacity: i === shown ? 1 : 0,
              transition: reduced ? 'none' : `opacity ${FADE_MS}ms ease-in-out`,
            }}
            /* The first still is what the visitor sees while the page settles, so it is fetched
               at high priority; the rest arrive during the five seconds it holds. */
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            onLoad={() => {
              if (i !== 0 || firstLoaded.current) return;
              firstLoaded.current = true;
              setMounted((m) => Math.max(m, 2));
            }}
          />
        ))}
      </div>
    </div>
  );
};
