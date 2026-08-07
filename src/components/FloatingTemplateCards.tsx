import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { templatesData } from '../data/templatesData';
import { Template } from '../types';

interface FloatingTemplateCardsProps {
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
}

const FEATURED = templatesData.slice(0, 3);
// Arranged as a shallow 3D fan (left/center/right) rather than all facing flat.
const TILTS = [-8, 0, 8];
const BOB_CLASSES = ['float-card--a', 'float-card--b', 'float-card--c'];
// Center card travels furthest on scroll — the depth difference between cards is what
// reads as "floating in space" rather than the row just sliding as one flat unit.
const DEPTHS = [36, 64, 36];

interface FloatingCardProps {
  template: Template;
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
  tilt: number;
  depth: number;
  bobClass: string;
  scrollYProgress: MotionValue<number>;
  reduceMotion: boolean;
}

// Split into its own component so each card can call useTransform with its own depth —
// calling it inside the parent's .map() would violate the rules of hooks.
const FloatingCard: React.FC<FloatingCardProps> = ({
  template,
  language,
  onExploreTemplates,
  tilt,
  depth,
  bobClass,
  scrollYProgress,
  reduceMotion,
}) => {
  const rawY = useTransform(scrollYProgress, [0, 1], [depth, -depth]);
  const y = reduceMotion ? 0 : rawY;

  return (
    <motion.div style={{ y }}>
      <div className={`float-card ${bobClass}`}>
        <div
          className="tilt-card group relative rounded-2xl border border-zinc-700 bg-zinc-950 overflow-hidden shadow-2xl hover:border-white/40"
          style={{ '--tilt-y': `${tilt}deg` } as React.CSSProperties}
        >
          <div className="aspect-video overflow-hidden">
            <img
              src={template.previewImage}
              alt={template.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-4 text-start">
            <h3 className="text-sm font-bold text-white mb-1 truncate">{template.title}</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3 line-clamp-2">{template.subtitle}</p>

            <button
              type="button"
              onClick={onExploreTemplates}
              className="nq-btn nq-btn--solid w-full px-4 py-2 rounded-full font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              <span>{language === 'ar' ? 'استكشاف القوالب' : 'Explore Templates'}</span>
              {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Floating 3D showcase row — sits under the guarantee wheel in the Hero. Each card fan-tilts
// in 3D (perspective + rotateY/rotateX), bobs continuously in place (CSS keyframes), and
// drifts at its own depth as the page scrolls past (motion's useScroll). Fully static under
// prefers-reduced-motion: the CSS bob freezes via the site-wide reduced-motion override, and
// the scroll parallax is short-circuited to 0 here since that's a JS-driven transform the
// global CSS override can't reach.
export const FloatingTemplateCards: React.FC<FloatingTemplateCardsProps> = ({
  language,
  onExploreTemplates,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = !!useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ['start 95%', 'end 15%'],
  });

  return (
    <div
      ref={stageRef}
      className="float-card-stage w-full max-w-5xl mx-auto mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-7"
    >
      {FEATURED.map((tpl, i) => (
        <FloatingCard
          key={tpl.id}
          template={tpl}
          language={language}
          onExploreTemplates={onExploreTemplates}
          tilt={TILTS[i]}
          depth={DEPTHS[i]}
          bobClass={BOB_CLASSES[i]}
          scrollYProgress={scrollYProgress}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
};
