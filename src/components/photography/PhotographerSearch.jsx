import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, Plus, Camera, Video, Award, Loader2 } from "lucide-react";
import { InvokeLLM } from '@/integrations/Core';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const STYLES = [
  { value: "all", label: "All styles" }, { value: "candid", label: "Candid" },
  { value: "traditional", label: "Traditional" }, { value: "artistic", label: "Artistic" },
  { value: "documentary", label: "Documentary" }, { value: "cinematic", label: "Cinematic" },
  { value: "vintage", label: "Vintage" }, { value: "modern", label: "Modern" },
];

const getDefaultImage = (type) =>
  type === 'videographer'
    ? "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400"
    : "https://images.unsplash.com/photo-1554048612-b6ebae92138d?w=400";

const getFallbackResults = (type, location, style) => {
  const loc = location ? `, ${location}` : ", Your City";
  const suf = style !== "all" ? ` (${style} style)` : "";
  return [
    { place_id: "rec_1", name: `Elite ${type === 'photographer' ? 'Photography' : 'Videography'} Studio${suf}`, type, address: `123 Creative Lane${loc}`, phone: "(555) 123-4567", website: "https://example.com", instagram: "@eliteweddings", rating: 4.9, user_ratings_total: 247, price_level: 4, photo_url: getDefaultImage(type), recommended: true },
    { place_id: "rec_2", name: `Premium ${type === 'photographer' ? 'Photo' : 'Video'} Co.${suf}`, type, address: `456 Art Street${loc}`, phone: "(555) 234-5678", website: "https://example.com", instagram: "@premiumweddings", rating: 4.8, user_ratings_total: 189, price_level: 3, photo_url: getDefaultImage(type), recommended: true },
    { place_id: "std_1", name: `Beautiful Moments ${type === 'photographer' ? 'Photography' : 'Films'}${suf}`, type, address: `789 Vision Ave${loc}`, phone: "(555) 345-6789", website: "https://example.com", instagram: "@beautifulmoments", rating: 4.5, user_ratings_total: 156, price_level: 2, photo_url: getDefaultImage(type), recommended: false },
  ];
};

export default function PhotographerSearch({ onAddPhotographer }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceType, setServiceType] = useState("photographer");
  const [location, setLocation] = useState("");
  const [style, setStyle] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearchResults([]);
    setHasSearched(true);
    try {
      let query = serviceType === "photographer" ? "wedding photographer" : "wedding videographer";
      if (searchTerm) query += ` ${searchTerm}`;
      if (location) query += ` in ${location}`;
      if (style !== "all") query += ` specializing in ${style} style`;

      const response = await InvokeLLM({
        prompt: `I'm looking for ${query}. Suggest real, highly-rated professionals. For each, provide: business name, address, phone, website, Instagram handle, rating (1-5), price range (1-4), and a brief style description.`,
        add_context_from_internet: true,
      });

      const parsed = parseAIResponse(response, serviceType);
      const filtered = parsed.filter(r => minRating === 0 || r.rating >= minRating).sort((a, b) => (b.rating || 0) - (a.rating || 0));
      const recCount = Math.min(3, Math.floor(filtered.length * 0.4));
      filtered.forEach((r, i) => { r.recommended = i < recCount && r.rating >= 4.5; });
      setSearchResults(filtered);
    } catch (e) {
      setSearchResults(getFallbackResults(serviceType, location, style));
    }
    setLoading(false);
  };

  const parseAIResponse = (response, type) => {
    if (typeof response !== 'string') return getFallbackResults(type, '', '');
    const businesses = [];
    const lines = response.split('\n');
    let current = { type };
    lines.forEach(line => {
      if (line.includes('**') || line.includes('##') || line.match(/^\d+\./)) {
        if (current.name) businesses.push(formatBusiness(current));
        current = { type, name: line.replace(/[*#\d\.]/g, '').trim() };
      } else if (line.toLowerCase().includes('address')) {
        current.address = line.replace(/address[:\-]?\s*/i, '').trim();
      } else if (line.toLowerCase().includes('rating') || line.includes('star')) {
        const m = line.match(/(\d\.?\d?)\s*\/?\s*5?\s*star/i);
        current.rating = m ? parseFloat(m[1]) : 4.5;
      }
    });
    if (current.name) businesses.push(formatBusiness(current));
    return businesses.length >= 3 ? businesses : getFallbackResults(type, '', '');
  };

  const formatBusiness = (b) => ({
    place_id: `ai_${Date.now()}_${Math.random()}`, name: b.name || 'Professional Photographer',
    type: b.type || 'photographer', address: b.address || 'Your City',
    phone: b.phone || '', website: b.website || '', instagram: b.instagram || '',
    rating: b.rating || (4.0 + Math.random()), user_ratings_total: Math.floor(50 + Math.random() * 200),
    price_level: Math.floor(2 + Math.random() * 2), photo_url: getDefaultImage(b.type), recommended: false,
  });

  const recommended = searchResults.filter(r => r.recommended);
  const others = searchResults.filter(r => !r.recommended);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Search form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Service type</label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photographer"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Camera size={14} />Photographer</span></SelectItem>
                <SelectItem value="videographer"><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Video size={14} />Videographer</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Keywords</label>
            <input style={inputStyle} placeholder="e.g., candid, rustic" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Location</label>
            <input style={inputStyle} placeholder="City or location" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Style</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Min rating</label>
            <Select value={minRating.toString()} onValueChange={v => setMinRating(parseFloat(v))}>
              <SelectTrigger style={{ width: 160 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any rating</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="4.5">4.5+ stars</SelectItem>
                <SelectItem value="4.8">4.8+ stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button onClick={handleSearch} disabled={loading} className="btn-primary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 22 }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Loader2 size={20} style={{ color: '#E03553' }} className="animate-spin" />
          <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Finding the best professionals…</span>
        </div>
      )}

      {!loading && hasSearched && searchResults.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Search size={40} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No results found — try different keywords or location.</p>
        </div>
      )}

      {!loading && searchResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {recommended.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Award size={14} style={{ color: '#6b7700' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Top rated</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recommended.map(result => <ResultCard key={result.place_id} result={result} onAdd={onAddPhotographer} topRated />)}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block', marginBottom: 12 }}>More options</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {others.map(result => <ResultCard key={result.place_id} result={result} onAdd={onAddPhotographer} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, onAdd, topRated }) {
  return (
    <div style={{ border: `1px solid ${topRated ? 'rgba(107,119,0,0.3)' : 'rgba(10,10,10,0.08)'}`, background: topRated ? 'rgba(107,119,0,0.04)' : '#FFFFFF', padding: '14px 16px', display: 'flex', gap: 14 }}>
      {result.photo_url && (
        <img src={result.photo_url} alt={result.name} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{result.name}</span>
              {topRated && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(224,53,83,0.1)', color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Top rated
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {result.type === 'photographer' ? <Camera size={12} style={{ color: '#E03553' }} /> : <Video size={12} style={{ color: '#803D81' }} />}
              <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>{result.type}</span>
              <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{'$'.repeat(result.price_level || 2)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <Star size={11} style={{ color: '#6b7700', fill: '#6b7700' }} />{result.rating?.toFixed(1)} ({result.user_ratings_total})
              </span>
            </div>
          </div>
          <button onClick={() => onAdd(result)} className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Plus size={11} />Add
          </button>
        </div>
        {result.address && (
          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />{result.address}
          </span>
        )}
        {result.instagram && (
          <span style={{ fontSize: 12, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{result.instagram}</span>
        )}
      </div>
    </div>
  );
}
