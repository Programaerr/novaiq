import React from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Car,
  Cog,
  Fuel,
  Gauge,
  Users,
} from 'lucide-react';
import {
  CAR_ANNUAL_RATE,
  CAR_FINANCE_TERMS,
  COMPANY_PROFILES,
  SAMPLE_CARS,
} from '../../../data/sandboxDemoData';
import type { CarModel, TestDriveBooking } from '../../../data/sandboxDemoData';
import { cosmicAudio } from '../../../lib/audio';
import type { SandboxCtx } from '../context';

/** Down-payment steps the calculator offers, as a percentage of the car's price. Percentages
 *  rather than amounts because the lineup spans 47m to 178m IQD and a fixed set of amounts
 *  would be meaningless at one end of that. */
export const CAR_DOWN_PAYMENT_STEPS = [20, 30, 40, 50];

/** Flat-rate instalment, the way an Iraqi showroom actually quotes one: the whole financed
 *  amount carries the annual rate for the full term, then the total is split evenly. Declining
 *  balance would quote a lower number than the customer is asked to sign for. */
export const monthlyInstalment = (priceIQD: number, downPct: number, months: number) => {
  const financed = priceIQD * (1 - downPct / 100);
  const total = financed * (1 + CAR_ANNUAL_RATE * (months / 12));
  return Math.round(total / months);
};

// AutoStellar — the car dealership demo: a showroom, a catalogue, an instalment calculator and
// a test-drive booking. Rendered by TemplateInteractiveSandbox. Everything shared with the other
// demos arrives via `ctx`; this demo's own state stays owned by the shell, which needs to read
// it for the account page and for the "what did the customer configure" contract summary.
interface CarDealerDemoProps {
  ctx: SandboxCtx;
  bookTestDrive: (car: CarModel) => void;
  downPaymentPct: number;
  financeMonths: number;
  selectedCarId: string;
  setDownPaymentPct: React.Dispatch<React.SetStateAction<number>>;
  setFinanceMonths: React.Dispatch<React.SetStateAction<number>>;
  setSelectedCarId: React.Dispatch<React.SetStateAction<string>>;
  setTestDriveDate: React.Dispatch<React.SetStateAction<string>>;
  testDriveBookings: TestDriveBooking[];
  testDriveDate: string;
}

