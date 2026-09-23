import React, { useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * ONE PLACES SEARCH, ABOVE EVERY ADD-VENDOR FORM.
 *
 * Round two, item 8: "Marketplace search is Places-backed and works. 'Add
 * vendor' in Styling, Florist, Food and beverage, Photography, and any other
 * page opens a modal with free-text. Sweep every add-vendor entry point and
 * back each with the same Places search Marketplace uses. One component,
 * reused."
 *
 * THE ENTRY POINTS WERE ALREADY ONE COMPONENT. Vendors, Styling, Beauty, Food
 * & beverage, Photography and the attire panel all open VendorFormModal, which
 * renders VendorForm. What none of them had was the search: every field was
 * typed, so a florist's phone number and website were whatever the couple
 * copied by hand, and nothing carried a place_id — which is why a vendor could
 * never be matched to the same business in Marketplace.
 *
 * So this is not a new modal per page. It is the search the shared form was
 * missing, and putting it there backs all six at once.
 *
 * WHAT IT FILLS, AND WHAT IT WILL NOT TOUCH. A pick fills the fields Google
 * actually knows: business name, address, phone, website, rating and review
 * count. It never fills the fields that are the COUPLE'S OWN — status, quoted
 * price, contract date, payment schedule, notes — because those are about
 * their arrangement with the vendor, not about the business. Every filled
 * field stays editable; this is a starting point, not a lock.
 *
 * TYPING BY HAND STILL WORKS. The fields below are unchanged and a couple who
 * skips the search fills them exactly as before. A vendor is not always on
 * Google, and a form that insisted otherwise would be worse than the one that
 * asked for everything.
 *
 * Props:
 *   onPick(fields)  — called with the subset of vendor fields Places knows
 *   locationBias    — optional city/address to bias results toward
 */
export default function VendorPlacesSearch({ onPick, locationBias = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [filling, setFilling] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  const search = async (q) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: q.trim(), location: locationBias }),
      });
      const data = await res.json();
      setResults(data.places || []);
      setOpen(true);
    } catch {
      toast.error('Could not reach the business search just now — you can still type the details in.');
    }
    setSearching(false);
  };

  const onQuery = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  // THE SEARCH RESULT IS NOT THE WHOLE ANSWER. places-search carries no phone
  // and no website — those are on the details endpoint — so a pick asks for
  // them rather than leaving two fields the couple expected to be filled
  // empty. If that second call fails, what the search already knew is still
  // applied: a partly filled form beats an error and an empty one.
  const pick = async (place) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    // THE SAME FIELD NAMES saveVendorFromPlaces WRITES (src/lib/vendorPlaces.js),
    // so a vendor added here is indistinguishable from one added in
    // Marketplace. That matters beyond tidiness: Marketplace's duplicate check
    // is findMyVendorByPlaceId, so a hand-added vendor with no google_place_id
    // is invisible to it and the same business gets added twice.
    const base = {
      name: place.name || '',
      address: place.address || '',
      google_place_id: place.place_id || '',
      google_rating: place.rating ?? null,
      google_reviews_count: place.user_ratings_total ?? null,
      rating: place.rating != null ? String(place.rating) : '',
      reviews_count: place.user_ratings_total != null ? String(place.user_ratings_total) : '',
    };
    setFilling(true);
    try {
      const res = await fetch(`/api/place-details?place_id=${encodeURIComponent(place.place_id)}`);
      const data = await res.json();
      const p = data.place || {};
      onPick({
        ...base,
        phone: p.phone || '',
        website: p.website || '',
      });
    } catch {
      onPick(base);
    }
    setFilling(false);
  };

  return (
    <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 8 }}>
        Find the business
      </span>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.45)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={onQuery}
          placeholder="Search by name, and we will fill in what we can"
          style={{
            width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
            background: 'transparent', padding: '6px 24px', fontSize: 14, fontWeight: 500,
            color: '#0A0A0A', outline: 'none', fontFamily: PJS, boxSizing: 'border-box',
          }}
        />
        {(searching || filling) && (
          <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.45)' }} />
        )}
        {!searching && !filling && query && (
          <button
            type="button"
            aria-label="Clear the search"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', padding: 0 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, zIndex: 20, background: '#FFFFFF',
          border: '1px solid rgba(10,10,10,0.12)', maxHeight: 260, overflowY: 'auto',
        }}>
          {results.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, padding: '12px 14px' }}>
              Nothing found. Type the details in below instead.
            </p>
          ) : results.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => pick(p)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none',
                border: 'none', borderBottom: '1px solid rgba(10,10,10,0.06)',
                padding: '10px 14px', cursor: 'pointer', fontFamily: PJS,
              }}
            >
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{p.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>{p.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
