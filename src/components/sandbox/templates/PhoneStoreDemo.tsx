import React from 'react';
import {
  CheckCircle2,
  Plus,
  Minus,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { SAMPLE_PHONES, PHONE_WARRANTY_IQD, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { PhoneProduct, PhoneOrder } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

/** 1024 GB is sold as "1 تيرا", not "1024 غيغا" — the catalogue and the order summary both
 *  quote capacity, so the wording lives in one place. */
export const storageLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024} تيرا` : `${gb} غيغا`);

// The mobile-store demo: a phone catalogue, then storage/colour/quantity/warranty on the way to
// a confirmed order. Rendered by TemplateInteractiveSandbox. Everything shared with the other
// demos arrives via `ctx`; this demo's own state stays owned by the shell, which needs to read
// it for the account page and for the "what did the customer configure" contract summary.
interface PhoneStoreDemoProps {
  ctx: SandboxCtx;
  computePhoneTotal: (phone: PhoneProduct, storageGb: number, quantity: number, warranty: boolean) => number;
  confirmPhoneOrder: (phone: PhoneProduct) => void;
  phoneOrders: PhoneOrder[];
  phoneQuantity: number;
  selectedColor: string;
  selectedPhoneId: string;
  selectedStorageGb: number;
  setPhoneQuantity: React.Dispatch<React.SetStateAction<number>>;
  setSelectedColor: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPhoneId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedStorageGb: React.Dispatch<React.SetStateAction<number>>;
  setWarranty: React.Dispatch<React.SetStateAction<boolean>>;
  warranty: boolean;
}

export function PhoneStoreDemo({ ctx, computePhoneTotal, confirmPhoneOrder, phoneOrders, phoneQuantity, selectedColor, selectedPhoneId, selectedStorageGb, setPhoneQuantity, setSelectedColor, setSelectedPhoneId, setSelectedStorageGb, setWarranty, warranty }: PhoneStoreDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, matchesSiteSearch, price, renderCompanyHome, renderNoSearchResults, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const phoneTab = ['home', 'phones', 'order', 'confirmation'].includes(activeTab) ? activeTab : 'home';
  const selectedPhone = SAMPLE_PHONES.find(p => p.id === selectedPhoneId) || SAMPLE_PHONES[0];
  // Capacity and colour are stored as plain values, so a phone switched from under them can
  // leave a tier/colour the new model doesn't offer — fall back to its cheapest/first instead.
  const activeTier = selectedPhone.storageTiers.find(t => t.gb === selectedStorageGb) || selectedPhone.storageTiers[0];
  const activeColor = selectedPhone.colors.includes(selectedColor) ? selectedColor : selectedPhone.colors[0];
  const orderTotal = computePhoneTotal(selectedPhone, activeTier.gb, phoneQuantity, warranty);
  const latestOrder = phoneOrders[0];
  const searchedPhones = SAMPLE_PHONES.filter((p) => matchesSiteSearch(p.name, p.brand, ...p.specs));

  const pickPhone = (phone: PhoneProduct) => {
    setSelectedPhoneId(phone.id);
    setSelectedStorageGb(phone.storageTiers[0].gb);
    setSelectedColor(phone.colors[0]);
    setPhoneQuantity(1);
    setActiveTab('order');
    cosmicAudio.playPing();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {renderSiteTopBar(<Smartphone className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {phoneTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-PHONE-09'])}

      {phoneTab === 'phones' && searchedPhones.length === 0 && renderNoSearchResults('أي هاتف')}

      {phoneTab === 'phones' && searchedPhones.length > 0 && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
          {searchedPhones.map((phone) => (
            // Product-poster card: the photo bleeds into a tinted panel and the copy sits on the
            // same tint underneath — brand kicker, model, a highlighted claim, then the specs.
            <article
              key={phone.id}
              className={`group rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b ${phone.imageBg} hover:border-white/25 transition-all`}
            >
              <div className="relative h-40 sm:h-44 overflow-hidden">
                <img
                  src={phone.image}
                  alt={phone.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Fades the photo into the tint so the panel reads as one surface, not a banner. */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                {/* Badge and mark share one justified row rather than opposite corners, so they
                    can't collide whichever way the surrounding direction resolves. */}
                <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2">
                  {phone.badge ? (
                    <span className={`px-2.5 py-1 rounded-full ${themeStyle.badgeBg} ${themeStyle.primaryText} text-[10px] font-bold backdrop-blur-md`}>
                      {phone.badge}
                    </span>
                  ) : <span />}
                  {/* dir=ltr so the neutral punctuation isn't re-ordered by the RTL context. */}
                  <span dir="ltr" className="font-mono text-[11px] tracking-[0.35em] text-white/70" aria-hidden="true">+◆–</span>
                </div>
              </div>

              <div className="p-4 space-y-2.5">
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/45">{phone.brand}</p>
                <h4 className="text-base sm:text-lg font-black text-white leading-tight">{phone.name}</h4>
                <p className="inline-block px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-white font-bold">
                  {phone.tagline}
                </p>
                <p className="text-slate-400 leading-relaxed">{phone.specs.join(' · ')}</p>
                <p className="text-slate-500 text-[10px]">
                  الذاكرة: {phone.storageTiers.map(t => storageLabel(t.gb)).join(' · ')}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                  <span className="leading-tight">
                    <span className="block text-[10px] text-slate-500">يبدأ من</span>
                    <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(phone.storageTiers[0].priceIQD)}</span>
                  </span>
                  <button
                    onClick={() => pickPhone(phone)}
                    className={`px-3.5 py-2 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer shrink-0`}
                  >
                    اشترِ الآن
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {phoneTab === 'order' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center gap-3">
            <img
              src={selectedPhone.image}
              alt={selectedPhone.name}
              className={`w-14 h-14 rounded-xl object-cover border border-white/10 bg-gradient-to-b ${selectedPhone.imageBg}`}
            />
            <div>
              <h4 className="text-sm font-bold text-white">طلب: {selectedPhone.name}</h4>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/45">{selectedPhone.brand}</p>
            </div>
          </div>

          {/* Choices on one side, what they cost on the other — the pickers are narrow, and
              left alone in a full-width card they stranded half the row empty on desktop. */}
          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-x-6 gap-y-4 items-start`}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">سعة الذاكرة:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedPhone.storageTiers.map((tier) => (
                    <button
                      key={tier.gb}
                      onClick={() => { setSelectedStorageGb(tier.gb); cosmicAudio.playTick(); }}
                      className={`px-3 py-2 rounded-lg border font-bold cursor-pointer transition-all ${
                        tier.gb === activeTier.gb
                          ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-transparent`
                          : 'bg-black/30 backdrop-blur-sm border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {storageLabel(tier.gb)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">اللون:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedPhone.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => { setSelectedColor(color); cosmicAudio.playTick(); }}
                      className={`px-3 py-2 rounded-lg border font-bold cursor-pointer transition-all ${
                        color === activeColor
                          ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-transparent`
                          : 'bg-black/30 backdrop-blur-sm border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">الكمية:</label>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-2 w-fit">
                  <button onClick={() => setPhoneQuantity(q => Math.max(1, q - 1))} className="text-white cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="font-mono font-bold text-white w-6 text-center">{phoneQuantity}</span>
                  <button onClick={() => setPhoneQuantity(q => Math.min(5, q + 1))} className="text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => { setWarranty(w => !w); cosmicAudio.playTick(); }}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all text-start ${
                  warranty ? `${themeStyle.badgeBg} border-white/25` : 'bg-black/30 backdrop-blur-sm border-white/10 hover:border-white/25'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${warranty ? themeStyle.primaryText : 'text-slate-500'}`} />
                  <span className="text-white font-bold">كفالة سنة إضافية</span>
                </span>
                <span className={`font-mono ${warranty ? themeStyle.primaryText : 'text-slate-400'}`}>+ {price(PHONE_WARRANTY_IQD)}</span>
              </button>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{selectedPhone.name} — {storageLabel(activeTier.gb)} × {phoneQuantity}</span>
                  <span className="font-mono text-white">{price(activeTier.priceIQD * phoneQuantity)}</span>
                </div>
                {warranty && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">كفالة سنة إضافية × {phoneQuantity}</span>
                    <span className="font-mono text-white">{price(PHONE_WARRANTY_IQD * phoneQuantity)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-bold text-white">الإجمالي:</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(orderTotal)}</span>
                </div>
                <p className="text-slate-500 text-[10px]">أو بالتقسيط: {price(Math.round(orderTotal / 6))} شهرياً لمدة 6 أشهر</p>
              </div>

              <button
                onClick={() => confirmPhoneOrder(selectedPhone)}
                className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الطلب</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {phoneTab === 'confirmation' && (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-3 animate-fade-in text-xs">
          {latestOrder ? (
            <>
              <div className={`w-14 h-14 rounded-full ${themeStyle.badgeBg} flex items-center justify-center mx-auto`}>
                <CheckCircle2 className={`w-6 h-6 ${themeStyle.primaryText}`} />
              </div>
              <h4 className="text-sm font-bold text-white">تم تأكيد طلبك بنجاح</h4>
              <p className="text-slate-400 font-mono">رقم المرجع: {latestOrder.id}</p>
              <div className="max-w-xs mx-auto p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-start space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">الجهاز:</span><span className="text-white font-bold">{latestOrder.phoneName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الذاكرة:</span><span className="text-white font-mono">{storageLabel(latestOrder.storageGb)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">اللون:</span><span className="text-white">{latestOrder.color}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الكمية:</span><span className="text-white font-mono">{latestOrder.quantity}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الكفالة:</span><span className="text-white">{latestOrder.warranty ? 'سنتان (وكيل + سنة إضافية)' : 'سنة واحدة (وكيل)'}</span></div>
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
