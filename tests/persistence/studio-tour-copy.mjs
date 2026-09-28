/**
 * The tour says what the owner wrote, and this reads his document to check.
 *
 * ── WHY IT READS THE GOAL FILE ─────────────────────────────────────────────
 *
 * A copy guard written from the same source it checks is a tautology. If the
 * expected strings were typed into this file from src/lib/studioTour.js, then a
 * transcription error in the tour would be copied into the guard and the pair
 * would agree with each other and with nothing else. That is not hypothetical
 * here: accepted-copy-landed.mjs exists because 19 accepted lines were scoped
 * into a wave and shipped WITHOUT them, and the landing check that should have
 * caught it could not, because the accepted set lived outside the repository.
 *
 * So goals/2026-09-28-studio-tour.md is the source, it is committed, and this
 * parses the nine chapters out of it and compares field by field.
 *
 * PRE-MORTEM, what would make this pass while the tour is wrong:
 *   - The goal file is edited to match the code. NOT guarded by a test. It is
 *     guarded by the file being a record of an owner decision, in version
 *     control, where a change to it is a reviewable diff. Same protection
 *     accepted-copy-landed.mjs relies on, and stated there too.
 *   - A chapter's copy lands on the wrong chapter. GUARDED: each field is
 *     compared against its own chapter, matched by order and by title.
 *   - A chapter is dropped from the tour. GUARDED: the count, and the key list.
 *   - The tour grows a chapter the owner never wrote. GUARDED, same check.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const GOAL = 'goals/2026-09-28-studio-tour.md';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/**
 * The nine chapters as the goal document states them.
 *
 * Parsed from the numbered blocks under "## Chapters and copy", scoped to that
 * section so a line elsewhere in the document cannot satisfy a field.
 */
function chaptersFromGoal(md) {
  const start = md.indexOf('## Chapters and copy');
  const end = md.indexOf('\n## ', start + 1);
  const section = md.slice(start, end === -1 ? undefined : end);
  const out = [];
  // Each block opens with "<n>. <name>" at the start of a line.
  const blocks = section.split(/\n(?=\d+\.\s)/).slice(1);
  for (const block of blocks) {
    const lines = block.split('\n');
    const heading = /^(\d+)\.\s+(.*)$/.exec(lines[0]);
    if (!heading) continue;
    const field = (name) => {
      const line = lines.find((l) => l.startsWith(`${name}: `));
      return line ? line.slice(name.length + 2).trim() : null;
    };
    out.push({
      number: Number(heading[1]),
      name: heading[2].trim(),
      title: field('Title'),
      lead: field('Lead'),
      body: field('Body'),
      tip: field('Tip'),
      tryIt: field('Try it'),
    });
  }
  return out;
}

