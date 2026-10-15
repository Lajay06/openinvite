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
    lib.COPY.plan.heading, lib.COPY.plan.sub, lib.COPY.plan.pro, ...lib.COPY.plan.proLines, lib.COPY.plan.ultra, ...lib.COPY.plan.ultraLines,
    lib.COPY.theirs.heading, lib.COPY.theirs.note, lib.COPY.theirs.headline, lib.COPY.theirs.photo, lib.COPY.theirs.when,
    lib.COPY.when.now.line, lib.COPY.when.date.line, lib.COPY.when.fine,
    lib.COPY.done.heading, lib.COPY.done.headingPlain, lib.COPY.done.body, lib.COPY.done.bodyPlain, lib.COPY.done.boxTitle, lib.COPY.done.box,
    ...lib.HEADLINES.map((h) => h.text),
    lib.REVEAL.body.ultra, lib.REVEAL.body.pro, lib.REVEAL.under, lib.REVEAL.descriptor.ultra, lib.REVEAL.descriptor.pro, lib.REVEAL.footer,
  ];
  // The descriptors carry "Ava AI" on first mention (the amendment's rule);
  // otherwise they are the goal's lines exactly.
  const missing = verbatim.filter((t) => !goal.includes(t) && !goal.includes(t.replace('Ava AI to tell you', 'Ava to tell you')));
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
  check('the rendered note styles are Cloudinary text images drawn for their box, with commas escaped',
    /l_text:Caveat_60_line_spacing_2:/.test(tpl.noteImageUrl('a, b', 'hand')) && /l_text:Cormorant%20Garamond_47_line_spacing_3:/.test(tpl.noteImageUrl('a', 'serif')) && !/italic/.test(tpl.noteImageUrl('a', 'serif'))
      && tpl.noteImageUrl('a, b', 'hand').includes('a%252C%20b') && /c_lpad,w_924,/.test(tpl.noteImageUrl('a', 'serif')) && !/c_fit/.test(tpl.noteImageUrl('a', 'serif')) && tpl.noteImageUrl('a', 'plain') === '');
  check('  and carry the full note as alt text', /alt="A note\."/.test(tpl.renderGiftReveal({ note: 'A note.', noteStyle: 'serif' }).html));

  // ── the four pages (the owner's review of #994) ─────────────────────────
  check('four pages: the gift, who it is for, make it theirs, done', /const PAGES = 4;/.test(page) && [1, 2, 3, 4].every((n) => new RegExp(`\\{s === ${n} && `).test(page)) && !/s === 5|s === 6|s === 7/.test(page));
  check('each page\'s photo side: welcome, names step, the live preview, completion',
    /s === 1 \? \{ image: ONBOARDING_IMAGES\.STEP_ONE \}/.test(page) && /s === 2 \? \{ image: ONBOARDING_IMAGES\.WHO \}/.test(page)
      && /s === 4 \? \{ image: ONBOARDING_IMAGES\.DONE \}/.test(page) && /\{ aside: <EmailPreview draft=\{draft\} \/> \}/.test(page)
      && lib.ONBOARDING_IMAGES.STEP_ONE.endsWith('ID14263_su2ltz.jpg') && lib.ONBOARDING_IMAGES.WHO.endsWith('ID14160_vgcgxf.jpg') && lib.ONBOARDING_IMAGES.DONE.endsWith('DTS_BANDITS_PALI_MENDEZ_Photos_ID14218_hxqxw0.jpg'));
  // PAGE 2 IS ONBOARDING STEP 1 (owner ruling 2026-10-13): the same chrome
  // and the same component, with the gift's three lines, verbatim.
  check('page 2 is onboarding step 1 itself: its chrome and its component, imported, not copied',
    /import OnboardingStep1Names from '@\/components\/onboarding\/OnboardingStep1Names'/.test(page) && /import \{ ShellStepChrome \} from '@\/components\/onboarding\/OnboardingStepChrome'/.test(page)
      && /<ShellStepChrome showStepCounter stepNum=\{2\} totalSteps=\{PAGES\} showBack onBack=\{\(\) => go\(1\)\} \/>/.test(page) && /<OnboardingStep1Names\b/.test(page)
      && !/<UnderlineInput /.test(page) && !('heading' in lib.COPY.who) && /\{s !== 2 && top\}/.test(page));
  check('  its three lines are the owner\'s, verbatim: This gift is for / and goes to / from',
    lib.COPY.who.forLine === 'This gift is for' && lib.COPY.who.toLine === 'and goes to' && lib.COPY.who.fromLine === 'from'
      && lib.COPY.who.namesLabel === 'Their names' && lib.COPY.who.emailLabel === 'Their email' && lib.COPY.who.giverLabel === 'Your name');
  check('page 1: both plans side by side, compact, the whole card selects, one Continue below',
    /className="grid grid-cols-1 md:grid-cols-2 gap-4" data-plan-cards/.test(page) && /<SelectCard key=\{p\} wholeCard padding=\{24\}/.test(page)
      && /onSelect=\{\(\) => set\(\{ plan: p \}\)\}/.test(page) && /disabled=\{!draft\.plan\} onClick=\{\(\) => go\(2\)\}/.test(page));
  check('page 3: the side preview is the whole email scaled as one unit, by one transform, never reflowed',
    /width: EMAIL_WIDTH, height, border: 0/.test(page) && /transform: `translateX\(-50%\) scale\(\$\{scale\}\)`/.test(page) && /const EMAIL_WIDTH = 600;/.test(page));
  check('  the style pills\' samples are live text in their own faces, inheriting the pill\'s color',
    /data-style-sample="hand" className="oi-note-face" style=\{\{ '--oi-note-font': CAVEAT/.test(page) && /data-style-sample="serif" className="oi-note-face"/.test(page) && !/noteImageUrl/.test(page));
  check('  the photo tiles carry a lower-third caption, not the universe overlay', /<UniverseGridTile key=\{p\.id\} index=\{i\} hideExplore caption/.test(page));
  check('page 3 is onboarding\'s theme accordion, four sections, the first open, each showing its value',
    (page.match(/<AccordionSection /g) || []).length === 4 && /useState\(params\.get\('section'\) \|\| 'note'\)/.test(page) && (page.match(/summary=\{/g) || []).length === 4
      && /import \{ AccordionSection, Pill \} from '@\/components\/onboarding\/OnboardingStep5WeddingType'/.test(page));
  check('  its options are the accordion\'s own pills, and the photos the universe grid\'s rule and tile', /HEADLINES\.map\(\(h\) => <Pill /.test(page) && /className="universe-grid"/.test(page) && /repeat\(5, 1fr\)/.test(page));
  check('the phone preview panel is on page 3 only', (page.match(/<PhonePreview draft=\{draft\} \/>/g) || []).length === 1 && /className="md:hidden" data-gift-phone-preview/.test(page) && /See what they will get/.test(page));
  check('  and it is the same template preview, sized to the email', /<EmailPreview draft=\{draft\} fit \/>/.test(page));
  // ── the plan badge, wherever a plan is named ────────────────────────────
  const sidebar = read('src/components/layout/AnimatedSidebar.jsx');
  check('the dashboard\'s badge is one component, consumed by the sidebar and the gift flow',
    /export default function PlanBadge/.test(read('src/components/shared/PlanBadge.jsx')) && (sidebar.match(/<PlanBadge /g) || []).length === 3 && !/linear-gradient\(135deg, #FBBF24, #F59E0B\)/.test(sidebar)
      && (page.match(/<PlanBadge /g) || []).length >= 3);
  const badges = await import('../../src/lib/planBadge.js');
  check('  Ultra the dashboard\'s yellow, Pro the brand pink', badges.PLAN_BADGE_BACKGROUND.ultra === 'linear-gradient(135deg, #FBBF24, #F59E0B)' && badges.PLAN_BADGE_BACKGROUND.pro === '#E03553');
  check('  and the email preview carries the badge too, as its image', tpl.renderGiftReveal({ plan: 'ultra', note: 'x' }).html.includes(`src="${badges.PLAN_BADGE_EMAIL_IMAGE.ultra.url}" alt="Ultra"`)
    && tpl.renderGiftReveal({ plan: 'pro', note: 'x' }).html.includes(`src="${badges.PLAN_BADGE_EMAIL_IMAGE.pro.url}" alt="Pro"`));
  check('"Ava AI" on first mention in the email', /Ava AI to tell you/.test(tpl.renderGiftReveal({ plan: 'pro', note: 'x' }).html) && lib.COPY.plan.proLines[0] === 'Ava AI included.');

  // ── consumed, not forked: additive props with unchanged defaults ────────
  check('AuthLayout takes aside, rendered only when given', /image, aside, bare = false/.test(read('src/components/AuthLayout.jsx')) && /\{aside \? aside : image \?/.test(read('src/components/AuthLayout.jsx')));
  check('OnboardingShell passes aside through', /aside={aside}/.test(read('src/components/onboarding/OnboardingShell.jsx')));
  const fork = read('src/components/onboarding/OnboardingStep8Fork.jsx');
  check('the Fork step\'s two cards are SelectCard, the one the gift flow consumes', (fork.match(/<SelectCard /g) || []).length === 2 && /export function SelectCard\(/.test(fork) && /import \{ SelectCard \}/.test(page));
  check('the theme accordion and its pill are exported, not copied', /export function AccordionSection\(/.test(read('src/components/onboarding/OnboardingStep5WeddingType.jsx')) && /export function Pill\(/.test(read('src/components/onboarding/OnboardingStep5WeddingType.jsx')));
  check('UniverseGridTile is consumed with imageSrc, hideExplore and caption, all optional', /export function UniverseGridTile\(\{[^}]*imageSrc, hideExplore = false, caption = false \}/.test(read('src/components/onboarding/OnboardingStepUniverse.jsx')) && /<UniverseGridTile /.test(page));
  check('SelectCard and OnboardingStep1Names gained only optional props (wholeCard and padding; lines and size)',
    /export function SelectCard\(\{ title, body, children, onSelect, selected, buttonLabel, wholeCard = false, padding \}\)/.test(read('src/components/onboarding/OnboardingStep8Fork.jsx'))
      && /export default function OnboardingStep1Names\(\{ onNext, data, lines = NAMES_LINES, size = 32 \}\)/.test(read('src/components/onboarding/OnboardingStep1Names.jsx')));
  check('OnboardingCompletion is consumed with heading, body and children, falling back to its own', /heading \?\? \(firstName/.test(read('src/components/onboarding/OnboardingCompletion.jsx')) && /children \?\? </.test(read('src/components/onboarding/OnboardingCompletion.jsx')) && /<OnboardingCompletion /.test(page));
  check('emailShell keeps 560 for every other email, and no style block unless one is asked for',
    /width = 560, headStyle = '' \}/.test(read('src/lib/emailBrand.js')) && /\$\{headStyle \? /.test(read('src/lib/emailBrand.js')));

  // ── the retired name, nowhere a giver reads ─────────────────────────────
  // Assembled from its two words so this file does not itself carry the
  // phrase guest-suite-vocabulary.mjs forbids.
  const RETIRED = new RegExp(['wedding', 'website'].join(' '), 'i');
  const files = ['src/pages/GiftV2.jsx', 'src/lib/giftingV2.js', 'src/lib/giftEmailTemplate.js'];
  const said = files.filter((f) => RETIRED.test(read(f)));
  check('nothing in the gift flow uses the retired name for the guest experience', said.length === 0, said.join(', ') || `${files.length} files`);

  // ── owner design ruling 2026-10-14 ──────────────────────────────────────
  const v2lib = await import('../../src/lib/giftingV2.js');
  check('page 1 reads "Give the gift of a calmer wedding."', v2lib.COPY.plan?.heading === 'Give the gift of a calmer wedding.' || /heading: 'Give the gift of a calmer wedding\.'/.test(read('src/lib/giftingV2.js')));
  check('every gift email line says "gifted you", none "has given you"',
    /\{giver\} gifted you Openinvite \{Plan\}/.test(v2lib.REVEAL.subject) && Object.values(v2lib.REVEAL.body).every((b) => /^\{giver\} gifted you Openinvite /.test(b)) && !/has given you/.test(read('src/lib/giftingV2.js')));
  const claim = stripComments(read('src/pages/GiftClaim.jsx'));
  check('the note styles look the plain size (lowercase height matched, measured) and the serif is upright: the pills, the claim page and the email',
    v2lib.NOTE_X_HEIGHT.plain === 53.6 && v2lib.NOTE_X_HEIGHT.serif === 38.6 && v2lib.NOTE_X_HEIGHT.hand === 35.4
      && v2lib.noteFaceSize('serif', 17) === 23.6 && v2lib.noteFaceSize('hand', 17) === 25.7 && v2lib.noteFaceSize('plain', 17) === 17
      && /data-style-sample="hand"[^>]*fontSize: noteFaceSize\('hand', 12\)/.test(page) && /data-style-sample="serif"[^>]*fontStyle: 'normal', fontSize: noteFaceSize\('serif', 12\)/.test(page)
      && /serif: \{[^}]*fontStyle: 'normal', fontSize: noteFaceSize\('serif', 17\)/.test(claim)
      && /l_text:Cormorant%20Garamond_47_line_spacing_3:/.test(tpl.noteImageUrl('a', 'serif')) && /l_text:Caveat_60_line_spacing_2:/.test(tpl.noteImageUrl('a', 'hand')));
  // ── the caps, for every style (owner ruling 2026-10-14) ─────────────────
  {
    const W40 = 'w'.repeat(40);
    const NOTE40 = `With love ${W40} from Sam`;
    check('no note style is drawn above 30px in the email or 24px on a phone; the serif keeps its matched size',
      tpl.NOTE_CAPS.wide === 30 && tpl.NOTE_CAPS.phone === 24 && tpl.HAND_NOTE.wide.px <= 30 && tpl.HAND_NOTE.phone.px <= 24
        && tpl.SERIF_NOTE.wide.px === v2lib.noteFaceSize('serif', 17) && tpl.SERIF_NOTE.wide.px <= 30 && tpl.SERIF_NOTE.phone.px <= 24);
    for (const style of ['plain', 'serif', 'hand']) {
      for (const [kind, html] of [['reveal', tpl.renderGiftReveal({ note: NOTE40, noteStyle: style, giver: 'Sam', names: 'Isla and Theo', headlineKey: 'for_you' }).html], ['receipt', tpl.renderGiftConfirmation({ note: NOTE40, noteStyle: style, giver: 'Sam', names: 'Isla and Theo', email: 'a@b.co' }).html]]) {
        let ok;
        if (style === 'plain') {
          ok = /font-size:17px;[^"]*overflow-wrap:anywhere;word-break:break-word;">With love w{40} from Sam<\/p>/.test(html);
        } else {
          const imgs = [...html.matchAll(/<img class="oi-note-(wide|phone)" src="([^"]+)"/g)];
          ok = imgs.length === 2 && imgs.every(([, which, src]) => {
            const m = /l_text:[A-Za-z%0-9]+_(\d+)_line_spacing_\d+:([^,]+),/.exec(src);
            const px = m && Number(m[1]) / 2;
            const lines = m ? decodeURIComponent(m[2]).split('\n') : [];
            const cap = which === 'wide' ? 30 : 24;
            const box = which === 'wide' ? 462 : 220;
            return px && px <= cap + 0.5 && lines.join('').replace(/ /g, '') === `Withlove${W40}fromSam` && lines.every((l) => l.length * px * (style === 'serif' ? 0.404 : 0.344) <= box) && !/c_fit/.test(src);
          });
        }
        check(`  ${style}, ${kind}: a 40-character word wraps inside the box at both sizes, within the caps`, ok);
      }
    }
    check('  and the page 3 preview draws the same email (renderGiftReveal), so it carries the same notes', /renderGiftReveal\(/.test(page) && /srcDoc=\{html\}/.test(page));
  }
  // ── the handwritten note's size (owner ruling 2026-10-14) ───────────────
  {
    const H = tpl.HAND_NOTE;
    check('the handwritten note is 30px wide and 24px on a phone, line height 1.3, drawn for its measured box',
      H.wide.px === 30 && H.phone.px === 24 && H.lineHeight === 1.3 && H.wide.box === 462 && H.phone.box === 220
        && /l_text:Caveat_60_line_spacing_2:[^/]*\/fl_layer_apply\/c_lpad,w_924,/.test(tpl.handNoteImageUrl('a', H.wide)) && /l_text:Caveat_48_line_spacing_1:[^/]*\/fl_layer_apply\/c_lpad,w_440,/.test(tpl.handNoteImageUrl('a', H.phone))
        && !/c_fit|c_pad,/.test(tpl.handNoteImageUrl('a', H.wide)));
    const word40 = 'x'.repeat(40);
    const wideMax = Math.floor(462 / (30 * 0.42));
    const phoneMax = Math.floor(220 / (24 * 0.42));
    const wideLines = tpl.wrapNote(word40, wideMax);
    const phoneLines = tpl.wrapNote(`With love ${word40}`, phoneMax);
    check('  a 40-character word with no spaces wraps inside the box on both, never to the edge, and nothing is lost',
      wideLines.length > 1 && wideLines.every((l) => l.length <= wideMax) && phoneLines.every((l) => l.length <= phoneMax)
        && phoneLines.join('').replace(/ /g, '') === `Withlove${word40}` && tpl.handNoteImageUrl(word40, H.phone).includes(encodeURIComponent(tpl.wrapNote(word40, phoneMax).join('\n'))));
    for (const [kind, html] of [['reveal', tpl.renderGiftReveal({ note: 'n', noteStyle: 'hand', giver: 'Sam', names: 'Isla and Theo', headlineKey: 'for_you' }).html], ['receipt', tpl.renderGiftConfirmation({ note: 'n', noteStyle: 'hand', giver: 'Sam', names: 'Isla and Theo', email: 'a@b.co' }).html]]) {
      check(`  the ${kind} shows the 30px note, swaps in the 24px one on a phone, and keeps the quote mark and the signature`,
        /class="oi-note-wide"[^>]*Caveat_60/.test(html) && /class="oi-note-phone"[^>]*Caveat_48/.test(html) && html.includes(tpl.HAND_NOTE_STYLE)
          && /font-size:56px;line-height:0\.8;font-weight:700;color:#E03553/.test(html) && /font-variant:small-caps/.test(html));
    }
    check('the claim page sets the handwritten note at 30px, 24px on a phone, line height 1.3, wrapping long words',
      /hand: \{ '--oi-note-font': CAVEAT, lineHeight: 1\.3, overflowWrap: 'anywhere' \}/.test(claim) && /\.oi-note-hand \{ font-size: 30px; \} @media \(max-width: 600px\) \{ \.oi-note-hand \{ font-size: 24px; \} \}/.test(read('src/pages/GiftClaim.jsx')));
    check('the receipt says "You gifted", never "You have given"',
      /^You gifted \{names\} Openinvite \{Plan\}\. /.test(lib.CONFIRM.body) && /^You gifted \{names\} Openinvite \{Plan\}\. /.test(lib.CONFIRM.scheduled)
        && /You gifted Isla and Theo Openinvite/.test(tpl.renderGiftConfirmation({ note: 'n', giver: 'Sam', names: 'Isla and Theo', email: 'a@b.co' }).html.replace(/<[^>]+>/g, ''))
        && !/have given/.test(read('src/lib/giftingV2.js')));
  }
  // ── the logo, from Cloudinary (owner ruling 2026-10-14) ─────────────────
  {
    const brand = await import('../../src/lib/emailBrand.js');
    const LOGO = brand.EMAIL_LOGO_URL;
    for (const [kind, html] of [['reveal', tpl.renderGiftReveal({ note: 'n', giver: 'Sam', names: 'Isla and Theo', headlineKey: 'for_you' }).html], ['receipt', tpl.renderGiftConfirmation({ note: 'n', giver: 'Sam', names: 'Isla and Theo', email: 'a@b.co' }).html]]) {
      const logos = [...html.matchAll(/<img src="([^"]+)"[^>]*alt="Openinvite"[^>]*>/g)];
      check(`the ${kind} email's logo is the full Cloudinary PNG at 160 by 37 with 24px clear under it, never the site's blocked copy or an SVG`,
        /^https:\/\/res\.cloudinary\.com\/[^"]+\.png$/.test(LOGO) && brand.EMAIL_LOGO_WIDTH === 160 && brand.EMAIL_LOGO_HEIGHT === 37 && !('GIFT_EMAIL_LOGO_URL' in tpl) && logos.length === 1 && logos[0][1] === LOGO && /width="160" height="37"/.test(logos[0][0]) && /width:160px;height:37px;/.test(logos[0][0])
          && /padding:28px 40px 24px;background:#FFFFFF;">\s*<img src="https:\/\/res\.cloudinary\.com/.test(html)
          && !/openinvite\.com\.au\/email-assets|\.svg"|openinvite-icon-mark/.test(html));
    }
  }
  check('the note card is the brand gray #F5F5F5, in the email and on the claim page',
    /background:#F5F5F5/.test(tpl.renderGiftReveal({ note: 'n', noteStyle: 'plain' }).html) && /co_rgb:F5F5F5/.test(tpl.noteImageUrl('a', 'serif')) && /background: '#F5F5F5'/.test(claim) && !/F6F2EC/i.test(read('src/lib/giftEmailTemplate.js') + claim));
  return r;
}
