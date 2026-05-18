import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, ChevronLeft, Check, Copy } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveSeason(weddingDate) {
  if (!weddingDate) return null;
  const month = new Date(weddingDate).getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
}

function getCoupleNames(wd) {
  if (wd.coupleNames) return wd.coupleNames;
  const n1 = wd.couple1Name, n2 = wd.couple2Name;
  if (n1 && n2) return `${n1} & ${n2}`;
  if (n1) return n1;
  return 'the couple';
}

// ── Questionnaire config ──────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'gender',
    question: 'How do you identify?',
    options: ['Woman', 'Man', 'Non-binary / gender-fluid', 'Prefer not to say'],
  },
  {
    key: 'style',
    question: "What's your style vibe?",
    options: [
      'Classic & timeless',
      'Relaxed & effortless',
      'Bold & statement',
      'Romantic & feminine',
      'Sharp & tailored',
      'Bohemian & free',
    ],
  },
  {
    key: 'comfort',
    question: 'How comfortable do you want to be?',
    options: [
      "Fully comfortable — I'll be dancing all night",
      'Balanced — stylish but practical',
      'Fashion first — comfort is secondary',
      'I want to look incredible, full stop',
    ],
  },
  {
    key: 'budget',
    question: "What's your budget for this outfit?",
    options: ['Under $100', '$100 - $300', '$300 - $600', '$600+', 'I already have something in mind'],
  },
  {
    key: 'notes',
    question: 'Any other context?',
    type: 'text',
    placeholder: "e.g. I'm pregnant, I'll be doing a reading, I have a bad back, I want to wear traditional dress...",
  },
];

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    mainOutfit: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        colors: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, hex: { type: 'string' } },
            required: ['name', 'hex'],
          },
        },
        fabric: { type: 'string' },
        styleNotes: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'description', 'colors', 'fabric', 'styleNotes'],
    },
    alternatives: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, description: { type: 'string' } },
        required: ['title', 'description'],
      },
    },
    avoid: { type: 'array', items: { type: 'string' } },
    practicalTips: { type: 'array', items: { type: 'string' } },
    outfitMood: { type: 'string' },
  },
  required: ['mainOutfit', 'alternatives', 'avoid', 'practicalTips', 'outfitMood'],
};

// ── Main component ────────────────────────────────────────────────────────────

