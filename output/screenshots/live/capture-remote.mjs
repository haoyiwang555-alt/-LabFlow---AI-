import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join('k:/项目/比赛/AI先锋未来人才大赛/delivery/screenshots');
const baseUrl = 'https://handlermapping-labflow-demo.ms.show/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
const results = [];

async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push(file);
}

try {
  // 1. 研发总览 (dark)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(900);
    await shot(page, '01-overview');
    await ctx.close();
  }

  // 2. 实验流转
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="experiments"]').first().click({ force: true }).catch(() => {});
    await sleep(800);
    await shot(page, '02-experiments');
    await ctx.close();
  }

  // 3. 风险守门 - 列表
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="risks"]').first().click({ force: true }).catch(() => {});
    await sleep(800);
    await shot(page, '03-risks-list');
    await ctx.close();
  }

  // 4. 风险详情弹窗 (risk-01 环境湿度数据缺失) - 处理前
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="risks"]').first().click({ force: true }).catch(() => {});
    await sleep(800);
    await page.locator('.risk-card[data-id="risk-01"]').first().click({ force: true }).catch(() => {});
    await sleep(700);
    const modalText = await page.locator('#modalContent').innerText().catch(() => '');
    console.log('RISK-01 MODAL (before):', modalText.slice(0, 200).replace(/\n/g, ' | '));
    await shot(page, '04-risk-detail-before');
    await ctx.close();
  }

  // 5. 标记为已处理 → 验证状态变化
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="risks"]').first().click({ force: true }).catch(() => {});
    await sleep(800);
    await page.locator('.risk-card[data-id="risk-01"]').first().click({ force: true }).catch(() => {});
    await sleep(700);
    const resolveBtn = page.locator('[data-action="resolve-risk"]').first();
    const hasBtn = await resolveBtn.count().catch(() => 0);
    console.log('RESOLVE BTN count:', hasBtn);
    if (hasBtn > 0) {
      await resolveBtn.click({ force: true });
      await sleep(1200);
      const toastText = await page.locator('.toast, [class*=toast]').last().innerText().catch(() => '');
      console.log('TOAST:', toastText);
      // 验证卡片状态
      const resolvedCard = await page.locator('.risk-card[data-id="risk-01"].is-resolved').count().catch(() => 0);
      const statusText = await page.locator('.risk-card[data-id="risk-01"] .risk-banner-status').innerText().catch(() => '');
      console.log('RISK-01 resolved count:', resolvedCard, 'status:', statusText);
      await shot(page, '05-risk-resolved');
    } else {
      console.log('resolve button NOT found in modal');
      await shot(page, '05-risk-modal-noresolve');
    }
    await ctx.close();
  }

  // 6. 知识湖 (含待审批)
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="knowledge"]').first().click({ force: true }).catch(() => {});
    await sleep(900);
    await shot(page, '06-knowledge');
    await ctx.close();
  }

  // 7. AI 助理
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="agents"]').first().click({ force: true }).catch(() => {});
    await sleep(900);
    await shot(page, '07-agents');
    await ctx.close();
  }

  // 8. 搜索
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-action="open-search"]').first().click({ force: true }).catch(() => {});
    await sleep(800);
    await shot(page, '08-search');
    await ctx.close();
  }

  // 9. 连接器/设置
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 40000 });
    await sleep(700);
    await page.locator('[data-view="integrations"]').first().click({ force: true }).catch(() => {});
    await sleep(900);
    await shot(page, '09-integrations');
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