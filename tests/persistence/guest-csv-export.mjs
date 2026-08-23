/**
 * Guest CSV completeness (E1).
 *
 * The launch copy claims a couple can export "guest list, budget, addresses,
 * notes, photos". The guest CSV shipped 13 columns and carried NONE of
 * mailing_address, notes or special_requests -- addresses being the one most
 * wanted after the day, for thank-you cards.
 *
 * The trap this guards, named before building: these four fields are
 * encrypted at rest. They are restored by mergeGuestPii on the server, so the
 * export must read the DECRYPTED path (/api/my-guests via
 * getMyGuestsWithRsvp -- the same source the guest table renders from). An
 * export reading raw Guest rows would emit empty strings, because the
 * plaintext columns were nulled when the blob took over, and it would do so
 * silently.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../src/pages/Guests.jsx'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ORIGINAL = ['Name','Email','Phone','Category','RSVP Status','Meal Choice','Table Assignment',
                  'Plus One','Plus One Name','Dietary Restrictions','Plus One RSVP','Plus One Meal','Plus One Dietary'];
const ADDED = ['Mailing Address','Notes','Special Requests','Plus One Email'];

export async function runGuestCsvExport() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest CSV export — the claim says "addresses":\n');

  const hdr = CODE.match(/\[([^\]]*?)\]\.join\(','\)/);
  const cols = hdr ? [...hdr[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : [];
  check('header row parsed', cols.length > 0, `${cols.length} columns`);

  for (const c of ADDED) check(`  exports "${c}"`, cols.includes(c), cols.includes(c) ? `col ${cols.indexOf(c)}` : 'MISSING');

  check('the 13 original columns keep their names AND order',
    JSON.stringify(cols.slice(0, 13)) === JSON.stringify(ORIGINAL),
    cols.slice(0, 13).join('|'));
  check('  the new columns are APPENDED, not interleaved',
    JSON.stringify(cols.slice(13)) === JSON.stringify(ADDED), cols.slice(13).join('|'));

  // Header and row mapper must stay the same width or every value shifts one
  // column left. Counted by TOP-LEVEL commas, not by lines: several cells are
  // multi-line ternaries, and a line count reports them as many cells.
  const mapper = CODE.match(/\.\.\.guests\.map\(g => \[([\s\S]*?)\]\.map\(f =>/);
  let cells = -1;
  if (mapper) {
    let depth = 0; cells = 1;
    for (const ch of mapper[1]) {
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      else if (ch === ',' && depth === 0) cells++;
    }
  }
  check('row mapper emits one cell per header column', cells === cols.length, `${cells} cells vs ${cols.length} columns`);

  // the decrypted read path — the whole point
  check('rows come from getMyGuestsWithRsvp (the decrypted path)',
    /getMyGuestsWithRsvp\(/.test(CODE), 'decrypted');
  // Scoped to the EXPORT function. base44.entities.Guest is aliased at module
  // level for create/update/delete, which is legitimate -- the requirement is
  // that the EXPORT never sources rows from it, since raw rows carry nulls for
  // every encrypted field.
  const exportFn = CODE.match(/const exportGuestList = \(\) => \{([\s\S]*?)\n  \};/);
  check('  the export function never reads a raw Guest entity',
    !!exportFn && !/\bGuest\.(list|filter|find)/.test(exportFn[1]) && !/base44\.entities/.test(exportFn[1]),
    exportFn ? 'sources only from `guests` state' : 'export fn not found');

  // encrypted-at-rest fields are referenced plainly, not via a blob accessor
  for (const f of ['mailing_address', 'notes', 'special_requests', 'plus_one_email']) {
    check(`  ${f} read off the merged row`, new RegExp(`g\\.${f}`).test(CODE), `g.${f}`);
  }

  return results;
}
