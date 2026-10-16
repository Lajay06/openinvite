/**
 * tests/persistence/mobile-no-purchase-routes.mjs
 *
 * NO PURCHASE ROUTE IN THE APP. App Store rule 3.1.1, ruling 1 of
 * goals/2026-10-15-app-store-launch.md: every upgrade prompt, price, plan
 * pitch or link to buy is gone from the app. A feature the couple's plan does
 * not include shows a neutral lock, "Not included in your plan", with no
 * button, no link, no price and no mention of the website. Plans and billing
 * are not reachable from the app at all.
 *
 * BY ELIMINATION, as mobile-no-website-word.mjs reads the shell. Every source
 * file under src/mobile is read, comments stripped, and every string literal,
 * template literal and JSX text a couple could read is checked for:
 *
 *   - the purchase words: upgrade, pricing, see plans, choose a plan,
 *     checkout, billing;
 *   - a price: a currency sign before a digit;
 *   - the website named as a place to go: "openinvite.com.au" is allowed only
 *     as the couple's own Guest Suite address (openinvite.com.au/w/...).
 *
 * What a couple cannot read is decided by shape: a string with no space that
 * starts lower case is a key or a path, an import is code, and the
 * "systemPrompt" values are read only by Ava.
 *
 * The links: the app opens the website only through openWebPage in
 * src/mobile/lib/links.js, and WEB_PAGES there names exactly the privacy
 * policy, the terms, support and account recovery. PROD_ORIGIN is joined to a
 * path nowhere else in the shell, so no other page of the website can open.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SHELL = 'src/mobile';
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(jsx?|tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const PURCHASE = /\bupgrad|\bpricing\b|\bsee plans\b|\bchoose a plan\b|\bcheckout\b|\bbilling\b/i;
const PRICE = /[$€£¥]\s?\d/;
const SITE = /openinvite\.com\.au(?!\/w\/)/i;
const isCodeLike = (s) => !/\s/.test(s) && !/^[A-Z]/.test(s);

/** Every couple-readable piece of text in a source file that offends, with the reason. */
export function purchaseText(src) {
  const hits = [];
  String(src ?? '').split('\n').forEach((line, i) => {
    if (/^\s*import\b/.test(line) || /\bfrom\s+['"]/.test(line)) return;
    if (/"systemPrompt"\s*:/.test(line)) return;
    const pieces = [];
    for (const m of line.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) pieces.push(m[1] ?? m[2] ?? m[3] ?? '');
    for (const m of line.matchAll(/>([^<>{}]+)</g)) pieces.push(m[1]);
    for (const raw of pieces) {
      const p = raw.trim();
      if (!p || isCodeLike(p)) continue;
      const why = PURCHASE.test(p) ? 'purchase word' : PRICE.test(p) ? 'price' : SITE.test(p) ? 'names the website' : null;
      if (why) hits.push({ line: i + 1, why, text: p.slice(0, 90) });
    }
  });
  return hits;
}

export async function runMobileNoPurchaseRoutes() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const files = walk(path.join(ROOT, SHELL));
  ok('the sweep reads the whole shell', files.length > 100, `${files.length} files`);
  const offenders = [];
  const joins = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const src = code(rel);
    for (const h of purchaseText(src)) offenders.push(`${rel}:${h.line} ${h.why}: "${h.text}"`);
    if (rel !== 'src/mobile/lib/links.js' && rel !== 'src/mobile/native.ts' && /\$\{PROD_ORIGIN\}|PROD_ORIGIN\s*\+/.test(src)) joins.push(rel);
  }
  ok('no text a couple reads in the app sells a plan, names a price or sends them to the website', offenders.length === 0, offenders.slice(0, 6).join(' | ') || 'none');
  ok('no shell file builds a link into the website except links.js', joins.length === 0, joins.join(', ') || 'none');

  // The one door to the website, and what it opens.
  const links = code('src/mobile/lib/links.js');
  const pages = links.match(/WEB_PAGES = Object\.freeze\(\{([^}]*)\}\)/);
  const paths = pages ? [...pages[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : [];
  ok('WEB_PAGES is the privacy policy, the terms, support and account recovery, and nothing else',
     paths.join(',') === ['/contact', '/forgot-password', '/privacy-policy', '/terms-of-service'].join(','), paths.join(', ') || 'not found');
  ok('  and only openWebPage joins PROD_ORIGIN to a path',
     (links.match(/\$\{PROD_ORIGIN\}/g) || []).length === 1 && /export function openWebPage[\s\S]*?\$\{PROD_ORIGIN\}\$\{path\}/.test(links), 'links.js');
  ok('  and a desktop hand-off is nothing at all natively',
     /export function desktopHandoff\(navigate, path\) \{\s*return isNative\(\) \? undefined : \(\) => navigate\(path\);/.test(links) && !/openDesktop/.test(links), 'desktopHandoff');

  // The lock: neutral, and nothing to press.
  const lock = code('src/mobile/ui/PlanLock.jsx');
  ok('PlanLock says "Not included in your plan" and offers no button, link or action',
     /title="Not included in your plan"/.test(lock) && !/onClick|action=|href|<button|PillButton|navigate|open/.test(lock.replace(/^import.*$/gm, '')), 'PlanLock.jsx');
  const send = code('src/mobile/screens/guests/SendInvitesScreen.jsx');
  ok('the Send invites gate is the lock', /if \(!canSend\) \{[\s\S]{0,200}<PlanLock /.test(send), 'SendInvitesScreen.jsx');
  const details = code('src/mobile/features/DetailsScreen.jsx');
  ok('the meal options gate is the lock', /section\.ultra && !ultra \? \(\s*<PlanLock /.test(details), 'DetailsScreen.jsx');
  const schemas = code('src/mobile/features/schemas.js');
  ok('  and no section carries the old gate copy', !/gateTitle|gateBody/.test(schemas + details), 'schemas.js');

  // Account: the plan is a label, never a door.
  const account = code('src/mobile/screens/account/AccountScreen.jsx') + code('src/mobile/screens/account/AccountContainer.jsx');
  ok('Account has no upgrade handler and no purchases switch', !/onUpgrade|showPurchases/.test(account), 'AccountScreen.jsx, AccountContainer.jsx');
  ok('  and its plan row goes nowhere', /<Row icon=\{CreditCard\} tile="neutral" label="Plan" value=\{planLabel\} \/>/.test(account), 'AccountScreen.jsx');
  ok('  and it links the privacy policy, the terms and support',
     ['support', 'privacy', 'terms'].every((k) => account.includes(`openWebPage(navigate, '${k}')`)), 'AccountContainer.jsx');

  // The detector must catch what it is for, and leave keys, paths and the Guest Suite address alone.
  const probe = [
    purchaseText(`body="Upgrade to switch it on."`).length,
    purchaseText(`<p>See plans</p>`).length,
    purchaseText(`label: 'Only $9 a month'`).length,
    purchaseText(`body="Do it at openinvite.com.au"`).length,
    purchaseText(`<p>Your Guest Suite is at openinvite.com.au/w/ana</p>`).length,
    purchaseText(`navigate('/pricing')`).length,
    purchaseText(`<p>Subscribe to your schedule</p>`).length,
  ];
  ok('  and the sweep catches words, prices and the website, not keys, paths or the Guest Suite address',
     probe.join(',') === '1,1,1,1,0,0,0', probe.join(','));

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileNoPurchaseRoutes();
  process.exit(r.every(Boolean) ? 0 : 1);
}
