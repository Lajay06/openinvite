import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Star, Check } from 'lucide-react';
import { CATEGORY_QUERIES, saveVendorFromPlaces } from '@/lib/vendorPlaces';

// Trimmed version of VendorMarketplace.jsx's search — a category chip (no
// free-text search bar, no filters/sort, no profile modal) so a couple can
// find and save a vendor or two without leaving the wizard's pace. Every
// label here is one of VendorMarketplace.jsx's own CATEGORIES entries (not
// a separate vocabulary), so CATEGORY_QUERIES/schemaCategory apply
// directly — narrowed to the 8 categories a couple is most likely to have
// already booked this early (matches the original stub's own vendor list).
const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Catering', 'Florals',
  'Music & DJ', 'Hair & makeup', 'Transport', 'Celebrant',
];

export default function OnboardingPathAVendors({ onNext, data }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [results, setResults] = useState(null); // null = no search yet
  const [status, setStatus] = useState(''); // '' | 'searching' | 'done' | 'error'
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());

  const runSearch = async (categoryLabel) => {
    setActiveCategory(categoryLabel);
    setStatus('searching');
    try {
      const body = { q: CATEGORY_QUERIES[categoryLabel] || 'wedding vendor' };
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
        category: categoryLabel,
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
    <div className="w-full max-w-2xl text-center">
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
        Search and save real vendors — you can add more later from your vendor pages.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 mb-8"
      >
        {VENDOR_CATEGORIES.map((cat, i) => (
          <motion.button
            key={cat}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.05 }}
            onClick={() => runSearch(cat)}
            className={`p-4 rounded-none border-2 transition-colors duration-150 text-sm font-medium ${
              activeCategory === cat
                ? 'bg-black border-black text-white'
                : 'bg-transparent border-[rgba(10,10,10,0.18)] text-[rgba(10,10,10,0.6)] hover:bg-black hover:border-black hover:text-white active:bg-neutral-900'
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </motion.div>

      {status === 'searching' && (
        <div className="flex items-center justify-center gap-2 text-[rgba(10,10,10,0.6)] text-sm mb-8">
          <Loader2 size={14} className="animate-spin" /> Searching Google Places…
        </div>
      )}

      {status === 'error' && (
        <p className="text-sm text-[rgba(10,10,10,0.6)] mb-8">
          Couldn't reach Google Places right now — you can add vendors later from your dashboard.
        </p>
      )}

      {status === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 mb-8 text-left"
        >
          {results.length === 0 ? (
            <p className="text-sm text-[rgba(10,10,10,0.6)] text-center">
              No {activeCategory.toLowerCase()} vendors found nearby. Try another category.
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
          className="block mx-auto text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}
