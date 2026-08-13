import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Target,
  BarChart3,
  Users,
  Megaphone,
  TrendingUp,
  Telescope,
  Rocket,
  Star,
  Globe,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react';
import type { SandboxCtx } from '../context';

interface MarketingDemoProps {
  ctx: SandboxCtx;
}

const SERVICES = [
  {
    id: 'campaigns',
    icon: Target,
    title: 'الحملات المستهدفة',
    subtitle: 'Targeted Campaigns',
    desc: 'الوصول للجمهور المناسب في الوقت المناسب بحملات تحويل عبر كل المنصات.',
    color: 'from-blue-600 to-blue-800',
    borderColor: 'border-blue-500/30',
    hoverColor: 'hover:border-blue-400/50',
    percentage: 80,
    ratio: '16:9',
  },
  {
    id: 'strategy',
    icon: BarChart3,
    title: 'استراتيجية مدعومة بالبيانات',
    subtitle: 'Data-Backed Strategy',
    desc: 'خطط تسويقية مبنية على رؤى حقيقية وليس تخمينات.',
    color: 'from-amber-500 to-amber-700',
    borderColor: 'border-amber-500/30',
    hoverColor: 'hover:border-amber-400/50',
    percentage: 100,
    ratio: '4:3',
  },
  {
    id: 'social',
    icon: Users,
    title: 'إدارة وسائل التواصل',
    subtitle: 'Social Media Management',
    desc: 'من المحتوى المجدول إلى تعزيز التفاعل.',
    color: 'from-emerald-600 to-emerald-800',
    borderColor: 'border-emerald-500/30',
    hoverColor: 'hover:border-emerald-400/50',
    percentage: 80,
    ratio: '1:1',
  },
  {
    id: 'seo',
    icon: Telescope,
    title: 'SEO والمحتوى',
    subtitle: 'SEO & Content Marketing',
    desc: 'تعزيز الرؤية والسلطة بمحتوى يتصدر محركات البحث.',
    color: 'from-purple-600 to-purple-800',
    borderColor: 'border-purple-500/30',
    hoverColor: 'hover:border-purple-400/50',
    percentage: 100,
    ratio: '16:9',
  },
  {
    id: 'branding',
    icon: Megaphone,
    title: 'العلامة التجارية الإبداعية',
    subtitle: 'Creative Branding',
    desc: 'التميز بصور جريئة ورسائل حادة وهوية تتحدث بلغتك.',
    color: 'from-rose-600 to-rose-800',
    borderColor: 'border-rose-500/30',
    hoverColor: 'hover:border-rose-400/50',
    percentage: 80,
    ratio: '4:3',
  },
  {
    id: 'analytics',
    icon: TrendingUp,
    title: 'تحليلات الأداء',
    subtitle: 'Performance Analytics',
    desc: 'تتبع النتائج بالوقت الحقيقي والتكيّف بسرعة.',
    color: 'from-cyan-600 to-cyan-800',
    borderColor: 'border-cyan-500/30',
    hoverColor: 'hover:border-cyan-400/50',
    percentage: 100,
    ratio: '1:1',
  },
];

const ANIMATION_STEPS = [
  { percentage: 80, ratio: '16:9', label: '80%' },
  { percentage: 75, ratio: '4:3', label: '4:3' },
  { percentage: 100, ratio: '100%', label: '100%' },
];

