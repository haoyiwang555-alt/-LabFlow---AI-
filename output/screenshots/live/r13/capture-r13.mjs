import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const results = [];

async function capture(view, theme, viewport, name, opts = {}) {
  const ctx = await browser.newContext({
    viewport,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(400);
  if (view) {
    if (viewport.width < 600) {
      await page.locator('#mobileMenu').click({ force: true }).catch(() => {});
      await sleep(280);
    }
    await page.locator(`[data-view="${view}"]`).first().click({ force: true }).catch(() => {});
    await sleep(view === 'knowledge' ? 1300 : 700);
  }
  const file = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true });
  results.push(file);
  await ctx.close();
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
} finally {
  await browser.close();
}
console.log('SHOTS:');
results.forEach(f => console.log(f));
