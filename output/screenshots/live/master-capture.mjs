import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const results = [];

async function capture(view, theme, viewport, name, light = false) {
  const ctx = await browser.newContext({
    viewport,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
    deviceScaleFactor: 2, // 高清，便于多模态细看
  });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(400);
  if (view) {
    await page.locator(`[data-view="${view}"]`).first().click({ force: true }).catch(() => {});
    await sleep(700);
  }
  const file = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  results.push(file);
  await ctx.close();
}

const DESK = { width: 1440, height: 900 };
const MOB = { width: 390, height: 844 };

try {
  // 7 个主页面 × 桌面浅色 + 桌面深色 + 移动深色 = 21 张
  for (const v of ['overview', 'experiments', 'risks', 'knowledge', 'agents', 'integrations', 'settings']) {
    await capture(v, 'light', DESK, `view-${v}-light`);
    await capture(v, 'dark', DESK, `view-${v}-dark`);
    await capture(v, 'dark', MOB, `view-${v}-mobile`);
  }
  // 特殊：解析弹窗（用 agents 页内可见的那个解析按钮）
  {
    const ctx = await browser.newContext({ viewport: DESK, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await sleep(400);
    await page.locator('[data-view="agents"]').first().click({ force: true });
    await sleep(700);
    // agents 页内第一个 .button-primary 是会议解析器卡片底部的按钮
    const btn = page.locator('section[data-page="agents"] [data-action="open-analyzer"]').first();
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true });
    await sleep(900);
    await page.screenshot({ path: path.join(__dirname, 'modal-analyzer.png'), fullPage: false });
    results.push(path.join(__dirname, 'modal-analyzer.png'));
    await ctx.close();
  }
  // 特殊：知识审批行（点击 k-04 pending 知识项的驳回）
  {
    const ctx = await browser.newContext({ viewport: DESK, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await sleep(400);
    await page.locator('[data-view="knowledge"]').first().click({ force: true });
    await sleep(700);
    await page.screenshot({ path: path.join(__dirname, 'view-knowledge-approval.png'), fullPage: true });
    results.push(path.join(__dirname, 'view-knowledge-approval.png'));
    await ctx.close();
  }
  // 特殊：会议证据模态
  {
    const ctx = await browser.newContext({ viewport: DESK, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await sleep(400);
    await page.locator('[data-view="experiments"]').first().click({ force: true });
    await sleep(700);
    const card = page.locator('.exp-card').first();
    if (await card.count()) {
      await card.click({ force: true }).catch(() => {});
      await sleep(700);
      const ev = page.locator('.evidence-entry').first();
      if (await ev.count()) {
        await ev.click({ force: true }).catch(() => {});
        await sleep(700);
      }
    }
    await page.screenshot({ path: path.join(__dirname, 'modal-evidence.png'), fullPage: false });
    results.push(path.join(__dirname, 'modal-evidence.png'));
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log('SHOTS:');
results.forEach(f => console.log(f));
