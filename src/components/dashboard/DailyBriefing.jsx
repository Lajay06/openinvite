import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
  medium: 'rgba(255,255,255,0.4)',
  low: 'rgba(255,255,255,0.18)',
};

function AlertChip({ iconKey, text }) {
  const ICONS = { Users, Building2, DollarSign, Cloud };
  const Icon = ICONS[iconKey];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      padding: '8px 12px',
      display: 'flex', alignItems: 'flex-start', gap: 8,
      flex: '1 1 180px', minWidth: 0, maxWidth: 380,
    }}>
      {Icon && <Icon size={12} color="rgba(255,255,255,0.28)" style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(255,255,255,0.58)', lineHeight: 1.55 }}>{text}</span>
    </div>
  );
}

export default function DailyBriefing() {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready' | 'hidden'
  const [briefing, setBriefing] = useState(null);
  const [daysUntil, setDaysUntil] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async (force = false) => {
    setPhase('loading');

    // Cache check
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

    try {
      const [guests, budgetItems, vendors, , todos, weddingRows] = await Promise.all([
        base44.entities.Guest.list().catch(() => []),
        base44.entities.Budget.list().catch(() => []),
        base44.entities.Vendor.list().catch(() => []),
        base44.entities.Schedule.list().catch(() => []),
        base44.entities.Note.list().catch(() => []),
        base44.entities.WeddingDetails.list().catch(() => []),
      ]);

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

      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setBriefing(parsed);
      localStorage.setItem(cacheKey(), JSON.stringify({ briefing: parsed, daysUntil: days }));
      setPhase('ready');
    } catch {
      setPhase('hidden');
    }
  };

  const handleRefresh = () => {
    localStorage.removeItem(cacheKey());
    load(true);
  };

  // ── Date label ──────────────────────────────────────────────────────────────
  const now = new Date();
  const weekday = now.toLocaleDateString('en-AU', { weekday: 'long' }).toUpperCase();
  const dayMonth = now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const dateLabel = `${weekday} · ${dayMonth}`;

  // ── Loading shimmer ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <>
        <style>{`@keyframes oi-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{
          width: '100%', height: 120,
          background: 'linear-gradient(90deg,rgba(10,10,10,0.03) 0%,rgba(10,10,10,0.07) 50%,rgba(10,10,10,0.03) 100%)',
          backgroundSize: '200% 100%',
          animation: 'oi-shimmer 1.5s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>
            Ava is preparing your briefing...
          </span>
        </div>
      </>
    );
  }

  if (phase === 'hidden' || !briefing) return null;

  // ── Alert chips ─────────────────────────────────────────────────────────────
  const alertChips = [
    briefing.guestAlert && { iconKey: 'Users', text: briefing.guestAlert },
    briefing.vendorNote && { iconKey: 'Building2', text: briefing.vendorNote },
    briefing.budgetNote && { iconKey: 'DollarSign', text: briefing.budgetNote },
    briefing.weatherNote && { iconKey: 'Cloud', text: briefing.weatherNote },
  ].filter(Boolean);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', background: '#0A0A0A', padding: '32px 40px', boxSizing: 'border-box' }}>

      {/* Top row: greeting left, countdown right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, marginBottom: 24 }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
            {dateLabel}
          </p>
          <p style={{ fontFamily: PJS, fontSize: 18, fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.5, margin: 0 }}>
            {briefing.greeting}
          </p>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {daysUntil !== null && (
            <>
              <div style={{ fontFamily: PJS, fontSize: 56, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {daysUntil > 0 ? daysUntil : '—'}
              </div>
              <div style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', margin: '4px 0 8px' }}>
                DAYS
              </div>
            </>
          )}
          {briefing.countdown?.subtext && (
            <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(255,255,255,0.32)', fontStyle: 'italic', maxWidth: 200, margin: 0, lineHeight: 1.55, textAlign: 'right' }}>
              {briefing.countdown.subtext}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 24 }} />

      {/* This week */}
      {briefing.thisWeek?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
            This week
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {briefing.thisWeek.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
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
                  <p style={{ fontFamily: PJS, fontSize: 12, color: '#FFFFFF', fontWeight: 500, margin: '0 0 3px', lineHeight: 1.4 }}>
                    {item.task}
                  </p>
                  <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.4 }}>
                    {item.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart suggestions */}
      {briefing.smartSuggestions?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
            Ava's insight
          </p>
          {briefing.smartSuggestions.map((s, i) => (
            <div key={i} style={{ borderLeft: '2px solid #E03553', padding: '10px 14px', background: 'rgba(224,53,83,0.06)', marginBottom: 8 }}>
              <p style={{ fontFamily: PJS, fontSize: 13, color: '#FFFFFF', fontWeight: 400, margin: '0 0 3px', lineHeight: 1.5 }}>
                {s.insight}
              </p>
              <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
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
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', maxWidth: 500, margin: 0, lineHeight: 1.65, flex: 1 }}>
          {briefing.emotionalNote}
        </p>

        {briefing.forgottenDetail && (
          <div style={{ flexShrink: 0, maxWidth: 280 }}>
            <p style={{ fontFamily: PJS, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', margin: '0 0 4px' }}>
              Often forgotten
            </p>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 14px' }}>
              <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.55 }}>
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
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontSize: 10, color: 'rgba(255,255,255,0.2)', padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
        >
          Refresh briefing
        </button>
      </div>
    </div>
  );
}
