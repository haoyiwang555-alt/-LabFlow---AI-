// Full master re-capture for 21 screenshots
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUND = process.env.ROUND || 'r9';
const OUT = path.join(__dirname, `${ROUND}`);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

async function runViewport({ width, height, deviceScaleFactor, label, theme }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.error(`[${label}/${theme}] pageerror:`, err.message));
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(400);
  if (theme) {
    await page.evaluate((t) => localStorage.setItem('theme', t), theme);
    await page.evaluate(() => location.reload());
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
  }

  const targets = [
    ['overview', 'overview'],
    ['experiments', 'experiments'],
    ['risks', 'risks'],
    ['knowledge', 'knowledge'],
    ['agents', 'agents'],
    ['integrations', 'integrations'],
    ['settings', 'settings']
  ];
  for (const [id, file] of targets) {
    await page.evaluate((v) => window.setView(v), id);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `${file}-${theme}-${label}.png`), fullPage: true });
  }
  // Knowledge graph close-ups
  await page.evaluate(() => window.setView('knowledge'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `knowledge-graph-${theme}-${label}.png`), fullPage: false, clip: { x: 0, y: 200, width: Math.min(960, width), height: Math.min(800, height) } }).catch(()=>{});

  await ctx.close();
}

console.log('Round', ROUND, '→', OUT);
await runViewport({ width: 1440, height: 900, deviceScaleFactor: 2, label: 'desktop', theme: 'light' });
await runViewport({ width: 1440, height: 900, deviceScaleFactor: 2, label: 'desktop', theme: 'dark' });
await runViewport({ width: 390,  height: 844, deviceScaleFactor: 2, label: 'mobile',  theme: 'light' });
await browser.close();
console.log('Done.');
