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

  // Read once into a local: the card paints this colour twice — its own background and the end
  // stop of the gradient that dissolves the photo into it — and a seam appears the moment those
  // two stop being the same value. It comes from the theme rather than a constant here so the
  // cards re-tint with the customer's palette pick instead of staying green in every theme.
  const cardBg = themeStyle.cardSurface;

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
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-5 animate-fade-in text-xs`}>
          {searchedCars.map((car) => (
            // The reference card: one dark sheet with the photo filling its top and dissolving
            // into the body, then the name beside a price pill, the blurb, two fact pills and a
            // white action across the bottom.
            <article
              key={car.id}
              className="group relative flex flex-col rounded-[26px] overflow-hidden shadow-2xl shadow-black/50 aspect-square"
              style={{ background: cardBg }}
            >
              {/* The photo takes the height the text does not (flex-1 + min-h-0), which is what
                  keeps the card square while the blurbs run to different lengths: a longer
                  description eats into the photo rather than pushing the card past its ratio.
                  min-h-0 is required — a flex item will not shrink below its content without it
                  and the image would win.

                  overflow-hidden here, not only on the card: the hover zoom grows the image in
                  every direction, and the card's own clip is 8px lower than this box because the
                  body below is pulled up over it with -mt-8. Without a clip of its own the
                  enlarged photo slid down into that gap and showed through behind the title. */}
              <div className="relative flex-1 min-h-0 overflow-hidden">
                <img
                  src={car.image}
                  alt={car.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* The fade is what removes the seam between photo and card in the reference —
                    the photo does not stop, it dissolves. The gradient's end colour has to be
                    the card's exact background, which is why both read from one constant
                    instead of two hand-matched hex strings that drift apart on the next edit. */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom, transparent 45%, ${cardBg} 100%)` }}
                />
                {car.badge && (
                  <span className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm text-white text-[10px] font-bold">
                    {car.badge}
                  </span>
                )}
              </div>

              {/* -mt-8 pulls the text up into the faded tail of the photo, the way the reference
                  sets its title over the water rather than below it. shrink-0: the body keeps
                  its natural height and the photo above absorbs the difference, so the white
                  action lands at the same distance from the bottom on every card. */}
              <div className="relative -mt-8 flex shrink-0 flex-col px-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-lg font-bold text-white leading-tight">{car.name}</h4>
                  <span className="shrink-0 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-sm font-mono text-[11px] font-bold text-white">
                    {price(car.priceIQD)}
                  </span>
                </div>

                <p className="mt-3 text-zinc-400 leading-relaxed">{car.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[car.fuelType, car.transmission].map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-lg bg-white/10 text-zinc-200 text-[10px] font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* .neu-btn gives this the same press the watch store's cart button has — on
                    :active the outer shadows become inner ones and the button sinks rather than
                    just dimming. --on-dark drops the raised white shadow (it bloomed as haze on
                    this dark card) and, more importantly, releases the body colour so
                    primaryBg can supply it: the button re-tints with the customer's palette
                    instead of staying near-white in every theme. */}
                <div className="pt-6">
                  <button
                    onClick={() => pickCar(car, 'finance')}
                    className={`neu-btn neu-btn--on-dark w-full py-3.5 rounded-full ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold text-sm cursor-pointer`}
                  >
                    استعرض واحجز
                  </button>
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
