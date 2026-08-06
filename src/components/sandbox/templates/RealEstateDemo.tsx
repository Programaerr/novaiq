import React, { useState } from 'react';
import {
  ArrowUpLeft,
  CheckCircle2,
  Building2,
  Calendar,
} from 'lucide-react';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

// Cosmos Estates — the property demo: listings, filters and viewing-appointment booking.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface RealEstateDemoProps {
  ctx: SandboxCtx;
  bookingDate: string;
  propertyVisits: Array<{ id: string; propertyTitle: string; date: string; visitorName: string }>;
  selectedPropertyFilter: string;
  selectedPropertyId: string;
  setBookingDate: React.Dispatch<React.SetStateAction<string>>;
  setPropertyVisits: React.Dispatch<React.SetStateAction<Array<{ id: string; propertyTitle: string; date: string; visitorName: string }>>>;
  setSelectedPropertyFilter: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPropertyId: React.Dispatch<React.SetStateAction<string>>;
  setVisitorName: React.Dispatch<React.SetStateAction<string>>;
  visitorName: string;
}

export function RealEstateDemo({ ctx, bookingDate, propertyVisits, selectedPropertyFilter, selectedPropertyId, setBookingDate, setPropertyVisits, setSelectedPropertyFilter, setSelectedPropertyId, setVisitorName, visitorName }: RealEstateDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, matchesSiteSearch, price, renderNoSearchResults, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const realTab = ['home', 'properties', 'booking', 'agents'].includes(activeTab) ? activeTab : 'home';

  // Which photo each listing is showing. Purely presentational, so it stays here rather than
  // in the shell's state alongside the booking data the account page has to read.
  const [propertyShot, setPropertyShot] = useState<Record<string, number>>({});

  // Each listing carries several photos rather than one, so the dots under the image are a
  // real gallery the visitor can page through — the same control on the reference card, but
  // wired to something instead of drawn on.
  const SAMPLE_PROPERTIES = [
    {
      id: 'prop-1',
      title: 'فيلا ملكية فاخرة',
      tagline: 'الجادرية — إطلالة على النهر',
      description: 'فيلا بثلاث واجهات وحديقة خاصة ومسبح، تشطيب ملكي بالكامل.',
      category: 'villas', badge: 'الأكثر طلباً',
      priceUSD: 450000, priceIQD: 650000000,
      location: 'بغداد - الجادرية', rooms: 5, space: '400م²',
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80',
      ],
    },
    {
      id: 'prop-2',
      title: 'بيت عائلي حديث',
      tagline: 'المنصور — تصميم معاصر',
      description: 'بيت طابقين بمساحات مفتوحة وإضاءة طبيعية واسعة ومرآب مغلق.',
      category: 'villas', badge: 'جديد',
      priceUSD: 320000, priceIQD: 460000000,
      location: 'بغداد - المنصور', rooms: 4, space: '320م²',
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=80',
      ],
    },
    {
      id: 'prop-3',
      title: 'شقة سكنية ديلوكس',
      tagline: 'الكرادة — ضمن مجمع خدمي',
      description: 'شقة بثلاث غرف نوم وصالة واسعة، ضمن مجمع فيه أمن وخدمات متكاملة.',
      category: 'apartments', badge: 'عرض مميز',
      priceUSD: 125000, priceIQD: 180000000,
      location: 'بغداد - الكرادة', rooms: 4, space: '180م²',
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=700&q=80',
      ],
    },
    {
      id: 'prop-4',
      title: 'دار بتصميم أفقي',
      tagline: 'الأعظمية — طابق واحد',
      description: 'دار بطابق واحد بمساحات ممتدة وواجهة زجاجية مطلة على الحديقة.',
      category: 'villas', badge: 'حصري',
      priceUSD: 210000, priceIQD: 300000000,
      location: 'بغداد - الأعظمية', rooms: 4, space: '260م²',
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=700&q=80',
      ],
    },
    {
      id: 'prop-5',
      title: 'شقة بانورامية',
      tagline: 'اليرموك — طابق علوي',
      description: 'شقة بالطابق الأخير بإطلالة مفتوحة على المدينة وشرفة واسعة.',
      category: 'apartments', badge: 'إطلالة مفتوحة',
      priceUSD: 165000, priceIQD: 235000000,
      location: 'بغداد - اليرموك', rooms: 3, space: '165م²',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=700&q=80',
      ],
    },
    {
      id: 'prop-6',
      title: 'بيت مع حديقة واسعة',
      tagline: 'زيونة — هادئ وعائلي',
      description: 'بيت أرضي بحديقة كبيرة ومنطقة جلوس خارجية، مناسب للعوائل الكبيرة.',
      category: 'apartments', badge: 'مناسب للعوائل',
      priceUSD: 145000, priceIQD: 205000000,
      location: 'بغداد - زيونة', rooms: 4, space: '210م²',
      images: [
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=700&q=80',
        'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=700&q=80',
      ],
    },
  ];

  const SAMPLE_AGENTS = [
    { name: 'م. زياد الحسيني', title: 'مستشار عقاري أول', phone: '07701112233' },
    { name: 'أ. رغد الطائي', title: 'استشارية استثمار عقاري', phone: '07709998877' },
  ];

  const filteredProperties = SAMPLE_PROPERTIES.filter(p => {
    if (selectedPropertyFilter !== 'all' && p.category !== selectedPropertyFilter) return false;
    // The header's own box promises "ابحث عن عقار أو منطقة", so it has to actually reach the
    // listings — matching the area and size too, not just the title, since that's how someone
    // shopping for a house searches.
    return matchesSiteSearch(p.title, p.tagline, p.description, p.location, p.space);
  });

  const selectedProperty = SAMPLE_PROPERTIES.find(p => p.id === selectedPropertyId) || SAMPLE_PROPERTIES[0];

  // One definition for both the landing page and the listings section — they showed the same
  // cards, and two copies of this much markup would have drifted apart the first time either
  // one was touched.
  const renderPropertyCard = (prop: (typeof SAMPLE_PROPERTIES)[number]) => {
    const shot = propertyShot[prop.id] ?? 0;
    return (
      <div key={prop.id} className="rounded-[26px] bg-white p-2.5 shadow-2xl shadow-black/40 flex flex-col hover:-translate-y-1 transition-transform duration-300">
        {/* Photo — the card's own padding is what leaves the white border showing around it,
            so the image is inset rather than bleeding to the card edge. */}
        <div className="relative h-52 rounded-[20px] overflow-hidden bg-zinc-200">
          <img
            key={prop.images[shot]}
            src={prop.images[shot]}
            alt={prop.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover animate-fade-in"
          />

          <span className="absolute top-3 left-3 bg-black/45 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
            {prop.badge}
          </span>

          <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5 text-zinc-900" />
          </div>

          {/* Real gallery control, not decoration — stops at the image so tapping a dot never
              also fires the card's booking action. */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {prop.images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`صورة ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPropertyShot(prev => ({ ...prev, [prop.id]: i }));
                  cosmicAudio.playTick();
                }}
                className={`h-1.5 rounded-full cursor-pointer transition-all ${
                  i === shot ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-2.5 pt-4 pb-1 space-y-1 flex-1">
          <h4 className="text-base font-extrabold text-zinc-900 leading-snug">{prop.title}</h4>
          <p className="text-[13px] font-bold text-zinc-400">{prop.tagline}</p>
          <p className="text-[12px] text-zinc-500 leading-relaxed pt-0.5">{prop.description}</p>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-400 pt-1.5">
            <span>{prop.space}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            <span>{prop.rooms} غرف</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300" />
            <span className="truncate">{prop.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5 pt-3">
          <span className="px-3.5 py-2.5 rounded-full bg-zinc-100 text-zinc-900 text-[13px] font-extrabold font-mono whitespace-nowrap">
            {price(prop.priceIQD)}
          </span>

          {/* Follows the customer's chosen palette rather than a fixed black, so the demo
              actually previews their colour. The roundel comes from the theme too — white on
              the mid-tone palettes, but inverted on monochrome, whose button is itself white. */}
          <button
            onClick={() => { setSelectedPropertyId(prop.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
            className={`ps-4 pe-1.5 py-1.5 rounded-full ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer text-[13px] flex items-center gap-2 shrink-0 transition-colors`}
          >
            <span>احجز معاينة</span>
            <span className={`w-7 h-7 rounded-full ${themeStyle.onPrimaryChipBg} flex items-center justify-center shrink-0`}>
              <ArrowUpLeft className={`w-3.5 h-3.5 ${themeStyle.onPrimaryChipText}`} />
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-100">
      {renderSiteTopBar(<Building2 className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {realTab === 'home' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
            <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block`}>
              منصة التطوير العقاري
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
              استثمر في أفضل العقارات الفاخرة في العراق
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              فلل، شقق، ومكاتب تجارية مختارة بعناية، مع معاينة مباشرة واستشارة عقارية مجانية من فريقنا المتخصص.
            </p>
            <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
              <button onClick={() => setActiveTab('properties')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                تصفح العقارات المتاحة
              </button>
              <button onClick={() => setActiveTab('agents')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-bold cursor-pointer">
                تواصل مع مستشار عقاري
              </button>
            </div>
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>+80</div>
              <div className="text-[11px] text-slate-400">عقار متاح حالياً</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">+500</div>
              <div className="text-[11px] text-slate-400">صفقة ناجحة</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">4.9★</div>
              <div className="text-[11px] text-slate-400">تقييم رضا العملاء</div>
            </div>
          </div>

          {/* The listings themselves, on the landing page — a property site that makes you
              open a menu before showing you a single house is asking the visitor to take it on
              faith. Same cards as the listings section, minus its filters. */}
          <div className="space-y-3 pt-1">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">أحدث العقارات المتاحة</h4>
                <p className="text-[11px] text-slate-400">مختارات من فلل وبيوت وشقق جاهزة للمعاينة</p>
              </div>
              <button
                onClick={() => { setActiveTab('properties'); cosmicAudio.playTick(); }}
                className="text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>عرض الكل</span>
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-5`}>
              {SAMPLE_PROPERTIES.map(renderPropertyCard)}
            </div>
          </div>
        </div>
      )}

      {realTab === 'properties' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedPropertyFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedPropertyFilter === 'all' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSelectedPropertyFilter('villas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedPropertyFilter === 'villas' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              فلل فاخرة
            </button>
            <button
              onClick={() => setSelectedPropertyFilter('apartments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedPropertyFilter === 'apartments' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              شقق ومكاتب
            </button>
          </div>

          {filteredProperties.length === 0 && renderNoSearchResults('أي عقار')}

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-5`}>
            {filteredProperties.map(renderPropertyCard)}
          </div>
        </div>
      )}

      {realTab === 'booking' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
            <span>حجز معاينة: {selectedProperty.title}</span>
          </h4>

          <div className="space-y-1.5">
            <label className="block text-slate-400 font-bold">اختر العقار:</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white cursor-pointer"
            >
              {SAMPLE_PROPERTIES.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">اسم الزائر:</label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">تاريخ المعاينة:</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setPropertyVisits(prev => [
                { id: `VIS-${Math.floor(1000 + Math.random() * 9000)}`, propertyTitle: selectedProperty.title, date: bookingDate, visitorName },
                ...prev
              ]);
              cosmicAudio.playPing();
            }}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد طلب المعاينة</span>
          </button>

          {propertyVisits.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="font-bold text-white block">طلبات المعاينة المقدمة:</span>
              {propertyVisits.map((v) => (
                <div key={v.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-white font-bold truncate">{v.propertyTitle}</span>
                  <span className="font-mono text-slate-300 shrink-0">{v.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {realTab === 'agents' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
          {SAMPLE_AGENTS.map((agent, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} font-bold text-lg shrink-0`}>
                {agent.name.replace(/^(م\.|أ\.|د\.)\s*/, '').charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{agent.name}</h4>
                <p className="text-slate-400 truncate">{agent.title}</p>
                <p className="text-slate-500 font-mono text-[11px]" dir="ltr">{agent.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
