// Pre-translates every Arabic string in the source tree and writes the result to
// src/data/translations.json, which ships with the app.
//
// Without this, the first English visitor pays for translating the entire site over the
// network before they see readable text. With it, English mode resolves instantly from a
// local lookup and the runtime /api/translate endpoint is only ever needed for genuinely
// new content (e.g. a client's own typed notes).
//
// Run after adding Arabic content:  npm run translations
//
// Existing entries are never re-translated, so repeat runs only cost the new strings.
//
// Uses the TypeScript compiler's own parser (not a regex) to walk each file's real AST —
// a regex-based scanner desyncs the moment it meets an escaped quote, a template literal,
// or one string closing right where another opens, silently dropping everything after.

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const SRC_DIR = path.join(process.cwd(), 'src');
const OUT_FILE = path.join(SRC_DIR, 'data', 'translations.json');
const ARABIC = /[؀-ۿ]/;

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function extractStrings(filePath, source) {
  const found = new Set();
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const value = node.text.trim();
      if (value && ARABIC.test(value)) found.add(value);
    } else if (ts.isTemplateExpression(node)) {
      // Interpolated template literal — only the static Arabic head/spans are translatable
      // on their own; the ${...} parts are runtime values, so we skip the whole literal.
    } else if (ts.isJsxText(node)) {
      const value = node.text.trim();
      if (value && ARABIC.test(value)) found.add(value);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

async function translate(text) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data[0] || []).map((segment) => segment[0]).join('').trim();
}

async function main() {
  const existing = fs.existsSync(OUT_FILE) ? JSON.parse(fs.readFileSync(OUT_FILE, 'utf-8')) : {};

  const all = new Set();
  for (const file of walk(SRC_DIR)) {
    for (const s of extractStrings(file, fs.readFileSync(file, 'utf-8'))) all.add(s);
  }

  const missing = [...all].filter((s) => s.length > 1 && !existing[s]);
  console.log(`Found ${all.size} Arabic strings; ${missing.length} need translating.`);

  let done = 0;
  let failed = 0;
  for (const text of missing) {
    try {
      const translated = await translate(text);
      if (translated) existing[text] = translated;
      done++;
      if (done % 25 === 0) {
        console.log(`  ${done}/${missing.length}...`);
        fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2), 'utf-8');
      }
      // Small pause keeps the free endpoint from rate-limiting a few thousand calls.
      await new Promise((r) => setTimeout(r, 60));
    } catch (e) {
      failed++;
      console.warn(`  skipped: ${text.slice(0, 40)}... (${e.message})`);
    }
  }

  // Prune stale entries so removed/renamed content doesn't bloat the shipped dictionary.
  const stillPresent = {};
  for (const key of Object.keys(existing)) {
    if (all.has(key)) stillPresent[key] = existing[key];
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(stillPresent, null, 2), 'utf-8');
  console.log(`Done. ${Object.keys(stillPresent).length} total translations${failed ? `, ${failed} failed` : ''}.`);
}

main();
