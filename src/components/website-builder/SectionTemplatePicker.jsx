import React, { useState } from 'react';
import { X } from 'lucide-react';

function getDefaultContent(templateId) {
  const defaults = {
    'cinematic-hero': { title: 'Sarah & James', date: '', location: '', overlayStrength: 40, videoUrl: '', photoUrl: '' },
    'split-hero': { title: 'Sarah & James', subtitle: 'Are getting married', date: '', photoUrl: '', photoSide: 'left' },
    'minimal-text-hero': { title: 'Sarah & James', subtitle: 'Together forever', date: '' },
    'full-screen-gallery': { photos: [] },
    'our-story': { text: 'Tell your love story here...', milestones: [] },
    'love-letter': { quote: 'We are overjoyed to celebrate with you.', attribution: '' },
    'meet-the-couple': { partner1: { name: '', bio: '', photoUrl: '' }, partner2: { name: '', bio: '', photoUrl: '' } },
    'how-we-met': { text: '', photos: [] },
    'event-details': { ceremony: { venue: '', address: '', time: '', dressCode: '' }, reception: { venue: '', address: '', time: '' } },
    'day-timeline': { events: [{ time: '3:00 PM', title: 'Ceremony', description: '' }] },
    'venue-showcase': { venue: '', address: '', photoUrl: '', mapUrl: '' },
    'countdown-timer': { message: 'Until we say I do' },
    'photo-grid': { photos: [], columns: 3 },
    'photo-strip': { photos: [] },
    'featured-photo': { photoUrl: '', caption: '' },
    'full-rsvp': { deadline: '', closingMessage: 'We cannot wait to celebrate with you.' },
    'simple-rsvp': { deadline: '' },
    'rsvp-meal': { deadline: '', mealOptions: ['Beef', 'Chicken', 'Vegetarian'] },
    'travel-stay': { gettingThere: '', parking: '', hotels: [] },
    'registry-links': { message: '', links: [] },
    'faq-accordion': { items: [{ question: 'What should I wear?', answer: 'Smart casual attire is recommended.' }] },
    'map-directions': { venue: '', address: '', mapEmbedUrl: '' },
    'spotify-playlist': { playlistUrl: '', message: '' },
    'song-request': { message: 'Request a song for the dance floor!' },
    'music-playlist': { playlistUrl: '', enableRequests: true },
    'guest-book': { message: 'Leave us a note!' },
    'photo-upload': { message: 'Share your photos with us!' },
    'hashtag-wall': { hashtag: '#OurWedding', message: 'Share your photos!' },
    'thank-you': { message: 'Thank you for being part of our special day.', attribution: '' },
    'save-the-date': { date: '', venue: '' },
    'quote': { text: 'Love is patient, love is kind.', attribution: '' },
    'spacer': { height: 80 },
  };
  return defaults[templateId] || {};
}

export const SECTION_TEMPLATES = [
  // HERO
  { id: 'cinematic-hero', name: 'Cinematic Hero', category: 'Hero', emoji: '🎬', defaultContent: { title: '', subtitle: '' } },
  { id: 'split-hero', name: 'Split Hero', category: 'Hero', emoji: '◧', defaultContent: { title: '', text: '' } },
  { id: 'minimal-text-hero', name: 'Minimal Text Hero', category: 'Hero', emoji: '✦', defaultContent: { title: '', subtitle: '' } },
  { id: 'full-screen-gallery', name: 'Full Screen Gallery', category: 'Hero', emoji: '🖼', defaultContent: { photos: [] } },
  // COUPLE
  { id: 'our-story', name: 'Our Story', category: 'Couple', emoji: '💕', defaultContent: { storyText: '', milestones: [] } },
  { id: 'love-letter', name: 'Love Letter', category: 'Couple', emoji: '💌', defaultContent: { quote: '' } },
  { id: 'meet-the-couple', name: 'Meet The Couple', category: 'Couple', emoji: '👫', defaultContent: { partner1: {}, partner2: {} } },
  { id: 'how-we-met', name: 'How We Met', category: 'Couple', emoji: '🤝', defaultContent: { story: '', photos: [] } },
  // CELEBRATION
  { id: 'event-details', name: 'Event Details', category: 'Celebration', emoji: '📋', defaultContent: {} },
  { id: 'day-timeline', name: 'Day Timeline', category: 'Celebration', emoji: '⏰', defaultContent: { items: [] } },
  { id: 'venue-showcase', name: 'Venue Showcase', category: 'Celebration', emoji: '🏛', defaultContent: { venueName: '', address: '', photo: '' } },
  { id: 'countdown-timer', name: 'Countdown Timer', category: 'Celebration', emoji: '⏳', defaultContent: {} },
  // GALLERY
  { id: 'photo-grid', name: 'Photo Grid', category: 'Gallery', emoji: '📸', defaultContent: { photos: [] } },
  { id: 'photo-strip', name: 'Photo Strip', category: 'Gallery', emoji: '🎞', defaultContent: { photos: [] } },
  { id: 'featured-photo', name: 'Featured Photo', category: 'Gallery', emoji: '🌟', defaultContent: { photo: '', caption: '' } },
  // RSVP
  { id: 'full-rsvp', name: 'Full RSVP Form', category: 'RSVP', emoji: '✉️', defaultContent: {} },
  { id: 'simple-rsvp', name: 'Simple RSVP', category: 'RSVP', emoji: '✓', defaultContent: {} },
  { id: 'rsvp-meal', name: 'RSVP + Meal', category: 'RSVP', emoji: '🍽', defaultContent: { mealOptions: [] } },
  // PRACTICAL
  { id: 'travel-stay', name: 'Travel & Stay', category: 'Practical', emoji: '✈️', defaultContent: { accommodations: [] } },
  { id: 'registry-links', name: 'Registry Links', category: 'Practical', emoji: '🎁', defaultContent: { links: [] } },
  { id: 'faq-accordion', name: 'FAQ Accordion', category: 'Practical', emoji: '❓', defaultContent: { items: [] } },
  { id: 'map-directions', name: 'Map & Directions', category: 'Practical', emoji: '🗺', defaultContent: { address: '' } },
  // MUSIC
  { id: 'spotify-playlist', name: 'Spotify Playlist', category: 'Music', emoji: '🎵', defaultContent: { url: '' } },
  { id: 'song-request', name: 'Song Request', category: 'Music', emoji: '🎤', defaultContent: { message: '' } },
  { id: 'music-playlist', name: 'Music & Playlist', category: 'Music', emoji: '🎶', defaultContent: { url: '', enableRequests: false } },
  // SOCIAL
  { id: 'guest-book', name: 'Guest Book', category: 'Social', emoji: '📖', defaultContent: { title: 'Leave a Message' } },
  { id: 'photo-upload', name: 'Photo Upload', category: 'Social', emoji: '📷', defaultContent: { message: '' } },
  { id: 'hashtag-wall', name: 'Hashtag Wall', category: 'Social', emoji: '#️⃣', defaultContent: { hashtag: '' } },
  // CLOSING
  { id: 'thank-you', name: 'Thank You Note', category: 'Closing', emoji: '🙏', defaultContent: { message: '' } },
  { id: 'save-the-date', name: 'Save The Date', category: 'Closing', emoji: '📅', defaultContent: {} },
  { id: 'quote', name: 'Quote', category: 'Closing', emoji: '❝', defaultContent: { quote: '', attribution: '' } },
  { id: 'spacer', name: 'Spacer', category: 'Closing', emoji: '⬜', defaultContent: { height: 80 } },
];

