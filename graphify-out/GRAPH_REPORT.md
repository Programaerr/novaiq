# Graph Report - novaiq  (2026-08-06)

## Corpus Check
- 71 files · ~101,463 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 476 nodes · 896 edges · 38 communities (26 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a08ed109`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Language
- AdminDashboard.tsx
- scripts
- package.json
- devDependencies
- CustomerDashboard.tsx
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
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `FooterProps` --references--> `Language`  [EXTRACTED]
  src/components/Footer.tsx → src/lib/i18n.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local App Setup Flow** — readme_nodejs, readme_npm_install, readme_gemini_api_key, readme_env_local, readme_npm_run_dev [INFERRED 0.85]
- **Self-hosted Font Preload Optimization Pattern** — index_cairo_font, index_tajawal_font, index_font_preload_optimization, src_index_css_font_face [EXTRACTED 1.00]

## Communities (38 total, 12 thin omitted)

### Community 0 - "Language"
Cohesion: 0.08
Nodes (21): AboutSection(), AboutSectionProps, CookieConsent(), CookieConsentProps, MilestoneTimeline(), MilestoneTimelineProps, PageBackBar(), PageBackBarProps (+13 more)

### Community 1 - "AdminDashboard.tsx"
Cohesion: 0.08
Nodes (41): AdminDashboard(), CompanySignatureHandle, CompanySignaturePad, MembersTab(), SOCIAL_FIELDS, STATUS_FLOW, Tab, TeamTab() (+33 more)

### Community 2 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, clean, dev, lint, start, translations

### Community 3 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 4 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+11 more)

### Community 5 - "CustomerDashboard.tsx"
Cohesion: 0.07
Nodes (56): AdminDashboardProps, ContractRow(), ContractsTab(), OverviewTab(), PricingRow(), statusArabic(), ContractBuilder(), ContractBuilderProps (+48 more)

### Community 6 - "dependencies"
Cohesion: 0.11
Nodes (19): dotenv, express, firebase, @google/genai, html2canvas-pro, jspdf, lucide-react, dependencies (+11 more)

### Community 7 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.09
Nodes (41): PriceInput(), PriceInputProps, ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice, TemplateInteractiveSandbox(), TemplateInteractiveSandboxProps (+33 more)

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
Cohesion: 0.29
Nodes (10): SettingsTab(), Footer(), FooterProps, readCachedLinks(), saveSocialLinks(), SocialLinks, subscribeToSocialLinks(), useSocialLinks() (+2 more)

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
Nodes (39): lenis, lenis, AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid (+31 more)

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

## Knowledge Gaps
- **158 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `vite`, `firebase-admin`, `motion`, `App.tsx`, `react-dom`, `@tailwindcss/vite`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `CustomerDashboard.tsx` to `AdminDashboard.tsx`, `dependencies`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `CustomerDashboard.tsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.08403361344537816 - nodes in this community are weakly interconnected._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._