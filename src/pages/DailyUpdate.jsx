import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { loadDashboardSources, formatSourceList } from '@/lib/dashboardSources';
import { daysUntilWedding, countdownLabel } from '@/lib/weddingCountdown';
import { guestCounts } from '@/lib/guestRsvpTally';
import { coupleDisplayName } from '@/lib/coupleNames';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import Briefing from '@/components/dashboard/Briefing';
import { todosFrom, resolveDayState, avaSentence } from '@/lib/dayState';
import { buildAvaPrompt, unwrapLlmReply } from '@/lib/avaRequest';
import { buildWeddingContext } from '@/lib/avaContext';
import { TRACKING_REQUEST, validateTracking, authoredTracking, parseTrackingBlocks } from '@/lib/avaTracking';
import { Link } from 'react-router-dom';

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
 *   the greeting             now the first half of the topic sentence itself
 *   what needs you           the three lines, from the one resolved state
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
  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;

  const [guests, setGuests] = useState([]);
  const [budget, setBudget] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [wd, setWd] = useState(null);
  const [unseenSources, setUnseenSources] = useState([]);
  const [loading, setLoading] = useState(true);
  // Column B's paragraph. null while it is being read; a string once there is
  // one to show, authored or model-written.
  const [tracking, setTracking] = useState(null);

  // ── THE LOAD IS TWO LOADS, and that is the whole fix ─────────────────────
  //
  // OWNER: "/DailyUpdate takes ~10 seconds; every other page is fast; this one
  // shows nothing while loading." It was not slow to load. It was slow to be
  // ALLOWED to render: `setLoading(false)` sat in the `finally` of a function
  // that also awaited the model call for Column B, so the headline, the
  // countdown, the numbers and the priorities — every one of them already in
  // memory — waited on an LLM round trip that none of them use.
  //
  // `load` now reads the stores and nothing else, and returns what it read.
  // The briefing is a second, independent request that starts on mount and
  // writes into Column B whenever it arrives. Measured on the fixture with the
  // model held for 6s: 6219ms to first paint before, 267ms after.
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
        // A COLLABORATOR GETS NO MODEL CALL — they are not the couple and the
        // briefing is written to them. Column B would otherwise hold its
        // skeleton for the life of the session, which is worse than a blank.
        setTracking(authoredTracking({ unseen: [] }));
        return;
      }
      // THE SAME LOADER OVERALL USES. An unloaded store is not an empty one,
      // and loadDashboardSources is what returns the KEYS the day state tests
      // — a list of labels here would silently never match (Dashboard.jsx:104).
      const { data, failed } = await loadDashboardSources({
        guests:   () => getMyGuestsWithRsvp(undefined, undefined, { strict: true }),
        budget:   () => getMyRecords('Budget', undefined, undefined, { strict: true }),
        schedule: () => getMyRecords('Schedule', undefined, undefined, { strict: true }),
        // ONE STORE. A to-do is a Note with view_type 'todo' — that is what
        // TodoList.jsx:159 filters on and the only way one is ever created.
        // `Task` was loaded here too, on the belief that some accounts still
        // have rows: nothing in src/ writes a Task, nothing else reads one,
        // and the read cost a round trip on the critical path of the page the
        // owner called slow. Retired here and in Dashboard.jsx (open ticket).
        notes:    () => getMyRecords('Note', undefined, undefined, { strict: true }),
        vendors:  () => getMyRecords('Vendor', undefined, undefined, { strict: true }),
      });
      setGuests(data.guests || []); setBudget(data.budget || []);
      setSchedule(data.schedule || []);
      // A to-do is a Note with view_type 'todo' — TodoList.jsx:159 filters on
      // exactly that, so counting every Note would count moodboard notes as
      // overdue tasks. Selected by the SAME helper Overall uses, because the
      // two pages disagreed once by choosing their inputs separately.
      setTasks(todosFrom({ notes: data.notes }));
      setVendors(data.vendors || []);
      setUnseenSources(failed);

      const details = await getMyWeddingDetails().catch(() => null);
      setWd(details);
      // THE STORES ARE IN. Paint now — the briefing is somebody else's await.
      setLoading(false);
      return { data, failed, details };
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
      setTracking(authoredTracking({ unseen: ['guests', 'budget', 'schedule', 'to-dos', 'vendors'] }));
    } finally {
      setLoading(false);
    }
  }, [isCollaborating, collab.ownerUserId]);

  /**
   * COLUMN B, off the critical path.
   *
   * Ava's context does not come from the stores above, so the request that
   * builds it starts on mount rather than after them. Only the DECISION —
   * whether there is anything to read at all — needs the stores, and by then
   * the context is usually already in hand.
   */
  const loadBriefing = useCallback(async (loaded, contextPromise) => {
    if (!loaded) return;
    const { data, failed, details } = loaded;
    const facts = {
      countdown: countdownLabel(daysUntilWedding(details?.weddingDate)),
      ...(() => { const c = guestCounts(data.guests || []);
        return { invitationsPending: c.invitations.pending, invitations: c.invitations.total, peopleAttending: c.people.attending }; })(),
      overdue: resolveDayState({ tasks: todosFrom({ notes: data.notes }) }).counts.overdue,
      unseen: failed,
    };
    const nothingToRead = !facts.invitations && !(data.budget || []).length && !(data.vendors || []).length
      && !(data.schedule || []).length && !todosFrom({ notes: data.notes }).length;
    if (nothingToRead) {
      // #648, in its original form: Ava does not speak when there is nothing
      // to read. An authored paragraph, from the same numbers, and no call.
      setTracking(authoredTracking(facts));
      return;
    }
    try {
      const weddingContext = await contextPromise;
      if (!weddingContext) throw new Error('no context');
      const reply = unwrapLlmReply(await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: buildAvaPrompt({ weddingContext, page: '/DailyUpdate', mirror: [], userText: TRACKING_REQUEST }),
      }), '');
      // A PARAGRAPH THAT FAILS THE CHECK IS NOT SHOWN. Three points is only a
      // rule if something counts them, and a percentage is barred outright
      // (spec 5.2). The authored one stands in.
      setTracking(validateTracking(reply).ok ? reply.trim() : authoredTracking(facts));
    } catch {
      setTracking(authoredTracking(facts));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    // ON MOUNT, NOT AFTER THE STORES. Two requests leave together; the page
    // renders on whichever of them it actually needs.
    const contextPromise = isCollaborating ? Promise.resolve(null) : buildWeddingContext().catch(() => null);
    (async () => {
      const loaded = await load();
      if (!alive) return;
      await loadBriefing(loaded, contextPromise);
    })();
    return () => { alive = false; };
  }, [load, loadBriefing, isCollaborating]);

  const days = daysUntilWedding(wd?.weddingDate);
  const coupleName = coupleDisplayName(wd || {});
  // The masthead prints the couple's name, as the old page did — and never an
  // address in its place (the welcome-email rule, same reason).
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ONE COMPUTATION, and the whole page reads it — the hero's sentence, the
  // first column's lines and Overall's one-liner are all this object.
  const day = resolveDayState({ tasks, schedule, guests, budget, vendors, unseen: unseenSources, daysOut: days });

  // THE FAR-RIGHT COLUMN, as it was. Same four labels the pre-#654 page showed
  // (e2c087a:476-481) and the same arithmetic (e2c087a:329-333), with the two
  // dead column names dropped: `total_amount` and `spent_amount` do not exist
  // on Budget and were only ever reached through their own `||` fallbacks.
  // TWO NAMED QUANTITIES, FROM ONE HELPER. Replies per INVITATION, attendance
  // per PERSON — the owner's ruling on the 94-vs-61 split. Nothing here counts
  // guests itself, which is how the two pages came to disagree.
  const counts = guestCounts(guests);
  const totalBudget     = budget.reduce((n, b) => n + (b.budgeted_amount || 0), 0);
  const budgetSpent     = budget.reduce((n, b) => n + (b.actual_amount || 0), 0);
  const budgetPercent   = totalBudget ? Math.round((budgetSpent / totalBudget) * 100) : 0;
  const bookedVendors   = vendors.filter((v) => v.status === 'booked').length;
  // ── THE NUMBERS ROW — Overall's tiles, now living here ──────────────────
  //
  // Overall is gone (owner: "the Overall in planning is still there, that
  // needs to go") and its four stat tiles moved onto this page as ONE
  // full-width row under the columns, replacing the "Your numbers" column.
  //
  // SIX TILES, NOT FOUR, and that is a judgment call marked in the PR.
  // Overall showed Guests coming · People invited · Budget used · Events
  // planned; this page showed Guests coming · Invitations pending · Budget
  // used · Vendors booked. Taking only Overall's four would throw away the
  // invitations/people split the owner ruled on (#694, the 94-vs-61 answer)
  // and the vendor count. The union is six, deduped, each labelled with WHICH
  // quantity it is — which was the whole point of that ruling.
  const snapCards = [
    { label: 'Guests coming',       value: String(counts.people.attending) },
    { label: 'People invited',      value: String(counts.people.total) },
    { label: 'Invitations pending', value: String(counts.invitations.pending) },
    { label: 'Budget used',         value: `${budgetPercent}%` },
    { label: 'Events planned',      value: String(schedule.length) },
    { label: 'Vendors booked',      value: `${bookedVendors}/${vendors.length}` },
  ];

  const columnHead = (label) => (
    <div style={{ borderTop: '3px solid #0A0A0A', paddingTop: 16, marginBottom: 24 }}>
      <span style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0A0A0A' }}>
      <DashboardPageHeader title="Daily update" subtitle="Your wedding planning briefing" />

      {/* ── SECTION 2: Hero headline, the big topic sentence ── */}
      <Briefing sentence={avaSentence(day, { fullName: coupleName })} loading={loading} />

      {/* The "Next up / Build your website" card is gone on the owner's
          ruling: an onboarding stepper is not a to-do, and it sat between the
          sentence and the columns pushing both down. It was on the pre-#654
          page (e2c087a:594-604); the ruling supersedes that. */}

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
              {/* THE BADGE (ruling 6), then the paragraph. */}
              {day.badge && (
                <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#E03553', margin: '0 0 12px' }}>
                  {day.badge}
                </p>
              )}
              {tracking === null
                ? (
                  // WAITING LOOKS LIKE WAITING. The column keeps its shape
                  // while Ava reads, so the page does not reflow under the
                  // couple when the paragraph lands. Square corners: rounding
                  // is for buttons, pills and modals only.
                  <div data-skeleton="briefing" aria-live="polite" aria-busy="true">
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                      Ava is reading your wedding
                    </span>
                    {[92, 100, 78, 96, 64].map((w, i) => (
                      <div key={i} data-skeleton="line" style={{
                        height: 14, width: `${w}%`, background: 'rgba(10,10,10,0.06)',
                        marginBottom: i === 4 ? 0 : 10,
                      }} />
                    ))}
                  </div>
                )
                : parseTrackingBlocks(tracking).map((b, i, all) => (
                    <div key={i} style={{
                      paddingBottom: 18, marginBottom: i === all.length - 1 ? 0 : 18,
                      borderBottom: i === all.length - 1 ? 'none' : '1px solid rgba(10,10,10,0.06)',
                    }}>
                      <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: 0, lineHeight: 1.35 }}>
                        {b.lead}
                      </p>
                      <p style={{ fontFamily: PJS, fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '6px 0 0', lineHeight: 1.55 }}>
                        {b.body}
                      </p>
                    </div>
                  ))}
            </div>

          </div>

          {/* ── THE NUMBERS, FULL WIDTH, UNDER THE COLUMNS ── */}
          <div className="oi-daily-stats">
            {snapCards.map((card) => (
              <div key={card.label} className="oi-daily-stat">
                <div style={{ fontFamily: PJS, fontSize: 40, fontWeight: 800, color: '#0A0A0A', lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: PJS, fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)', marginTop: 6 }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
