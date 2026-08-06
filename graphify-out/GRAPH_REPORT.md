# Graph Report - novaiq  (2026-08-06)

## Corpus Check
- 91 files · ~113,951 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 510 nodes · 1103 edges · 31 communities (24 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e2c57d9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- Language
- firebase.ts
- TemplateInteractiveSandbox.tsx
- PolicyPage.tsx
- devDependencies
- dependencies
- compilerOptions
- What You Must Do When Invoked
- SettingsTab.tsx
- ContractBuilder.tsx
- ErrorBoundary
- server.ts
- CookieConsent.tsx
- autoTranslate.ts
- build-translations.mjs
- CosmicAudioEngine
- vite-env.d.ts
- pageTranslator.ts
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
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
2. `Currency` - 27 edges
3. `SandboxCtx` - 26 edges
4. `formatPrice()` - 22 edges
5. `translateText()` - 17 edges
6. `ContractData` - 17 edges
7. `cosmicAudio` - 16 edges
8. `useLiveTemplates()` - 15 edges
9. `showToast()` - 15 edges
10. `Template` - 15 edges

## Surprising Connections (you probably didn't know these)
- `useSmoothScroll()` --references--> `lenis`  [EXTRACTED]
  src/lib/useScrollBehavior.ts → package.json
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Communities (31 total, 7 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.07
Nodes (37): AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection() (+29 more)

### Community 1 - "Language"
Cohesion: 0.09
Nodes (54): jspdf, jspdf, CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), PricingRow() (+46 more)

### Community 2 - "firebase.ts"
Cohesion: 0.10
Nodes (33): MembersTab(), TeamTab(), AdminDashboard(), AdminLogin(), AdminLoginProps, AdminPage(), ContractBuilderGate(), CustomerDashboard() (+25 more)

### Community 3 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.07
Nodes (57): PriceInput(), PriceInputProps, SandboxCtx, SandboxTheme, ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice (+49 more)

### Community 4 - "PolicyPage.tsx"
Cohesion: 0.33
Nodes (4): PolicyPageProps, PRIVACY_SECTIONS, Section, TERMS_SECTIONS

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (32): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+24 more)

### Community 6 - "dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, lenis, lucide-react (+19 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 8 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 9 - "SettingsTab.tsx"
Cohesion: 0.16
Nodes (15): SettingsTab(), SOCIAL_FIELDS, Footer(), FooterProps, Navbar(), NovaiqLogo(), NovaiqLogoProps, db (+7 more)

### Community 10 - "ContractBuilder.tsx"
Cohesion: 0.16
Nodes (16): ContractBuilder(), PRESET_COLORS, ToastHost(), clearContractDraft(), ContractDraft, loadContractDraft(), saveContractDraft(), getTranslation() (+8 more)

### Community 11 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 12 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 13 - "CookieConsent.tsx"
Cohesion: 0.43
Nodes (6): CookieConsent(), CookieConsentProps, ConsentStatus, getConsentStatus(), isTrackingAllowed(), setConsentStatus()

### Community 14 - "autoTranslate.ts"
Cohesion: 0.27
Nodes (11): bundled, flushBatch(), isFullyResolved(), memoryCache, pendingBatch, PendingEntry, requestTranslation(), resolveStatic() (+3 more)

### Community 15 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

### Community 17 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

### Community 19 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 20 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 21 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 22 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 23 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 24 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **150 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `Language`, `devDependencies`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Why does `jspdf` connect `Language` to `dependencies`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06717687074829932 - nodes in this community are weakly interconnected._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.094824016563147 - nodes in this community are weakly interconnected._
- **Should `firebase.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10365853658536585 - nodes in this community are weakly interconnected._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06518987341772152 - nodes in this community are weakly interconnected._