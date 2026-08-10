import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Star, Check, Search } from 'lucide-react';
import { CATEGORY_QUERIES, saveVendorFromPlaces } from '@/lib/vendorPlaces';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Trimmed version of VendorMarketplace.jsx's search (no filters/sort, no
// profile modal) so a couple can find and save a vendor or two without
// leaving the wizard's pace. Every label here is one of
// VendorMarketplace.jsx's own CATEGORIES entries (not a separate
// vocabulary), so CATEGORY_QUERIES/schemaCategory apply directly, narrowed
// to the 8 categories a couple is most likely to have already booked this
// early (matches the original stub's own vendor list).
//
// Accept-pass round 2: this used to be category-only (no text search at
// all, despite the heading promising "Search and save real vendors"). Now
// mirrors VendorMarketplace.jsx's own runSearch precedence exactly: typed
// text wins outright over the category keywords, never both at once
// (mixing them over-constrains Google's Text Search and drops exact name
// matches) — see that file's own comment on the same rule.
const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Catering', 'Florals',
  'Music & DJ', 'Hair & makeup', 'Transport', 'Celebrant',
];

export default function OnboardingPathAVendors({ onNext, data }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [results, setResults] = useState(null); // null = no search yet
  const [status, setStatus] = useState(''); // '' | 'searching' | 'done' | 'error'
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());

  const runSearch = async (categoryLabel) => {
    const nextCategory = categoryLabel !== undefined ? categoryLabel : activeCategory;
    setActiveCategory(nextCategory);
    setStatus('searching');
    try {
      const rawSearch = search.trim();
      const categoryQuery = (!rawSearch && nextCategory) ? (CATEGORY_QUERIES[nextCategory] || 'wedding vendor') : null;
      const body = { q: rawSearch || categoryQuery || 'wedding vendor' };
      if (data.location) body.location = data.location;
      const res = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setStatus('error'); setResults(null); return; }
      const payload = await res.json();
      const mapped = (payload.places || []).map(p => ({
        id: p.place_id,
        placeId: p.place_id,
        name: p.name,
        category: nextCategory || 'Other',
        rating: p.rating,
        reviewCount: p.user_ratings_total || 0,
        location: p.address || '',
      }));
      setResults(mapped);
      setStatus('done');
    } catch {
      setStatus('error');
      setResults(null);
    }
  };

  const handleSave = async (vendor) => {
    if (savedIds.has(vendor.id)) return;
    setSavingIds(prev => new Set([...prev, vendor.id]));
    try {
      await saveVendorFromPlaces(vendor);
      setSavedIds(prev => new Set([...prev, vendor.id]));
    } catch {
      // Best-effort — a couple should never be blocked from continuing
      // onboarding because one vendor save hiccuped. They can always add
      // it again from the dashboard vendor pages.
    }
    setSavingIds(prev => { const s = new Set(prev); s.delete(vendor.id); return s; });
  };

  return (
    <div className="w-full max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-[#0A0A0A] mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any vendors already booked?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[rgba(10,10,10,0.6)] text-sm mb-10"
      >
        Search and save real vendors, you can add more later from your vendor pages.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="relative">
          <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            placeholder="Search vendors by name…"
            style={{
              width: '100%', paddingLeft: 22, paddingBottom: 8, fontSize: 14, fontFamily: PJS, color: '#0A0A0A',
              background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', outline: 'none',
            }}
            onFocus={e => e.target.style.borderBottomColor = '#E03553'}
            onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-wrap gap-2 mb-8"
      >
        {VENDOR_CATEGORIES.map((cat, i) => (
          <motion.button
            key={cat}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.28 + i * 0.03 }}
            onClick={() => { setSearch(''); runSearch(cat); }}
            style={{
              padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 500, fontFamily: PJS,
              cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              background: activeCategory === cat ? '#0A0A0A' : 'transparent',
              color: activeCategory === cat ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
              border: `1px solid ${activeCategory === cat ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`,
            }}
          >
            {cat}
          </motion.button>
        ))}
      </motion.div>

      {status === 'searching' && (
        <div className="flex items-center justify-start gap-2 text-[rgba(10,10,10,0.6)] text-sm mb-8">
          <Loader2 size={14} className="animate-spin" /> Searching Google Places…
        </div>
      )}

      {status === 'error' && (
        <p className="text-sm text-[rgba(10,10,10,0.6)] mb-8">
          Couldn't reach Google Places right now. You can add vendors later from your dashboard.
        </p>
      )}

      {status === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 mb-8 text-left"
        >
          {results.length === 0 ? (
            <p className="text-sm text-[rgba(10,10,10,0.6)]">
              {activeCategory
                ? `No ${activeCategory.toLowerCase()} vendors found nearby. Try another category.`
                : 'No vendors found for that search. Try a different name or a category.'}
            </p>
          ) : (
            results.map(vendor => {
              const isSaved = savedIds.has(vendor.id);
              const isSaving = savingIds.has(vendor.id);
              return (
                <div key={vendor.id} className="flex items-center justify-between gap-3 border border-[rgba(10,10,10,0.12)] p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0A0A0A] truncate">{vendor.name}</p>
                    <p className="text-xs text-[rgba(10,10,10,0.6)] truncate">
                      {vendor.rating != null && (
                        <span className="inline-flex items-center gap-1 mr-2">
                          <Star size={11} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                          {vendor.rating} ({vendor.reviewCount})
                        </span>
                      )}
                      {vendor.location}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSave(vendor)}
                    disabled={isSaved || isSaving}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors duration-150 flex items-center gap-1 ${
                      isSaved
                        ? 'bg-transparent text-[#10B981] border border-[#10B981]'
                        : 'bg-[#E03553] text-white hover:bg-black'
                    }`}
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : isSaved ? <Check size={12} /> : null}
                    {isSaved ? 'Saved' : isSaving ? '' : 'Save'}
                  </button>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <button
          onClick={() => onNext()}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </button>

        <button
          onClick={() => onNext()}
          className="block text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}
