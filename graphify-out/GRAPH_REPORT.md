# Graph Report - novaiq  (2026-08-06)

## Corpus Check
- 78 files · ~106,666 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 500 nodes · 1026 edges · 39 communities (27 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb455eea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Language
- AdminDashboard.tsx
- scripts
- package.json
- devDependencies
- ContractsTab.tsx
- dependencies
- TemplateInteractiveSandbox.tsx
- compilerOptions
- Error Boundary & App Entry
- pageTranslator.ts
- vite
- server.ts
- NOVAIQ App Entry (index.html)
- socialLinks.ts
- firebase-admin
- motion
- build-translations.mjs
- .env.local File
- vite-env.d.ts
- src/main.tsx Entry Script
- NOVAIQ brand logo mark: an outlined/wireframe-style icon of two bracket-like pillar letterforms (resembling stylized 'H' or twin brackets) crossed by a tilted Saturn-like ring/ellipse, with the wordmark 'NOVAIQ' in a thin outlined sans-serif font beneath; rendered on a transparent/white background with a sketchy dashed-line stroke texture, suggesting a brand identity asset for the 'novaiq' project/site
- NOVAIQ logo (cropped) - brand wordmark and icon featuring two stylized capital 'N' letterforms encircled by a tilted ring/orbit (Saturn-like) motif, with 'NOVAIQ' wordmark beneath; used as the site's brand logo
- What You Must Do When Invoked
- App.tsx
- react-dom
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- @tailwindcss/vite
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md
- autoTranslate.ts

## God Nodes (most connected - your core abstractions)
1. `Language` - 42 edges
2. `formatPrice()` - 25 edges
3. `Currency` - 23 edges
4. `translateText()` - 23 edges
5. `showToast()` - 20 edges
6. `useLiveTemplates()` - 17 edges
7. `ContractData` - 17 edges
8. `compilerOptions` - 15 edges
9. `Template` - 13 edges
10. `What You Must Do When Invoked` - 12 edges

## Surprising Connections (you probably didn't know these)
- `AI Studio App (NOVAIQ)` --conceptually_related_to--> `NOVAIQ App Entry (index.html)`  [INFERRED]
  README.md → index.html
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `App()` --references--> `lenis`  [EXTRACTED]
  src/App.tsx → package.json
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts
- `FooterProps` --references--> `Language`  [EXTRACTED]
  src/components/Footer.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local App Setup Flow** — readme_nodejs, readme_npm_install, readme_gemini_api_key, readme_env_local, readme_npm_run_dev [INFERRED 0.85]
- **Self-hosted Font Preload Optimization Pattern** — index_cairo_font, index_tajawal_font, index_font_preload_optimization, src_index_css_font_face [EXTRACTED 1.00]

## Communities (39 total, 12 thin omitted)

### Community 0 - "Language"
Cohesion: 0.08
Nodes (41): NovaIQ icon/logo mark: a stylized double-H (or interlocking bracket) letterform encircled by a tilted elliptical ring, evoking a planet's orbital ring; used as the brand icon/favicon for the NovaIQ site, AboutSection(), AboutSectionProps, AdminDashboardProps, AdminLogin(), AdminLoginProps, AdminPageProps, ContractBuilder() (+33 more)

### Community 1 - "AdminDashboard.tsx"
Cohesion: 0.07
Nodes (46): MembersTab(), TeamTab(), AdminDashboard(), CompanySignatureHandle, CompanySignaturePad, MembersTab(), PricingTab(), SOCIAL_FIELDS (+38 more)

### Community 2 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, translations

### Community 3 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+11 more)

### Community 5 - "ContractsTab.tsx"
Cohesion: 0.12
Nodes (38): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), PricingRow(), PricingTab(), AdminStats (+30 more)

### Community 6 - "dependencies"
Cohesion: 0.11
Nodes (19): dotenv, express, firebase, @google/genai, html2canvas-pro, jspdf, lucide-react, dependencies (+11 more)

### Community 7 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.10
Nodes (38): ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice, TemplateInteractiveSandbox(), AccountRecord, Appointment, CartItem (+30 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "Error Boundary & App Entry"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 10 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 11 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 12 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 13 - "NOVAIQ App Entry (index.html)"
Cohesion: 0.28
Nodes (9): Cairo Variable Font (self-hosted), Dark Theme (html class=dark), Font Preload + font-display Optimization, NOVAIQ App Entry (index.html), NOVAIQ Favicon Icon, RTL Arabic Layout (lang=ar dir=rtl), Tajawal Font (self-hosted), AI Studio App (NOVAIQ) (+1 more)

### Community 14 - "socialLinks.ts"
Cohesion: 0.12
Nodes (17): SettingsTab(), SOCIAL_FIELDS, SettingsTab(), Footer(), FooterProps, MilestoneTimeline(), MilestoneTimelineProps, cosmicAudio (+9 more)

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

### Community 25 - "App.tsx"
Cohesion: 0.07
Nodes (33): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+25 more)

### Community 27 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 28 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 30 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 31 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 32 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 38 - "autoTranslate.ts"
Cohesion: 0.27
Nodes (11): bundled, flushBatch(), isFullyResolved(), memoryCache, pendingBatch, PendingEntry, requestTranslation(), resolveStatic() (+3 more)

## Knowledge Gaps
- **161 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `vite`, `firebase-admin`, `motion`, `App.tsx`, `react-dom`, `@tailwindcss/vite`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `ContractsTab.tsx` to `AdminDashboard.tsx`, `dependencies`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `ContractsTab.tsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _161 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.07985480943738657 - nodes in this community are weakly interconnected._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06954997077732321 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._