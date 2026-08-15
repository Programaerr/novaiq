/**
 * Screenshots every template's own live demo and writes it out as that template's cover.
 *
 *   npm run build            # this reads dist/, so build first
 *   node tools/capture-template-covers.mjs
 *
 * ## Why the covers had to change
 *
 * Every `previewImage` in templatesData.ts was a stock photograph from Unsplash — a shopfront for
 * the store template, a stethoscope for the medical one. They are pictures of the CUSTOMER'S
 * INDUSTRY, not of the thing being sold, so the one question a cover has to answer ("what does
 * this template look like?") was the one thing it could not. A visitor picked a template from a
 * photograph and only found out what it was after opening it.
 *
 * The demos already exist and are real, working pages. A picture of the actual demo is therefore
 * free, honest and always current.
 *
 * ## Why a screenshot rather than rendering the demo live in the card
 *
 * Because the grid shows eleven cards at once. Mounting eleven full React demos to shrink each one
 * into a 260px box is eleven page-loads of work for eleven thumbnails — that is precisely the
 * stutter this project keeps fighting, and it would arrive on the one screen where the visitor is
 * dragging a carousel. A screenshot costs a single decoded image, which is what the card already
 * paid for a photograph.
 *
 * ## Why a phone viewport
 *
 * The card is 260x400 (330x480 at sm) — an aspect of 0.65, which is portrait, which is a phone.
 * Capturing at a phone width means the demo's own responsive layout produces the shot, so the
 * thumbnail is a real screen rather than a desktop page squeezed into a tall box.
 *
 * ## How it drives the browser
 *
 * Chrome's DevTools Protocol over a plain WebSocket — Node has had one built in since 22, so this
 * needs no puppeteer, no playwright and nothing in package.json. It serves `dist/` on an unusual
 * port so it can never collide with the dev server, and shuts both down when it is done.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'src/assets/covers');
const PORT = 4317;

/** Phone-shaped, matching the card's 0.65 aspect. Captured at dpr 2 and written at that size, so
 *  the cover is crisp on a retina screen without being a full-resolution page dump. */
const VIEW_W = 430;
/* Taller than the cover, on purpose. The sandbox wraps the demo in chrome of its own — a device
   switcher and a back arrow along the top, a price and a contract button along the bottom — worth
   roughly 190px. That chrome is OUR interface, not the template, and a thumbnail containing it
   advertises the preview page rather than the product. So the shot is taken tall, the demo pane is
   located in the DOM, and everything outside it is clipped away; 662 + 190 leaves the pane itself
   at the cover's own 0.65 aspect. */
const VIEW_H = 852;
const COVER_W = 430;
const COVER_H = 662;
const DPR = 2;
const WEBP_QUALITY = 0.82;

/**
 * Which section of each demo the cover shows.
 *
 * Not the home page. Every demo opens on the same shape of landing screen — a top bar, a hero card
 * with two buttons, a row of stat tiles — because they share a design system, so eleven covers
 * taken from the top produced eleven nearly identical thumbnails. That is worse than the stock
 * photographs it replaced: at least those were different from each other.
 *
 * The section that actually distinguishes a template is the one that shows its GOODS. The watch
 * store's grid of watches is a picture of a watch store in a way its hero is not, and the clinic's
 * roster of doctors is a picture of a clinic. So each cover is that tab.
 *
 * Keyed by the nav ids in src/data/sandboxDemoData.ts (SITE_NAV_ITEMS / STORE_NAV_ITEMS). If a nav
 * id is renamed there, the capture fails loudly for that template rather than quietly falling back
 * to the home screen.
 */
const COVER_SECTION = {
  'NVQ-CORP-01': 'خدماتنا',
  'NVQ-ECOM-02': 'كل المنتجات',
  'NVQ-CARS-03': 'المعرض',
  'NVQ-REAL-04': 'العقارات',
  'NVQ-HEALTH-05': 'الأطباء والتخصصات',
  'NVQ-FINTECH-06': 'البطاقات',
  'NVQ-FOOD-07': 'قائمة الطعام',
  'NVQ-EDU-08': 'الدورات',
  'NVQ-PHONE-09': 'الهواتف',
  'NVQ-WATCH-10': 'الساعات',
  'NVQ-MARKETING-11': 'خدماتنا',
};

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

/** Static server for dist/, with the SPA fallback every client-routed build needs. */
function serveDist() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = join(DIST, path === '/' ? 'index.html' : path);
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        // Anything that is not a real file is a route — hand back the shell.
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(await readFile(join(DIST, 'index.html')));
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

