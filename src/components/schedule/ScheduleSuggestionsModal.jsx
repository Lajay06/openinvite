import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Plus, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { InvokeLLM } from '@/integrations/Core';

const CATEGORY_CONFIG = {
  ceremony:       { bg: '#E03553',               text: '#FFFFFF' },
  reception:      { bg: '#803D81',               text: '#FFFFFF' },
  photography:    { bg: '#0A1930',               text: '#FFFFFF' },
  preparation:    { bg: '#DDF762',               text: '#0A1930' },
  transportation: { bg: 'rgba(221,247,98,0.8)', text: '#0A1930' },
  rehearsal:      { bg: '#0A0A0A',               text: '#FFFFFF' },
  pre_wedding:    { bg: 'rgba(128,61,129,0.25)',text: '#803D81' },
  post_wedding:   { bg: 'rgba(224,53,83,0.18)', text: '#E03553' },
  other:          { bg: 'rgba(10,10,10,0.08)',  text: '#444444' },
};

const pillBase = {
  display: 'inline-block', fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
};

const DEFAULT_SUGGESTIONS = [
  { event_name: "Bridal party hair & makeup", category: "preparation", description: "Getting ready with hair and makeup artists" },
  { event_name: "First look photos", category: "photography", description: "Private moment for couple before ceremony" },
  { event_name: "Wedding ceremony", category: "ceremony", description: "Exchange of vows and rings" },
  { event_name: "Cocktail hour", category: "reception", description: "Guests mingle while couple takes portraits" },
  { event_name: "Grand entrance", category: "reception", description: "Couple's entrance to reception" },
  { event_name: "First dance", category: "reception", description: "Couple's first dance as married partners" },
  { event_name: "Dinner service", category: "reception", description: "Wedding reception dinner" },
  { event_name: "Cake cutting", category: "reception", description: "Traditional cake cutting ceremony" },
];

function CategoryPill({ category }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  return <span style={{ ...pillBase, background: cfg.bg, color: cfg.text }}>{category?.replace(/_/g, ' ')}</span>;
}