/** The finale card, also from the document. */
function finaleFromGoal(md) {
  const line = /Finale card: "([^"]+)"\s*Button: "([^"]+)"/.exec(md);
  return line ? { line: line[1], buttonLabel: line[2] } : null;
}

export async function runStudioTourCopy() {
  const r = [];
  const check = (n, ok, d) => r.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Studio tour copy, read from the owner\'s own goal document:\n');

  let md = '';
  try { md = readFileSync(resolve(ROOT, GOAL), 'utf8'); } catch { /* reported next */ }
  check(`${GOAL} is committed and readable`, md.length > 0, `${md.length} bytes`);
  if (!md) return r;

  let tour = null;
  try { tour = await import('../../src/lib/studioTour.js'); }
  catch (err) { check('src/lib/studioTour.js imports', false, err.message); return r; }
  check('src/lib/studioTour.js imports with no browser dependency', true, 'pure data');

  const expected = chaptersFromGoal(md);
  check('nine chapters parse out of the document', expected.length === 9, `${expected.length} parsed`);
  check('  and the tour carries nine', tour.CHAPTERS.length === 9, `${tour.CHAPTERS.length} in the tour`);

  // FIELD BY FIELD, CHAPTER BY CHAPTER.
  for (let i = 0; i < Math.min(expected.length, tour.CHAPTERS.length); i += 1) {
    const want = expected[i];
    const got = tour.CHAPTERS[i];
    check(`chapter ${i} (${want.name}): title verbatim`, got.title === want.title,
      got.title === want.title ? want.title : `want ${JSON.stringify(want.title)} got ${JSON.stringify(got.title)}`);
    check(`  lead verbatim`, got.lead === want.lead,
      got.lead === want.lead ? 'ok' : `want ${JSON.stringify(want.lead)} got ${JSON.stringify(got.lead)}`);
    check(`  body verbatim`, got.body === want.body,
      got.body === want.body ? 'ok' : `want ${JSON.stringify(want.body)} got ${JSON.stringify(got.body)}`);
    check(`  tip verbatim`, got.tip === want.tip,
      got.tip === want.tip ? 'ok' : `want ${JSON.stringify(want.tip)} got ${JSON.stringify(got.tip)}`);
  }

  // THE NUMBERS LINE, quoted inside chapter 3's "Try it" in the document.
  const guests = tour.chapterByKey('guests');
  const wantNumbers = '{n} guests, {m} replied so far.';
  check('chapter 3 carries the personalised lead the document quotes',
    guests?.leadWithNumbers === wantNumbers, JSON.stringify(guests?.leadWithNumbers));
  check('  and the document does quote it', md.includes(`"${wantNumbers}"`), 'in Try it');

  // ── the finale card ──────────────────────────────────────────────────────
  const finale = finaleFromGoal(md);
  check('the finale card parses out of the document', !!finale, JSON.stringify(finale));
  if (finale) {
    check('  its line is verbatim', tour.FINALE.line === finale.line, JSON.stringify(tour.FINALE.line));
    check('  its button is verbatim', tour.FINALE.buttonLabel === finale.buttonLabel, JSON.stringify(tour.FINALE.buttonLabel));
    check('  and it lands on Daily update', tour.FINALE.to === '/DailyUpdate', tour.FINALE.to);
  }

  // ── the dash ruling, over every string the tour holds ────────────────────
  const strings = [
    ...tour.CHAPTERS.flatMap((c) => [c.title, c.lead, c.body, c.tip, c.leadWithNumbers, c.tryIt?.label]),
    tour.FINALE.line, tour.FINALE.buttonLabel,
  ].filter((s) => typeof s === 'string');
  const dashed = strings.filter((s) => s.includes(EM_DASH) || s.includes(EN_DASH));
  check('no em dash or en dash in any tour string', dashed.length === 0,
    dashed.length ? dashed.join(' | ') : `${strings.length} strings clean`);

  // ── and no emoji, per the standing presentation rule ─────────────────────
  // U+FE0F is the tell, per CLAUDE.md: a variation selector means the glyph
  // renders in the system emoji font, outside our type control.
  const emoji = strings.filter((s) => /[️]/.test(s) || /[\u{1F300}-\u{1FAFF}]/u.test(s));
  check('no emoji in any tour string', emoji.length === 0,
    emoji.length ? emoji.join(' | ') : 'presentation, not a block range');

  // ── the structure the tour needs and the document does not state ─────────
  check('every chapter key is unique',
    new Set(tour.CHAPTER_KEYS).size === tour.CHAPTER_KEYS.length, tour.CHAPTER_KEYS.join(', '));
  const routes = tour.CHAPTERS.flatMap((c) => c.routes);
  check('no route is claimed by two chapters',
    new Set(routes).size === routes.length,
    routes.filter((x, i) => routes.indexOf(x) !== i).join(', ') || `${routes.length} routes, all distinct`);
  check('progress keys are prefixed, so they cannot collide with panel dismissals',
    tour.chapterProgressKey('welcome') === 'tour:welcome', tour.chapterProgressKey('welcome'));
  check('every recording target sits inside the brief\'s 8 to 20 seconds',
    tour.CHAPTERS.every((c) => c.seconds >= 8 && c.seconds <= 20),
    tour.CHAPTERS.map((c) => c.seconds).join(', '));
  // THE TIME IS ROUNDED UP. A tour that says two minutes and takes three has
  // lied to someone deciding whether they have time for it.
  check('the time label rounds up', tour.totalTimeLabel(61) === 'about 2 minutes', tour.totalTimeLabel(61));
  check('  and reads naturally at a minute', tour.totalTimeLabel(40) === 'about a minute', tour.totalTimeLabel(40));

  // ── personalisation never invents ────────────────────────────────────────
  const named = tour.resolveChapter(tour.chapterByKey('welcome'), { coupleFirstNames: 'Ada & Alan' });
  check('the welcome chapter uses the couple\'s names',
    named.title === 'Welcome to your studio, Ada & Alan.', named.title);
  // NO PLACEHOLDER WHERE A NAME GOES. src/lib/emailGreeting.js states the rule:
  // the product must not read its own database out loud.
  const nameless = tour.resolveChapter(tour.chapterByKey('welcome'), {});
  check('  and drops the clause when there is no name, rather than printing one',
    nameless.title === 'Welcome to your studio.', nameless.title);
  const withNumbers = tour.resolveChapter(tour.chapterByKey('guests'), { guestCount: 120, repliedCount: 64 });
  check('the guests chapter uses live numbers when they exist',
    withNumbers.lead === '120 guests, 64 replied so far.', withNumbers.lead);
  const zero = tour.resolveChapter(tour.chapterByKey('guests'), { guestCount: 0, repliedCount: 0 });
  check('  and keeps its own lead at zero, rather than saying "0 guests"',
    zero.lead === tour.chapterByKey('guests').lead, zero.lead);
  check('  the template is not left on the resolved chapter',
    !('leadWithNumbers' in withNumbers), 'consumers cannot render the raw braces');

  // ── resume ───────────────────────────────────────────────────────────────
  check('resume starts at the beginning when nothing is done',
    tour.nextUnfinishedChapterKey([]) === 'welcome', tour.nextUnfinishedChapterKey([]));
  check('  picks up after the completed ones',
    tour.nextUnfinishedChapterKey(['tour:welcome', 'tour:event-details']) === 'schedule',
    tour.nextUnfinishedChapterKey(['tour:welcome', 'tour:event-details']));
  check('  and reports null when the tour is finished',
    tour.nextUnfinishedChapterKey(tour.CHAPTER_KEYS.map(tour.chapterProgressKey)) === null, 'null');
  check('progress counts only tour keys',
    tour.completedCount(['panel:/Guests', 'tour:welcome']) === 1, 'a panel dismissal is not a chapter');

  // ── the "?" mapping ──────────────────────────────────────────────────────
  check('the "?" on the guest suite editor opens the publish chapter',
    tour.chapterKeyForRoute('/studio/guest-suite') === 'publish', tour.chapterKeyForRoute('/studio/guest-suite'));
  check('  longest match wins, so /studio still opens design studio',
    tour.chapterKeyForRoute('/studio') === 'design-studio', tour.chapterKeyForRoute('/studio'));
  check('  a page no chapter claims lands on welcome rather than nowhere',
    tour.chapterKeyForRoute('/nowhere') === 'welcome', tour.chapterKeyForRoute('/nowhere'));

  return r;
}
