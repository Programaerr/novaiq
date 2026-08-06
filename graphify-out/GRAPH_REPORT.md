# Graph Report - .  (2026-08-06)

## Corpus Check
- 96 files · ~105,752 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 447 nodes · 1082 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- TemplateInteractiveSandbox.tsx
- ContractsTab.tsx
- Language
- showToast
- devDependencies
- dependencies
- compilerOptions
- App.tsx
- ErrorBoundary
- pageTranslator.ts
- ContractBuilder.tsx
- server.ts
- TemplateLivePage.tsx
- pricingOverrides.ts
- CookieConsent.tsx
- build-translations.mjs
- CosmicAudioEngine
- App
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `Language` - 46 edges
2. `SandboxCtx` - 27 edges
3. `Currency` - 27 edges
4. `formatPrice()` - 22 edges
5. `cosmicAudio` - 18 edges
6. `translateText()` - 17 edges
7. `ContractData` - 17 edges
8. `useLiveTemplates()` - 15 edges
9. `showToast()` - 15 edges
10. `Template` - 15 edges

## Surprising Connections (you probably didn't know these)
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `useSmoothScroll()` --references--> `lenis`  [EXTRACTED]
  src/lib/useScrollBehavior.ts → package.json
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts
- `FooterProps` --references--> `Language`  [EXTRACTED]
  src/components/Footer.tsx → src/lib/i18n.ts
- `MilestoneTimelineProps` --references--> `Language`  [EXTRACTED]
  src/components/MilestoneTimeline.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Communities (20 total, 1 thin omitted)

### Community 0 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.07
Nodes (67): MilestoneTimeline(), MilestoneTimelineProps, SandboxCtx, SandboxTheme, themeClassesFor(), ResponsivePreview(), SiteMenuIcon(), SiteTopBar() (+59 more)

### Community 1 - "ContractsTab.tsx"
Cohesion: 0.08
Nodes (55): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), PricingRow(), PricingTab(), AdminStats (+47 more)

### Community 2 - "Language"
Cohesion: 0.08
Nodes (40): AboutSectionProps, AdminDashboardProps, AdminLogin(), AdminLoginProps, AdminPage(), AdminPageProps, ContractBuilderProps, ContractBuilderGate() (+32 more)

### Community 3 - "showToast"
Cohesion: 0.10
Nodes (31): MembersTab(), SettingsTab(), SOCIAL_FIELDS, TeamTab(), Footer(), FooterProps, ToastHost(), authedFetch() (+23 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (32): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+24 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (29): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lenis (+21 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 7 - "App.tsx"
Cohesion: 0.12
Nodes (15): AdminPage, ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection(), CosmicBackground() (+7 more)

### Community 8 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 9 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 10 - "ContractBuilder.tsx"
Cohesion: 0.32
Nodes (9): ContractBuilder(), PRESET_COLORS, clearContractDraft(), ContractDraft, loadContractDraft(), saveContractDraft(), PointerEvt, useSignaturePad() (+1 more)

### Community 11 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 12 - "TemplateLivePage.tsx"
Cohesion: 0.31
Nodes (8): readStoredLanguage(), TemplateInteractiveSandbox, TemplateLivePage(), THEME_COLORS, readStoredCurrency(), consumePendingContractSelection(), PendingContractSelection, writePendingContractSelection()

### Community 13 - "pricingOverrides.ts"
Cohesion: 0.36
Nodes (7): templatesData, applyPricingOverrides(), PricingOverride, readCachedOverrides(), subscribeToPricingOverrides(), useLiveTemplates(), writeCachedOverrides()

### Community 14 - "CookieConsent.tsx"
Cohesion: 0.43
Nodes (6): CookieConsent(), CookieConsentProps, ConsentStatus, getConsentStatus(), isTrackingAllowed(), setConsentStatus()

### Community 15 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 17 - "App"
Cohesion: 0.67
Nodes (3): App(), useSectionScrollSpy(), useSmoothScroll()

### Community 18 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **105 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `ContractsTab.tsx` to `dependencies`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `ContractsTab.tsx`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06884681583476764 - nodes in this community are weakly interconnected._
- **Should `ContractsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07867494824016563 - nodes in this community are weakly interconnected._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.08116883116883117 - nodes in this community are weakly interconnected._