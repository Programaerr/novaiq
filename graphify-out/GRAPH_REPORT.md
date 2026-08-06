# Graph Report - .  (2026-08-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 384 nodes · 767 edges · 18 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4aa5fb3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- App.tsx
- Language
- TemplateInteractiveSandbox.tsx
- devDependencies
- dependencies
- compilerOptions
- Footer.tsx
- auth.ts
- ErrorBoundary
- autoTranslate.ts
- pageTranslator.ts
- MilestoneTimeline.tsx
- server.ts
- toast.ts
- build-translations.mjs
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `Language` - 34 edges
2. `formatPrice()` - 18 edges
3. `Currency` - 17 edges
4. `translateText()` - 15 edges
5. `compilerOptions` - 15 edges
6. `ContractData` - 14 edges
7. `useLiveTemplates()` - 13 edges
8. `showToast()` - 12 edges
9. `Template` - 12 edges
10. `ContractBuilder()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `App()` --references--> `lenis`  [EXTRACTED]
  src/App.tsx → package.json
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Communities (18 total, 0 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.08
Nodes (46): AdminDashboard(), AdminDashboardProps, CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), MembersTab(), OverviewTab() (+38 more)

### Community 1 - "App.tsx"
Cohesion: 0.06
Nodes (40): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+32 more)

### Community 2 - "Language"
Cohesion: 0.12
Nodes (31): AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps, ContractPDFPreviewProps, ContractPrintDocument, ContractPrintDocumentProps (+23 more)

### Community 3 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.06
Nodes (37): PriceInput(), PriceInputProps, AccountRecord, Appointment, CartItem, ClothingProduct, COMPANY_PROFILES, CompanyProfile (+29 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+25 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lucide-react (+19 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 7 - "Footer.tsx"
Cohesion: 0.18
Nodes (12): SettingsTab(), Footer(), FooterProps, Navbar(), NavbarProps, NovaiqLogo(), NovaiqLogoProps, saveSocialLinks() (+4 more)

### Community 8 - "auth.ts"
Cohesion: 0.23
Nodes (12): AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), addAdminEmail(), authErrorMessage(), googleProvider, isAdminEmail() (+4 more)

### Community 9 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 10 - "autoTranslate.ts"
Cohesion: 0.27
Nodes (11): bundled, flushBatch(), isFullyResolved(), memoryCache, pendingBatch, PendingEntry, requestTranslation(), resolveStatic() (+3 more)

### Community 11 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 12 - "MilestoneTimeline.tsx"
Cohesion: 0.20
Nodes (4): MilestoneTimeline(), MilestoneTimelineProps, cosmicAudio, CosmicAudioEngine

### Community 13 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 14 - "toast.ts"
Cohesion: 0.36
Nodes (6): ToastHost(), Listener, listeners, subscribeToToasts(), ToastMessage, ToastType

### Community 15 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 16 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **134 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `App.tsx`, `devDependencies`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `AdminDashboard.tsx` to `Language`, `dependencies`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `AdminDashboard.tsx`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06196078431372549 - nodes in this community are weakly interconnected._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.11627906976744186 - nodes in this community are weakly interconnected._