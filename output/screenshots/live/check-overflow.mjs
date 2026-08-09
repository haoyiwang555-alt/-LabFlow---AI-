import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv.find(a => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const views = ['overview', 'experiments', 'risks', 'knowledge', 'agents', 'integrations', 'settings'];

try {
  for (const vp of [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844, mobile: true }]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
      await page.addInitScript(t => localStorage.setItem('theme', t), theme);
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(600);
      for (const v of views) {
        await page.locator(`[data-view="${v}"]`).first().click({ force: true }).catch(() => {});
        await sleep(600);
        const overflow = await page.evaluate(() => {
          const bad = [];
          document.querySelectorAll('.page-view').forEach(el => {
            if (el.offsetWidth > 0 && el.scrollWidth > el.clientWidth) {
              bad.push(`[${el.dataset.page}] scrollW=${el.scrollWidth} clientW=${el.clientWidth}`);
            }
          });
          return bad;
        });
        console.log(`${vp.name}/${theme}/${v} overflow=${overflow.length ? overflow.join(' | ') : 'NONE'}`);
      }
      if (errors.length) console.log(`  ${vp.name}/${theme} consoleErrors: ${errors.join(' ; ')}`);
      await ctx.close();
    }
  }
} finally { await browser.close(); }
console.log('DONE');