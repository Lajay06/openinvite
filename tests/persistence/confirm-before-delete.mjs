/**
 * tests/persistence/confirm-before-delete.mjs
 *
 * A CUSTOM GUEST SUITE PAGE, A SCHEDULE ITEM AND A TO-DO ASK BEFORE THEY GO.
 *
 * Fix batch 1, item 2. Vendors, expenses, seating tables and registry links
 * all confirm a delete before anything is written. These three deleted on the
 * first click. The pattern is the existing one, so the guard holds all seven
 * to it: a confirm that returns before the write, in the one handler each
 * surface deletes through.
 *
 * THE NEW THREE ASK THROUGH THE PRODUCT'S OWN DIALOG, not window.confirm. The
 * owner ruled native dialogs out and no-native-dialog.mjs freezes the old
 * sites as a ratchet that may only shrink, so the pattern (same question,
 * asked before the write) is kept and the browser's box is not.
 * src/components/shared/ConfirmDialog.jsx's useConfirm is that dialog, and
 * each new surface must render it.
 *
 * ORDER IS THE CHECK. A confirm that runs after the delete call is a notice,
 * not a confirmation, so each handler's confirm must come before its write.
 *
 * The plant: drop the confirm line from TodoList.jsx's handleDelete and the
 * to-do check goes red.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => stripComments(readFileSync(join(ROOT, p), 'utf8'));

/** The body of the handler that starts at `start`, up to the next top-level const. */
function handler(src, start) {
  const at = src.indexOf(start);
  if (at === -1) return '';
  const next = src.indexOf('\n  const ', at + start.length);
  return src.slice(at, next === -1 ? undefined : next);
}

const SURFACES = [
  { label: 'a custom Guest Suite page', file: 'src/components/website-builder/WBLeftPanel.jsx', start: 'const handleDeleteCustomPage', write: "onChange('customPages'", ownDialog: true },
  { label: 'a schedule item', file: 'src/pages/ScheduleHub.jsx', start: 'const handleDelete = async', write: 'Schedule.delete(', ownDialog: true },
  { label: 'a to-do', file: 'src/pages/TodoList.jsx', start: 'const handleDelete = async', write: 'Note.delete(', ownDialog: true },
  // The pattern itself, so the three above are measured against something real.
  { label: 'a vendor (the existing pattern)', file: 'src/pages/Vendors.jsx', start: 'const handleDelete = async', write: 'Vendor.delete(' },
  { label: 'an expense (the existing pattern)', file: 'src/pages/Budget.jsx', start: 'const handleDelete = async', write: 'Budget.delete(' },
  { label: 'a seating table (the existing pattern)', file: 'src/pages/Seating.jsx', start: 'const handleDeleteItem', write: 'Table.delete(' },
  { label: 'a registry link (the existing pattern)', file: 'src/pages/Registry.jsx', start: 'const handleStoreDelete', write: 'RegistryItem.delete(' },
];

export function runConfirmBeforeDelete() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  console.log('\n  Every delete asks first, then writes:\n');

  for (const s of SURFACES) {
    const src = code(s.file);
    const body = handler(src, s.start);
    const confirmAt = body.search(/if \(!(?:window\.confirm\(|\(await askToConfirm\()[^]*?\)\) return;/);
    const writeAt = body.indexOf(s.write);
    ok(`${s.label}: confirms before the delete`,
       body.length > 0 && confirmAt !== -1 && writeAt !== -1 && confirmAt < writeAt,
       `${s.file} confirm@${confirmAt} write@${writeAt}`);
    if (s.ownDialog) {
      ok('  through the product\'s own dialog, rendered on that surface',
         !/window\.confirm/.test(body) && /const \[askToConfirm, confirmDialog\] = useConfirm\(\);/.test(src) && /\{confirmDialog\}/.test(src),
         'useConfirm + {confirmDialog}');
    }
  }

  const dialog = code('src/components/shared/ConfirmDialog.jsx');
  ok('the confirm dialog is the shared DialogContent, with no rounding of its own',
     /<DialogContent[^>]*hideClose/.test(dialog) && !/borderRadius|rounded-/.test(dialog), 'inherits the wrapper');
  ok('  and closing it any way but the action answers no',
     /onOpenChange=\{\(open\) => \{ if \(!open\) answer\(false\); \}\}/.test(dialog) && /onClick=\{\(\) => answer\(false\)\}>Cancel/.test(dialog), 'dismiss = false');

  return results;
}
