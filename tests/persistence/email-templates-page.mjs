/**
 * THE TEMPLATE GALLERY: A HEADER ON EVERY CARD, THE COUPLE'S OWN UNIVERSE,
 * AND ONE LINE SAYING WHERE THE DESIGN IS CHANGED.
 *
 * Owner report, Run 5 T12, three things on Guest list -> Email templates.
 *
 * (a) THE FIRST CARD HAD NO HEADER. The card is not special: every type
 *     renders the same two lines, and both were reading undefined, because
 *     TYPE_LABELS had no save_the_date entry (fixed in T14) and
 *     TYPE_DESCRIPTIONS had none either. A missing map entry, twice, not a
 *     missing header.
 *
 * (b) THE THUMBNAILS. Each card renders the REAL template through
 *     renderInvitationEmail with the wedding's activeUniverse. The palette
 *     falls back to london when the id is unknown or absent — and london is a
 *     warm cream, which is exactly what "the generic beige set" describes. So
 *     the check that matters is not "does it pass a universe" but "does the
 *     rendered html carry THAT universe's colour rather than the fallback's",
 *     and the two must be distinguishable: a fixture on london could not tell
 *     them apart, so this drives a universe that is not the fallback.
 *
 * (c) THE NOTE AND ITS BUTTON. A sentence promising a destination has to carry
 *     one, so the link is to the studio's email panel, and the studio reads it.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInvitationEmail, EMAIL_TYPES } from '../../src/lib/emailTemplate.js';
import { getUniverseEmailStyle } from '../../src/lib/universeEmailStyles.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runEmailTemplatesPage() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  The template gallery:\n');

  // ── (a) a header on every card ──────────────────────────────────────────
  const gallery = code('src/components/guests/EmailTemplates.jsx');
  const labels = code('src/components/guests/SendInvitesModal.jsx');
  const missingLabel = EMAIL_TYPES.filter((t) => !new RegExp(`${t}:\\s*'`).test(labels));
  const missingDesc = EMAIL_TYPES.filter((t) => !new RegExp(`${t}:\\s*'`).test(gallery.slice(gallery.indexOf('TYPE_DESCRIPTIONS'), gallery.indexOf('export default'))));
  check('every card has a name', missingLabel.length === 0,
    missingLabel.length ? `no label for: ${missingLabel.join(', ')}` : `${EMAIL_TYPES.length} types`);
  check('  and a description under it', missingDesc.length === 0,
    missingDesc.length ? `no description for: ${missingDesc.join(', ')}` : `${EMAIL_TYPES.length} types`);

  // ── (b) the thumbnail is the couple's universe ──────────────────────────
  //
  // Rendered, not inspected: the card's iframe is exactly this html.
  const chosen = 'capri';
  const fallback = getUniverseEmailStyle(undefined);
  const capri = getUniverseEmailStyle(chosen);
  check('the fallback and the test universe are distinguishable',
    capri.bgTint.toLowerCase() !== fallback.bgTint.toLowerCase(),
    `${chosen} ${capri.bgTint} vs fallback ${fallback.id} ${fallback.bgTint}`);

  const withUniverse = renderInvitationEmail({ universeId: chosen, type: 'invite', coupleNames: 'Ada & Alan' }).html;
  const withNone = renderInvitationEmail({ type: 'invite', coupleNames: 'Ada & Alan' }).html;
  check('  a card rendered for a universe carries that universe',
    withUniverse.includes(capri.bgTint) && !withUniverse.includes(fallback.bgTint),
    `${chosen}'s ${capri.bgTint} is in the html`);
  check('  and with none chosen it falls back, generically',
    withNone.includes(fallback.bgTint),
    `${fallback.id} ${fallback.bgTint}`);
  check('  the gallery passes the wedding\'s own universe', /universeId = wedding\?\.activeUniverse/.test(gallery),
    'activeUniverse, the field the studio writes');
  check('  and renders nothing until the wedding is loaded',
    /if \(loading\) \{/.test(gallery),
    'no card is drawn against an absent record, which is what a fallback would look like');

  // ── (c) the note, and a button that lands where it says ─────────────────
  check('the gallery says where the design is changed',
    gallery.includes('Email designs are edited in the Design studio'), 'the exact line');
  check('  with a button to the studio\'s emails', /navigate\('\/website-editor\?panel=emails'\)/.test(gallery),
    'the destination is in the link');
  const studio = code('src/pages/StudioWebsite.jsx');
  check('  and the studio opens on them', /panel !== 'emails'/.test(studio) && /setSelectedEmail\(\{ entryId: first\.id/.test(studio),
    'the first email template is selected on arrival');

  return results;
}
