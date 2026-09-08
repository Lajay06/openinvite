/**
 * tests/persistence/hero-masters.mjs
 *
 * EVERY HERO COMES FROM heroes-jpg, AND NOTHING ASKS FOR MORE THAN THE
 * MASTER HOLDS.
 *
 * ── THE TWO FAILURES THIS EXISTS FOR ────────────────────────────────────────
 *
 * 1. A REFERENCE LEFT BEHIND. Nineteen heroes were swapped by hand across
 *    nineteen files. One missed line is invisible — the page still renders a
 *    photograph, just the old soft one — and there is no error anywhere.
 *
 * 2. ASKING FOR MORE THAN EXISTS. Cloudinary upscales past a master happily
 *    and CHARGES for it: `w_1600` on a 1280px master measured 34% MORE bytes
 *    than no width at all, for a picture with no more detail in it (#670).
 *    The per-universe width map is what prevents that, and a map is exactly
 *    the kind of thing that goes stale silently.
 *
 * ── AMALFI IS THE ONE EXEMPTION, AND IT IS NAMED ────────────────────────────
 *
 * The owner has re-shot nineteen of twenty. amalfi keeps its old master, so
 * it cannot satisfy "resolves to a heroes-jpg public id" and is listed here
 * by name. The exemption is asserted to be the ONLY one and to still be
 * NEEDED: the day amalfi's 4K master lands and the swap is made, this guard
 * goes red until the exemption is deleted. An exemption nobody is forced to
 * remove is how the old static universe images survived for a year.
 *
 * ── WHAT THIS CANNOT CHECK ──────────────────────────────────────────────────
 *
 * That the widths in HERO_MASTERS match Cloudinary. CI has no credentials and
 * should not have any. What it checks is the shape — every hero is a
 * heroes-jpg name, every name is in the map, and every delivered width is at
 * or under its mapped master. Re-measuring is a human act, with the search
 * expression in heroMasters.js's own docstring.
 */
import { pass, fail } from './_shared.mjs';
import { sampleUniverseIds, getSampleWedding } from '../../src/lib/sampleContent/index.js';
import { universeScrollImage } from '../../src/lib/universeCatalog.js';
import { HERO_MASTERS, HERO_TARGET_WIDTH, heroPublicId, heroMasterWidth } from '../../src/lib/heroMasters.js';
import { HERO_FOCUS, HERO_FOCUS_DEFAULT, heroFocus } from '../../src/lib/heroFocus.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Universes whose hero is not yet a heroes-jpg asset. One, by name. */
const NOT_RESHOT = ['amalfi'];

/** heroes-jpg names are `<name>-hero_<code>`. capetown's is `cape-town-`. */
const HEROES_JPG = /^[a-z-]+-hero_[a-z0-9]+$/;

/** The width in a delivery URL, or null. */
const widthOf = (url) => {
  const m = /[,/]w_(\d+)[,/]/.exec(String(url || ''));
  return m ? Number(m[1]) : null;
};

