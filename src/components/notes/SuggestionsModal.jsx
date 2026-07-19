import React, { useState, useEffect } from 'react';
import { X, Plus, Brain, Loader2, Clock } from "lucide-react";
import { InvokeLLM } from '@/integrations/Core';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const CATEGORY_COLORS = {
  venue:          { bg: 'rgba(128,61,129,0.12)', color: '#803D81' },
  catering:       { bg: 'rgba(224,53,83,0.12)',  color: '#E03553' },
  attire:         { bg: 'rgba(224,53,83,0.12)',  color: '#E03553' },
  photography:    { bg: 'rgba(58,122,150,0.12)', color: '#3a7a96' },
  flowers:        { bg: 'rgba(107,119,0,0.12)',  color: '#6b7700' },
  music:          { bg: 'rgba(128,61,129,0.12)', color: '#803D81' },
  transportation: { bg: 'rgba(107,119,0,0.12)', color: '#6b7700' },
  legal:          { bg: 'rgba(224,53,83,0.12)',  color: '#E03553' },
  guests:         { bg: 'rgba(58,122,150,0.12)', color: '#3a7a96' },
  decorations:    { bg: 'rgba(128,61,129,0.12)', color: '#803D81' },
};

const PRIORITY_COLORS = {
  urgent: '#E03553', high: '#803D81', medium: '#6b7700', low: '#444444',
};

const TIMELINE_LABELS = {
  "12_months": "12 months before", "9_months": "9 months before",
  "6_months": "6 months before",   "3_months": "3 months before",
  "1_month": "1 month before",     "2_weeks": "2 weeks before",
  "1_week": "1 week before",       "day_of": "Day of wedding",
};

const defaultSuggestions = [
  { title: "Book wedding venue", description: "Research and secure your ceremony and reception venues", category: "venue", priority: "high", wedding_timeline: "12_months" },
  { title: "Send save the dates", description: "Design and mail save the date cards to guests", category: "guests", priority: "high", wedding_timeline: "9_months" },
  { title: "Order wedding dress", description: "Shop for and order your wedding dress allowing time for alterations", category: "attire", priority: "high", wedding_timeline: "9_months" },
  { title: "Book photographer", description: "Research, meet with, and book your wedding photographer", category: "photography", priority: "high", wedding_timeline: "9_months" },
  { title: "Finalise guest list", description: "Create final guest list and collect addresses", category: "guests", priority: "medium", wedding_timeline: "6_months" },
];

function SuggestionItem({ suggestion, onAdd, added }) {
  const catStyle = CATEGORY_COLORS[suggestion.category] || { bg: 'rgba(10,10,10,0.06)', color: '#444444' };
  const priColor = PRIORITY_COLORS[suggestion.priority] || PRIORITY_COLORS.medium;

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.08)', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{suggestion.title}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {suggestion.category}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: suggestion.priority === 'high' ? 'rgba(224,53,83,0.1)' : 'rgba(10,10,10,0.06)', color: suggestion.priority === 'high' ? '#E03553' : '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {suggestion.priority}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px' }}>{suggestion.description}</p>
        {suggestion.wedding_timeline && (
          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} />{TIMELINE_LABELS[suggestion.wedding_timeline] || suggestion.wedding_timeline}
          </span>
        )}
      </div>
      <button onClick={() => onAdd(suggestion)} disabled={added}
        className={added ? 'btn-editorial-secondary' : 'btn-primary'}
        style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, opacity: added ? 0.6 : 1 }}>
        {added ? 'Added' : <><Plus size={11} />Add</>}
      </button>
    </div>
  );
}

