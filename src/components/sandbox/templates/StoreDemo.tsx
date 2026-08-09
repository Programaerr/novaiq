import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  ShoppingBag,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Sliders,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { SAMPLE_PRODUCTS, STORE_SORT_OPTIONS } from '../../../data/sandboxDemoData';
import type { ClothingProduct, CartItem } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { ViewportChoice } from '../SandboxChrome';
import type { SandboxCtx } from '../context';

// Orion Store — the clothing shop demo: catalogue, product modal, cart, checkout and invoice.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface StoreDemoProps {
  ctx: SandboxCtx;
  addToCart: (product: ClothingProduct, color: string, size: string, quantity: number) => void;
  cart: CartItem[];
  customerCity: string;
  customerName: string;
  customerPhone: string;
  handleCompleteOrder: () => void;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  isMobileSearchOpen: boolean;
  isStoreSortOpen: boolean;
  modalColor: string;
  modalQuantity: number;
  modalSize: string;
  orderConfirmedInvoice: any | null;
  paymentMethod: 'cod' | 'zaincash' | 'mastercard';
  renderSiteMenuButton: () => React.ReactNode;
  selectedProductForModal: ClothingProduct | null;
  setCustomerCity: React.Dispatch<React.SetStateAction<string>>;
  setCustomerName: React.Dispatch<React.SetStateAction<string>>;
  setCustomerPhone: React.Dispatch<React.SetStateAction<string>>;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCheckoutOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMobileSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStoreSortOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setModalColor: React.Dispatch<React.SetStateAction<string>>;
  setModalQuantity: React.Dispatch<React.SetStateAction<number>>;
  setModalSize: React.Dispatch<React.SetStateAction<string>>;
  setOrderConfirmedInvoice: React.Dispatch<React.SetStateAction<any | null>>;
  setPaymentMethod: React.Dispatch<React.SetStateAction<'cod' | 'zaincash' | 'mastercard'>>;
  setSelectedProductForModal: React.Dispatch<React.SetStateAction<ClothingProduct | null>>;
  setStoreSearch: React.Dispatch<React.SetStateAction<string>>;
  setStoreSort: React.Dispatch<React.SetStateAction<'default' | 'priceAsc' | 'priceDesc'>>;
  setStoreSortMenuRect: React.Dispatch<React.SetStateAction<{ top: number; left: number; width: number } | null>>;
  storeCategory: 'all' | 'men' | 'women' | 'accessories';
  storeSearch: string;
  storeSort: 'default' | 'priceAsc' | 'priceDesc';
  storeSortBtnRef: React.RefObject<HTMLButtonElement>;
  storeSortMenuRect: { top: number; left: number; width: number } | null;
  totalCartCount: number;
  totalCartIQD: number;
  updateCartQuantity: (index: number, delta: number) => void;
  viewport: ViewportChoice;
}

