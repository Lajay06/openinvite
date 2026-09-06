/**
 * tests/persistence/universe-gallery.mjs
 *
 * THE UNIVERSE DETAIL PAGE'S GALLERY, AND THE ACTION ON ITS HERO.
 *
 * The page used to end its middle with "Your wedding in this world": two grey
 * cards reading "Not published yet", under the couple's own names, on the
 * screen where they are deciding whether they like a universe. The owner ruled
 * it an old asset block. Four photographs of the universe answer the question
 * that screen actually asks; two disabled cards about the couple's own
 * unpublished site do not.
 *
 * WHY THE SELECTION RULES ARE IN A MODULE AND ASSERTED HERE. "Take the four
 * Our Story photos" is one line until it meets the folders: some universes had
 * a slot doubled because the folder was short, and four thumbnails of the same
 * photograph in a row is not a gallery. The hero is directly above on the same
 * screen, so repeating it reads as a mistake. The omission fixture is not a
 * universe and must never render. None of that is visible in a screenshot of
 * one universe, which is why it is twenty assertions rather than one look.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { universeGallery, selectGalleryPhotos, galleryUrl, publicIdOf, GALLERY_COUNT, GALLERY_WIDTH } from '../../src/lib/universeGallery.js';
import { getSampleWedding, sampleUniverseIds, OMISSION_FIXTURE_ID } from '../../src/lib/sampleContent/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WORLD_VIEW = 'src/components/universe-studio/UniverseWorldView.jsx';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
/** Comments stripped — see design-studio-entrance.mjs for why this keeps happening. */
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runUniverseGallery() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The universe detail page — four photographs, and the action on the hero:\n');

  const ids = sampleUniverseIds();

  // ── EVERY UNIVERSE YIELDS FOUR, AND NONE OF THEM IS THE HERO ────────────
  {
    const short = [];
    const heroLeak = [];
    const dupes = [];
    const badUrl = [];
    for (const id of ids) {
      const g = universeGallery(id, id);
      if (g.length !== GALLERY_COUNT) short.push(`${id}=${g.length}`);
      const heroId = publicIdOf(getSampleWedding(id).coverPhoto);
      if (g.some((p) => p.publicId === heroId)) heroLeak.push(id);
      if (new Set(g.map((p) => p.publicId)).size !== g.length) dupes.push(id);
      if (!g.every((p) => /\/c_fill,g_auto,f_auto,q_auto,w_\d+,h_\d+\//.test(p.url))) badUrl.push(id);
    }
    check(`all ${ids.length} universes yield ${GALLERY_COUNT} photographs`,
      short.length === 0, short.join(', ') || `${ids.length} × ${GALLERY_COUNT}`);
    check('  and not one of them is the hero, which is directly above on the same screen',
      heroLeak.length === 0, heroLeak.join(', ') || 'no hero in any gallery');
    check('  and the four are distinct in every universe, doubled folders included',
      dupes.length === 0, dupes.join(', ') || 'four different photographs everywhere');
    check('  every URL carries the crop and an explicit width',
      badUrl.length === 0, badUrl.join(', ') || `c_fill,g_auto,f_auto,q_auto,w_${GALLERY_WIDTH},h_…`);
  }

  // ── THE FIXTURE NEVER RENDERS, AND NOTHING THROWS ───────────────────────
  check('the omission fixture yields no gallery — it is a control, not a universe',
    universeGallery(OMISSION_FIXTURE_ID, 'x').length === 0, '0 photographs');
  check('  a universe with no sample block yields none rather than throwing',
    universeGallery('no-such-universe', 'x').length === 0, '0 photographs, no throw');
  check('  and so do the shapes a bug would hand it',
    universeGallery(null).length === 0 && universeGallery(undefined).length === 0 && universeGallery('').length === 0,
    'null, undefined and empty string all return []');

  // ── ALT TEXT ────────────────────────────────────────────────────────────
  {
    const g = universeGallery('havana', 'Havana');
    check('alt text names the universe and numbers the photograph',
      g.map((p) => p.alt).join(' | ') === 'Havana — sample photograph 1 | Havana — sample photograph 2 | Havana — sample photograph 3 | Havana — sample photograph 4',
      g[0]?.alt);
  }

  // ── THE TRANSFORM IS REPLACED, NOT CHAINED ──────────────────────────────
  {
    const stored = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1400/some_public_id';
    const out = galleryUrl(stored);
    check('the stored w_1400 transform is REPLACED, not chained onto',
      out === `https://res.cloudinary.com/dsr84xknv/image/upload/c_fill,g_auto,f_auto,q_auto,w_${GALLERY_WIDTH},h_800/some_public_id`, out);
    check('  and a non-Cloudinary URL yields null rather than a mangled one',
      galleryUrl('/universes/havana.jpg') === null && galleryUrl('') === null, 'null');
    check(`  the requested width never exceeds the smallest master in these folders (1376px)`,
      GALLERY_WIDTH <= 1376, `w_${GALLERY_WIDTH}`);
  }

  // ── THE PAGE RENDERS IT, IN THE RIGHT PLACE, IN THE RIGHT SHAPE ─────────
  {
    const src = code(WORLD_VIEW);
    check('the page renders the gallery from the module rather than reaching into samples itself',
      /universeGallery\(universe\.id, universe\.name\)/.test(src), 'universeGallery(universe.id, universe.name)');
    check('  a universe with no photographs renders no section at all',
      /\{gallery\.length > 0 && \(/.test(src), 'gallery.length > 0 gate');
    check('  four columns on a desktop and two on a phone',
      /\.uwv-gallery \{ grid-template-columns: repeat\(4, 1fr\); \}/.test(src)
        && /@media \(max-width: 640px\)[\s\S]{0,90}repeat\(2, 1fr\)/.test(src),
      'an explicit count, not auto-fit');
    check('  the tiles are 4:5 and cropped, not letterboxed',
      /aspectRatio: '4 \/ 5'/.test(src) && /objectFit: 'cover'/.test(src), "aspectRatio 4/5 + objectFit cover");
    check('  no caption and no heading inside the row',
      !/<figcaption/.test(src), 'images only');

    // PAGE ORDER, read off the source in the order the labels appear.
    const order = [...src.matchAll(/Nº 0\d — ([A-Za-z &]+?)\s*\n/g)].map((m) => m[1].trim());
    check('the numbered sections run world, gallery, palette, typography, motifs',
      order.join(' > ') === 'The world > The gallery > Palette > Typography > Motifs & textures',
      order.join(' > ') || 'no labels found');
  }

  // ── ONE HANDLER, TWO PLACEMENTS ─────────────────────────────────────────
  {
    const src = code(WORLD_VIEW);
    const calls = (src.match(/onClick=\{\(\) => onSwitchUniverse\(universe\.id\)\}/g) || []).length;
    check('the hero CTA and the closing CTA call the SAME handler',
      calls === 2, `${calls} call sites, both onSwitchUniverse(universe.id)`);
    check('  the hero receives the handler as a prop rather than reimplementing it',
      /onSwitchUniverse=\{onSwitchUniverse\}/.test(src) && /function HeroChapter\(\{[^}]*onSwitchUniverse/.test(src),
      'passed down, not duplicated');
    const disabled = (src.match(/disabled=\{isCurrent\}/g) || []).length;
    check('  both are disabled when this is already the current universe',
      disabled === 2, `${disabled} of 2`);
    const copy = (src.match(/'This is your current universe' : 'Make this my universe'/g) || []).length;
    check('  and both carry the same two strings',
      copy === 2, `${copy} of 2`);
    check('  the hero offers nothing when the universe is gated behind Ultra',
      /\{!showUpgrade && \(/.test(src), 'showUpgrade hides the hero button');
  }

  // ── THE ONE LINK THE DELETION COULD HAVE TAKEN WITH IT ──────────────────
  {
    const src = code(WORLD_VIEW);
    check('the route to the website editor survives the deletion as a plain link',
      /href="\/website-editor"/.test(src) && !/RealSurfaceTile/.test(src), 'one <a>, no card');
  }

  // ── PLANTED FAILURES (R19) ──────────────────────────────────────────────
  {
    // PLANT 1: THE HERO EXCLUSION, EXERCISED RATHER THAN OBSERVED.
    //
    // The first version of this block asked whether any of the twenty real
    // galleries contained its hero. None does — and none WOULD have, even with
    // the exclusion deleted from the module, because no universe's Our Story
    // happens to hold its own hero. Deleting the rule left the guard green.
    // That is P2's failure one level in: a check that cannot fail on the data
    // it is given is not a check.
    //
    // So the rule is exercised on a record that DOES contain the hero. With
    // `if (id === heroId) return` removed from selectGalleryPhotos, this goes
    // red; it was verified by doing exactly that.
    const U = 'https://res.cloudinary.com/c/image/upload/f_auto,q_auto';
    const crafted = {
      coverPhoto: `${U},w_2048/HERO`,
      ourStoryContent: { photos: [`${U},w_1400/HERO`, `${U},w_1400/A`, `${U},w_1400/B`] },
      homeContent: { blocks: [
        { type: 'photo', content: { url: `${U},w_1400/C` } },
        { type: 'photo', content: { url: `${U},w_1400/D` } },
      ] },
    };
    const picked = selectGalleryPhotos(crafted, 'X').map((p) => p.publicId);
    check('PLANT: the hero, placed in Our Story, is dropped from the gallery',
      !picked.includes('HERO'), picked.join(',') || 'nothing selected');
    check('  and the row is topped up from Home to four rather than left at three',
      picked.join(',') === 'A,B,C,D', picked.join(','));
    check('  the hero is recognised across widths — w_2048 and w_1400 are one photograph',
      publicIdOf(`${U},w_2048/HERO`) === publicIdOf(`${U},w_1400/HERO`), 'compared by public id, not by URL');

    // PLANT 2: a doubled folder. capri and marrakech doubled Home from Our
    // Story before the asset refresh; construct that shape and confirm the
    // distinctness check rejects it.
    const doubled = [{ publicId: 'a' }, { publicId: 'a' }, { publicId: 'b' }, { publicId: 'c' }];
    check('PLANT: four photographs with a repeat among them are detected',
      new Set(doubled.map((p) => p.publicId)).size !== doubled.length, '3 distinct of 4');

    // PLANT 3: the naive grid. `auto-fit, minmax(180px, 1fr)` reads as the
    // right answer and produces seven columns at 1400px.
    const cols = (w, min = 180, gap = 12) => Math.floor((w + gap) / (min + gap));
    check('PLANT: repeat(auto-fit, minmax(180px, 1fr)) gives seven columns at 1400px, not four',
      cols(1400) !== GALLERY_COUNT && cols(390) === 2, `1400px→${cols(1400)}, 390px→${cols(390)}`);
  }

  return results;
}
