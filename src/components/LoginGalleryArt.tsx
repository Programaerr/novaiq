// Login gallery artwork: six self-contained SVG mock-ups of the two things NOVAIQ builds —
// modern phone apps and modern websites. Drawn rather than fetched, so the login page never
// depends on a remote image loading, and coloured from the site's own palette (periwinkle,
// sand, deep zinc). Each fits the login gallery's tall capsule shape.
import React from 'react';

const DEEP = '#07080D';
const FRAME = '#0C0F16';
const BAR = '#11141D';
const BODY = '#0F131C';
const LINE = 'rgba(255,255,255,0.16)';
const PANEL_LINE = 'rgba(255,255,255,0.06)';
const PERI = '#8295CF';
const PERI_MID = '#54639C';
const SAND = '#D5BDAC';
const SOFT = '#2A2E3B';
const DIM = '#1B1E29';

type ArtProps = { className?: string };

function PhoneChassis({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect width="120" height="315" fill={DEEP} />
      <rect x="16" y="30" width="88" height="256" rx="20" fill={FRAME} stroke={LINE} strokeWidth="1.5" />
      <rect x="50" y="36" width="20" height="5" rx="2.5" fill="#191C25" />
      <circle cx="22" cy="41" r="1.8" fill="#2A2D38" />
      <circle cx="98" cy="41" r="1.8" fill="#2A2D38" />
      {children}
    </>
  );
}

function BrowserChassis({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect width="120" height="315" fill={DEEP} />
      <rect x="4" y="30" width="112" height="272" rx="12" fill={FRAME} stroke={LINE} strokeWidth="1.5" />
      <path d="M4 42 a12 12 0 0 1 12 -12 h88 a12 12 0 0 1 12 12 v8 h-112 z" fill={BAR} />
      <circle cx="14" cy="40" r="2.6" fill="#6E5B4F" />
      <circle cx="23" cy="40" r="2.6" fill="#8A6A52" />
      <circle cx="32" cy="40" r="2.6" fill="#59618A" />
      <rect x="42" y="36" width="66" height="8" rx="4" fill="#1A1D28" />
      <rect x="48" y="38.5" width="26" height="3" rx="1.5" fill="#33384A" />
      {children}
    </>
  );
}

// Phone app — booking a unit: greeting, hero card, property list, tab bar.
export const PhoneBooking: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 120 315" preserveAspectRatio="xMidYMid slice" className={className}>
    <PhoneChassis>
      <circle cx="30" cy="62" r="8" fill={SAND} />
      <rect x="43" y="56" width="42" height="6" rx="3" fill={SOFT} />
      <rect x="43" y="66" width="26" height="4" rx="2" fill={DIM} />
      <rect x="24" y="82" width="72" height="54" rx="12" fill={PERI_MID} />
      <rect x="32" y="94" width="38" height="6" rx="3" fill="#FFFFFF" opacity="0.9" />
      <rect x="32" y="104" width="52" height="5" rx="2.5" fill="#FFFFFF" opacity="0.55" />
      <rect x="32" y="112" width="26" height="5" rx="2.5" fill="#FFFFFF" opacity="0.4" />
      <circle cx="84" cy="122" r="8" fill="#FFFFFF" opacity="0.22" />
      <rect x="24" y="146" width="34" height="6" rx="3" fill="rgba(255,255,255,0.9)" />
      {[0, 1, 2].map((i) => {
        const y = 160 + i * 32;
        return (
          <g key={i}>
            <rect x="24" y={y} width="72" height="26" rx="9" fill={BODY} stroke={PANEL_LINE} />
            <rect x="30" y={y + 5} width="30" height="16" rx="5" fill="#20242F" />
            <rect x="66" y={y + 5} width="24" height="5" rx="2.5" fill={SOFT} />
            <rect x="66" y={y + 14} width="16" height="4" rx="2" fill={DIM} />
          </g>
        );
      })}
      <rect x="24" y="252" width="72" height="16" rx="8" fill="#0D1018" stroke="rgba(255,255,255,0.05)" />
      <circle cx="32" cy="260" r="3" fill={PERI} />
      <circle cx="45" cy="260" r="3" fill="#33384A" />
      <circle cx="58" cy="260" r="3" fill="#33384A" />
      <rect x="68" y="257" width="24" height="6" rx="3" fill={SAND} />
    </PhoneChassis>
  </svg>
);

