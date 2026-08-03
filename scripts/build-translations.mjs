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

import fs from 'fs';
import path from 'path';

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

// Pulls Arabic text out of both quoted string literals and bare JSX text content.
function extractStrings(source) {
  const found = new Set();

  const stringLiteral = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
  let match;
  while ((match = stringLiteral.exec(source)) !== null) {
    const value = match[2];
    if (ARABIC.test(value) && !value.includes('${')) {
      found.add(value.replace(/\\'/g, "'").replace(/\\"/g, '"').trim());
    }
  }

  const jsxText = />([^<>{}]*[؀-ۿ][^<>{}]*)</g;
  while ((match = jsxText.exec(source)) !== null) {
    const value = match[1].trim();
    if (value && ARABIC.test(value)) found.add(value);
  }

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
    for (const s of extractStrings(fs.readFileSync(file, 'utf-8'))) all.add(s);
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

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2), 'utf-8');
  console.log(`Done. ${Object.keys(existing).length} total translations${failed ? `, ${failed} failed` : ''}.`);
}

main();