export function MarketingDemo({ ctx }: MarketingDemoProps) {
  const { themeStyle, gridCols, isNarrowViewport, renderSiteTopBar } = ctx;
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Auto-advance animation every 8 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % ANIMATION_STEPS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goToStep = useCallback((index: number) => {
    setActiveStep(index);
    setIsAutoPlaying(false);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => !prev);
  }, []);

  const currentStep = ANIMATION_STEPS[activeStep];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {renderSiteTopBar(
        <Rocket className="w-5 h-5" />,
        'NovaMarketing'
      )}

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        {/* Space background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-white rounded-full animate-pulse" />
          <div className="absolute top-40 right-20 w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
          <div className="absolute top-60 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <div className="absolute top-32 right-1/3 w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
          <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
            ما الذي نفعله بأفضل شكل؟
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto mb-8">
            من الاستراتيجية إلى التنفيذ، خدماتنا مصممة لرفع العلامة التجارية وتفاعل الجمهور والنمو القابل للقياس.
          </p>

          {/* Search Box with Brand */}
          <div className="max-w-2xl mx-auto relative">
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3 hover:border-slate-600/50 transition-colors">
              <div className="flex items-center gap-2 px-3">
                <Rocket className="w-6 h-6 text-blue-400" />
                <span className="text-sm font-semibold text-white hidden sm:block">NovaMarketing</span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن خدمة..."
                className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Animated Percentage Banner */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 relative overflow-hidden">
            {/* Animated background wave */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-cyan-600/30 animate-pulse" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Percentage Display */}
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {currentStep.label}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">نسبة الإنجاز</div>
                </div>
                <div className="h-16 w-px bg-slate-700" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{currentStep.ratio}</div>
                  <div className="text-sm text-slate-400 mt-1">نسبة العرض</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                {/* Step indicators */}
                <div className="flex gap-2">
                  {ANIMATION_STEPS.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => goToStep(i)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        i === activeStep
                          ? 'bg-blue-400 scale-125'
                          : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                      aria-label={`Step ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Play/Pause */}
                <button
                  onClick={toggleAutoPlay}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  aria-label={isAutoPlaying ? 'Pause' : 'Play'}
                >
                  {isAutoPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>

                {/* Prev/Next */}
                <div className="flex gap-1">
                  <button
                    onClick={() => goToStep((activeStep - 1 + ANIMATION_STEPS.length) % ANIMATION_STEPS.length)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => goToStep((activeStep + 1) % ANIMATION_STEPS.length)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${currentStep.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className={`grid ${gridCols('grid-cols-1', 'grid-cols-2 lg:grid-cols-3')} gap-6`}>
            {SERVICES.map((service) => (
              <div
                key={service.id}
                className={`group relative rounded-2xl border ${service.borderColor} ${service.hoverColor} transition-all duration-300 overflow-hidden bg-slate-900/50 backdrop-blur-sm hover:scale-[1.02] hover:shadow-2xl hover:shadow-${service.id === 'campaigns' ? 'blue' : service.id === 'strategy' ? 'amber' : service.id === 'social' ? 'emerald' : service.id === 'seo' ? 'purple' : service.id === 'branding' ? 'rose' : 'cyan'}-500/10`}
                onMouseEnter={() => setHoveredCard(service.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Card gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-10 group-hover:opacity-20 transition-opacity`} />

                <div className="relative z-10 p-6">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <service.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-1">{service.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">{service.subtitle}</p>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">{service.desc}</p>

                  {/* Card preview (like Watel M card) */}
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400">{service.subtitle}</span>
                      <span className="text-xs text-slate-500">NovaMarketing</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">{service.percentage}%</div>
                        <div className="text-xs text-slate-400">نسبة التحويل</div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">جاهز لرفع علامتك التجارية؟</h2>
          <p className="text-slate-300 mb-8">دعنا نبني استراتيجية تسويقية تحقق نتائج حقيقية لشركتك.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25">
              ابدأ مشروعك الآن
            </button>
            <button className="px-8 py-3 border border-slate-600 hover:border-slate-500 text-white font-semibold rounded-xl transition-all hover:bg-slate-800/50">
              احجز استشارة مجانية
            </button>
          </div>
        </div>
      </section>

      {/* Space-themed Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">NovaMarketing</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white transition-colors">الرئيسية</a>
            <a href="#" className="hover:text-white transition-colors">الخدمات</a>
            <a href="#" className="hover:text-white transition-colors">المشاريع</a>
            <a href="#" className="hover:text-white transition-colors">تواصل معنا</a>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-slate-400">Novaiq Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
