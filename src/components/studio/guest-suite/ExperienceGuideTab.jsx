import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const VIBE_OPTIONS = [
  'Coastal luxury', 'Late-night food scene', 'Historic architecture',
  'Relaxed beach culture', 'World-class dining', 'Art & culture hub',
  'Hidden local gems', 'Outdoor adventure', 'Urban sophistication',
  'Wine country', 'Tropical paradise', 'Mountain escape',
  'Fashion & shopping', 'Wellness & spa', 'Vibrant nightlife',
];

const CATEGORIES = [
  { key: 'mustEat', label: 'Must Eat' },
  { key: 'coffee', label: 'Coffee & Bakeries' },
  { key: 'hiddenGems', label: 'Hidden Gems' },
  { key: 'luxuryDining', label: 'Luxury Dining' },
  { key: 'nature', label: 'Beaches & Nature' },
  { key: 'nightlife', label: 'Nightlife' },
  { key: 'thingsToDo', label: 'Things To Do' },
  { key: 'wellness', label: 'Recovery & Wellness' },
  { key: 'dayTrips', label: 'Day Trips' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'weddingWeekend', label: 'Wedding Weekend Essentials' },
];

export default function ExperienceGuideTab({ details }) {
  const [activeLeftTab, setActiveLeftTab] = useState('setup');
  const [showAddGemModal, setShowAddGemModal] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const current = details || {};
      const experienceGuide = { ...(current.experienceGuide || {}), ...updates };
      if (current.id) {
        await base44.entities.WeddingDetails.update(current.id, { experienceGuide });
      } else {
        await base44.entities.WeddingDetails.create({ experienceGuide, slug: 'temp' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['guestSuiteDetails']);
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const handleGenerateIntro = async () => {
    const destination = details?.experienceGuide?.destination || details?.mainCeremony?.address?.split(',').slice(-3).join(', ') || 'our destination';
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a 2-3 sentence editorial introduction for a wedding guest guide to ${destination}. Tone: Vogue travel guide meets Airbnb Experiences. Human, evocative, not robotic. Example: "Welcome to our favourite city — where coastal luxury meets late-night energy. We've curated the places that made us fall in love with this corner of the world."`,
    });
    updateMutation.mutate({ editorialIntro: response });
  };

  const handleSaveField = (field, value) => {
    updateMutation.mutate({ [field]: value });
  };

  const handleToggleVibe = (vibe) => {
    const currentVibes = details?.experienceGuide?.vibes || [];
    const newVibes = currentVibes.includes(vibe)
      ? currentVibes.filter(v => v !== vibe)
      : [...currentVibes, vibe];
    updateMutation.mutate({ vibes: newVibes });
  };

  const handleToggleCategory = (catKey) => {
    const currentCats = details?.experienceGuide?.categories || {};
    const updated = {
      ...currentCats,
      [catKey]: { ...currentCats[catKey], enabled: !currentCats[catKey]?.enabled },
    };
    updateMutation.mutate({ categories: updated });
  };

  const destination = details?.experienceGuide?.destination || 
    details?.mainCeremony?.address?.split(',').slice(-3).join(', ') || 
    'Set your venue in Event Details';

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 104px)' }}>
      {/* LEFT PANEL — Editor */}
      <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid #EEEEEE', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
        {/* Left panel tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EEEEEE', padding: '0 16px' }}>
          {['setup', 'categories', 'picks', 'publish'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveLeftTab(tab)}
              style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none',
                borderBottom: activeLeftTab === tab ? '2px solid #E03553' : '2px solid transparent',
                color: activeLeftTab === tab ? '#0A0A0A' : '#888', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeLeftTab === 'setup' && (
            <div>
              {/* Destination */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, color: '#0A0A0A', padding: '8px 0', borderBottom: '1px solid #EEE' }}>
                  {destination}
                </p>
              </div>

              {/* Hero Media */}
              <div style={{ marginBottom: 20 }}>
                <input
                  type="text"
                  value={details?.experienceGuide?.heroPhotoUrl || ''}
                  onChange={(e) => handleSaveField('heroPhotoUrl', e.target.value)}
                  placeholder="https://..."
                  style={{ width: '100%', border: '1px solid #EEE', padding: 10, fontSize: 13, outline: 'none', fontFamily: 'Plus Jakarta Sans' }}
                />
              </div>

              {/* Editorial Intro */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <button onClick={handleGenerateIntro} style={{ fontSize: 11, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>✦ Generate</button>
                </div>
                <textarea
                  value={details?.experienceGuide?.editorialIntro || ''}
                  onChange={(e) => handleSaveField('editorialIntro', e.target.value)}
                  rows={4}
                  placeholder="Write an inspiring introduction to your wedding destination..."
                  style={{ width: '100%', border: '1px solid #EEE', padding: 12, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'Plus Jakarta Sans' }}
                />
              </div>

              {/* Vibe Tags */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {VIBE_OPTIONS.map(vibe => {
                    const isActive = (details?.experienceGuide?.vibes || []).includes(vibe);
                    return (
                      <button
                        key={vibe}
                        onClick={() => handleToggleVibe(vibe)}
                        style={{
                          padding: '6px 12px', border: `1px solid ${isActive ? '#E03553' : '#EEE'}`,
                          background: isActive ? 'rgba(224,53,83,0.06)' : 'transparent',
                          color: isActive ? '#E03553' : '#888', fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.05em',
                        }}
                      >
                        {vibe}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeLeftTab === 'categories' && (
            <div>
              {CATEGORIES.map(cat => {
                const isEnabled = details?.experienceGuide?.categories?.[cat.key]?.enabled !== false;
                return (
                  <div key={cat.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
                    <span style={{ fontSize: 13, color: '#0A0A0A', fontWeight: 500 }}>{cat.label}</span>
                    <button
                      onClick={() => handleToggleCategory(cat.key)}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: 'none',
                        background: isEnabled ? '#E03553' : '#E0E0E0', cursor: 'pointer',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: isEnabled ? 22 : 2,
                        width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeLeftTab === 'picks' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button
                  onClick={() => setShowAddGemModal(true)}
                  style={{ fontSize: 11, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Add Custom Gem
                </button>
              </div>
              
              {/* Couple picks list */}
              {(details?.experienceGuide?.couplePicks || []).map((pick, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
                  {pick.photo && <img src={pick.photo} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>{pick.name}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{pick.category}</p>
                  </div>
                </div>
              ))}
              
              {/* Custom gems list */}
              {(details?.experienceGuide?.customGems || []).map((gem, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
                  {gem.photo && <img src={gem.photo} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>{gem.name}</p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Added by {gem.addedBy || 'Couple'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeLeftTab === 'publish' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => handleSaveField('published', !details?.experienceGuide?.published)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 4, border: 'none',
                    background: details?.experienceGuide?.published ? '#E03553' : '#E0E0E0',
                    color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {details?.experienceGuide?.published ? 'Published' : 'Hidden'}
                </button>
                <p style={{ fontSize: 11, color: '#888', marginTop: 12, lineHeight: 1.5 }}>
                  When published, guests can access this from the navigation on your wedding website.
                </p>
              </div>

              <button
                onClick={() => toast.success('Generating descriptions...')}
                style={{
                  width: '100%', padding: '14px 16px', border: '1px solid #E03553',
                  background: 'transparent', color: '#E03553', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                Generate All Descriptions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Live Preview */}
      <div style={{ flex: 1, background: '#F5F5F5', overflow: 'auto' }}>
        <div style={{ maxWidth: 480, margin: '40px auto', background: '#FFFFFF', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {/* Preview header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, color: '#888' }}>{details?.experienceGuide?.published ? 'Live' : 'Hidden'}</p>
          </div>
          
          {/* Preview content — simplified hero */}
          <div style={{ height: 400, background: details?.experienceGuide?.heroPhotoUrl ? `url(${details.experienceGuide.heroPhotoUrl}) center/cover` : 'linear-gradient(135deg, #0A1930, #1A0A20)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: '#FFFFFF', margin: 0 }}>{destination.split(',')[0] || 'Destination'}</h1>
            </div>
          </div>
          
          {/* Preview categories */}
          <div style={{ padding: '24px 20px' }}>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Enabled Categories:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.filter(c => details?.experienceGuide?.categories?.[c.key]?.enabled !== false).slice(0, 5).map(cat => (
                <span key={cat.key} style={{ padding: '4px 10px', background: '#F5F5F5', fontSize: 11, color: '#555', fontWeight: 500 }}>{cat.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Gem Modal */}
      {showAddGemModal && (
        <AddCustomGemModal
          onClose={() => setShowAddGemModal(false)}
          onSave={(gem) => {
            const current = details?.experienceGuide?.customGems || [];
            updateMutation.mutate({ customGems: [...current, gem] });
            setShowAddGemModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddCustomGemModal({ onClose, onSave }) {
  const [gem, setGem] = useState({ name: '', address: '', category: '', photo: '', note: '', addedBy: 'Both' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', borderRadius: 8 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Add Custom Gem</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20 }}>×</button>
        </div>
        
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <input value={gem.name} onChange={(e) => setGem({ ...gem, name: e.target.value })} style={{ width: '100%', border: '1px solid #EEE', padding: 10, fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <input value={gem.address} onChange={(e) => setGem({ ...gem, address: e.target.value })} style={{ width: '100%', border: '1px solid #EEE', padding: 10, fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <select value={gem.category} onChange={(e) => setGem({ ...gem, category: e.target.value })} style={{ width: '100%', border: '1px solid #EEE', padding: 10, fontSize: 13, fontFamily: 'Plus Jakarta Sans' }}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
            </select>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <input value={gem.photo} onChange={(e) => setGem({ ...gem, photo: e.target.value })} placeholder="https://..." style={{ width: '100%', border: '1px solid #EEE', padding: 10, fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <textarea value={gem.note} onChange={(e) => setGem({ ...gem, note: e.target.value })} rows={3} style={{ width: '100%', border: '1px solid #EEE', padding: 10, fontSize: 13, fontFamily: 'Plus Jakarta Sans', resize: 'none' }} />
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {['Bride', 'Groom', 'Both'].map(who => (
                <button
                  key={who}
                  onClick={() => setGem({ ...gem, addedBy: who })}
                  style={{
                    flex: 1, padding: '10px', border: gem.addedBy === who ? '1px solid #E03553' : '1px solid #EEE',
                    background: gem.addedBy === who ? 'rgba(224,53,83,0.06)' : 'transparent', color: gem.addedBy === who ? '#E03553' : '#888',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans',
                  }}
                >
                  {who}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => onSave(gem)}
            disabled={!gem.name || !gem.category}
            style={{
              width: '100%', padding: '14px', background: '#E03553', color: '#FFFFFF', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: gem.name && gem.category ? 'pointer' : 'not-allowed',
            }}
          >
            Save Custom Gem
          </button>
        </div>
      </div>
    </div>
  );
}