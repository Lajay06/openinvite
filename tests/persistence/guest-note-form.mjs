/**
 * "A question for Ada & Alan?" — one form, two places, the owner's words.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Goal 2026-09-27 item 3: "One small form in two places: at the bottom of the
 * RSVP page after a reply is submitted, and at the bottom of Good to know.
 * Heading: 'A question for {coupleFirstNames}?' Fields: name, email, message
 * (1000 characters). Button: 'Send note'. After sending: 'Sent.
 * {coupleFirstNames} will reply to {email}.' Prefill name and email when the
 * guest arrived by token. Editors show what guests see — no note form appears
 * in any editor that does not appear on the site."
 *
 * ── WHY THE COPY IS PINNED CHARACTER FOR CHARACTER ─────────────────────────
 *
 * Because it is the owner's, quoted verbatim in the goal, and a later sweep
 * has form: capri's "This is the bit where you say yes!" survives only because
 * a ruling says so. These three sentences now have the same protection. The
 * sent line in particular carries the guest's own address on purpose — a guest
 * who mistyped it finds out while they still remember what they typed — so a
 * well-meaning edit dropping "{email}" would remove the whole point of it.
 *
 * ── WHAT IS ACTUALLY AT RISK ───────────────────────────────────────────────
 *
 * A form on a surface that cannot post. GuestNoteForm posts to
 * /api/guest-note-submit with a slug, and the builder canvas renders the same
 * page components with a wedding that may have no slug at all — so the guard
 * pins the `if (!slug) return null` that keeps an unpostable form from ever
 * being drawn. That is also the mechanism behind the editor rule: an editor
 * showing the page shows exactly what a guest on an unpublished site sees.
 *
 * And a form only one of the two surfaces got. Both placements are asserted
 * here and both are RENDERED at 390 and 1440 by
 * scripts/test-guest-note-render.mjs, which drives the RSVP one through a real
 * tap-yes-and-submit rather than seeding the done step.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const FORM = strip(read('src/components/guest-website/GuestNoteForm.jsx'));
const GTK = strip(read('src/components/guest-website/pages/WeddingGoodToKnowPage.jsx'));
const RSVP = strip(read('src/components/rsvp/RSVPPage.jsx'));
const PREVIEW = strip(read('src/components/website-builder/RealWebsitePreview.jsx'));
const CI = read('.github/workflows/ci.yml');
const PKG = read('package.json');

/** Every editor panel that edits Good to know or the RSVP content. */
const EDITORS = [
  'src/components/studio/guest-suite/PoliciesTab.jsx',
  'src/pages/GuestSuitePolicies.jsx',
  'src/components/website-builder/WBRightPanel.jsx',
  'src/components/website-builder/WBLeftPanel.jsx',
];

