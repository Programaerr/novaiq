# Graph Report - .  (2026-08-06)

## Corpus Check
- 61 files · ~90,021 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 410 nodes · 805 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 22
- Community 23

## God Nodes (most connected - your core abstractions)
1. `Language` - 39 edges
2. `Currency` - 20 edges
3. `formatPrice()` - 18 edges
4. `translateText()` - 15 edges
5. `useLiveTemplates()` - 15 edges
6. `compilerOptions` - 15 edges
7. `ContractData` - 14 edges
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

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (37): AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (34): CompanySignatureHandle, CompanySignaturePad, MembersTab(), SettingsTab(), SOCIAL_FIELDS, STATUS_FLOW, Tab, LogoutConfirmDialog() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (32): ContractRow(), ContractsTab(), OverviewTab(), PricingRow(), statusArabic(), ContractPDFPreview(), ConnectedContractPrintDocument, ContractPrintDocument (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (37): PriceInput(), PriceInputProps, AccountRecord, Appointment, CartItem, ClothingProduct, COMPANY_PROFILES, CompanyProfile (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (26): AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps, ContractPDFPreviewProps, ContractPrintDocumentProps (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lenis (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (16): AdminDashboard(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), CustomerDashboard(), addAdminEmail() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 10 - "Community 10"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (4): MilestoneTimeline(), MilestoneTimelineProps, cosmicAudio, CosmicAudioEngine

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 13 - "Community 13"
Cohesion: 0.28
Nodes (9): Cairo Variable Font (self-hosted), Dark Theme (html class=dark), Font Preload + font-display Optimization, NOVAIQ App Entry (index.html), NOVAIQ Favicon Icon, RTL Arabic Layout (lang=ar dir=rtl), Tajawal Font (self-hosted), AI Studio App (NOVAIQ) (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.32
Nodes (6): NovaIQ icon/logo mark: a stylized double-H (or interlocking bracket) letterform encircled by a tilted elliptical ring, evoking a planet's orbital ring; used as the brand icon/favicon for the NovaIQ site, Footer(), FooterProps, NovaiqLogo(), NovaiqLogoProps, whatsappLink()

### Community 15 - "Community 15"
Cohesion: 0.43
Nodes (6): CookieConsent(), CookieConsentProps, ConsentStatus, getConsentStatus(), isTrackingAllowed(), setConsentStatus()

### Community 16 - "Community 16"
Cohesion: 0.36
Nodes (6): ToastHost(), Listener, listeners, subscribeToToasts(), ToastMessage, ToastType

### Community 17 - "Community 17"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (5): .env.local File, GEMINI_API_KEY Environment Variable, Node.js Prerequisite, npm install Command, npm run dev Command

### Community 19 - "Community 19"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **142 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 6` to `Community 4`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `Community 2` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Community 6` to `Community 2`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _142 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0666049953746531 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08970099667774087 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12073170731707317 - nodes in this community are weakly interconnected._