export function CarDealerDemo({ ctx, bookTestDrive, downPaymentPct, financeMonths, selectedCarId, setDownPaymentPct, setFinanceMonths, setSelectedCarId, setTestDriveDate, testDriveBookings, testDriveDate }: CarDealerDemoProps) {
  const { activeTab, gridCols, isNarrowViewport, matchesSiteSearch, price, renderCompanyHome, renderNoSearchResults, renderSiteTopBar, setActiveTab, themeStyle } = ctx;

  const carTab = ['home', 'cars', 'finance', 'testdrive'].includes(activeTab) ? activeTab : 'home';
  const selectedCar = SAMPLE_CARS.find(c => c.id === selectedCarId) || SAMPLE_CARS[0];
  const searchedCars = SAMPLE_CARS.filter((c) =>
    matchesSiteSearch(c.name, c.brand, c.trim, c.engine, c.color, String(c.year)));
  const latestBooking = testDriveBookings[0];

  const downPayment = Math.round(selectedCar.priceIQD * (downPaymentPct / 100));
  const monthly = monthlyInstalment(selectedCar.priceIQD, downPaymentPct, financeMonths);

  const pickCar = (car: CarModel, tab: 'finance' | 'testdrive') => {
    setSelectedCarId(car.id);
    setActiveTab(tab);
    cosmicAudio.playPing();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {renderSiteTopBar(<Car className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

      {carTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-CARS-03'])}

      {carTab === 'cars' && searchedCars.length === 0 && renderNoSearchResults('أي سيارة')}

      {carTab === 'cars' && searchedCars.length > 0 && (
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-5 animate-fade-in text-xs`}>
          {searchedCars.map((car) => (
            // The reference card: a pale sheet, the car floating in a soft radial well at the
            // top, then the spec chips, the big model name, the grey trim line and the blurb.
            <article
              key={car.id}
              className="group relative flex flex-col rounded-[26px] bg-white p-4 shadow-2xl shadow-black/40"
            >
              {/* Radial well rather than a flat panel: the reference lights the car from behind,
                  which is what separates the body from the card without drawing a border. */}
              <div
                className="rounded-[18px] p-3 overflow-hidden"
                style={{ background: 'radial-gradient(circle at 50% 38%, #ffffff 0%, #e7eaee 72%)' }}
              >
                <img
                  src={car.image}
                  alt={car.name}
                  loading="lazy"
                  className="w-full h-36 sm:h-40 object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>

              {car.badge && (
                <span className="absolute top-7 end-7 px-2.5 py-1 rounded-full bg-zinc-900/85 backdrop-blur-sm text-white text-[10px] font-bold">
                  {car.badge}
                </span>
              )}

              {/* flex-1 + mt-auto on the action row: the blurbs differ in length, and without it
                  the price line sat at a different height on each card in a row. */}
              <div className="flex-1 flex flex-col pt-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-semibold">
                    {/* The swatch is the colour itself, so it needs a hairline ring or a white
                        car disappears into the chip. */}
                    <span className="w-2.5 h-2.5 rounded-full ring-1 ring-zinc-300 shrink-0" style={{ background: car.colorHex }} />
                    {car.color}
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-semibold">
                    <Gauge className="w-3 h-3" />
                    {car.acceleration}
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-semibold">
                    <Cog className="w-3 h-3" />
                    {car.transmission}
                  </span>
                </div>

                <h4 className="mt-3 text-lg sm:text-xl font-extrabold text-zinc-900 leading-tight">{car.name}</h4>
                <p className="text-base font-bold text-zinc-400 leading-tight">{car.trim}</p>
                <p className="mt-2 text-zinc-500 leading-relaxed">{car.description}</p>

                <div className="mt-auto pt-4 flex items-end justify-between gap-2">
                  <span className="leading-tight">
                    <span className="block text-[10px] text-zinc-400">موديل {car.year} · السعر</span>
                    <span className="font-mono text-base font-black text-zinc-900">{price(car.priceIQD)}</span>
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => pickCar(car, 'testdrive')}
                      className="px-3 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold cursor-pointer transition-colors"
                    >
                      تجربة قيادة
                    </button>
                    <button
                      onClick={() => pickCar(car, 'finance')}
                      className={`px-3.5 py-2 rounded-full ${themeStyle.solidOnLight} ${themeStyle.solidOnLightText} font-bold cursor-pointer transition-colors`}
                    >
                      قسّطها
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {carTab === 'finance' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center gap-3">
            <img src={selectedCar.image} alt={selectedCar.name} className="w-16 h-14 rounded-xl object-cover border border-white/10" />
            <div>
              <h4 className="text-sm font-bold text-white">{selectedCar.name}</h4>
              <p className="text-slate-400">{selectedCar.trim} · موديل {selectedCar.year}</p>
            </div>
          </div>

          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-x-6 gap-y-4 items-start`}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">السيارة:</label>
                <select
                  value={selectedCarId}
                  onChange={(e) => { setSelectedCarId(e.target.value); cosmicAudio.playTick(); }}
                  className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white cursor-pointer"
                >
                  {SAMPLE_CARS.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name} — {price(c.priceIQD)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">الدفعة الأولى:</label>
                <div className="flex flex-wrap gap-2">
                  {CAR_DOWN_PAYMENT_STEPS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => { setDownPaymentPct(pct); cosmicAudio.playTick(); }}
                      className={`px-3 py-2 rounded-lg border font-bold cursor-pointer transition-all ${
                        pct === downPaymentPct
                          ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-transparent`
                          : 'bg-black/30 backdrop-blur-sm border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold">مدة التقسيط:</label>
                <div className="flex flex-wrap gap-2">
                  {CAR_FINANCE_TERMS.map((months) => (
                    <button
                      key={months}
                      onClick={() => { setFinanceMonths(months); cosmicAudio.playTick(); }}
                      className={`px-3 py-2 rounded-lg border font-bold cursor-pointer transition-all ${
                        months === financeMonths
                          ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-transparent`
                          : 'bg-black/30 backdrop-blur-sm border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {months} شهر
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { Icon: Cog, label: 'المحرك', value: selectedCar.engine },
                  { Icon: Car, label: 'الدفع', value: selectedCar.drivetrain },
                  { Icon: Fuel, label: 'الاستهلاك', value: selectedCar.fuel },
                  { Icon: Users, label: 'المقاعد', value: `${selectedCar.seats} مقاعد` },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="p-2.5 rounded-xl bg-black/25 border border-white/5">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                      <Icon className="w-3 h-3 shrink-0" />
                      {label}
                    </div>
                    <div className="text-white font-bold mt-0.5 leading-snug">{value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">سعر السيارة</span>
                  <span className="font-mono text-white">{price(selectedCar.priceIQD)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">الدفعة الأولى ({downPaymentPct}%)</span>
                  <span className="font-mono text-white">{price(downPayment)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">المبلغ المموّل</span>
                  <span className="font-mono text-white">{price(selectedCar.priceIQD - downPayment)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-bold text-white">القسط الشهري:</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(monthly)}</span>
                </div>
                <p className="text-slate-500 text-[10px]">
                  على {financeMonths} شهراً بنسبة تمويل {Math.round(CAR_ANNUAL_RATE * 100)}% سنوياً — رقم تقديري للعرض.
                </p>
              </div>

              <button
                onClick={() => { setActiveTab('testdrive'); cosmicAudio.playPing(); }}
                className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>احجز تجربة قيادة لهذه السيارة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {carTab === 'testdrive' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center gap-3">
            <img src={selectedCar.image} alt={selectedCar.name} className="w-16 h-14 rounded-xl object-cover border border-white/10" />
            <div>
              <h4 className="text-sm font-bold text-white">تجربة قيادة: {selectedCar.name}</h4>
              <p className="text-slate-400">{selectedCar.trim}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="testdrive-date" className="block text-slate-400 font-bold">تاريخ التجربة:</label>
            <input
              id="testdrive-date"
              type="date"
              value={testDriveDate}
              onChange={(e) => setTestDriveDate(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white cursor-pointer"
            />
          </div>

          <button
            onClick={() => bookTestDrive(selectedCar)}
            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>تأكيد حجز التجربة</span>
          </button>

          {latestBooking && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${themeStyle.primaryText}`} />
                <span className="font-bold text-white">تم تثبيت الحجز</span>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">رقم الحجز:</span><span className="text-white font-mono">{latestBooking.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">السيارة:</span><span className="text-white font-bold">{latestBooking.carName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">التاريخ:</span><span className="text-white font-mono">{latestBooking.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">الفرع:</span><span className="text-white">{latestBooking.branch}</span></div>
              </div>
              <p className="text-slate-500 text-[10px]">سيتصل بك المعرض لتأكيد الموعد قبل يوم واحد.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
