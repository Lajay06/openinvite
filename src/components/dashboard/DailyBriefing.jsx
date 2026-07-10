import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { Users, Building2, DollarSign, Cloud } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const cacheKey = () => `oi_briefing_${new Date().toISOString().slice(0, 10)}`;

const BRIEFING_SCHEMA = {
  type: 'object',
  properties: {
    greeting: { type: 'string' },
    countdown: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subtext: { type: 'string' },
      },
      required: ['headline', 'subtext'],
    },
    thisWeek: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string' },
          task: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['priority', 'task', 'reason'],
      },
    },
    smartSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          insight: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['insight', 'action'],
      },
    },
    guestAlert: { type: 'string' },
    vendorNote: { type: 'string' },
    budgetNote: { type: 'string' },
    weatherNote: { type: 'string' },
    emotionalNote: { type: 'string' },
    forgottenDetail: { type: 'string' },
  },
  required: ['greeting', 'countdown', 'thisWeek', 'smartSuggestions', 'emotionalNote', 'forgottenDetail'],
};

const PRIORITY_DOT = {
  high: '#E03553',
  medium: 'rgba(10,10,10,0.3)',
  low: 'rgba(10,10,10,0.15)',
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function getFirstName(name) {
  if (!name || name === 'Not set') return 'there';
  return name.split(/[\s&]/)[0];
}

function AlertChip({ iconKey, text }) {
  const ICONS = { Users, Building2, DollarSign, Cloud };
  const Icon = ICONS[iconKey];
  return (
    <div style={{
      background: 'rgba(10,10,10,0.03)',
      border: '1px solid rgba(10,10,10,0.08)',
      padding: '8px 12px',
      display: 'flex', alignItems: 'flex-start', gap: 8,
      flex: '1 1 180px', minWidth: 0, maxWidth: 380,
    }}>
      {Icon && <Icon size={12} color="rgba(10,10,10,0.35)" style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.6)', lineHeight: 1.55 }}>{text}</span>
    </div>
  );
}

export default function DailyBriefing() {
  const [phase, setPhase] = useState('loading');
  const [briefing, setBriefing] = useState(null);
  const [daysUntil, setDaysUntil] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async (force = false) => {
    setPhase('loading');

    if (!force) {
      try {
        const hit = localStorage.getItem(cacheKey());
        if (hit) {
          const { briefing: b, daysUntil: d } = JSON.parse(hit);
          setBriefing(b);
          setDaysUntil(d);
          setPhase('ready');
          return;
        }
      } catch {}
    }

    let guests = [], budgetItems = [], vendors = [], scheduleItems = [], todos = [], weddingRows = [];
    try {
      [guests, budgetItems, vendors, scheduleItems, todos, weddingRows] = await Promise.all([
        getMyGuestsWithRsvp().catch(() => []),
        getMyRecords('Budget').catch(() => []),
        getMyRecords('Vendor').catch(() => []),
        getMyRecords('Schedule').catch(() => []),
        getMyRecords('Note').catch(() => []),
        getMyWeddingDetails().then(d => d ? [d] : []).catch(() => []),
      ]);
    } catch {}

    const wd = weddingRows[0] || {};
    const coupleName = wd.coupleNames
      || (wd.couple1Name && wd.couple2Name ? `${wd.couple1Name} & ${wd.couple2Name}` : null)
      || localStorage.getItem('oi_couple_name')
      || 'Not set';
    const weddingDate = wd.weddingDate || localStorage.getItem('oi_wedding_date');
    const city = wd.mainCeremony?.address || localStorage.getItem('oi_wedding_city') || null;

    let user = null;
    try { user = JSON.parse(localStorage.getItem('oi_user')); } catch {}
    let weather = null;
    try { weather = JSON.parse(localStorage.getItem('oi_weather')); } catch {}

    const firstName = getFirstName(user?.full_name || coupleName);
    const tod = getTimeOfDay();

    const days = weddingDate
      ? Math.ceil((new Date(weddingDate) - new Date()) / 86400000)
      : null;
    setDaysUntil(days);

    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending').length;
    const pendingGuests = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;
    const totalGuests = guests.length;
    const totalBudget = budgetItems.reduce((s, b) => s + (b.total_amount || b.budgeted_amount || 0), 0);
    const budgetSpent = budgetItems.reduce((s, b) => s + (b.spent_amount || b.actual_amount || 0), 0);
    const budgetPercent = totalBudget ? Math.round((budgetSpent / totalBudget) * 100) : 0;
    const bookedVendors = vendors.filter(v => v.status === 'booked').length;
    const totalVendors = vendors.length;
    const pendingTodos = todos.filter(t => !t.completed).length;
    const unseatedGuests = guests.filter(g =>
      !g.table_assignment && (g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending')
    ).length;

    const fallback = {
      greeting: `Good ${tod}, ${firstName}. Here's where things stand today.`,
      countdown: {
        headline: days !== null ? `${days} days to go` : 'Your day is coming',
        subtext: 'Every detail is coming together.',
      },
      thisWeek: [],
      smartSuggestions: [],
      guestAlert: pendingGuests > 0
        ? `${pendingGuests} guest${pendingGuests !== 1 ? 's' : ''} haven't replied yet`
        : null,
      vendorNote: null,
      budgetNote: budgetPercent > 80 ? `Budget is at ${budgetPercent}%` : null,
      weatherNote: null,
      emotionalNote: 'You are doing better than you think.',
      forgottenDetail: 'Confirm your rehearsal dinner headcount with the venue.',
    };

    try {
      const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

      const aiPrompt = `You are Ava, a premium wedding planning AI for the platform Openinvite. Generate a daily briefing for ${user?.full_name || 'the couple'} planning their wedding.

Today is ${today}.

WEDDING DATA:
- Couple: ${coupleName}
- Wedding date: ${weddingDate || 'Not set'}
- Days until wedding: ${days ?? 'unknown'}
- Location: ${city || 'Not set'}
- Weather today: ${weather?.data?.temp || 'unknown'}°C

GUEST STATUS:
- Total guests: ${totalGuests}
- Confirmed: ${confirmedGuests}
- Pending RSVP: ${pendingGuests}
- Unseated guests: ${unseatedGuests}

BUDGET:
- Total budget: $${totalBudget.toLocaleString()}
- Spent: $${budgetSpent.toLocaleString()} (${budgetPercent}%)

VENDORS:
- Booked: ${bookedVendors} of ${totalVendors}

TASKS:
- Pending to-dos: ${pendingTodos}

Generate a daily briefing with these exact sections. Be specific, warm, intelligent, and concise. Never be generic. Every insight must reference their actual data. Vary tone based on how close the wedding is — urgent but calm if under 30 days, encouraging and forward-looking if over 90 days.

Return JSON only, no other text:
{
  "greeting": "warm personalised greeting using their name and something specific about today or their wedding journey (2 sentences max)",
  "countdown": {
    "headline": "days display headline e.g. '142 days of anticipation'",
    "subtext": "one poetic/warm sentence about what this moment means"
  },
  "thisWeek": [
    {"priority": "high|medium|low", "task": "specific actionable task", "reason": "why now"}
  ],
  "smartSuggestions": [
    {"insight": "specific insight referencing their data", "action": "what to do"}
  ],
  "guestAlert": "specific guest-related insight or null if nothing notable",
  "vendorNote": "specific vendor insight or null",
  "budgetNote": "specific budget insight or null",
  "weatherNote": "weather or venue consideration or null",
  "emotionalNote": "soft, warm, concierge-style encouragement (1-2 sentences, tasteful not cheesy)",
  "forgottenDetail": "one thing couples often forget at this stage that is relevant to them"
}

Rules:
- thisWeek: maximum 3 items, ordered by priority
- smartSuggestions: maximum 2 items
- All text must feel premium — no clichés, no exclamation marks, no hollow phrases
- emotionalNote: warm but measured, like a trusted friend who happens to be an expert
- forgottenDetail: genuinely useful, specific to their situation`;

      const raw = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: BRIEFING_SCHEMA,
      });

      const rawText = typeof raw === 'string'
        ? raw
        : raw?.content?.[0]?.text
        || raw?.text
        || JSON.stringify(raw);

      const clean = rawText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(clean);
      setBriefing(parsed);
      localStorage.setItem(cacheKey(), JSON.stringify({ briefing: parsed, daysUntil: days }));
      setPhase('ready');
    } catch (err) {
      console.warn('[DailyBriefing] AI call failed, showing fallback:', err);
      setBriefing(fallback);
      setPhase('ready');
    }
  };

  const handleRefresh = () => {
    localStorage.removeItem(cacheKey());
    load(true);
  };

  const now = new Date();
  const weekday = now.toLocaleDateString('en-AU', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const dateLabel = `${weekday} · ${dayMonth}`;

  if (phase === 'loading') {
    return (
      <div style={{
        width: '100%', height: 120,
        background: '#FFFFFF',
        border: '1px solid rgba(10,10,10,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
          Ava is preparing your briefing...
        </span>
      </div>
    );
  }

  if (!briefing) return null;

  const alertChips = [
    briefing.guestAlert && { iconKey: 'Users', text: briefing.guestAlert },
    briefing.vendorNote && { iconKey: 'Building2', text: briefing.vendorNote },
    briefing.budgetNote && { iconKey: 'DollarSign', text: briefing.budgetNote },
    briefing.weatherNote && { iconKey: 'Cloud', text: briefing.weatherNote },
  ].filter(Boolean);

  return (
    <div style={{
      width: '100%', background: '#FFFFFF',
      border: '1px solid rgba(10,10,10,0.08)',
      padding: '32px 40px', boxSizing: 'border-box',
    }}>

      {/* Top row: greeting left, countdown right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, marginBottom: 24 }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.35)', margin: '0 0 12px' }}>
            {dateLabel}
          </p>
          <p style={{ fontFamily: PJS, fontSize: 17, fontWeight: 300, color: '#0A0A0A', letterSpacing: '-0.01em', lineHeight: 1.5, margin: 0 }}>
            {briefing.greeting}
          </p>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'right', maxWidth: 200, overflow: 'hidden' }}>
          {daysUntil !== null && (
            <div style={{ fontFamily: PJS, fontSize: 56, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {daysUntil > 0 ? daysUntil : '—'}
            </div>
          )}
          {daysUntil !== null && (
            <div style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', letterSpacing: '0.04em', margin: '4px 0 8px' }}>
              days
            </div>
          )}
          {briefing.countdown?.subtext && (
            <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.4)', fontStyle: 'italic', maxWidth: 200, margin: 0, lineHeight: 1.55, textAlign: 'right', wordBreak: 'break-word' }}>
              {briefing.countdown.subtext}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 24 }} />

      {/* This week */}
      {Array.isArray(briefing.thisWeek) && briefing.thisWeek.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.35)', margin: '0 0 12px' }}>
            This week
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {briefing.thisWeek.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(10,10,10,0.03)',
                  border: '1px solid rgba(10,10,10,0.08)',
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  flex: '1 1 190px', minWidth: 0, maxWidth: 360,
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: PRIORITY_DOT[item.priority] || PRIORITY_DOT.medium,
                  flexShrink: 0, marginTop: 5,
                }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: PJS, fontSize: 12, color: '#0A0A0A', fontWeight: 500, margin: '0 0 3px', lineHeight: 1.4 }}>
                    {item.task}
                  </p>
                  <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, lineHeight: 1.4 }}>
                    {item.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart suggestions */}
      {Array.isArray(briefing.smartSuggestions) && briefing.smartSuggestions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.35)', margin: '0 0 12px' }}>
            Ava's insight
          </p>
          {briefing.smartSuggestions.map((s, i) => (
            <div key={i} style={{ borderLeft: '2px solid #E03553', padding: '10px 14px', background: 'rgba(224,53,83,0.04)', marginBottom: 8 }}>
              <p style={{ fontFamily: PJS, fontSize: 13, color: '#0A0A0A', fontWeight: 400, margin: '0 0 3px', lineHeight: 1.5 }}>
                {s.insight}
              </p>
              <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, lineHeight: 1.4 }}>
                {s.action}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Alert chips */}
      {alertChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {alertChips.map((c, i) => (
            <AlertChip key={i} iconKey={c.iconKey} text={c.text} />
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', marginBottom: 20 }} />

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        {briefing.emotionalNote && (
          <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.45)', fontStyle: 'italic', maxWidth: 500, margin: 0, lineHeight: 1.65, flex: 1 }}>
            {briefing.emotionalNote}
          </p>
        )}

        {briefing.forgottenDetail && (
          <div style={{ flexShrink: 0, maxWidth: 280 }}>
            <p style={{ fontFamily: PJS, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.3)', margin: '0 0 4px' }}>
              Often forgotten
            </p>
            <div style={{ background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.06)', padding: '8px 14px' }}>
              <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.5)', margin: 0, lineHeight: 1.55 }}>
                {briefing.forgottenDetail}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Refresh */}
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <button
          onClick={handleRefresh}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 10, color: 'rgba(10,10,10,0.25)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.25)'; }}
        >
          Refresh briefing
        </button>
      </div>
    </div>
  );
}
