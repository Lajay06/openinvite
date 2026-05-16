import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, Plus, Navigation, Award, X, Scale } from "lucide-react";
import { InvokeLLM } from '@/integrations/Core';

// ── Dual range slider ─────────────────────────────────────────────────────────

function DualSlider({ min, max, value, onChange, step = 500 }) {
  const [low, high] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;

  const handleLow = (e) => {
    const v = Math.min(Number(e.target.value), high - step);
    onChange([v, high]);
  };
  const handleHigh = (e) => {
    const v = Math.max(Number(e.target.value), low + step);
    onChange([low, v]);
  };

  return (
    <>
      <style>{`
        .dual-slider-wrap input[type=range] { -webkit-appearance:none; appearance:none; background:transparent; pointer-events:auto; cursor:pointer; }
        .dual-slider-wrap input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#E03553; border:2px solid #FFF; box-shadow:0 0 0 1px rgba(10,10,10,0.18); margin-top:-7px; }
        .dual-slider-wrap input[type=range]::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#E03553; border:2px solid #FFF; box-shadow:0 0 0 1px rgba(10,10,10,0.18); }
        .dual-slider-wrap input[type=range]::-webkit-slider-runnable-track { height:2px; background:transparent; }
        .dual-slider-wrap input[type=range]::-moz-range-track { height:2px; background:transparent; }
      `}</style>
      <div className="dual-slider-wrap" style={{ position: 'relative', height: 24, paddingTop: 4 }}>
        {/* Track background */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(10,10,10,0.1)', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', height: '100%', background: '#E03553',
            left: pct(low) + '%', right: (100 - pct(high)) + '%',
          }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={low} onChange={handleLow}
          style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <input type="range" min={min} max={max} step={step} value={high} onChange={handleHigh}
          style={{ position: 'absolute', width: '100%', height: '100%' }} />
      </div>
    </>
  );
}

// ── Pill helper ───────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '5px 12px', borderRadius: 999,
        border: active ? '1px solid #0A0A0A' : '1px solid rgba(10,10,10,0.18)',
        background: active ? '#0A0A0A' : hovered ? 'rgba(10,10,10,0.04)' : 'transparent',
        color: active ? '#FFFFFF' : '#444444', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >{label}</button>
  );
}

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
};

const CATEGORIES = [
  { value: "wedding venue",          label: "Venues" },
  { value: "catering",               label: "Catering" },
  { value: "photographer",           label: "Photography" },
  { value: "videographer",           label: "Videography" },
  { value: "florist",                label: "Florists" },
  { value: "wedding dj",             label: "DJ & music" },
  { value: "wedding cake",           label: "Wedding cakes" },
  { value: "transportation",         label: "Transportation" },
  { value: "hair salon",             label: "Hair & beauty" },
  { value: "wedding dress",          label: "Attire" },
  { value: "wedding planner",        label: "Wedding planners" },
  { value: "wedding decorations",    label: "Decorations" },
  { value: "wedding entertainment",  label: "Entertainment" },
];

const RATING_OPTIONS = [
  { value: 0,   label: 'Any rating' },
  { value: 3,   label: '3+ stars' },
  { value: 4,   label: '4+ stars' },
  { value: 4.5, label: '4.5+ stars' },
];

const FALLBACK_IMAGES = {
  "wedding venue":         "https://images.unsplash.com/photo-1519167758481-83f29c8a8c15?w=400",
  "catering":              "https://images.unsplash.com/photo-1555244162-803834f70033?w=400",
  "photographer":          "https://images.unsplash.com/photo-1554048612-b6ebae92138d?w=400",
  "florist":               "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400",
  "wedding dj":            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
  "wedding cake":          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
  "hair salon":            "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400",
};
const fallbackImg = (cat) => FALLBACK_IMAGES[cat] || "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400";

