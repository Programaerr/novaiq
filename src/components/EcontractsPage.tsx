import React from 'react';
import { FileSignature, FileText, Scale, Clock } from 'lucide-react';
import { Language } from '../lib/i18n';
import { contractTerms } from '../data/contractTerms';

interface EcontractsPageProps {
  language: Language;
}

// The palette this page draws from: PERIWINKLE (#8295CF) is the primary — the accent every
// feature on the dark site uses — and SAND (#D5BDAC) is the secondary. Text is white on the
// dark ground. Keeping the accent values here (rather than raw hex scattered across the cards)
// mirrors homePalette's reason for existing: one place to retune the brand.
const ACCENT = '#8295CF';
const ACCENT_SOFT = 'rgba(130, 149, 207, 0.14)';
const SECONDARY = '#D5BDAC';
const SECONDARY_SOFT = 'rgba(213, 189, 172, 0.12)';

// Shown in clause 3 (milestone delivery). This page presents the standard NOVAIQ agreement, and
// the timeline is the one clause that varies per contract — 8 weeks is the custom-project default
// (see ContractBuilder) used here so the page reads fully; a specific contract states its own.
const REPRESENTATIVE_TIMELINE_WEEKS = 8;

export const EcontractsPage: React.FC<EcontractsPageProps> = ({ language }) => {
  const isAr = language === 'ar';
  const terms = contractTerms(language, REPRESENTATIVE_TIMELINE_WEEKS);

  return (
    <section className="py-4 sm:py-6 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl border flex items-center justify-center text-white shadow-xl"
            style={{ background: ACCENT_SOFT, borderColor: 'rgba(255,255,255,0.14)' }}
          >
            <FileSignature className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {isAr ? 'العقود الإلكترونية' : 'E-contracts'}
          </h2>
          <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
            {isAr
              ? 'نص العقد الموحّد لخدمات NOVAIQ — البنود الكاملة التي تُوقَّع إلكترونياً عند إنشاء أي عقد، كما تظهر في وثيقة العقد نفسها.'
              : "NOVAIQ's standard agreement — the full clauses signed electronically on every contract, exactly as they appear in the contract document itself."}
          </p>
        </div>

        <div className="space-y-4">
          {terms.map((clause, idx) => {
            const [title, ...rest] = clause.split(':');
            const body = rest.join(':').trim();
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-start gap-4 shadow-xl"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0"
                  style={{ background: ACCENT_SOFT, borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  {idx === 0 ? <FileText className="w-5 h-5" style={{ color: ACCENT }} /> : <Scale className="w-5 h-5" style={{ color: ACCENT }} />}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span className="font-mono text-xs shrink-0" style={{ color: SECONDARY }}>
                      {isAr ? `بند ${idx + 1}` : `Clause ${idx + 1}`}
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-white/90">
                    <strong className="text-white">{title}:</strong> {body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-8 p-5 rounded-3xl bg-zinc-900 border flex items-start gap-4"
          style={{ borderColor: 'rgba(213, 189, 172, 0.25)', background: SECONDARY_SOFT }}
        >
          <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: SECONDARY }} />
          <p className="text-xs sm:text-sm leading-relaxed text-white/90">
            {isAr
              ? `ملاحظة: مدة التسليم في البند 3 أعلاه معروضة بالقيمة الافتراضية (${REPRESENTATIVE_TIMELINE_WEEKS} أسابيع) لتوضيح النص. تُحدَّد المدة الفعلية لكل عقد على حدة عند إنشائه، وتُكتب بوضوح في وثيقة العقد قبل توقيعه.`
              : `Note: the delivery timeline in clause 3 above is shown at its default (${REPRESENTATIVE_TIMELINE_WEEKS} weeks) to illustrate the text. The actual timeline is set per contract when it is created and is clearly stated in the contract document before signing.`}
          </p>
        </div>
      </div>
    </section>
  );
};