const CATEGORIES = ['Hero', 'Couple', 'Celebration', 'Gallery', 'RSVP', 'Practical', 'Music', 'Social', 'Closing'];

// Mini preview thumbnails for templates
function TemplateThumbnail({ template, theme }) {
  const bg = theme?.darkBg || '#0A0A0A';
  const lt = theme?.lightBg || '#F8F7F5';
  const ac = theme?.accent || '#888';

  const previews = {
    'cinematic-hero': (
      <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
        <div style={{ width: '70%', height: 10, background: `${ac}60`, borderRadius: 2 }} />
        <div style={{ width: '40%', height: 6, background: `${ac}30`, borderRadius: 2 }} />
        <div style={{ width: '55%', height: 5, background: `${ac}20`, borderRadius: 2 }} />
      </div>
    ),
    'split-hero': (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <div style={{ flex: 1, background: `${bg}`, opacity: 0.8 }} />
        <div style={{ flex: 1, background: lt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, padding: 4 }}>
          <div style={{ width: '80%', height: 6, background: bg, borderRadius: 2, opacity: 0.5 }} />
          <div style={{ width: '60%', height: 4, background: bg, borderRadius: 2, opacity: 0.3 }} />
        </div>
      </div>
    ),
    'photo-grid': (
      <div style={{ width: '100%', height: '100%', background: lt, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 6 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ background: `${bg}40`, borderRadius: 2 }} />)}
      </div>
    ),
    'day-timeline': (
      <div style={{ width: '100%', height: '100%', background: lt, padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 24, height: 5, background: ac, opacity: 0.7, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 5, background: `${bg}30`, borderRadius: 2 }} />
          </div>
        ))}
      </div>
    ),
    'countdown-timer': (
      <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {['00', '00', '00'].map((n, i) => (
          <div key={i} style={{ background: `${ac}30`, padding: '4px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700, color: ac }}>{n}</div>
        ))}
      </div>
    ),
  };

  const defaultPreview = (
    <div style={{ width: '100%', height: '100%', background: lt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <div style={{ fontSize: 24 }}>{template.emoji}</div>
    </div>
  );

  return previews[template.id] || defaultPreview;
}

export default function SectionTemplatePicker({ onSelect, onClose, insertIndex = null, theme }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = SECTION_TEMPLATES.filter(t => {
    const matchesSearch = search === '' || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template) => {
    const newSection = {
      id: 'sec_' + Date.now(),
      type: template.id,
      order: insertIndex ?? 999,
      content: getDefaultContent(template.id),
    };
    onSelect(newSection, insertIndex);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '90vw', maxWidth: 900, height: '85vh',
        background: '#fff', borderRadius: 12, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>Add Section</h2>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Choose a section template to add to this page</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sections..."
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', border: '1px solid #EEEEEE',
              borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box', marginBottom: 12,
            }}
            onFocus={e => e.target.style.borderColor = '#E03553'}
            onBlur={e => e.target.style.borderColor = '#EEEEEE'}
          />

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {['All', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '4px 12px', borderRadius: 100, border: '1px solid',
                borderColor: activeCategory === cat ? '#0A0A0A' : '#DDD',
                background: activeCategory === cat ? '#0A0A0A' : 'transparent',
                color: activeCategory === cat ? '#fff' : '#555',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map(template => (
              <div
                key={template.id}
                onClick={() => handleSelect(template)}
                style={{
                  border: '1px solid #EEEEEE', borderRadius: 8, overflow: 'hidden',
                  cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(224,53,83,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#EEEEEE'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Thumbnail */}
                <div style={{ height: 120, background: '#F5F5F5', overflow: 'hidden' }}>
                  <TemplateThumbnail template={template} theme={theme} />
                </div>
                {/* Label */}
                <div style={{ padding: '10px 14px 10px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 3px' }}>{template.name}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', margin: 0 }}>{template.category}</p>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
              <p style={{ fontSize: 14 }}>No sections match "{search}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}