export function StoreDemo({ ctx, addToCart, cart, customerCity, customerName, customerPhone, handleCompleteOrder, isCartOpen, isCheckoutOpen, isMobileSearchOpen, isStoreSortOpen, modalColor, modalQuantity, modalSize, orderConfirmedInvoice, paymentMethod, renderSiteMenuButton, selectedProductForModal, setCustomerCity, setCustomerName, setCustomerPhone, setIsCartOpen, setIsCheckoutOpen, setIsMobileSearchOpen, setIsStoreSortOpen, setModalColor, setModalQuantity, setModalSize, setOrderConfirmedInvoice, setPaymentMethod, setSelectedProductForModal, setStoreSearch, setStoreSort, setStoreSortMenuRect, storeCategory, storeSearch, storeSort, storeSortBtnRef, storeSortMenuRect, totalCartCount, totalCartIQD, updateCartQuantity, viewport }: StoreDemoProps) {
  const { gridCols, isNarrowViewport, price, themeStyle } = ctx;

  const sortedProducts = [...SAMPLE_PRODUCTS]
    .filter(p => {
      const matchesCategory = storeCategory === 'all' || p.category === storeCategory;
      const matchesSearch = p.name.toLowerCase().includes(storeSearch.toLowerCase()) || 
                            p.description.toLowerCase().includes(storeSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (storeSort === 'priceAsc') return a.priceIQD - b.priceIQD;
      if (storeSort === 'priceDesc') return b.priceIQD - a.priceIQD;
      return 0;
    });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Sticky Store Navbar — same glass-pill identity treatment as the real NOVAIQ navbar */}
      <div className="sticky top-1 sm:top-2 z-30 mb-6 bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/20 select-none rounded-2xl overflow-hidden">
        <div className={`relative flex items-center justify-between gap-2 p-3 px-3 ${isNarrowViewport ? '' : 'sm:gap-4 sm:p-4 sm:px-6'}`}>
          {/* Right cluster: sections menu, then search, right next to each other. */}
          <div className="flex items-center gap-2 shrink-0">
          {renderSiteMenuButton()}

          {/* Search — on mobile this is a compact icon trigger matching the
              cart's own style, same as it used to be a full input squeezed next to the
              centered logo. Tapping it expands an input that takes over the whole row
              (the "وسط"/centered placement asked for) instead of trying to fit a usable
              text field into a slice of a 390px row alongside everything else. Desktop
              keeps the plain always-visible input, capped in width so it doesn't fight
              the absolutely centered logo for space the way an unconstrained flex-1
              would. */}
          {isNarrowViewport ? (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="بحث"
              className="flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 text-slate-300 cursor-pointer transition-colors shrink-0 p-2.5"
            >
              <Search className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative w-36 lg:w-56 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input
                type="text"
                value={storeSearch}
                onChange={e => setStoreSearch(e.target.value)}
                placeholder="ابحث عن الموديلات"
                className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
              />
            </div>
          )}

          {isNarrowViewport && isMobileSearchOpen && (
            <div className="absolute inset-0 z-10 flex items-center gap-2 px-3 bg-zinc-950/95 backdrop-blur-sm rounded-2xl animate-fade-in">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  autoFocus
                  type="text"
                  value={storeSearch}
                  onChange={e => setStoreSearch(e.target.value)}
                  placeholder="ابحث عن الموديلات"
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                aria-label="إغلاق البحث"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          </div>

          {/* Center: Logo & Name — absolutely centered on the row's own midpoint
              instead of sitting between the two side elements in normal flex flow,
              since those two are different widths and justify-between only splits
              the leftover space evenly, not the row itself, which pushed the logo
              visibly off-center toward whichever side was narrower. */}
          <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 min-w-0 ${isNarrowViewport ? '' : 'sm:gap-3'}`}>
            <span className={`font-extrabold text-xs text-white tracking-wide whitespace-nowrap ${isNarrowViewport ? '' : 'sm:text-base'}`}>Logo</span>
            <div className={`navbar-logo-mark relative w-8 h-8 rounded-xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20 ${isNarrowViewport ? '' : 'sm:w-11 sm:h-11 sm:rounded-2xl'}`}>
              <ShoppingBag className={`w-4 h-4 ${isNarrowViewport ? '' : 'sm:w-5 sm:h-5'}`} />
            </div>
          </div>

          {/* Left cluster: cart, then sorting controls. Both this whole row and the
              sort trigger stay reachable the entire time the customer scrolls — the
              sticky wrapper around this whole card already pins it to the top of the
              viewport, so nothing extra is needed here to keep sort "stuck" through
              scroll; it was only ever un-stuck while it lived in the second, non-sticky
              row below. */}
          <div className="flex items-center gap-2 shrink-0">
          {/* Interactive Shopify Cart Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setIsCartOpen(true);
                cosmicAudio.playTick();
              }}
              className={`relative px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 flex items-center gap-3 transition-all text-xs text-white font-extrabold cursor-pointer group shadow-lg ${isNarrowViewport ? '' : 'lg:px-3.5 lg:py-2 lg:gap-2.5'}`}
            >
              <div className="relative shrink-0">
                <ShoppingCart className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-2.5 -left-2.5 bg-rose-500 text-white text-[9px] font-mono font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                    {totalCartCount}
                  </span>
                )}
              </div>

              {/* Full label + price only from lg: up — at tablet widths (~834px) this
                  whole header row (sort, cart, logo, search, menu) is tight enough that
                  the full "حقيبة التسوق" text was overlapping the centered logo; icon +
                  badge (+ price once there's an lg: screen's worth of room) reads fine
                  without it. */}
              <span className={`hidden text-[11px] whitespace-nowrap ${isNarrowViewport ? '' : 'lg:inline'}`}>حقيبة التسوق</span>
              {totalCartIQD > 0 && !isNarrowViewport && (
                <>
                  <span className="w-px h-3.5 bg-white/15 shrink-0 lg:hidden" />
                  <span className="font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[9px] whitespace-nowrap lg:px-2 lg:text-[10px]">
                    {price(totalCartIQD)}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sorting controls — a custom dropdown instead of a native <select>: the
              browser draws a native <select>'s open popup itself (plain OS list, blue
              highlight), which CSS can't reach at all, so it always looks out of place
              next to the rest of the site's glass styling. */}
          <div className="relative flex items-center gap-2 shrink-0">
            <button
              ref={storeSortBtnRef}
              type="button"
              onClick={() => {
                if (!isStoreSortOpen && storeSortBtnRef.current) {
                  const r = storeSortBtnRef.current.getBoundingClientRect();
                  const menuWidth = Math.max(r.width, 200);
                  // Clamp within the viewport instead of always anchoring off the
                  // trigger's own right edge — the trigger is icon-only and sits near
                  // the left edge on mobile now, so a fixed-right popup wider than the
                  // trigger itself was rendering mostly off-screen to the left.
                  const left = Math.min(Math.max(r.left, 8), window.innerWidth - menuWidth - 8);
                  setStoreSortMenuRect({ top: r.bottom + 6, left, width: r.width });
                }
                setIsStoreSortOpen((v) => !v);
              }}
              aria-haspopup="listbox"
              aria-expanded={isStoreSortOpen}
              aria-label="ترتيب الموديلات"
              className="flex items-center justify-between gap-2.5 bg-black/30 backdrop-blur-sm border border-white/10 hover:border-white/25 text-slate-300 rounded-xl cursor-pointer transition-colors font-bold p-2.5 sm:px-3 sm:py-2"
            >
              <Sliders className="w-3.5 h-3.5 shrink-0 sm:hidden" />
              <span className="hidden sm:inline text-[10px]">{STORE_SORT_OPTIONS.find((o) => o.value === storeSort)?.label}</span>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isStoreSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Portaled to <body> — the sticky store navbar above uses overflow-hidden
                to keep its own rounded corners clean, which would otherwise clip this
                popup instead of just letting it float over the page. */}
            {isStoreSortOpen && storeSortMenuRect && createPortal(
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setIsStoreSortOpen(false)} />
                <div
                  role="listbox"
                  style={{ top: storeSortMenuRect.top, left: storeSortMenuRect.left, width: Math.max(storeSortMenuRect.width, 200) }}
                  className="fixed z-[71] rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden animate-fade-in"
                >
                  {STORE_SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={storeSort === opt.value}
                      onClick={() => {
                        setStoreSort(opt.value);
                        setIsStoreSortOpen(false);
                        cosmicAudio.playTick();
                      }}
                      className={`w-full text-right px-3 py-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
                        storeSort === opt.value
                          ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}
          </div>
          </div>
        </div>
      </div>

      {/* NOVAIQ's own catalogue name for this template — a preview-only label, not part of
          the fictional store's own branding, so it sits below the store's own navbar rather
          than inside it. Mirrors SiteTopBar's topLabel, which the other nine demos get through
          `ctx.renderSiteTopBar`; this one hand-rolls its own navbar instead of going through
          that shared component, so it needs its own copy of the label. */}
      <div className="text-center text-xs sm:text-sm font-bold text-white">
        {ctx.template.title}
      </div>

      {/* Products Grid */}
      <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-6`}>
        {sortedProducts.map((prod, prodIndex) => (
          <div
            key={prod.id}
            style={{ animation: 'card-in 0.35s ease-out both', animationDelay: `${prodIndex * 0.05}s` }}
            className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              {/* Thumbnail / Image Mock — the wave SVG overlaps the image's own bottom
                  edge, so only the top corners are rounded here; the wave itself reads
                  as the card's real bottom edge instead of a straight rectangular cut. */}
              <div className="h-48 rounded-t-xl bg-black/30 backdrop-blur-sm border border-white/10 relative overflow-hidden group-hover:scale-[1.01] transition-all duration-300">
                {prod.imageUrl ? (
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${prod.imageBg}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <svg
                  className="product-card-wave absolute -bottom-px left-0 w-full h-9 pointer-events-none"
                  viewBox="0 0 500 60"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M0,30 C125,60 375,0 500,30 L500,60 L0,60 Z" fill="#09090b" />
                </svg>
                <div className="absolute top-2.5 right-2.5 flex items-center justify-between w-[calc(100%-20px)] z-10">
                  {prod.badge && (
                    <span className="px-2.5 py-1 rounded-md bg-black/90 text-[10px] font-bold text-white border border-white/10">
                      {prod.badge}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10">
                    #{prod.id}
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                  {prod.colors.slice(0, 2).map((c, i) => (
                    <span key={i} className="text-[9px] bg-black/70 text-slate-200 px-2 py-0.5 rounded border border-white/5">
                      {c}
                    </span>
                  ))}
                  {prod.colors.length > 2 && (
                    <span className="text-[9px] bg-black/70 text-slate-200 px-1 rounded border border-white/5">
                      +{prod.colors.length - 2}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white leading-snug">{prod.name}</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{prod.description}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div>
                <div className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                  {price(prod.priceIQD)}
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedProductForModal(prod);
                  setModalColor(prod.colors[0]);
                  setModalSize(prod.sizes[0]);
                  setModalQuantity(1);
                }}
                className={`px-3.5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تخصيص وشراء</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Product Options Modal (High Fidelity Preview & Setup) */}
      {selectedProductForModal && (
        <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in my-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className={`w-5 h-5 ${themeStyle.primaryText}`} />
                <h3 className="text-sm font-bold text-white">معاينة وتخصيص تفاصيل المنتج الفاخر</h3>
              </div>
              <button 
                onClick={() => setSelectedProductForModal(null)} 
                className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Layout Grid */}
            <div className={`grid ${gridCols('grid-cols-1', 'md:grid-cols-12')} gap-6 p-6`}>

              {/* Left Column: Image Area */}
              <div className="md:col-span-5 space-y-3">
                <div className="aspect-[4/5] rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10 overflow-hidden relative group">
                  {selectedProductForModal.imageUrl ? (
                    <img 
                      src={selectedProductForModal.imageUrl} 
                      alt={selectedProductForModal.name} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${selectedProductForModal.imageBg} flex items-center justify-center`} />
                  )}

                  {selectedProductForModal.badge && (
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-emerald-500/25 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                      {selectedProductForModal.badge}
                    </span>
                  )}

                  <div className="absolute bottom-3 left-3 bg-black/75 px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-slate-300">
                    {selectedProductForModal.id}
                  </div>
                </div>

                <div className="p-3 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 text-center">
                  <span className="text-[10px] text-slate-400">توصيل محلي مباشر • شحن تجريبي مجاني</span>
                </div>
              </div>

              {/* Right Column: Choices */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">تفاصيل الموديل المعتمد</span>
                    <h4 className="text-base font-extrabold text-white leading-snug mt-0.5">{selectedProductForModal.name}</h4>

                    {/* Static Reviews / Badges */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400">
                      <span className="font-bold">4.9</span>
                      <div className="flex">{'★'.repeat(5)}</div>
                      <span className="text-[10px] text-slate-500">(140 تقييم زبون حقيقي)</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">متوفر</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
                    <span className="text-[11px] text-slate-400 block mb-0.5">السعر الفردي للقطعة:</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-lg font-bold font-mono ${themeStyle.primaryText}`}>
                        {price(selectedProductForModal.priceIQD)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-300 leading-relaxed bg-white/5 backdrop-blur-sm p-2.5 rounded-lg border border-white/10">
                      {selectedProductForModal.description}
                    </p>
                  </div>

                  {/* Colors Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold text-[11px]">الألوان المتوفرة في المخزن:</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForModal.colors.map(col => {
                        const isSelected = modalColor === col;
                        return (
                          <button
                            key={col}
                            onClick={() => setModalColor(col)}
                            className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                              isSelected 
                                ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white scale-[1.03] shadow-md shadow-black/40` 
                                : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10 hover:text-white hover:border-white/25'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                            <span>{col}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sizes Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold text-[11px]">القياسات المطلوبة:</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForModal.sizes.map(s => {
                        const isSelected = modalSize === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setModalSize(s)}
                            className={`min-w-[40px] h-9 px-3.5 rounded-xl border text-xs font-bold font-mono cursor-pointer transition-all duration-200 flex items-center justify-center ${
                              isSelected 
                                ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white scale-[1.03] shadow-md shadow-black/40` 
                                : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10 hover:text-white hover:border-white/25'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Quantity Selection */}
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-400 font-bold text-[11px]">الكمية المطلوبة:</label>
                      <span className="text-[11px] text-slate-500 font-bold">الحد الأقصى للشراء 10 قطع</span>
                    </div>
                    <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10 w-fit">
                      <button 
                        onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                        className="p-1.5 hover:bg-slate-800 hover:text-white text-slate-400 cursor-pointer rounded-lg transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-mono font-bold text-white text-sm px-4 select-none">{modalQuantity}</span>
                      <button 
                        onClick={() => setModalQuantity(prev => Math.min(10, prev + 1))}
                        className="p-1.5 hover:bg-slate-800 hover:text-white text-slate-400 cursor-pointer rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div className={`pt-4 border-t border-white/10 flex ${isNarrowViewport ? 'flex-col items-stretch' : 'flex-col sm:flex-row items-stretch sm:items-center'} justify-between gap-4`}>
                  <div>
                    <span className="text-slate-400 block text-[10px]">إجمالي التكلفة المباشرة:</span>
                    <span className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                      {price((selectedProductForModal.priceIQD * modalQuantity))}
                    </span>
                  </div>

                  <button
                    onClick={() => addToCart(selectedProductForModal, modalColor, modalSize, modalQuantity)}
                    className={`px-6 py-3 rounded-2xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>تأكيد الإضافة إلى حقيبة التسوق ({modalQuantity} قطع)</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-end">
          <div className="bg-slate-950/95 backdrop-blur-2xl border-r border-white/10 w-full max-w-md h-full flex flex-col justify-between p-5 space-y-4 animate-fade-in">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className={`w-5 h-5 ${themeStyle.primaryText}`} />
                  <h3 className="text-sm font-bold text-white">حقيبة التسوق الخاصة بك</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">حقيبة التسوق فارغة حالياً.</p>
                </div>
              ) : (
                <div data-lenis-prevent className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <h4 className="font-bold text-white">{item.product.name}</h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>اللون: {item.selectedColor}</span>
                          <span>القياس: {item.selectedSize}</span>
                        </div>
                        <div className={`font-mono font-bold ${themeStyle.primaryText}`}>
                          {price((item.product.priceIQD * item.quantity))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                        <button onClick={() => updateCartQuantity(idx, -1)} className="p-1 hover:text-white text-slate-400 cursor-pointer">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-white text-xs px-1">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(idx, 1)} className="p-1 hover:text-white text-slate-400 cursor-pointer">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>إجمالي المنتجات:</span>
                    <span className="font-mono text-white">{price(totalCartIQD)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>أجور التوصيل المباشر:</span>
                    <span className="text-emerald-400 font-bold">مجاني (عرض خاص)</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                    <span>الإجمالي الكلي:</span>
                    <span className={`font-mono ${themeStyle.primaryText}`}>{price(totalCartIQD)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-lg`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>الانتقال لإتمام الطلب والشحن</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-4">
          <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>معلومات الطلب والتوصيل التجريبي</span>
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">الاسم الكامل:</label>
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white" 
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">رقم الهاتف (للتواصل عند التسليم):</label>
                <input 
                  type="text" 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" 
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">المحافظة والعنوان التفصيلي:</label>
                <input 
                  type="text" 
                  value={customerCity} 
                  onChange={e => setCustomerCity(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white" 
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5">وسيلة الدفع:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                      paymentMethod === 'cod' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                    }`}
                  >
                    الدفع عند الاستلام
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('zaincash')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                      paymentMethod === 'zaincash' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                    }`}
                  >
                    زين كاش
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('mastercard')}
                    className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                      paymentMethod === 'mastercard' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                    }`}
                  >
                    ماستر / كي كارد
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">المبلغ النهائي للطلب:</span>
                  <span className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                    {price(totalCartIQD)}
                  </span>
                </div>

                <button
                  onClick={handleCompleteOrder}
                  className={`px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer hover:scale-[1.02] transition-transform`}
                >
                  تأكيد الطلب واستخراج الفاتورة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Order Invoice Screen Modal */}
      {orderConfirmedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4">
          <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-100">
            <div className="text-center space-y-2 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">تم استلام طلبك بنجاح!</h3>
              <p className="text-xs text-slate-400">فاتورة طلب تجريبية مكتملة لموقعك القادم</p>
            </div>

            <div className="space-y-2.5 text-xs bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">رقم الفاتورة:</span>
                <span className="font-mono font-bold text-white">{orderConfirmedInvoice.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">اسم العميل:</span>
                <span className="font-bold text-white">{orderConfirmedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رقم الهاتف:</span>
                <span className="font-mono text-white">{orderConfirmedInvoice.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">عنوان التوصيل:</span>
                <span className="text-white">{orderConfirmedInvoice.customerCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">طريقة الدفع:</span>
                <span className="text-emerald-400 font-bold">{orderConfirmedInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                <span>إجمالي الفاتورة:</span>
                <span className={`font-mono text-sm ${themeStyle.primaryText}`}>
                  {price(orderConfirmedInvoice.totalIQD)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOrderConfirmedInvoice(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer text-center"
              >
                متابعة التصفح والتسوق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