export default function WeddingStylePage({ weddingDetails, theme, typography }) {
  const [phase, setPhase] = useState('questionnaire'); // 'questionnaire' | 'loading' | 'results' | 'error'
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ gender: '', style: '', comfort: '', budget: '', notes: '' });
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);

  const coupleNames = getCoupleNames(weddingDetails);
  const season = deriveSeason(weddingDetails.weddingDate);
  const dressCode = weddingDetails.mainCeremony?.dressCode || weddingDetails.dressCode;
  const weddingStyle = Array.isArray(weddingDetails.weddingStyle) ? weddingDetails.weddingStyle[0] : null;

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const bfont = typography.bodyFont;
  const hfont = typography.headingFont;
  const hweight = typography.headingWeight;
  const hstyle = typography.headingStyle || 'normal';

  const selectOption = (value) => {
    const updated = { ...answers, [currentStep.key]: value };
    setAnswers(updated);
    if (!isLastStep) {
      setTimeout(() => setStep(s => s + 1), 160);
    }
  };

  const handleSubmit = async () => {
    setPhase('loading');
    const derivedSeason = season || 'not specified';
    const prompt = `You are a wedding outfit stylist. Generate outfit recommendations for a wedding guest.

WEDDING DETAILS:
- Couple: ${coupleNames}
- Date: ${weddingDetails.weddingDate || 'not specified'}
- Style: ${weddingStyle || 'elegant'}
- Dress code: ${dressCode || 'smart casual'}
- Venue: ${weddingDetails.mainCeremony?.venueName || weddingDetails.venueType || 'not specified'}
- Season: ${derivedSeason}

GUEST PREFERENCES:
- Gender identity: ${answers.gender}
- Style vibe: ${answers.style}
- Comfort preference: ${answers.comfort}
- Budget: ${answers.budget}
- Additional context: ${answers.notes || 'none'}

Return a JSON object with exactly this structure:
{
  "mainOutfit": {
    "title": "outfit name/description",
    "description": "2-3 sentence explanation of why this works for this specific wedding",
    "colors": [
      {"name": "colour name", "hex": "#hexcode"},
      {"name": "colour name", "hex": "#hexcode"},
      {"name": "colour name", "hex": "#hexcode"}
    ],
    "fabric": "fabric suggestion",
    "styleNotes": ["tip 1", "tip 2", "tip 3"]
  },
  "alternatives": [
    {"title": "alternative outfit title", "description": "one line description"},
    {"title": "alternative outfit title", "description": "one line description"}
  ],
  "avoid": ["thing to avoid 1", "thing to avoid 2", "thing to avoid 3"],
  "practicalTips": ["tip 1 specific to this venue/season", "tip 2", "tip 3"],
  "outfitMood": "one word mood or aesthetic"
}`;

    try {
      const raw = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: RESULT_SCHEMA,
      });
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setResults(parsed);
      setPhase('results');
    } catch {
      setPhase('error');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleRetake = () => {
    setPhase('questionnaire');
    setStep(0);
    setAnswers({ gender: '', style: '', comfort: '', budget: '', notes: '' });
    setResults(null);
  };

  // ── Loading ──

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: theme.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
        <style>{`@keyframes wsp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.35;transform:scale(0.92)}}`}</style>
        <Sparkles size={38} color={theme.accent} style={{ animation: 'wsp-pulse 1.5s ease-in-out infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: hfont, fontSize: 26, fontWeight: hweight, fontStyle: hstyle, color: theme.darkText, margin: '0 0 10px', lineHeight: 1.2 }}>
            Styling you for the big day...
          </p>
          <p style={{ fontFamily: bfont, fontSize: 14, color: `${theme.darkText}80`, margin: 0 }}>
            This takes about 10 seconds
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: theme.lightBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ fontFamily: bfont, fontSize: 15, color: `${theme.lightText}80`, textAlign: 'center', margin: 0 }}>
          Something went wrong generating your recommendations.
        </p>
        <button
          onClick={handleRetake}
          style={{ padding: '10px 22px', borderRadius: 999, background: theme.accent, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: bfont }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Results ──

  if (phase === 'results' && results) {
    const mo = results.mainOutfit || {};
    return (
      <div style={{ minHeight: '100vh', background: theme.lightBg, color: theme.lightText, fontFamily: bfont }}>

        {/* Header */}
        <div style={{ padding: '60px 24px 40px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
            <Sparkles size={14} color={theme.accent} />
            <span style={{ fontFamily: bfont, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: theme.accent }}>
              {results.outfitMood || 'Your style guide'}
            </span>
          </div>
          <h1 style={{ fontFamily: hfont, fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: hweight, fontStyle: hstyle, color: theme.lightText, margin: '0 0 12px', lineHeight: 1.1 }}>
            Your style guide
          </h1>
          <p style={{ fontFamily: bfont, fontSize: 14, color: `${theme.lightText}70`, margin: 0, lineHeight: 1.6 }}>
            Personalised for {coupleNames}'s wedding
          </p>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 80px' }}>

          {/* Main outfit card */}
          <div style={{ background: theme.darkBg, padding: 32, marginBottom: 20 }}>
            <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.darkText}50`, margin: '0 0 14px' }}>
              Main recommendation
            </p>
            <h2 style={{ fontFamily: hfont, fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: hweight, fontStyle: hstyle, color: theme.darkText, margin: '0 0 16px', lineHeight: 1.2 }}>
              {mo.title}
            </h2>
            <p style={{ fontFamily: bfont, fontSize: 15, color: `${theme.darkText}CC`, lineHeight: 1.75, margin: '0 0 28px' }}>
              {mo.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Colour palette */}
              <div>
                <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: `${theme.darkText}50`, margin: '0 0 12px' }}>
                  Colour palette
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(mo.colors || []).map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 20, height: 20, background: c.hex, flexShrink: 0, border: '1px solid rgba(255,255,255,0.12)' }} />
                      <span style={{ fontFamily: bfont, fontSize: 13, color: `${theme.darkText}CC` }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fabric */}
              <div>
                <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: `${theme.darkText}50`, margin: '0 0 12px' }}>
                  Fabric
                </p>
                <p style={{ fontFamily: bfont, fontSize: 13, color: `${theme.darkText}CC`, margin: 0, lineHeight: 1.6 }}>
                  {mo.fabric}
                </p>
              </div>

              {/* Style notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: `${theme.darkText}50`, margin: '0 0 12px' }}>
                  Style notes
                </p>
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(mo.styleNotes || []).map((note, i) => (
                    <li key={i} style={{ fontFamily: bfont, fontSize: 13, color: `${theme.darkText}CC`, lineHeight: 1.6 }}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          {results.alternatives?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.lightText}50`, margin: '0 0 12px' }}>
                Alternatives
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {results.alternatives.map((alt, i) => (
                  <div key={i} style={{ border: `1px solid ${theme.lightText}15`, padding: '18px 20px' }}>
                    <p style={{ fontFamily: bfont, fontSize: 14, fontWeight: 600, color: theme.lightText, margin: '0 0 6px' }}>
                      {alt.title}
                    </p>
                    <p style={{ fontFamily: bfont, fontSize: 13, color: `${theme.lightText}65`, margin: 0, lineHeight: 1.5 }}>
                      {alt.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What to avoid */}
          {results.avoid?.length > 0 && (
            <div style={{ marginBottom: 20, border: `1px solid ${theme.lightText}10`, padding: '20px 24px' }}>
              <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.lightText}50`, margin: '0 0 14px' }}>
                What to avoid
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.avoid.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontFamily: bfont, fontSize: 13, color: '#E03553', fontWeight: 700, flexShrink: 0, lineHeight: 1.5 }}>✗</span>
                    <span style={{ fontFamily: bfont, fontSize: 13, color: `${theme.lightText}75`, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Practical tips */}
          {results.practicalTips?.length > 0 && (
            <div style={{ marginBottom: 40, background: `${theme.lightText}05`, padding: '20px 24px' }}>
              <p style={{ fontFamily: bfont, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: `${theme.lightText}50`, margin: '0 0 14px' }}>
                Practical tips
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.practicalTips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: theme.accent, flexShrink: 0, marginTop: 7 }} />
                    <span style={{ fontFamily: bfont, fontSize: 13, color: `${theme.lightText}75`, lineHeight: 1.65 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 999, background: theme.accent, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: bfont }}
            >
              <Copy size={13} />
              {copied ? 'Copied!' : 'Share my look'}
            </button>
            <button
              onClick={handleRetake}
              style={{ padding: '10px 20px', borderRadius: 999, background: 'transparent', border: `1px solid ${theme.lightText}20`, color: `${theme.lightText}55`, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: bfont }}
            >
              Retake questionnaire
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Questionnaire ──

  const chips = [
    dressCode && `Dress code: ${dressCode}`,
    season,
    weddingStyle,
  ].filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: theme.lightBg, fontFamily: bfont }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 52 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5, borderRadius: 999,
                width: i === step ? 22 : 5,
                background: i < step ? theme.accent : i === step ? theme.accent : `${theme.lightText}20`,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Intro header (step 0 only) */}
        {step === 0 && (
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontFamily: hfont, fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', fontWeight: hweight, fontStyle: hstyle, color: theme.lightText, margin: '0 0 16px', lineHeight: 1.05 }}>
              What will you wear?
            </h1>
            <p style={{ fontFamily: bfont, fontSize: 15, color: `${theme.lightText}70`, margin: '0 0 28px', lineHeight: 1.65 }}>
              Tell us a little about yourself and we'll suggest the perfect outfit for {coupleNames}'s wedding.
            </p>
            {chips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                {chips.map(chip => (
                  <span key={chip} style={{ padding: '4px 14px', borderRadius: 999, border: `1px solid ${theme.lightText}20`, fontSize: 12, fontWeight: 600, fontFamily: bfont, color: `${theme.lightText}65` }}>
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: `${theme.lightText}45`, fontSize: 13, fontFamily: bfont, padding: '0 0 28px', fontWeight: 600 }}
          >
            <ChevronLeft size={14} /> Back
          </button>
        )}

        {/* Question heading */}
        <h2 style={{ fontFamily: hfont, fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: hweight, fontStyle: hstyle, color: theme.lightText, margin: '0 0 28px', lineHeight: 1.2 }}>
          {currentStep.question}
        </h2>

        {/* Text input step */}
        {currentStep.type === 'text' ? (
          <div>
            <textarea
              value={answers.notes}
              onChange={e => setAnswers(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={currentStep.placeholder}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', background: 'transparent',
                border: 'none', borderBottom: `2px solid ${theme.accent}`,
                padding: '10px 0', fontFamily: bfont, fontSize: 14, color: theme.lightText,
                outline: 'none', resize: 'none', lineHeight: 1.65,
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={handleSubmit}
                style={{ padding: '12px 26px', borderRadius: 999, background: theme.accent, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: bfont }}
              >
                Get my recommendations →
              </button>
              <button
                onClick={handleSubmit}
                style={{ padding: '12px 20px', borderRadius: 999, background: 'transparent', border: `1px solid ${theme.lightText}20`, color: `${theme.lightText}50`, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: bfont }}
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          /* Option tiles */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentStep.options.map(opt => {
              const selected = answers[currentStep.key] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => selectOption(opt)}
                  style={{
                    padding: '15px 20px', textAlign: 'left',
                    background: selected ? theme.darkBg : 'transparent',
                    border: `1px solid ${selected ? theme.accent : `${theme.lightText}18`}`,
                    cursor: 'pointer', fontFamily: bfont, fontSize: 14,
                    fontWeight: selected ? 600 : 400,
                    color: selected ? theme.darkText : theme.lightText,
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <span>{opt}</span>
                  {selected && <Check size={14} color={theme.accent} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
