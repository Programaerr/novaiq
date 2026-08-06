import React from 'react';
import {
  CheckCircle2,
  Truck,
  Package,
  MapPin,
} from 'lucide-react';
import { COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { Shipment } from '../../../data/sandboxDemoData';
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
  setQuoteDestination: React.Dispatch<React.SetStateAction<'local' | 'regional' | 'international'>>;
  setQuoteWeight: React.Dispatch<React.SetStateAction<string>>;
  setTrackingInput: React.Dispatch<React.SetStateAction<string>>;
  trackShipment: () => void;
  trackingInput: string;
}

export function LogisticsDemo({ ctx, computeShippingQuote, foundShipment, quoteDestination, quoteWeight, saveShippingQuote, setQuoteDestination, setQuoteWeight, setTrackingInput, trackShipment, trackingInput }: LogisticsDemoProps) {
  const { activeTab, gridCols, price, renderCompanyHome, themeStyle } = ctx;

  const logisticsTab = ['home', 'tracking', 'calculator', 'fleet'].includes(activeTab) ? activeTab : 'home';

  return (
    <div className="space-y-6 text-slate-100">
      {/* Navigation Bar */}
      <div className={`sticky top-1 sm:top-2 z-20 flex flex-row items-center justify-between gap-3 m-1 sm:m-2 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
        <div className="group flex items-center gap-2.5">
          <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
          <div className={`navbar-logo-mark w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20`}>
            <Truck className="w-5 h-5" />
          </div>
          <span className="navbar-logo-word font-extrabold text-sm sm:text-base text-white tracking-wide">Design</span>
        </div>
        {renderSiteMenuButton()}
      </div>

      {logisticsTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-LOG-10'])}

      {logisticsTab === 'tracking' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
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
