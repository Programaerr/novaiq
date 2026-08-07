import React from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Car,
  Cog,
  Fuel,
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
        // pt-20 reserves the strip the car photo hangs up into; without it the first row's
        // bonnet is clipped by the section above.
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-x-5 gap-y-8 pt-20 animate-fade-in text-xs`}>
          {searchedCars.map((car) => (
            // The manufacturer-style card: the car sits on white *above* the sheet, then the
            // model name, the pill row, three headline figures each over its own label, the
            // grey consumption fine print, an underlined spec link and one black action.
            <article key={car.id} className="relative flex flex-col rounded-[26px] bg-white px-6 pb-6 pt-24 shadow-2xl shadow-black/40">
              {/* The photo overhangs the card's top edge, which is what makes it read as a
                  product shot rather than a banner. object-contain on white, never cover: these
                  are side profiles and cover would crop them into an unrecognisable slab. The
                  white plate behind it is deliberate — the source photos are location shots,
                  not cut-outs, so the plate is what keeps the row visually consistent. */}
              <div className="absolute -top-16 inset-x-4 h-36 rounded-2xl bg-white overflow-hidden">
                <img
                  src={car.image}
                  alt={car.name}
                  loading="lazy"
                  className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
                />
              </div>

              {car.badge && (
                <span className="absolute top-6 end-6 px-2.5 py-1 rounded-full bg-zinc-900 text-white text-[10px] font-bold">
                  {car.badge}
                </span>
              )}

              {/* font-normal, not bold: the reference sets the model name large and light, and
                  the weight is what separates it from the figures below it. */}
              <h4 className="text-2xl sm:text-3xl font-normal text-zinc-900 leading-tight">{car.name}</h4>
              <p className="mt-1 font-mono text-sm font-bold text-zinc-900">{price(car.priceIQD)}</p>

              {/* Year first and filled black, the rest hollow grey — the reference uses that one
                  dark pill to anchor the row, and it is the model year that dates a car. */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-zinc-900 text-white text-[11px] font-semibold">{car.year}</span>
                {[car.fuelType, car.drivetrain, car.transmission].map((chip) => (
                  <span key={chip} className="px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-semibold">
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-5 space-y-4">
                {[
                  { value: car.acceleration, label: 'التسارع من 0 إلى 100 كم/س' },
                  { value: car.power, label: 'القدرة (كيلوواط) / القدرة (حصان)' },
                  { value: car.topSpeed, label: 'السرعة القصوى' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-xl sm:text-2xl font-normal text-zinc-900 leading-tight">{stat.value}</div>
                    <div className="text-zinc-400 text-[11px]">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* mt-auto here rather than on the button: the blurb-free layout still varies in
                  height because the pill row wraps to two lines on some cars, and this is what
                  keeps the black action on one line across a row. */}
              <div className="mt-auto pt-6">
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  استهلاك الوقود المدمج: {car.fuel}، انبعاثات CO2 المدمجة: {car.co2}
                </p>

                <button
                  onClick={() => pickCar(car, 'testdrive')}
                  className="mt-4 text-zinc-900 underline underline-offset-4 font-semibold cursor-pointer hover:text-zinc-600 transition-colors"
                >
                  المواصفات الفنية وحجز تجربة قيادة
                </button>

                <button
                  onClick={() => pickCar(car, 'finance')}
                  className="mt-4 w-full py-4 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm cursor-pointer transition-colors"
                >
                  استعرض بالتفصيل
                </button>
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
