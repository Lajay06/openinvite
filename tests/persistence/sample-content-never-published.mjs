/**
 * tests/persistence/sample-content-never-published.mjs
 *
 * THE ASSERTION THAT MAKES SAMPLE CONTENT SAFE TO HAVE AT ALL.
 *
 * #576 shipped this failure by accident: our sentence, "We are overjoyed to
 * celebrate with you.", published to guests in the couple's own first person,
 * while the builder showed the identical sentence as a GREY PLACEHOLDER — the
 * convention for "an example". It reached guests by two separate routes, and
 * the second one (a draft default on `welcomeMessage`) was persistable, so a
 * couple's record could come to hold our words as genuinely theirs.
 *
 * A directory of sample copy is that same mechanism, deliberately, at scale.
 * These checks are what stop it becoming the same defect:
 *
 *   · a sample sentence must not ALSO be a live fallback anywhere in src/
 *     — that is #576's exact shape, and it is check 4
 *   · nothing a guest can reach may import the module — check 3
 *   · a sample must never look like a publishable record — checks 1 and 2
 *
 * BEHAVIOURAL WHERE IT CAN BE, STRUCTURAL WHERE IT MUST BE. Checks 1, 2 and 5
 * call the real function and assert what it returns. Checks 3 and 4 read the
 * source tree, because "no importer exists" and "this string appears nowhere
 * else" are statements about the tree that no runtime call can make.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSampleWedding, sampleUniverseIds, isSample } from '../../src/lib/sampleContent/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'src');
const SAMPLE_DIR = join(SRC, 'lib', 'sampleContent');

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : (/\.(jsx?|mjs)$/.test(f) ? [p] : []);
});

export async function runSampleContentNeverPublished() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Sample content — our words must never reach a guest as the couple\'s:\n');

  const ids = sampleUniverseIds();
  check('at least one universe has sample content', ids.length > 0, ids.join(', ') || 'none');

  // ── 1. A sample can never resolve to a real address ──────────────────────
  for (const id of ids) {
    const s = getSampleWedding(id);
    check(`${id}: carries no slug, so it resolves to no address`,
      s.slug === null || s.slug === undefined, `slug=${JSON.stringify(s.slug)}`);
    check(`${id}: websiteEnabled is false, so a mistaken save publishes nothing`,
      s.websiteEnabled === false, `websiteEnabled=${s.websiteEnabled}`);
  }

  // ── 2. A sample is identifiable as ours ──────────────────────────────────
  for (const id of ids) {
    const s = getSampleWedding(id);
    check(`${id}: marked __sample, so a surface can say so and a guard can tell`,
      isSample(s) === true, `__sample=${s.__sample}`);
  }
  check('a couple\'s own record does NOT read as a sample',
    isSample({ coupleNames: 'A & B' }) === false && isSample(null) === false,
    'isSample is a positive test, not a truthiness test');

  // ── 2b. THE MARK CANNOT REACH THE DATABASE ───────────────────────────────
  // Ruling (c): no is_sample field is ever STORED on a wedding record. A plain
  // key on a record-shaped object is one JSON.stringify away from a request
  // body, so the marker is non-enumerable and this is the assertion that says
  // so. Serializing is exactly what a save does.
  for (const id of ids) {
    const s = getSampleWedding(id);
    const serialized = JSON.stringify(s);
    check(`${id}: the sample marker survives no serialization, so it cannot be stored`,
      !serialized.includes('__sample') && !Object.keys(s).includes('__sample'),
      `${serialized.length} bytes, no __sample key`);
    check(`${id}:   and a spread copy — what a save path builds — drops it too`,
      ({ ...s }).__sample === undefined, 'spread drops the mark');
    check(`${id}:   while isSample still reads it in memory`,
      isSample(s) === true, '__sample readable, not enumerable');
  }

  // ── 2c. EVERY SAMPLE KEY IS A KEY THE PRODUCT ACTUALLY READS ─────────────
  // A guard on STRINGS cannot tell a key the product ignores from one it
  // renders. Three keys in the first version of this sample were invented from
  // the field name rather than read off the page — celebrationContent.custom-
  // Message, weddingPolicies.{enabled,text} and transport.notes — and every one
  // of them rendered nothing at all. That is the render harness's own
  // faq-instead-of-qna seed bug, repeated. These are the accessors, taken from
  // the pages that consume them.
  const READERS = [
    ['celebration events (ceremony/reception)', (w) => !!(w.mainCeremony?.venueName || w.reception?.venueName)],
    ['weddingPolicies -> visibleSections', (w) => Object.values(w.weddingPolicies || {}).some((p) => p?.display === true)],
    ['guestSuiteTransport.places', (w) => w.guestSuiteTransport?.places?.length > 0],
    ['accommodation.manualProperties', (w) => w.accommodation?.manualProperties?.length > 0],
    ['ourStoryContent.storyText', (w) => !!w.ourStoryContent?.storyText],
    ['homeContent.blocks', (w) => w.homeContent?.blocks?.length > 0],
    ['qna', (w) => w.qna?.length > 0],
    ['polls (isActive)', (w) => (w.polls || []).some((p) => p.isActive)],
  ];
  for (const id of ids) {
    const s = getSampleWedding(id);
    const empty = READERS.filter(([, read]) => !read(s)).map(([name]) => name);
    check(`${id}: every sampled section is one the guest pages actually read`,
      empty.length === 0, empty.length ? `renders nothing: ${empty.join(', ')}` : `${READERS.length} sections verified against their readers`);
  }

  // ── 2d. AND EVERY SAMPLED SECTION IS ON A PAGE THAT CAN BE REACHED ───────
  // Content the renderer reads is still invisible if its page refuses to
  // render. `polls` is the trap: stay/transport/music/good-to-know are unlocked
  // by MultiPageWeddingWebsite's subPageAvailability map, but polls has no
  // entry there, so enabledPages is the only route to it. Sample polls existed
  // for one commit on a page that returned "this invitation isn't available".
  // The mutual exclusion that made the SECOND wrong shape look right: a day
  // schedule is rendered ONLY when the record has no ceremony/reception events
  // (WeddingCelebrationPage: `!hasEvents && daySchedule.length > 0`). Carrying
  // both means carrying content no guest can ever see.
  for (const id of ids) {
    const s = getSampleWedding(id);
    const hasEvents = !!(s.mainCeremony?.venueName || s.reception?.venueName);
    const hasDaySchedule = (s.celebrationContent?.daySchedule || []).length > 0;
    check(`${id}: no day schedule that the presence of events would suppress`,
      !(hasEvents && hasDaySchedule),
      hasEvents ? 'events render; no competing daySchedule' : 'no events, daySchedule would render');
  }

  const NEEDS_ENABLED_PAGE = {
    polls: (w) => (w.polls || []).some((p) => p.isActive),
    faq: (w) => w.qna?.length > 0,
    registry: (w) => !!w.registryContent?.registryMessage,
    'our-story': (w) => !!w.ourStoryContent?.storyText,
    celebration: (w) => !!(w.mainCeremony?.venueName || w.reception?.venueName),
  };
  for (const id of ids) {
    const s = getSampleWedding(id);
    const enabled = s.enabledPages || [];
    const unreachable = Object.entries(NEEDS_ENABLED_PAGE)
      .filter(([page, has]) => has(s) && !enabled.includes(page))
      .map(([page]) => page);
    check(`${id}: every sampled section sits on a page enabledPages can reach`,
      unreachable.length === 0,
      unreachable.length ? `content with no reachable page: ${unreachable.join(', ')}` : `${enabled.length} pages enabled`);
  }

  // ── 3. Nothing a guest can reach imports it ──────────────────────────────
  // The guest site, the published-site routes and the server endpoints. If any
  // of these could import sample content, a bug could put it in front of a
  // guest, and no amount of care inside the module would prevent it.
  const GUEST_REACHABLE = /^(src\/components\/guest-website\/|src\/components\/rsvp\/|src\/pages\/Guest)/;
  const importers = walk(SRC)
    .filter((p) => !p.startsWith(SAMPLE_DIR))
    .filter((p) => /from\s+['"][^'"]*sampleContent/.test(readFileSync(p, 'utf8')))
    .map((p) => relative(ROOT, p).replace(/\\/g, '/'));
  const guestImporters = importers.filter((p) => GUEST_REACHABLE.test(p));
  check('nothing on a guest-reachable surface imports sample content',
    guestImporters.length === 0, guestImporters.join(', ') || 'no guest-side importer');
  console.log(`     (${importers.length} importer(s) total: ${importers.join(', ') || 'none yet — D1 ships the data, not a consumer'})`);

  // ── 4. #576's EXACT SHAPE: a sample string that is also a live default ────
  // Every sentence the sample actually CONTAINS, searched for across the rest
  // of src/. A hit means that string is both "an example" and something the
  // product can publish on its own — which is the defect, not a duplicate.
  //
  // WALKED FROM THE DATA, NOT SCRAPED FROM THE SOURCE. Two versions of this
  // check read the .js files with a regex for quoted strings, and both were
  // wrong in the same family: an apostrophe in prose opened a false literal,
  // and then a `{24,}` minimum let a match BEGIN on a closing quote, so a
  // single import line swallowed the rest of the file as one "sentence". The
  // second version reported a 4,000-character fragment as a leak. Reading the
  // object the product would actually render needs no parser and cannot
  // desynchronize — the strings are the strings.
  const collectStrings = (v, out = []) => {
    if (typeof v === 'string') { if (/\s/.test(v) && v.length >= 24) out.push(v); return out; }
    if (Array.isArray(v)) { v.forEach((x) => collectStrings(x, out)); return out; }
    if (v && typeof v === 'object') { Object.values(v).forEach((x) => collectStrings(x, out)); return out; }
    return out;
  };
  const sentences = [...new Set(ids.flatMap((id) => collectStrings(getSampleWedding(id))))];
  const others = walk(SRC).filter((p) => !p.startsWith(SAMPLE_DIR));
  const leaked = [];
  for (const p of others) {
    const body = readFileSync(p, 'utf8');
    for (const s of sentences) {
      if (body.includes(s)) leaked.push(`${relative(ROOT, p)}: "${s.slice(0, 44)}…"`);
    }
  }
  check(`no sample sentence is also a live string elsewhere in src/ (${sentences.length} checked)`,
    leaked.length === 0, leaked.join('\n      ') || 'every sample sentence exists only as a sample');

  // ── 5. The date is resolved at read time, not frozen in the source ───────
  // A literal date in the file ages into the past and a countdown quietly
  // starts rendering a negative number long after anyone reads this.
  const past = getSampleWedding(ids[0], { now: new Date('2020-01-15T00:00:00Z') });
  const future = getSampleWedding(ids[0], { now: new Date('2030-01-15T00:00:00Z') });
  check('the sample date follows the clock rather than being frozen',
    past.weddingDate !== future.weddingDate && past.weddingDate.startsWith('2020'),
    `${past.weddingDate} vs ${future.weddingDate}`);
  check('  and is always ahead of the clock it was read against',
    new Date(future.weddingDate) > new Date('2030-01-15T00:00:00Z'), future.weddingDate);

  // ── 6. A caller cannot poison the sample for the next caller ─────────────
  const a = getSampleWedding(ids[0]);
  a.coupleNames = 'MUTATED';
  a.homeContent.blocks.length = 0;
  const b = getSampleWedding(ids[0]);
  check('each read returns a fresh copy, so one consumer cannot corrupt the next',
    b.coupleNames !== 'MUTATED' && b.homeContent.blocks.length > 0,
    `${b.coupleNames}, ${b.homeContent.blocks.length} block(s)`);

  // ── 7. The house rules, on copy we author ────────────────────────────────
  // Sample copy is copy we write for publication, so the repo's own rules bind
  // it: no emoji presentation, and no exclamation marks (this is chrome-adjacent
  // — it is OUR voice standing in for a couple's, not a couple's own register).
  const emoji = sentences.filter((s) => /\uFE0F/.test(s));
  check('no emoji-presentation glyphs in sample copy',
    emoji.length === 0, emoji.join(' | ') || 'none (U+FE0F is the tell)');
  const bangs = sentences.filter((s) => s.includes('!'));
  check('no exclamation marks in sample copy',
    bangs.length === 0, bangs.join(' | ') || 'none');

  // Poll options can carry an `emoji`. A couple's own choice would be exempt as
  // artwork; copy WE author is not, so none is written here.
  for (const id of ids) {
    const withEmoji = (getSampleWedding(id).polls || []).filter((p) => p.emoji);
    check(`${id}: no emoji on sample polls — this is our copy, not the couple's`,
      withEmoji.length === 0, withEmoji.map((p) => p.title).join(', ') || 'none');
  }

  return results;
}
