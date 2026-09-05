import { chromium } from 'playwright';
const BASE = 'https://www.openinvite.com.au';
const SLUG = 'chris-and-sia';
const OUT = process.env.OUT || '.';
const PAGES = ['', '/our-story', '/celebration', '/rsvp', '/faq', '/music', '/registry', '/stay'];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 900, height: 1300 } });
await ctx.addInitScript((s) => { localStorage.setItem(`oi_entrance_${s}`, '1'); }, SLUG);
const page = await ctx.newPage();
for (const p of PAGES) {
  await page.goto(`${BASE}/w/${SLUG}${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const t = await page.evaluate(() => (document.getElementById('root')?.innerText || '').replace(/\s+/g, ' '));
  console.log(`${(p || '/home').padEnd(14)} ${t.slice(0, 190)}`);
  if (p === '' || p === '/our-story') await page.screenshot({ path: `${OUT}/fixture${p.replace('/', '-') || '-home'}.png`, fullPage: true });
}
await browser.close();
