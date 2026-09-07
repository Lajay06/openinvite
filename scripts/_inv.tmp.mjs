import { chromium } from 'playwright';
import { seededContext, SEED } from './lib/renderHarness.mjs';
const own = { created_by: 'fixture@example.com', created_by_id: 'u1' };
const day = SEED.WeddingDetails[0].weddingDate.slice(0, 10);
const seed = { ...SEED, Schedule: [
  { id: 's1', event_name: 'Ceremony', category: 'ceremony', event_date: day, start_time: '15:00', location: 'A', responsible_person: null, notes: null, description: null, end_time: null, ...own },
]};
const browser = await chromium.launch();
for (const [path, extra] of [['/Schedule', seed], ['/Vendors', undefined], ['/Guests', undefined], ['/Budget', undefined], ['/TodoList', undefined], ['/Moodboard', undefined], ['/Messages', undefined], ['/Polls', undefined], ['/Seating', undefined], ['/Music', undefined]]) {
  const ctx = await seededContext(browser, { width: 1440, height: 950, seed: extra });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173' + path, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3500);
  const out = await page.evaluate(() => {
    const pills = document.querySelectorAll('.filter-pill').length;
    window.__pills = pills;
    // any horizontal row of >=3 small controls that looks like a filter set
    const rows = [];
    for (const el of document.querySelectorAll('div')) {
      const kids = [...el.children].filter(c => /^(BUTTON|A|SPAN)$/.test(c.tagName) && (c.innerText || '').trim());
      if (kids.length < 3) continue;
      const st = getComputedStyle(el);
      if (st.display !== 'flex') continue;
      const cls = [...new Set(kids.map(k => k.className || '(none)'))];
      const rad = [...new Set(kids.map(k => getComputedStyle(k).borderRadius))];
      const bg  = [...new Set(kids.map(k => getComputedStyle(k).backgroundColor))];
      const fs  = [...new Set(kids.map(k => getComputedStyle(k).fontSize))];
      rows.push({ n: kids.length, text: kids.slice(0,4).map(k => (k.innerText||'').trim().slice(0,14)).join('|'), cls: cls.join(','), rad: rad.join(','), bg: bg.join(','), fs: fs.join(',') });
    }
    return { pills, rows: rows.slice(0, 6) };
  });
  console.log('=== ' + path);
  console.log('    .filter-pill on page:', out.pills);
  out.rows.forEach(r => console.log('   ', r.n, r.text, '| cls:', r.cls.slice(0, 40), '| fs:', r.fs));
  await ctx.close();
}
await browser.close();
