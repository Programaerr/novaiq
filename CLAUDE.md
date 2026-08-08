## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

**Search here FIRST — before Grep, before Explore, and always before opening a file.**
`graphify-out/` exists precisely so the codebase does not have to be re-read to be understood.
Going straight to reading files is the single most expensive habit in this repo and the graph
is the standing alternative: it answers with `file + line + community` for a fraction of the
tokens. Only fall through to Grep when the target is a known literal string (a CSS class, a
label), and to Read only with an `offset` a graph or grep result already handed you.

The graph is **code-only by design** (`.graphifyignore` excludes `.agents/` and `.claude/`).
Keep it that way: when agent skill docs were indexed they were 46% of the graph — and indexed
twice, via the `.agents/skills` ↔ `.claude/skills` symlink — so a query for a CSS effect
returned fifty nodes of react-three-fiber lighting documentation and nothing from `src/`.
A polluted graph costs more tokens than no graph at all. Rebuild code-only:
`graphify . --code-only --no-viz` then `graphify cluster-only .`
(`graphify update .` alone will NOT purge nodes after an ignore-rule change — it fails closed
and keeps them, and `--force` does not override that.)

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost). Or just run `npm run graph:watch` once per machine (each collaborator runs their own — it's a local background process, not something a `git pull` can hand you) and it stays current automatically: code changes rebuild immediately with no LLM cost, doc/image changes just flag `graphify-out/needs_update` for a manual `--update` pass.
- `graphify-out/` is gitignored on purpose — it's 100% derived from source, so sharing it via git meant every independent rebuild was a guaranteed future merge conflict (it happened twice). Each collaborator builds their own locally; there is deliberately nothing to pull here.

## ast-grep

Usage and syntax live in the global `~/.claude/CLAUDE.md` search ladder — not repeated here.
Install once per machine: `npm i -g @ast-grep/cli` (a search tool, deliberately not a
`package.json` dependency — it isn't needed to build or run the site).

Worth reaching for here specifically: the long JSX-heavy components (`TemplateGrid.tsx`,
`TemplateInteractiveSandbox.tsx`, `HeroSection.tsx`, `sandbox/templates/*`) whose `className`s
are template literals spanning several lines — the exact case where a text search returns the
wrong line and tempts a full-file read.

## Verification cost in this repo

`vite build` here takes 30–90s and the useful signal is the chunk table, so run it only for
dependency/config/chunking changes (see the global verification table). Two project specifics:

- **CSS-only edits need no check at all.** `src/index.css` is not read by `tsc`, and Tailwind
  classes are scanned at build time — a gradient, colour, or radius value cannot fail either.
- **Heavy optional deps need both halves.** A new large dependency needs a `manualChunks`
  bucket in `vite.config.ts` *and* an entry in the `modulePreload.resolveDependencies`
  exclusion list; miss the second and it still downloads eagerly. `vendor-three` and
  `vendor-pdf` are the worked examples. Only the printed chunk sizes reveal this — exit 0 will
  not.
