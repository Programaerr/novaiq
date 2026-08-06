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
            <div key={phone.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
              <div className={`h-24 bg-gradient-to-br ${phone.imageBg} flex items-center justify-center relative`}>
                <Smartphone className="w-7 h-7 text-white/70" />
                {phone.badge && (
                  <span className={`absolute top-2 end-2 px-2 py-0.5 rounded-full ${themeStyle.badgeBg} ${themeStyle.primaryText} text-[10px] font-bold`}>
                    {phone.badge}
                  </span>
                )}
              </div>
              <div className="p-3.5 space-y-2">
                <div>
                  <h4 className="text-sm font-bold text-white">{phone.name}</h4>
                  <p className="text-slate-500 text-[10px] font-mono">{phone.brand}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {phone.specs.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-slate-400 text-[10px]">{s}</span>
                  ))}
                </div>
                <p className="text-slate-400">
                  الذاكرة: {phone.storageTiers.map(t => storageLabel(t.gb)).join(' · ')}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className={`font-mono font-bold ${themeStyle.primaryText}`}>يبدأ من {price(phone.storageTiers[0].priceIQD)}</span>
                  <button
                    onClick={() => pickPhone(phone)}
                    className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
                  >
                    اشترِ الآن
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {phoneTab === 'order' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Smartphone className={`w-4 h-4 ${themeStyle.primaryText}`} />
            <span>طلب: {selectedPhone.name}</span>
          </h4>

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
