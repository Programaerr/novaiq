// Whole-page auto-translation.
//
// The static dictionary in i18n.ts only covers strings someone remembered to add to it, and
// the per-component hooks only cover components someone remembered to wire up. Both mean a
// new section added later silently stays Arabic in English mode.
//
// This works at the DOM level instead: it walks the rendered page, finds Arabic text nodes,
// translates them in batches, and swaps them in place — then keeps watching via a
// MutationObserver so anything React renders afterwards (a newly opened modal, a lazily
// loaded page, a template demo) is picked up automatically with no per-component work.
//
// Originals are kept so switching back to Arabic restores them exactly. Nothing here runs
// at all while the site is in Arabic, which is the default.

import bundledTranslations from '../data/translations.json';

const ARABIC = /[؀-ۿ]/;

// Elements whose text must never be touched: code/identifiers, and anything explicitly
// opted out with data-no-translate (brand names, contract reference numbers, etc.).
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'SVG', 'CANVAS']);

const originals = new Map<Text, string>();

// القاموس المبنيّ مسبقاً (npm run translations)، وهو المصدر الوحيد الآن.
//
// كان أي نص غير موجود فيه يذهب إلى /api/translate وقت التصفّح. أُلغي ذلك بالكامل: المسار لا
// وجود له أصلاً على الاستضافة (Netlify ملفات ثابتة، لا Express)، وكان يعني نداء شبكة لكل نص
// جديد يراه أي زائر إنجليزي — كلفة مستمرة مقابل ترجمة آلية أسوأ من ترجمة مكتوبة بيد. النص
// غير الموجود في القاموس يبقى عربياً كما هو، وإضافته إلى القاموس هي الحل الصحيح.
const translations = new Map<string, string>(Object.entries(bundledTranslations as Record<string, string>));

let observer: MutationObserver | null = null;
let active = false;
let applying = false;
let pendingScan: number | null = null;

function shouldSkip(node: Text): boolean {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute('data-no-translate')) return true;
    el = el.parentElement;
  }
  return false;
}

function collectArabicTextNodes(root: Node): Text[] {
  const found: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const value = textNode.nodeValue || '';
    if (value.trim() && ARABIC.test(value) && !shouldSkip(textNode)) {
      found.push(textNode);
    }
    current = walker.nextNode();
  }
  return found;
}

function applyText(node: Text, value: string) {
  applying = true;
  node.nodeValue = value;
  // Released on the next microtask so the observer callback for this very change is
  // ignored — without this the observer would react to our own writes forever.
  queueMicrotask(() => {
    applying = false;
  });
}

function translateNodes(nodes: Text[]) {
  if (nodes.length === 0) return;
  if (!active) return;

  for (const node of nodes) {
    if (!originals.has(node)) originals.set(node, node.nodeValue || '');
  }

  for (const node of nodes) {
    const original = originals.get(node) ?? node.nodeValue ?? '';
    const translated = translations.get(original.trim());
    if (!translated) continue;
    // Preserve the original leading/trailing whitespace so inline layout doesn't shift.
    const leading = original.match(/^\s*/)?.[0] ?? '';
    const trailing = original.match(/\s*$/)?.[0] ?? '';
    applyText(node, `${leading}${translated}${trailing}`);
  }
}

function scheduleScan(root: Node = document.body) {
  if (pendingScan !== null) return;
  pendingScan = window.setTimeout(() => {
    pendingScan = null;
    if (!active) return;
    translateNodes(collectArabicTextNodes(root));
  }, 60);
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    if (applying || !active) return;
    for (const m of mutations) {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        scheduleScan();
        return;
      }
      if (m.type === 'characterData') {
        scheduleScan();
        return;
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function restoreOriginals() {
  applying = true;
  for (const [node, original] of originals) {
    if (node.isConnected) node.nodeValue = original;
  }
  originals.clear();
  queueMicrotask(() => {
    applying = false;
  });
}

/**
 * Switches whole-page translation on or off. Call with 'en' to translate the page (and keep
 * translating anything rendered afterwards), or 'ar' to restore the original text.
 */
export function setPageTranslation(lang: 'ar' | 'en') {
  if (lang === 'en') {
    if (active) return;
    active = true;
    startObserver();
    scheduleScan();
  } else {
    if (!active) return;
    active = false;
    if (pendingScan !== null) {
      clearTimeout(pendingScan);
      pendingScan = null;
    }
    observer?.disconnect();
    observer = null;
    restoreOriginals();
  }
}
