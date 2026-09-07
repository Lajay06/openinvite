import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { loadDashboardSources, formatSourceList } from '@/lib/dashboardSources';
import { daysUntilWedding, countdownLabel, countdownSentence } from '@/lib/weddingCountdown';
import { isAttending } from '@/lib/guestRsvpTally';
import { getJourneyProgress } from '@/lib/setupJourney';
import { getTrialStatus } from '@/lib/trialStatus';
import { coupleDisplayName } from '@/lib/coupleNames';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import Briefing from '@/components/dashboard/Briefing';
import { todosFrom, resolveDayState } from '@/lib/dayState';
import NextUp from '@/components/dashboard/NextUp';
import AvaButton from '@/components/shared/AvaButton';
import { openAva } from '@/lib/avaOpen';
import { useNavigate, Link } from 'react-router-dom';

const PJS = "'Plus Jakarta Sans', sans-serif";

/** What the link under each line in "This week" says. */
const LINK_LABEL = {
  '/TodoList': 'Open to do',
  '/Guests': 'Open guest list',
  '/Schedule': 'Open schedule',
  '/Budget': 'Open budget',
  '/Vendors': 'Open vendors',
};

/**
 * DAILY UPDATE — AVA'S HOME (spec 3.1), reinstated as its own page.
 *
 * ── WHAT THIS REPLACES, AND WHY IT IS NOT THE OLD FILE ─────────────────────
 *
 * #654 redirected /DailyUpdate to Overall because the briefing was on both and
 * two answers to one question is worse than one. The owner's ruling restores
 * the page; the fix for the duplication is the other way round — the full
 * briefing lives HERE, and Overall carries the single headline off the same
 * resolved state (DayStateHeadline.jsx). One source, rendered twice, and a
 * guard that fails if they ever stop being the same call.
 *
 * The pre-#654 page is NOT resurrected. It asked an LLM for the whole briefing
 * on every load — headline, greeting, "this week", smart suggestions, an
 * emotional note and a "forgotten detail" — cached per day per user, against a
 * schema of eleven generated fields. That is the machinery that produced
 * "Happy 0 day": a generated sentence about a number the prompt handed over
 * bare. What the couple needs from this page is what is true today, and that
 * is computed, not written.
 *
 * ── THE OLD PAGE'S QUICK POINTS, EACH KEPT OR DROPPED ON PURPOSE ───────────
 *
 * KEPT:
 *   the countdown            days to go, via #681's countdownLabel — the whole
 *                            point of that PR was that four surfaces each
 *                            computed it themselves and three got it wrong
 *   the greeting             "Good morning, Ada" — time of day and a first
 *                            name, never an address (emailGreeting's rule)
 *   today's date             the couple's own locale, spelled out
 *   what needs you           the three lines, from the one resolved state
 *   what to do first         NextUp, the setup journey, unchanged
 *   what could not be read   named, with a retry
 *
 * DROPPED, each for a stated reason:
 *   smart suggestions        generated advice with no source in the wedding
 *   the emotional note       spec 7: no pleasantries, no congratulation
 *   the forgotten detail     generated speculation presented as a finding
 *   the snapshot cards       Guests confirmed / RSVP pending / Budget used %
 *                            / Vendors booked. The stats stay on Overall,
 *                            which is where the owner's standing rule keeps
 *                            them, and "Budget used 64%" is barred here
 *                            anyway (spec 5.2, no percentages)
 *   the tips modal           Layout.jsx already hosts it, reached from
 *                            "Quick tips" in the sidebar. Nothing is orphaned
 */