export async function runGuestNoteForm() {
  const r = [];
  const check = (n, ok, d) => r.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Send a note — one form, two places, the owner\'s words:\n');

  check('the form is one component, not a copy per surface',
    FORM.length > 0, 'src/components/guest-website/GuestNoteForm.jsx');

  // ── the copy, verbatim ───────────────────────────────────────────────────
  check('the heading is the owner\'s sentence',
    FORM.includes('A question for {firstNames}?'), 'A question for {coupleFirstNames}?');
  check('  and it uses FIRST names, not the full ones',
    /coupleFirstNames\(weddingDetails/.test(FORM) && !/coupleDisplayName/.test(FORM),
    'coupleFirstNames');
  check('the button says "Send note"', FORM.includes("'Send note'"), 'exact');
  check('the sent line is the owner\'s sentence',
    FORM.includes('Sent. {firstNames} will reply to {sentTo}.'),
    'Sent. {coupleFirstNames} will reply to {email}.');
  // THE ADDRESS IN THE SENTENCE IS THE ONE THAT WAS SENT. Reading the live
  // input would let the sentence change under a guest who kept typing.
  check('  and the address it names is the one that was submitted',
    /setSentTo\(address\)/.test(FORM) && !/will reply to \{email\}/.test(FORM),
    'captured at submit');

  // ── the three fields and the cap ─────────────────────────────────────────
  check('there are exactly three fields — name, email, message',
    (FORM.match(/<input/g) || []).length === 2 && (FORM.match(/<textarea/g) || []).length === 1,
    '2 inputs + 1 textarea');
  check('the message is capped at 1000 characters', /MAX_MESSAGE = 1000/.test(FORM), '1000');
  check('  and the box itself stops there, not just the server',
    /maxLength=\{MAX_MESSAGE\}/.test(FORM), 'maxLength in the markup');
  check('  with the remaining count visible before a guest hits it',
    /MAX_MESSAGE - message\.length/.test(FORM), 'live counter');
  check('the email field is a real email input',
    /type="email"/.test(FORM), 'type=email');
  check('all three are required before the button enables',
    /!!name\.trim\(\) && emailLooksValid && !!message\.trim\(\)/.test(FORM), 'canSubmit');

  // ── the endpoint, and the protections the guest side owes it ─────────────
  check('it posts to the guest-note endpoint',
    FORM.includes("fetch('/api/guest-note-submit'"), '/api/guest-note-submit');
  check('  carrying the wedding slug', /weddingSlug: slug/.test(FORM), 'server stamps the rest');
  check('  the cached website password, so a gated site still works',
    /password: getCachedWeddingPassword\(slug\)/.test(FORM), 'the gate');
  check('  and a Turnstile token', /turnstileToken: tsTokenRef\.current/.test(FORM), 'same gate as every guest form');
  check('a consumed Turnstile token is reset after a refusal',
    /turnstileRef\.current\?\.reset\(\)/.test(FORM), 'or the retry fails on the wrong thing');

  // ── no form where it cannot post ─────────────────────────────────────────
  check('no slug, no form — an unpostable form is never drawn',
    /if \(!slug\) return null;/.test(FORM), 'the editor rule, as a mechanism');

  // ── both placements ──────────────────────────────────────────────────────
  check('Good to know renders it at the bottom',
    /import GuestNoteForm from '\.\.\/GuestNoteForm'/.test(GTK) && /<GuestNoteForm/.test(GTK),
    'placement 1');
  check('  with nothing prefilled, because there is no token to read',
    !/prefill/.test(GTK), 'no guess');
  check('the RSVP page renders it in the done step',
    /<GuestNoteForm/.test(RSVP), 'placement 2');
  check('  prefilled from the token the guest arrived on',
    /prefillName=\{guest\?\.name \|\| ''\}/.test(RSVP) && /prefillEmail=\{guest\?\.email \|\| ''\}/.test(RSVP),
    'name and address');
  // AFTER THE REPLY, NOT BESIDE IT. The form must sit inside the done branch,
  // so its position in the file is the property: after `if (step === 'done')`
  // and before the polls step that follows.
  const doneAt = RSVP.indexOf("if (step === 'done')");
  const formAt = RSVP.indexOf('<GuestNoteForm');
  const pollsAt = RSVP.indexOf("if (step === 'polls')");
  check('  and only after a reply is in, never on the form itself',
    doneAt > -1 && formAt > doneAt && pollsAt > formAt,
    `done@${doneAt} form@${formAt} polls@${pollsAt}`);
  check('  exactly once on that page', (RSVP.match(/<GuestNoteForm/g) || []).length === 1, 'one form');

  // ── editors show what guests see ─────────────────────────────────────────
  for (const f of EDITORS) {
    const src = strip(read(f));
    check(`no note form of its own in ${f.split('/').pop()}`,
      src.length > 0 && !/GuestNoteForm/.test(src), 'the page component owns it');
  }
  // AND THE CANVAS CAN ACTUALLY SHOW THE PAGE. The builder nav offered Good to
  // know and the page map did not list it, so picking it rendered the HOME page
  // — an editor showing something no guest sees, which is the same rule read
  // the other way round.
  check('the builder canvas renders Good to know, rather than falling back to home',
    /'good-to-know': WeddingGoodToKnowPage/.test(PREVIEW), 'listed in PAGE_COMPONENTS');

  // ── the render pass is registered, or it never runs ──────────────────────
  check('the 390/1440 render pass has an npm script',
    /"test:guest-note-render"/.test(PKG), 'package.json');
  check('  and a CI lane that runs it',
    /npm run test:guest-note-render/.test(CI), 'ci.yml');

  return r;
}
