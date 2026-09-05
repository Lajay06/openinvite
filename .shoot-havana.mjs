import { chromium } from 'playwright';
const { seededContext, dismissEntrance } = await import(process.env.HARNESS);
const { SAMPLE_HAVANA } = await import(process.env.HAVANA);
const OUT = process.env.OUT, BASE = 'http://localhost:4180';
const d = new Date(); d.setMonth(d.getMonth() + 8);
const record = { ...structuredClone(SAMPLE_HAVANA), slug: 'havana-preview', websiteEnabled: true,
  weddingDate: d.toISOString().slice(0,10), scrollAnimation: 'none' };
const browser = await chromium.launch();
const ctx = await seededContext(browser, { width: 1000, height: 1500 });
await ctx.route(u => { try { return new URL(typeof u === 'string' ? u : u.href).pathname.startsWith('/api/wedding-by-slug'); } catch { return false; } },
  r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(record) }));
await dismissEntrance(ctx, 'havana-preview');
const page = await ctx.newPage();
const imgs = [];
page.on('response', r => { if (/res\.cloudinary\.com/.test(r.url())) imgs.push([r.status(), r.url().split('/').pop().slice(0,26)]); });
for (const p of ['', '/our-story', '/celebration', '/faq', '/polls', '/stay']) {
  await page.goto(`${BASE}/w/havana-preview${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const t = await page.evaluate(() => (document.getElementById('root')?.innerText||'').replace(/\s+/g,' '));
  const app = /Sample & Couple|invitation isn.t available/i.test(t);
  console.log(`${(p||'/home').padEnd(13)} app=${app?'yes':'NO '} ${t.slice(0,105)}`);
  await page.screenshot({ path: `${OUT}/havana${p.replace('/','-')||'-home'}.png`, fullPage: true });
}
console.log('\ncloudinary responses:', imgs.length, JSON.stringify([...new Set(imgs.map(i=>i[0]))]));
await browser.close();
