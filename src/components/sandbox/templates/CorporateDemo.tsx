import React from 'react';
import {
  X,
  Smartphone,
  CheckCircle2,
  Building2,
  ArrowUpRight,
  Sliders,
  Cpu,
  Globe,
  Shield,
} from 'lucide-react';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

// Stella Holding — the corporate demo: services, projects and the interactive cost calculator.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface CorporateDemoProps {
  ctx: SandboxCtx;
  corpDetail: { kind: 'service' | 'project'; index: number } | null;
  orgSize: 'medium' | 'large' | 'holding';
  setCorpDetail: React.Dispatch<React.SetStateAction<{ kind: 'service' | 'project'; index: number } | null>>;
  setOrgSize: React.Dispatch<React.SetStateAction<'medium' | 'large' | 'holding'>>;
}

export function CorporateDemo({ ctx, corpDetail, orgSize, setCorpDetail, setOrgSize }: CorporateDemoProps) {
  const { CUR, activeTab, gridCols, isNarrowViewport, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const stellaServices = [
    {
      icon: Cpu,
      title: 'تطوير الأنظمة السحابية المخصصة ERP',
      desc: 'بناء أنظمة متكاملة لإدارة الموارد، المبيعات، وشؤون الموظفين بطريقة مؤتمتة بالكامل وسريعة وآمنة.',
      tag: 'الأكثر طلباً للمؤسسات الكبرى',
      details: 'نظام ERP مبني خصيصاً لهيكل مؤسستك، يوحّد كل الأقسام (الموارد البشرية، المشتريات، المبيعات، المخزون) في منصة واحدة بدل ملفات إكسل متفرقة، مع صلاحيات دقيقة لكل موظف وتقارير حية للإدارة العليا.',
      bullets: [
        'إدارة الموارد البشرية والرواتب والإجازات',
        'تتبع المخزون والمشتريات بالوقت الحقيقي',
        'تقارير مالية آلية شهرية وربع سنوية',
        'صلاحيات متعددة المستويات لكل قسم وموظف',
      ],
    },
    {
      icon: Globe,
      title: 'بوابات الويب التعريفية للمجموعات',
      desc: 'تصميم وبناء مواقع الكترونية فخمة تعكس الهوية البصرية اللائقة بالشركات الكبرى والمستثمرين والمساهمين.',
      tag: 'تحميل فائق المتانة ومتوافق مع SEO',
      details: 'موقع تعريفي رسمي يليق بمجموعتك، مبني على أسس تقنية حديثة تضمن سرعة تحميل عالية وترتيباً أفضل في محركات البحث، مع لوحة تحكم بسيطة لتحديث الأخبار والوظائف الشاغرة بنفسك دون الحاجة لمبرمج.',
      bullets: [
        'تصميم مطابق تماماً للهوية البصرية للشركة',
        'تحسين كامل لمحركات البحث (SEO)',
        'دعم تعدد اللغات بتبديل فوري',
        'لوحة تحكم لإدارة الأخبار والوظائف بنفسك',
      ],
    },
    {
      icon: Shield,
      title: 'حلول أمن المعلومات والشبكات الداخلية',
      desc: 'تأمين المنظومات الداخلية ضد الاختراق، تفعيل جدران حماية برمجية متطورة، والتدقيق الأمني المسبق.',
      tag: 'حماية قصوى وتدقيق دوري',
      details: 'حماية بيانات مؤسستك ومستثمريك بأعلى معايير الأمان الرقمي، مع مراقبة مستمرة للأنظمة واختبارات اختراق دورية تكشف أي ثغرة قبل استغلالها.',
      bullets: [
        'جدار حماية WAF متقدم ضد الهجمات الشائعة',
        'تشفير كامل لقواعد البيانات وبوابة المستثمرين',
        'تدقيق أمني شامل كل 3 أشهر',
        'نظام كشف وتنبيه فوري لأي محاولة تسلل',
      ],
    },
    {
      icon: Smartphone,
      title: 'تطبيقات الهواتف الذكية عالية الأداء',
      desc: 'تطوير تطبيقات الهواتف الذكية iOS & Android مع ربط فوري آمن بقواعد البيانات وسرعة ممتازة.',
      tag: 'أحدث التقنيات وأفضل تجربة مستخدم',
      details: 'تطبيق مرافق لموقعك يمنح موظفيك وعملاءك تجربة أسرع وأقرب، مبني بنفس قاعدة البيانات الخاصة بالموقع فلا يوجد أي ازدواجية أو تعارض بالبيانات بين المنصتين.',
      bullets: [
        'تطبيقات iOS و Android أصلية الأداء',
        'إشعارات فورية Push Notifications',
        'إمكانية العمل بدون إنترنت (Offline Mode)',
        'ربط مباشر بنفس قاعدة بيانات الموقع الرئيسي',
      ],
    },
  ];

  const stellaProjects = [
    {
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
      client: 'مجموعة الرافدين للمقاولات العامة',
      title: 'المنظومة السحابية الموحدة وتتبع الآليات والعمال',
      desc: 'تسهيل المراسلات تتبع سير العمل والمشاريع في 15 موقع عمل بمرونة فائقة.',
      details: 'كانت المجموعة تدير مواقع عملها الـ15 عبر مكالمات ومجموعات واتساب متفرقة، ما سبّب تأخيراً في التقارير وصعوبة بمتابعة الآليات والعمال. صممنا منصة موحدة تجمع كل موقع عمل بلوحة تحكم مركزية واحدة.',
      stats: [
        { label: 'مواقع عمل مربوطة', value: '15' },
        { label: 'مدة التنفيذ', value: '5 أشهر' },
        { label: 'مستخدمون نشطون يومياً', value: '+320' },
      ],
    },
    {
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
      client: 'مصرف بابل الرقمي',
      title: 'بوابة المستثمرين وكبار العملاء الآمنة 2FA',
      desc: 'تحويل رقمي شامل لعمليات التحقق وإصدار شهادات الإيداع للمستثمرين بنقرة زر.',
      details: 'المصرف احتاج بوابة إلكترونية بأعلى درجات الأمان لكبار المستثمرين، تسمح لهم بمتابعة استثماراتهم وطلب شهادات الإيداع دون زيارة الفرع، مع طبقة تحقق ثنائية (2FA) وتشفير كامل للبيانات.',
      stats: [
        { label: 'مستوى الأمان', value: '2FA + تشفير AES-256' },
        { label: 'مدة التنفيذ', value: '4 أشهر' },
        { label: 'مستثمرون مسجّلون', value: '+1,200' },
      ],
    },
  ];

  return (
    <div className="relative space-y-6 text-slate-100">
      {/* Ambient cosmic glow behind the glass UI — a cheap radial gradient, not a
          full-surface blur filter, so this stays smooth even on weak devices. The purple
          companion glow that used to sit top-right is gone; it bled through the sandbox's
          own glass toolbar as an unrelated tint the toolbar was never designed to sit on. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl select-none" aria-hidden="true">
        <div
          className="absolute top-1/3 -left-16 w-64 h-64 rounded-full"
          style={{ backgroundImage: 'radial-gradient(circle closest-side, rgba(63,63,70,0.30) 0%, rgba(39,39,42,0.14) 45%, rgba(0,0,0,0) 78%)' }}
        />
      </div>

      {renderSiteTopBar(<Building2 className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {/* Dynamic Body */}
      {activeTab === 'home' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className={`relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} backdrop-blur-sm border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
            <div className={`w-14 h-14 mx-auto rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shadow-lg ring-1 ring-white/20`}>
              <Building2 className="w-7 h-7" />
            </div>
            <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block backdrop-blur-sm`}>
              حلول مؤسسية متكاملة
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
              نبتكر حلولاً برمجية تقود المؤسسات نحو التحول الرقمي
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              منصة الشركات الكبرى مع لوحة تحكم ذكية، دعم متعدد اللغات، وبوابة المستثمرين المحمية بأعلى درجات الأمان.
            </p>
            <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
              <button onClick={() => setActiveTab('calculator')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer shadow-lg`}>
                حسّاب تكلفة مشروعك
              </button>
              <button onClick={() => setActiveTab('contact')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/15 text-slate-300 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors">
                طلب استشارة مباشرة
              </button>
            </div>
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors">
              <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>+150</div>
              <div className="text-[11px] text-slate-400">مشروع مكتمل</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">99.9%</div>
              <div className="text-[11px] text-slate-400">نسبة استقرار النظام</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">24/7</div>
              <div className="text-[11px] text-slate-400">دعم فني متواصل</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
          {stellaServices.map((service, i) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                onClick={() => { setCorpDetail({ kind: 'service', index: i }); cosmicAudio.playPing(); }}
                className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 transition-colors space-y-3 cursor-pointer group"
                style={{ animation: 'card-in 0.35s ease-out both', animationDelay: `${i * 0.05}s` }}
              >
                <div className={`w-10 h-10 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} flex items-center justify-center shrink-0 shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">{service.title}</h4>
                <p className="text-slate-400 leading-relaxed">{service.desc}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[10px] font-bold ${themeStyle.primaryText}`}>{service.tag}</span>
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 group-hover:text-white transition-colors">
                    التفاصيل <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
          {stellaProjects.map((project, i) => (
            <div
              key={project.client}
              onClick={() => { setCorpDetail({ kind: 'project', index: i }); cosmicAudio.playPing(); }}
              className="p-3 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 transition-colors rounded-2xl space-y-3 overflow-hidden cursor-pointer group"
            >
              <div className="relative overflow-hidden rounded-xl">
                <img src={project.image} alt={project.client} loading="lazy" decoding="async" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              <div className="p-1 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">{project.client}</span>
                <h4 className="text-xs font-bold text-white">{project.title}</h4>
                <p className="text-[11px] text-slate-400">{project.desc}</p>
                <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 group-hover:text-white transition-colors pt-1">
                  دراسة الحالة الكاملة <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 animate-fade-in text-xs shadow-xl">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>حاسبة التكلفة المباشرة للشركات</span>
          </h4>
          <p className="text-slate-400">حدد نطاق الخدمة المطلوبة لحساب تقدير أولي لاحتياجات مؤسستك:</p>
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold">حجم المنظومة البرمجية:</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'medium' as const, label: 'مؤسسة متوسطة' },
                { id: 'large' as const, label: 'مؤسسة كبرى' },
                { id: 'holding' as const, label: 'مجموعة القابضة' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setOrgSize(opt.id); cosmicAudio.playPing(); }}
                  className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                    orgSize === opt.id ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white shadow-md` : 'border-white/10 bg-white/5 backdrop-blur-sm text-slate-400 hover:text-white hover:border-white/25'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-center space-y-1">
            <span className="text-slate-400 block text-[11px]">التكلفة التقديرية الحالية:</span>
            <span className={`text-xl font-bold font-mono ${themeStyle.primaryText}`}>
              {orgSize === 'medium' ? `3,625,000 - 6,960,000 ${CUR}` : orgSize === 'large' ? `6,960,000 - 13,050,000 ${CUR}` : `13,050,000 - 26,100,000 ${CUR}`}
            </span>
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-3 animate-fade-in shadow-xl">
          <h4 className="text-sm font-bold text-white">نموذج التواصل والتسجيل المباشر</h4>
          <input type="text" placeholder="الاسم الكامل" className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500" />
          <input type="text" placeholder="رقم الهاتف" className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500" />
          <textarea placeholder="تفاصيل المشروع والطلب..." rows={2} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500" />
          <button onClick={() => alert('تم تسجيل الاستفسار التجريبي بنجاح في النظام!')} className={`w-full py-2.5 ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold rounded-lg cursor-pointer shadow-lg`}>
            إرسال الاستفسار المباشر
          </button>
        </div>
      )}

      {/* Service / Project detail modal — clicking any card opens its full details
          instead of the grid being a static, non-interactive display. */}
      {corpDetail && (
        <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setCorpDetail(null)}>
          <div
            className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-fade-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">
                {corpDetail.kind === 'service' ? 'تفاصيل الخدمة الكاملة' : 'دراسة الحالة الكاملة'}
              </h3>
              <button
                onClick={() => setCorpDetail(null)}
                className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {corpDetail.kind === 'service' && (() => {
              const service = stellaServices[corpDetail.index];
              const Icon = service.icon;
              return (
                <div className="p-6 space-y-4 text-xs">
                  <div className={`w-12 h-12 rounded-2xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-white leading-snug">{service.title}</h4>
                  <span className={`inline-block px-2.5 py-1 rounded-lg ${themeStyle.badgeBg} text-[10px] font-bold`}>{service.tag}</span>
                  <p className="text-slate-300 leading-relaxed">{service.details}</p>
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    {service.bullets.map((b) => (
                      <div key={b} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${themeStyle.primaryText}`} />
                        <span className="text-slate-300">{b}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setCorpDetail(null); setActiveTab('contact'); }}
                    className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer shadow-lg mt-2`}
                  >
                    اطلب هذه الخدمة الآن
                  </button>
                </div>
              );
            })()}

            {corpDetail.kind === 'project' && (() => {
              const project = stellaProjects[corpDetail.index];
              return (
                <div className="space-y-4 text-xs">
                  <img src={project.image} alt={project.client} className="w-full h-40 sm:h-48 object-cover" referrerPolicy="no-referrer" />
                  <div className="px-6 space-y-4 pb-6">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">{project.client}</span>
                      <h4 className="text-base font-extrabold text-white leading-snug mt-0.5">{project.title}</h4>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{project.details}</p>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                      {project.stats.map((s) => (
                        <div key={s.label} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                          <div className={`text-xs font-bold font-mono ${themeStyle.primaryText}`}>{s.value}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { setCorpDetail(null); setActiveTab('contact'); }}
                      className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer shadow-lg mt-2`}
                    >
                      لديك مشروع مشابه؟ تواصل معنا
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
