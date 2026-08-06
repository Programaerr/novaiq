# Graph Report - novaiq  (2026-08-06)

## Corpus Check
- 69 files · ~101,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 474 nodes · 858 edges · 38 communities (30 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f65b5be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- AdminDashboard.tsx
- autoTranslate.ts
- Sandbox Demo Data Models
- Build Tooling Config
- Language
- dependencies
- auth.ts
- compilerOptions
- Error Boundary & App Entry
- pageTranslator.ts
- MilestoneTimeline.tsx
- server.ts
- NOVAIQ App Entry (index.html)
- socialLinks.ts
- CookieConsent.tsx
- toast.ts
- build-translations.mjs
- .env.local File
- vite-env.d.ts
- src/main.tsx Entry Script
- NOVAIQ brand logo mark: an outlined/wireframe-style icon of two bracket-like pillar letterforms (resembling stylized 'H' or twin brackets) crossed by a tilted Saturn-like ring/ellipse, with the wordmark 'NOVAIQ' in a thin outlined sans-serif font beneath; rendered on a transparent/white background with a sketchy dashed-line stroke texture, suggesting a brand identity asset for the 'novaiq' project/site
- NOVAIQ logo (cropped) - brand wordmark and icon featuring two stylized capital 'N' letterforms encircled by a tilted ring/orbit (Saturn-like) motif, with 'NOVAIQ' wordmark beneath; used as the site's brand logo
- What You Must Do When Invoked
- pricingOverrides.ts
- TemplateLivePage.tsx
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- App
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md

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
10. `What You Must Do When Invoked` - 12 edges

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

## Communities (38 total, 8 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.11
Nodes (16): AdminPage, ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection(), AboutSectionProps (+8 more)

### Community 1 - "AdminDashboard.tsx"
Cohesion: 0.09
Nodes (42): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), MembersTab(), OverviewTab(), PricingRow(), SettingsTab() (+34 more)

### Community 2 - "autoTranslate.ts"
Cohesion: 0.27
Nodes (11): bundled, flushBatch(), isFullyResolved(), memoryCache, pendingBatch, PendingEntry, requestTranslation(), resolveStatic() (+3 more)

### Community 3 - "Sandbox Demo Data Models"
Cohesion: 0.06
Nodes (37): PriceInput(), PriceInputProps, AccountRecord, Appointment, CartItem, ClothingProduct, COMPANY_PROFILES, CompanyProfile (+29 more)

### Community 4 - "Build Tooling Config"
Cohesion: 0.06
Nodes (33): autoprefixer, esbuild, vite, devDependencies, autoprefixer, esbuild, tailwindcss, tsx (+25 more)

### Community 5 - "Language"
Cohesion: 0.11
Nodes (34): AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps, ContractPDFPreviewProps, ConnectedContractPrintDocument (+26 more)

### Community 6 - "dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lucide-react (+19 more)

### Community 7 - "auth.ts"
Cohesion: 0.18
Nodes (16): AdminDashboard(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), CustomerDashboard(), addAdminEmail() (+8 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "Error Boundary & App Entry"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 10 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 11 - "MilestoneTimeline.tsx"
Cohesion: 0.20
Nodes (4): MilestoneTimeline(), MilestoneTimelineProps, cosmicAudio, CosmicAudioEngine

### Community 12 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 13 - "NOVAIQ App Entry (index.html)"
Cohesion: 0.28
Nodes (9): Cairo Variable Font (self-hosted), Dark Theme (html class=dark), Font Preload + font-display Optimization, NOVAIQ App Entry (index.html), NOVAIQ Favicon Icon, RTL Arabic Layout (lang=ar dir=rtl), Tajawal Font (self-hosted), AI Studio App (NOVAIQ) (+1 more)

### Community 14 - "socialLinks.ts"
Cohesion: 0.18
Nodes (12): NovaIQ icon/logo mark: a stylized double-H (or interlocking bracket) letterform encircled by a tilted elliptical ring, evoking a planet's orbital ring; used as the brand icon/favicon for the NovaIQ site, Footer(), FooterProps, Navbar(), NovaiqLogo(), NovaiqLogoProps, readCachedLinks(), SocialLinks (+4 more)

### Community 15 - "CookieConsent.tsx"
Cohesion: 0.43
Nodes (6): CookieConsent(), CookieConsentProps, ConsentStatus, getConsentStatus(), isTrackingAllowed(), setConsentStatus()

### Community 16 - "toast.ts"
Cohesion: 0.36
Nodes (6): ToastHost(), Listener, listeners, subscribeToToasts(), ToastMessage, ToastType

### Community 17 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 18 - ".env.local File"
Cohesion: 0.40
Nodes (5): .env.local File, GEMINI_API_KEY Environment Variable, Node.js Prerequisite, npm install Command, npm run dev Command

### Community 19 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

### Community 24 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 25 - "pricingOverrides.ts"
Cohesion: 0.27
Nodes (9): PricingTab(), templatesData, applyPricingOverrides(), PricingOverride, readCachedOverrides(), savePricingOverride(), subscribeToPricingOverrides(), useLiveTemplates() (+1 more)

### Community 26 - "TemplateLivePage.tsx"
Cohesion: 0.31
Nodes (8): PageLoader(), ThemeColor, readStoredLanguage(), TemplateInteractiveSandbox, TemplateLivePage(), THEME_COLORS, readStoredCurrency(), writePendingContractSelection()

### Community 27 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 28 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 29 - "App"
Cohesion: 0.33
Nodes (5): lenis, lenis, App(), consumePendingContractSelection(), PendingContractSelection

### Community 30 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 31 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 32 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **185 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `Build Tooling Config`, `App`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `AdminDashboard.tsx` to `Language`, `dependencies`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `AdminDashboard.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Should `Sandbox Demo Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.05609756097560976 - nodes in this community are weakly interconnected._