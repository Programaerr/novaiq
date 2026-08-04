import puppeteer from 'puppeteer-core';

const outDir = 'C:\\Users\\medo1\\AppData\\Local\\Temp\\claude\\d-------novaiq\\82eed6dd-9084-41f6-8460-610eab8855b6\\scratchpad';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,1000'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

try {
  const rejectBtn = await page.waitForSelector('xpath///button[contains(., "رفض")]', { timeout: 3000 });
  if (rejectBtn) await rejectBtn.click();
} catch {}

await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: `${outDir}/full-page-v2.png`, fullPage: true });
await browser.close();
