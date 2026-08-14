import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const results = [];
async function pageWith(theme) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1100);
  return { ctx, page };
}
try {
  // 1. analyzer modal (light)
  {
    const { ctx, page } = await pageWith('light');
    await page.locator('[data-view="agents"]').first().click({ force: true });
    await sleep(800);
    await page.locator('section[data-page="agents"] [data-action="open-analyzer"]').first().click({ force: true }).catch(async () => {
      await page.locator('[data-action="open-analyzer"]').first().click({ force: true });
    });
    await sleep(900);
    const f = path.join(__dirname, 'r14-modal-analyzer-light.png');
    await page.screenshot({ path: f, fullPage: false });
    results.push(f); await ctx.close(); console.log('analyzer');
  }
  // 2. experiment detail modal (light)
  {
    const { ctx, page } = await pageWith('light');
    await page.locator('[data-view="experiments"]').first().click({ force: true });
    await sleep(800);
    await page.locator('.exp-card').first().click({ force: true });
    await sleep(800);
    const f = path.join(__dirname, 'r14-modal-exp-detail-light.png');
    await page.screenshot({ path: f, fullPage: false });
    results.push(f); await ctx.close(); console.log('exp detail');
  }
  // 3. search modal (light)
  {
    const { ctx, page } = await pageWith('light');
    await page.locator('[data-view="knowledge"]').first().click({ force: true });
    await sleep(800);
    await page.locator('.search-box').first().click({ force: true }).catch(() => {});
    await page.locator('#globalSearch').press('Enter').catch(() => {});
    await sleep(600);
    const f = path.join(__dirname, 'r14-modal-search-light.png');
    await page.screenshot({ path: f, fullPage: false });
    results.push(f); await ctx.close(); console.log('search');
  }
  // 4. reject-knowledge modal (light)
  {
    const { ctx, page } = await pageWith('light');
    await page.locator('[data-view="knowledge"]').first().click({ force: true });
    await sleep(900);
    const btn = page.locator('.balance-card[data-status="pending"] [data-action="reject-knowledge"]').first();
    await btn.click({ force: true }).catch(() => {});
    await sleep(600);
    const f = path.join(__dirname, 'r14-modal-reject-light.png');
    await page.screenshot({ path: f, fullPage: false });
    results.push(f); await ctx.close(); console.log('reject');
  }
} finally { await browser.close(); }
console.log('SHOTS:'); results.forEach(f => console.log(f));
