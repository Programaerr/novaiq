# Graph Report - .  (2026-08-06)

## Corpus Check
- 61 files · ~89,692 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 406 nodes · 797 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.62)
- Token cost: 129,252 input · 0 output

## Community Hubs (Navigation)
- Sandbox Demo Data Models
- Admin Dashboard & Firebase Core
- Pricing, Translation & PDF
- Build Tooling Config
- Home Page Shell & Audio
- Component Props & Types
- Runtime Dependencies
- Live Template Pricing System
- TypeScript Config
- Authentication & Admin Access
- Footer & Social Links
- Error Boundary & App Entry
- Auto Page Translator
- Dev Server & Translation API
- index.html & Font Setup
- Cookie Consent
- Toast Notifications
- Translation Build Script
- README Setup Guide
- Vite Asset Type Declarations
- App Root Mount
- NOVAIQ Logo Image
- NOVAIQ Logo (Cropped)

## God Nodes (most connected - your core abstractions)
1. `Language` - 39 edges
2. `Currency` - 20 edges
3. `formatPrice()` - 18 edges
4. `translateText()` - 15 edges
5. `compilerOptions` - 15 edges
6. `ContractData` - 14 edges
7. `useLiveTemplates()` - 13 edges
8. `Template` - 13 edges
9. `showToast()` - 12 edges
10. `ContractBuilder()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AI Studio App (NOVAIQ)` --conceptually_related_to--> `NOVAIQ App Entry (index.html)`  [INFERRED]
  README.md → index.html
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `App()` --references--> `lenis`  [EXTRACTED]
  src/App.tsx → package.json
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local App Setup Flow** — readme_nodejs, readme_npm_install, readme_gemini_api_key, readme_env_local, readme_npm_run_dev [INFERRED 0.85]
- **Self-hosted Font Preload Optimization Pattern** — index_cairo_font, index_tajawal_font, index_font_preload_optimization, src_index_css_font_face [EXTRACTED 1.00]

## Communities (24 total, 3 thin omitted)

### Community 0 - "Sandbox Demo Data Models"
Cohesion: 0.06
Nodes (37): PriceInput(), PriceInputProps, AccountRecord, Appointment, CartItem, ClothingProduct, COMPANY_PROFILES, CompanyProfile (+29 more)

### Community 1 - "Admin Dashboard & Firebase Core"
Cohesion: 0.09
Nodes (31): AdminDashboard(), CompanySignatureHandle, CompanySignaturePad, ContractsTab(), MembersTab(), OverviewTab(), SOCIAL_FIELDS, STATUS_FLOW (+23 more)

### Community 2 - "Pricing, Translation & PDF"
Cohesion: 0.13
Nodes (30): ContractRow(), PricingRow(), ContractPDFPreview(), ConnectedContractPrintDocument, ContractPrintDocument, CustomerContractRow(), formatDate(), STATUS_LABEL_AR (+22 more)

### Community 3 - "Build Tooling Config"
Cohesion: 0.06
Nodes (33): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+25 more)

### Community 4 - "Home Page Shell & Audio"
Cohesion: 0.07
Nodes (21): AdminPage, ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection(), AboutSectionProps (+13 more)

### Community 5 - "Component Props & Types"
Cohesion: 0.14
Nodes (24): AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps, ContractPDFPreviewProps, ContractPrintDocumentProps (+16 more)

### Community 6 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lucide-react (+19 more)

### Community 7 - "Live Template Pricing System"
Cohesion: 0.11
Nodes (22): lenis, lenis, App(), PricingTab(), ThemeColor, readStoredLanguage(), TemplateInteractiveSandbox, TemplateLivePage() (+14 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "Authentication & Admin Access"
Cohesion: 0.20
Nodes (14): TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), Navbar(), addAdminEmail(), authErrorMessage() (+6 more)

### Community 10 - "Footer & Social Links"
Cohesion: 0.22
Nodes (11): NovaIQ icon/logo mark: a stylized double-H (or interlocking bracket) letterform encircled by a tilted elliptical ring, evoking a planet's orbital ring; used as the brand icon/favicon for the NovaIQ site, SettingsTab(), Footer(), FooterProps, NovaiqLogo(), NovaiqLogoProps, saveSocialLinks(), SocialLinks (+3 more)

### Community 11 - "Error Boundary & App Entry"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 12 - "Auto Page Translator"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 13 - "Dev Server & Translation API"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 14 - "index.html & Font Setup"
Cohesion: 0.28
Nodes (9): Cairo Variable Font (self-hosted), Dark Theme (html class=dark), Font Preload + font-display Optimization, NOVAIQ App Entry (index.html), NOVAIQ Favicon Icon, RTL Arabic Layout (lang=ar dir=rtl), Tajawal Font (self-hosted), AI Studio App (NOVAIQ) (+1 more)

### Community 15 - "Cookie Consent"
Cohesion: 0.43
Nodes (6): CookieConsent(), CookieConsentProps, ConsentStatus, getConsentStatus(), isTrackingAllowed(), setConsentStatus()

### Community 16 - "Toast Notifications"
Cohesion: 0.36
Nodes (6): ToastHost(), Listener, listeners, subscribeToToasts(), ToastMessage, ToastType

### Community 17 - "Translation Build Script"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 18 - "README Setup Guide"
Cohesion: 0.40
Nodes (5): .env.local File, GEMINI_API_KEY Environment Variable, Node.js Prerequisite, npm install Command, npm run dev Command

### Community 19 - "Vite Asset Type Declarations"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **142 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Build Tooling Config`, `Live Template Pricing System`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `Pricing, Translation & PDF` to `Admin Dashboard & Firebase Core`, `Runtime Dependencies`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Runtime Dependencies` to `Pricing, Translation & PDF`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _142 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sandbox Demo Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.05609756097560976 - nodes in this community are weakly interconnected._
- **Should `Admin Dashboard & Firebase Core` be split into smaller, more focused modules?**
  _Cohesion score 0.0931174089068826 - nodes in this community are weakly interconnected._
- **Should `Pricing, Translation & PDF` be split into smaller, more focused modules?**
  _Cohesion score 0.13225371120107962 - nodes in this community are weakly interconnected._