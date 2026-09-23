/**
 * Stay and Getting here, everywhere — owner ruling, 2026-09-21 (MINOR).
 *
 * The dashboard and the guest-suite builder called two sections
 * "Accommodation" and "Transportation" while the design studio and the live
 * website called the same two sections "Stay" and "Getting here". The couple
 * built a page under one name and their guests read it under another. The
 * ruling: Stay and Getting here win everywhere; the formal words go.
 *
 * WHAT THIS GUARD READS. Every string literal and every JSX text node in
 * src/ and api/ (emails live there), with comments stripped first — a comment
 * is not user-facing, and the US-English guard already owns comment hygiene.
 * A literal with no whitespace is an identifier, a key, a route or a
 * field name (`guestSuiteAccommodation`, `/accommodation`, `'transportation'`
 * as a category KEY) and is skipped — UNLESS it is exactly the bare word
 * "Accommodation" or "Transportation" sitting in a label-bearing attribute
 * (`label:`, `title=`, `pageTitle=`) or as a JSX text node: a label with
 * nothing else in it, and the sidebar had two of those. The same bare word
 * as a component key (`"Accommodation": Accommodation` in pages.config.js,
 * the route-collision set in App.jsx) is an identifier nobody reads.
 *
 * BOTH CASES ARE IN SCOPE. "Accommodation" as a page title and "accommodation
 * options" as its subtitle are the same word doing the same job; a guard
 * that only read the capital would have passed the subtitle. The one place
 * the lowercase word means something else — "guests will appreciate this
 * accommodation" in Considerations, where it means consideration, not a
 * hotel — is allowlisted by its phrase, with that reason.
 *
 * WHAT IS NOT IN SCOPE. The category KEY `transportation` (budget, vendor,
 * schedule) is a stored value and stays; its LABEL is "Transport" everywhere
 * the dashboard already agreed on one (budgetCategories.js, Vendors.jsx,
 * scheduleEvents.js), and the forms that had drifted to "Transportation"
 * now match their siblings. "Getting here" is a page a guest reads, not a
 * spend category. A couple's own typed content lives in Base44, not in this
 * tree, and is never rewritten.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');

const WORD = /\b(accommodations?|transportation)\b/i;
const BARE_LABEL = /^(Accommodations?|Transportation)$/;
// What must sit just before a bare word for it to be a label rather than a
// key. Case-sensitive on purpose: `currentPageName="Accommodation"` is a
// component key, and `Name` does not match `name`.
const LABEL_ATTR = /\b(label|title|pageTitle|subtitle|heading|placeholder|categoryLabel)\s*[:=]\s*$/;

/**
 * Phrases where the word is not the section. Each entry is a substring of
 * the offending literal and carries its reason; an entry without a reason
 * is the guard being silenced.
 */
const ALLOWLIST_SUBSTRINGS = [
  // Considerations › dietary: "accommodation" here means consideration
  // shown to a guest, not a place to sleep.
  'will appreciate this accommodation',
  // Ava's tool contract enumerates the STORED category keys the model must
  // send back; `transportation` is the key, not a label anyone reads.
  'set_budget_allocation needs category (one of',
];

/** Files whose every literal is a stored key or a model contract, not copy. */
const NOT_COPY = new RegExp([
  '^src/lib/entityFields\\.generated\\.js$',
  // Ava's request grammar: pipe-separated category keys inside a template.
  '^src/lib/avaRequest\\.js$',
].join('|'));

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === 'node_modules') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(e)) out.push(p);
  }
  return out;
}