export default function SuggestionsModal({ isOpen, onClose, onAddSuggestion }) {
  const [activeTab, setActiveTab] = useState('general');
  const [generalSuggestions, setGeneralSuggestions] = useState([]);
  const [themedSuggestions, setThemedSuggestions] = useState([]);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [loadingThemed, setLoadingThemed] = useState(false);
  const [weddingTheme, setWeddingTheme] = useState(null);
  const [added, setAdded] = useState(new Set());

  useEffect(() => {
    if (isOpen) {
      setAdded(new Set());
      loadGeneralSuggestions();
      loadWeddingTheme();
    }
  }, [isOpen]);

  const loadWeddingTheme = async () => {
    try {
      const details = await getMyWeddingDetails();
      if (details?.theme) setWeddingTheme(details.theme);
    } catch (e) { /* ignore */ }
  };

  const loadGeneralSuggestions = async () => {
    setLoadingGeneral(true);
    try {
      const response = await InvokeLLM({
        prompt: `Generate a comprehensive list of wedding planning tasks that couples typically need to complete. Organise them by timeline (12 months before, 9 months before, 6 months before, 3 months before, 1 month before, 2 weeks before, 1 week before, day of wedding). Include tasks for: venue booking, catering, photography, flowers, music, attire, legal requirements, guest management, transportation, and decorations. Make each task specific and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" }, description: { type: "string" },
                  category: { type: "string" }, priority: { type: "string" },
                  wedding_timeline: { type: "string" }
                }
              }
            }
          }
        }
      });
      setGeneralSuggestions(response.suggestions || defaultSuggestions);
    } catch (e) {
      setGeneralSuggestions(defaultSuggestions);
    }
    setLoadingGeneral(false);
  };

  const loadThemedSuggestions = async () => {
    if (!weddingTheme) { setThemedSuggestions([]); return; }
    setLoadingThemed(true);
    const t = weddingTheme;
    const faithLine = t.faith === 'Interfaith' && t.faithSecondary
      ? `Interfaith: ${t.faithSecondary}`
      : t.faith ? `Faith/religion: ${t.faith}` : '';
    const cultureItems = [...(t.culture || []), t.cultureOther].filter(Boolean);
    const cultureLine = cultureItems.length ? `Culture/heritage: ${cultureItems.join(', ')}` : '';
    const aestheticLine = t.aesthetic?.length ? `Aesthetic: ${t.aesthetic.join(', ')}` : '';
    const atmosphereLine = t.atmosphere?.length ? `Atmosphere: ${t.atmosphere.join(', ')}` : '';
    const seasonLine = [t.season && `Season: ${t.season}`, t.setting && `Setting: ${t.setting}`].filter(Boolean).join('; ');
    const themeContext = [faithLine, cultureLine, aestheticLine, atmosphereLine, seasonLine].filter(Boolean).join(' | ');
    try {
      const response = await InvokeLLM({
        prompt: `Based on a wedding with these details: ${themeContext || 'general wedding'} — generate a comprehensive list of tailored wedding planning tasks organised by timeline. Make each task specific and culturally relevant (e.g. if Hindu faith, include mehendi, baraat; if Catholic, include pre-Cana; if Indian culture, include traditional elements). Be actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" }, description: { type: "string" },
                  category: { type: "string" }, priority: { type: "string" },
                  wedding_timeline: { type: "string" }
                }
              }
            }
          }
        }
      });
      setThemedSuggestions(response.suggestions || []);
    } catch (e) { setThemedSuggestions([]); }
    setLoadingThemed(false);
  };

  useEffect(() => { if (weddingTheme) loadThemedSuggestions(); }, [weddingTheme]);

  const handleAdd = (suggestion) => {
    setAdded(prev => new Set([...prev, suggestion.title]));
    onAddSuggestion(suggestion);
  };

  if (!isOpen) return null;

  const activeSuggestions = activeTab === 'general' ? generalSuggestions : themedSuggestions;
  const isLoading = activeTab === 'general' ? loadingGeneral : loadingThemed;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#0A1930', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={16} style={{ color: '#DDF762' }} />
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Smart task suggestions</span>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>Common wedding tasks you might have missed</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', padding: 6, borderRadius: 999 }}><X size={14} /></button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          {[{ key: 'general', label: 'General' }, { key: 'themed', label: 'Themed' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'none', border: 'none', cursor: 'pointer', color: activeTab === tab.key ? '#0A0A0A' : '#444444', borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {isLoading ? (
            <div style={{ padding: '48px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Loader2 size={20} style={{ color: '#E03553' }} className="animate-spin" />
              <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Generating suggestions…</span>
            </div>
          ) : activeSuggestions.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {activeTab === 'themed' ? 'No themed suggestions — save your theme details first.' : 'No suggestions available.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {activeSuggestions.map((suggestion, i) => (
                <SuggestionItem key={i} suggestion={suggestion} onAdd={handleAdd} added={added.has(suggestion.title)} />
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