export default function DailyUpdate() {
  const navigate = useNavigate();
  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;

  const [guests, setGuests] = useState([]);
  const [budget, setBudget] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [wd, setWd] = useState(null);
  const [journey, setJourney] = useState(null);
  const [unseenSources, setUnseenSources] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setUnseenSources([]);
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          setGuests(data.Guest || []); setBudget(data.Budget || []); setSchedule(data.Schedule || []);
        }
        setLoading(false);
        return;
      }
      // THE SAME LOADER OVERALL USES. An unloaded store is not an empty one,
      // and loadDashboardSources is what returns the KEYS the day state tests
      // — a list of labels here would silently never match (Dashboard.jsx:104).
      const { data, failed } = await loadDashboardSources({
        guests:   () => getMyGuestsWithRsvp(undefined, undefined, { strict: true }),
        budget:   () => getMyRecords('Budget', undefined, undefined, { strict: true }),
        schedule: () => getMyRecords('Schedule', undefined, undefined, { strict: true }),
        // BOTH STORES, because Overall reads both. A to-do is a Note with
        // view_type 'todo'; some accounts also still have `Task` rows, and
        // todosFrom keeps them. Loading only Notes here made the two pages
        // disagree again in the other direction — Overall named a Task as the
        // next thing and the daily update page could not see it. The helper
        // cannot make two pages agree if they are handed different stores.
        notes:    () => getMyRecords('Note', undefined, undefined, { strict: true }),
        tasks:    () => getMyRecords('Task', undefined, undefined, { strict: true }),
        vendors:  () => getMyRecords('Vendor', undefined, undefined, { strict: true }),
      });
      setGuests(data.guests || []); setBudget(data.budget || []);
      setSchedule(data.schedule || []);
      // A to-do is a Note with view_type 'todo' — TodoList.jsx:159 filters on
      // exactly that, so counting every Note would count moodboard notes as
      // overdue tasks. Selected by the SAME helper Overall uses, because the
      // two pages disagreed once by choosing their inputs separately.
      setTasks(todosFrom({ notes: data.notes, tasks: data.tasks }));
      setVendors(data.vendors || []);
      setUnseenSources(failed);

      const details = await getMyWeddingDetails().catch(() => null);
      setWd(details);
      // NULLED WHEN THE RECORD DID NOT LOAD, not left at its last value. A
      // stale journey is a claim about setup progress that nothing behind it
      // supports — the same class as calling an unloaded store an empty one.
      if (!details) setJourney(null);
      if (details) {
        let storedUser = null;
        try { storedUser = JSON.parse(localStorage.getItem('oi_user') || 'null'); } catch { storedUser = null; }
        const me = storedUser || await base44.auth.me().catch(() => null);
        const { trialActive } = getTrialStatus(me);
        setJourney(getJourneyProgress(details, {
          guests: data.guests || [], budget: data.budget || [], vendors: data.vendors || [],
        }, { plan: me?.plan, trialActive }));
      }
    } catch (err) {
      // A `finally` WITHOUT A CATCH was the whole bug this page exists not to
      // have. loadDashboardSources' strict readers throw when they cannot
      // resolve the user, the throw escaped, `wd` and the journey were never
      // set, and the page rendered a confident "Nothing needs you today" over
      // a load that had failed entirely — the exact shape
      // dailyupdate-load-states.mjs was written about, reintroduced by the
      // rewrite and caught by looking at the screenshot.
      //
      // Everything is unseen when nothing was read, so there is no badge
      // (spec 9.1) and the page says so.
      console.error('[DailyUpdate] load failed:', err?.message);
      setUnseenSources(['guests', 'budget', 'schedule', 'notes', 'tasks', 'vendors']);
    } finally {
      setLoading(false);
    }
  }, [isCollaborating, collab.ownerUserId]);

  useEffect(() => { load(); }, [load]);

  const days = daysUntilWedding(wd?.weddingDate);
  const coupleName = coupleDisplayName(wd || {});
  // The masthead prints the couple's name, as the old page did — and never an
  // address in its place (the welcome-email rule, same reason).
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ONE COMPUTATION, and the whole page reads it — the hero's sentence, the
  // first column's lines and Overall's one-liner are all this object.
  const day = resolveDayState({ tasks, schedule, guests, budget, vendors, unseen: unseenSources });

  // THE FAR-RIGHT COLUMN, as it was. Same four labels the pre-#654 page showed
  // (e2c087a:476-481) and the same arithmetic (e2c087a:329-333), with the two
  // dead column names dropped: `total_amount` and `spent_amount` do not exist
  // on Budget and were only ever reached through their own `||` fallbacks.
  const confirmedGuests = guests.filter(isAttending).length;
  const pendingGuests   = guests.filter((g) => !g.rsvp_status || g.rsvp_status === 'pending').length;
  const totalBudget     = budget.reduce((n, b) => n + (b.budgeted_amount || 0), 0);
  const budgetSpent     = budget.reduce((n, b) => n + (b.actual_amount || 0), 0);
  const budgetPercent   = totalBudget ? Math.round((budgetSpent / totalBudget) * 100) : 0;
  const bookedVendors   = vendors.filter((v) => v.status === 'booked').length;
  const snapCards = [
    { label: 'Guests confirmed', value: String(confirmedGuests) },
    { label: 'RSVP pending',     value: String(pendingGuests) },
    { label: 'Budget used',      value: `${budgetPercent}%` },
    { label: 'Vendors booked',   value: `${bookedVendors}/${vendors.length}` },
  ];

  const columnHead = (label) => (
    <div style={{ borderTop: '3px solid #0A0A0A', paddingTop: 16, marginBottom: 24 }}>
      <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0A0A0A' }}>
      <DashboardPageHeader title="Daily update" subtitle="Your wedding planning briefing" />

      {/* ── SECTION 1: Masthead ── */}
      <div style={{
        background: '#FFFFFF', padding: '20px 40px', borderBottom: '1px solid #E8E8E5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(10,10,10,0.6)' }}>
          Openinvite daily
        </span>
        <div style={{ textAlign: 'center' }}>
          {coupleName && (
            <div style={{ fontFamily: PJS, fontSize: 13, fontWeight: 700, color: '#0A0A0A', letterSpacing: '0.04em' }}>{coupleName}</div>
          )}
          <div style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.6)', letterSpacing: '0.06em', marginTop: coupleName ? 2 : 0 }}>
            {dateLabel}
          </div>
        </div>
        {/* countdownLabel returns null once the wedding has passed, so nothing
            counts backwards and nothing reads "Today's the day" forever (#681).
            The old pill printed `${daysUntil} days to go` directly. */}
        {countdownLabel(days) ? (
          <div style={{
            background: '#E03553', color: '#FFFFFF', borderRadius: 999, padding: '6px 16px',
            fontFamily: PJS, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          }}>
            {countdownLabel(days)}
          </div>
        ) : <div style={{ width: 120 }} />}
      </div>

      {/* ── SECTION 2: Hero headline, the big topic sentence ── */}
      <Briefing day={day} loading={loading} />

      {/* Orientation layer. STILL HERE, and reported rather than removed: the
          owner asked for this card to go, and it was on the pre-#654 page too
          (e2c087a:594-604), which the same instruction says to restore
          exactly. Held for a ruling. */}
      {!loading && journey && (
        <NextUp journey={journey} daysUntil={days} onGo={(step) => navigate(step.route)} />
      )}

      {!loading && unseenSources.length > 0 && (
        <div style={{
          background: '#FFFFFF', padding: '16px 40px', borderBottom: '1px solid #E8E8E5',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
            Your {formatSourceList(unseenSources)} could not be loaded, so today&apos;s numbers are incomplete.
          </span>
          <button onClick={load} style={{
            border: '1px solid rgba(10,10,10,0.45)', background: 'transparent', color: '#0A0A0A',
            borderRadius: 999, padding: '6px 14px', fontFamily: PJS, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Try again
          </button>
        </div>
      )}

      {/* ── SECTION 3: Editorial grid — three columns, 1px rules between ── */}
      {!loading && (
        <div style={{ background: '#FFFFFF', padding: '0 40px' }}>
          <div className="oi-daily-grid">

            {/* ── Column A: This week ── */}
            <div style={{ padding: '32px 32px 32px 0' }}>
              {columnHead('This week')}
              {day.lines.length ? day.lines.map((l, i) => (
                <div key={i} style={{
                  paddingBottom: 20, marginBottom: i === day.lines.length - 1 ? 0 : 20,
                  borderBottom: i === day.lines.length - 1 ? 'none' : '1px solid rgba(10,10,10,0.06)',
                }}>
                  <p style={{ fontFamily: PJS, fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1.3 }}>
                    {l.text}
                  </p>
                  <Link to={l.to} style={{ fontFamily: PJS, fontSize: 13, fontWeight: 600, color: '#E03553', textDecoration: 'none', display: 'inline-block', marginTop: 6 }}>
                    {LINK_LABEL[l.to] || 'Open'}
                  </Link>
                </div>
              )) : (
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>Nothing on your list this week.</p>
              )}
            </div>

            <div style={{ background: 'rgba(10,10,10,0.06)' }} />

            {/* ── Column B: Ava's briefing ── */}
            <div style={{ padding: '32px' }}>
              {columnHead('Ava\u2019s briefing')}
              {/* THE BADGE, and not the headline again. It read
                  "Overdue — Overdue: Book the celebrant." once the headline
                  started leading with the state word — a stutter, and a repeat
                  of the sentence already set 42px high at the top of the page.
                  Ruling 6 keeps the badge; this is where it survives a glance. */}
              {day.badge && (
                <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#E03553', margin: '0 0 10px' }}>
                  {day.badge}
                </p>
              )}
              <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: 0, lineHeight: 1.4 }}>
                {countdownSentence(days) || 'Your wedding date is not set yet.'}
              </p>
              {unseenSources.length > 0 && (
                <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '12px 0 0', lineHeight: 1.5 }}>
                  {formatSourceList(unseenSources)} could not be read, so this is not the whole picture.
                </p>
              )}
              {/* The page's ONE Ava entry point (spec 3.3), in Ava's own column. */}
              <div style={{ marginTop: 20 }}>
                <AvaButton label="Ask Ava about today" onClick={() => openAva({ page: '/DailyUpdate' })} />
              </div>
            </div>

            <div style={{ background: 'rgba(10,10,10,0.06)' }} />

            {/* ── Column C: Your numbers ── */}
            <div style={{ padding: '32px 0 32px 32px' }}>
              {columnHead('Your numbers')}
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
    </div>
  );
}