export async function runHeroMasters() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const ids = sampleUniverseIds();

  // PRESENCE BEFORE PROPERTIES: with no universes, every loop below passes by
  // running zero times.
  check('the sample universes are readable', ids.length === 20, `${ids.length} universe(s)`);
  if (!ids.length) return results;

  for (const id of ids) {
    const cover = getSampleWedding(id)?.coverPhoto;
    const pid = heroPublicId(cover);
    const master = heroMasterWidth(cover);
    const exempt = NOT_RESHOT.includes(id);

    check(`${id}: its hero is a heroes-jpg asset`,
      exempt ? !HEROES_JPG.test(pid) : HEROES_JPG.test(pid),
      exempt ? `${pid.slice(0, 28)}… — exempt, not re-shot yet` : pid);

    // Without a mapped master there IS no ceiling, so this has to be a
    // failure rather than a skip.
    check(`  its master width is known`, master !== null, master ? `${master}px` : 'not in HERO_MASTERS');
    if (master === null) continue;

    const coverW = widthOf(cover);
    check(`  the hero slot asks for no more than the master holds`,
      coverW !== null && coverW <= master, `w_${coverW} of ${master}`);

    // And it must not UNDER-ask either: a map whose only effect was to stay
    // safe would leave every 4K master serving 1376 and change nothing.
    check(`  and it asks for everything a 1440@2x hero needs`,
      coverW === Math.min(HERO_TARGET_WIDTH, master), `w_${coverW}, wanted ${Math.min(HERO_TARGET_WIDTH, master)}`);

    const scroll = universeScrollImage(id);
    const scrollW = widthOf(scroll);
    check(`  the marketing scroll does the same`,
      scrollW !== null && scrollW <= master && scrollW === Math.min(HERO_TARGET_WIDTH, master),
      `w_${scrollW} of ${master}`);

    // The chain the package said to keep, unchanged.
    check(`  and keeps the crop and gravity it had`,
      /c_fill,g_faces:auto,f_auto,q_auto,/.test(scroll), (String(scroll).split('/upload/')[1] || '').split('/')[0]);
  }

  // The exemption must be real. When amalfi is re-shot and swapped, this line
  // is what forces the exemption to be deleted rather than left to rot.
  for (const id of NOT_RESHOT) {
    const pid = heroPublicId(getSampleWedding(id)?.coverPhoto);
    check(`${id} is still exempt for a reason — it is not a heroes-jpg asset yet`,
      !HEROES_JPG.test(pid), pid.slice(0, 34) + '…');
  }
  check('nothing else is exempt', NOT_RESHOT.length === 1, NOT_RESHOT.join(', '));

  // ── WHERE THE HERO IS CROPPED FROM ────────────────────────────────────────
  //
  // The crop is done by CSS, not by Cloudinary: the delivery is 16:9 and each
  // surface object-fits it into a container of its own shape, so on a phone
  // the browser takes the slice and object-position picks it. Three surfaces
  // render a hero that way and all three must ask heroFocus, or a universe is
  // framed correctly in two places and centred blind in the third.
  const HERO_SURFACES = [
    'src/pages/Universes.jsx',
    'src/components/universe-studio/UniverseBanner.jsx',
    'src/components/universe-studio/UniverseWorldView.jsx',
  ];
  for (const f of HERO_SURFACES) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    check(`${f.split('/').pop()} takes its object-position from heroFocus`,
      /objectPosition: heroFocus\(/.test(src),
      /objectPosition:/.test(src) ? (src.match(/objectPosition: [^,\n]+/) || [''])[0] : 'no objectPosition at all');
  }

  // An override is a claim that someone looked at that photograph. Every one
  // has to name a universe that exists, or it is silently doing nothing.
  for (const id of Object.keys(HERO_FOCUS)) {
    check(`the ${id} focus override names a real universe`, ids.includes(id), HERO_FOCUS[id]);
  }
  // SETS, NOT JOINED STRINGS. The first version compared
  // ids.filter(...).join() against Object.keys(HERO_FOCUS).join(), which made
  // the check ORDER-dependent: it went red the moment an entry was added in a
  // place other than the end, with a message about universes being centred
  // when every universe was in fact correct. A guard that fails on the shape
  // of its own comparison teaches people to ignore it.
  // A RATCHET, AND IT IS DELIBERATELY A LIST OF NAMES.
  //
  // Everything else here checks that the map is WELL FORMED. Nothing can check
  // that it is COMPLETE: "the couple is whole and mid-frame at 390" is a fact
  // about a photograph, and the one instrument that could judge it — face
  // detection — was measured on all twenty and is wrong in both directions.
  // It finds no face at all in brooklyn, kyoto, monaco or seoul, and in havana
  // it finds four, counting two bystanders as part of the subject and dragging
  // the computed centre from 50% to 37%.
  //
  // So deleting an entry is invisible: the universe falls back to centre and
  // every check still passes, which is exactly what happened when this plant
  // was first run. This list is what makes that deletion loud. It is not a
  // restatement of the map — it is the record of which universes a human
  // looked at and ruled on, and changing it has to be a decision.
  const OWNER_RULED = ['amalfi', 'bali', 'brooklyn', 'havana', 'kyoto', 'monaco', 'mykonos', 'shanghai', 'taj'];
  const declaredNow = Object.keys(HERO_FOCUS).sort();
  check('every universe the owner ruled on still has its focus entry',
    OWNER_RULED.every((id) => declaredNow.includes(id)),
    OWNER_RULED.filter((id) => !declaredNow.includes(id)).join(', ') || `all ${OWNER_RULED.length} present`);

  const overridden = ids.filter((id) => heroFocus(id) !== HERO_FOCUS_DEFAULT).sort();
  const declared = Object.keys(HERO_FOCUS).sort();
  check('every universe that is not centred is one this map declares',
    overridden.length === declared.length && overridden.every((id, i) => id === declared[i]),
    `overridden: ${overridden.join(', ') || 'none'}`);

  // THE PRERENDERED PAGE IS A SEPARATE ARTIFACT and goes stale on its own:
  // it is generated, committed, and served as-is. A swap that never reached
  // it would serve the old photograph to every visitor who is not running JS.
  const html = readFileSync(join(ROOT, 'prerendered/universes/index.html'), 'utf8');
  const inHtml = [...html.matchAll(/upload\/[^/"']*\/([A-Za-z0-9_-]+)["'\s]/g)].map((m) => m[1]);
  const heroesInHtml = inHtml.filter((p) => HEROES_JPG.test(p) || p in HERO_MASTERS);
  check('the prerendered universes page carries hero assets at all',
    heroesInHtml.length > 0, `${heroesInHtml.length} reference(s)`);
  const stale = [...new Set(heroesInHtml.filter((p) => !HEROES_JPG.test(p) && !NOT_RESHOT.some((id) => heroPublicId(getSampleWedding(id)?.coverPhoto) === p)))];
  check('  and none of them is an asset we have replaced',
    stale.length === 0, stale.join(', ') || 'every one is heroes-jpg or the named exemption');

  return results;
}
