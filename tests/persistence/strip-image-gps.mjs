/**
 * GPS stripping at upload.
 *
 * Uploads reach the server byte-for-byte and guest pages render the ORIGINAL
 * file, so a phone photo's coordinates would be published to anyone holding
 * the (public, unsigned) link.
 *
 * The fixtures here are BUILT, not sampled: a JPEG carrying both an
 * Orientation tag and a GPS IFD pointer, so ground truth is known. The stored
 * corpus was audited separately and has zero GPS, which means sampling it
 * would prove nothing about removal.
 */
import { pass, fail } from './_shared.mjs';
import { stripGpsFromJpegBuffer } from '../../src/lib/stripImageGps.js';

/** Minimal JPEG: SOI + APP1/Exif(IFD0: Orientation, GPS ptr, Make) + SOS + EOI */
function buildJpeg({ withGps = true } = {}) {
  const tags = [
    [0x0112, 3, 1, 6],            // Orientation = 6 (rotate 90) -- must survive
    ...(withGps ? [[0x8825, 4, 1, 200]] : []),  // GPS IFD pointer
    [0x010F, 3, 1, 1],            // Make (a benign trailing tag)
  ];
  const count = tags.length;
  const tiff = Buffer.alloc(8 + 2 + count * 12 + 4 + 40);
  tiff.write('II', 0, 'latin1');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);                 // IFD0 at offset 8
  tiff.writeUInt16LE(count, 8);
  tags.forEach(([tag, type, n, val], i) => {
    const o = 10 + i * 12;
    tiff.writeUInt16LE(tag, o); tiff.writeUInt16LE(type, o + 2);
    tiff.writeUInt32LE(n, o + 4); tiff.writeUInt32LE(val, o + 8);
  });
  tiff.writeUInt32LE(0, 10 + count * 12);   // no IFD1
  const app1Body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.concat([
    Buffer.from([0xFF, 0xE1]),
    Buffer.from([((app1Body.length + 2) >> 8) & 0xFF, (app1Body.length + 2) & 0xFF]),
    app1Body,
  ]);
  const scan = Buffer.from([0xFF, 0xDA, 0x00, 0x08, 1, 1, 0, 0, 0, 0, 0xAB, 0xCD, 0xEF, 0xFF, 0xD9]);
  return Buffer.concat([Buffer.from([0xFF, 0xD8]), app1, scan]);
}

const readTags = (buf) => {
  const i = buf.indexOf(Buffer.from('Exif\0\0', 'latin1'));
  if (i === -1) return null;
  const t = i + 6, n = buf.readUInt16LE(t + 8);
  const out = [];
  for (let e = 0; e < n; e++) out.push(buf.readUInt16LE(t + 10 + e * 12));
  return { count: n, tags: out };
};

export async function runStripImageGps() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  GPS stripping — surgical, never a recompress:\n');

  const withGps = buildJpeg({ withGps: true });
  const before = readTags(withGps);
  check('fixture genuinely carries GPS + orientation',
    before.tags.includes(0x8825) && before.tags.includes(0x0112), `tags ${before.tags.map(t => '0x' + t.toString(16))}`);

  const r = stripGpsFromJpegBuffer(withGps.buffer.slice(withGps.byteOffset, withGps.byteOffset + withGps.length));
  check('GPS is removed', r.stripped && r.reason === 'gps-removed', r.reason);

  const after = readTags(Buffer.from(r.buffer));
  check('  the GPS tag is gone', !after.tags.includes(0x8825), after.tags.map(t => '0x' + t.toString(16)).join(','));
  check('  ORIENTATION survives (the whole reason this is surgical)',
    after.tags.includes(0x0112), 'tag 0x112 present');
  check('  other tags survive too', after.tags.includes(0x010F), 'tag 0x10f present');
  check('  the IFD entry count was decremented', after.count === before.count - 1, `${before.count} -> ${after.count}`);

  const out = Buffer.from(r.buffer);
  check('file length is UNCHANGED (no recompression, no reflow)', out.length === withGps.length,
    `${withGps.length} -> ${out.length}`);
  const scanIdx = withGps.indexOf(Buffer.from([0xFF, 0xDA]));
  check('  pixel/scan data is byte-identical',
    out.slice(scanIdx).equals(withGps.slice(scanIdx)), 'SOS onward identical');
  check('  still a valid JPEG', out[0] === 0xFF && out[1] === 0xD8 && out[out.length - 2] === 0xFF && out[out.length - 1] === 0xD9, 'SOI/EOI intact');

  // no-ops
  const noGps = buildJpeg({ withGps: false });
  const r2 = stripGpsFromJpegBuffer(noGps.buffer.slice(noGps.byteOffset, noGps.byteOffset + noGps.length));
  check('an EXIF image with no GPS is a clean no-op', !r2.stripped && r2.reason === 'no-gps', r2.reason);
  const bare = Buffer.from([0xFF, 0xD8, 0xFF, 0xDA, 0, 4, 1, 2, 0xFF, 0xD9]);
  const r3 = stripGpsFromJpegBuffer(bare.buffer.slice(bare.byteOffset, bare.byteOffset + bare.length));
  check('  a JPEG with no EXIF at all is a no-op (9 of 10 stored images)', !r3.stripped, r3.reason);
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0]);
  const r4 = stripGpsFromJpegBuffer(png.buffer.slice(png.byteOffset, png.byteOffset + png.length));
  check('  a non-JPEG is passed through, never parsed as one', !r4.stripped && r4.reason === 'not-jpeg', r4.reason);

  return results;
}