/** One CDP connection, with an id-matched request/response helper over the raw socket. */
async function connectCDP(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });

  let nextId = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
  };

  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    close: () => ws.close(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!CHROME) throw new Error('Chrome not found at either Program Files path.');
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ is missing — run `npm run build` first.');

  // The template ids, read from the catalogue itself so this file never drifts from it.
  const catalogue = await readFile(join(ROOT, 'src/data/templatesData.ts'), 'utf8');
  const ids = [...catalogue.matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]);
  if (!ids.length) throw new Error('No template ids found in templatesData.ts');
  console.log(`${ids.length} templates to capture\n`);

  await mkdir(OUT, { recursive: true });
  const server = await serveDist();

  const profile = join(ROOT, 'node_modules/.cache/cover-capture-profile');
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=9333',
    `--user-data-dir=${profile}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    `--window-size=${VIEW_W},${VIEW_H}`,
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for the debugging endpoint rather than sleeping a guessed amount.
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch('http://127.0.0.1:9333/json/list').then((r) => r.json());
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  if (!target) throw new Error('Chrome never exposed a debugging target.');

  const cdp = await connectCDP(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: VIEW_W, height: VIEW_H, deviceScaleFactor: DPR, mobile: true,
  });

  // The whole site sits behind a sign-in gate; a guest passes it. Injected before any script on
  // the page runs, so the very first render already knows.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "try { sessionStorage.setItem('novaiq_guest', 'true'); } catch {}",
  });

  const written = [];
  for (const id of ids) {
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/?preview=${encodeURIComponent(id)}` });
    // Fonts, the lazy sandbox chunk and its images all have to land before the shot is worth
    // taking. Polling for a settled document beats a fixed sleep on a slow run and is quicker on
    // a fast one.
    for (let i = 0; i < 40; i++) {
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: 'document.readyState === "complete" && document.fonts.status === "loaded" && !!document.querySelector("main, section, [class*=sandbox]")',
        returnByValue: true,
      });
      if (result.value) break;
      await sleep(250);
    }
    await sleep(700);

    // Open the demo's own section menu and choose the tab that shows its goods. The menu is a
    // drawer behind a hamburger, so it is two clicks: the button carries an aria-label, and the
    // drawer's items are ordinary buttons carrying the label text from sandboxDemoData.ts.
    const wanted = COVER_SECTION[id];
    if (!wanted) throw new Error(`${id}: no cover section defined in COVER_SECTION`);
    const { result: navRes } = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const menu = document.querySelector('button[aria-label="فتح قائمة أقسام الموقع"]');
        if (!menu) return 'no menu button';
        menu.click();
        await sleep(450);
        const item = [...document.querySelectorAll('button')]
          .find(b => b.textContent && b.textContent.trim() === ${JSON.stringify(wanted)});
        if (!item) return 'no nav item: ' + ${JSON.stringify(wanted)};
        item.click();
        await sleep(700);
        // The drawer closes itself on selection; belt and braces in case a demo does not.
        const close = document.querySelector('button[aria-label="إغلاق القائمة"]');
        if (close && close.offsetParent) close.click();
        await sleep(250);
        return 'ok';
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (navRes.value !== 'ok') throw new Error(`${id}: ${navRes.value}`);

    await sleep(900); // one beat for entrance animations to settle on their final frame

    // Find the demo's own pane and clip to it. `data-lenis-prevent` marks the scrollable preview
    // area; it appears on a few elements in this app, so the largest one is taken — the demo pane
    // is by far the biggest box on this screen. Its own padding is trimmed off so the thumbnail
    // starts at the template's first pixel rather than at a black margin.
    const { result: rectRes } = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const panes = [...document.querySelectorAll('[data-lenis-prevent]')]
          .map(el => ({ el, r: el.getBoundingClientRect() }))
          .filter(o => o.r.width > 100 && o.r.height > 100)
          .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
        if (!panes.length) return null;
        const inner = panes[0].el.firstElementChild || panes[0].el;
        inner.scrollTop = 0;
        const r = inner.getBoundingClientRect();
        return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
      })()`,
      returnByValue: true,
    });
    if (!rectRes.value) throw new Error(`${id}: could not find the demo pane`);
    const clip = { ...rectRes.value, scale: 1 };

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip });

    // Re-encoded to WebP in the same browser: a PNG of a UI screenshot is several hundred KB and
    // WebP takes it to a fraction of that, and there is a working encoder right here.
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        const img = new Image();
        img.src = 'data:image/png;base64,${data}';
        await img.decode();
        const c = document.createElement('canvas');
        c.width = ${COVER_W * DPR}; c.height = ${COVER_H * DPR};
        const ctx = c.getContext('2d');
        // Cover-fit from the TOP, not centre-cropped. A site's identity is in its header and hero;
        // centring the crop would throw exactly that away and keep the middle of the page.
        const scale = Math.max(c.width / img.width, c.height / img.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width * scale, img.height * scale);
        return c.toDataURL('image/webp', ${WEBP_QUALITY});
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });

    const webp = Buffer.from(String(result.value).split(',')[1], 'base64');
    const file = join(OUT, `${id}.webp`);
    await writeFile(file, webp);
    written.push([id, webp.length]);
    console.log(`  ${id.padEnd(22)} ${(webp.length / 1024).toFixed(0)} KB`);
  }

  cdp.close();
  chrome.kill();
  server.close();

  const total = written.reduce((s, [, n]) => s + n, 0);
  console.log(`\n${written.length} covers → src/assets/covers/  (${(total / 1024).toFixed(0)} KB total)`);
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
