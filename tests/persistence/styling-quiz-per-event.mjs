/**
 * The guest styling quiz is per event, and it knows whose wedding it is.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 10: "The guest styling quiz is global and assumes a suit and
 * a dress. It becomes per event, fed that event's dress-code pills plus the
 * theme's culture and faith answers, with Ava writing the guidance. A Hindu
 * ceremony followed by a cocktail reception gets two different answers."
 *
 * ── WHAT "GLOBAL" MEANT, PRECISELY ─────────────────────────────────────────
 *
 * The prompt read `weddingDetails.mainCeremony?.dressCode` — ONE event's dress
 * code — and never read theme.culture or theme.faith at all. A guest attending
 * a Hindu ceremony and a cocktail reception was styled once, against the
 * ceremony's dress code, with nothing in the prompt that could have told the
 * model either half of that sentence was true. The reception's own dress code
 * was in the record and unread; so were the couple's faith and heritage.
 *
 * The rules-based questionnaire already asked which events a guest was
 * attending — but it is opt-in and off by default, so almost nobody saw it.
 * The DEFAULT quiz is the one that needed this.
 *
 * ── THE HALF THAT STOPPED ──────────────────────────────────────────────────
 *
 * The first half of item 10 — dress code as a multi-select of pills plus a
 * notes field on the event form — needs a SCHEMA CHANGE.
 * WeddingDetails.jsonc declares mainCeremony.dressCode / reception.dressCode /
 * each custom event's dressCode as `{ "type": "string" }`, with nowhere to put
 * either a list or the notes beside it, and Base44 silently drops undeclared
 * fields. That is a stop condition for this run: it is reported, not worked
 * around, and not faked into the string.
 *
 * What is built here reads whatever the dress code is TODAY — free text — and
 * dressCodeLine() already accepts an array, so a list of pills slots in
 * without the prompt changing shape.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PAGE = strip(read('src/components/guest-website/pages/WeddingStylePage.jsx'));

const WEDDING = {
  weddingDate: '2027-07-03',
  mainCeremony: { venueName: 'The temple', address: 'Colombo, Sri Lanka', dressCode: 'Traditional wear' },
  reception: { venueName: 'The Terrace', dressCode: 'Cocktail' },
  theme: {
    aesthetic: ['Classic'], atmosphere: ['Big party'], setting: 'Indoor',
    culture: ['Sri Lankan'], faith: 'Hindu',
  },
};

export async function runStylingQuizPerEvent() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest styling quiz — one answer per event, and it knows the wedding:\n');

  let lib = {};
  try { lib = await import('../../src/lib/stylingQuizPrompt.js'); } catch { /* reported below */ }
  const build = lib.buildStylingQuizPrompt;
  check('the prompt is a module, not a template literal inside a page',
    typeof build === 'function', 'stylingQuizPrompt.js');

  // ── The page ──────────────────────────────────────────────────────────────
  check('the page asks which events the guest is coming to',
    /Which of these are you coming to\?/.test(PAGE), 'the step exists');
  check('  and only when there is a choice to make',
    /attendingIds === null && events\.length > 1/.test(PAGE), 'one event asks nobody');
  check('  each option shows that event’s own dress code',
    /e\.dressCode \? e\.dressCode : 'No dress code given'/.test(PAGE), 'per-option');
  check('the page renders a card per event',
    /results\.perEvent/.test(PAGE) && /Event by event/.test(PAGE), 'perEvent rendered');
  check('the page no longer builds the prompt itself',
    !/You are a wedding outfit stylist\. Generate outfit recommendations/.test(PAGE)
      && /buildStylingQuizPrompt\(/.test(PAGE),
    'one prompt, in one place');
  check('  and no longer reads only the ceremony’s dress code',
    !/weddingDetails\.mainCeremony\?\.dressCode/.test(PAGE), 'every event');

  // ── The stop, recorded where it happened ──────────────────────────────────
  const SCHEMA = read('base44/entities/WeddingDetails.jsonc');
  check('dress code is still a plain string in the schema — the pills half is blocked',
    /"dressCode":\s*\{\s*"type":\s*"string"/.test(SCHEMA), 'no field for a list or its notes');

  // THE PAGE CHECKS RAN FIRST ON PURPOSE. Without the module there is no
  // prompt to assert on, but the page is still readable — and a guard that
  // reported one failure and stopped would say far less about what is wrong
  // than one that names every part of the ruling that is not met yet.
  if (typeof build !== 'function') return results;

  const attending = [
    { name: 'Ceremony', date: '2027-07-03', venue: 'The temple', dressCode: 'Traditional wear' },
    { name: 'Reception', date: '2027-07-03', venue: 'The Terrace', dressCode: 'Cocktail' },
  ];
  const prompt = build({ weddingDetails: WEDDING, coupleNames: 'Ada & Alan', attending, answers: { gender: 'Woman' }, season: 'Summer' });

  // ── Every attending event, with ITS OWN dress code ────────────────────────
  check('the ceremony is in the prompt with its own dress code',
    /Ceremony — .*dress code: Traditional wear/.test(prompt), 'Traditional wear');
  check('  and the reception with a DIFFERENT one',
    /Reception — .*dress code: Cocktail/.test(prompt), 'Cocktail');
  check('  so two events with two dress codes can get two answers',
    /Answer EACH event separately/.test(prompt), 'the instruction is explicit');

  // ── Culture and faith, which it never read before ─────────────────────────
  check('the couple’s culture reaches the prompt', /Cultures and traditions: Sri Lankan/.test(prompt), 'culture');
  check('  and their faith', /Faith: Hindu/.test(prompt), 'faith');
  check('  and the model is told to let them lead rather than assume',
    /Never assume a suit and a dress are the only two answers/.test(prompt), 'the ruling, in the prompt');

  // ── Only what the guest said they were attending ──────────────────────────
  const one = build({ weddingDetails: WEDDING, coupleNames: 'Ada & Alan', attending: [attending[0]], answers: {} });
  check('an event the guest is not attending is not in the prompt',
    /Ceremony/.test(one) && !/Reception/.test(one), 'ceremony only');

  // ── An absent dress code is named, not invented ───────────────────────────
  const bare = build({ weddingDetails: WEDDING, coupleNames: 'Ada & Alan', attending: [{ name: 'Welcome drinks' }], answers: {} });
  check('an event with no dress code says so rather than borrowing one',
    /Welcome drinks — dress code: not stated/.test(bare), 'not stated');
  check('  and the model is told to say it is advising from the venue instead',
    /An absent dress code means/.test(bare), 'honest about it');

  // ── An unset theme is omitted, not guessed ────────────────────────────────
  const plain = build({ weddingDetails: { theme: {} }, coupleNames: 'Ada & Alan', attending, answers: {} });
  check('a wedding with no culture or faith carries neither line',
    !/Cultures and traditions:/.test(plain) && !/Faith:/.test(plain), 'omitted, not invented');

  // ── Pills slot in without the prompt changing shape ───────────────────────
  const pills = build({
    weddingDetails: WEDDING, coupleNames: 'Ada & Alan', answers: {},
    attending: [{ name: 'Ceremony', dressCode: ['Traditional wear', 'Beach formal'] }],
  });
  check('a LIST of dress-code pills reads as well as free text does',
    /dress code: Traditional wear, Beach formal/.test(pills), 'array accepted today');

  // ── The answer shape ──────────────────────────────────────────────────────
  const schema = lib.stylingQuizSchema();
  check('the model is asked for one entry per event', !!schema.properties.perEvent, 'perEvent');
  check('  and perEvent is required, so a global answer does not satisfy it',
    (schema.required || []).includes('perEvent'), (schema.required || []).join(', '));
  check('  each entry names its event', (schema.properties.perEvent.items.required || []).includes('event'), 'event');


  return results;
}