function stripComments(src) {
  return src
    // Newlines kept, so a reported line number is the file's own.
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
    .split('\n')
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? '' : l))
    // A trailing `// note` after code, when the tail holds no quote that
    // could be the inside of a string.
    .map((l) => l.replace(/\s\/\/[^'"`]*$/, ''))
    .join('\n');
}

/**
 * Every string literal and JSX text node: its line, whether it is a JSX
 * node, and what sat immediately before it on its line.
 */
function userFacingText(src) {
  const out = [];
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  // A JSX text node may carry a one-level interpolation: 'Finding transport in {city}…'.
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`|>((?:[^<>{}]|\{[^{}<>]*\})+)</g;
  let m;
  while ((m = re.exec(src))) {
    const text = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (!text || !text.trim()) continue;
    // A `>` and a `<` on different statements are not a text node. Two
    // adjacent JSX-returning arms —
    //
    //   case 'a': return <A back={back} />;
    //   case 'b': return <B kind="accommodation" />;
    //
    // put a `>` at the end of one line and a `<` at the start of the next,
    // and the alternation above happily spans them, capturing
    // `";\n case 'b': return "` — source code, read as prose, holding a word
    // this guard looks for. It cost nothing yet only because no file in the
    // tree has that shape; it would have fired on the first one that did.
    // Real JSX text carries none of these.
    if (m[4] !== undefined && /[;]|=>|\/>|\breturn\b/.test(text)) continue;
    const before = src.slice(src.lastIndexOf('\n', m.index) + 1, m.index);
    out.push({ text: text.trim(), line: lineOf(m.index), jsx: m[4] !== undefined, before });
  }
  return out;
}

/** Is this something a person reads, holding the word? */
function isOffence(t) {
  if (!WORD.test(t.text)) return false;
  if (/\s/.test(t.text)) return true;
  return BARE_LABEL.test(t.text) && (t.jsx || LABEL_ATTR.test(t.before));
}

function offenders() {
  const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'api'))]
    .map((p) => p.replace(ROOT + '/', ''))
    .filter((p) => !NOT_COPY.test(p));
  const hits = [];
  for (const rel of files) {
    const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    for (const t of userFacingText(src)) {
      if (!isOffence(t)) continue;
      if (ALLOWLIST_SUBSTRINGS.some((s) => t.text.includes(s))) continue;
      hits.push(`${rel}:${t.line}: ${t.text.length > 70 ? t.text.slice(0, 67) + '…' : t.text}`);
    }
  }
  return hits;
}

export async function runStayGettingHere() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Stay and Getting here — the formal words are gone from every surface:\n');

  const hits = offenders();
  check('no user-facing "Accommodation" or "Transportation" survives outside owner-typed content',
    hits.length === 0,
    hits.length ? `${hits.length} found:\n           ` + hits.join('\n           ') : 'none');

  // The instrument must still see the shape it exists to catch: a control
  // literal, a control JSX node, and a bare label all trip it, and a bare
  // key does not.
  const probe = (s) => userFacingText(stripComments(s)).filter(isOffence).length;
  check('  the probe catches a prose literal', probe(`const a = 'Book your accommodation early';`) === 1, '1 hit');
  check('  the probe catches a JSX text node', probe(`<p>\n  Transportation options\n</p>`) === 1, '1 hit');
  check('  the probe catches a JSX text node with an interpolation', probe(`<p>Finding transportation in {city}...</p>`) === 1, '1 hit');
  check('  the probe catches a bare label', probe(`label: "Accommodation",\n<X title="Transportation" />`) === 2, '2 hits');
  check('  the probe skips a stored key and a route', probe(`v.category === 'transportation'; go('/accommodation'); createPageUrl("GuestSuiteAccommodation")`) === 0, '0 hits');
  check('  the probe skips a component key', probe(`"Accommodation": Accommodation,\nconst X = new Set(['Accommodation']);\n<L currentPageName="Accommodation">`) === 0, '0 hits');
  // The shape that would have fired on the first file to carry it: two
  // adjacent JSX-returning switch arms, the second naming a protected route key.
  check('  the probe does not read two adjacent JSX arms as one text node',
    probe(["case 'good-to-know': return <GoodToKnowContainer back={back} />;",
           "case 'suite-accommodation': return <SuitePlacesContainer kind=\"accommodation\" />;"].join('\n')) === 0, '0 hits');
  check('  the probe skips a comment', probe(`// the Accommodation page\n/* Transportation */`) === 0, '0 hits');

  // The two names the ruling chose are what the sidebar and the builder say.
  const sidebar = readFileSync(join(ROOT, 'src/components/layout/AnimatedSidebar.jsx'), 'utf8');
  const stayCount = (sidebar.match(/label:\s*"Stay"/g) || []).length;
  const hereCount = (sidebar.match(/label:\s*"Getting here"/g) || []).length;
  check('  the sidebar names both sections Stay (On the day, Guest suite)', stayCount === 2, `${stayCount} of 2`);
  check('  the sidebar names both sections Getting here (On the day, Guest suite)', hereCount === 2, `${hereCount} of 2`);

  const site = readFileSync(join(ROOT, 'src/components/guest-website/WeddingWebsiteNav.jsx'), 'utf8');
  check('  the live site still says Stay and Getting here',
    /label:\s*'Stay'/.test(site) && /label:\s*'Getting here'/.test(site), 'unchanged');

  return results;
}