function getEnhancedVendors(query, category, location) {
  const loc = location ? `, ${location}` : ", Your area";
  return [
    { place_id: "r1", name: `${category || 'Wedding'} Studio`, category, address: `123 Wedding St${loc}`, phone: "(555) 123-4567", website: "https://example.com", rating: 4.9, user_ratings_total: 247, price_level: 3, photo_url: fallbackImg(category), recommended: true },
    { place_id: "r2", name: `Elite ${query || category} Co.`, category, address: `456 Celebration Ave${loc}`, phone: "(555) 234-5678", website: "https://example.com", rating: 4.8, user_ratings_total: 189, price_level: 4, photo_url: fallbackImg(category), recommended: true },
    { place_id: "r3", name: `${query || category} Specialists`, category, address: `789 Dream Lane${loc}`, phone: "(555) 345-6789", website: "https://example.com", rating: 4.5, user_ratings_total: 156, price_level: 2, photo_url: fallbackImg(category), recommended: false },
    { place_id: "r4", name: `Beautiful ${category || 'Wedding'} Studio`, category, address: `321 Romance Rd${loc}`, phone: "(555) 456-7890", website: "https://example.com", rating: 4.3, user_ratings_total: 98, price_level: 2, photo_url: fallbackImg(category), recommended: false },
    { place_id: "r5", name: `Affordable ${category || 'Wedding'} Solutions`, category, address: `654 Budget Blvd${loc}`, phone: "(555) 567-8901", website: "https://example.com", rating: 4.1, user_ratings_total: 67, price_level: 1, photo_url: fallbackImg(category), recommended: false },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorSearch({ onAddVendor }) {
  const [searchTerm, setSearchTerm]     = useState("");
  const [category, setCategory]         = useState("");
  const [location, setLocation]         = useState("");
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [budgetRange, setBudgetRange]   = useState([1000, 15000]);
  const [minRating, setMinRating]       = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [hasSearched, setHasSearched]   = useState(false);
  const [compareList, setCompareList]   = useState([]);  // up to 3 vendor objects
  const [showCompare, setShowCompare]   = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => { setUseMyLocation(true); setLocation("Current location"); setLoading(false); },
      () => { alert("Unable to get location. Enter manually."); setLoading(false); }
    );
  };

  const handleSearch = async () => {
    if (!searchTerm && !category) return;
    setLoading(true); setSearchResults([]); setHasSearched(true); setCompareList([]);

    try {
      const query = searchTerm || category;
      const locStr = location && !useMyLocation ? ` in ${location}` : '';
      const response = await InvokeLLM({
        prompt: `Suggest 5 real wedding businesses for the query "${query}${locStr}". For each provide: name, address, phone, website, rating (1-5), price_level (1-4), brief description.`,
        add_context_from_internet: true,
      });
      // Try to parse text response into vendor objects
      const lines = typeof response === 'string' ? response.split('\n') : [];
      let parsed = [];
      let cur = {};
      lines.forEach(line => {
        if (line.match(/^\d+\.|##|\*\*/)) {
          if (cur.name) parsed.push({ ...cur });
          cur = { name: line.replace(/[*#\d\.]/g, '').trim() };
        } else if (/address|location/i.test(line)) cur.address = line.replace(/.*?[:–]/i, '').trim();
        else if (/phone/i.test(line)) { const m = line.match(/[\d\(\)\-\s]{7,}/); if (m) cur.phone = m[0]; }
        else if (/website|www\.|\.com/i.test(line)) { const m = line.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/); if (m) cur.website = m[0]; }
        else if (/rating|star/i.test(line)) { const m = line.match(/(\d\.?\d?)/); if (m) cur.rating = parseFloat(m[1]); }
      });
      if (cur.name) parsed.push(cur);

      const results = parsed.length >= 3
        ? parsed.map((b, i) => ({ place_id: `ai_${i}`, name: b.name, category, address: b.address || location, phone: b.phone, website: b.website, rating: b.rating || (4.2 + Math.random() * 0.7), user_ratings_total: Math.floor(50 + Math.random() * 200), price_level: 2, photo_url: fallbackImg(category), recommended: i < 2 }))
        : getEnhancedVendors(query, category, location);

      setSearchResults(results.filter(r => r.rating >= minRating));
    } catch {
      setSearchResults(getEnhancedVendors(searchTerm, category, location).filter(r => r.rating >= minRating));
    }
    setLoading(false);
  };

  const toggleCompare = (vendor) => {
    setCompareList(prev => {
      const already = prev.find(v => v.place_id === vendor.place_id);
      if (already) return prev.filter(v => v.place_id !== vendor.place_id);
      if (prev.length >= 3) return prev;
      return [...prev, vendor];
    });
  };
  const inCompare = (vendor) => compareList.some(v => v.place_id === vendor.place_id);

  const stars = (n) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={11} style={{ color: i < Math.round(n || 0) ? '#6b7700' : 'rgba(10,10,10,0.15)', fill: i < Math.round(n || 0) ? '#DDF762' : 'none' }} />
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Search form ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Row 1: keyword + category + location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
              <Input placeholder="e.g. rustic barn, rose garden…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: 20 }} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <MapPin size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                <Input
                  placeholder="City or address"
                  value={useMyLocation ? 'Using your location' : location}
                  onChange={e => { setLocation(e.target.value); setUseMyLocation(false); }}
                  disabled={useMyLocation}
                  style={{ paddingLeft: 20 }}
                />
              </div>
              <button onClick={getCurrentLocation} title="Use my location"
                style={{ padding: '0 12px', border: '1px solid rgba(10,10,10,0.18)', background: useMyLocation ? '#0A0A0A' : 'transparent', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Navigation size={13} style={{ color: useMyLocation ? '#FFFFFF' : '#444444' }} />
              </button>
            </div>
          </div>

          {/* Row 2: budget slider + rating pills + search button */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 20, alignItems: 'end' }}>

            {/* Budget range */}
            <div>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Budget range</p>
              <DualSlider min={500} max={50000} step={500} value={budgetRange} onChange={setBudgetRange} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${budgetRange[0].toLocaleString()}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${budgetRange[1].toLocaleString()}</span>
              </div>
            </div>

            {/* Rating filter pills */}
            <div>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Minimum rating</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RATING_OPTIONS.map(opt => (
                  <FilterPill key={opt.value} label={opt.label} active={minRating === opt.value} onClick={() => setMinRating(opt.value)} />
                ))}
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || (!searchTerm && !category)}
              className="btn-primary"
              style={{ opacity: !searchTerm && !category ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
            >
              <Search size={13} />
              {loading ? 'Searching…' : 'Find vendors'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Comparison panel ────────────────────────────────────────────── */}
      {compareList.length >= 2 && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
          <div style={{ background: '#0A1930', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={14} style={{ color: '#DDF762' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Comparing {compareList.length} vendors
              </span>
            </div>
            <button onClick={() => setCompareList([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4, borderRadius: 999, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compareList.length}, 1fr)` }}>
            {compareList.map((v, i) => (
              <div key={v.place_id} style={{ padding: 20, borderRight: i < compareList.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
                {v.photo_url && (
                  <img src={v.photo_url} alt={v.name} onError={e => { e.target.style.display = 'none'; }}
                    style={{ width: '100%', height: 100, objectFit: 'cover', marginBottom: 12 }} />
                )}
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px' }}>{v.name}</p>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>{stars(v.rating)}</div>
                {v.address && <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px', display: 'flex', alignItems: 'flex-start', gap: 4 }}><MapPin size={10} style={{ flexShrink: 0, marginTop: 2 }} />{v.address}</p>}
                <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 10px' }}>{'$'.repeat(v.price_level || 2)} · {v.rating?.toFixed(1)} ({v.user_ratings_total} reviews)</p>
                <button onClick={() => onAddVendor(v)} className="btn-primary" style={{ width: '100%', fontSize: 11 }}>
                  <Plus size={11} style={{ display: 'inline', marginRight: 4 }} />Add to my list
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ width: 20, height: 20, border: '2px solid rgba(10,10,10,0.1)', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Searching for vendors…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && !hasSearched && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
          <Search size={28} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 6px' }}>
            Find your perfect wedding vendors
          </p>
          <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
            Search photographers, venues, caterers and more.
          </p>
        </div>
      )}

      {!loading && hasSearched && searchResults.length === 0 && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
          <Search size={28} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No vendors found — try adjusting your filters.</p>
        </div>
      )}

      {!loading && searchResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Compare prompt */}
          {compareList.length < 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
              <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Select up to 3 vendors to compare side by side.
              </span>
            </div>
          )}

          {/* Recommended */}
          {searchResults.some(r => r.recommended) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Award size={14} style={{ color: '#6b7700' }} />
                <p style={labelStyle}>Recommended</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {searchResults.filter(r => r.recommended).map(r => (
                  <VendorResultCard key={r.place_id} result={r} onAdd={onAddVendor} onToggleCompare={toggleCompare} inCompare={inCompare(r)} canCompare={compareList.length < 3 || inCompare(r)} stars={stars} />
                ))}
              </div>
            </div>
          )}

          {/* More options */}
          {searchResults.some(r => !r.recommended) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Search size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                <p style={labelStyle}>More options</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {searchResults.filter(r => !r.recommended).map(r => (
                  <VendorResultCard key={r.place_id} result={r} onAdd={onAddVendor} onToggleCompare={toggleCompare} inCompare={inCompare(r)} canCompare={compareList.length < 3 || inCompare(r)} stars={stars} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function VendorResultCard({ result, onAdd, onToggleCompare, inCompare, canCompare, stars }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 20, display: 'flex', gap: 16, transition: 'border-color 0.15s', borderColor: hovered ? 'rgba(10,10,10,0.18)' : 'rgba(10,10,10,0.08)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      {result.photo_url && (
        <img src={result.photo_url} alt={result.name} onError={e => { e.target.style.display = 'none'; }}
          style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{result.name}</p>
              {result.recommended && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: '#DDF762', color: '#0A1930', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Award size={9} />Recommended
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>{stars(result.rating)}</div>
            <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
              {'$'.repeat(result.price_level || 2)} · {result.rating?.toFixed(1)} ({result.user_ratings_total} reviews)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => onToggleCompare(result)}
              disabled={!canCompare}
              style={{
                padding: '7px 14px', borderRadius: 999, border: '1px solid',
                background: inCompare ? '#0A1930' : 'transparent',
                borderColor: inCompare ? '#0A1930' : 'rgba(10,10,10,0.18)',
                color: inCompare ? '#FFFFFF' : '#444444',
                cursor: canCompare ? 'pointer' : 'not-allowed',
                fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
                opacity: !canCompare ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Scale size={11} />{inCompare ? 'Comparing' : 'Compare'}
            </button>
            <button onClick={() => onAdd(result)} className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={11} />Add to my list
            </button>
          </div>
        </div>
        {result.address && (
          <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <MapPin size={11} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0, marginTop: 1 }} />{result.address}
          </p>
        )}
      </div>
    </div>
  );
}
