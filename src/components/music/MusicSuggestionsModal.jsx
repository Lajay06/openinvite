import React, { useState, useEffect } from 'react';
import { X, Plus, Music, Heart, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { ThemeDetails } from '@/entities/ThemeDetails';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORY_COLORS = {
  ceremony:        '#E03553',
  cocktail_hour:   '#8a9a00',
  dinner:          '#803D81',
  dancing:         '#6B2CAE',
  special_moments: '#3a7a96',
  general:         'rgba(10,10,10,0.4)',
};

const DEFAULT_SUGGESTIONS = [
  { song_title: 'A Thousand Years', artist: 'Christina Perri', category: 'ceremony', notes: 'Perfect for walking down the aisle' },
  { song_title: 'All of Me', artist: 'John Legend', category: 'ceremony', notes: 'Beautiful for first dance' },
  { song_title: "Can't Help Myself", artist: 'Four Tops', category: 'dancing', notes: 'Classic crowd pleaser' },
  { song_title: 'September', artist: 'Earth, Wind & Fire', category: 'dancing', notes: 'Gets everyone dancing' },
  { song_title: 'At Last', artist: 'Etta James', category: 'dinner', notes: 'Romantic dinner music' },
  { song_title: 'Fly Me to the Moon', artist: 'Frank Sinatra', category: 'cocktail_hour', notes: 'Elegant cocktail hour vibe' },
  { song_title: 'Perfect', artist: 'Ed Sheeran', category: 'special_moments', notes: 'Modern romantic favorite' },
  { song_title: 'Sweet Caroline', artist: 'Neil Diamond', category: 'dancing', notes: 'Sing-along favorite' },
];

function SuggestionCard({ suggestion, onAdd }) {
  const color = CATEGORY_COLORS[suggestion.category] || CATEGORY_COLORS.general;
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, background: '#0A1930', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Music size={14} style={{ color: '#DDF762' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{suggestion.song_title}</span>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '1px 8px', borderRadius: 999, background: `${color}18`, color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {(suggestion.category || 'general').replace('_', ' ')}
          </span>
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px' }}>by {suggestion.artist}</p>
        {suggestion.notes && (
          <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: 'italic', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Heart size={10} style={{ color: '#E03553', flexShrink: 0 }} />{suggestion.notes}
          </p>
        )}
      </div>
      <button onClick={() => onAdd(suggestion)} className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <Plus size={11} />Add
      </button>
    </div>
  );
}

function SuggestionsList({ loading, suggestions, onAdd, type }) {
  if (loading) {
    return (
      <div style={{ padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Loader2 size={20} style={{ color: '#E03553' }} className="animate-spin" />
        <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading {type} suggestions…</span>
      </div>
    );
  }
  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          No {type} suggestions found. {type === 'themed' ? 'Save your theme details first!' : ''}
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
      {suggestions.map((s, i) => (
        <SuggestionCard key={i} suggestion={s} onAdd={onAdd} />
      ))}
    </div>
  );
}

export default function MusicSuggestionsModal({ isOpen, onClose, onAddSuggestion }) {
  const [tab, setTab] = useState('general');
  const [generalSuggestions, setGeneralSuggestions] = useState([]);
  const [themedSuggestions, setThemedSuggestions] = useState([]);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [loadingThemed, setLoadingThemed] = useState(false);
  const [themeDetails, setThemeDetails] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    loadGeneralSuggestions();
    loadThemeDetails();
  }, [isOpen]);

  const loadThemeDetails = async () => {
    try {
      const themes = await ThemeDetails.list();
      if (themes.length > 0) setThemeDetails(themes[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGeneralSuggestions = async () => {
    setLoadingGeneral(true);
    try {
      const res = await InvokeLLM({
        prompt: "Generate a list of popular wedding songs by category. For each: song_title, artist, category (ceremony/cocktail_hour/dinner/dancing/special_moments), notes.",
        response_json_schema: {
          type: 'object',
          properties: { songs: { type: 'array', items: { type: 'object', properties: { song_title: { type: 'string' }, artist: { type: 'string' }, category: { type: 'string' }, notes: { type: 'string' } } } } }
        },
      });
      setGeneralSuggestions(res.songs || DEFAULT_SUGGESTIONS);
    } catch (e) {
      setGeneralSuggestions(DEFAULT_SUGGESTIONS);
    }
    setLoadingGeneral(false);
  };

  const loadThemedSuggestions = async () => {
    if (!themeDetails) return;
    setLoadingThemed(true);
    try {
      const res = await InvokeLLM({
        prompt: `Wedding theme: vibes=${themeDetails.vibes?.join(', ')}, season=${themeDetails.season}, setting=${themeDetails.setting}. Suggest themed wedding songs. For each: song_title, artist, category, notes.`,
        response_json_schema: {
          type: 'object',
          properties: { songs: { type: 'array', items: { type: 'object', properties: { song_title: { type: 'string' }, artist: { type: 'string' }, category: { type: 'string' }, notes: { type: 'string' } } } } }
        },
      });
      setThemedSuggestions(res.songs || []);
    } catch (e) {
      setThemedSuggestions([]);
    }
    setLoadingThemed(false);
  };

  useEffect(() => {
    if (themeDetails) loadThemedSuggestions();
  }, [themeDetails]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Song suggestions</span>
            <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>Click Add to pre-fill the song form</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          {[{ value: 'general', label: 'General' }, { value: 'themed', label: 'Themed' }].map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              style={{ padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: tab === t.value ? '#E03553' : '#444444', borderBottom: `2px solid ${tab === t.value ? '#E03553' : 'transparent'}`, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {tab === 'general' && <SuggestionsList loading={loadingGeneral} suggestions={generalSuggestions} onAdd={onAddSuggestion} type="general" />}
          {tab === 'themed' && <SuggestionsList loading={loadingThemed} suggestions={themedSuggestions} onAdd={onAddSuggestion} type="themed" />}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}
