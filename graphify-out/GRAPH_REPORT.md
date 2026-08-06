# Graph Report - novaiq  (2026-08-06)

## Corpus Check
<<<<<<< HEAD
- 81 files · ~102,044 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 477 nodes · 977 edges · 35 communities (24 shown, 11 thin omitted)
=======
<<<<<<< HEAD
- 79 files · ~101,830 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 471 nodes · 958 edges · 37 communities (27 shown, 10 thin omitted)
=======
- 80 files · ~101,959 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 474 nodes · 971 edges · 36 communities (25 shown, 11 thin omitted)
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
<<<<<<< HEAD
- Built from commit: `7dc09dc0`
=======
<<<<<<< HEAD
- Built from commit: `5f1a0bd1`
=======
- Built from commit: `8846a59a`
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ContractsTab.tsx
- App.tsx
- TemplateInteractiveSandbox.tsx
- Language
- devDependencies
- dependencies
- What You Must Do When Invoked
<<<<<<< HEAD
- audio.ts
- compilerOptions
- AdminDashboard.tsx
- showToast
- ErrorBoundary
=======
- CosmicAudioEngine
- compilerOptions
- auth.ts
- showToast
<<<<<<< HEAD
- scripts
- package.json
- pageTranslator.ts
- server.ts
- graphify reference: extra exports and benchmark
- vite
- ErrorBoundary
=======
- CookieConsent.tsx
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
- PricingTab.tsx
- pageTranslator.ts
- server.ts
- graphify reference: extra exports and benchmark
- scripts
<<<<<<< HEAD
- PolicyPage.tsx
=======
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282
- build-translations.mjs
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- vite-env.d.ts
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Run and deploy your AI Studio app
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md
- firebase-admin
- motion
- react-dom
- @tailwindcss/vite

## God Nodes (most connected - your core abstractions)
1. `Language` - 44 edges
2. `Currency` - 25 edges
3. `formatPrice()` - 22 edges
4. `translateText()` - 17 edges
5. `ContractData` - 17 edges
6. `useLiveTemplates()` - 15 edges
7. `showToast()` - 15 edges
8. `compilerOptions` - 15 edges
9. `Template` - 13 edges
10. `What You Must Do When Invoked` - 12 edges

## Surprising Connections (you probably didn't know these)
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
<<<<<<< HEAD
- `useSmoothScroll()` --references--> `lenis`  [EXTRACTED]
  src/lib/useScrollBehavior.ts → package.json
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
=======
- `App()` --references--> `lenis`  [EXTRACTED]
  src/App.tsx → package.json
<<<<<<< HEAD
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
=======
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
- `App()` --calls--> `useLiveTemplates()`  [EXTRACTED]
  src/App.tsx → src/lib/pricingOverrides.ts
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

## Import Cycles
- None detected.

<<<<<<< HEAD
## Communities (35 total, 11 thin omitted)
=======
<<<<<<< HEAD
## Communities (37 total, 10 thin omitted)

### Community 0 - "ContractsTab.tsx"
Cohesion: 0.12
Nodes (34): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), AdminStats, BarRow(), STATUS_FLOW (+26 more)

### Community 1 - "App.tsx"
Cohesion: 0.07
Nodes (34): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+26 more)
=======
## Communities (36 total, 11 thin omitted)
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

### Community 0 - "ContractsTab.tsx"
Cohesion: 0.09
Nodes (48): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), AdminStats, BarRow(), StatTile() (+40 more)

### Community 1 - "App.tsx"
Cohesion: 0.06
<<<<<<< HEAD
Nodes (39): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+31 more)
=======
Nodes (29): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+21 more)
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

### Community 2 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.09
Nodes (40): PriceInput(), PriceInputProps, ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice, TemplateInteractiveSandbox(), AccountRecord (+32 more)

