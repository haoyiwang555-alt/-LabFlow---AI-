import { chromium } from 'playwright';
const baseUrl = 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
await sleep(700);

const info = await page.evaluate(() => {
  const hero = document.querySelector('.hero-card');
  const track = document.querySelector('.hero-axis-track');
  const points = [...document.querySelectorAll('.hero-axis-point')].map(p => {
    const r = p.getBoundingClientRect();
    return { label: p.querySelector('.hero-axis-label')?.textContent, top: r.top, bottom: r.bottom, w: r.width, overflow: r.right > hero.getBoundingClientRect().right + 1 || r.left < hero.getBoundingClientRect().left - 1 };
  });
  const line = track ? getComputedStyle(track, '::before').height : null;
  const heroR = hero.getBoundingClientRect();
  const title = document.querySelector('.hero-title');
  const titleR = title.getBoundingClientRect();
  const titleOverflow = titleR.right > heroR.right;
  return {
    heroR: { left: heroR.left, right: heroR.right, top: heroR.top, bottom: heroR.bottom },
    trackR: track ? (() => { const r = track.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })() : null,
    lineHeight: line,
    points,
    title: title.textContent, titleOverflow, titleRight: titleR.right
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();