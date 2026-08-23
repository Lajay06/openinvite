/**
 * Photo export (E4).
 *
 * Why bytes and not a link list: every photo URL belongs to US, not the
 * couple. Uploads resolve through media.base44.com under our app id; the
 * moodboard's curated images sit in our Cloudinary account. A manifest of
 * links is true on the day it downloads and silently false once the hosting
 * changes -- exactly what #507's "viewing and exporting stays free, forever"
 * was written against.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { collectPhotoItems, buildManifestCsv, photoFilename, ZIP_BYTE_LIMIT } from '../../src/lib/photoExport.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const PAGE = readFileSync(resolve(__dir, '../../src/pages/Moodboard.jsx'), 'utf8');

export async function runPhotoExport() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Photo export — bytes, not links:\n');

  // union of surfaces
  const items = collectPhotoItems({
    coverPhoto: 'https://media.base44.com/x/cover.jpg',
    photos: [{ image_url: 'https://x/a.png', title: 'First look', category: 'engagement', photographer_credit: 'Chris A' }],
    moodboard: [{ image_url: 'https://res.cloudinary.com/x/b.jpeg', title: 'Table setting, gold', notes: 'peonies' }],
  });
  check('exports the UNION of surfaces', items.length === 3, items.map(i => i.surface).join(' + '));
  check('  cover photo included', items.some(i => i.surface === 'Cover photo'), 'yes');
  check('  photo gallery included even while it holds zero rows today',
    items.some(i => i.surface === 'Photo gallery'), 'written once, stays true as it fills');
  check('  moodboard included', items.some(i => i.surface === 'Moodboard'), 'yes');

  // filenames
  check('filenames are humane, not bare hashes', items[1].filename === '002-first-look.png', items[1].filename);
  check('  numbered so two same-titled photos cannot collide',
    photoFilename({ title: 'Ceremony' }, 0) !== photoFilename({ title: 'Ceremony' }, 1),
    `${photoFilename({ title: 'Ceremony' }, 0)} vs ${photoFilename({ title: 'Ceremony' }, 1)}`);
  check('  extension preserved from the URL', items[2].filename.endsWith('.jpeg'), items[2].filename);
  check('  a title-less photo still gets a name', /^001-photo\./.test(photoFilename({}, 0)), photoFilename({}, 0));

  // manifest
  const csv = buildManifestCsv(items);
  check('manifest carries metadata, not just filenames',
    /File,Title,Surface,Category,Description,Credit,Date taken,Source URL/.test(csv), csv.split('\n')[0]);
  check('  commas inside a title are quoted, not column-shifting',
    /"Table setting, gold"/.test(csv), 'quoted');

  // the threshold
  check('a byte ceiling exists', ZIP_BYTE_LIMIT === 250 * 1024 * 1024, `${ZIP_BYTE_LIMIT / 1024 / 1024} MB`);
  check('  over the ceiling the manifest still downloads',
    /ZIP_BYTE_LIMIT[\s\S]{0,400}wedding-photos-list\.csv/.test(PAGE), 'manifest-only fallback');
  check('  and the couple is told why, with the real number',
    /too large to zip in the browser/.test(PAGE) && /toFixed\(0\)\} MB/.test(PAGE), 'honest message');
  check('  size is measured BEFORE fetching bytes',
    /method: 'HEAD'[\s\S]{0,300}ZIP_BYTE_LIMIT/.test(PAGE), 'HEAD first');

  // partial failure must be visible
  check('a photo that cannot be fetched is counted and reported, not dropped silently',
    /could not be fetched/.test(PAGE), 'reported in the toast');

  return results;
}
