import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function AvaAutoFillModal({ onClose, onApply, weddingDetails }) {
  const [step, setStep] = useState('confirm'); // confirm | generating | preview | done
  const [preview, setPreview] = useState(null);

  const handleGenerate = async () => {
    setStep('generating');
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a wedding website content writer. Based on this wedding planning data, generate beautiful website content. Return ONLY valid JSON, no markdown, no code blocks.

Wedding data:
- Couple names: ${weddingDetails.coupleNames || 'Not set'}
- Date: ${weddingDetails.weddingDate || 'TBD'}
- Ceremony venue: ${weddingDetails.mainCeremony?.venueName || 'TBD'}
- Ceremony address: ${weddingDetails.mainCeremony?.address || ''}
- Ceremony time: ${weddingDetails.mainCeremony?.startTime || ''}
- Dress code: ${weddingDetails.mainCeremony?.dressCode || ''}
- Reception venue: ${weddingDetails.reception?.venueName || ''}
- Reception time: ${weddingDetails.reception?.startTime || ''}
- Couple story: ${weddingDetails.coupleStory || ''}
- Welcome message: ${weddingDetails.welcomeMessage || ''}

Generate JSON in this exact format:
{
  "heroTitle": "Name1 & Name2",
  "heroDate": "formatted date like '15 March 2026'",
  "heroLocation": "venue city",
  "welcomeQuote": "beautiful 1-2 sentence welcome message in first person",
  "storyText": "2-3 paragraph love story written warmly in first person",
  "milestone1": "How they met",
  "milestone2": "First date or memorable moment",
  "milestone3": "The proposal",
  "ceremonyVenue": "venue name",
  "ceremonyAddress": "full address",
  "ceremonyTime": "time",
  "dressCode": "dress code",
  "receptionVenue": "venue name",
  "receptionAddress": "address",
  "receptionTime": "time",
  "faq1Q": "What should I wear?",
  "faq1A": "dress code answer",
  "faq2Q": "When should I arrive?",
  "faq2A": "arrival time answer",
  "faq3Q": "Is there parking?",
  "faq3A": "parking answer",
  "closingMessage": "warm thank you message",
  "songRequestMessage": "fun message asking for song requests",
  "travelNotes": "brief travel note"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            heroTitle: { type: 'string' }, heroDate: { type: 'string' }, heroLocation: { type: 'string' },
            welcomeQuote: { type: 'string' }, storyText: { type: 'string' },
            milestone1: { type: 'string' }, milestone2: { type: 'string' }, milestone3: { type: 'string' },
            ceremonyVenue: { type: 'string' }, ceremonyAddress: { type: 'string' }, ceremonyTime: { type: 'string' }, dressCode: { type: 'string' },
            receptionVenue: { type: 'string' }, receptionAddress: { type: 'string' }, receptionTime: { type: 'string' },
            faq1Q: { type: 'string' }, faq1A: { type: 'string' },
            faq2Q: { type: 'string' }, faq2A: { type: 'string' },
            faq3Q: { type: 'string' }, faq3A: { type: 'string' },
            closingMessage: { type: 'string' }, songRequestMessage: { type: 'string' }, travelNotes: { type: 'string' },
          }
        }
      });
      setPreview(result);
      setStep('preview');
    } catch (err) {
      console.error('Ava error:', err);
      setStep('confirm');
    }
  };

  const handleApply = () => {
    if (!preview) return;
    const ts = Date.now();
    const newPageSections = {
      home: [
        { id: `sec_${ts}_1`, type: 'cinematic-hero', order: 0, content: { title: preview.heroTitle || '', date: preview.heroDate || '', location: preview.heroLocation || '', overlayStrength: 45, videoUrl: '', photoUrl: '' } },
        { id: `sec_${ts}_2`, type: 'love-letter', order: 1, content: { quote: preview.welcomeQuote || '', attribution: preview.heroTitle || '' } },
        { id: `sec_${ts}_3`, type: 'countdown-timer', order: 2, content: { message: 'Until we say I do' } },
      ],
      'our-story': [
        { id: `sec_${ts}_4`, type: 'our-story', order: 0, content: { text: preview.storyText || '', milestones: [{ date: '', text: preview.milestone1 || 'The day we met' }, { date: '', text: preview.milestone2 || 'Our first date' }, { date: '', text: preview.milestone3 || 'The proposal' }], photos: [] } },
      ],
      celebration: [
        { id: `sec_${ts}_5`, type: 'event-details', order: 0, content: { ceremony: { venue: preview.ceremonyVenue || '', address: preview.ceremonyAddress || '', time: preview.ceremonyTime || '', dressCode: preview.dressCode || '' }, reception: { venue: preview.receptionVenue || '', address: preview.receptionAddress || '', time: preview.receptionTime || '' } } },
      ],
      rsvp: [
        { id: `sec_${ts}_6`, type: 'full-rsvp', order: 0, content: { deadline: '', mealOptions: ['Beef', 'Chicken', 'Vegetarian', 'Vegan'], closingMessage: preview.closingMessage || 'We cannot wait to celebrate with you.' } },
      ],
      travel: [
        { id: `sec_${ts}_7`, type: 'travel-stay', order: 0, content: { gettingThere: preview.travelNotes || '', parking: '', hotels: [] } },
      ],
      music: [
        { id: `sec_${ts}_8`, type: 'song-request', order: 0, content: { message: preview.songRequestMessage || 'Request a song for the dance floor!' } },
      ],
      faq: [
        { id: `sec_${ts}_9`, type: 'faq-accordion', order: 0, content: { items: [{ question: preview.faq1Q || 'What should I wear?', answer: preview.faq1A || '' }, { question: preview.faq2Q || 'When should I arrive?', answer: preview.faq2A || '' }, { question: preview.faq3Q || 'Is there parking?', answer: preview.faq3A || '' }] } },
      ],
    };
    onApply(newPageSections);
    setStep('done');
    setTimeout(onClose, 1800);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`@keyframes ava-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(224,53,83,0.06), rgba(128,61,129,0.06))', borderBottom: '1px solid #EEEEEE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#E03553,#803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✦</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0A0A0A' }}>Auto-Fill with Ava</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>AI-powered website content generation</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {step === 'confirm' && (
            <>
              <p style={{ fontSize: 15, color: '#0A0A0A', lineHeight: 1.6, marginBottom: 20 }}>
                Ava will read your wedding planning details and automatically create beautiful content for your entire wedding website.
              </p>
              <div style={{ background: '#F8F8F8', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Ava will use</p>
                {[
                  { icon: '💑', label: 'Couple names', value: weddingDetails.coupleNames || 'Not set yet' },
                  { icon: '📅', label: 'Wedding date', value: weddingDetails.weddingDate || 'Not set yet' },
                  { icon: '📍', label: 'Ceremony venue', value: weddingDetails.mainCeremony?.venueName || 'Not set yet' },
                  { icon: '🏛', label: 'Reception venue', value: weddingDetails.reception?.venueName || 'Not set yet' },
                  { icon: '📖', label: 'Your story', value: weddingDetails.coupleStory ? 'Available ✓' : 'Not added yet' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#444', minWidth: 130 }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: item.value.includes('Not') ? '#AAAAAA' : '#0A0A0A' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(224,53,83,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(224,53,83,0.15)' }}>
                <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 }}>
                  ⚠️ This will replace your current website sections. Save any content you want to keep first.
                </p>
              </div>
            </>
          )}

          {step === 'generating' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#E03553,#803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, animation: 'ava-spin 2s linear infinite' }}>✦</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>Ava is writing your website...</p>
              <p style={{ fontSize: 14, color: '#888', textAlign: 'center', margin: 0 }}>Crafting your story, venue details, and content</p>
            </div>
          )}

          {step === 'preview' && preview && (
            <>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>Ava has created content for your website. Review it below, then click Apply.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Hero Title', value: preview.heroTitle },
                  { label: 'Hero Date', value: preview.heroDate },
                  { label: 'Welcome Quote', value: preview.welcomeQuote },
                  { label: 'Your Story', value: preview.storyText ? preview.storyText.substring(0, 140) + '…' : null },
                  { label: 'Ceremony', value: preview.ceremonyVenue && preview.ceremonyTime ? `${preview.ceremonyVenue} · ${preview.ceremonyTime}` : null },
                  { label: 'Reception', value: preview.receptionVenue && preview.receptionTime ? `${preview.receptionVenue} · ${preview.receptionTime}` : null },
                  { label: 'Closing Message', value: preview.closingMessage },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} style={{ border: '1px solid #EEE', borderRadius: 8, padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 14, color: '#0A0A0A', margin: 0, lineHeight: 1.5 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#22C55E,#16A34A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Website populated!</p>
              <p style={{ fontSize: 14, color: '#888', textAlign: 'center', margin: 0 }}>Your website is ready to preview and customise.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'confirm' || step === 'preview') && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #EEEEEE', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', border: '1px solid #DDD', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#444', fontFamily: 'inherit' }}>Cancel</button>
            {step === 'confirm' ? (
              <button onClick={handleGenerate} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#E03553,#803D81)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#FFF', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                ✦ Generate with Ava
              </button>
            ) : (
              <button onClick={handleApply} style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#E03553,#803D81)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#FFF', fontFamily: 'inherit' }}>
                ✓ Apply to Website
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}