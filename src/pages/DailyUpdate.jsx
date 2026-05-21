import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Building2, DollarSign, Cloud } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

// v2 key busts any old cache that lacks the headline field
const cacheKey = () => `oi_briefing_v2_${new Date().toISOString().slice(0, 10)}`;

const BRIEFING_SCHEMA = {
  type: 'object',
  properties: {
    headline:    { type: 'string' },
    greeting:    { type: 'string' },
    countdown: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subtext:  { type: 'string' },
      },
      required: ['headline', 'subtext'],
    },
    thisWeek: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string' },
          task:     { type: 'string' },
          reason:   { type: 'string' },
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
          action:  { type: 'string' },
        },
        required: ['insight', 'action'],
      },
    },
    guestAlert:      { type: 'string' },
    vendorNote:      { type: 'string' },
    budgetNote:      { type: 'string' },
    weatherNote:     { type: 'string' },
    emotionalNote:   { type: 'string' },
    forgottenDetail: { type: 'string' },
  },
  required: ['headline', 'greeting', 'countdown', 'thisWeek', 'smartSuggestions', 'emotionalNote', 'forgottenDetail'],
};

const PRIORITY_CONFIG = {
  high:   { bg: '#E03553',            color: 'white',                   label: 'Urgent' },
  medium: { bg: '#F59E0B',            color: 'white',                   label: 'This week' },
  low:    { bg: 'rgba(10,10,10,0.08)', color: 'rgba(10,10,10,0.5)',     label: 'When ready' },
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
  const [coupleName, setCoupleName] = useState('');
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
          if (cached.coupleName) setCoupleName(cached.coupleName);
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
    const couple = wd.coupleNames
      || (wd.couple1Name && wd.couple2Name ? `${wd.couple1Name} & ${wd.couple2Name}` : null)
      || localStorage.getItem('oi_couple_name')
      || '';
    setCoupleName(couple);

    const weddingDate = wd.weddingDate || localStorage.getItem('oi_wedding_date');
    const city = wd.mainCeremony?.address || localStorage.getItem('oi_wedding_city') || null;

    let user = null;
    try { user = JSON.parse(localStorage.getItem('oi_user')); } catch {}
    let weather = null;
    try { weather = JSON.parse(localStorage.getItem('oi_weather')); } catch {}

    const firstName = getFirstName(user?.full_name || couple);
    const tod = getTimeOfDay();

    const days = weddingDate
      ? Math.ceil((new Date(weddingDate) - new Date()) / 86400000)
      : null;
    setDaysUntil(days);

    const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending').length;
    const pendingGuests   = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;
    const unseatedGuests  = guests.filter(g =>
      !g.table_assignment && (g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending')
    ).length;
    const totalBudget   = budgetItems.reduce((s, b) => s + (b.total_amount || b.budgeted_amount || 0), 0);
    const budgetSpent   = budgetItems.reduce((s, b) => s + (b.spent_amount || b.actual_amount || 0), 0);
    const budgetPercent = totalBudget ? Math.round((budgetSpent / totalBudget) * 100) : 0;
    const bookedVendors = vendors.filter(v => v.status === 'booked').length;
    const totalVendors  = vendors.length;
    const pendingTodos  = todos.filter(t => !t.completed).length;

    const snap = { confirmedGuests, pendingGuests, budgetPercent, bookedVendors, totalVendors };
    setSnapStats(snap);

    const fallback = {
      headline: days !== null ? `${days} days to go.` : 'Your wedding is coming.',
      greeting: `Good ${tod}, ${firstName}. Here's where things stand today.`,
      countdown: { headline: `${days ?? '—'} days`, subtext: 'Every detail is coming together.' },
      thisWeek: [],
      smartSuggestions: [],
      guestAlert:  pendingGuests > 0 ? `${pendingGuests} guest${pendingGuests !== 1 ? 's' : ''} haven't replied yet` : null,
      vendorNote:  null,
      budgetNote:  budgetPercent > 80 ? `Budget is at ${budgetPercent}%` : null,
      weatherNote: null,
      emotionalNote:   'You are doing better than you think.',
      forgottenDetail: 'Confirm your rehearsal dinner headcount with the venue.',
    };

    try {
      const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

      const aiPrompt = `You are Ava, a premium wedding planning AI. Generate a daily briefing for ${user?.full_name || 'the couple'}.

Today is ${today}.

DATA:
- Couple: ${couple || 'Not set'}
- Wedding date: ${weddingDate || 'Not set'} (${days ?? 'unknown'} days away)
- Location: ${city || 'Not set'}
- Total guests: ${guests.length}, confirmed: ${confirmedGuests}, pending: ${pendingGuests}, unseated: ${unseatedGuests}
- Budget: $${totalBudget.toLocaleString()} total, $${budgetSpent.toLocaleString()} spent (${budgetPercent}%)
- Vendors: ${bookedVendors} booked of ${totalVendors}
- Pending tasks: ${pendingTodos}

Return JSON only:
{
  "headline": "punchy newspaper headline, max 8 words, present tense, specific to their data e.g. 'Ten RSVPs outstanding. Time to act.' or 'Budget on track. Three vendors still needed.'",
  "greeting": "warm personalised 2-sentence summary of their wedding status",
  "countdown": { "headline": "days headline", "subtext": "one warm sentence" },
  "thisWeek": [{ "priority": "high|medium|low", "task": "actionable task", "reason": "why now" }],
  "smartSuggestions": [{ "insight": "specific insight referencing their data", "action": "what to do" }],
  "guestAlert": "guest insight or null",
  "vendorNote": "vendor insight or null",
  "budgetNote": "budget insight or null",
  "weatherNote": "weather consideration or null",
  "emotionalNote": "warm 1-2 sentence encouragement, tasteful not cheesy",
  "forgottenDetail": "one thing couples often forget at this stage"
}

Rules: thisWeek max 3 items. smartSuggestions max 2. No clichés, no exclamation marks. headline must be punchy and specific.`;

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
      localStorage.setItem(cacheKey(), JSON.stringify({ briefing: parsed, daysUntil: days, snapStats: snap, coupleName: couple }));
      setPhase('ready');
    } catch (err) {
      console.warn('[DailyUpdate] AI failed:', err);
      setBriefing(fallback);
      setPhase('ready');
    }
  };

  const handleRefresh = () => {
    localStorage.removeItem(cacheKey());
    load(true);
  };

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const alertItems = briefing ? [
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
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0A0A0A' }}>

      {/* ── SECTION 1: Masthead ── */}
      <div style={{
        background: '#FFFFFF',
        padding: '20px 40px',
        borderBottom: '1px solid #E8E8E5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <span style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#AAAAAA' }}>
          Openinvite daily
        </span>

        <div style={{ textAlign: 'center' }}>
          {coupleName && (
            <div style={{ fontFamily: PJS, fontSize: 13, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>
              {coupleName}
            </div>
          )}
          <div style={{ fontFamily: PJS, fontSize: 11, color: '#888888', letterSpacing: '0.06em', marginTop: coupleName ? 2 : 0 }}>
            {dateLabel}
          </div>
        </div>

        {daysUntil !== null ? (
          <div style={{
            background: '#E03553', color: 'white',
            borderRadius: 999, padding: '6px 16px',
            fontFamily: PJS, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}>
            {daysUntil > 0 ? `${daysUntil} days to go` : 'Today\'s the day'}
          </div>
        ) : (
          <div style={{ width: 120 }} />
        )}
      </div>

      {/* ── SECTION 2: Hero headline ── */}
      <div style={{
        background: '#FFFFFF',
        padding: '48px 40px 40px',
        borderBottom: '1px solid #E8E8E5',
      }}>
        {phase === 'loading' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 100 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E03553', animation: 'pulse 1.4s infinite' }} />
            <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.4)' }}>
              Ava is preparing your briefing...
            </span>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#E03553', margin: '0 0 16px' }}>
              Today's edition
            </p>
            <h1 style={{
              fontFamily: PJS, fontSize: 42, fontWeight: 800,
              color: '#0A0A0A', letterSpacing: '-0.03em',
              lineHeight: 1.15, maxWidth: 800, margin: 0,
            }}>
              {briefing?.headline}
            </h1>
            {briefing?.greeting && (
              <p style={{
                fontFamily: PJS, fontSize: 16, fontWeight: 400,
                color: '#444444', lineHeight: 1.6,
                maxWidth: 680, marginTop: 16, marginBottom: 0,
              }}>
                {briefing.greeting}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── SECTION 3: Editorial grid ── */}
      {phase === 'ready' && briefing && (
        <div style={{ background: 'white', padding: '0 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0 }}>

            {/* ── Column A: This week ── */}
            <div style={{ padding: '32px 32px 32px 0' }}>
              <div style={{ borderTop: '3px solid #0A0A0A', paddingTop: 16, marginBottom: 24 }}>
                <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A' }}>
                  This week
                </span>
              </div>

              {Array.isArray(briefing.thisWeek) && briefing.thisWeek.length > 0 ? (
                briefing.thisWeek.map((item, i) => {
                  const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
                  const isLast = i === briefing.thisWeek.length - 1;
                  return (
                    <div key={i} style={{
                      paddingBottom: 20, marginBottom: isLast ? 0 : 20,
                      borderBottom: isLast ? 'none' : '1px solid rgba(10,10,10,0.06)',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        background: cfg.bg, color: cfg.color,
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                        padding: '2px 7px', borderRadius: 999,
                        fontFamily: PJS,
                      }}>
                        {cfg.label}
                      </span>
                      <p style={{ fontFamily: PJS, fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '8px 0 0', lineHeight: 1.3 }}>
                        {item.task}
                      </p>
                      <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '6px 0 0', lineHeight: 1.5 }}>
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

            {/* Divider A/B */}
            <div style={{ background: 'rgba(10,10,10,0.06)' }} />

            {/* ── Column B: Ava's briefing ── */}
            <div style={{ padding: '32px' }}>
              <div style={{ borderTop: '3px solid #E03553', paddingTop: 16, marginBottom: 24 }}>
                <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#E03553' }}>
                  Ava's briefing
                </span>
              </div>

              {Array.isArray(briefing.smartSuggestions) && briefing.smartSuggestions.map((s, i) => {
                const isLast = i === briefing.smartSuggestions.length - 1 && alertItems.length === 0;
                return (
                  <div key={i} style={{
                    paddingBottom: 20, marginBottom: isLast ? 0 : 20,
                    borderBottom: isLast ? 'none' : '1px solid rgba(10,10,10,0.06)',
                  }}>
                    <span style={{ color: '#ec4899', fontSize: 12, display: 'block', marginBottom: 8, lineHeight: 1 }}>✦</span>
                    <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: 0, lineHeight: 1.4 }}>
                      {s.insight}
                    </p>
                    <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '6px 0 0', lineHeight: 1.5 }}>
                      {s.action}
                    </p>
                  </div>
                );
              })}

              {alertItems.map((chip, i) => {
                const Icon = chip.Icon;
                const isLast = i === alertItems.length - 1;
                return (
                  <div key={i} style={{
                    paddingBottom: 16, marginBottom: isLast ? 0 : 16,
                    borderBottom: isLast ? 'none' : '1px solid rgba(10,10,10,0.06)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <Icon size={13} color="rgba(10,10,10,0.3)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.55)', lineHeight: 1.5 }}>
                      {chip.text}
                    </span>
                  </div>
                );
              })}

              {briefing.smartSuggestions?.length === 0 && alertItems.length === 0 && (
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.35)', margin: 0 }}>
                  No alerts right now.
                </p>
              )}
            </div>

            {/* Divider B/C */}
            <div style={{ background: 'rgba(10,10,10,0.06)' }} />

            {/* ── Column C: Your numbers ── */}
            <div style={{ padding: '32px 0 32px 32px' }}>
              <div style={{ borderTop: '3px solid #0A0A0A', paddingTop: 16, marginBottom: 24 }}>
                <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A' }}>
                  Your numbers
                </span>
              </div>

              {snapCards.map((card, i) => {
                const isLast = i === snapCards.length - 1;
                return (
                  <div key={i} style={{
                    paddingBottom: 24, marginBottom: isLast ? 0 : 24,
                    borderBottom: isLast ? 'none' : '1px solid rgba(10,10,10,0.06)',
                  }}>
                    <div style={{ fontFamily: PJS, fontSize: 48, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {card.value}
                    </div>
                    <div style={{ fontFamily: PJS, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', marginTop: 4 }}>
                      {card.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
