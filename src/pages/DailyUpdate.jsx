import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { loadDashboardSources, formatSourceList } from '@/lib/dashboardSources';
import NextUp from '@/components/dashboard/NextUp';
import { getJourneyProgress } from '@/lib/setupJourney';
import { getTrialStatus } from '@/lib/trialStatus';
import { tallyAttendees, isAttending } from '@/lib/guestRsvpTally';
import { resolveAttendees } from '@/lib/attendees';
import { Users, Building2, DollarSign, Cloud } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import TipsModal from '@/components/dashboard/TipsModal';

import { coupleDisplayName } from '@/lib/coupleNames';
const PJS = "'Plus Jakarta Sans', sans-serif";

// v2 key busts any old cache that lacks the headline field. Scoped by user
// id (not just date) — the unscoped key let one account's cached briefing
// (guest counts, budget, couple names) leak onto another account's
// dashboard on a shared browser, since any two logged-in users on the same
// device would collide on the exact same key for the same day. See
// purgeUnscopedBriefingCache below for cleaning up already-written
// unscoped entries from before this fix.
const cacheKey = (userId) => `oi_briefing_v2_${userId}_${new Date().toISOString().slice(0, 10)}`;

// One-time cleanup of the pre-fix unscoped cache entries (oi_briefing_v2_
// followed directly by a date, no user id segment) so leaked cross-account
// data doesn't linger in localStorage indefinitely on shared browsers.
function purgeUnscopedBriefingCache() {
  const unscopedPattern = /^oi_briefing_v2_\d{4}-\d{2}-\d{2}$/;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && unscopedPattern.test(key)) localStorage.removeItem(key);
  }
}

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
  low:    { bg: 'rgba(10,10,10,0.08)', color: 'rgba(10,10,10,0.6)',     label: 'When ready' },
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

// Deterministic backstop for spelled-out numbers in the AI-generated
// briefing (round 7 ask #7) — the prompt asks for numerals, but a prompt
// instruction alone isn't a hard guarantee, so this normalizes anything
// that slips through. "one" is deliberately excluded from the standalone
// pass (only converted inside safe compounds like "sixty-one"/"one
// hundred") since \bone\b also matches inside "no one"/"someone" —
// converting those would read as a typo, not a fix.
const NUMBER_ONES = { zero: 0, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const NUMBER_ONES_WITH_ONE = { ...NUMBER_ONES, one: 1 };
const NUMBER_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

function numeralizeText(str) {
  if (typeof str !== 'string' || !str) return str;
  let out = str;
  const tensAlt = Object.keys(NUMBER_TENS).join('|');
  const onesWithOneAlt = Object.keys(NUMBER_ONES_WITH_ONE).join('|');
  const onesAlt = Object.keys(NUMBER_ONES).join('|');

  // "sixty-eight" / "sixty eight" -> 68 (the case from the user's own example)
  out = out.replace(new RegExp(`\\b(${tensAlt})[\\s-](${onesWithOneAlt})\\b`, 'gi'),
    (_m, t, o) => String(NUMBER_TENS[t.toLowerCase()] + NUMBER_ONES_WITH_ONE[o.toLowerCase()]));

  // "one hundred" / "three hundred" -> 100 / 300
  out = out.replace(new RegExp(`\\b(${onesWithOneAlt})\\s+hundred\\b`, 'gi'),
    (_m, o) => String(NUMBER_ONES_WITH_ONE[o.toLowerCase()] * 100));
  out = out.replace(/\bhundred\b/gi, '100');

  // Remaining standalone tens (twenty, thirty, …)
  out = out.replace(new RegExp(`\\b(${tensAlt})\\b`, 'gi'), (_m, t) => String(NUMBER_TENS[t.toLowerCase()]));

  // Remaining standalone ten..nineteen and two..nine — "one" excluded, see above
  out = out.replace(new RegExp(`\\b(${onesAlt})\\b`, 'gi'), (_m, o) => String(NUMBER_ONES[o.toLowerCase()]));

  return out;
}

function numeralizeBriefing(value) {
  if (typeof value === 'string') return numeralizeText(value);
  if (Array.isArray(value)) return value.map(numeralizeBriefing);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = numeralizeBriefing(value[k]);
    return out;
  }
  return value;
}

