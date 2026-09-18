/**
 * CLICKING A STOCK PHOTO CHOOSES IT.
 *
 * Owner report, Run 5 T10: in the media library's Stock photos tab, clicking a
 * photo "loads, then the pane goes blank and nothing appears selected" — and
 * the photo turns up under Uploaded.
 *
 * ── WHAT THE CLICK USED TO DO ──────────────────────────────────────────────
 *
 * handleSelectStockPhoto downloaded the full-size image, re-uploaded it to the
 * couple's own storage with base44 UploadFile, and called onUploaded — and
 * never once called onSelect. So a click did three surprising things and none
 * of the expected one: the picker stayed open (nothing closed it), nothing
 * looked selected (no selection was made), and a file appeared in Uploaded as
 * though the couple had added it. The report describes that sequence exactly.
 *
 * ── WHY THE CHECKS ARE WHAT THEY ARE ───────────────────────────────────────
 *
 * "Selects immediately and closes" is two facts and an absence: onSelect with
 * the photo's URL, onClose, and NO upload. The absence is the one that would
 * have caught the original, so it is asserted by name — UploadFile and
 * onUploaded must not appear anywhere in the stock path.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const raw = readFileSync(join(ROOT, 'src/components/website-builder/MediaLibraryModal.jsx'), 'utf8');
const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The body of handleSelectStockPhoto, so a check cannot match another handler. */
function stockHandler() {
  const at = code.indexOf('const handleSelectStockPhoto');
  if (at < 0) return '';
  const rest = code.slice(at);
  const end = rest.indexOf('\n  };');
  return end < 0 ? rest : rest.slice(0, end);
}

export async function runMediaStockSelect() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  A stock photo is chosen, not imported:\n');

  const h = stockHandler();
  check('the stock handler exists', h.length > 0, h ? 'handleSelectStockPhoto' : 'gone');
  check('  it selects the photo', /onSelect\(photo\.full\)/.test(h), 'onSelect with the photo URL');
  check('  and closes the picker', /onClose\(\)/.test(h), 'one click, one result');

  // THE ABSENCE THAT WOULD HAVE CAUGHT IT.
  check('  and uploads nothing', !/UploadFile/.test(h), 'no copy into the couple\'s storage');
  check('  and adds nothing to Uploaded', !/onUploaded/.test(h), 'the Uploaded tab is untouched by a stock click');
  check('  and does not download the image first', !/await fetch\(photo\.full\)/.test(h),
    'the URL is passed, not the bytes');

  // The same click, in the markup: no disabled state left behind from the
  // import it no longer does.
  check('the tile is always clickable', !/importing \? null/.test(code) && !/stockImportingId/.test(code),
    'the importing spinner went with the import');

  // An uploaded photo is still chosen the way it always was — the shape this
  // handler now matches.
  check('an uploaded photo is still chosen the same way',
    /onClick=\{\(\) => \{ onSelect\(selected\.url\); onClose\(\); \}\}/.test(code),
    'one path, two tabs');

  return results;
}
