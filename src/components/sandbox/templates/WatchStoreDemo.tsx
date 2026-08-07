import React, { useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  Gem,
  Gift,
  Heart,
  Maximize2,
  Minus,
  PenLine,
  Plus,
  ShoppingCart,
  Timer,
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

/** The three specs the catalogue card shows, as {icon, value} pairs. A watch is shopped for by
 *  comparing these against each other, so they get glyphs rather than a plain list — and the
 *  case diameter is the one buyers ask for first, so it leads. */
const specChips = (watch: WatchProduct) => [
  { Icon: Maximize2, text: `${watch.caseSizeMm} ملم` },
  { Icon: Timer, text: watch.movement },
  { Icon: Droplets, text: watch.waterResistance },
];

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
        // pt-14 on the grid and the -top-12 photo below reserve the space the case shot pokes
        // up into; without it the first row's watch is clipped by the section above.
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-x-4 gap-y-16 pt-14 animate-fade-in text-xs`}>
          {searchedWatches.map((watch) => (
            // Light product card, same treatment as the phone store so the two catalogues in
            // this sandbox read as one design language.
            <article
              key={watch.id}
              // pt-32 clears the part of the photo that hangs *into* the card, so the model
              // name never runs under it.
              className="group relative flex flex-col rounded-[28px] bg-zinc-100 px-5 pb-5 pt-32 shadow-2xl shadow-black/40"
            >
              <img
                src={watch.image}
                alt={watch.name}
                loading="lazy"
                // Physical left-1/2 on purpose: centring is symmetric, so a logical `start-`
                // would only add an RTL flip that has to be undone again.
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-[60%] h-32 sm:h-36 object-cover rounded-2xl shadow-xl shadow-black/40 transition-transform duration-500 group-hover:-translate-y-1"
              />

              {/* Vertical edge label — the badge when the model has one, the glass spec
                  otherwise, since sapphire vs mineral is a real selling point on a watch. */}
              <span
                style={{ writingMode: 'vertical-rl' }}
                className="absolute top-6 start-4 rotate-180 text-[10px] tracking-[0.35em] text-zinc-400 font-bold"
              >
                {watch.badge || 'متوفر الآن'}
              </span>

              <button
                onClick={() => toggleFavorite(watch.id)}
                aria-label={favorites.includes(watch.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-pressed={favorites.includes(watch.id)}
                className="absolute top-5 end-5 p-1.5 rounded-full hover:bg-zinc-200 cursor-pointer transition-colors"
              >
                <Heart className={`w-4 h-4 ${favorites.includes(watch.id) ? 'fill-rose-500 text-rose-500' : 'text-zinc-800'}`} />
              </button>

              {/* flex-1 + mt-auto on the buy row: descriptions differ in length, and without
                  this the price/button line landed at a different height on each card in a row. */}
              <div className="flex-1 flex flex-col gap-3">
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">{watch.name}</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">{watch.tagline}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {specChips(watch).map(({ Icon, text }) => (
                    <span key={text} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-100 text-[10px]">
                      <Icon className={`w-3 h-3 ${themeStyle.primaryText}`} />
                      {text}
                    </span>
                  ))}
                </div>

                <p className="text-zinc-500 leading-relaxed">{watch.description}</p>

                <p className="text-zinc-400 text-[10px]">
                  السوار: {watch.straps.map(s => s.label).join(' · ')}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className="leading-tight">
                    <span className="block text-[10px] text-zinc-400">يبدأ من</span>
                    <span className="font-mono text-lg font-black text-zinc-900">{price(watch.basePriceIQD)}</span>
                  </span>
                  <button
                    onClick={() => pickWatch(watch)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${themeStyle.solidOnLight} ${themeStyle.solidOnLightText} font-bold cursor-pointer shrink-0 transition-colors`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    اشترِ الآن
                  </button>
                </div>
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
