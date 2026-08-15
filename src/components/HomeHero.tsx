import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, ArrowUpRight, Menu, X } from 'lucide-react';
import { Language } from '../lib/i18n';
import { NovaiqLogo } from './NovaiqLogo';

/**
 * The home page's first section: the claim, the work, and a header of its own.
 *
 * ## It carries its own header
 *
 * Every other page on this site sits under the floating Navbar. This one does not — App.tsx hides
 * that bar on `home` and drops <main>'s top padding, and the header below takes over. That is why
 * the section is `min-h-[100svh]` rather than the viewport less the navbar's band: there is no band
 * to subtract any more, the header is INSIDE the thing it sits on.
 *
 * The trade is that everything the shared bar provides has to be provided here too, or it simply
 * disappears for anyone who lands on the home page — which is most people. So the header carries
 * the same seven destinations, the language toggle and the way into the contract flow.
 *
 * ## The backdrop
 *
 * A video, a vignette and a canvas of drifting motes, in that order back to front. The video is
 * colour-corrected rather than used as shot: it is a red sphere, and this site has no red in it
 * anywhere, so a hue rotation carries it round to the violet the rest of the section is built from.
 * The vignette is an ellipse rather than a linear fade — a straight gradient leaves a visible
 * horizontal edge across the frame, which is the one thing a backdrop must never do.
 *
 * Both the video and the motes stop under `prefers-reduced-motion`, and the motes stop when the
 * section leaves the screen: a canvas animating behind content nobody is looking at is a permanent
 * compositor job with nothing to show for it.
 */

/**
 * This section has no colours of its own. It uses the site's two, by token.
 *
 * `--nq-ground` is #000000 and `--nq-accent` is #E4E4E7 — a near-white rather than pure white,
 * because the accent is an EMPHASIS LEVEL rather than a hue and a fill already at #FFFFFF has
 * nowhere left to go on hover. Between them the whole site is monochrome, and it had violet in it
 * only here, which is exactly what made this section read as a different page.
 *
 * Written as `var(...)` rather than copied hex so retuning the site retunes this too — a colour
 * typed into thirty components is a colour the site is stuck with. The rgba forms below are the
 * same values where a `var()` cannot go (inside a gradient stop list or a shadow's alpha).
 */
const GROUND = 'var(--nq-ground, #000000)';
const ACCENT = 'var(--nq-accent, #E4E4E7)';
const ACCENT_RGB = '228,228,231';

interface HomeHeroProps {
  language?: Language;
  /** Into the template gallery — the lighter of the two ways in. */
  onStart?: () => void;
  /** Straight to the contract form, for someone who already knows they want something built. */
  onRequestProject?: () => void;
  /** The header's own links, so this section can navigate the way the shared bar does. */
  onNavigate?: (page: string) => void;
  onSetLanguage?: (lang: Language) => void;
}

/* ── The motes ────────────────────────────────────────────────────────────────────────────── */

/**
 * Drifting dust, on a canvas rather than as DOM nodes.
 *
 * Sixty-five absolutely-positioned divs with their own transforms is sixty-five things for the
 * compositor to lay out and paint every frame; one canvas is one. They are drawn as radial
 * gradients rather than flat discs because a hard-edged dot reads as a dead pixel, not as a mote
 * catching the light.
 */