### Community 3 - "Language"
<<<<<<< HEAD
Cohesion: 0.11
Nodes (33): AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGate(), ContractBuilderGateProps, ContractPDFPreviewProps (+25 more)
=======
Cohesion: 0.08
<<<<<<< HEAD
Nodes (47): PricingRow(), PricingTab(), AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps (+39 more)
=======
Nodes (41): AboutSection(), AboutSectionProps, AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps (+33 more)
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+11 more)

### Community 5 - "dependencies"
Cohesion: 0.11
Nodes (19): dotenv, express, firebase, @google/genai, html2canvas-pro, jspdf, lucide-react, dependencies (+11 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

<<<<<<< HEAD
### Community 7 - "audio.ts"
Cohesion: 0.20
Nodes (4): MilestoneTimeline(), MilestoneTimelineProps, cosmicAudio, CosmicAudioEngine

=======
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

<<<<<<< HEAD
### Community 9 - "AdminDashboard.tsx"
Cohesion: 0.10
Nodes (34): MembersTab(), TeamTab(), AdminDashboard(), Tab, AdminLogin(), AdminLoginProps, AdminPage(), CustomerDashboard() (+26 more)

### Community 10 - "showToast"
Cohesion: 0.14
Nodes (19): SettingsTab(), SOCIAL_FIELDS, Footer(), FooterProps, ToastHost(), db, readCachedLinks(), saveSocialLinks() (+11 more)
=======
### Community 9 - "auth.ts"
Cohesion: 0.13
Nodes (24): MembersTab(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), Navbar(), authedFetch() (+16 more)

### Community 10 - "showToast"
<<<<<<< HEAD
Cohesion: 0.14
Nodes (19): SettingsTab(), SOCIAL_FIELDS, Footer(), FooterProps, ToastHost(), db, readCachedLinks(), saveSocialLinks() (+11 more)
=======
Cohesion: 0.16
Nodes (17): SettingsTab(), SOCIAL_FIELDS, Footer(), ToastHost(), readCachedLinks(), saveSocialLinks(), SocialLinks, subscribeToSocialLinks() (+9 more)
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

### Community 11 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, translations

<<<<<<< HEAD
### Community 12 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version
=======
### Community 12 - "PricingTab.tsx"
<<<<<<< HEAD
Cohesion: 0.18
Nodes (14): PricingRow(), PricingTab(), StatTile(), PriceInput(), PriceInputProps, templatesData, toUSD(), applyPricingOverrides() (+6 more)
=======
Cohesion: 0.20
Nodes (13): PricingRow(), PricingTab(), PriceInput(), PriceInputProps, templatesData, toUSD(), applyPricingOverrides(), PricingOverride (+5 more)
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

### Community 13 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 14 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

<<<<<<< HEAD
### Community 16 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 17 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage
=======
### Community 16 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, translations
<<<<<<< HEAD

### Community 17 - "PolicyPage.tsx"
Cohesion: 0.33
Nodes (4): PolicyPageProps, PRIVACY_SECTIONS, Section, TERMS_SECTIONS
=======
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282

### Community 18 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 19 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 20 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 21 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 22 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 23 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **148 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
<<<<<<< HEAD
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
=======
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `motion`, `App.tsx`, `react-dom`, `@tailwindcss/vite`, `package.json`, `vite`, `firebase-admin`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `ContractsTab.tsx` to `dependencies`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `ContractsTab.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _148 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ContractsTab.tsx` be split into smaller, more focused modules?**
<<<<<<< HEAD
  _Cohesion score 0.08688524590163935 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0603921568627451 - nodes in this community are weakly interconnected._
=======
<<<<<<< HEAD
  _Cohesion score 0.11733615221987315 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06871035940803383 - nodes in this community are weakly interconnected._
=======
  _Cohesion score 0.08581349206349206 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
>>>>>>> 7dc09dc088ec8773da65bca163b5853829e5991c
>>>>>>> 02cd2eba30b2facd84290087c8bb6b014b9b5282
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._