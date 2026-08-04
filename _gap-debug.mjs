import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=390,900'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

try {
  const rejectBtn = await page.waitForSelector('xpath///button[contains(., "رفض")]', { timeout: 3000 });
  if (rejectBtn) await rejectBtn.click();
} catch {}

await new Promise((r) => setTimeout(r, 500));

const info = await page.evaluate(() => {
  const about = document.querySelector('#about-section');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, height: r.height };
  };
  return {
    about: rectOf(about),
    main: rectOf(main),
    footer: rectOf(footer),
    bodyScrollHeight: document.body.scrollHeight,
    mainComputedHeight: main ? getComputedStyle(main).height : null,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
