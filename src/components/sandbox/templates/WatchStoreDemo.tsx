import React, { useState } from 'react';
import {
  CheckCircle2,
  Gem,
  Gift,
  Heart,
  Minus,
  PenLine,
  Plus,
  ShoppingCart,
  Watch,
} from 'lucide-react';
import {
  COMPANY_PROFILES,
  SAMPLE_WATCHES,
  WATCH_ENGRAVING_IQD,
  WATCH_ENGRAVING_MAX,
  WATCH_GIFT_WRAP_IQD,
} from '../../../data/sandboxDemoData';
import type { WatchOrder, WatchProduct } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

/** An engraving is optional, so "no engraving" has to be a real state rather than an empty
 *  string the summary would render as a blank row. Both the order card and the confirmation
 *  read through this. */
export const engravingLabel = (engraving: string) => engraving.trim() || 'بدون نقش';

// The watch-store demo: a catalogue of models, then strap / engraving / quantity / gift wrap on
// the way to a confirmed order. Rendered by TemplateInteractiveSandbox. Everything shared with
// the other demos arrives via `ctx`; this demo's own state stays owned by the shell, which needs
// to read it for the account page and for the "what did the customer configure" contract summary.
interface WatchStoreDemoProps {
  ctx: SandboxCtx;
  computeWatchTotal: (watch: WatchProduct, strapId: string, quantity: number, engraving: string, giftWrap: boolean) => number;
  confirmWatchOrder: (watch: WatchProduct) => void;
  engraving: string;
  giftWrap: boolean;
  selectedStrapId: string;
  selectedWatchId: string;
  setEngraving: React.Dispatch<React.SetStateAction<string>>;
  setGiftWrap: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedStrapId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedWatchId: React.Dispatch<React.SetStateAction<string>>;
  setWatchQuantity: React.Dispatch<React.SetStateAction<number>>;
  watchOrders: WatchOrder[];
  watchQuantity: number;
}

