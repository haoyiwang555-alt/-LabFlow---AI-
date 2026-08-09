import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const results = [];

async function shot(page, name) {
  const file = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push(file);
}

try {
  // 1. Desktop dark overview
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    await shot(page, 'desktop-dark-overview');
    await ctx.close();
  }

  // 2. Desktop light overview
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    await shot(page, 'desktop-light-overview');
    await ctx.close();
  }

  // 3. Mobile 390 overview
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    await shot(page, 'desktop-mobile-overview');
    await ctx.close();
  }

  // 4. Integrations real status (desktop light)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    await page.locator('[data-view="integrations"]').first().click({ force: true }).catch(() => {});
    await sleep(700);
    await shot(page, 'integrations-real-status');
    await ctx.close();
  }

  // 5. Knowledge lake pending approval (desktop dark)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    await page.locator('[data-view="knowledge"]').first().click({ force: true }).catch(() => {});
    await sleep(900);
    await shot(page, 'knowledge-pending-approval');
    await ctx.close();
  }

  // 6. Meeting evidence detail modal (desktop)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(600);
    // Open experiment detail then its evidence entry
    await page.locator('[data-view="experiments"]').first().click({ force: true }).catch(() => {});
    await sleep(500);
    await page.locator('.exp-card[data-id="exp-b17"]').first().click({ force: true }).catch(() => {});
    await sleep(600);
    await page.locator('.evidence-entry').first().click({ force: true }).catch(() => {});
    await sleep(700);
    await shot(page, 'meeting-evidence-detail');
    await ctx.close();
  }
} catch (error) {
  console.error('capture failed:', error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}

console.log('SCREENSHOTS:');
results.forEach(f => console.log(f));