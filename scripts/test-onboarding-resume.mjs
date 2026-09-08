/* global document, getComputedStyle */
/**
 * A COUPLE WHO LEAVES HALFWAY COMES BACK TO WHERE THEY WERE.
 *
 * Onboarding.jsx has carried a resume path since it was written: on load it
 * reads the draft, rehydrates the answers, and jumps to
 * `draft.onboardingStepIndex`. It has never once worked in production, and the
 * reason was not in the code — Base44 did not declare `onboardingDraft` or
 * `onboardingStepIndex`, so every write was accepted with a 200 and discarded
 * (live probe, 2026-09-06). A couple who refreshed at step five came back to
 * step one with their answers still sitting on the record, unread.
 *
 * `c832e9e` declared both fields on 2026-09-08. The path is live for the first
 * time, and this is the first thing that has ever checked it.
 *
 * ── WHY THIS IS A RENDER GUARD ──────────────────────────────────────────────
 *
 * The property is "which step is on screen, with which answers in its inputs".
 * That is not visible to source analysis — the existing guard
 * (tests/persistence/onboarding-not-locked-out.mjs) reads the file as text and
 * can prove the code says the right thing, which is exactly what was true for
 * the whole time the feature did not work. Only a render can tell the
 * difference between wired and working.
 *
 * ── BOTH DIRECTIONS, BECAUSE ONE PROVES NOTHING ─────────────────────────────
 *
 * A guard that only checks "draft resumes" passes just as happily on a wizard
 * that ALWAYS jumps to step five, including for a couple who has never seen
 * it. So the fresh case is checked in the same run: no draft, and the wizard
 * must be at welcome.
 *
 * Usage: npm run test:onboarding-resume  (needs a server; CAPTURE_BASE_URL)
 */
import { chromium } from 'playwright';
import { seededContext, ONBOARDING_USER, ONBOARDING_SEED } from './lib/renderHarness.mjs';

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:5173';

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

/** A half-finished wedding: five answers in, stopped on the guest-count step. */
const DRAFT = {
  id: 'draft-1',
  couple1Name: 'Nadia',
  couple2Name: 'Theo',
  weddingDate: '2027-06-12',
  guestCount: '80',
  guestType: 'intimate',
  mainCeremony: { venueName: 'The Old Observatory', address: '12 Greenwich Park' },
  onboardingDraft: true,
  onboardingStepIndex: 4,          // STEPS[4] === 'guestCount'
  created_by: 'fixture@example.com',
};

/** What the wizard is showing, read off the page rather than off state. */
async function readWizard(page) {
  return page.evaluate(() => {
    const text = document.body.innerText || '';
    const values = [...document.querySelectorAll('input')]
      .map((i) => (i.value || '').trim())
      .filter(Boolean);
    return { text: text.slice(0, 400), values };
  });
}

console.log('\n  Onboarding resumes where the couple left it:\n');

const browser = await chromium.launch();

