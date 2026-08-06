# Graph Report - novaiq  (2026-08-06)

## Corpus Check
- 81 files · ~102,044 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 477 nodes · 977 edges · 35 communities (24 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7dc09dc0`
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
- CosmicAudioEngine
- compilerOptions
- auth.ts
- showToast
- scripts
- package.json
- pageTranslator.ts
- server.ts
- graphify reference: extra exports and benchmark
- vite
- ErrorBoundary
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
- `useSmoothScroll()` --references--> `lenis`  [EXTRACTED]
  src/lib/useScrollBehavior.ts → package.json
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Communities (35 total, 11 thin omitted)

### Community 0 - "ContractsTab.tsx"
Cohesion: 0.09
Nodes (48): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), AdminStats, BarRow(), StatTile() (+40 more)

### Community 1 - "App.tsx"
Cohesion: 0.06
Nodes (39): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+31 more)

### Community 2 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.09
Nodes (40): PriceInput(), PriceInputProps, ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice, TemplateInteractiveSandbox(), AccountRecord (+32 more)

### Community 3 - "Language"
Cohesion: 0.08
Nodes (47): PricingRow(), PricingTab(), AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps (+39 more)

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+11 more)

### Community 5 - "dependencies"
Cohesion: 0.11
Nodes (19): dotenv, express, firebase, @google/genai, html2canvas-pro, jspdf, lucide-react, dependencies (+11 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "auth.ts"
Cohesion: 0.13
Nodes (24): MembersTab(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), Navbar(), authedFetch() (+16 more)

### Community 10 - "showToast"
Cohesion: 0.14
Nodes (19): SettingsTab(), SOCIAL_FIELDS, Footer(), FooterProps, ToastHost(), db, readCachedLinks(), saveSocialLinks() (+11 more)

### Community 11 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, translations

### Community 12 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 13 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 14 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 16 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 17 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

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
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
  _Cohesion score 0.08688524590163935 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0603921568627451 - nodes in this community are weakly interconnected._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._