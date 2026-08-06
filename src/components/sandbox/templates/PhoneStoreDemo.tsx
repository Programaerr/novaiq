import React, { useState } from 'react';
import {
  BatteryFull,
  Camera,
  CheckCircle2,
  Cpu,
  Heart,
  Plus,
  Minus,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
} from 'lucide-react';
import { SAMPLE_PHONES, PHONE_WARRANTY_IQD, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { PhoneProduct, PhoneOrder } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

/** 1024 GB is sold as "1 تيرا", not "1024 غيغا" — the catalogue and the order summary both
 *  quote capacity, so the wording lives in one place. */
export const storageLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024} تيرا` : `${gb} غيغا`);

/** Icon per spec *position* — every phone lists screen, then chip, then camera, so the chips
 *  pick up the right glyph without each entry having to name one. */
const SPEC_ICONS = [Smartphone, Cpu, Camera, BatteryFull];

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

  // Wishlist hearts: purely a catalogue affordance, so unlike the order state the shell never
  // reads it and it stays local to this demo.
  const [favorites, setFavorites] = useState<string[]>([]);
  const toggleFavorite = (id: string) => {
    setFavorites(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]));
    cosmicAudio.playTick();
  };

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
        // pt-16 on the grid and mt-14 on each card reserve the space the photo pokes up into;
        // without it the first row's product would be cut off by the section above.
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-x-4 gap-y-16 pt-16 animate-fade-in text-xs`}>
          {searchedPhones.map((phone) => (
            // Light product card: the photo floats clear of the card's top edge, the stock line
            // runs vertically up the side, and the buy row anchors the bottom.
            <article
              key={phone.id}
              className="group relative rounded-[28px] bg-zinc-100 px-5 pb-5 pt-24 shadow-2xl shadow-black/40"
            >
              <img
                src={phone.image}
                alt={phone.name}
                loading="lazy"
                // Physical left-1/2 on purpose: centring is symmetric, so a logical `start-`
                // would only add an RTL flip that has to be undone again.
                className="absolute -top-14 left-1/2 -translate-x-1/2 w-[60%] h-36 sm:h-40 object-cover rounded-2xl shadow-xl shadow-black/40 transition-transform duration-500 group-hover:-translate-y-1"
              />

              {/* Vertical stock rail, mirroring the reference's LIMITED STOCK edge label. */}
              <span
                style={{ writingMode: 'vertical-rl' }}
                className="absolute top-6 start-4 rotate-180 text-[10px] tracking-[0.35em] text-zinc-400 font-bold"
              >
                {phone.badge || 'متوفر الآن'}
              </span>

              <button
                onClick={() => toggleFavorite(phone.id)}
                aria-label={favorites.includes(phone.id) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                aria-pressed={favorites.includes(phone.id)}
                className="absolute top-5 end-5 p-1.5 rounded-full hover:bg-zinc-200 cursor-pointer transition-colors"
              >
                <Heart className={`w-4 h-4 ${favorites.includes(phone.id) ? 'fill-rose-500 text-rose-500' : 'text-zinc-800'}`} />
              </button>

              <div className="space-y-3">
                <h4 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">{phone.name}</h4>

                <div className="flex flex-wrap gap-1.5">
                  {phone.specs.slice(0, 3).map((spec, idx) => {
                    const SpecIcon = SPEC_ICONS[idx];
                    return (
                      <span key={spec} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-700 text-zinc-100 text-[10px]">
                        <SpecIcon className={`w-3 h-3 ${themeStyle.primaryText}`} />
                        {spec}
                      </span>
                    );
                  })}
                </div>

                <p className="text-zinc-500 leading-relaxed">{phone.description}</p>

                <p className="text-zinc-400 text-[10px]">
                  الذاكرة: {phone.storageTiers.map(t => storageLabel(t.gb)).join(' · ')}
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="leading-tight">
                    <span className="block text-[10px] text-zinc-400">يبدأ من</span>
                    <span className="font-mono text-lg font-black text-zinc-900">{price(phone.storageTiers[0].priceIQD)}</span>
                  </span>
                  <button
                    onClick={() => pickPhone(phone)}
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
              <p className="text-slate-400">{selectedPhone.tagline}</p>
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