// ── 1. A DRAFT RESUMES ─────────────────────────────────────────────────────
{
  const ctx = await seededContext(browser, {
    width: 1440, height: 950,
    seed: { ...ONBOARDING_SEED, WeddingDetails: [DRAFT] },
    user: ONBOARDING_USER,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const seen = await readWizard(page);

  // PRESENCE BEFORE PROPERTIES: if the wizard did not render at all, every
  // assertion below would pass by measuring nothing.
  check('the wizard renders for a couple who has not finished',
    seen.text.trim().length > 20, `${seen.text.trim().length} chars`);

  // The guest-count step is STEPS[4]. Welcome is STEPS[0] and its copy is the
  // thing that must NOT be on screen.
  const onWelcome = /Let's plan your wedding|Welcome/i.test(seen.text);
  check('it does NOT restart at welcome', !onWelcome,
    onWelcome ? 'landed on the welcome step — the draft was ignored' : 'past the welcome step');
  // ASSERTED ON THE STEP'S OWN WORDS AND ITS COUNTER, not on a substring that
  // could match anything. The first version of this check tested /guest/i
  // against the whole page and passed on a 134-character shell — the page had
  // barely rendered and the guard called it a resume.
  check('it lands on the step the draft recorded (index 4, guestCount)',
    /Step 4 of 8/.test(seen.text) && /How many guests are you expecting/i.test(seen.text),
    seen.text.split('\n').filter((l) => l.trim())[1] || '(nothing rendered)');

  // AND THE ANSWERS CAME WITH IT. Landing on the right step with empty fields
  // is the same lost-work bug wearing a better disguise, so this is checked
  // twice over: the tile this step itself owns, and — by stepping back — the
  // names from three steps earlier.
  // THE CARD, FOUND BY ITS OWN BORDER RULE. OnboardingStep4GuestCount paints a
  // chosen card `2px solid #0A0A0A` and an unchosen one 2px of the muted
  // token, so the card is the element with a 2px border whose text is the
  // tile's — not merely something containing the word.
  const tiles = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('div,button')) {
      const t = (el.innerText || '').trim();
      const m = /^(Intimate|Celebration|Grand)\n/.exec(t);
      if (!m) continue;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.borderTopWidth) !== 2) continue;
      if (!out[m[1]]) out[m[1]] = cs.borderTopColor;
    }
    return out;
  });
  check('the tile the couple chose is still chosen',
    tiles.Intimate === 'rgb(10, 10, 10)',
    `Intimate=${tiles.Intimate || 'not found'}  Celebration=${tiles.Celebration || '-'}  Grand=${tiles.Grand || '-'}`);
  check('  and the tiles they did not choose are not',
    tiles.Celebration !== 'rgb(10, 10, 10)' && tiles.Grand !== 'rgb(10, 10, 10)',
    'only one tile reads as chosen');

  // THREE STEPS BACK, to answers this step does not own. If resume rehydrated
  // onboardingData rather than just jumping the index, the names are there.
  for (let i = 0; i < 3; i++) {
    await page.getByText('← Back').first().click().catch(() => {});
    await page.waitForTimeout(900);
  }
  const back = await readWizard(page);
  const names = back.values.map((v) => v.toLowerCase());
  check('stepping back shows the names they had already given',
    /Step 1 of 8/.test(back.text) && names.includes('nadia') && names.includes('theo'),
    `step-1 inputs: ${back.values.join(' · ') || '(empty)'}`);
  await ctx.close();
}

// ── 2. NO DRAFT STARTS FRESH ───────────────────────────────────────────────
{
  const ctx = await seededContext(browser, {
    width: 1440, height: 950,
    seed: ONBOARDING_SEED,                    // no WeddingDetails at all
    user: ONBOARDING_USER,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const seen = await readWizard(page);
  // POSITIVE, not merely "the guest step is absent" — an empty page satisfies
  // an absence and proves nothing.
  check('a couple with no draft lands on the welcome step',
    /Weddings are complicated/i.test(seen.text) && /Get started/i.test(seen.text),
    seen.text.split('\n').filter((l) => l.trim())[1] || '(nothing rendered)');
  check('  and not on the resumed step', !/How many guests/i.test(seen.text));
  await ctx.close();
}

// ── 3. A FINISHED DRAFT DOES NOT RESUME ────────────────────────────────────
//
// onboardingDraft:false is what saveOnboarding writes at completion. A record
// carrying a stale onboardingStepIndex must not drag a returning couple back
// into the wizard — the flag decides, not the index.
{
  const ctx = await seededContext(browser, {
    width: 1440, height: 950,
    seed: { ...ONBOARDING_SEED, WeddingDetails: [{ ...DRAFT, onboardingDraft: false, onboardingStepIndex: 4, slug: null }] },
    user: ONBOARDING_USER,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const seen = await readWizard(page);
  check('a cleared draft does not resume, even with a stale step index',
    /Weddings are complicated/i.test(seen.text) && !/How many guests/i.test(seen.text),
    seen.text.split('\n').filter((l) => l.trim())[1] || '(nothing rendered)');
  await ctx.close();
}

await browser.close();

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${passed === results.length ? 'ALL PASS' : 'FAILURES PRESENT'}\n`);
process.exit(passed === results.length ? 0 : 1);
