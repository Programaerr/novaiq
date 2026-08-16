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
 * The capabilities grid, redesigned: square cells with hairline borders only — no card fills.
 * Each panel is split into a slim icon bar across the top and the copy below, so the eye reads
 * the six as a ruled ledger rather than a pile of boxes.
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
        <div className="nq-container">
          <m.header
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-end justify-between gap-6 border-b border-white/15 pb-8"
          >
            <div className="max-w-2xl">
              <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/50">
                {isAr ? 'ماذا نبني' : 'What we build'}
              </span>
              <h2
                id="services-title"
                className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
              >
                {isAr ? 'من الفكرة إلى النُضج' : 'From idea to maturity'}
              </h2>
            </div>
            <span className="hidden lg:block text-white/30 font-black text-6xl leading-none text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.25)' }} aria-hidden="true">
              06
            </span>
          </m.header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-s border-t border-white/15">
            {services.map((s, i) => (
              <m.div
                key={s.n}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-32px' }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group relative border-e border-b border-white/15 p-6 sm:p-8 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-12 h-12 grid place-items-center"
                    style={{ boxShadow: 'inset 0 0 0 1px #ffffff' }}
                  >
                    <s.icon className="w-5 h-5 text-white" strokeWidth={1.6} />
                  </span>
                  <span className="text-sm font-black tracking-widest text-transparent tabular-nums" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)' }}>
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-8 text-base sm:text-lg font-extrabold tracking-[0.08em] uppercase text-white">
                  {s.t}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-white/60 leading-relaxed">{s.d}</p>
                <span
                  className="absolute bottom-0 start-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full"
                  aria-hidden="true"
                />
              </m.div>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
};