import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const results = [];
async function shot(page, name) {
  const file = path.join(__dirname, `snap-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.push(file);
}
async function view(page, viewName, theme) {
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(500);
  if (viewName) await page.locator(`[data-view="${viewName}"]`).first().click({ force: true }).catch(()=>{});
  await sleep(700);
  return page;
}

try {
  // overview light
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  await view(page, 'overview', 'light');
  await shot(page, 'overview-light');
  await ctx.close();

  // overview dark
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await view(page, 'overview', 'dark');
  await shot(page, 'overview-dark');
  await ctx.close();

  // knowledge
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await view(page, 'knowledge', 'dark');
  await shot(page, 'knowledge');
  await ctx.close();

  // experiments
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await view(page, 'experiments', 'dark');
  await shot(page, 'experiments');
  await ctx.close();

  // agents
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await view(page, 'agents', 'dark');
  await shot(page, 'agents');
  await ctx.close();

  // integrations
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await view(page, 'integrations', 'dark');
  await shot(page, 'integrations');
  await ctx.close();

  // mobile overview
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await view(page, 'overview', 'dark');
  await shot(page, 'mobile-overview');
  await ctx.close();
} catch (error) {
  console.error('capture failed:', error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
console.log('SCREENSHOTS:');
results.forEach(f => console.log(f));