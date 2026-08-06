# Graph Report - .  (2026-08-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 380 nodes · 755 edges · 16 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `103da5cf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- TemplateInteractiveSandbox.tsx
- Language
- App.tsx
- devDependencies
- pageTranslator.ts
- dependencies
- ContractBuilder.tsx
- auth.ts
- compilerOptions
- TemplateLivePage.tsx
- autoTranslate.ts
- server.ts
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
8. `showToast()` - 11 edges
9. `Template` - 11 edges
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

## Communities (16 total, 0 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.07
Nodes (43): AdminDashboardProps, CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), MembersTab(), OverviewTab(), PricingRow() (+35 more)

### Community 1 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.06
Nodes (37): PriceInput(), PriceInputProps, AccountRecord, Appointment, CartItem, ClothingProduct, COMPANY_PROFILES, CompanyProfile (+29 more)

### Community 2 - "Language"
Cohesion: 0.12
Nodes (30): ContractBuilderProps, ContractBuilderGateProps, ContractPDFPreviewProps, ConnectedContractPrintDocument, ContractPrintDocument, ContractPrintDocumentProps, CustomerContractRow(), CustomerDashboardProps (+22 more)

### Community 3 - "App.tsx"
Cohesion: 0.07
Nodes (24): AdminPage, ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection(), AboutSectionProps (+16 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (33): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+25 more)

### Community 5 - "pageTranslator.ts"
Cohesion: 0.10
Nodes (20): lenis, lenis, App(), ErrorBoundary, Props, State, applyText(), collectArabicTextNodes() (+12 more)

### Community 6 - "dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lucide-react (+19 more)

### Community 7 - "ContractBuilder.tsx"
Cohesion: 0.14
Nodes (19): PricingTab(), ContractBuilder(), PRESET_COLORS, ToastHost(), templatesData, clearContractDraft(), ContractDraft, loadContractDraft() (+11 more)

### Community 8 - "auth.ts"
Cohesion: 0.18
Nodes (17): AdminDashboard(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), AdminPageProps, ContractBuilderGate(), CustomerDashboard() (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 10 - "TemplateLivePage.tsx"
Cohesion: 0.17
Nodes (11): Navbar(), NavbarProps, NovaiqLogo(), NovaiqLogoProps, PageLoader(), ThemeColor, readStoredLanguage(), TemplateInteractiveSandbox (+3 more)

### Community 11 - "autoTranslate.ts"
Cohesion: 0.25
Nodes (12): ContractPDFPreview(), bundled, flushBatch(), isFullyResolved(), memoryCache, pendingBatch, PendingEntry, requestTranslation() (+4 more)

### Community 12 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 13 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 14 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **133 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `pageTranslator.ts`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `Language` to `AdminDashboard.tsx`, `autoTranslate.ts`, `dependencies`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `Language`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07474600870827286 - nodes in this community are weakly interconnected._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05609756097560976 - nodes in this community are weakly interconnected._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.12179487179487179 - nodes in this community are weakly interconnected._