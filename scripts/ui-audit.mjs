/**
 * LabFlow UI 验收脚本 — 每次改完前端跑一遍，把"感觉好看了"变成"指标过了"
 *
 *   node scripts/ui-audit.mjs                 # 默认 http://localhost:4173
 *   node scripts/ui-audit.mjs --base=http://localhost:5173
 *   node scripts/ui-audit.mjs --shots         # 同时输出各页截图
 *
 * 退出码 0 = 全过，1 = 有 FAIL。可以直接挂进 CI 或 npm run check。
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1]) ?? d;
const has = k => process.argv.includes(`--${k}`);

const BASE = arg('base', 'http://localhost:4173');
const SHOT_DIR = path.resolve(arg('out', 'output/screenshots/audit'));
const VIEWS = ['overview', 'experiments', 'risks', 'knowledge', 'agents', 'integrations', 'settings'];

// 预算：改动后这些数字只许降不许升
const BUDGET = {
  maxFontSizes: 9,      // 全站允许的不同 font-size 种数
  maxRadii: 6,          // 不同圆角种数
  maxShadows: 4,        // 不同 box-shadow 种数
  maxAccentHues: 4,     // 强调色色相种数。合法基线 = action(蓝) + success/warning/danger 三个语义色。
                        //   超过 4 说明色彩开始被拿来"分类"而不是"表状态"，即彩虹编码。
  maxOverflowPx: 0,     // 任何断点下的横向溢出
  minTapTarget: 44,     // 移动端可点击元素最小边长 px
};

const results = [];
const push = (level, view, rule, detail) => results.push({ level, view, rule, detail });

// ── 页面内探针 ────────────────────────────────────────────────
const PROBE = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;

  const parseRGB = c => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const parseRGB2 = c => { const m = (c || '').match(/[\d.]+/g) || []; return [Number(m[0]) || 0, Number(m[1]) || 0, Number(m[2]) || 0, m[3] === undefined ? 1 : Number(m[3])]; };
  const relLum = c => {
    const [r, g, b] = parseRGB(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // 真实背景色：沿祖先链收集半透明层，自下而上做 alpha 合成。
  // 不合成的话 rgba(255,255,255,.05) 这种叠加层会被当成纯白，导致深色侧栏全员误报。
  const bgOf = el => {
    const layers = [];
    let n = el;
    while (n && n !== de) {
      const [r, g, b, a = 1] = parseRGB2(getComputedStyle(n).backgroundColor);
      if (a > 0) { layers.push([r, g, b, a]); if (a >= 0.999) break; }
      n = n.parentElement;
    }
    if (!layers.length || layers[layers.length - 1][3] < 0.999) {
      const [r, g, b] = parseRGB2(getComputedStyle(document.body).backgroundColor);
      layers.push([r || 255, g || 255, b || 255, 1]);
    }
    // 从最底层往上叠
    let [R, G, B] = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i--) {
      const [r, g, b, a] = layers[i];
      R = r * a + R * (1 - a); G = g * a + G * (1 - a); B = b * a + B * (1 - a);
    }
    return `rgb(${R}, ${G}, ${B})`;
  };
  // 前景同理：半透明文字要先合成到它的背景上
  const fgOn = (color, bg) => {
    const [r, g, b, a = 1] = parseRGB2(color);
    if (a >= 0.999) return color;
    const [br, bg2, bb] = parseRGB2(bg);
    return `rgb(${r * a + br * (1 - a)}, ${g * a + bg2 * (1 - a)}, ${b * a + bb * (1 - a)})`;
  };
  const hueOf = c => {
    const [r, g, b] = parseRGB(c).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.06) return null;                       // 近灰，不算强调色
    if (mx < 0.12 || (mx > 0.97 && d < 0.10)) return null;
    let h = 0;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    return Math.round(((h * 60) + 360) % 360 / 30) * 30; // 归到 30° 桶
  };

  const fontSizes = new Set(), radii = new Set(), shadows = new Set();
  const accentHues = new Map();      // hue -> 出现次数
  const overflow = [];
  const contrastFails = [];
  const smallTaps = [];
  const orphanLines = [];

  const isMobile = vw <= 480;

  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return;
    const painted = r.width > 0 && r.height > 0;

    if (painted) {
      fontSizes.add(s.fontSize);
      if (s.borderRadius !== '0px') radii.add(s.borderRadius);
      if (s.boxShadow && s.boxShadow !== 'none') shadows.add(s.boxShadow);

      // 横向溢出：只报根因（父级未溢出的那一层）
      if (r.right > vw + 1) {
        const p = el.parentElement;
        const pOver = p && p.getBoundingClientRect().right > vw + 1;
        if (!pOver) overflow.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className || '').split(' ').filter(Boolean).slice(0, 2).join('.'), over: Math.round(r.right - vw), width: Math.round(r.width), gtc: s.gridTemplateColumns.slice(0, 48) });
      }

      // 彩虹编码：小面积色块（圆点/色条/chip）的色相分布
      const isSwatch = (r.width <= 260 && r.height <= 46) || (r.height <= 8 && r.width <= 400);
      if (isSwatch) {
        for (const c of [s.backgroundColor, s.borderTopColor, s.color]) {
          const h = hueOf(c);
          if (h !== null) accentHues.set(h, (accentHues.get(h) || 0) + 1);
        }
      }

      // 移动端点击目标
      if (isMobile && /^(button|a|input|select)$/.test(el.tagName.toLowerCase()) && r.width > 0) {
        if (r.width < 44 || r.height < 44) smallTaps.push({ sel: el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }

    // 文本节点：对比度 + 孤字
    const textNodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!textNodes.length || !painted) return;
    const txt = textNodes.map(n => n.textContent.trim()).join('').slice(0, 40);

    if (+s.opacity >= 0.1) {
      try {
        const bg = bgOf(el);
        const L1 = relLum(fgOn(s.color, bg)), L2 = relLum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
        const need = (size >= 18.66 || (size >= 14 && bold)) ? 3 : 4.5;
        if (ratio < need) contrastFails.push({ txt, ratio: +ratio.toFixed(2), need, size: s.fontSize, color: s.color });
      } catch { /* ignore */ }
    }

    // 孤字检测：多行段落最后一行只剩 1-2 个字符
    if (el.childElementCount === 0 && txt.length > 14) {
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.5;
      const lines = Math.round(r.height / lh);
      if (lines >= 2) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = [...range.getClientRects()];
        if (rects.length >= 2) {
          const last = rects[rects.length - 1];
          const avg = rects.reduce((a, x) => a + x.width, 0) / rects.length;
          if (last.width > 0 && last.width < avg * 0.14) orphanLines.push({ txt, lastLinePx: Math.round(last.width) });
        }
      }
    }
  });

  // 网格残缺：最后一行只填了不到一半的列
  const raggedGrids = [];
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    if (s.display !== 'grid') return;
    const cols = s.gridTemplateColumns.split(' ').filter(Boolean).length;
    const kids = [...el.children].filter(k => k.getBoundingClientRect().height > 0).length;
    if (cols >= 2 && kids > cols) {
      const rem = kids % cols;
      if (rem !== 0 && rem <= Math.floor(cols / 2)) {
        raggedGrids.push({ sel: (el.id ? '#' + el.id : '') + '.' + String(el.className || '').slice(0, 34), cols, items: kids, lastRowFilled: rem });
      }
    }
  });

  return {
    vw,
    scrollW: de.scrollWidth,
    fontSizes: [...fontSizes].sort((a, b) => parseFloat(a) - parseFloat(b)),
    radii: [...radii],
    shadows: [...shadows],
    accentHues: [...accentHues.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]),
    overflow: overflow.slice(0, 8),
    contrastFails: contrastFails.slice(0, 12),
    smallTaps: smallTaps.slice(0, 10),
    orphanLines: orphanLines.slice(0, 10),
    raggedGrids: raggedGrids.slice(0, 8),
  };
};

