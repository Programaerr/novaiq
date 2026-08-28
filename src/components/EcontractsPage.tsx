import React from 'react';
import { FileSignature, FileText, Scale, Clock } from 'lucide-react';
import { Language } from '../lib/i18n';
import { contractTerms } from '../data/contractTerms';

interface EcontractsPageProps {
  language: Language;
}

// The palette this page draws from: COBALT (#2864FF) is the primary — the accent every feature
// on the dark site uses — and MUTED is the secondary, the token this identity already reserves
// for metadata-weight text on a dark ground (measured 6.34:1 on Midnight; see homePalette.ts).
// Text is white on the dark ground. Keeping the accent values here (rather than raw hex
// scattered across the cards) mirrors homePalette's reason for existing: one place to retune
// the brand.
const ACCENT = '#2864FF';
const ACCENT_SOFT = 'rgba(40, 100, 255, 0.14)';
const SECONDARY = '#8B96A8';

// Shown in clause 3 (milestone delivery). This page presents the standard NOVAIQ agreement, and
// the timeline is the one clause that varies per contract — 8 weeks is the custom-project default
// (see ContractBuilder) used here so the page reads fully; a specific contract states its own.
const REPRESENTATIVE_TIMELINE_WEEKS = 8;

export const EcontractsPage: React.FC<EcontractsPageProps> = ({ language }) => {
  const isAr = language === 'ar';
  const terms = contractTerms(language, REPRESENTATIVE_TIMELINE_WEEKS);

  return (
    <section className="py-4 sm:py-6 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl border flex items-center justify-center text-white shadow-xl"
            style={{ background: ACCENT_SOFT, borderColor: 'rgba(255,255,255,0.14)' }}
          >
            <FileSignature className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {isAr ? 'العقد الإلكتروني' : 'E-contract'}
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed bg-[#F6F1E9] text-[#101322] rounded-2xl p-4 sm:p-5">
            {isAr
              ? 'عقد تقديم خدمات تصميم وتطوير برمجي — البنود القياسية التي تُوقَّع إلكترونياً عند إنشاء أي عقد، كما تظهر في وثيقة العقد نفسها.'
              : 'Software design & development services agreement — the standard clauses signed electronically on every contract, exactly as they appear in the contract document itself.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          className="mt-8 p-5 rounded-3xl bg-[#F6F1E9] border flex items-start gap-4"
          style={{ borderColor: 'rgba(16, 19, 34, 0.15)' }}
        >
          <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#101322' }} />
          <p className="text-xs sm:text-sm leading-relaxed text-[#101322]">
            {isAr
              ? 'ملاحظة: هذا العرض للبنود القياسية للعقد. تُحدَّد بيانات كل عقد (الأطراف، المدة، القيمة، نطاق العمل) عند إنشائه وتُكتب في وثيقة العقد قبل التوقيع.'
              : 'Note: this shows the contract’s standard clauses. Each contract’s details (parties, duration, value, scope) are set when it is created and stated in the contract document before signing.'}
          </p>
        </div>
      </div>
    </section>
  );
};