/**
 * Remove GPS location from an image before it is uploaded.
 *
 * WHY: uploads are passed to the server byte-for-byte (useFileUpload does no
 * canvas work), and guest-facing pages render the ORIGINAL file -- there is no
 * derivative layer for couple photos. So a couple uploading a phone photo of
 * their home publishes its coordinates to anyone holding the link, and those
 * links are public and unsigned.
 *
 * WHY SURGICAL, NOT A FULL STRIP: EXIF also carries ORIENTATION. Removing the
 * whole APP1 block would leave portrait phone photos displaying sideways,
 * which is a worse and more visible bug than the one being fixed, and the only
 * ways to avoid that are to bake the rotation in (canvas re-encode -- silent
 * recompression of the couple's originals) or to rebuild a minimal EXIF block
 * (more moving parts than removing one tag). So this removes exactly the GPS
 * IFD pointer from IFD0 and leaves every other byte alone: pixel data is never
 * touched, nothing is recompressed, orientation survives.
 *
 * FORMATS. JPEG is stripped. Everything else -- PNG, HEIC, WebP, GIF -- is
 * PASSED THROUGH UNCHANGED rather than mangled by a parser written for a
 * different container. That is a deliberate gap, reported rather than hidden:
 * a HEIC straight off an iPhone can carry GPS and this does not remove it.
 *
 * NO-OP SAFETY: an image with no EXIF at all (9 of 10 stored images today) or
 * with EXIF but no GPS tag returns the original object untouched -- same
 * reference, so callers can cheaply tell nothing happened.
 */

const GPS_IFD_POINTER = 0x8825;

/** @returns {{ stripped: boolean, reason: string, buffer: ArrayBuffer|null }} */
export function stripGpsFromJpegBuffer(buffer) {
  const b = new Uint8Array(buffer);
  if (b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) {
    return { stripped: false, reason: 'not-jpeg', buffer: null };
  }

  let i = 2;
  while (i < b.length - 4) {
    if (b[i] !== 0xFF) { i++; continue; }
    const marker = b[i + 1];
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
    if (marker === 0xDA) break;                       // start of scan: no metadata past here
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2) return { stripped: false, reason: 'malformed', buffer: null };

    if (marker === 0xE1) {
      const segStart = i + 4;
      const isExif = b[segStart] === 0x45 && b[segStart + 1] === 0x78
                  && b[segStart + 2] === 0x69 && b[segStart + 3] === 0x66;
      if (isExif) {
        const tiff = segStart + 6;                    // skip "Exif\0\0"
        const le = b[tiff] === 0x49 && b[tiff + 1] === 0x49;
        const u16 = (o) => le ? (b[o] | (b[o + 1] << 8)) : ((b[o] << 8) | b[o + 1]);
        const u32 = (o) => le ? (b[o] | (b[o+1] << 8) | (b[o+2] << 16) | (b[o+3] << 24)) >>> 0
                              : ((b[o] << 24) | (b[o+1] << 16) | (b[o+2] << 8) | b[o+3]) >>> 0;
        if (u16(tiff + 2) !== 42) return { stripped: false, reason: 'bad-tiff', buffer: null };

        const ifd0 = tiff + u32(tiff + 4);
        const count = u16(ifd0);
        let gpsAt = -1;
        for (let e = 0; e < count; e++) {
          const entry = ifd0 + 2 + e * 12;
          if (u16(entry) === GPS_IFD_POINTER) { gpsAt = entry; break; }
        }
        if (gpsAt === -1) return { stripped: false, reason: 'no-gps', buffer: null };

        // Rebuild: drop the 12-byte entry, decrement the count, shift the
        // trailing next-IFD offset up, zero-fill the 12 freed bytes. The
        // region keeps its total length, so every absolute offset elsewhere
        // in the TIFF block stays valid and no value data moves.
        const out = new Uint8Array(b);               // copy; original untouched
        const entriesEnd = ifd0 + 2 + count * 12;
        out.copyWithin(gpsAt, gpsAt + 12, entriesEnd + 4); // pull entries + nextIFD up
        out.fill(0, entriesEnd + 4 - 12, entriesEnd + 4);  // zero the freed tail
        if (le) { out[ifd0] = (count - 1) & 0xFF; out[ifd0 + 1] = ((count - 1) >> 8) & 0xFF; }
        else    { out[ifd0] = ((count - 1) >> 8) & 0xFF; out[ifd0 + 1] = (count - 1) & 0xFF; }
        return { stripped: true, reason: 'gps-removed', buffer: out.buffer };
      }
    }
    i += 2 + len;
  }
  return { stripped: false, reason: 'no-exif', buffer: null };
}

/**
 * File in, File out. Returns the SAME object when nothing was removed, so a
 * caller can tell a no-op from a rewrite by identity.
 */
export async function stripGpsFromFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return file;
  const type = String(file.type || '').toLowerCase();
  if (type !== 'image/jpeg' && type !== 'image/jpg') return file;   // pass through
  try {
    const result = stripGpsFromJpegBuffer(await file.arrayBuffer());
    if (!result.stripped) return file;
    return new File([result.buffer], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;   // never block an upload because metadata parsing failed
  }
}