const Motes: React.FC<{ active: boolean }> = ({ active }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!active) return;

    // Capped at 1.5 for the same reason every WebGL canvas here is: the motes are soft blurs with
    // no detail for extra pixels to resolve, and the cost of a full-bleed canvas is per-pixel.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const motes = Array.from({ length: 65 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.9,
      // Upward and slightly sideways, slowly. Anything faster stops being dust and becomes snow.
      vx: (Math.random() - 0.5) * 0.00018,
      vy: -0.00006 - Math.random() * 0.00016,
      a: 0.16 + Math.random() * 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        // Wrap rather than respawn: a mote that vanishes and reappears somewhere else is a blink,
        // and at this density the eye catches it.
        if (m.y < -0.02) m.y = 1.02;
        if (m.x < -0.02) m.x = 1.02;
        if (m.x > 1.02) m.x = -0.02;

        const px = m.x * w;
        const py = m.y * h;
        // All one colour. Two tones of dust is a second hue in a monochrome scene, and it read as
        // dirt on the lens rather than as light.
        const g = ctx.createRadialGradient(px, py, 0, px, py, m.r * 4);
        g.addColorStop(0, `rgba(255,255,255,${m.a})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
};

/* ── The section ──────────────────────────────────────────────────────────────────────────── */

export const HomeHero: React.FC<HomeHeroProps> = ({
  language = 'ar',
  onStart,
  onRequestProject,
  onNavigate,
  onSetLanguage,
}) => {
  const isAr = language === 'ar';
  // The CTA arrow points "away, forward" — up and outward — so it follows the reading direction the
  // way every other directional glyph on the site does.
  const CtaArrow = isAr ? ArrowUpLeft : ArrowUpRight;

  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setMotion(!mq.matches);
      const v = videoRef.current;
      if (!v) return;
      if (mq.matches) v.pause();
      else void v.play().catch(() => {});
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      rootMargin: '120px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The drawer is the only thing on this page that can be dismissed, so it owns Escape outright.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // The same destinations the shared Navbar offers. They are listed here rather than imported
  // because this header shows a SHORT set in the middle and the full one in the drawer, which is a
  // presentation decision belonging to this section.
  const links: { id: string; label: string }[] = [
    { id: 'home', label: isAr ? 'الرئيسية' : 'Home' },
    { id: 'templates', label: isAr ? 'القوالب' : 'Templates' },
    { id: 'custom-request', label: isAr ? 'عقد مخصص' : 'Custom' },
    { id: 'timeline', label: isAr ? 'مراحل العمل' : 'Process' },
    { id: 'about', label: isAr ? 'عن NOVAIQ' : 'About' },
  ];
  const drawerLinks = [
    ...links,
    { id: 'privacy', label: isAr ? 'سياسة الخصوصية' : 'Privacy' },
    { id: 'terms', label: isAr ? 'الشروط والأحكام' : 'Terms' },
  ];

  const go = (page: string) => {
    setDrawerOpen(false);
    onNavigate?.(page);
  };

  const cards = [
    {
      n: '01',
      t: isAr ? 'تصميم إبداعي' : 'Creative design',
      d: isAr ? 'واجهات تُبنى لتُقنع، مو بس تُعجب.' : 'Interfaces built to convince, not only to please.',
    },
    {
      n: '02',
      t: isAr ? 'هوية واستراتيجية' : 'Brand strategy',
      d: isAr ? 'هوية تخليك تنعرف من أول نظرة.' : 'A brand that is recognised at first glance.',
    },
    {
      n: '03',
      t: isAr ? 'حلول رقمية' : 'Digital solutions',
      d: isAr ? 'أنظمة تشتغل بهدوء وتكبر معك.' : 'Systems that run quietly and grow with you.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="home-hero"
      // A full screen, and nothing subtracted from it: the header lives inside this section now, so
      // there is no floating bar above to leave room for. `svh` rather than `vh` so a phone's
      // collapsing address bar cannot make this taller than the screen it is meant to match.
      className="relative min-h-[100svh] flex flex-col overflow-hidden"
    >
      {/* ── Backdrop ────────────────────────────────────────────────────────────────────────
          A flat ground under the video, so a slow network or a blocked CDN leaves a dark section
          rather than a white hole. */}
      <div className="absolute inset-0" style={{ background: GROUND }} aria-hidden="true" />

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        // Drained of colour entirely, not recoloured. The source is a red sphere; rotating its hue
        // to violet only swapped one colour the site does not have for another, and a violet
        // backdrop is precisely what made this section look like it belonged to a different page.
        // Greyscale puts it in the site's own monochrome, where the only thing separating it from
        // the ground is value. Contrast is lifted a little because desaturating a mid-red flattens
        // it toward one grey.
        style={{ filter: 'grayscale(1) contrast(1.18) brightness(0.52)' }}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23000000'/%3E%3C/svg%3E"
        aria-hidden="true"
      >
        <source
          src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/bg-red-ball.mp4"
          type="video/mp4"
        />
      </video>

      {/* An ELLIPSE, not a linear fade. A straight gradient across a full-bleed backdrop leaves a
          visible horizontal edge, which reads as a seam in the page; a radial one has no edge to
          see and darkens exactly where the copy needs contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 68% 68% at 50% 50%, transparent 22%, rgba(0,0,0,0.42) 50%, rgba(0,0,0,0.82) 75%, rgba(0,0,0,0.98) 100%)',
        }}
        aria-hidden="true"
      />

      <Motes active={motion && onScreen} />

      {/* ── Header ──────────────────────────────────────────────────────────────────────── */}
      <header className="relative z-20 nq-container pt-6 sm:pt-8">
        {/* Two independent glass halves, mirroring the shared Navbar's split: the LOGO sits in its
            own frosted bar (physical left) and the NAVIGATION (links + language + "تواصل معنا" +
            menu) in a completely separate one (physical right). No border, no outline — the same
            .navbar-glass material the navbar uses. */}
        <div className="flex items-center justify-between gap-6 sm:gap-10">
          {/* ── Half 1 (physical left): the brand logo, its own glass bar ── */}
          <div className="navbar-glass flex items-center px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl relative z-10">
            <button
              type="button"
              onClick={() => go('home')}
              className="shrink-0 cursor-pointer"
              aria-label="NOVAIQ"
            >
              <NovaiqLogo size={30} />
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-7">
            {links.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                className={`relative text-xs font-bold tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                  l.id === 'home' ? 'text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {l.label}
                {/* The active marker is a lit bar under the word rather than a colour change on it:
                    on a moving backdrop a tint alone is not reliably readable. */}
                {l.id === 'home' && (
                  <span
                    className="absolute -bottom-2 inset-x-0 h-[2px] rounded-full"
                    style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </nav>

            {/* The language toggle has to be here. The shared bar is hidden on this page, and
                without it there is no way to reach English at all from the page most people land
                on. */}
            <button
              type="button"
              onClick={() => onSetLanguage?.(isAr ? 'en' : 'ar')}
              className="px-3 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-[0.68rem] font-bold tracking-widest text-white/80 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            >
              {isAr ? 'EN' : 'AR'}
            </button>

            <button
              type="button"
              onClick={onRequestProject}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-[0.68rem] font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer"
            >
              {isAr ? 'تواصل معنا' : "Let's talk"}
            </button>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white cursor-pointer"
              aria-label={isAr ? 'القائمة' : 'Menu'}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── The drawer ──────────────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl lg:hidden">
          <div className="nq-container pt-6 sm:pt-8">
            <div className="flex items-center justify-between">
              <NovaiqLogo size={30} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2.5 rounded-full border border-white/15 bg-white/5 text-white cursor-pointer"
                aria-label={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="mt-12 flex flex-col gap-1">
              {drawerLinks.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => go(l.id)}
                  className="py-4 text-start text-2xl font-extrabold tracking-tight text-white/85 hover:text-white border-b border-white/10 transition-colors cursor-pointer"
                >
                  {l.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                onRequestProject?.();
              }}
              className="mt-10 w-full px-6 py-4 rounded-full text-sm font-extrabold tracking-widest uppercase text-black cursor-pointer"
              style={{ background: ACCENT, boxShadow: `0 12px 34px rgba(${ACCENT_RGB},0.22)` }}
            >
              {isAr ? 'ابدأ معنا' : 'Get started'}
            </button>
          </div>
        </div>
      )}

      {/* ── The content ─────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex items-center nq-container py-12 sm:py-16">
        {/* Twelve columns from `lg`, split 5 / 3 / 4. The middle three are EMPTY on purpose — that
            is the gap the sphere behind shows through, and it is the whole reason the copy is in
            two side columns rather than one centred block. Below `lg` there are no columns to keep
            clear, so it collapses to a single stack. */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
          <div className="lg:col-span-5">
            <span className="block text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: ACCENT }}>
              {isAr ? 'نحن نصمم' : 'We design'}
            </span>

            {/* Display type: heavy, tight and uppercase, set at a leading under 1 so the lines lock
                into a block rather than reading as a paragraph. `text-balance` covers the narrow
                screens where a line cannot fit. */}
            <h1 className="mt-5 text-[2.6rem] sm:text-6xl lg:text-[4.6rem] font-black uppercase leading-[0.96] tracking-tight text-white font-['Cairo'] text-balance">
              {isAr ? 'تجارب رقمية' : 'Digital experiences'}
            </h1>

            <p className="mt-6 max-w-md text-sm text-white/70 leading-relaxed">
              {isAr
                ? 'نصنع في NOVAIQ تجارب رقمية غامرة تزيد التفاعل، تلهم الإبداع، وتوصل نتائج حقيقية لشركتك.'
                : 'At NOVAIQ we craft immersive digital experiences that drive engagement, inspire creativity and deliver real results.'}
            </p>

            <button
              type="button"
              onClick={onStart}
              className="mt-9 inline-flex items-center gap-3 ps-7 pe-2 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'شاهد أعمالنا' : 'Explore our work'}</span>
              {/* The disc is the accent and the arrow is the ground, which is the same inversion
                  `.nq-cta-badge` uses everywhere else on the site. */}
              <span
                className="w-9 h-9 rounded-full grid place-items-center"
                style={{ background: ACCENT, color: '#000000' }}
                aria-hidden="true"
              >
                <CtaArrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>
          </div>

          {/* The clear middle. It holds no content at any size — it exists to keep the backdrop's
              centre unobstructed. */}
          <div className="hidden lg:block lg:col-span-3" aria-hidden="true" />

          <div className="lg:col-span-4">
            <ul className="flex flex-col">
              {cards.map((c, i) => (
                <li
                  key={c.n}
                  className={`py-5 ${i > 0 ? 'border-t border-white/12' : ''} flex gap-4 sm:gap-5`}
                >
                  <span className="text-xs font-bold tracking-widest pt-1" style={{ color: ACCENT }}>
                    {c.n}
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-[0.1em] uppercase text-white">
                      {c.t}
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-white/60 leading-relaxed">{c.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
