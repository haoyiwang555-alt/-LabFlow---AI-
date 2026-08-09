import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('theme', 'light'));
await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
await new Promise(r => setTimeout(r, 700));
const info = await page.evaluate(() => {
  const track = document.querySelector('.hero-axis-track');
  const tr = track.getBoundingClientRect();
  const pts = [...document.querySelectorAll('.hero-axis-point')].map(p => {
    const r = p.getBoundingClientRect();
    return { time: p.querySelector('.hero-axis-time')?.textContent, label: p.querySelector('.hero-axis-label')?.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });
  return { trackLeft: tr.left, trackRight: tr.right, trackW: tr.width, pts };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();