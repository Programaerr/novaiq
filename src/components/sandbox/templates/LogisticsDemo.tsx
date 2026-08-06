import React from 'react';
import {
  CheckCircle2,
  Truck,
  Package,
  MapPin,
} from 'lucide-react';
import { SAMPLE_SHIPMENTS, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { Shipment } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

// The shipping demo: shipment tracking, the cost calculator and the fleet view.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface LogisticsDemoProps {
  ctx: SandboxCtx;
  computeShippingQuote: () => number;
  foundShipment: Shipment | null;
  quoteDestination: 'local' | 'regional' | 'international';
  quoteWeight: string;
  saveShippingQuote: () => void;
  setFoundShipment: React.Dispatch<React.SetStateAction<Shipment | null>>;
  setQuoteDestination: React.Dispatch<React.SetStateAction<'local' | 'regional' | 'international'>>;
  setQuoteWeight: React.Dispatch<React.SetStateAction<string>>;
  setSiteSearch: React.Dispatch<React.SetStateAction<string>>;
  setTrackingInput: React.Dispatch<React.SetStateAction<string>>;
  siteSearch: string;
  trackShipment: () => void;
  trackingInput: string;
}

export function LogisticsDemo({ ctx, computeShippingQuote, foundShipment, quoteDestination, quoteWeight, saveShippingQuote, setFoundShipment, setQuoteDestination, setQuoteWeight, setSiteSearch, setTrackingInput, siteSearch, trackShipment, trackingInput }: LogisticsDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, matchesSiteSearch, price, renderCompanyHome, renderNoSearchResults, renderSiteTopBar, themeStyle } = ctx;

  const logisticsTab = ['home', 'tracking', 'calculator', 'fleet'].includes(activeTab) ? activeTab : 'home';

  return (
    <div className="space-y-6 text-slate-100">
      {renderSiteTopBar(<Truck className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {logisticsTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-LOG-10'])}

      {logisticsTab === 'tracking' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          {/* Header search feeds this tab rather than filtering a grid — a shipment is
              looked up, not browsed, so matches are offered as one-tap picks that fill
              the tracking field below. */}
          {siteSearch.trim() && (
            <div className="space-y-2">
              {SAMPLE_SHIPMENTS.filter((s) => matchesSiteSearch(s.trackingNumber, s.origin, s.destination, s.status)).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setTrackingInput(s.trackingNumber);
                    setFoundShipment(s);
                    setSiteSearch('');
                    cosmicAudio.playTick();
                  }}
                  className="w-full text-right p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <span className="font-mono font-bold text-white">{s.trackingNumber}</span>
                  <span className="text-[11px] text-slate-400 truncate">{s.origin} ← {s.destination}</span>
                </button>
              ))}
              {SAMPLE_SHIPMENTS.filter((s) => matchesSiteSearch(s.trackingNumber, s.origin, s.destination, s.status)).length === 0 &&
                renderNoSearchResults('أي شحنة')}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="مثال: CMX-77201"
              className="flex-1 p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
            />
            <button onClick={trackShipment} className={`px-4 py-2.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center gap-1.5 shrink-0`}>
              <Package className="w-3.5 h-3.5" />
              <span>تتبع</span>
            </button>
          </div>

          {foundShipment && (
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white">{foundShipment.trackingNumber}</span>
                <span className={`px-2.5 py-0.5 rounded-full ${themeStyle.badgeBg} text-[11px] font-bold`}>{foundShipment.status}</span>
              </div>
              {foundShipment.origin !== '—' && (
                <p className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{foundShipment.origin} ← {foundShipment.destination}</span>
                </p>
              )}
              <div className="space-y-2">
                {foundShipment.stages.map((stage, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    {stage.done ? (
                      <CheckCircle2 className={`w-4 h-4 ${themeStyle.primaryText} shrink-0`} />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" />
                    )}
                    <span className={stage.done ? 'text-white font-bold' : 'text-slate-500'}>{stage.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {logisticsTab === 'calculator' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-bold">وزن الشحنة (كغم):</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={quoteWeight}
              onChange={(e) => setQuoteWeight(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-bold">الوجهة:</label>
            <div className="flex gap-2">
              {(['local', 'regional', 'international'] as const).map((dest) => (
                <button
                  key={dest}
                  onClick={() => setQuoteDestination(dest)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    quoteDestination === dest ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {dest === 'local' && 'محلي'}
                  {dest === 'regional' && 'إقليمي'}
                  {dest === 'international' && 'دولي'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="font-bold text-white">السعر التقديري:</span>
            <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(computeShippingQuote())}</span>
          </div>
          <button
            onClick={saveShippingQuote}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
          >
            احصل على عرض السعر
          </button>
        </div>
      )}

      {logisticsTab === 'fleet' && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-3 animate-fade-in text-xs`}>
          {[
            { value: '128', label: 'شحنات نشطة حالياً' },
            { value: '34', label: 'مندوبين متاحين' },
            { value: '97%', label: 'معدل التسليم في الوقت' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className={`text-xl font-extrabold font-mono ${themeStyle.primaryText}`}>{stat.value}</div>
              <div className="text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
