import { useEffect, useState } from 'react';
import { DEFAULT_COUNTRY } from '@/lib/phoneE164';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { countryFromWedding } from '@/lib/countryFromVenue';

/**
 * The venue's country, once per page load, shared by every field that asks.
 *
 * A picker is not a reason to fetch the wedding once per input, and five of
 * them on one screen fetching five times is how a page gets slow quietly. The
 * matching itself lives in countryFromVenue.js, which has no React in it so a
 * guard can read it in Node.
 */
let cached;
export function useDefaultCountry() {
  const [iso, setIso] = useState(cached || DEFAULT_COUNTRY);
  useEffect(() => {
    let live = true;
    if (cached) { setIso(cached); return undefined; }
    getMyWeddingDetails()
      .then((w) => { cached = countryFromWedding(w) || DEFAULT_COUNTRY; if (live) setIso(cached); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return iso;
}
