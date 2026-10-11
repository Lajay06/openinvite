/**
 * scripts/gift-assets/plan-badges.mjs
 *
 * THE PLAN BADGES AS IMAGES, FOR THE GIFT EMAILS. Gifting v2, item 2
 * (goals/2026-10-11-gifting-v2.md): email clients cannot be trusted with a
 * gradient background or a web font, so the badge goes into an email as a
 * picture of itself. The picture is rendered here from the same values the
 * PlanBadge component draws with (src/lib/planBadge.js), at 3x, on a
 * transparent ground, and uploaded to email-assets/plan-badge-<plan>/3x-<take>:
 * a new path every time, overwrite off, so a live badge is never replaced.
 *
 *   node scripts/gift-assets/plan-badges.mjs            render only, to /tmp
 *   node scripts/gift-assets/plan-badges.mjs --upload   render and upload
 *
 * Without --upload nothing leaves the machine. Print the URLs and set them in
 * PLAN_BADGE_EMAIL_IMAGE.
 */
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { cloudinaryConfig } from '../tour-recordings/lib/cloudinary.mjs';
import { PLAN_BADGE_BACKGROUND, PLAN_BADGE_LABEL } from '../../src/lib/planBadge.js';

const OUT = process.env.RECORDING_OUT || '/tmp/openinvite-plan-badges';
const upload = process.argv.includes('--upload');
mkdirSync(OUT, { recursive: true });

async function uploadBadge(file, plan, config) {
  const timestamp = Math.floor(Date.now() / 1000);
  const take = new Date(timestamp * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const params = { folder: `email-assets/plan-badge-${plan}`, overwrite: 'false', public_id: `3x-${take}`, timestamp };
  const signature = createHash('sha1').update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + config.secret).digest('hex');
  const fd = new FormData();
  for (const [k, v] of Object.entries(params)) fd.append(k, String(v));
  fd.append('api_key', config.key);
  fd.append('signature', signature);
  fd.append('file', new Blob([readFileSync(file)]), `${plan}.png`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/upload`, { method: 'POST', body: fd });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${body.error?.message || 'upload failed'}`);
  return body;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 3 });
const config = upload ? cloudinaryConfig() : null;
if (upload && !config) throw new Error('CLOUDINARY_URL is not set');
for (const plan of ['ultra', 'pro']) {
  // PlanBadge's own shape at the email's size: 12px, weight 800, 1px by 6px
  // of padding, 3px corners, white on the plan's background.
  await page.setContent(`<html><body style="margin:0;background:transparent">
    <span id="b" style="display:inline-block;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;line-height:1.4;font-weight:800;color:#FFFFFF;background:${PLAN_BADGE_BACKGROUND[plan]};padding:1px 6px;border-radius:3px">${PLAN_BADGE_LABEL[plan]}</span>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const file = `${OUT}/${plan}.png`;
  await page.locator('#b').screenshot({ path: file, omitBackground: true });
  const box = await page.locator('#b').boundingBox();
  console.log(`${plan}: ${file} (${box.width} by ${box.height} CSS px, 3x)`);
  if (upload) {
    const r = await uploadBadge(file, plan, config);
    console.log(`  uploaded: https://res.cloudinary.com/${config.cloud}/image/upload/v${r.version}/${r.public_id}.png  (${r.width}x${r.height})`);
  }
}
await browser.close();
