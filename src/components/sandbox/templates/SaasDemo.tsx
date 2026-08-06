import React from 'react';
import {
  Sliders,
  Cpu,
  Globe,
  Shield,
  Terminal,
} from 'lucide-react';
import type { SandboxCtx } from '../context';

// Nebula Cloud — the SaaS demo: terminal-flavoured features, docs, pricing plans and dashboard.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface SaasDemoProps {
  ctx: SandboxCtx;
  selectedPlan: 'monthly' | 'yearly';
  setSelectedPlan: React.Dispatch<React.SetStateAction<'monthly' | 'yearly'>>;
}

export function SaasDemo({ ctx, selectedPlan, setSelectedPlan }: SaasDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, language, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const techTab = ['home', 'features', 'docs', 'pricing', 'dashboard'].includes(activeTab) ? activeTab : 'home';

  return (
    <div className="relative space-y-5 text-slate-100">
      {/* Circuit-board grid backdrop — a completely different world from the soft
          cosmic glows everywhere else: sharp, technical, terminal-flavored. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 select-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden="true"
      />

      {/* Same bar as every other demo, but keeping this one's terminal prompt as its
          wordmark — the shell aesthetic is this template's whole pitch. */}
      {renderSiteTopBar(<Terminal className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, '~/Logo', true)}

      {techTab === 'home' && (
        <div className="space-y-4 sm:space-y-5 animate-fade-in">
          {/* Fake terminal window — macOS-style traffic-light chrome, then the pitch
              rendered as command output with a blinking cursor at the end */}
          <div className="rounded-lg bg-black/70 backdrop-blur-xl border border-emerald-500/20 overflow-hidden shadow-xl">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-emerald-500/10 bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] text-slate-500 font-mono mr-auto" dir="ltr">nebula — zsh</span>
            </div>
            <div className="p-5 sm:p-8 space-y-3 sm:space-y-4 text-center font-mono" dir="ltr">
              <span className={`px-3 py-1 rounded ${themeStyle.badgeBg} text-[11px] font-semibold inline-block`}>
                $ nebula --status
              </span>
              <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">
                ابنِ وأطلق منتجك السحابي بسرعة الضوء
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                بنية تحتية سحابية جاهزة، توثيق API تفاعلي، ولوحة قيادة حية لمنتجك الرقمي — كل ما تحتاجه شركتك التقنية لتنطلق دون تعقيد.
                <span className="text-emerald-400 animate-pulse">▊</span>
              </p>
              <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                <button onClick={() => setActiveTab('pricing')} className={`w-full sm:w-auto px-5 py-2.5 rounded ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                  شاهد خطط الأسعار
                </button>
                <button onClick={() => setActiveTab('docs')} className="w-full sm:w-auto px-5 py-2.5 rounded bg-black/40 border border-emerald-500/20 text-emerald-400 text-xs font-bold cursor-pointer hover:border-emerald-500/40">
                  استكشف توثيق API
                </button>
              </div>
            </div>
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center font-mono`}>
            <div className="p-3.5 sm:p-4 rounded-md bg-black/40 backdrop-blur-md border-r-2 border border-emerald-500/30">
              <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText}`}>99.98%</div>
              <div className="text-[11px] text-slate-500">معدل التشغيل السنوي</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-md bg-black/40 backdrop-blur-md border-r-2 border border-emerald-500/30">
              <div className="text-lg sm:text-xl font-bold text-emerald-400">+40</div>
              <div className="text-[11px] text-slate-500">شركة تستخدم المنصة</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-md bg-black/40 backdrop-blur-md border-r-2 border border-emerald-500/30">
              <div className="text-lg sm:text-xl font-bold text-amber-400">&lt; 50ms</div>
              <div className="text-[11px] text-slate-500">زمن استجابة API</div>
            </div>
          </div>
        </div>
      )}

      {techTab === 'features' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3.5 animate-fade-in text-xs`}>
          {[
            { icon: Cpu, title: 'نشر فوري بنقرة واحدة', desc: 'حزم كودك ونشره على بنية سحابية موزعة عالمياً خلال ثوانٍ، دون إعدادات خوادم معقدة.', tag: 'deploy.sh' },
            { icon: Globe, title: 'قابلية توسع تلقائية', desc: 'يزداد عدد الخوادم تلقائياً مع ازدياد الطلب على منتجك، ويقل عند انخفاضه لتوفير التكلفة.', tag: 'autoscale.yml' },
            { icon: Shield, title: 'أمان وتشفير من الطبقة الأولى', desc: 'تشفير كامل للبيانات أثناء النقل والتخزين، مع مراقبة أمنية استباقية على مدار الساعة.', tag: 'security.conf' },
            { icon: Sliders, title: 'مراقبة الأداء اللحظي', desc: 'لوحة قيادة حية لمراقبة زمن الاستجابة، الأخطاء، واستهلاك الموارد لحظة بلحظة.', tag: 'monitor.ts' },
          ].map((f, idx) => {
            const FeatureIcon = f.icon;
            return (
              <div key={idx} className="rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-500/40 transition-colors overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-emerald-500/10 bg-white/[0.02]">
                  <FeatureIcon className={`w-3.5 h-3.5 ${themeStyle.primaryText}`} />
                  <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{f.tag}</span>
                </div>
                <div className="p-4 space-y-1.5">
                  <h4 className="text-sm font-bold text-white">{f.title}</h4>
                  <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {techTab === 'docs' && (
        <div className="rounded-lg bg-black/40 backdrop-blur-md border border-emerald-500/20 overflow-hidden animate-fade-in text-xs">
          <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-emerald-500/10 bg-white/[0.02]">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-white">توثيق واجهة برمجة التطبيقات (API Reference)</span>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="p-4 rounded-md bg-black/60 border border-emerald-500/10 font-mono text-[11px] text-emerald-300 overflow-x-auto" dir="ltr">
              <div className="text-slate-500">// Example: fetch account usage</div>
              <div>GET https://api.nebula.dev/v1/usage</div>
              <div className="text-slate-500 mt-2">Authorization: Bearer YOUR_API_KEY</div>
            </div>
            <div className="space-y-2">
              {[
                { method: 'GET', path: '/v1/usage', desc: 'استرجاع بيانات الاستهلاك الحالية' },
                { method: 'POST', path: '/v1/deploy', desc: 'نشر إصدار جديد من التطبيق' },
                { method: 'GET', path: '/v1/users', desc: 'قائمة المستخدمين المرتبطين بالحساب' },
              ].map((ep, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded bg-black/60 border border-emerald-500/10">
                  <span className={`px-2 py-0.5 rounded font-mono font-bold shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{ep.method}</span>
                  <span className="font-mono text-slate-300 shrink-0" dir="ltr">{ep.path}</span>
                  <span className="text-slate-500 truncate">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {techTab === 'pricing' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-center font-mono">
            <div className="inline-flex flex-wrap justify-center p-1 rounded-md bg-black/40 border border-emerald-500/20 text-xs">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`px-3 sm:px-4 py-1.5 rounded cursor-pointer ${selectedPlan === 'monthly' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold` : 'text-slate-400'}`}
              >
                اشتراك شهري
              </button>
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`px-3 sm:px-4 py-1.5 rounded cursor-pointer ${selectedPlan === 'yearly' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold` : 'text-slate-400'}`}
              >
                اشتراك سنوي (خصم 20%)
              </button>
            </div>
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3`}>
            <div className="p-4 rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/20 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 font-mono" dir="ltr">## basic_plan</h4>
              <div className={`text-base sm:text-lg font-bold ${themeStyle.primaryText} font-mono`}>
                {selectedPlan === 'monthly'
                  ? (language === 'ar' ? '250,000 د.ع / شهرياً' : '250,000 IQD / month')
                  : (language === 'ar' ? '2,400,000 د.ع / سنوياً' : '2,400,000 IQD / year')}
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
                <li>✔ ربط حتى 5 مستخدمين</li>
                <li>✔ دعم فني عبر البريد</li>
              </ul>
            </div>

            <div className="p-4 rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/40 space-y-2 relative">
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-500 text-[10px] text-black font-bold font-mono">
                الأكثر طلباً
              </span>
              <h4 className="text-xs font-bold text-white font-mono" dir="ltr">## pro_plan</h4>
              <div className={`text-base sm:text-lg font-bold ${themeStyle.primaryText} font-mono`}>
                {selectedPlan === 'monthly'
                  ? (language === 'ar' ? '600,000 د.ع / شهرياً' : '600,000 IQD / month')
                  : (language === 'ar' ? '5,800,000 د.ع / سنوياً' : '5,800,000 IQD / year')}
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 font-mono">
                <li>✔ مستخدمين غير محدودين</li>
                <li>✔ ربط حقيقي مع API</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {techTab === 'dashboard' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-3 animate-fade-in text-xs font-mono`}>
          {[
            { value: '128,430', label: 'استدعاء API اليوم' },
            { value: '12', label: 'تكاملات نشطة' },
            { value: '99.98%', label: 'معدل التشغيل' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-4 rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/20">
              <div className={`text-xl font-extrabold ${themeStyle.primaryText}`}>{stat.value}</div>
              <div className="text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
