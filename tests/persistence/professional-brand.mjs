/**
 * tests/persistence/professional-brand.mjs
 *
 * Openinvite Professional's colors and lockup (owner ruling 2026-10-14).
 * Gilt #F6BC1C replaces red for Professional; Deep gilt #7A5200 is for links,
 * small text and focus on white; red stays with the couple app. Gilt is never
 * text on a white or #F5F5F5 ground: it is a fill, a button with black text,
 * or the mark. The logo is "Openinvite | Professional": the real mark
 * recolored to Gilt as a PNG, the words in one weight, a thin divider.
 *
 * Screens under src/components/professional/couple/ and the couple's Link
 * your planner page are the couple app's own screens and keep its red.
 *
 * PLANT (R19): a planted #E03553, and a planted Gilt text color, are each
 * flagged by the same matchers.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pass, fail, stripComments } from './_shared.mjs';
import { BRAND, MARK_PNG, MARK_PNG_ABSOLUTE } from '../../src/lib/professionalBrand.js';
import { renderTeamInviteEmail } from '../../src/lib/professionalEmailTemplate.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const walk = (d, out = []) => { if (!existsSync(d)) return out; for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, out); else if (/\.jsx?$/.test(e)) out.push(p); } return out; };
const COUPLE_SIDE = /^src\/components\/professional\/couple\/|^src\/pages\/professional\/LinkPlannerPage\.jsx$/;

export const RED = /#E03553|\bcolor\.red\b|\bPRO\.red\b|EMAIL_ACCENT|INVITE_LOGO_URL/i;
/** A text color set to Gilt, in JSX styles or in email HTML. Backgrounds, borders and outlines are fine. */
export const GILT_TEXT = /(?<![A-Za-z-])color:\s*(?:BRAND\.gilt|PRO\.action|['"`]#F6BC1C['"`]|\$\{BRAND\.gilt\}|#F6BC1C)/i;

const luminance = (hex) => {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function runProfessionalBrand() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, colors and the lockup:\n');

  check('professional brand: Gilt #F6BC1C, Deep gilt #7A5200, black on Gilt', BRAND.gilt === '#F6BC1C' && BRAND.deepGilt === '#7A5200' && BRAND.onGilt === '#0A0A0A', JSON.stringify(BRAND));
  check('professional brand: Gilt is not a text color on white (below 3:1), Deep gilt is (above 4.5:1), and black reads on Gilt', contrast(BRAND.gilt, '#FFFFFF') < 3 && contrast(BRAND.deepGilt, '#FFFFFF') >= 4.5 && contrast(BRAND.deepGilt, '#F5F5F5') >= 4.5 && contrast(BRAND.onGilt, BRAND.gilt) >= 7, `${contrast(BRAND.gilt, '#FFFFFF').toFixed(2)} / ${contrast(BRAND.deepGilt, '#FFFFFF').toFixed(2)} / ${contrast(BRAND.onGilt, BRAND.gilt).toFixed(2)}`);

  const files = [...walk(join(ROOT, 'src/pages/professional')), ...walk(join(ROOT, 'src/components/professional')), ...readdirSync(join(ROOT, 'src/lib')).filter((f) => /^professional.*\.js$/.test(f)).map((f) => join(ROOT, 'src/lib', f))]
    .map((f) => relative(ROOT, f)).filter((f) => !COUPLE_SIDE.test(f));
  const code = (f) => stripComments(readFileSync(join(ROOT, f), 'utf8'), { trailing: true });
  const red = files.filter((f) => RED.test(code(f)));
  check('professional brand: no #E03553 anywhere under Professional; red stays with the couple app', red.length === 0, red.join(', ') || `${files.length} files`);
  const giltText = files.filter((f) => GILT_TEXT.test(code(f)));
  check('professional brand: no Gilt text anywhere under Professional', giltText.length === 0, giltText.join(', ') || `${files.length} files`);

  const theme = code('src/components/professional/proTheme.js');
  check('professional brand: the primary button is a Gilt fill with black text', /btnPrimary: \{ background: PRO\.action, color: PRO\.onAction,/.test(theme) && /action: BRAND\.gilt/.test(theme) && /onAction: BRAND\.onGilt/.test(theme), 'gilt pill');
  check('professional brand: focus rings are Deep gilt on light grounds and Gilt on the black bars', /\.oi-pro :focus-visible \{ outline: 2px solid \$\{BRAND\.deepGilt\}/.test(theme) && /\.oi-pro \.oi-pro-dark :focus-visible \{ outline-color: \$\{BRAND\.gilt\}/.test(theme), 'scoped');
  const shell = code('src/components/professional/ProShell.jsx');
  check('professional brand: the side bar marks the current page in Gilt', /borderLeft: `2px solid \$\{isActive \? BRAND\.gilt/.test(shell), 'gilt marker');

  // The lockup.
  check('professional brand: the lockup is the Gilt mark PNG, Openinvite, a thin divider and Professional in the same weight', /src=\{MARK_PNG\}/.test(shell) && />Openinvite</.test(shell) && /data-pro-divider style=\{\{ width: 1,/.test(shell) && /<span style=\{word\}>Openinvite<\/span>/.test(shell) && /<span style=\{word\}>\{PRODUCT_SHORT\}<\/span>/.test(shell) && /const ink = ground === 'dark' \? '#FFFFFF' : PRO\.text/.test(shell), 'white on black, black on white');
  const require = createRequire(join(ROOT, 'package.json'));
  const { PNG } = require('pngjs');
  const pngPath = join(ROOT, 'public', MARK_PNG);
  let stray = -1;
  let opaque = 0;
  if (existsSync(pngPath)) {
    const png = PNG.sync.read(readFileSync(pngPath));
    stray = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] === 0) continue;
      opaque += 1;
      if (png.data[i] !== 0xF6 || png.data[i + 1] !== 0xBC || png.data[i + 2] !== 0x1C) stray += 1;
    }
  }
  check('professional brand: the mark is a PNG, every visible pixel Gilt', /\.png$/.test(MARK_PNG) && stray === 0 && opaque > 1000, `${opaque} visible pixels, ${stray} not gilt`);
  const email = renderTeamInviteEmail({ workspaceName: 'Holly Reed Events', inviterName: 'Holly Reed', role: 'planner', acceptUrl: 'https://www.openinvite.com.au/x' }).html;
  check('professional brand: emails carry the Gilt mark PNG, never an SVG, and a Gilt pill with black text', email.includes(`src="${MARK_PNG_ABSOLUTE}"`) && !/\.svg/i.test(email) && /background:#F6BC1C;border-radius:999px;[\s\S]*?color:#0A0A0A/.test(email) && !/#E03553/i.test(email) && !GILT_TEXT.test(email), 'email');

  // PLANTS.
  check('PLANT: a planted couple red is flagged', RED.test("style={{ background: '#E03553' }}"), 'flagged');
  check('PLANT: a planted Gilt text color is flagged, a Gilt fill is not', GILT_TEXT.test("style={{ color: BRAND.gilt }}") && GILT_TEXT.test('<p style="color:#F6BC1C">') && !GILT_TEXT.test("style={{ background: BRAND.gilt }}") && !GILT_TEXT.test("style={{ backgroundColor: '#F6BC1C' }}"), 'flagged');
  return r;
}
