## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost). Or just run `npm run graph:watch` once per machine (each collaborator runs their own — it's a local background process, not something a `git pull` can hand you) and it stays current automatically: code changes rebuild immediately with no LLM cost, doc/image changes just flag `graphify-out/needs_update` for a manual `--update` pass.
- `graphify-out/` is gitignored on purpose — it's 100% derived from source, so sharing it via git meant every independent rebuild was a guaranteed future merge conflict (it happened twice). Each collaborator builds their own locally; there is deliberately nothing to pull here.

## ast-grep

Each collaborator installs it once per machine: `npm i -g @ast-grep/cli` (it's a search tool, deliberately not a `package.json` dependency — it isn't needed to build or run the site).

Searches the syntax tree rather than the text, so finding one element inside a large `.tsx` costs a few matched lines instead of the whole file:

```
ast-grep run -p '<button $$$>' -l tsx src/components/TemplateGrid.tsx
```

The `run` subcommand is required — a bare `ast-grep -p ...` silently prints nothing.

This file's components are long and JSX-heavy (`TemplateGrid.tsx`, `TemplateInteractiveSandbox.tsx`, the `sandbox/templates/*` demos), and their `className`s are frequently template literals spanning several lines — exactly the case where a text search returns the wrong line. Reach for this before opening one of them.
