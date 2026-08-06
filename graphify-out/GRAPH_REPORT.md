# Graph Report - .  (2026-08-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 380 nodes · 765 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e01a3000`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- CustomerDashboard.tsx
- TemplateInteractiveSandbox.tsx
- ContractBuilder.tsx
- Language
- App.tsx
- devDependencies
- dependencies
- compilerOptions
- ErrorBoundary
- pageTranslator.ts
- server.ts
- build-translations.mjs
- CosmicAudioEngine
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `Language` - 37 edges
2. `Currency` - 20 edges
3. `formatPrice()` - 18 edges
4. `translateText()` - 15 edges
5. `compilerOptions` - 15 edges
6. `ContractData` - 14 edges
7. `useLiveTemplates()` - 13 edges
8. `Template` - 12 edges
9. `showToast()` - 11 edges
10. `ContractBuilder()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `App()` --references--> `lenis`  [EXTRACTED]
  src/App.tsx → package.json
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts
- `FooterProps` --references--> `Language`  [EXTRACTED]
  src/components/Footer.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.08
Nodes (37): AdminDashboard(), CompanySignatureHandle, CompanySignaturePad, MembersTab(), SettingsTab(), SOCIAL_FIELDS, STATUS_FLOW, Tab (+29 more)

### Community 1 - "CustomerDashboard.tsx"
Cohesion: 0.12
Nodes (33): ContractRow(), ContractsTab(), OverviewTab(), PricingRow(), statusArabic(), ContractPDFPreview(), ConnectedContractPrintDocument, ContractPrintDocument (+25 more)

### Community 2 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.06
Nodes (37): PriceInput(), PriceInputProps, AccountRecord, Appointment, CartItem, ClothingProduct, COMPANY_PROFILES, CompanyProfile (+29 more)

### Community 3 - "ContractBuilder.tsx"
Cohesion: 0.10
Nodes (29): PricingTab(), ContractBuilder(), PRESET_COLORS, MilestoneTimeline(), MilestoneTimelineProps, NovaiqLogo(), NovaiqLogoProps, PageLoader() (+21 more)

### Community 4 - "Language"
Cohesion: 0.11
Nodes (29): AdminDashboardProps, TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), AdminPageProps, ContractBuilderProps, ContractBuilderGate() (+21 more)

### Community 5 - "App.tsx"
Cohesion: 0.08
Nodes (27): AdminPage, ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection(), AboutSectionProps (+19 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+25 more)

### Community 7 - "dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lucide-react (+19 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "ErrorBoundary"
Cohesion: 0.13
Nodes (8): lenis, lenis, App(), ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 10 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 11 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 12 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 14 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **129 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `ErrorBoundary`, `devDependencies`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `CustomerDashboard.tsx` to `AdminDashboard.tsx`, `dependencies`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `CustomerDashboard.tsx`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _129 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08140610545790934 - nodes in this community are weakly interconnected._
- **Should `CustomerDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1207897793263647 - nodes in this community are weakly interconnected._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05609756097560976 - nodes in this community are weakly interconnected._