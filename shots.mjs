import { chromium } from 'playwright';

const BASE = process.argv[2];
if (!BASE) { console.error('usage: node shots.mjs <baseUrl>'); process.exit(1); }
const OUT = process.argv[3] || '.';

const ROUTES = [
  ['forgot-password', '/forgot-password'],
  ['reset-password', '/reset-password?token=preview-visual-check'],
  ['register', '/register'],
  ['login', '/login'],
];
const SIZES = [['desktop', 1440, 900], ['mobile', 390, 844]];

const browser = await chromium.launch();
for (const [label, w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  if (process.env.SHARE_URL) {
    // Vercel deployment protection: hitting the share URL once sets the
    // bypass cookie for the rest of this browser context.
    await page.goto(process.env.SHARE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  for (const [name, path] of ROUTES) {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 });
    // let the carousel's first crossfade settle and images decode
    await page.waitForTimeout(2500);
    const file = `${OUT}/${name}-${label}.png`;
    await page.screenshot({ path: file });
    // report any residual overlay text still in the DOM
    const body = await page.evaluate(() => document.body.innerText);
    const hasQuote = body.includes('as exciting as the day itself');
    console.log(`${file}  overlayQuotePresent=${hasQuote}`);
  }
  await ctx.close();
}
await browser.close();
