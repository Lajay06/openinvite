/**
 * tests/persistence/vendor-tab-order.mjs
 *
 * THE VENDOR TAB COMES FIRST, AND NOTHING WAS DROPPED TO GET THERE.
 *
 * Item 7 of goals/2026-10-08-site-fixes-batch-1.md. Four vendor sections, one
 * rule: the people you booked come before the plan you made with them.
 *
 * ── THE DELETION IS THE PART THAT NEEDED CARE ──────────────────────────────
 *
 * The item says to delete Photography's "Photo & video details" tab because
 * "it duplicates the two vendor tabs". It did not. Those two render the vendor
 * ROSTER; that tab held the package, the hours, the video length and two style
 * notes, bound to details.photography.*, and they existed nowhere else in the
 * page. Deleting the tab on its own would have deleted six fields a couple had
 * already filled in, silently, with the data still in Base44 and no screen
 * left that could read it.
 *
 * The goal is explicit that content migration comes before deletion and is
 * "required, not optional", so each half moved to the vendor tab it belongs
 * to. This guard pins every one of those eight bindings by name, because a
 * field that loses its only input is invisible: nothing errors, the page still
 * renders, and the value simply stops being editable.
 *
 * ── MUSIC IS THE ONE SECTION WHERE THE FIRST TAB IS NOT THE DEFAULT ────────
 *
 * A collaborator never sees Music's vendor tab: the strip filters it out and
 * its body is gated on !isCollaborating. Opening there would land them on a
 * blank page, and the flag comes from a query that resolves after the state
 * initialises, so a conditional default would guess or make the page jump.
 * The order changed; the default did not, and that asymmetry is asserted here
 * rather than left to look like an oversight.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The tab keys a page declares, in order. */
function tabKeys(src) {
  const block = src.slice(src.indexOf('TABS = ['));
  return [...block.slice(0, block.indexOf('];')).matchAll(/key: '([a-z-]+)'/g)].map((m) => m[1]);
}

export async function runVendorTabOrder() {
  const results = [];
  const show = (v) => String(JSON.stringify(v)).slice(0, 80);
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want) ? pass(label, show(got)) : fail(label, show(want), show(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE ORDER, SECTION BY SECTION ───────────────────────────────────────

  const beauty = code(read('src/pages/Beauty.jsx'));
  check('Beauty leads with the team',
        tabKeys(beauty), ['beauty-team', 'hair-makeup', 'skincare', 'trials', 'considerations']);
  ok('  and opens on it', /useState\('beauty-team'\)/.test(beauty), 'default moved with the tab');

  const music = code(read('src/pages/Music.jsx'));
  check('Music leads with the vendor',
        tabKeys(music), ['vendor', 'playlist', 'notes', 'considerations']);
  // THE ASYMMETRY, ASSERTED: order changed, default did not, and the two facts
  // that make that correct are both still true.
  ok('  and still opens on the playlist, because a collaborator cannot see the vendor tab',
     /useState\('playlist'\)/.test(music), 'default unchanged on purpose');
  ok('    the strip still hides that tab from a collaborator',
     /tab\.key !== 'vendor'/.test(music), 'filtered');
  ok('    and its body is still gated too',
     /!isCollaborating && activeTab === 'vendor'/.test(music), 'gated');

  const photo = code(read('src/pages/Photography.jsx'));
  check('Photography keeps five tabs, the vendors first',
        tabKeys(photo), ['photographers', 'videographers', 'shot-list', 'timeline', 'considerations']);
  ok('  the details tab is gone', !/key: 'details'/.test(photo) && !/activeTab === 'details'/.test(photo),
     'no key, no branch');
  ok('  and it opens on the photographers', /useState\("photographers"\)/.test(photo), 'unchanged');

  const food = code(read('src/pages/FoodBeverage.jsx'));
  check('Catering was already right and is untouched',
        tabKeys(food), ['catering', 'menu', 'bar', 'notes', 'considerations']);
  ok('  and still opens on it', /useState\('catering'\)/.test(food), 'unchanged');

  // ── NOTHING WAS DROPPED ─────────────────────────────────────────────────
  //
  // Every binding the deleted tab owned, by name. A field that loses its only
  // input is invisible: nothing errors and the stored value simply stops being
  // editable.
  const MOVED = {
    photographers: ['photographerVendorId', 'photographyPackage', 'photographyHours', 'photographyStyle'],
    videographers: ['videographerVendorId', 'videographyPackage', 'videoLength', 'videoStyle'],
  };
  for (const [tab, fields] of Object.entries(MOVED)) {
    // The tab's own body, from its branch to the next one.
    const from = photo.indexOf(`activeTab === '${tab}'`);
    const rest = photo.slice(from);
    const to = rest.indexOf('{activeTab ===', 10);
    const body = to > 0 ? rest.slice(0, to) : rest;
    ok(`the ${tab} tab still renders the roster`,
       /VendorRosterSection/.test(body), 'roster kept');
    for (const f of fields) {
      ok(`  and now owns ${f}`, body.includes(f), 'migrated');
    }
  }
  // AND EVERY FIELD IS READ BY EXACTLY ONE INPUT, so the migration MOVED the
  // controls rather than copying them into two tabs that would fight over the
  // same value.
  //
  // COUNTING THE READ, NOT THE NAME. Each field appears twice on its own line,
  // once as `value={details.photography?.X}` and once inside the onChange, so
  // a bare name count expects two for every field and proves nothing about
  // duplication. The read is the binding.
  for (const f of [...MOVED.photographers, ...MOVED.videographers]) {
    const reads = (photo.match(new RegExp(`details\\.photography\\?\\.${f}\\b`, 'g')) || []).length;
    check(`  ${f} is read by exactly one input`, reads, 1);
  }

  return results;
}
