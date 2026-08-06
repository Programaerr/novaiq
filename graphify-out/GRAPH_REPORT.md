# Graph Report - novaiq  (2026-08-06)

## Corpus Check
<<<<<<< HEAD
- 80 files · ~101,937 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 492 nodes · 989 edges · 33 communities (24 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a218e249`
=======
- 80 files · ~101,936 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 476 nodes · 975 edges · 28 communities (22 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21ed3141`
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
<<<<<<< HEAD
- Language
- autoTranslate.ts
- ContractsTab.tsx
- TemplateInteractiveSandbox.tsx
- devDependencies
- dependencies
- App.tsx
- ContractBuilder.tsx
- compilerOptions
- SettingsTab.tsx
- ErrorBoundary
- server.ts
- NOVAIQ App Entry (index.html)
- What You Must Do When Invoked
- pageTranslator.ts
- build-translations.mjs
- CosmicAudioEngine
- .env.local File
- vite-env.d.ts
- src/main.tsx Entry Script
- NOVAIQ brand logo mark: an outlined/wireframe-style icon of two bracket-like pillar letterforms (resembling stylized 'H' or twin brackets) crossed by a tilted Saturn-like ring/ellipse, with the wordmark 'NOVAIQ' in a thin outlined sans-serif font beneath; rendered on a transparent/white background with a sketchy dashed-line stroke texture, suggesting a brand identity asset for the 'novaiq' project/site
- NOVAIQ logo (cropped) - brand wordmark and icon featuring two stylized capital 'N' letterforms encircled by a tilted ring/orbit (Saturn-like) motif, with 'NOVAIQ' wordmark beneath; used as the site's brand logo
- graphify reference: extra exports and benchmark
=======
- ContractsTab.tsx
- App.tsx
- ContractBuilder.tsx
- TemplateInteractiveSandbox.tsx
- devDependencies
- PricingTab.tsx
- auth.ts
- dependencies
- What You Must Do When Invoked
- compilerOptions
- showToast
- ErrorBoundary
- pageTranslator.ts
- server.ts
- graphify reference: extra exports and benchmark
- build-translations.mjs
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
<<<<<<< HEAD
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
=======
- vite-env.d.ts
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Run and deploy your AI Studio app
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md

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
<<<<<<< HEAD
- `AI Studio App (NOVAIQ)` --conceptually_related_to--> `NOVAIQ App Entry (index.html)`  [INFERRED]
  README.md → index.html
=======
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641
- `generateContractPDF()` --references--> `jspdf`  [EXTRACTED]
  src/lib/pdfGenerator.ts → package.json
- `useSmoothScroll()` --references--> `lenis`  [EXTRACTED]
  src/lib/useScrollBehavior.ts → package.json
<<<<<<< HEAD
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `CookieConsentProps` --references--> `Language`  [EXTRACTED]
  src/components/CookieConsent.tsx → src/lib/i18n.ts
=======
- `AdminLoginProps` --references--> `Language`  [EXTRACTED]
  src/components/AdminLogin.tsx → src/lib/i18n.ts
- `AboutSectionProps` --references--> `Language`  [EXTRACTED]
  src/components/AboutSection.tsx → src/lib/i18n.ts
- `AdminDashboardProps` --references--> `Currency`  [EXTRACTED]
  src/components/AdminDashboard.tsx → src/lib/currency.ts
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641

## Import Cycles
- None detected.

<<<<<<< HEAD
## Hyperedges (group relationships)
- **Local App Setup Flow** — readme_nodejs, readme_npm_install, readme_gemini_api_key, readme_env_local, readme_npm_run_dev [INFERRED 0.85]
- **Self-hosted Font Preload Optimization Pattern** — index_cairo_font, index_tajawal_font, index_font_preload_optimization, src_index_css_font_face [EXTRACTED 1.00]

## Communities (33 total, 9 thin omitted)

### Community 0 - "Language"
Cohesion: 0.06
Nodes (51): NovaIQ icon/logo mark: a stylized double-H (or interlocking bracket) letterform encircled by a tilted elliptical ring, evoking a planet's orbital ring; used as the brand icon/favicon for the NovaIQ site, AdminDashboard(), AdminDashboardProps, AdminLogin(), AdminLoginProps, AdminPage(), AdminPageProps, ContractBuilderProps (+43 more)

### Community 1 - "autoTranslate.ts"
Cohesion: 0.27
Nodes (11): bundled, flushBatch(), isFullyResolved(), memoryCache, pendingBatch, PendingEntry, requestTranslation(), resolveStatic() (+3 more)

### Community 2 - "ContractsTab.tsx"
Cohesion: 0.11
Nodes (34): CompanySignatureHandle, CompanySignaturePad, ContractsTab(), MembersTab(), OverviewTab(), AdminStats, BarRow(), StatTile() (+26 more)

### Community 3 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.09
Nodes (41): PriceInput(), PriceInputProps, ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice, TemplateInteractiveSandbox(), TemplateInteractiveSandboxProps (+33 more)
=======
## Communities (28 total, 6 thin omitted)

### Community 0 - "ContractsTab.tsx"
Cohesion: 0.08
Nodes (53): CompanySignatureHandle, CompanySignaturePad, ContractRow(), ContractsTab(), OverviewTab(), AdminStats, BarRow(), StatTile() (+45 more)

### Community 1 - "App.tsx"
Cohesion: 0.08
Nodes (33): AdminPage, ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection(), AboutSectionProps (+25 more)

### Community 2 - "ContractBuilder.tsx"
Cohesion: 0.09
Nodes (28): ContractBuilder(), ContractBuilderProps, PRESET_COLORS, ContractBuilderGate(), ContractBuilderGateProps, NavbarProps, NovaiqLogo(), NovaiqLogoProps (+20 more)

### Community 3 - "TemplateInteractiveSandbox.tsx"
Cohesion: 0.10
Nodes (39): ResponsivePreview(), SiteMenuIcon(), VIEWPORT_PRESETS, ViewportChoice, TemplateInteractiveSandbox(), TemplateInteractiveSandboxProps, AccountRecord, Appointment (+31 more)
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (32): autoprefixer, esbuild, devDependencies, autoprefixer, esbuild, tailwindcss, tsx, @types/express (+24 more)

<<<<<<< HEAD
### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (29): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lenis (+21 more)

### Community 6 - "App.tsx"
Cohesion: 0.06
Nodes (38): AdminPage, App(), ContractBuilderGate, ContractPDFPreview, PolicyPage, TemplateGrid, TemplateInteractiveSandbox, AboutSection() (+30 more)

### Community 7 - "ContractBuilder.tsx"
Cohesion: 0.13
Nodes (29): ContractRow(), PricingRow(), PricingTab(), ContractBuilder(), PRESET_COLORS, ContractPDFPreview(), CustomerContractRow(), TemplateGrid() (+21 more)

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 9 - "SettingsTab.tsx"
Cohesion: 0.25
Nodes (12): SettingsTab(), SOCIAL_FIELDS, Footer(), FooterProps, db, readCachedLinks(), saveSocialLinks(), SocialLinks (+4 more)

### Community 10 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 11 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 12 - "NOVAIQ App Entry (index.html)"
Cohesion: 0.28
Nodes (9): Cairo Variable Font (self-hosted), Dark Theme (html class=dark), Font Preload + font-display Optimization, NOVAIQ App Entry (index.html), NOVAIQ Favicon Icon, RTL Arabic Layout (lang=ar dir=rtl), Tajawal Font (self-hosted), AI Studio App (NOVAIQ) (+1 more)

### Community 13 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 14 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

=======
### Community 5 - "PricingTab.tsx"
Cohesion: 0.10
Nodes (26): lenis, lenis, App(), PricingRow(), PricingTab(), PriceInput(), PriceInputProps, readStoredLanguage() (+18 more)

### Community 6 - "auth.ts"
Cohesion: 0.13
Nodes (24): MembersTab(), TeamTab(), AdminLogin(), AdminLoginProps, AdminPage(), AdminPageProps, Navbar(), authedFetch() (+16 more)

### Community 7 - "dependencies"
Cohesion: 0.07
Nodes (27): dotenv, express, firebase, firebase-admin, @google/genai, html2canvas-pro, jspdf, lucide-react (+19 more)

### Community 8 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules (+10 more)

### Community 10 - "showToast"
Cohesion: 0.18
Nodes (15): SettingsTab(), SOCIAL_FIELDS, ToastHost(), readCachedLinks(), saveSocialLinks(), SocialLinks, subscribeToSocialLinks(), useSocialLinks() (+7 more)

### Community 11 - "ErrorBoundary"
Cohesion: 0.17
Nodes (5): ErrorBoundary, Props, State, isLiveTemplateView, TemplateLivePage

### Community 12 - "pageTranslator.ts"
Cohesion: 0.28
Nodes (12): applyText(), collectArabicTextNodes(), fetchTranslations(), originals, restoreOriginals(), scheduleScan(), setPageTranslation(), shouldSkip() (+4 more)

### Community 13 - "server.ts"
Cohesion: 0.24
Nodes (7): app, getLocalNetworkIP(), persistTranslationCache(), startServer(), translateOne(), TRANSLATION_CACHE_FILE, translationCache

### Community 14 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641
### Community 15 - "build-translations.mjs"
Cohesion: 0.43
Nodes (6): extractStrings(), main(), OUT_FILE, SRC_DIR, translate(), walk()

<<<<<<< HEAD
### Community 17 - ".env.local File"
Cohesion: 0.40
Nodes (5): .env.local File, GEMINI_API_KEY Environment Variable, Node.js Prerequisite, npm install Command, npm run dev Command

### Community 18 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

### Community 23 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 24 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 25 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 26 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 27 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **159 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
=======
### Community 16 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 17 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 18 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 19 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 20 - "vite-env.d.ts"
Cohesion: 0.50
Nodes (3): *.jpg, *.png, *.svg

## Knowledge Gaps
- **149 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

<<<<<<< HEAD
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `ContractBuilder.tsx` to `Language`, `ContractsTab.tsx`, `dependencies`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `ContractBuilder.tsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Language` be split into smaller, more focused modules?**
  _Cohesion score 0.0635814889336016 - nodes in this community are weakly interconnected._
- **Should `ContractsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10782241014799154 - nodes in this community are weakly interconnected._
- **Should `TemplateInteractiveSandbox.tsx` be split into smaller, more focused modules?**
=======
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `PricingTab.tsx`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `generateContractPDF()` connect `ContractsTab.tsx` to `dependencies`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `jspdf` connect `dependencies` to `ContractsTab.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ContractsTab.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08158508158508158 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._
- **Should `ContractBuilder.tsx` be split into smaller, more focused modules?**
>>>>>>> 3982e75cf54fbf85e43dcea1acc3c005b9fc1641
  _Cohesion score 0.08686868686868687 - nodes in this community are weakly interconnected._