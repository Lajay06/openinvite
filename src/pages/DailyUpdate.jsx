import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Building2, DollarSign, Cloud, Sparkles } from 'lucide-react';

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

const PRIORITY_CONFIG = {
  high:   { color: '#E03553',            label: 'Urgent' },
  medium: { color: '#F59E0B',            label: 'This week' },
  low:    { color: 'rgba(10,10,10,0.2)', label: 'When ready' },
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

export default function DailyUpdate() {
  const [phase, setPhase] = useState('loading');
  const [briefing, setBriefing] = useState(null);
  const [daysUntil, setDaysUntil] = useState(null);
  const [snapStats, setSnapStats] = useState({
    confirmedGuests: 0, pendingGuests: 0,
    budgetPercent: 0, bookedVendors: 0, totalVendors: 0,
  });

  useEffect(() => { load(); }, []);

  const load = async (force = false) => {
    setPhase('loading');

    if (!force) {
      try {
        const hit = localStorage.getItem(cacheKey());
        if (hit) {
          const cached = JSON.parse(hit);
          setBriefing(cached.briefing);
          setDaysUntil(cached.daysUntil);
          if (cached.snapStats) setSnapStats(cached.snapStats);
          setPhase('ready');
          return;
        }
      } catch {}
    }

    let guests = [], budgetItems = [], vendors = [], todos = [], weddingRows = [];
    try {
      [guests, budgetItems, vendors,, todos, weddingRows] = await Promise.all([
        base44.entities.Guest.list().catch(() => []),
        base44.entities.Budget.list().catch(() => []),
        base44.entities.Vendor.list().catch(() => []),
        base44.entities.Schedule.list().catch(() => []),
        base44.entities.Note.list().catch(() => []),
        base44.entities.WeddingDetails.list().catch(() => []),
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
    const unseatedGuests = guests.filter(g =>
      !g.table_assignment && (g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending')
    ).length;
    const totalBudget = budgetItems.reduce((s, b) => s + (b.total_amount || b.budgeted_amount || 0), 0);
    const budgetSpent = budgetItems.reduce((s, b) => s + (b.spent_amount || b.actual_amount || 0), 0);
    const budgetPercent = totalBudget ? Math.round((budgetSpent / totalBudget) * 100) : 0;
    const bookedVendors = vendors.filter(v => v.status === 'booked').length;
    const totalVendors = vendors.length;
    const pendingTodos = todos.filter(t => !t.completed).length;

    const snap = { confirmedGuests, pendingGuests, budgetPercent, bookedVendors, totalVendors };
    setSnapStats(snap);

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
- Total guests: ${guests.length}
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

Generate a daily briefing. Be specific, warm, intelligent, and concise. Every insight must reference their actual data. Vary tone based on how close the wedding is.

Return JSON only, no other text:
{
  "greeting": "warm personalised greeting (2 sentences max)",
  "countdown": { "headline": "days headline", "subtext": "one warm sentence" },
  "thisWeek": [{"priority": "high|medium|low", "task": "actionable task", "reason": "why now"}],
  "smartSuggestions": [{"insight": "specific insight", "action": "what to do"}],
  "guestAlert": "guest insight or null",
  "vendorNote": "vendor insight or null",
  "budgetNote": "budget insight or null",
  "weatherNote": "weather consideration or null",
  "emotionalNote": "warm encouragement (1-2 sentences)",
  "forgottenDetail": "one thing couples often forget at this stage"
}

Rules: thisWeek max 3 items. smartSuggestions max 2. No clichés, no exclamation marks.`;

      const raw = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: BRIEFING_SCHEMA,
      });

      const rawText = typeof raw === 'string'
        ? raw
        : raw?.content?.[0]?.text || raw?.text || JSON.stringify(raw);
      const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      setBriefing(parsed);
      localStorage.setItem(cacheKey(), JSON.stringify({ briefing: parsed, daysUntil: days, snapStats: snap }));
      setPhase('ready');
    } catch (err) {
      console.warn('[DailyUpdate] AI failed, using fallback:', err);
      setBriefing(fallback);
      setPhase('ready');
    }
  };

  const handleRefresh = () => {
    localStorage.removeItem(cacheKey());
    load(true);
  };

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('en-AU', { weekday: 'long' })} · ${now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const alertChips = briefing ? [
    briefing.guestAlert  && { Icon: Users,      text: briefing.guestAlert },
    briefing.vendorNote  && { Icon: Building2,  text: briefing.vendorNote },
    briefing.budgetNote  && { Icon: DollarSign, text: briefing.budgetNote },
    briefing.weatherNote && { Icon: Cloud,      text: briefing.weatherNote },
  ].filter(Boolean) : [];

  const snapCards = [
    { label: 'Guests confirmed', value: String(snapStats.confirmedGuests) },
    { label: 'RSVP pending',     value: String(snapStats.pendingGuests) },
    { label: 'Budget used',      value: `${snapStats.budgetPercent}%` },
    { label: 'Vendors booked',   value: `${snapStats.bookedVendors}/${snapStats.totalVendors}` },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      {/* ── Hero ── */}
      <div style={{ background: '#0A0A0A', padding: '40px 40px 32px' }}>
        {phase === 'loading' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 140 }}>
            <Sparkles size={16} color="rgba(255,255,255,0.4)" className="animate-pulse" />
            <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              Ava is preparing your daily briefing...
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 40 }}>

            {/* Left — date pill + greeting */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 999,
                padding: '4px 12px',
                fontFamily: PJS, fontSize: 11, fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.06em',
                marginBottom: 24,
              }}>
                {dateLabel}
              </div>
              <p style={{
                fontFamily: PJS, fontSize: 32, fontWeight: 700,
                color: 'white', letterSpacing: '-0.02em',
                lineHeight: 1.2, margin: 0, maxWidth: 600,
              }}>
                {briefing?.greeting}
              </p>
            </div>

            {/* Right — countdown */}
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              {daysUntil !== null ? (
                <>
                  <div style={{
                    fontFamily: PJS, fontSize: 80, fontWeight: 800,
                    color: 'white', letterSpacing: '-0.05em', lineHeight: 1,
                  }}>
                    {daysUntil > 0 ? daysUntil : '—'}
                  </div>
                  <div style={{
                    fontFamily: PJS, fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                  }}>
                    Days to go
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: PJS, fontSize: 14, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                  No wedding date set
                </div>
              )}
              {briefing?.countdown?.subtext && (
                <p style={{
                  fontFamily: PJS, fontSize: 12, color: 'rgba(255,255,255,0.3)',
                  fontStyle: 'italic', marginTop: 8, lineHeight: 1.55,
                  maxWidth: 200, textAlign: 'right',
                }}>
                  {briefing.countdown.subtext}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {phase === 'ready' && briefing && (
        <div style={{ padding: '0 40px 40px' }}>

          {/* 3-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>

            {/* Col 1 — This week */}
            <div>
              <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', margin: '32px 0 16px' }}>
                This week
              </p>
              {Array.isArray(briefing.thisWeek) && briefing.thisWeek.length > 0 ? (
                briefing.thisWeek.map((item, i) => {
                  const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={i} style={{ background: 'white', border: '1px solid rgba(10,10,10,0.08)', padding: 16, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)' }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p style={{ fontFamily: PJS, fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '6px 0 0', lineHeight: 1.4 }}>
                        {item.task}
                      </p>
                      <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '4px 0 0', lineHeight: 1.5 }}>
                        {item.reason}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.35)', margin: 0 }}>
                  Nothing urgent this week.
                </p>
              )}
            </div>

            {/* Col 2 — Ava's insights + alert chips */}
            <div>
              <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', margin: '32px 0 16px' }}>
                Ava's insights
              </p>
              {Array.isArray(briefing.smartSuggestions) && briefing.smartSuggestions.map((s, i) => (
                <div key={i} style={{
                  background: 'rgba(236,72,153,0.04)',
                  border: '1px solid rgba(236,72,153,0.1)',
                  borderLeft: '3px solid #ec4899',
                  padding: 16, marginBottom: 8,
                }}>
                  <span style={{ color: '#ec4899', fontSize: 12, display: 'block', marginBottom: 6, lineHeight: 1 }}>✦</span>
                  <p style={{ fontFamily: PJS, fontSize: 13, color: '#0A0A0A', fontWeight: 500, margin: '0 0 4px', lineHeight: 1.5 }}>
                    {s.insight}
                  </p>
                  <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0, lineHeight: 1.5 }}>
                    {s.action}
                  </p>
                </div>
              ))}
              {alertChips.map((chip, i) => {
                const Icon = chip.Icon;
                return (
                  <div key={i} style={{
                    background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.06)',
                    padding: '12px 14px', marginBottom: 6,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <Icon size={14} color="rgba(10,10,10,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)', lineHeight: 1.5 }}>
                      {chip.text}
                    </span>
                  </div>
                );
              })}
              {briefing.smartSuggestions?.length === 0 && alertChips.length === 0 && (
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.35)', margin: 0 }}>
                  No alerts right now.
                </p>
              )}
            </div>

            {/* Col 3 — Today's snapshot */}
            <div>
              <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', margin: '32px 0 16px' }}>
                Today's snapshot
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {snapCards.map((card, i) => (
                  <div key={i} style={{
                    background: 'rgba(10,10,10,0.02)',
                    border: '1px solid rgba(10,10,10,0.06)',
                    padding: 16,
                  }}>
                    <p style={{ fontFamily: PJS, fontSize: 10, color: 'rgba(10,10,10,0.35)', fontWeight: 600, letterSpacing: '0.06em', margin: '0 0 8px', lineHeight: 1.4 }}>
                      {card.label}
                    </p>
                    <p style={{ fontFamily: PJS, fontSize: 28, fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1 }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bottom ── */}
          <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', margin: '24px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {briefing.emotionalNote && (
              <div style={{ background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.06)', padding: '20px 24px' }}>
                <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.3)', margin: '0 0 8px' }}>
                  A note from Ava
                </p>
                <p style={{ fontFamily: PJS, fontSize: 14, color: 'rgba(10,10,10,0.6)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                  {briefing.emotionalNote}
                </p>
              </div>
            )}

            {briefing.forgottenDetail && (
              <div style={{ background: '#0A0A0A', padding: '20px 24px' }}>
                <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
                  Often forgotten
                </p>
                <p style={{ fontFamily: PJS, fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                  {briefing.forgottenDetail}
                </p>
              </div>
            )}
          </div>

          {/* Refresh */}
          <div style={{ textAlign: 'right', marginTop: 20 }}>
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
      )}
    </div>
  );
}
