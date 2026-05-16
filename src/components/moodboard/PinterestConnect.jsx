import React, { useState } from 'react';
import { MoodboardItem } from '@/entities/MoodboardItem';
import { InvokeLLM } from '@/integrations/Core';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CURATED = {
  dress: [
    { id: 'd1', title: 'Elegant A-line wedding dress', image_url: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400', source_url: 'https://unsplash.com', description: 'Timeless A-line silhouette with delicate lace details' },
    { id: 'd2', title: 'Boho lace wedding gown', image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400', source_url: 'https://unsplash.com', description: 'Romantic bohemian style with intricate lace patterns' },
    { id: 'd3', title: 'Vintage inspired wedding dress', image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400', source_url: 'https://unsplash.com', description: 'Classic vintage elegance with modern touches' },
  ],
  flowers: [
    { id: 'f1', title: 'Bridal bouquet with roses', image_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400', source_url: 'https://unsplash.com', description: 'Classic white roses with greenery accents' },
    { id: 'f2', title: 'Wildflower bridal arrangement', image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', source_url: 'https://unsplash.com', description: 'Natural wildflower bouquet for rustic weddings' },
    { id: 'f3', title: 'Peony wedding centrepiece', image_url: 'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400', source_url: 'https://unsplash.com', description: 'Elegant peony arrangements for table settings' },
  ],
  venue: [
    { id: 'v1', title: 'Garden wedding ceremony', image_url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400', source_url: 'https://unsplash.com', description: 'Beautiful outdoor garden ceremony setup' },
    { id: 'v2', title: 'Rustic barn wedding', image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400', source_url: 'https://unsplash.com', description: 'Charming rustic barn venue with string lights' },
    { id: 'v3', title: 'Beach wedding setup', image_url: 'https://images.unsplash.com/photo-1519167758481-83f29c8a8c15?w=400', source_url: 'https://unsplash.com', description: 'Romantic beachside ceremony location' },
  ],
};

const getResults = (term) => {
  const key = term.toLowerCase();
  if (CURATED[key]) return CURATED[key];
  return [
    { id: `g1_${term}`, title: `${term} wedding inspiration`, image_url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400', source_url: 'https://unsplash.com', description: `Beautiful ${term} ideas for your wedding day` },
    { id: `g2_${term}`, title: `Elegant ${term} style`, image_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400', source_url: 'https://unsplash.com', description: `Sophisticated ${term} inspiration` },
    { id: `g3_${term}`, title: `${term} wedding details`, image_url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400', source_url: 'https://unsplash.com', description: `Perfect ${term} details for your special day` },
  ];
};

export default function PinterestConnect({ onClose, onAddItems, activeBoard }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(new Set());

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await InvokeLLM({ prompt: `Find 6 wedding inspiration images for "${searchTerm}". Provide title, image_url (Unsplash), source_url, description.`, add_context_from_internet: true });
      if (res?.images?.length) {
        setResults(res.images.map((img, i) => ({ id: `img_${Date.now()}_${i}`, title: img.title || `${searchTerm} inspiration`, image_url: img.image_url, source_url: img.source_url || 'https://unsplash.com', description: img.description || '' })));
      } else {
        setResults(getResults(searchTerm));
      }
    } catch (e) {
      setResults(getResults(searchTerm));
    }
    setLoading(false);
  };

  const handleAdd = async (item) => {
    if (added.has(item.id)) return;
    try {
      await MoodboardItem.create({ title: item.title, image_url: item.image_url, source_url: item.source_url, category: 'other', board_name: activeBoard, notes: item.description, tags: ['inspiration', searchTerm.toLowerCase()] });
      setAdded(prev => new Set([...prev, item.id]));
      toast.success('Added to moodboard');
      onAddItems();
    } catch (e) {
      toast.error('Failed to add item');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Find inspiration</span>
            <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>Search for wedding inspiration to add to your moodboard</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)' }} />
            <input
              style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0 6px 22px', boxSizing: 'border-box' }}
              placeholder="Search 'dress', 'flowers', 'venue', 'decor'…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} disabled={loading} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Loader2 size={20} style={{ color: '#E03553' }} className="animate-spin" />
              <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Searching for inspiration…</span>
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '64px 0', textAlign: 'center' }}>
              <Search size={40} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Enter search terms to find wedding inspiration</p>
              <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Try "dress", "flowers", "venue", or "decor"</p>
            </div>
          )}
          {results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
              {results.map(item => (
                <div key={item.id} style={{ background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
                  <img src={item.image_url} alt={item.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400'; }} />
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                      {item.description && <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>}
                    </div>
                    <button onClick={() => handleAdd(item)} disabled={added.has(item.id)}
                      className={added.has(item.id) ? 'btn-editorial-secondary' : 'btn-primary'}
                      style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, opacity: added.has(item.id) ? 0.6 : 1 }}>
                      {added.has(item.id) ? 'Added' : <><Plus size={11} />Add</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
