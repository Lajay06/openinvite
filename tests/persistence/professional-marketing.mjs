/**
 * tests/persistence/professional-marketing.mjs
 *
 * Openinvite Professional: the /professional page. goals/2026-10-14-professional.md,
 * Marketing page. The goal's words are verbatim; the page runs in the goal's
 * order; the call to action starts the trial; photography is from the owned
 * Higgsfield set only, never DTS.
 *
 * PLANT (R19): a planted DTS photo id is caught by the same photo check.
 */
import { readFileSync } from 'node:fs';
import { pass, fail, stripComments } from './_shared.mjs';

const SRC = new URL('../../src/pages/professional/ProfessionalMarketing.jsx', import.meta.url);
const VERBATIM = {
  hero: 'Run every wedding from one place.',
  heroSub: 'A real run sheet, every vendor and every payment across all your events, and live guest numbers straight from your couples\u2019 Openinvite.',
  cta: 'Start free for 14 days',
  guests: 'Your couples send the invitations. You see who\u2019s coming.',
  codes: 'Your couples save 10%. You earn credit.',
};
const photoIds = (src) => [...src.matchAll(/responsivePhoto\('([^']+)'/g)].map((m) => m[1]);
const owned = (id) => /^hf_\d{8}_/.test(id) && !/^DTS_/i.test(id);

export function runProfessionalMarketing() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, the marketing page:\n');
  const raw = readFileSync(SRC, 'utf8');
  const src = stripComments(raw, { trailing: true });

  const missing = Object.entries(VERBATIM).filter(([k, v]) => !src.includes(`${k}: '${v}'`)).map(([k]) => k);
  check('professional marketing: the goal’s headline, subline, call to action and section lines are verbatim', missing.length === 0, missing.join(', ') || 'all five');
  const order = ['COPY.hero}', 'COPY.runsheet}', 'COPY.guests}', 'COPY.events}', 'COPY.codes}', 'COPY.pricing}', 'COPY.end}'].map((k) => src.indexOf(k));
  check('professional marketing: hero, run sheet, guests, events, partner codes, pricing, then the call to action', order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), order.join(','));
  check('professional marketing: the one call to action starts the trial at /professional/start', /to=\{ROUTES\.start\}/.test(src) && (src.match(/background: PRO\.action, color: PRO\.onAction/g) || []).length === 1, 'one gilt pill, black text');
  const ids = photoIds(src);
  check('professional marketing: photography from the owned Higgsfield set only', ids.length >= 1 && ids.every(owned), ids.join(', '));
  check('professional marketing: the product is live HTML cards, not screenshots', !/\.(png|jpg|webp)['"]/.test(src.replace(/openinvite-logo\.png/g, '')), 'no stills');
  check('professional marketing: the guest card shows no email or phone', !/@example|555/.test(src), 'clean');
  check('PLANT: a DTS photo id is caught', !owned('DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub'), 'refused');
  return r;
}
