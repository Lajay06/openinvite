/**
 * tests/persistence/gifting-v2-pages.mjs
 *
 * GIFTING V2, ITEM 1: THE GIVER'S SEVEN PAGES, BEHIND THE FLAG.
 * goals/2026-10-11-gifting-v2.md.
 *
 * What a source read can hold: the copy is the goal's, verbatim; the flag is
 * off on the production host; the page writes nothing to PlanGift (the draft
 * lives in sessionStorage until Stripe confirms); the onboarding components
 * are consumed, with only additive props; the email the preview shows is the
 * template module's own; and nothing a Pro giver or couple reads names the
 * Guest Suite, RSVP, song requests, the registry or a website.
 *
 * The byte-identical claim for every existing consumer of the shared
 * components was proved at build time by rendering each one to static markup
 * before and after (printed in the PR body); here each new prop is pinned as
 * optional with an unchanged default.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

export async function runGiftingV2Pages() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2, the giver\'s pages:\n');

  const lib = await import('../../src/lib/giftingV2.js');
  const tpl = await import('../../src/lib/giftEmailTemplate.js');
  const goal = read('goals/2026-10-11-gifting-v2.md');
  const page = stripComments(read('src/pages/GiftV2.jsx'));

  // ── the flag ────────────────────────────────────────────────────────────
  check('the flag is off where there is no build flag, no dev server and no preview host', lib.isGiftingV2On() === false, 'production stays on v1');
  check('  and the page sends the visitor to /gifting when it is off', /if \(!on\) return <Navigate to="\/gifting" replace \/>/.test(page));
  const app = read('src/App.jsx');
  check('/gift is routed, public, beside the v1 page that keeps working',
    /<Route path="\/gift" element={<GiftV2 \/>} \/>/.test(app) && /'\/gift',/.test(app) && /<Route path="\/gifting" element={<Gifting \/>} \/>/.test(app));

  // ── nothing reaches PlanGift before payment ─────────────────────────────
  check('the page writes nothing to PlanGift or any entity', !/PlanGift|base44\.entities|\/api\//.test(page), 'the draft is sessionStorage only');
  check('  and the draft lives under one sessionStorage key', /sessionStorage\.setItem\(GIFT_DRAFT_KEY/.test(page) && lib.GIFT_DRAFT_KEY === 'oi_gift_v2_draft');

  // ── the copy, verbatim, against the goal file itself ────────────────────
  const verbatim = [
    lib.COPY.plan.heading, lib.COPY.plan.sub, lib.COPY.plan.pro, lib.COPY.plan.ultra,
    lib.COPY.who.heading, lib.COPY.who.namesLabel, lib.COPY.who.namesHelp, lib.COPY.who.emailLabel, lib.COPY.who.emailHelp, lib.COPY.who.giverLabel,
    lib.COPY.note.heading, lib.COPY.note.help, lib.COPY.headline.heading, lib.COPY.photo.heading, lib.COPY.photo.sub,
    lib.COPY.when.heading, lib.COPY.when.now.line, lib.COPY.when.date.line, lib.COPY.when.fine,
    lib.COPY.done.heading, lib.COPY.done.body, lib.COPY.done.box, lib.COPY.done.second,
    ...lib.HEADLINES.map((h) => h.text),
    lib.REVEAL.body.ultra, lib.REVEAL.body.pro, lib.REVEAL.under, lib.REVEAL.descriptor.ultra, lib.REVEAL.descriptor.pro, lib.REVEAL.footer,
  ];
  const missing = verbatim.filter((t) => !goal.includes(t));
  check('every line of copy appears in the goal file exactly', missing.length === 0, missing.slice(0, 2).join(' | ') || `${verbatim.length} lines`);
  check('the timezone line is the owner\'s ruling of 2026-10-11', lib.COPY.when.tzLine === 'at 9 am where they are ({timezone}, from your browser)');
  check('  in plain words where the zone has a city', lib.timezoneInWords('Australia/Sydney') === 'Sydney' && lib.timezoneInWords('Europe/London') === 'London'
    && lib.timezoneInWords('America/New_York') === 'New York' && lib.timezoneInWords('UTC') === 'UTC');
  check('the photo list is the goal\'s seventeen, default The boxes', lib.GIFT_PHOTOS.length === 17 && lib.GIFT_PHOTOS.every((p) => goal.includes(`${p.id}, ${p.label}`))
    && lib.DEFAULT_PHOTO_ID === 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub');
  check('photos are delivered f_auto, q_auto, w_1200, ar_6:5, c_fill, g_auto', lib.giftPhotoUrl('x').includes('/f_auto,q_auto,w_1200,ar_6:5,c_fill,g_auto/x'));
  const allCopy = [...verbatim, lib.COPY.when.tzLine].join(' ');
  check('no em or en dash in any of it', !/[–—]/.test(allCopy));

  // ── the email the preview shows, from the template module ───────────────
  check('the preview renders the template module\'s HTML, not a redraw', /renderGiftReveal\(/.test(page) && /srcDoc={html}/.test(page));
  const FORBIDDEN = /Guest Suite|RSVP|song|registry|website/i;
  const pro = ['plain', 'serif', 'hand'].map((noteStyle) => tpl.renderGiftReveal({ plan: 'pro', giver: 'Sam', names: 'Isla and Theo', note: 'A note.', noteStyle, headlineKey: 'for_you' }).html);
  check('a Pro email never names the Guest Suite, RSVP, songs, the registry or a website', pro.every((h) => !FORBIDDEN.test(h)), 'all three note styles');
  const ultra = tpl.renderGiftReveal({ plan: 'ultra', giver: 'Sam', names: 'Isla and Theo', note: 'A note.', headlineKey: 'for_you' }).html;
  check('  while an Ultra email does name the Guest Suite', /Guest Suite/.test(ultra));
  check('the rendered note styles are Cloudinary text images, 1040 wide, with commas escaped',
    /l_text:Caveat_56:/.test(tpl.noteImageUrl('a, b', 'hand')) && /l_text:Cormorant%20Garamond_56_italic:/.test(tpl.noteImageUrl('a', 'serif'))
      && tpl.noteImageUrl('a, b', 'hand').includes('a%252C%20b') && /w_1040,c_fit/.test(tpl.noteImageUrl('a', 'serif')) && tpl.noteImageUrl('a', 'plain') === '');
  check('  and carry the full note as alt text', /alt="A note\."/.test(tpl.renderGiftReveal({ note: 'A note.', noteStyle: 'serif' }).html));

  // ── the preview on a phone (owner ruling 2026-10-11) ────────────────────
  check('on a phone, steps 2 to 6 offer the email preview under the form, collapsed until asked for',
    /\{s >= 2 && s <= 6 && <PhonePreview draft=\{draft\} \/>\}/.test(page) && /className="md:hidden" data-gift-phone-preview/.test(page)
      && /See what they will get/.test(page) && /aria-expanded=\{open\}/.test(page) && /useState\(false\)/.test(page));
  check('  and it is the same template preview, sized to the email', /<EmailPreview draft=\{draft\} fit \/>/.test(page));
  check('step 1 uses onboarding\'s welcome image, the owner\'s choice, and the done screen its completion image',
    lib.ONBOARDING_IMAGES.STEP_ONE.endsWith('/DTS_BANDITS_PALI_MENDEZ_Photos_ID14263_su2ltz.jpg') && lib.ONBOARDING_IMAGES.DONE.includes('ID6374_iumjqj'));

  // ── consumed, not forked: additive props with unchanged defaults ────────
  check('AuthLayout takes aside, rendered only when given', /image, aside, bare = false/.test(read('src/components/AuthLayout.jsx')) && /\{aside \? aside : image \?/.test(read('src/components/AuthLayout.jsx')));
  check('OnboardingShell passes aside through', /aside={aside}/.test(read('src/components/onboarding/OnboardingShell.jsx')));
  const fork = read('src/components/onboarding/OnboardingStep8Fork.jsx');
  check('the Fork step\'s two cards are SelectCard, the one the gift flow consumes', (fork.match(/<SelectCard /g) || []).length === 2 && /export function SelectCard\(/.test(fork) && /import \{ SelectCard \}/.test(page));
  check('UniverseGridTile is consumed with imageSrc and hideExplore, both optional', /export function UniverseGridTile\(\{[^}]*imageSrc, hideExplore = false \}/.test(read('src/components/onboarding/OnboardingStepUniverse.jsx')) && /<UniverseGridTile /.test(page));
  check('OnboardingCompletion is consumed with heading, body and children, falling back to its own', /heading \?\? \(firstName/.test(read('src/components/onboarding/OnboardingCompletion.jsx')) && /children \?\? </.test(read('src/components/onboarding/OnboardingCompletion.jsx')) && /<OnboardingCompletion /.test(page));
  check('emailShell keeps 560 for every other email', /width = 560 \}/.test(read('src/lib/emailBrand.js')));

  // ── the retired name, nowhere a giver reads ─────────────────────────────
  // Assembled from its two words so this file does not itself carry the
  // phrase guest-suite-vocabulary.mjs forbids.
  const RETIRED = new RegExp(['wedding', 'website'].join(' '), 'i');
  const files = ['src/pages/GiftV2.jsx', 'src/lib/giftingV2.js', 'src/lib/giftEmailTemplate.js'];
  const said = files.filter((f) => RETIRED.test(read(f)));
  check('nothing in the gift flow uses the retired name for the guest experience', said.length === 0, said.join(', ') || `${files.length} files`);

  return r;
}
