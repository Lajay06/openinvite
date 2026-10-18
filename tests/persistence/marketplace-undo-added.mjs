/**
 * tests/persistence/marketplace-undo-added.mjs
 *
 * "ADDED" CAN BE UNDONE FROM THE MARKETPLACE.
 *
 * Fix batch 1, item 5. Adding a vendor from the marketplace turned the card's
 * button into a disabled "Added", and taking it back meant leaving for My
 * vendors. The card and the profile modal now offer the removal, which asks
 * the same question every other vendor removal asks ("Delete this vendor?",
 * Vendors.jsx and VendorRosterSection.jsx) before anything is deleted, and
 * deletes only this couple's own record for that place. It asks in the
 * product's own dialog (src/components/shared/ConfirmDialog.jsx): native
 * dialogs are ruled out and no-native-dialog.mjs only lets their count fall.
 *
 * The plant: drop the askToConfirm line from handleRemove in
 * VendorMarketplace.jsx and the confirm check goes red.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => stripComments(readFileSync(join(ROOT, p), 'utf8'));

export function runMarketplaceUndoAdded() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  console.log('\n  The marketplace can take back an add:\n');

  const page = code('src/pages/VendorMarketplace.jsx');
  const remove = page.slice(page.indexOf('const handleRemove = async'), page.indexOf('const handleViewProfile'));
  const confirmAt = remove.indexOf("if (!(await askToConfirm('Delete this vendor?'))) return;");
  const deleteAt = remove.indexOf('removeVendorByPlaceId(');
  ok('removing asks the same question as every vendor removal, before deleting',
     confirmAt !== -1 && deleteAt !== -1 && confirmAt < deleteAt, `confirm@${confirmAt} delete@${deleteAt}`);
  ok('  in the product\'s own dialog, rendered on the page',
     !/window\.confirm/.test(remove) && /const \[askToConfirm, confirmDialog\] = useConfirm\(\);/.test(page) && /\{confirmDialog\}/.test(page), 'useConfirm');
  for (const f of ['src/pages/Vendors.jsx', 'src/components/vendors/VendorRosterSection.jsx']) {
    ok(`  ${f} still asks that same question`, /window\.confirm\(["']Delete this vendor\?["']\)/.test(code(f)), 'same words');
  }
  ok('  and the card goes back to offering the add', /setSavedIds\(prev => \{ const s = new Set\(prev\); s\.delete\(vendor\.id\)/.test(remove), 'savedIds.delete');
  ok('both the card and the profile modal are given the removal',
     (page.match(/onRemove=\{handleRemove\}/g) || []).length === 2, 'VendorCard and VendorProfileModal');

  const card = code('src/components/marketplace/VendorCard.jsx');
  ok('the card\'s "Added" button calls onRemove instead of sitting disabled',
     /onClick=\{\(\) => \(isSaved \? onRemove\?\.\(vendor\) : onSave\(vendor\)\)\}/.test(card)
       && /disabled=\{isSaving \|\| \(isSaved && !onRemove\)\}/.test(card), 'onRemove when saved');
  ok('  and says what it does to a screen reader', /aria-label=\{isSaved && onRemove \? `Remove \$\{vendor\.name\} from my vendors`/.test(card), 'aria-label');
  const modal = code('src/components/marketplace/VendorProfileModal.jsx');
  ok('the profile modal offers "Remove from my vendors" once added',
     /isSaved && onRemove && \([\s\S]*?onClick=\{\(\) => onRemove\(vendor\)\}[\s\S]*?Remove from my vendors/.test(modal), 'text button');

  const lib = code('src/lib/vendorPlaces.js');
  const fn = lib.slice(lib.indexOf('export async function removeVendorByPlaceId'));
  ok('removeVendorByPlaceId only deletes this couple\'s own records for that place',
     /filter\(\{ created_by_id: me\.id, google_place_id: placeId \}\)/.test(fn)
       && /r\.created_by_id === me\.id && r\.google_place_id === placeId/.test(fn), 'owner-scoped, re-checked per row');
  ok('  and refuses without a signed-in couple', /if \(!me\?\.id\) throw/.test(fn), 'throws');

  return results;
}