// Phone app — customer support chat: header, alternating bubbles, composer.
export const PhoneChat: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 120 315" preserveAspectRatio="xMidYMid slice" className={className}>
    <PhoneChassis>
      <path d="M26 60 L20 66 L26 72" stroke="#4A4F60" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="66" r="6" fill={PERI} />
      <rect x="44" y="62" width="30" height="5" rx="2.5" fill={SOFT} />
      <rect x="44" y="70" width="18" height="4" rx="2" fill={DIM} />
      <rect x="26" y="84" width="56" height="22" rx="10" fill="#191D29" />
      <rect x="32" y="91" width="44" height="4" rx="2" fill="#33384A" />
      <rect x="32" y="98" width="30" height="4" rx="2" fill="#2A2E3B" />
      <rect x="44" y="116" width="50" height="22" rx="10" fill={PERI_MID} />
      <rect x="50" y="123" width="38" height="4" rx="2" fill="#E7EBF8" opacity="0.8" />
      <rect x="50" y="130" width="26" height="4" rx="2" fill="#E7EBF8" opacity="0.55" />
      <rect x="30" y="148" width="52" height="22" rx="10" fill="#191D29" />
      <rect x="36" y="155" width="40" height="4" rx="2" fill="#33384A" />
      <rect x="36" y="162" width="28" height="4" rx="2" fill="#2A2E3B" />
      <rect x="44" y="180" width="50" height="22" rx="10" fill={PERI_MID} />
      <rect x="50" y="187" width="36" height="4" rx="2" fill="#E7EBF8" opacity="0.8" />
      <rect x="44" y="212" width="32" height="8" rx="4" fill={DIM} />
      <rect x="26" y="246" width="68" height="16" rx="8" fill="#0D1018" stroke="rgba(255,255,255,0.06)" />
      <circle cx="88" cy="254" r="6" fill={PERI} />
    </PhoneChassis>
  </svg>
);

// Phone app — owner dashboard: KPI, bar chart, summary cards.
export const PhoneStats: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 120 315" preserveAspectRatio="xMidYMid slice" className={className}>
    <PhoneChassis>
      <rect x="24" y="56" width="40" height="6" rx="3" fill="rgba(255,255,255,0.9)" />
      <rect x="24" y="66" width="26" height="4" rx="2" fill={DIM} />
      <rect x="24" y="82" width="72" height="46" rx="12" fill={BODY} stroke={PANEL_LINE} />
      <rect x="32" y="92" width="24" height="14" rx="3" fill="#20242F" />
      <rect x="32" y="110" width="46" height="5" rx="2.5" fill={SOFT} />
      <rect x="24" y="140" width="72" height="76" rx="12" fill={BODY} stroke={PANEL_LINE} />
      {[22, 34, 28, 44, 38, 52].map((h, i) => (
        <rect key={i} x={32 + i * 11} y={200 - h} width="8" height={h} rx="3" fill={i === 5 ? SAND : PERI} opacity={i === 5 ? 1 : 0.85} />
      ))}
      <rect x="32" y="200" width="56" height="4" rx="2" fill={DIM} />
      <rect x="24" y="228" width="34" height="28" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <rect x="28" y="236" width="26" height="5" rx="2.5" fill={SOFT} />
      <rect x="28" y="245" width="16" height="4" rx="2" fill={DIM} />
      <rect x="62" y="228" width="34" height="28" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <rect x="66" y="236" width="26" height="5" rx="2.5" fill={SOFT} />
      <rect x="66" y="245" width="16" height="4" rx="2" fill={DIM} />
    </PhoneChassis>
  </svg>
);

