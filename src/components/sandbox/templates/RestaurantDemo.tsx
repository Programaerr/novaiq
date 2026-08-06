import React from 'react';
import {
  CheckCircle2,
  Plus,
  Minus,
  Calendar,
  ChefHat,
} from 'lucide-react';
import { SAMPLE_MENU_ITEMS, COMPANY_PROFILES } from '../../../data/sandboxDemoData';
import type { MenuItem, FoodOrderItem } from '../../../data/sandboxDemoData';
import type { SandboxCtx } from '../context';

// The restaurant demo: menu, order basket and table reservations.
// Rendered by TemplateInteractiveSandbox. Everything shared with the other demos arrives via
// `ctx`; this demo's own state stays owned by the shell, which needs to read it for the
// account page and for the "what did the customer configure" contract summary.
interface RestaurantDemoProps {
  ctx: SandboxCtx;
  addFoodItem: (menuItem: MenuItem) => void;
  confirmTableReservation: () => void;
  foodOrder: FoodOrderItem[];
  foodOrderTotalIQD: number;
  menuCategoryFilter: 'all' | 'appetizers' | 'mains' | 'desserts' | 'drinks';
  reservationDate: string;
  reservationGuests: number;
  reservationTime: string;
  setMenuCategoryFilter: React.Dispatch<React.SetStateAction<'all' | 'appetizers' | 'mains' | 'desserts' | 'drinks'>>;
  setReservationDate: React.Dispatch<React.SetStateAction<string>>;
  setReservationGuests: React.Dispatch<React.SetStateAction<number>>;
  setReservationTime: React.Dispatch<React.SetStateAction<string>>;
  tableReservations: Array<{ id: string; guests: number; date: string; time: string }>;
  updateFoodItemQuantity: (index: number, delta: number) => void;
}

export function RestaurantDemo({ ctx, addFoodItem, confirmTableReservation, foodOrder, foodOrderTotalIQD, menuCategoryFilter, reservationDate, reservationGuests, reservationTime, setMenuCategoryFilter, setReservationDate, setReservationGuests, setReservationTime, tableReservations, updateFoodItemQuantity }: RestaurantDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, matchesSiteSearch, price, renderCompanyHome, renderNoSearchResults, renderSiteTopBar, themeStyle } = ctx;

  const foodTab = ['home', 'menu', 'order', 'reservation'].includes(activeTab) ? activeTab : 'home';
  const filteredMenu = (menuCategoryFilter === 'all' ? SAMPLE_MENU_ITEMS : SAMPLE_MENU_ITEMS.filter(m => m.category === menuCategoryFilter))
    .filter(m => matchesSiteSearch(m.name, m.description));

  return (
    <div className="space-y-6 text-slate-100">
      {renderSiteTopBar(<ChefHat className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {foodTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-FOOD-07'])}

      {foodTab === 'menu' && (
        <div className="space-y-4 animate-fade-in text-xs">
          <div className="flex flex-wrap gap-2">
            {(['all', 'appetizers', 'mains', 'desserts', 'drinks'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setMenuCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  menuCategoryFilter === cat ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'all' && 'الكل'}
                {cat === 'appetizers' && 'مقبلات'}
                {cat === 'mains' && 'أطباق رئيسية'}
                {cat === 'desserts' && 'حلويات'}
                {cat === 'drinks' && 'مشروبات'}
              </button>
            ))}
          </div>

          {filteredMenu.length === 0 && renderNoSearchResults('أي طبق')}

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-4`}>
            {filteredMenu.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
                <div className={`h-24 bg-gradient-to-br ${item.imageBg} flex items-center justify-center`}>
                  <ChefHat className="w-7 h-7 text-white/70" />
                </div>
                <div className="p-3.5 space-y-2">
                  <h4 className="text-sm font-bold text-white">{item.name}</h4>
                  <p className="text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(item.priceIQD)}</span>
                    <button
                      onClick={() => addFoodItem(item)}
                      className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center gap-1`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>أضف للطلب</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {foodTab === 'order' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3 animate-fade-in text-xs">
          {foodOrder.length === 0 ? (
            <p className="text-slate-500 text-center py-6">سلة الطلب فارغة، تصفح القائمة وأضف أصنافك المفضلة.</p>
          ) : (
            <>
              {foodOrder.map((o, idx) => (
                <div key={o.item.id} className="p-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-white font-bold block truncate">{o.item.name}</span>
                    <span className="text-slate-500 font-mono">{price(o.item.priceIQD)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateFoodItemQuantity(idx, -1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-white w-5 text-center">{o.quantity}</span>
                    <button onClick={() => updateFoodItemQuantity(idx, 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="font-bold text-white">الإجمالي:</span>
                <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(foodOrderTotalIQD)}</span>
              </div>
              <button
                onClick={() => alert('تم تأكيد طلبك التجريبي بنجاح! سيتم تحضيره فور تفعيل موقعك الفعلي.')}
                className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
              >
                تأكيد الطلب
              </button>
            </>
          )}
        </div>
      )}

      {foodTab === 'reservation' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
            <span>حجز طاولة جديدة</span>
          </h4>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">عدد الضيوف:</label>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-2">
                <button onClick={() => setReservationGuests(g => Math.max(1, g - 1))} className="text-white cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                <span className="font-mono font-bold text-white flex-1 text-center">{reservationGuests}</span>
                <button onClick={() => setReservationGuests(g => Math.min(20, g + 1))} className="text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">التاريخ:</label>
              <input type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-slate-400 font-bold">الوقت:</label>
              <input type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
            </div>
          </div>

          <button
            onClick={confirmTableReservation}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد الحجز</span>
          </button>

          {tableReservations.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="font-bold text-white block">حجوزاتك:</span>
              {tableReservations.map((r) => (
                <div key={r.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-white font-bold">{r.guests} أشخاص</span>
                  <span className="font-mono text-slate-300">{r.date} - {r.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