// Layout.jsx mounts this page's whole tree TWICE at once — one copy for
// desktop, one for mobile, switched purely by CSS. Without this guard, both
// copies would independently see "onboarding just completed, tips not shown
// yet" on the same load and each open their own TipsModal — the exact
// double-dialog bug fixed for Dashboard.jsx's old auto-trigger (see
// project memory / AUDIT history). Module-scope state is shared between
// both instances since they come from the same JS module, so only the
// first one to check ever claims the modal.
let tipsModalClaimedThisPageLoad = false;

export default function DailyUpdate() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  // Which of the six data sources failed to load, by name. The page used to
  // swallow every failure with .catch(() => []), so a total backend outage and
  // a brand-new account rendered byte-identical UI — a calm, complete "nothing
  // here yet" on the page couples land on first. Empty is a claim about the
  // couple's wedding; it must only be made when the data actually arrived.
  const [failedSources, setFailedSources] = useState([]);
  // Journey for the orientation layer. null means "we could not read the
  // wedding record", which renders NO block — never a nag built on nothing.
  const [journey, setJourney] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [daysUntil, setDaysUntil] = useState(null);
  const [coupleName, setCoupleName] = useState('');
  const [snapStats, setSnapStats] = useState({
    confirmedGuests: 0, pendingGuests: 0,
    budgetPercent: 0, bookedVendors: 0, totalVendors: 0,
  });
  const [showTipsModal, setShowTipsModal] = useState(false);

  useEffect(() => { load(); }, []);

  // Account-scoped, not localStorage — fires once per account on the
  // first arrival at /DailyUpdate after onboarding completes, then never
  // again (even on a different browser/device), by persisting the flag on
  // the User record via base44.auth.updateMe rather than this browser's
  // localStorage.
  useEffect(() => {
    if (tipsModalClaimedThisPageLoad) return;
    let cancelled = false;
    (async () => {
      try {
        const user = await base44.auth.me();
        if (cancelled) return;
        if (user?.onboardingCompleted && !user?.tipsModalShown && !tipsModalClaimedThisPageLoad) {
          tipsModalClaimedThisPageLoad = true;
          setShowTipsModal(true);
        }
      } catch { /* best-effort — never block the page on this */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const load = async (force = false) => {
    setPhase('loading');
    purgeUnscopedBriefingCache();

    // Resolved once, up front, so the cache read below and the cache write
    // at the end of this function always agree on the same key.
    let cacheUserId = null;
    // eslint-disable-next-line no-empty -- best-effort cache-key resolution; falls through to no-cache path below
    try { cacheUserId = JSON.parse(localStorage.getItem('oi_user') || '{}')?.id || null; } catch {}
    const key = cacheUserId ? cacheKey(cacheUserId) : null;

    if (!force && key) {
      try {
        const hit = localStorage.getItem(key);
        if (hit) {
          const cached = JSON.parse(hit);
          // round 8 ask #7 (repeat): the safety net only ran at generation
          // time, so a briefing cached before this pass existed — or from
          // any other gap in it — kept showing spelled-out numbers on every
          // subsequent load that hit the cache, since this branch returned
          // early with the raw cached value. Run it here too so the net
          // actually covers every path the briefing can reach the screen by,
          // not just the freshly-generated one.
          setBriefing(numeralizeBriefing(cached.briefing));
          setDaysUntil(cached.daysUntil);
          if (cached.snapStats) setSnapStats(cached.snapStats);
          if (cached.coupleName) setCoupleName(cached.coupleName);
          setPhase('ready');
          return;
        }
        // eslint-disable-next-line no-empty -- best-effort cache read; falls through to a fresh fetch below
      } catch {}
    }

    // strict: true is what makes this work at all. resolveMyWedding's loaders
    // default to returning []/null on failure — that soft default is the
    // contract every other page relies on, and it is exactly why the first
    // version of this fix silently did nothing: the promises it was catching
    // never rejected. Only this page opts into rejections.
    const { data, failed, status } = await loadDashboardSources({
      guests:            () => getMyGuestsWithRsvp(undefined, undefined, { strict: true }),
      budget:            () => getMyRecords('Budget', undefined, undefined, { strict: true }),
      vendors:           () => getMyRecords('Vendor', undefined, undefined, { strict: true }),
      schedule:          () => getMyRecords('Schedule', undefined, undefined, { strict: true }),
      tasks:             () => getMyRecords('Note', undefined, undefined, { strict: true }),
      'wedding details': () => getMyWeddingDetails({ strict: true }).then(d => (d ? [d] : [])),
    });
    setFailedSources(failed);

    // Every source down is an outage, not an empty account. Refuse to render a
    // briefing at all rather than narrate a wedding we could not read.
    if (status === 'error') {
      setPhase('error');
      return;
    }

    const guests = data.guests || [];
    const budgetItems = data.budget || [];
    const vendors = data.vendors || [];
    const todos = data.tasks || [];
    const weddingRows = data['wedding details'] || [];

    // Orientation layer. Computed ONLY when the wedding record actually
    // arrived: journey completeness derives entirely from it, so without it
    // every step reads incomplete and the couple would be nagged about work
    // they have already done. `data['wedding details']` comes from
    // getMyWeddingDetails() — the server-DECRYPTING reader — which is what
    // makes the budget step evaluate against {total} rather than ciphertext.
    if (failed.includes('wedding details') || !weddingRows[0]) {
      setJourney(null);
    } else {
      // Read the whole stored user, not just the plan string: Ultra access
      // depends on whether the trial is still ACTIVE, not on plan === 'free'.
      let storedUser = {};
      try { storedUser = JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { /* defaults below */ }
      const plan = storedUser?.plan || 'free';
      const { trialActive } = getTrialStatus(storedUser);
      setJourney(getJourneyProgress(weddingRows[0], {
        guestCount: guests.length,
        vendorCount: vendors.length,
        scheduleCount: (data.schedule || []).length,
      }, { plan, trialActive }));
    }

    const wd = weddingRows[0] || {};
    const couple = coupleDisplayName(wd)
      || localStorage.getItem('oi_couple_name')
      || '';
    setCoupleName(couple);

    const weddingDate = wd.weddingDate || localStorage.getItem('oi_wedding_date');
    const city = wd.mainCeremony?.address || localStorage.getItem('oi_wedding_city') || null;

    let user = null;
    // eslint-disable-next-line no-empty -- best-effort cache read; degrades to the fallback briefing already reviewed as acceptable
    try { user = JSON.parse(localStorage.getItem('oi_user')); } catch {}
    let weather = null;
    // eslint-disable-next-line no-empty -- best-effort cache read; per this file's own weather.js contract, absent weather just renders nothing
    try { weather = JSON.parse(localStorage.getItem('oi_weather')); } catch {}

    const firstName = getFirstName(user?.full_name || couple);
    const tod = getTimeOfDay();

    const days = weddingDate
      ? Math.ceil((new Date(weddingDate) - new Date()) / 86400000)
      : null;
    setDaysUntil(days);

    // AUDIT_2026-07.md S21: 'confirmed' is not a valid rsvp_status value —
    // that half of the check could never match, harmless only because it
    // was OR'd with the correct 'attending' check.
    // Counts ATTENDEES: a plus-one is a head at the table and a reply the
    // couple is waiting on. These fed the daily brief while omitting all 40.
    const { combined } = tallyAttendees(resolveAttendees(guests));
    const { attending: confirmedGuests, pending: pendingGuests } = combined;
    // DELIBERATELY still counts GUESTS, not attendees, and must stay that way
    // until the seating work (step 3 of the plus-one plan).
    //
    // A plus-one cannot hold a table assignment at all today —
    // Table.assigned_guests[].guest_id requires a real Guest id, and a plus-one
    // has none. So an attendee-based count here would report every attending
    // plus-one as unseated, permanently, and no amount of seating work by the
    // couple could ever clear it. That is a number that is knowably WRONG,
    // which is worse than one that is knowably INCOMPLETE.
    const unseatedGuests  = guests.filter(g => !g.table_assignment && isAttending(g)).length;
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

Hard rule, applies to every field below: write every number and percentage as a numeral (10, 68%, 3), never spelled out as a word (never "ten", "sixty-eight percent", "three").

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
  "headline": "punchy newspaper headline, max 8 words, present tense, specific to their data e.g. '10 RSVPs outstanding. Time to act.' or 'Budget on track. 3 vendors still needed.'",
  "greeting": "warm personalized 2-sentence summary of their wedding status",
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

Rules: thisWeek max 3 items. smartSuggestions max 2. No clichés, no exclamation marks. headline must be punchy and specific. Always write numbers as numerals (10, 68%, 3), never spelled out (not "ten", "sixty-eight percent", "three") — in every field, including headline and greeting.`;

      const raw = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: BRIEFING_SCHEMA,
      });

      const rawText = typeof raw === 'string'
        ? raw
        : raw?.content?.[0]?.text || raw?.text || JSON.stringify(raw);
      const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = numeralizeBriefing(JSON.parse(clean));
      setBriefing(parsed);
      if (key) localStorage.setItem(key, JSON.stringify({ briefing: parsed, daysUntil: days, snapStats: snap, coupleName: couple }));
      setPhase('ready');
    } catch (err) {
      console.warn('[DailyUpdate] AI failed:', err);
      setBriefing(numeralizeBriefing(fallback));
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

      <DashboardPageHeader title="Daily update" subtitle="Your wedding planning briefing" />

      {/* ── SECTION 1: Masthead ── */}
      <div style={{
        background: '#FFFFFF',
        padding: '20px 40px',
        borderBottom: '1px solid #E8E8E5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <span style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(10,10,10,0.6)' }}>
          Openinvite daily
        </span>

        <div style={{ textAlign: 'center' }}>
          {coupleName && (
            <div style={{ fontFamily: PJS, fontSize: 13, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>
              {coupleName}
            </div>
          )}
          <div style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.6)', letterSpacing: '0.06em', marginTop: coupleName ? 2 : 0 }}>
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
            <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
              Ava is preparing your briefing...
            </span>
          </div>
        ) : phase === 'error' ? (
          /* Every source failed. Say so plainly and offer a retry, rather than
             rendering an empty briefing that reads as "you have nothing". */
          <div style={{ minHeight: 100 }}>
            <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#E03553', margin: '0 0 16px' }}>
              Today's edition
            </p>
            <h1 style={{
              fontFamily: PJS, fontSize: 42, fontWeight: 800,
              color: '#0A0A0A', letterSpacing: '-0.03em',
              lineHeight: 1.15, maxWidth: 800, margin: 0,
            }}>
              We could not load your wedding
            </h1>
            <p style={{
              fontFamily: PJS, fontSize: 16, color: 'rgba(10,10,10,0.6)',
              lineHeight: 1.6, maxWidth: 680, marginTop: 16, marginBottom: 0,
            }}>
              This is a problem on our side, not a change to your plans — nothing has been lost.
            </p>
            <button
              onClick={handleRefresh}
              style={{
                marginTop: 24, border: '1px solid #0A0A0A', background: '#0A0A0A',
                color: '#FFFFFF', borderRadius: 999, padding: '10px 20px',
                fontFamily: PJS, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
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

      {/* Orientation layer, variant A — the lead block, between the headline
          and the editorial grid. Rendered only in the 'ready' phase and only
          when a journey exists: on error, or when the wedding record failed
          to load, there is no block at all rather than advice computed from
          nothing. */}
      {phase === 'ready' && journey && (
        <NextUp
          journey={journey}
          daysUntil={daysUntil}
          onGo={(step) => navigate(step.route)}
        />
      )}

      {/* Some sources loaded and some did not. The briefing below is built from
          partial data, so the numbers in it are not a complete picture — say
          that rather than letting them read as fact. */}
      {phase === 'ready' && failedSources.length > 0 && (
        <div style={{
          background: '#FFFFFF', padding: '16px 40px',
          borderBottom: '1px solid #E8E8E5',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
            Your {formatSourceList(failedSources)} could not be loaded, so today's numbers are incomplete.
          </span>
          <button
            onClick={handleRefresh}
            style={{
              border: '1px solid rgba(10,10,10,0.45)', background: 'transparent',
              color: '#0A0A0A', borderRadius: 999, padding: '6px 14px',
              fontFamily: PJS, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

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
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
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
                    <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', lineHeight: 1.5 }}>
                      {chip.text}
                    </span>
                  </div>
                );
              })}

              {briefing.smartSuggestions?.length === 0 && alertItems.length === 0 && (
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
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
                    <div style={{ fontFamily: PJS, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', marginTop: 4 }}>
                      {card.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showTipsModal && (
        <TipsModal onClose={() => {
          setShowTipsModal(false);
          base44.auth.updateMe({ tipsModalShown: true }).catch(() => {});
        }} />
      )}

    </div>
  );
}