// ── 主流程 ────────────────────────────────────────────────────
const browser = await chromium.launch();
if (has('shots')) fs.mkdirSync(SHOT_DIR, { recursive: true });

const consoleErrors = [];

for (const theme of ['light', 'dark']) {
  for (const [wName, vp] of [['desktop', { width: 1440, height: 900 }], ['tablet', { width: 834, height: 1112 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: wName === 'mobile', hasTouch: wName === 'mobile', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => consoleErrors.push(`${theme}/${wName}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${theme}/${wName}: ${m.text()}`); });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); }, theme);
    await page.waitForTimeout(500);

    for (const v of VIEWS) {
      const btn = await page.$(`[data-view="${v}"]`);
      if (btn) { await btn.click({ force: true }).catch(() => {}); await page.waitForTimeout(450); }
      const tag = `${theme}/${wName}/${v}`;
      const r = await page.evaluate(PROBE);

      if (r.overflow.length) push('FAIL', tag, '横向溢出', r.overflow.map(o => `${o.sel} 溢出${o.over}px (w=${o.width}${o.gtc && o.gtc !== 'none' ? ` gtc=${o.gtc}` : ''})`).join(' | '));
      if (r.contrastFails.length) push('FAIL', tag, '对比度不足', r.contrastFails.map(c => `"${c.txt}" ${c.ratio}:1 <需${c.need} (${c.size})`).join(' | '));
      if (wName === 'mobile' && r.smallTaps.length) push('WARN', tag, '点击目标过小', r.smallTaps.map(t => `${t.sel} ${t.w}x${t.h}`).join(' | '));
      if (r.raggedGrids.length) push('WARN', tag, '网格残缺', r.raggedGrids.map(g => `${g.sel} ${g.cols}列/${g.items}项，末行只填${g.lastRowFilled}`).join(' | '));
      if (r.orphanLines.length) push('WARN', tag, '孤字断行', r.orphanLines.map(o => `"${o.txt}" 末行仅${o.lastLinePx}px`).join(' | '));

      if (wName === 'desktop') {
        if (r.fontSizes.length > BUDGET.maxFontSizes) push('WARN', tag, '字号种数超标', `${r.fontSizes.length} > ${BUDGET.maxFontSizes}：${r.fontSizes.join(', ')}`);
        if (r.radii.length > BUDGET.maxRadii) push('WARN', tag, '圆角种数超标', `${r.radii.length} > ${BUDGET.maxRadii}：${r.radii.join(' | ')}`);
        if (r.shadows.length > BUDGET.maxShadows) push('WARN', tag, '阴影种数超标', `${r.shadows.length} > ${BUDGET.maxShadows}`);
        if (r.accentHues.length > BUDGET.maxAccentHues) push('FAIL', tag, '彩虹编码', `${r.accentHues.length} 种强调色相 > ${BUDGET.maxAccentHues}：${r.accentHues.map(([h, n]) => `${h}°×${n}`).join(', ')}`);
      }

      if (has('shots')) await page.screenshot({ path: path.join(SHOT_DIR, `${theme}-${wName}-${v}.jpg`), type: 'jpeg', quality: 70 });
    }
    await ctx.close();
  }
}

