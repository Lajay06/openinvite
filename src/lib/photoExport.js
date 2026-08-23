/**
 * Photo export (E4).
 *
 * The launch copy promises a couple can export their photos. A manifest of
 * URLs would satisfy that on the day it is downloaded and quietly stop being
 * true later: every photo URL is OURS, not theirs. Couple uploads resolve
 * through media.base44.com under our app id, and the moodboard's curated
 * images through our Cloudinary account. A link file dies when the hosting
 * does, which is exactly what #507's "viewing and exporting stays free,
 * forever" was written against. So the export ships BYTES.
 *
 * THE THRESHOLD. Zipping happens in the tab's memory: every original is held
 * as an ArrayBuffer, then the archive is assembled alongside them, so peak
 * usage is roughly twice the total. Measured originals are large -- one
 * couple-uploaded photo on the fixture is 7.76 MB untransformed, because
 * nothing resizes on upload. Mobile Safari terminates a tab near ~1 GB and
 * gives no catchable error, so the ceiling has to be set well below any
 * limit we cannot detect. 250 MB of originals implies ~500 MB peak, which
 * leaves real headroom on a phone. Above it the manifest downloads alone
 * with a plain sentence, rather than the tab dying mid-zip and the couple
 * concluding the export is broken.
 *
 * Server-side streaming zip is the durable answer for large sets and is on
 * the post-launch list; it removes the ceiling rather than raising it.
 */
export const ZIP_BYTE_LIMIT = 250 * 1024 * 1024;

/** Filesystem-safe, human-readable, collision-proof. */
export function photoFilename(item, index) {
  const ext = (() => {
    const m = String(item.url || '').split('?')[0].match(/\.(jpe?g|png|gif|webp|heic|avif)$/i);
    return m ? m[1].toLowerCase() : 'jpg';
  })();
  const base = String(item.title || item.category || 'photo')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'photo';
  // An id suffix, never a bare hash: two photos both called "ceremony" must
  // not overwrite each other inside the archive.
  return `${String(index + 1).padStart(3, '0')}-${base}.${ext}`;
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** The manifest that travels inside the zip, and alone when over the limit. */
export function buildManifestCsv(items) {
  return [
    ['File', 'Title', 'Surface', 'Category', 'Description', 'Credit', 'Date taken', 'Source URL'].join(','),
    ...items.map(i => [
      i.filename, i.title, i.surface, i.category, i.description, i.credit, i.date, i.url,
    ].map(csvCell).join(',')),
  ].join('\n');
}

/**
 * Every photo-bearing surface, unioned, so this stays true as surfaces fill.
 * Photo currently holds zero rows app-wide; including it now means the export
 * does not need revisiting the day someone uses the gallery.
 */
export function collectPhotoItems({ photos = [], moodboard = [], coverPhoto = null }) {
  const items = [];
  if (coverPhoto) {
    items.push({ url: coverPhoto, title: 'Cover photo', surface: 'Cover photo',
                 category: '', description: '', credit: '', date: '' });
  }
  for (const p of photos) {
    if (!p?.image_url) continue;
    items.push({ url: p.image_url, title: p.title || '', surface: 'Photo gallery',
                 category: p.category || '', description: p.description || '',
                 credit: p.photographer_credit || '', date: p.date_taken || '' });
  }
  for (const m of moodboard) {
    if (!m?.image_url) continue;
    items.push({ url: m.image_url, title: m.title || '', surface: 'Moodboard',
                 category: m.category || '', description: m.notes || '',
                 credit: '', date: '' });
  }
  return items.map((i, idx) => ({ ...i, filename: photoFilename(i, idx) }));
}
