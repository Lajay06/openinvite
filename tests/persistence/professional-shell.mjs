/**
 * tests/persistence/professional-shell.mjs
 *
 * Openinvite Professional, read from source: the flag gates every route, the
 * workplace follows the design rules, the screens reach data only through the
 * adapter, and no Professional screen touches a couple's data or its stores.
 * goals/2026-10-14-professional.md, Look and feel, and Privacy.
 *
 * PLANT (R19): each rule runs once against a planted source line carrying the
 * fault, which the same matcher must flag.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIRS = ['src/pages/professional', 'src/components/professional'];
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e)) out.push(p);
  }
  return out;
};

export const RULES = [
  { name: 'no letter-spacing', re: /letterSpacing|letter-spacing|\btracking-/ },
  { name: 'no uppercase', re: /textTransform:\s*['"]uppercase|uppercase\b(?=[^'"]*className)|className=["'`][^"'`]*\buppercase\b/ },
  { name: 'no box-shadow', re: /boxShadow|box-shadow|\bshadow-(sm|md|lg|xl)\b/ },
  { name: 'rounded corners only as pills', re: /borderRadius:\s*(?!(?:999|0)\b)\d+|\brounded-(?!full\b)[a-z0-9]+/ },
  { name: 'nothing lighter than 400', re: /fontWeight:\s*[1-3]00\b|font-(light|thin|extralight)\b/ },
  { name: 'no @/entities imports', re: /from\s+['"]@\/entities\// },
  { name: 'no direct base44.entities reads (the adapter only, until the endpoints)', re: /base44\.entities\./ },
  { name: 'no couple guest or reply stores', re: /myGuests|getMyGuests|guestStore|my-guests|mergeGuestPii|RsvpResponse|WeddingDetails/ },
  { name: 'no emoji presentation', re: /️/ },
];

export function runProfessionalShell() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, the shell and the workplace rules:\n');

  const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
  check('professional shell: the Professional folders exist and hold screens', files.length >= 10, `${files.length} files`);
  for (const rule of RULES) {
    const hits = files.filter((f) => rule.re.test(stripComments(readFileSync(f, 'utf8'), { trailing: true }))).map((f) => relative(ROOT, f));
    check(`professional shell: ${rule.name}`, hits.length === 0, hits.join(', ') || `${files.length} files clean`);
  }

  const root = readFileSync(join(ROOT, 'src/pages/professional/ProfessionalRoot.jsx'), 'utf8');
  check('professional shell: every /professional route sits behind isProfessionalOn, and off goes home', /if \(!isProfessionalOn\(\)\) return <Navigate to="\/" replace \/>/.test(root), 'ProfessionalRoot');

  const app = readFileSync(join(ROOT, 'src/pages/professional/ProfessionalApp.jsx'), 'utf8');
  check('professional shell: the test-data line shows whenever the adapter is not live', /entry === 'demo' \? <TestDataNotice \/>/.test(app) && /resolveEntry\(\{ user, live: STORE_LIVE \}\)/.test(app), 'TestDataNotice');

  const pages = files.filter((f) => /src\/pages\/professional\/(?!ProfessionalRoot|ProfessionalApp|ProfessionalStart|ProfessionalMarketing|VendorSheetPage|QuestionnairePage)[A-Za-z]+\.jsx$/.test(f));
  const noHeader = pages.filter((f) => !/<ProPage\b/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
  const proPage = readFileSync(join(ROOT, 'src/components/professional/ProPage.jsx'), 'utf8');
  check('professional shell: every workspace page uses ProPage, which renders DashboardPageHeader', noHeader.length === 0 && /<DashboardPageHeader\b/.test(proPage), noHeader.join(', ') || `${pages.length} pages`);

  const store = readFileSync(join(ROOT, 'src/lib/professionalStore.js'), 'utf8');
  check('professional shell: the adapter carries no guest email, phone or address field in its seed', !/\b(email|phone|mailing_address|address)\s*:/.test(store.split('const ProGuest')[1]?.split('];')[0] || 'x'), 'ProGuest seed');

  // PLANT: each rule must see its own fault.
  const PLANTS = {
    'no letter-spacing': "style={{ letterSpacing: '0.06em' }}",
    'no uppercase': "style={{ textTransform: 'uppercase' }}",
    'no box-shadow': "style={{ boxShadow: '0 1px 2px #000' }}",
    'rounded corners only as pills': 'style={{ borderRadius: 8 }}',
    'nothing lighter than 400': 'style={{ fontWeight: 300 }}',
    'no @/entities imports': "import { Guest } from '@/entities/Guest';",
    'no direct base44.entities reads (the adapter only, until the endpoints)': 'await base44.entities.Guest.list()',
    'no couple guest or reply stores': "import { getMyGuests } from '@/lib/guestStore';",
    'no emoji presentation': "'☀️'",
  };
  const blind = RULES.filter((rule) => !rule.re.test(PLANTS[rule.name] || '')).map((x) => x.name);
  check('PLANT: every rule flags its own planted fault', blind.length === 0, blind.join(', ') || `${RULES.length} of ${RULES.length} seen`);
  return r;
}
