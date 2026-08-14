import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const results = [];
async function capture(view, theme, viewport, name) {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1200);
  if (view) {
    if (viewport.width < 600) { await page.locator('#mobileMenu').click({ force: true }).catch(() => {}); await sleep(280); }
    await page.locator(`[data-view="${view}"]`).first().click({ force: true }).catch(() => {});
    await sleep(view === 'knowledge' ? 1500 : 900);
  }
  const file = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.push(path.basename(file));
  await ctx.close();
  console.log('captured', path.basename(file));
}
const DESK = { width: 1440, height: 900 };
const MOB = { width: 390, height: 844 };
try {
  await capture('overview', 'light', DESK, 'r13-overview-light');
  await capture('overview', 'dark', DESK, 'r13-overview-dark');
  await capture('experiments', 'light', DESK, 'r13-experiments-light');
  await capture('risks', 'light', DESK, 'r13-risks-light');
  await capture('knowledge', 'light', DESK, 'r13-knowledge-light');
  await capture('agents', 'light', DESK, 'r13-agents-light');
  await capture('integrations', 'light', DESK, 'r13-integrations-light');
  await capture('settings', 'light', DESK, 'r13-settings-light');
  await capture('overview', 'light', MOB, 'r13-overview-mobile');
  await capture('experiments', 'light', MOB, 'r13-experiments-mobile');
  await capture('knowledge', 'light', MOB, 'r13-knowledge-mobile');
  {
    const ctx = await browser.newContext({ viewport: DESK, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    await page.locator('[data-view="experiments"]').first().click({ force: true });
    await sleep(900);
    await page.locator('[data-action="experiment-new"]').first().click({ force: true });
    await sleep(400);
    await page.locator('input[name="code"]').fill('B-20');
    await sleep(250);
    const f = path.join(__dirname, 'r13-modal-experiment-new.png');
    await page.screenshot({ path: f, fullPage: false });
    results.push(path.basename(f));
    await ctx.close();
    console.log('captured modal');
  }
} finally {
  await browser.close();
  console.log('DONE:', results.length, 'shots');
}
