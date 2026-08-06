import React from 'react';
import {
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
  const { activeTab, gridCols, isNarrowViewport, price, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const realTab = ['home', 'properties', 'booking', 'agents'].includes(activeTab) ? activeTab : 'home';

  const SAMPLE_PROPERTIES = [
    { id: 'prop-1', title: 'فيلا ملكية فاخرة - الجادرية', category: 'villas', priceUSD: 450000, priceIQD: 650000000, location: 'بغداد - الجادرية', rooms: 5, space: '400م²', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80' },
    { id: 'prop-2', title: 'مكتب تجاري بانورامي - المنصور', category: 'apartments', priceUSD: 180000, priceIQD: 260000000, location: 'بغداد - المنصور', rooms: 3, space: '150م²', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
    { id: 'prop-3', title: 'شقة سكنية ديلوكس - الكرادة', category: 'apartments', priceUSD: 125000, priceIQD: 180000000, location: 'بغداد - الكرادة', rooms: 4, space: '180م²', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80' },
  ];

  const SAMPLE_AGENTS = [
    { name: 'م. زياد الحسيني', title: 'مستشار عقاري أول', phone: '07701112233' },
    { name: 'أ. رغد الطائي', title: 'استشارية استثمار عقاري', phone: '07709998877' },
  ];

  const filteredProperties = SAMPLE_PROPERTIES.filter(p => {
    if (selectedPropertyFilter === 'all') return true;
    return p.category === selectedPropertyFilter;
  });

  const selectedProperty = SAMPLE_PROPERTIES.find(p => p.id === selectedPropertyId) || SAMPLE_PROPERTIES[0];

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

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-5`}>
            {filteredProperties.map(prop => (
              <div key={prop.id} className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3 flex flex-col justify-between hover:border-white/25 hover:shadow-lg transition-all">
                <div className="space-y-2">
                  <div className="h-40 rounded-xl overflow-hidden relative border border-white/10 bg-black/30 backdrop-blur-sm">
                    <img src={prop.image} alt={prop.title} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-all duration-300" referrerPolicy="no-referrer" />
                    <span className="absolute top-2 right-2 bg-black/85 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10">
                      {prop.category === 'villas' ? 'فيلا فاخرة' : 'عقار مكتبي/سكني'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white px-1">{prop.title}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 px-1">
                    <span>📍 {prop.location}</span>
                    <span>📐 {prop.space}</span>
                    <span>🚪 {prop.rooms} غرف</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">القيمة التقديرية:</span>
                    <span className="text-sm font-bold text-amber-400 font-mono block">
                      {price(prop.priceIQD)}
                    </span>
                  </div>

                  <button
                    onClick={() => { setSelectedPropertyId(prop.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
                    className={`px-3 py-2 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all`}
                  >
                    طلب حجز معاينة
                  </button>
                </div>
              </div>
            ))}
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
