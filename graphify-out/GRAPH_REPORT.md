# Graph Report - novaiq  (2026-08-06)

## Corpus Check
- 92 files · ~105,752 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 514 nodes · 1137 edges · 29 communities (22 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8af77205`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TemplateInteractiveSandbox.tsx
- ContractsTab.tsx
- Language
- toast.ts
- devDependencies
- dependencies
- compilerOptions
- App.tsx
- ErrorBoundary
- auth.ts
- What You Must Do When Invoked
- server.ts
- graphify reference: extra exports and benchmark
- PricingTab.tsx
- CookieConsent.tsx
- build-translations.mjs
- CosmicAudioEngine
- graphify reference: query, path, explain
- vite-env.d.ts
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Run and deploy your AI Studio app
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md

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
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Communities (29 total, 7 thin omitted)

### Community 0 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.07
Nodes (65): SandboxCtx, SandboxTheme, themeClassesFor(), ResponsivePreview(), SiteMenuIcon(), SiteTopBar(), VIEWPORT_PRESETS, ViewportChoice (+57 more)

### Community 1 - "ContractsTab.tsx"
Cohesion: 0.08
Nodes (54): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), AdminStats, BarRow(), StatTile() (+46 more)

### Community 2 - "Language"
Cohesion: 0.10
Nodes (33): AdminDashboardProps, AdminPageProps, ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGateProps, ContractPDFPreviewProps, CustomerDashboardProps (+25 more)

### Community 3 - "toast.ts"
Cohesion: 0.15
Nodes (18): SettingsTab(), SOCIAL_FIELDS, Footer(), FooterProps, ToastHost(), db, readCachedLinks(), saveSocialLinks() (+10 more)

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
Cohesion: 0.06
Nodes (42): AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection() (+34 more)

### Community 8 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 9 - "auth.ts"
Cohesion: 0.15
Nodes (22): MembersTab(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), authedFetch(), deleteUserAccount() (+14 more)

### Community 10 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 11 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 12 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 13 - "PricingTab.tsx"
Cohesion: 0.20
Nodes (13): PricingRow(), PricingTab(), PriceInput(), PriceInputProps, templatesData, toUSD(), applyPricingOverrides(), PricingOverride (+5 more)

### Community 14 - "CookieConsent.tsx"
Cohesion: 0.43
Nodes (6): CookieConsent(), CookieConsentProps, ConsentStatus, getConsentStatus(), isTrackingAllowed(), setConsentStatus()

### Community 15 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 17 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 18 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

### Community 20 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 21 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 22 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **149 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `ContractsTab.tsx` to `dependencies`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `ContractsTab.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0728395061728395 - nodes in this community are weakly interconnected._
- **Should `ContractsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08252853380158033 - nodes in this community are weakly interconnected._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.09696969696969697 - nodes in this community are weakly interconnected._