if (consoleErrors.length) push('FAIL', 'runtime', '控制台报错', [...new Set(consoleErrors)].slice(0, 8).join(' | '));

await browser.close();

// ── 报告 ──────────────────────────────────────────────────────
const fails = results.filter(r => r.level === 'FAIL');
const warns = results.filter(r => r.level === 'WARN');
const C = { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', x: '\x1b[0m' };

console.log(`\n${C.d}── LabFlow UI 验收 · ${BASE} ──${C.x}\n`);
const byRule = {};
for (const r of results) (byRule[r.rule] ||= []).push(r);
for (const [rule, rows] of Object.entries(byRule)) {
  const lvl = rows[0].level;
  console.log(`${lvl === 'FAIL' ? C.r + '✗ FAIL' : C.y + '! WARN'}${C.x}  ${rule}  ${C.d}(${rows.length} 处)${C.x}`);
  for (const row of rows.slice(0, 4)) console.log(`   ${C.d}${row.view}${C.x}  ${row.detail.slice(0, 190)}`);
  if (rows.length > 4) console.log(`   ${C.d}… 另 ${rows.length - 4} 处${C.x}`);
  console.log('');
}
if (!results.length) console.log(`${C.g}✓ 全部通过${C.x}\n`);
console.log(`${C.d}汇总：${C.x}${fails.length ? C.r : C.g}${fails.length} FAIL${C.x} · ${warns.length ? C.y : C.g}${warns.length} WARN${C.x}\n`);

fs.mkdirSync('output', { recursive: true });
fs.writeFileSync('output/ui-audit.json', JSON.stringify({ base: BASE, budget: BUDGET, results }, null, 2));
console.log(`${C.d}明细已写入 output/ui-audit.json${C.x}\n`);

process.exit(fails.length ? 1 : 0);
