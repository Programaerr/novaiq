import React from 'react';
import { AppWindow, Boxes, MonitorSmartphone, Palette, ShoppingBag, LayoutTemplate } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { Reveal } from './Reveal';

/**
 * The capabilities grid. Six `nq-card` panels, each carrying the number and a lucide mark
 * instead of a brand colour — the site is monochrome, so the visual hierarchy comes from the
 * card's own beam lighting plus type weight, not from a per-service hue.
 */
interface ServicesSectionProps {
  language?: Language;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';

  const services = [
    {
      n: '01',
      icon: AppWindow,
      t: isAr ? 'مواقع الشركات' : 'Corporate websites',
      d: isAr
        ? 'حضور رسمي متكامل يبني الثقة: صفحات تعرف بهويتك، بوابات خدمات، ولوحات تحكم إدارية.'
        : 'A complete, credible presence: identity pages, service portals and admin dashboards.',
    },
    {
      n: '02',
      icon: ShoppingBag,
      t: isAr ? 'المتاجر الإلكترونية' : 'E-commerce',
      d: isAr
        ? 'سلة ذكية، دفع محلي وعالمي، وتتبع طلبات يوصّل المتجر إلى العميل قبل منافسك.'
        : 'A smart cart, local and global payments, and order tracking that reaches buyers first.',
    },
    {
      n: '03',
      icon: MonitorSmartphone,
      t: isAr ? 'تطبيقات ويب' : 'Web applications',
      d: isAr
        ? 'أنظمة عمل داخلية تحوّل إجراءاتك الورقية إلى عمليات رقمية سريعة وقابلة للقياس.'
        : 'Internal systems that turn paper workflows into fast, measurable digital operations.',
    },
    {
      n: '04',
      icon: Palette,
      t: isAr ? 'هوية وتصميم' : 'Brand & design',
      d: isAr
        ? 'شعار، نظام ألوان، وقوالب تواصل تعطيك مظهراً لا يُنسى من أول نظرة.'
        : 'Logo, colour system and communication templates that are recognised at a glance.',
    },
    {
      n: '05',
      icon: LayoutTemplate,
      t: isAr ? 'قوالب جاهزة' : 'Ready templates',
      d: isAr
        ? 'أكثر من ١١ قالباً مسبق البناء بأحدث التقنيات، جاهز للطلبية والتخصيص خلال أيام.'
        : 'Eleven pre-built templates on modern stacks, ready to order and customise in days.',
    },
    {
      n: '06',
      icon: Boxes,
      t: isAr ? 'تكامل واستضافة' : 'Integrations & hosting',
      d: isAr
        ? 'ربط بوابات الدفع والتحليلات، استضافة سحابية، وأسماء نطاقات تدار كلها من مكان واحد.'
        : 'Payment gateways, analytics, cloud hosting and domains — all managed in one place.',
    },
  ];

  return (
    <section className="relative py-16 sm:py-24" aria-labelledby="services-title">
      <div className="nq-container">
        <Reveal>
          <header className="max-w-2xl">
            <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/50">
              {isAr ? 'ماذا نبني' : 'What we build'}
            </span>
            <h2
              id="services-title"
              className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
            >
              {isAr ? 'من الفكرة إلى النُضج' : 'From idea to maturity'}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/60 leading-relaxed max-w-xl">
              {isAr
                ? 'ستة خطوط عمل تغطي كل ما تحتاجه شركتك على الإنترنت — نصنعها داخلياً بمعايير موحّدة بدل أن نشتت المشروع بين مقاولين.'
                : 'Six disciplines covering everything your business needs online — built in-house to one standard instead of scattered across vendors.'}
            </p>
          </header>
        </Reveal>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {services.map((s, i) => (
            <Reveal key={s.n} delay={(i % 3) * 90}>
              <article className="nq-card nq-card--hover p-6 sm:p-8">
                <div className="flex items-start justify-between">
                  <span
                    className="w-11 h-11 rounded-xl grid place-items-center"
                    style={{ background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
                  >
                    <s.icon className="w-5 h-5 text-white/90" strokeWidth={1.8} />
                  </span>
                  <span className="text-[0.65rem] font-black tracking-widest text-white/30 tabular-nums">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-base sm:text-lg font-extrabold tracking-[0.08em] uppercase text-white">
                  {s.t}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-white/60 leading-relaxed">{s.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
