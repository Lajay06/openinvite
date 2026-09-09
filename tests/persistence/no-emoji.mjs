/**
 * tests/persistence/no-emoji.mjs
 *
 * NO EMOJI ON A SURFACE WE CONTROL THE TYPE OF.
 *
 * CLAUDE.md's rule is about PRESENTATION, not a Unicode block: a violation is
 * a glyph that renders in the system emoji font — colour, platform-drawn,
 * outside our type control. The tell is U+FE0F, the emoji variation selector,
 * and the astral emoji blocks that have no text presentation at all. The
 * monochrome text-presentation marks the rule explicitly protects — the sort
 * carets, the RSVP tick, the Ava spark — inherit our typeface and
 * currentColor, and are named below rather than inferred from a range.
 *
 * ── WHY THERE IS A RATCHET, AND WHAT IT COSTS ───────────────────────────────
 *
 * A bare version of this guard is red on TWENTY-ONE files of product chrome
 * today. The rule has been in CLAUDE.md all along with nothing enforcing it,
 * so the drift is a backlog, not a regression, and sweeping it is its own
 * package with its own copy decisions (the map pins, the WhatsApp templates,
 * the policy cards). Shipping the guard red would mean shipping a red build.
 *
 * So every file that still carries one is listed, with what it carries. The
 * list is a CEILING: a file may lose emoji freely, and the guard says so when
 * it has — an entry that is no longer needed FAILS, because an allowlist
 * nobody prunes becomes a rule nobody enforces. Anything not on the list is
 * red on its first glyph.
 *
 * ── TWO ENTRIES THAT ARE NOT DRIFT ──────────────────────────────────────────
 *
 *   · src/lib/avaTracking.js matches because it CONTAINS THE PATTERN that
 *     detects emoji. It is the same shape as this file.
 *   · src/pages/Polls.jsx carries `emoji:` as a DATA FIELD — a couple picks
 *     one for their own poll category and their guests see it on the poll.
 *     That is a design decision about what a couple may put on their own
 *     page, not chrome drift, and it needs a ruling rather than a sweep.
 *
 * Neither is exempt here; both are on the ratchet with their reason, so a
 * ruling on either is a line change in one place.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * The marks CLAUDE.md names as NOT violations: monochrome, text-presentation,
 * drawn in our typeface and currentColor. Copied from the rule, not widened.
 */
const ALLOWED = new Set([...'✓✗▲▼▶★☆△◆○↔↗♥❝✆✎✦⇅…—–·×°′″†‡§¶']);

/** Astral emoji blocks, and anything wearing the emoji variation selector. */
const ASTRAL = /[\u{1F000}-\u{1FAFF}]/u;
const VS16 = /️/;

/**
 * file → the glyphs it still carries, and why it has not been swept yet.
 * A CEILING, not a permission: dropping an emoji from one of these is good and
 * the guard will ask for the entry to go.  Dated 2026-09-09.
 */
const RATCHET = {
  'src/lib/avaTracking.js': 'contains the pattern that DETECTS emoji — the same shape as this file',
  'src/pages/Polls.jsx': 'emoji is a DATA field a couple picks for their own poll category — needs a ruling, not a sweep',
  'src/components/messages/WhatsAppCompose.jsx': 'message templates a couple sends themselves',
  'src/components/guest-experience/InteractiveMap.jsx': 'map pin glyphs — need real icons, a design job',
  'src/components/guest-experience/RestaurantRecommendations.jsx': 'a tip lamp',
  'src/components/guest-experience/HotelRecommendations.jsx': 'a tip lamp',
  'src/components/guest-experience/TransportationOptions.jsx': 'a tip lamp',
  'src/components/guest-website/MultiPageWeddingWebsite.jsx': 'the password-gate padlock — chrome on a guest surface',
  'src/components/guest-website/pages/WeddingPollsPage.jsx': 'an empty-state ballot box',
  'src/components/games/GamesManager.jsx': 'an empty-state die',
  'src/components/games/GamesPage.jsx': 'a locked-state padlock',
  'src/components/guests/ImportGuestModal.jsx': 'a toast warning sign',
  'src/components/guests/SendInvitesModal.jsx': 'a love letter in the WhatsApp template',
  'src/components/studio/guest-suite/ExperienceGuideTab.jsx': 'a toast picture frame',
  'src/components/studio/guest-suite/StudioShareTab.jsx': 'share-row glyphs — the same fix as PublishModal, next package',
  'src/components/vendors/VendorDetailPanel.jsx': 'a document page',
  'src/components/website-builder/SectionEditorFields.jsx': 'the media picker’s picture frame',
  'src/lib/trialErrorToast.js': 'an unlocked padlock in a toast',
  'src/pages/Ava.jsx': 'marketing step glyphs',
  'src/pages/AvaStudioWebsite.jsx': 'the media picker’s picture frame at line 73',
  'src/pages/DevReset.jsx': 'warning signs in a dev-only log',
  'src/pages/Guests.jsx': 'a toast warning sign',
  'src/pages/RefundPolicy.jsx': 'policy card glyphs',
};

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (SKIP_DIRS.has(name)) continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (/\.(jsx?|html)$/.test(name)) out.push(rel);
  }
  return out;
}

/** Every offending glyph in a string, with its line. */
function offenders(src) {
  const out = [];
  src.split('\n').forEach((line, i) => {
    for (const ch of [...line]) {
      if (ALLOWED.has(ch)) continue;
      if (ASTRAL.test(ch) || VS16.test(ch)) out.push({ line: i + 1, ch });
    }
  });
  return out;
}

export async function runNoEmoji() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const scanned = [...files('src'), ...files('prerendered')];
  // PRESENCE BEFORE PROPERTIES: an empty list has no emoji in it.
  check('src and prerendered were scanned', scanned.length > 300, `${scanned.length} files`);

  const dirty = new Map();
  for (const f of scanned) {
    const hits = offenders(readFileSync(join(ROOT, f), 'utf8'));
    if (hits.length) dirty.set(f, hits);
  }

  const unlisted = [...dirty.keys()].filter((f) => !RATCHET[f]);
  check('no emoji outside the ratchet', unlisted.length === 0,
    unlisted.length
      ? unlisted.map((f) => `${f}:${dirty.get(f)[0].line} ${dirty.get(f)[0].ch}`).join(', ')
      : `${scanned.length} files, ${dirty.size} on the ratchet`);

  // THE RATCHET ONLY EVER TIGHTENS.
  const stale = Object.keys(RATCHET).filter((f) => !dirty.has(f));
  check('  and every ratchet entry is still earning its place', stale.length === 0,
    stale.length ? `${stale.join(', ')} — swept clean, drop the entry` : `${Object.keys(RATCHET).length} entries`);

  // The two surfaces this package cleaned, named so a revert is loud.
  for (const f of ['src/components/website-builder/PublishModal.jsx']) {
    check(`  ${f.split('/').pop()} carries none`, !dirty.has(f),
      dirty.has(f) ? dirty.get(f).map((h) => `${h.line} ${h.ch}`).join(', ') : 'clean');
  }
  const ava = readFileSync(join(ROOT, 'src/pages/AvaStudioWebsite.jsx'), 'utf8');
  check('  and the completion screen has lost its party popper', !ava.includes('\u{1F389}'), 'line 385');

  // Prerendered is a build artefact: an emoji there came from source.
  const pre = [...dirty.keys()].filter((f) => f.startsWith('prerendered/'));
  check('no emoji reached the prerendered HTML', pre.length === 0,
    pre.length ? pre.join(', ') : `${files('prerendered').length} pages`);

  return results;
}
