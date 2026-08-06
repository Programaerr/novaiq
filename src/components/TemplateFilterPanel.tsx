import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, ArrowUpDown } from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language } from '../lib/i18n';
import { formatPrice, IQD_PER_USD, Currency } from '../lib/currency';

// The filter dropdown that floats over the template grid. Split out of TemplateGrid.tsx —
// it is a self-contained panel of controls, and inlining its ~120 lines of markup made the
// grid's own carousel logic hard to find. Fully controlled: every value and setter is owned
// by TemplateGrid, so opening this file never requires reasoning about the grid's state.
interface TemplateFilterPanelProps {
  open: boolean;
  currentLang: Language;
  currency: Currency;
  categories: { id: string; label: string }[];
  sortOptions: { id: string; label: string }[];
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  maxPriceUSD: number;
  setMaxPriceUSD: (v: number) => void;
  sortBy: string;
  setSortBy: (id: string) => void;
  activeFiltersCount: number;
  resetAllFilters: () => void;
}

export const TemplateFilterPanel: React.FC<TemplateFilterPanelProps> = ({
  open,
  currentLang,
  currency,
  categories,
  sortOptions,
  selectedCategory,
  setSelectedCategory,
  maxPriceUSD,
  setMaxPriceUSD,
  sortBy,
  setSortBy,
  activeFiltersCount,
  resetAllFilters,
}) => (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            // A menu in its own right rather than a full-width sheet welded to the toolbar:
            // anchored to the Filter button at the bar's start edge (`start-0` follows dir,
            // so it stays under the button in both Arabic and English) and only as wide as
            // its own contents need. The extra gap, the denser body and the ring instead of
            // a hairline border are what let it read as floating *above* the page rather
            // than as a second row of the bar.
            className="absolute top-full start-0 mt-3 z-50 w-full sm:w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-black/85 backdrop-blur-xl border border-white/20 ring-1 ring-black/60 shadow-2xl shadow-black/70 overflow-hidden"
          >
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5 space-y-5">

              {activeFiltersCount > 0 && (
                <div className="flex justify-end -mb-1">
                  <button
                    onClick={resetAllFilters}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{currentLang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
                  </button>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2.5">
                  {currentLang === 'ar' ? 'الأقسام والتصنيفات' : 'Category'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        cosmicAudio.playPing();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-white/15 text-white border border-white/40 glow-white font-bold'
                          : 'bg-white/5 text-zinc-400 border border-white/10 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-300">
                    {currentLang === 'ar' ? 'الميزانية القصوى' : 'Maximum Budget'}
                  </label>
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-mono text-xs font-bold border border-white/20 glow-white">
                    {maxPriceUSD >= 10000
                      ? (currentLang === 'ar' ? 'الكل (حتى $10,000+)' : 'All (Up to $10k+)')
                      : `$${maxPriceUSD.toLocaleString()}`}
                  </span>
                </div>

                <div className="space-y-3">
                  <input
                    type="range"
                    min={300}
                    max={10000}
                    step={100}
                    value={maxPriceUSD}
                    onChange={(e) => {
                      setMaxPriceUSD(Number(e.target.value));
                    }}
                    className="w-full accent-white cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>$300</span>
                    <span>$5,000</span>
                    <span>$10,000</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 text-center font-sans">
                    {currentLang === 'ar'
                      ? `تصفية القوالب بميزانية حتى: ${formatPrice(maxPriceUSD * IQD_PER_USD, currentLang, currency)}`
                      : `Filter up to: ${formatPrice(maxPriceUSD * IQD_PER_USD, currentLang, currency)}`}
                  </div>
                </div>
              </div>

              {/* Sort — same chip language as Category, not a separate stacked-button
                  list, so the two read as one consistent choice pattern. */}
              <div className="pt-4 border-t border-white/10">
                <label className="block text-xs font-bold text-zinc-300 mb-2.5">
                  {currentLang === 'ar' ? 'ترتيب النتائج حسب' : 'Sort By'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {sortOptions.map((so) => (
                    <button
                      key={so.id}
                      onClick={() => {
                        setSortBy(so.id);
                        cosmicAudio.playPing();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        sortBy === so.id
                          ? 'bg-white/15 text-white border border-white/40 glow-white font-bold'
                          : 'bg-white/5 text-zinc-400 border border-white/10 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <ArrowUpDown className="w-3 h-3 shrink-0" />
                      <span>{so.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
);
