/**
 * tests/persistence/design-system-sweep.mjs
 *
 * FIVE RULES THE OWNER SET ON 2026-09-07, EACH WITH ITS OWN INSTRUMENT.
 *
 *   PILLS      one component. Selected is black; unselected is the light-grey
 *              pill Event details › Theme uses. No filter renders as bare text.
 *   WEIGHT     nothing below 400 in the dashboard.
 *   TRACKING   no letter-spacing at all — "I don't like the tracking, it
 *              doesn't suit the brand" — eyebrows and small-caps included.
 *              The allowlist is empty on purpose.
 *   ACCORDIONS collapsed on mount, header carries a one-line summary.
 *   CONTRAST   a CTA's text colour is derived from its background, never
 *              hard-paired beside it.
 *
 * SCOPE IS THE DASHBOARD, and that is a decision worth stating. The tracking
 * rule is not applied to the marketing site or to the couple's published guest
 * site: the artwork exemption (CLAUDE.md) makes the guest site the couple's
 * own typography, and the marketing pages are display type the owner has not
 * ruled on. The file lists below name exactly what is in scope.
 */
import { pass, fail } from './_shared.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'src');

/** The couple's published site and the studio previews of it. */
const ARTWORK = /^components\/(guest-website|universe-studio|website-builder)\/|^pages\/GuestMusic\.jsx$/;
/**
 * Marketing and auth surfaces — display type, not dashboard chrome.
 *
 * components/home, components/marketing and components/motion are on this
 * list for a reason worth recording: the first sweep DID strip their tracking,
 * because the exclusion named only `components/public/`. CI caught it in a
 * way a design guard could not — the prerendered-freshness check went red,
 * since production serves committed snapshots of those pages to crawlers and
 * they no longer matched the source. The scope was always "the dashboard";
 * this is that scope, stated accurately.
 */
const MARKETING = /^components\/(public|home|marketing|motion)\/|^pages\/(Home|Features|Ava|Universes|Pricing|About|Contact|Tour|FAQ|Gifting|GiftPurchaseSuccess|ScrollMorph|MockUniverseA|MockUniverseB|MockUniverseC|Login|ForgotPassword|ResetPassword|PrivacyPolicy|TermsOfService|CookiePolicy|DataDeletion|RefundPolicy|ChoosePlan|CollaboratorAccept)\.jsx$/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|css)$/.test(e)) out.push(p);
  }
  return out;
}

const ALL = walk(SRC).map((p) => [relative(SRC, p), readFileSync(p, 'utf8')]);
const DASHBOARD = ALL.filter(([p]) => !ARTWORK.test(p) && !MARKETING.test(p));
const src = (p) => ALL.find(([f]) => f === p)?.[1] || '';