// Website — landing page: nav, hero with call to action, trust row, cards, footer.
export const SiteHero: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 120 315" preserveAspectRatio="xMidYMid slice" className={className}>
    <BrowserChassis>
      <rect x="14" y="54" width="18" height="7" rx="3.5" fill={PERI} />
      <rect x="66" y="56" width="9" height="4" rx="2" fill="#33384A" />
      <rect x="78" y="56" width="9" height="4" rx="2" fill="#33384A" />
      <rect x="90" y="56" width="9" height="4" rx="2" fill="#33384A" />
      <rect x="90" y="52" width="24" height="11" rx="5.5" fill="#3E4B7A" />
      <rect x="14" y="74" width="52" height="9" rx="4.5" fill="#FFFFFF" opacity="0.92" />
      <rect x="14" y="87" width="44" height="9" rx="4.5" fill="#FFFFFF" opacity="0.75" />
      <rect x="14" y="100" width="40" height="5" rx="2.5" fill={SOFT} />
      <rect x="14" y="109" width="34" height="5" rx="2.5" fill={DIM} />
      <rect x="14" y="122" width="28" height="12" rx="6" fill={SAND} />
      <rect x="46" y="122" width="18" height="12" rx="6" fill="#1A1D28" stroke="rgba(255,255,255,0.1)" />
      <rect x="70" y="72" width="38" height="66" rx="10" fill="#232A45" />
      <path d="M74 122 L82 102 L90 112 L96 96 L104 122 Z" fill={PERI} opacity="0.5" />
      <rect x="74" y="86" width="30" height="6" rx="3" fill="#FFFFFF" opacity="0.5" />
      <rect x="14" y="156" width="92" height="1" fill="rgba(255,255,255,0.06)" />
      <rect x="14" y="164" width="16" height="5" rx="2.5" fill={SOFT} />
      <rect x="40" y="164" width="20" height="5" rx="2.5" fill="#22262F" />
      <rect x="70" y="164" width="14" height="5" rx="2.5" fill="#22262F" />
      <rect x="14" y="182" width="44" height="46" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <rect x="18" y="188" width="36" height="18" rx="5" fill="#20242F" />
      <rect x="18" y="212" width="30" height="5" rx="2.5" fill={SOFT} />
      <rect x="18" y="220" width="20" height="4" rx="2" fill={DIM} />
      <rect x="62" y="182" width="44" height="46" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <rect x="66" y="188" width="36" height="18" rx="5" fill="#20242F" />
      <rect x="66" y="212" width="30" height="5" rx="2.5" fill={SOFT} />
      <rect x="66" y="220" width="20" height="4" rx="2" fill={DIM} />
      <rect x="14" y="244" width="92" height="1" fill="rgba(255,255,255,0.06)" />
      <rect x="14" y="252" width="12" height="6" rx="3" fill={PERI} />
      <rect x="30" y="254" width="10" height="4" rx="2" fill={SOFT} />
      <rect x="84" y="252" width="22" height="6" rx="3" fill="#191C25" />
    </BrowserChassis>
  </svg>
);

