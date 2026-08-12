import { chromium } from 'playwright';
import path from 'node:path';

const outDir = path.join('k:/项目/比赛/AI先锋未来人才大赛/delivery/screenshots');
const baseUrl = 'https://handlermapping-labflow-demo.ms.show/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('theme', 'dark'));

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
  await sleep(800);
  await page.locator('[data-view="risks"]').first().click({ force: true });
  await sleep(1000);

  // 读取 risk-01 卡片状态
  const status = await page.locator('.risk-card[data-id="risk-01"] .risk-banner-status').innerText().catch(() => 'N/A');
  const resolvedCls = await page.locator('.risk-card[data-id="risk-01"].is-resolved').count().catch(() => 0);
  console.log('RISK-01 status:', status, '| is-resolved count:', resolvedCls);

  // 打开详情弹窗确认
  await page.locator('.risk-card[data-id="risk-01"]').first().click({ force: true });
  await sleep(700);
  const modalTitle = await page.locator('#modalTitle').innerText().catch(() => '');
  const modalBtn = await page.locator('[data-action="resolve-risk"]').count().catch(() => 0);
  console.log('MODAL:', modalTitle, '| resolve btn (should be 0 if resolved):', modalBtn);

  await page.locator('[data-action="close-modal"]').first().click({ force: true }).catch(() => {});
  await sleep(500);
  await page.screenshot({ path: path.join(outDir, '05-risk-resolved.png') });
  console.log('saved 05-risk-resolved.png');

  await browser.close();
} catch (e) {
  console.error('failed:', e.message);
  await browser.close();
  process.exitCode = 1;
}