export async function runDesignSystemSweep() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The design-system sweep:\n');

  // ── 1. PILLS ────────────────────────────────────────────────────────────
  {
    const css = src('index.css');
    check('PLANT: the shared pill has a black selected state',
      /\.filter-pill\.active \{[^}]*background: #0A0A0A;[^}]*color: #FFFFFF;/.test(css),
      'selected = black pill');
    // A FILL, NOT AN OUTLINE — and this check asserted the outline that never
    // painted. index.css:1045's `[class*="pill"] { border: none !important }`
    // matches `.filter-pill`, so the 1px border this used to require was
    // stripped on every pill in the product: transparent background, no
    // border, bare text on Schedule and on the Theme tab alike. A source
    // check cannot see that a rule lost a specificity fight; the render guard
    // (scripts/test-filter-pills.mjs) reads the painted background instead.
    check('  and an unselected state that is a painted fill, not bare text',
      /\.filter-pill \{[^}]*background: rgba\(10,10,10,0\.06\);/.test(css)
        && !/\.filter-pill \{[^}]*background: transparent;/.test(css),
      'a background survives that !important; a border cannot');
    // THE BESPOKE ROWS THE OWNER NAMED, each converted rather than restyled.
    for (const [file, what] of [
      ['pages/Messages.jsx', 'Messages status'],
      ['pages/Moodboard.jsx', 'Moodboard category'],
      ['components/moodboard/BoardSelector.jsx', 'Moodboard boards'],
      ['pages/TodoList.jsx', 'To do view'],
    ]) {
      const s = src(file);
      check(`PLANT: ${what} uses the shared FilterPill`,
        /<FilterPill/.test(s) && /from '@\/components\/shared\/TableToolbar'/.test(s), file);
      check(`  and keeps no hand-rolled pill beside it`,
        !/borderRadius: 999, border: `1\.5px solid/.test(s), 'one component');
    }
    check('  and no selection set paints itself strawberry',
      !/activeBoard === board \? '#E03553'/.test(src('components/moodboard/BoardSelector.jsx')),
      'the primary colour is for actions');
  }

  // ── 2. FONT WEIGHT ──────────────────────────────────────────────────────
  {
    const light = [];
    for (const [p, s] of DASHBOARD) {
      for (const m of s.matchAll(/fontWeight:\s*(\d{3})/g)) if (Number(m[1]) < 400) light.push(`${p}: ${m[1]}`);
      for (const m of s.matchAll(/font-weight:\s*(\d{3}|lighter)/g)) if (m[1] === 'lighter' || Number(m[1]) < 400) light.push(`${p}: ${m[1]}`);
      for (const m of s.matchAll(/\bfont-(light|thin|extralight)\b/g)) light.push(`${p}: ${m[0]}`);
    }
    check('PLANT: nothing in the dashboard is lighter than 400',
      light.length === 0, light.slice(0, 6).join(' · ') || `${DASHBOARD.length} files clean`);
    check('  and the avatar dropdown is 500',
      (src('Layout.jsx').match(/fontSize: 13, fontWeight: 500, cursor: 'pointer'/g) || []).length >= 4,
      'Profile & account, Notification preferences, Plan & billing, Help center, Log out');
  }

  // ── 3. LETTER-SPACING ───────────────────────────────────────────────────
  {
    const tracked = [];
    for (const [p, s] of DASHBOARD) {
      for (const m of s.matchAll(/letterSpacing:\s*('[^']*'|"[^"]*"|`[^`]*`|[\w.-]+)/g)) {
        const v = m[1].replace(/['"`]/g, '');
        if (v !== '0' && v !== 'normal') tracked.push(`${p}: ${v}`);
      }
      for (const m of s.matchAll(/letter-spacing:\s*([^;]+);/g)) {
        const v = m[1].trim();
        if (v !== '0' && v !== 'normal') tracked.push(`${p}: ${v}`);
      }
    }
    // THE ALLOWLIST IS EMPTY, and that is the ruling: "Only exception: none."
    check('PLANT: no tracking anywhere in the dashboard',
      tracked.length === 0, tracked.slice(0, 8).join(' · ') || `${DASHBOARD.length} files clean`);
    check('  including the eyebrows, which were the loudest of it',
      !/letterSpacing/.test(src('components/dashboard/Briefing.jsx')), 'the daily update’s date line');
  }

  // ── 4. ACCORDIONS ───────────────────────────────────────────────────────
  {
    const open = [];
    for (const [p, s] of DASHBOARD) {
      if (/^pages\//.test(p) && /\sdefaultOpen(?=[\s>])/.test(s)) open.push(p);
      for (const m of s.matchAll(/<Accordion\b(?![^>]*defaultValue)/g)) open.push(`${p}: <Accordion> with no defaultValue`);
    }
    check('PLANT: no accordion mounts open',
      open.length === 0, open.slice(0, 6).join(' · ') || 'every section collapsed');
    check('  DetailsSection still ACCEPTS defaultOpen, for a validation error',
      /defaultOpen = false/.test(src('components/event-details/DetailsSection.jsx')),
      'the prop survives with no caller');
    check('  and a collapsed section says what is in it',
      /summaryText \|\| 'Not set yet'/.test(src('components/event-details/DetailsSection.jsx')),
      'a one-line summary in the header');
    check('  the selection accordion was already collapsed and summarised',
      /useState\(null\); \/\/ rule 1: collapsed by default/.test(src('components/shared/OptionAccordion.jsx')),
      'OptionAccordion, unchanged');
  }

  // ── 5. CTA CONTRAST ─────────────────────────────────────────────────────
  {
    const tint = src('lib/surfaceTint.js');
    check('PLANT: the CTA text colour is derived from the background',
      /export function readableOn/.test(tint), 'not fixed beside it');
    for (const f of ['components/universe-studio/UniverseWorldView.jsx', 'pages/MockUniverseB.jsx']) {
      check(`  ${f} no longer hard-pairs accent with darkBg`,
        !/background: (universe\.)?colors\.accent, color: (universe\.)?colors\.darkBg/.test(src(f))
          && /readableOn\(/.test(src(f)),
        'navy-on-black was 1.04:1');
    }
  }

  // ── THE RULES ARE WRITTEN DOWN ──────────────────────────────────────────
  {
    const spec = readFileSync(join(ROOT, 'DESIGN_SPEC.md'), 'utf8');
    for (const phrase of [
      'No letter-spacing in the dashboard',
      'Nothing below font-weight 400',
      'Every accordion collapsed on mount',
      'CTA text colour is derived from its background',
      'One filter pill component',
    ]) check(`DESIGN_SPEC.md carries "${phrase}"`, spec.includes(phrase), 'the rule, written down');
  }

  return results;
}