export default function ScheduleAvaModal({ isOpen, onClose, onAddSuggestion, scheduleItems = [] }) {
  const [activeTab, setActiveTab] = useState('optimise');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: "Generate 8 common wedding day schedule events. Return a JSON array of objects with event_name, category (one of: ceremony, reception, photography, preparation, transportation, rehearsal, pre_wedding, post_wedding, other), and description.",
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event_name: { type: "string" },
                  category: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
      });
      setSuggestions(response.events?.length ? response.events : DEFAULT_SUGGESTIONS);
    } catch {
      setSuggestions(DEFAULT_SUGGESTIONS);
    }
    setSuggestionsLoading(false);
  };

  const runAnalysis = async () => {
    if (scheduleItems.length === 0) {
      setAnalysisResult({ score: 0, summary: "No events to analyse yet — add some events first.", conflicts: [], gaps: [], recommendations: [] });
      return;
    }
    setAnalysisLoading(true);
    setAnalysisResult(null);
    const eventsSummary = scheduleItems
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
      .map(i => `${i.start_time || '??:??'}${i.end_time ? `–${i.end_time}` : ''} ${i.event_name} (${i.category})`)
      .join('\n');
    try {
      const response = await InvokeLLM({
        prompt: `Analyse this wedding day schedule and return a structured JSON assessment:\n\n${eventsSummary}\n\nIdentify: 1) time conflicts/overlaps 2) large unexplained gaps 3) pacing recommendations 4) an overall schedule health score 0-100.`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            summary: { type: "string" },
            conflicts: { type: "array", items: { type: "object", properties: { description: { type: "string" }, severity: { type: "string" } } } },
            gaps: { type: "array", items: { type: "object", properties: { description: { type: "string" } } } },
            recommendations: { type: "array", items: { type: "object", properties: { text: { type: "string" }, priority: { type: "string" } } } },
          },
        },
      });
      setAnalysisResult(response);
    } catch {
      setAnalysisResult({ score: null, summary: "Unable to analyse right now — please try again.", conflicts: [], gaps: [], recommendations: [] });
    }
    setAnalysisLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>

        {/* Header strip */}
        <div style={{ background: '#0A1930', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>· schedule intelligence</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4, borderRadius: 999 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          {[
            { key: 'optimise', label: 'Optimise my schedule' },
            { key: 'suggest', label: 'Suggest events' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: activeTab === tab.key ? '#E03553' : '#444444',
                borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Optimise tab */}
          {activeTab === 'optimise' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {!analysisResult && !analysisLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Sparkles size={28} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 6px' }}>
                    Let Ava check your schedule
                  </p>
                  <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 24px' }}>
                    Ava will detect conflicts, flag time gaps, and recommend improvements.
                  </p>
                  <button
                    onClick={runAnalysis}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '11px 24px', borderRadius: 999,
                      background: '#0A1930', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    <Sparkles size={14} />
                    Analyse my schedule
                  </button>
                </div>
              )}

              {analysisLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 0' }}>
                  <Loader2 size={20} style={{ color: '#E03553', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Analysing your schedule…</span>
                </div>
              )}

              {analysisResult && !analysisLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Health score */}
                  {analysisResult.score !== null && (
                    <div style={{ background: '#F5F5F5', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={labelStyle}>Schedule health</p>
                        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0' }}>
                          {analysisResult.summary}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <p style={{
                          fontSize: 32, fontWeight: 700, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif",
                          color: analysisResult.score >= 80 ? '#0A1930' : analysisResult.score >= 60 ? '#6b7700' : '#E03553',
                        }}>
                          {analysisResult.score}
                        </p>
                        <p style={{ ...labelStyle, marginTop: 2 }}>/ 100</p>
                      </div>
                    </div>
                  )}

                  {/* Conflicts */}
                  {analysisResult.conflicts?.length > 0 && (
                    <div>
                      <p style={{ ...labelStyle, marginBottom: 10 }}>Conflicts</p>
                      {analysisResult.conflicts.map((c, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', marginBottom: 6,
                          borderLeft: '3px solid #E03553', background: 'rgba(224,53,83,0.05)',
                        }}>
                          <AlertTriangle size={14} style={{ color: '#E03553', flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gaps */}
                  {analysisResult.gaps?.length > 0 && (
                    <div>
                      <p style={{ ...labelStyle, marginBottom: 10 }}>Time gaps</p>
                      {analysisResult.gaps.map((g, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', marginBottom: 6,
                          borderLeft: `3px solid #DDF762`, background: 'rgba(221,247,98,0.08)',
                        }}>
                          <AlertTriangle size={14} style={{ color: '#6b7700', flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{g.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations?.length > 0 && (
                    <div>
                      <p style={{ ...labelStyle, marginBottom: 10 }}>Recommendations</p>
                      {analysisResult.recommendations.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', marginBottom: 6,
                          borderLeft: '3px solid #803D81', background: 'rgba(128,61,129,0.05)',
                        }}>
                          <Lightbulb size={14} style={{ color: '#803D81', flexShrink: 0, marginTop: 1 }} />
                          <p style={{ fontSize: 13, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Re-run */}
                  <button
                    onClick={runAnalysis}
                    style={{
                      alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', borderRadius: 999,
                      background: 'rgba(10,10,10,0.06)', color: '#444444', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    <Sparkles size={12} />Re-analyse
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Suggest events tab */}
          {activeTab === 'suggest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                Click <strong>Add</strong> to pre-fill the event form with a suggested event.
              </p>

              {suggestionsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 0' }}>
                  <Loader2 size={20} style={{ color: '#E03553', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Generating suggestions…</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {s.event_name}
                      </p>
                      <p style={{ fontSize: 11, color: '#444444', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {s.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <CategoryPill category={s.category} />
                        <button
                          onClick={() => onAddSuggestion(s)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)',
                            background: 'transparent', color: '#0A0A0A', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          <Plus size={11} />Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)', padding: '14px 24px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn-editorial-secondary">Close</button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
