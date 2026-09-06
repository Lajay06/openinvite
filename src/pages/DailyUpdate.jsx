import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { loadDashboardSources, formatSourceList } from '@/lib/dashboardSources';
import { daysUntilWedding, countdownLabel, countdownSentence } from '@/lib/weddingCountdown';
import { getJourneyProgress } from '@/lib/setupJourney';
import { getTrialStatus } from '@/lib/trialStatus';
import { coupleDisplayName } from '@/lib/coupleNames';
import { firstNameOrNull } from '@/lib/emailGreeting';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import Briefing from '@/components/dashboard/Briefing';
import { todosFrom } from '@/lib/dayState';
import NextUp from '@/components/dashboard/NextUp';
import AvaButton from '@/components/shared/AvaButton';
import { openAva } from '@/lib/avaOpen';
import { useNavigate } from 'react-router-dom';

const PJS = "'Plus Jakarta Sans', sans-serif";

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
        tasks:    () => getMyRecords('Note', undefined, undefined, { strict: true }),
        vendors:  () => getMyRecords('Vendor', undefined, undefined, { strict: true }),
      });
      setGuests(data.guests || []); setBudget(data.budget || []);
      setSchedule(data.schedule || []);
      // A to-do is a Note with view_type 'todo' — TodoList.jsx:159 filters on
      // exactly that, so counting every Note would count moodboard notes as
      // overdue tasks. Selected by the SAME helper Overall uses, because the
      // two pages disagreed once by choosing their inputs separately.
      setTasks(todosFrom({ notes: data.tasks }));
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
      setUnseenSources(['guests', 'budget', 'schedule', 'tasks', 'vendors']);
    } finally {
      setLoading(false);
    }
  }, [isCollaborating, collab.ownerUserId]);

  useEffect(() => { load(); }, [load]);

  const days = daysUntilWedding(wd?.weddingDate);
  const coupleName = coupleDisplayName(wd || {});
  // NEVER AN ADDRESS WHERE A NAME GOES — the welcome-email rule, same reason.
  const first = firstNameOrNull(coupleName);
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const greeting = first ? `Good ${partOfDay}, ${first}.` : `Good ${partOfDay}.`;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Daily update" subtitle="What needs you today" />

      {/* Greeting, date and the countdown — the orientation line. countdownLabel
          returns null once the wedding has passed, so nothing counts backwards
          and nothing says "Today's the day" forever after (#681). */}
      <div style={{
        padding: '22px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)',
        display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{greeting}</span>
        <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>{dateLabel}</span>
        {countdownLabel(days) && (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            {countdownSentence(days) || countdownLabel(days)}
          </span>
        )}
      </div>

      {/* THE BRIEFING. One state, computed once (spec 9.1), rendered here in
          full and on Overall as a single headline. */}
      <Briefing
        tasks={tasks} schedule={schedule} guests={guests}
        budget={budget} vendors={vendors} unseen={unseenSources} loading={loading}
      />

      {!loading && unseenSources.length > 0 && (
        <div style={{
          padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            Your {formatSourceList(unseenSources)} could not be loaded.
          </span>
          <button
            onClick={load}
            style={{
              border: '1px solid rgba(10,10,10,0.45)', background: 'transparent', color: '#0A0A0A',
              borderRadius: 999, padding: '6px 14px', fontFamily: PJS, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* What to do first, for a wedding that has not been set up yet. */}
      {!loading && journey && (
        <NextUp journey={journey} onGo={(step) => navigate(step.route)} />
      )}

      {/* ONE Ava entry point on this page (spec 3.3), and it opens the pod. */}
      <div style={{ padding: '24px 32px' }}>
        <AvaButton label="Ask Ava about today" onClick={() => openAva({ page: '/DailyUpdate' })} />
      </div>
    </div>
  );
}
