/**
 * AN UPLOAD IS STILL THERE TOMORROW.
 *
 * Owner report, Run 5 T11: the Uploaded tab is empty every time the library or
 * the studio is reopened, though the files exist in the back end.
 *
 * ── WHERE UPLOADS LIVE, ESTABLISHED FIRST ──────────────────────────────────
 *
 * base44 UploadFile puts the bytes in storage and returns a URL. The library
 * the studio shows is the `Photo` ENTITY, read with
 * getMyRecords('Photo', '-created_date', 100). There is no MediaAsset entity
 * and no Cloudinary folder in this path.
 *
 * ── TWO DEFECTS, EITHER OF WHICH EMPTIES THE TAB ───────────────────────────
 *
 * 1. NOTHING WROTE A RECORD. handleMediaUploaded prepended the item to local
 *    React state and stopped. The upload lived exactly as long as the page
 *    did: the file was in storage, its URL was on whichever block it had been
 *    chosen for, and the library had no memory of it.
 *
 * 2. THE READER READ FIELDS THE ENTITY DOES NOT HAVE. It mapped
 *    `p.url || p.photo_url || p.imageUrl`, and Photo's field is `image_url` —
 *    the name src/lib/photoExport.js:68 has always used. Every row mapped to
 *    an empty string and was dropped by the .filter that follows. So even a
 *    record written by hand would not have shown.
 *
 * The second is why "read from the back end" was not enough on its own, and
 * why this guard asserts the FIELD NAME rather than the fact of a read.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runMediaUploadsPersist() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  Uploads outlive the page:\n');

  // The entity's own field, from the mirror — so this check fails if the
  // schema ever renames it, rather than the tab quietly emptying again.
  const mirror = code('src/lib/entityFields.generated.js');
  const photoBlock = mirror.slice(mirror.indexOf('"Photo"'), mirror.indexOf('"Photo"') + 400);
  check('Photo stores its file in image_url', /"image_url"/.test(photoBlock), 'from the generated mirror');
  check('  and requires a category with it', /"required": \[\s*"category",\s*"image_url"/.test(photoBlock),
    'both supplied on create');

  const studio = code('src/pages/StudioWebsite.jsx');
  check('the studio reads image_url', /url: p\.image_url \|\|/.test(studio),
    'the field the entity actually has');
  check('  newest first, from the record', /getMyRecords\('Photo', '-created_date', 100\)/.test(studio),
    "-created_date, which is the back end's order");
  check('  and re-reads when the library opens',
    /const openMediaLibrary[\s\S]{0,400}?loadMediaLibrary\(\);/.test(studio),
    'not once on mount and never again');

  check('an upload becomes a Photo record',
    /base44\.entities\.Photo\.create\(\{[\s\S]{0,200}?image_url: item\.url/.test(studio),
    'image_url written from the uploaded URL');
  check('  with the required category', /category: 'other'/.test(studio), "category is required by the schema");
  check('  and out of the guest gallery by default', /visible_to_guests: false/.test(studio),
    'a studio upload is working material, not a published photo');
  check('  while the session still shows it if the write fails',
    /setMediaLibrary\(prev => \[optimistic, \.\.\.prev\]\)[\s\S]{0,600}?catch/.test(studio),
    'the prepend happens before the write, and survives its failure');

  // ── WHERE A STUDIO UPLOAD CAN AND CANNOT APPEAR ────────────────────────
  //
  // Writing Photo records raises the question the owner asked: can working
  // material reach a guest? Read from the code rather than assumed:
  //
  //   · NO guest-facing surface reads the Photo entity at all. The guest site
  //     renders from the guest-safe wedding projection (photosContent on
  //     WeddingDetails), and there is no gallery page among the /w/ routes.
  //   · The three readers are the two studios and Moodboard's export — all
  //     couple-facing, behind the couple's own session.
  //
  // So the exposure was never a guest one. It was the couple's own export
  // labelling working material as "Photo gallery", which photoExport now
  // excludes — and this check is what keeps the claim true.
  const exportLib = code('src/lib/photoExport.js');
  check('a studio upload is left out of the photo export',
    /if \(p\.visible_to_guests === false\) continue;/.test(exportLib),
    'excluded from the "Photo gallery" surface');
  check('  and only an explicit false is excluded',
    !/if \(!p\.visible_to_guests\) continue;/.test(exportLib),
    "records written before the field existed carry no value, and those are the couple's real photos");
  const guestPages = code('api/_lib/guestSafeWedding.js');
  check('  while the guest projection carries no Photo records at all',
    !/entities\.Photo|'Photo'/.test(guestPages),
    'the guest site renders from the wedding record, not from this entity');

  // The same mapping existed twice; a fix in one copy is not a fix.
  const ava = code('src/pages/AvaStudioWebsite.jsx');
  check('the Ava studio reads the same field', /url: p\.image_url \|\|/.test(ava),
    'one defect, two copies, both corrected');

  return results;
}
