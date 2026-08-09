import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const results = [];

async function newPage(theme, viewport) {
  const ctx = await browser.newContext({ viewport, isMobile: !!viewport.mobile, hasTouch: !!viewport.mobile });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(700);
  return { ctx, page };
}

async function shot(page, name) {
  const file = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push(file);
}

const views = ['overview', 'experiments', 'risks', 'knowledge', 'agents', 'integrations', 'settings'];
const viewLabel = { overview: 'overview', experiments: 'experiments', risks: 'risks', knowledge: 'knowledge', agents: 'agents', integrations: 'integrations', settings: 'settings' };

try {
  // Desktop light, all pages
  for (const v of views) {
    const { ctx, page } = await newPage('light', { width: 1440, height: 900 });
    await page.locator(`[data-view="${v}"]`).first().click({ force: true }).catch(() => {});
    await sleep(700);
    await shot(page, `r1-light-${viewLabel[v]}`);
    await ctx.close();
  }

  // Desktop dark: overview + knowledge (knowledge is analytical dark surface) + settings
  for (const v of ['overview', 'knowledge', 'settings']) {
    const { ctx, page } = await newPage('dark', { width: 1440, height: 900 });
    await page.locator(`[data-view="${v}"]`).first().click({ force: true }).catch(() => {});
    await sleep(700);
    await shot(page, `r1-dark-${viewLabel[v]}`);
    await ctx.close();
  }

  // Mobile 390 overview (dark) + experiments
  for (const v of ['overview', 'experiments']) {
    const { ctx, page } = await newPage('dark', { width: 390, height: 844, mobile: true });
    await page.locator(`[data-view="${v}"]`).first().click({ force: true }).catch(() => {});
    await sleep(700);
    await shot(page, `r1-mobile-${viewLabel[v]}`);
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