// Website — product grid: navbar, heading, 2×2 cards, footer.
export const SiteCards: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 120 315" preserveAspectRatio="xMidYMid slice" className={className}>
    <BrowserChassis>
      <rect x="14" y="54" width="18" height="7" rx="3.5" fill={SAND} />
      <rect x="66" y="56" width="9" height="4" rx="2" fill="#33384A" />
      <rect x="78" y="56" width="9" height="4" rx="2" fill="#33384A" />
      <rect x="90" y="56" width="9" height="4" rx="2" fill="#33384A" />
      <rect x="14" y="72" width="46" height="8" rx="4" fill="#FFFFFF" opacity="0.9" />
      <rect x="14" y="84" width="60" height="4" rx="2" fill={SOFT} />
      <rect x="14" y="91" width="48" height="4" rx="2" fill={DIM} />
      {[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 14 + col * 50;
        const y = 106 + row * 62;
        const thumb = i % 2 === 0 ? '#3E4B7A' : '#9A8470';
        return (
          <g key={i}>
            <rect x={x} y={y} width="44" height="54" rx="9" fill={BODY} stroke={PANEL_LINE} />
            <rect x={x + 4} y={y + 4} width="36" height="22" rx="6" fill={thumb} />
            <rect x={x + 4} y={y + 31} width="28" height="5" rx="2.5" fill={SOFT} />
            <rect x={x + 4} y={y + 39} width="20" height="4" rx="2" fill={DIM} />
          </g>
        );
      })}
      <rect x="14" y="242" width="92" height="1" fill="rgba(255,255,255,0.06)" />
      <rect x="14" y="250" width="10" height="5" rx="2.5" fill={PERI} />
      <rect x="28" y="252" width="8" height="3" rx="1.5" fill={SOFT} />
      <rect x="88" y="250" width="18" height="5" rx="2.5" fill="#191C25" />
    </BrowserChassis>
  </svg>
);

// Website — dashboard: sidebar, header, stat cards, line chart, table.
export const SiteDashboard: React.FC<ArtProps> = ({ className }) => (
  <svg viewBox="0 0 120 315" preserveAspectRatio="xMidYMid slice" className={className}>
    <BrowserChassis>
      <rect x="8" y="54" width="22" height="232" rx="8" fill="#0D1018" stroke="rgba(255,255,255,0.05)" />
      <rect x="12" y="62" width="14" height="5" rx="2.5" fill={PERI} />
      <circle cx="19" cy="80" r="2.5" fill={PERI} />
      <circle cx="19" cy="92" r="2.5" fill="#33384A" />
      <circle cx="19" cy="104" r="2.5" fill="#33384A" />
      <circle cx="19" cy="116" r="2.5" fill="#33384A" />
      <rect x="12" y="270" width="14" height="6" rx="3" fill={SAND} />
      <rect x="36" y="56" width="34" height="7" rx="3.5" fill="#FFFFFF" opacity="0.9" />
      <rect x="36" y="67" width="24" height="4" rx="2" fill={DIM} />
      <rect x="78" y="56" width="30" height="12" rx="6" fill="#3E4B7A" />
      <rect x="36" y="82" width="44" height="34" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <rect x="40" y="90" width="18" height="10" rx="3" fill="#20242F" />
      <rect x="40" y="104" width="26" height="5" rx="2.5" fill={SOFT} />
      <rect x="84" y="82" width="28" height="34" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <rect x="88" y="90" width="18" height="10" rx="3" fill="#20242F" />
      <rect x="88" y="104" width="20" height="5" rx="2.5" fill={SOFT} />
      <rect x="36" y="124" width="76" height="58" rx="9" fill={BODY} stroke={PANEL_LINE} />
      <path d="M40 168 L54 152 L68 158 L82 138 L96 146 L108 128" stroke={PERI} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="40" y="132" width="30" height="5" rx="2.5" fill={SOFT} />
      <rect x="36" y="190" width="76" height="5" rx="2.5" fill={SOFT} />
      {[0, 1, 2].map((i) => {
        const y = 202 + i * 18;
        return (
          <g key={i}>
            <rect x="36" y={y} width="76" height="13" rx="6" fill={BODY} stroke="rgba(255,255,255,0.05)" />
            <circle cx="44" cy={y + 6.5} r="4" fill={i === 0 ? PERI : i === 1 ? SAND : '#33384A'} />
            <rect x="52" y={y + 3} width="30" height="4" rx="2" fill={SOFT} />
            <rect x="92" y={y + 3} width="16" height="4" rx="2" fill={DIM} />
          </g>
        );
      })}
    </BrowserChassis>
  </svg>
);