import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { AppWindow, Boxes, MonitorSmartphone, Palette, ShoppingBag, LayoutTemplate } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { TouchRipple } from './mobile/TouchRipple';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface ServicesSectionProps {
  language?: Language;
}

/**
 * The capabilities grid — the blue pass. Six glass cards with a soft blue radial glow behind
 * each icon, a gradient heading, and a hairline that fills on hover. Cards are touch-reactive.
 */
export const ServicesSection: React.FC<ServicesSectionProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();

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
        : 'Logo, colour system and communication templates recognised at a glance.',
    },
    {
      n: '05',
      icon: LayoutTemplate,
      t: isAr ? 'قوالب جاهزة' : 'Ready templates',
      d: isAr
        ? 'أكثر من ١١ قالباً مسبق البناء بأحدث التقنيات، جاهز للطلب والتخصيص خلال أيام.'
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
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-16 sm:py-24" aria-labelledby="services-title">
        {/* Soft white ambient glow behind the whole section. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(42% 38% at 20% 20%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(45% 42% at 82% 72%, rgba(255,255,255,0.05) 0%, transparent 62%)',
          }}
          aria-hidden="true"
        />

        <div className="nq-container relative">
          <m.header
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-end justify-between gap-6 pb-8"
          >
            <div className="max-w-2xl">
              <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/60">
                {isAr ? 'ماذا نبني' : 'What we build'}
              </span>
              <h2
                id="services-title"
                className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
              >
                {isAr ? 'من الفكرة إلى النُضج' : 'From idea to maturity'}
              </h2>
            </div>
            <span
              className="hidden lg:block font-black text-6xl leading-none tabular-nums"
              style={{
                background: 'linear-gradient(120deg, rgba(255,255,255,0.5), transparent)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
              aria-hidden="true"
            >
              06
            </span>
          </m.header>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {services.map((s, i) => (
              <TouchRipple key={s.n} className="rounded-2xl">
                <m.article
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-32px' }}
                  transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative h-full rounded-2xl bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 overflow-hidden"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
                >
                  {/* Icon glow */}
                  <div className="absolute -top-10 -end-10 w-36 h-36 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)', filter: 'blur(8px)' }} aria-hidden="true" />

                  <div className="relative flex items-start justify-between">
                    <span
                      className="w-12 h-12 rounded-full grid place-items-center"
                      style={{ background: 'rgba(255,255,255,0.16)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 24px -6px rgba(255,255,255,0.6)' }}
                    >
                      <s.icon className="w-5 h-5" strokeWidth={1.6} style={{ color: '#ffffff' }} />
                    </span>
                    <span className="text-sm font-black tracking-widest tabular-nums text-white/35">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="relative mt-8 text-base sm:text-lg font-extrabold tracking-[0.08em] uppercase text-white">
                    {s.t}
                  </h3>
                  <p className="relative mt-2.5 text-xs sm:text-sm text-white/60 leading-relaxed">{s.d}</p>
                  <span
                    className="absolute bottom-0 start-0 h-px w-0 bg-gradient-to-r from-transparent via-[#ffffff] to-transparent transition-all duration-500 group-hover:w-full"
                    aria-hidden="true"
                  />
                </m.article>
              </TouchRipple>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
};