export function WatchStoreDemo({ ctx, computeWatchTotal, confirmWatchOrder, engraving, giftWrap, selectedStrapId, selectedWatchId, setEngraving, setGiftWrap, setSelectedStrapId, setSelectedWatchId, setWatchQuantity, watchOrders, watchQuantity }: WatchStoreDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, matchesSiteSearch, price, renderCompanyHome, renderNoSearchResults, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const watchTab = ['home', 'watches', 'order', 'confirmation'].includes(activeTab) ? activeTab : 'home';
  const selectedWatch = SAMPLE_WATCHES.find(w => w.id === selectedWatchId) || SAMPLE_WATCHES[0];
  // The strap is stored as a plain id, so a watch switched from under it can leave a strap the
  // new model doesn't offer — fall back to its default rather than pricing a strap that is gone.
  const activeStrap = selectedWatch.straps.find(s => s.id === selectedStrapId) || selectedWatch.straps[0];
  const orderTotal = computeWatchTotal(selectedWatch, activeStrap.id, watchQuantity, engraving, giftWrap);
  const latestOrder = watchOrders[0];
  const searchedWatches = SAMPLE_WATCHES.filter((w) =>
    matchesSiteSearch(w.name, w.brand, w.movement, w.waterResistance, `${w.caseSizeMm} ملم`));

  // Wishlist hearts: purely a catalogue affordance, so unlike the order state the shell never
  // reads it and it stays local to this demo.
  const [favorites, setFavorites] = useState<string[]>([]);
  const toggleFavorite = (id: string) => {
    setFavorites(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]));
    cosmicAudio.playTick();
  };

  const pickWatch = (watch: WatchProduct) => {
    setSelectedWatchId(watch.id);
    setSelectedStrapId(watch.straps[0].id);
    setWatchQuantity(1);
    setActiveTab('order');
    cosmicAudio.playPing();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {renderSiteTopBar(<Watch className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {watchTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-WATCH-10'])}

      {watchTab === 'watches' && searchedWatches.length === 0 && renderNoSearchResults('أي ساعة')}

      {watchTab === 'watches' && searchedWatches.length > 0 && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-5 animate-fade-in text-xs`}>
          {searchedWatches.map((watch) => (
            // Neumorphic product card: one sheet of pale material with the photo inset into it
            // and the spec panel + buy button pressed back out. The shadows live in .neu-card /
            // .neu-panel / .neu-btn (index.css) rather than in utilities here, because soft UI
            // needs a *matched pair* per surface — a light shadow up-left and a dark one
            // down-right — and splitting that pair across arbitrary class strings is how it
            // ends up flattened on one element and not another.
            // aspect-square, so the card is a true square at whatever width the column gives
            // it. The photo takes the leftover height (flex-1 + min-h-0) instead of a fixed
            // h-44: with a fixed photo the card's height was set by its content and the cards
            // came out wide letterboxes, and hard-coding a height per breakpoint would only be
            // square at the one viewport it was measured on. min-h-0 is required — a flex item
            // will not shrink below its content without it, and the image would push the card
            // taller than its own aspect ratio.
            <article key={watch.id} className="group neu-card rounded-[28px] p-4 flex flex-col gap-4 aspect-square">
              <div className="relative rounded-[20px] overflow-hidden flex-1 min-h-0">
                <img
                  src={watch.image}
                  alt={watch.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Scrim, not a flat tint: the name sits over photos that range from a white
                    studio background to a near-black one, and only a bottom-weighted gradient
                    keeps it legible on both without dimming the whole image. */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

                <button
                  onClick={() => toggleFavorite(watch.id)}
                  aria-label={favorites.includes(watch.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  aria-pressed={favorites.includes(watch.id)}
                  className="absolute top-3 end-3 p-2 rounded-full bg-black/35 backdrop-blur-sm hover:bg-black/55 cursor-pointer transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(watch.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                </button>

                {watch.badge && (
                  <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold">
                    {watch.badge}
                  </span>
                )}

                <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-white leading-tight truncate">{watch.name}</h4>
                    <p className="text-white/70 text-[11px] truncate">{watch.tagline}</p>
                  </div>
                  <span className="shrink-0 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-sm text-white font-mono font-bold text-[11px]">
                    {price(watch.basePriceIQD)}
                  </span>
                </div>
              </div>

              {/* Spec panel + action, the reference's lower slab. shrink-0 so the square card
                  takes its height out of the photo above rather than crushing this panel — the
                  specs are the part a buyer actually compares between cards. */}
              <div className="neu-panel rounded-[20px] p-4 flex items-center gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-600 truncate">{watch.brand} · {watch.glass}</p>
                  <p className="text-slate-400 text-[10px] truncate">{watch.straps.map(s => s.label).join(' · ')}</p>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-300/70 grid grid-cols-3 gap-1">
                    {watch.cardStats.map((stat) => (
                      <div key={stat.label} className="min-w-0">
                        <div className="font-bold text-slate-600 text-[11px] truncate">{stat.value}</div>
                        <div className="text-slate-400 text-[9px] truncate">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => pickWatch(watch)}
                  aria-label={`اشترِ ${watch.name}`}
                  className="neu-btn w-12 h-12 rounded-full shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {watchTab === 'order' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center gap-3">
            <img
              src={selectedWatch.image}
              alt={selectedWatch.name}
              className={`w-14 h-14 rounded-xl object-cover border border-white/10 bg-gradient-to-b ${selectedWatch.imageBg}`}
            />
            <div>
              <h4 className="text-sm font-bold text-white">طلب: {selectedWatch.name}</h4>
              <p className="text-slate-400">{selectedWatch.tagline}</p>
            </div>
          </div>

          {/* Choices on one side, what they cost on the other — the pickers are narrow, and
              left alone in a full-width card they stranded half the row empty on desktop. */}
          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-x-6 gap-y-4 items-start`}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">السوار:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedWatch.straps.map((strap) => (
                    <button
                      key={strap.id}
                      onClick={() => { setSelectedStrapId(strap.id); cosmicAudio.playTick(); }}
                      className={`px-3 py-2 rounded-lg border font-bold cursor-pointer transition-all ${
                        strap.id === activeStrap.id
                          ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-transparent`
                          : 'bg-black/30 backdrop-blur-sm border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {strap.label}
                      {strap.extraIQD > 0 && <span className="font-mono opacity-70"> +{price(strap.extraIQD)}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* The engraving is what makes a watch a gift rather than a purchase, so it is a
                  free-text field rather than a toggle. maxLength is the caseback's real limit —
                  the shell re-checks it on confirm so a paste can't smuggle a longer string in. */}
              <div className="space-y-1.5">
                <label htmlFor="watch-engraving" className="flex items-center gap-1.5 text-slate-400 font-bold">
                  <PenLine className="w-3.5 h-3.5" />
                  <span>نقش على ظهر العلبة (اختياري):</span>
                </label>
                <input
                  id="watch-engraving"
                  type="text"
                  value={engraving}
                  maxLength={WATCH_ENGRAVING_MAX}
                  onChange={(e) => setEngraving(e.target.value)}
                  placeholder="مثال: حيدر — 2026"
                  className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white"
                />
                <p className="text-slate-500 text-[10px]">
                  {engraving.trim()
                    ? `${engraving.trim().length} / ${WATCH_ENGRAVING_MAX} حرف — يضاف ${price(WATCH_ENGRAVING_IQD)} للقطعة`
                    : `حتى ${WATCH_ENGRAVING_MAX} حرفاً — اتركه فارغاً إذا ما تريد نقشاً`}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">الكمية:</label>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-2 w-fit">
                  <button onClick={() => setWatchQuantity(q => Math.max(1, q - 1))} className="text-white cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="font-mono font-bold text-white w-6 text-center">{watchQuantity}</span>
                  <button onClick={() => setWatchQuantity(q => Math.min(5, q + 1))} className="text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => { setGiftWrap(g => !g); cosmicAudio.playTick(); }}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all text-start ${
                  giftWrap ? `${themeStyle.badgeBg} border-white/25` : 'bg-black/30 backdrop-blur-sm border-white/10 hover:border-white/25'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Gift className={`w-4 h-4 ${giftWrap ? themeStyle.primaryText : 'text-slate-500'}`} />
                  <span className="text-white font-bold">تغليف هدية وتوصيل مؤمّن</span>
                </span>
                <span className={`font-mono ${giftWrap ? themeStyle.primaryText : 'text-slate-400'}`}>+ {price(WATCH_GIFT_WRAP_IQD)}</span>
              </button>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/20 border border-white/5">
                <Gem className={`w-4 h-4 shrink-0 ${themeStyle.primaryText}`} />
                <span className="text-slate-400 leading-relaxed">
                  شهادة أصالة وكفالة دولية سنتان مرفقة مجاناً مع كل قطعة.
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{selectedWatch.name} × {watchQuantity}</span>
                  <span className="font-mono text-white">{price(selectedWatch.basePriceIQD * watchQuantity)}</span>
                </div>
                {activeStrap.extraIQD > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{activeStrap.label} × {watchQuantity}</span>
                    <span className="font-mono text-white">{price(activeStrap.extraIQD * watchQuantity)}</span>
                  </div>
                )}
                {engraving.trim() && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">نقش «{engraving.trim()}» × {watchQuantity}</span>
                    <span className="font-mono text-white">{price(WATCH_ENGRAVING_IQD * watchQuantity)}</span>
                  </div>
                )}
                {giftWrap && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تغليف هدية وتوصيل مؤمّن</span>
                    <span className="font-mono text-white">{price(WATCH_GIFT_WRAP_IQD)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-bold text-white">الإجمالي:</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(orderTotal)}</span>
                </div>
                <p className="text-slate-500 text-[10px]">أو بالتقسيط: {price(Math.round(orderTotal / 6))} شهرياً لمدة 6 أشهر</p>
              </div>

              <button
                onClick={() => confirmWatchOrder(selectedWatch)}
                className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الطلب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {watchTab === 'confirmation' && (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-3 animate-fade-in text-xs">
          {latestOrder ? (
            <>
              <div className={`w-14 h-14 rounded-full ${themeStyle.badgeBg} flex items-center justify-center mx-auto`}>
                <CheckCircle2 className={`w-6 h-6 ${themeStyle.primaryText}`} />
              </div>
              <h4 className="text-sm font-bold text-white">تم تأكيد طلبك بنجاح</h4>
              <p className="text-slate-400 font-mono">رقم المرجع: {latestOrder.id}</p>
              <div className="max-w-xs mx-auto p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-start space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">الساعة:</span><span className="text-white font-bold">{latestOrder.watchName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">السوار:</span><span className="text-white">{latestOrder.strap}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">النقش:</span><span className="text-white">{engravingLabel(latestOrder.engraving)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الكمية:</span><span className="text-white font-mono">{latestOrder.quantity}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">التغليف:</span><span className="text-white">{latestOrder.giftWrap ? 'علبة هدية + توصيل مؤمّن' : 'علبة المصنع الأصلية'}</span></div>
                <div className="flex justify-between pt-1.5 border-t border-white/10"><span className="text-slate-400">الإجمالي:</span><span className={`font-bold ${themeStyle.primaryText}`}>{price(latestOrder.totalIQD)}</span></div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 py-6">لا يوجد طلب مؤكد بعد — أكمل خطوة الطلب أولاً.</p>
          )}
        </div>
      )}
    </div>
  );
}
