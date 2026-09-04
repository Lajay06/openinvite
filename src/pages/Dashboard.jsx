import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { track, identify } from "@/lib/analytics";
import toast from "react-hot-toast";

import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import Briefing from "@/components/dashboard/Briefing";
import AvaModal from "@/components/layout/AvaModal";
import RSVPChart from "../components/dashboard/RSVPChart";
import BudgetSummary from "../components/dashboard/BudgetSummary";
import UpcomingTasks from "../components/dashboard/UpcomingTasks";
import RecentActivity from "../components/dashboard/RecentActivity";
import { getMyRecords, getMyGuestsWithRsvp } from "@/lib/resolveMyWedding";
import { loadDashboardSources, formatSourceList } from "@/lib/dashboardSources";
import { tallyAttendees } from "@/lib/guestRsvpTally";
import { resolveAttendees } from "@/lib/attendees";
import { useCollaboratorContext, hasPagePermission } from "@/lib/collaboratorContext";
import CountUp from "@/components/shared/CountUp";

const QUICK_LINKS = [
  { label: "Guest list", url: "Guests" },
  { label: "Budget", url: "Budget" },
  { label: "Schedule", url: "Schedule" },
  { label: "Vendors", url: "Vendors" },
  { label: "Registry", url: "Registry" },
  { label: "Seating", url: "Seating" },
];


function QuickLink({ label, url, isLast, collabSuffix }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={createPageUrl(url) + collabSuffix}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        borderRight: !isLast ? '1px solid rgba(10,10,10,0.12)' : 'none',
        textDecoration: 'none',
        background: hovered ? '#0A0A0A' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: hovered ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </Link>
  );
}

const statLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0,
  marginBottom: 10,
};

const statValueStyle = {
  fontSize: 'clamp(24px, 3vw, 36px)',
  fontWeight: 700,
  color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  lineHeight: 1,
  margin: 0,
};

export default function Dashboard() {
  const [guests, setGuests] = useState([]);
  const [budget, setBudget] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [moodboardItems, setMoodboardItems] = useState([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Stores whose load failed this attempt. Named on the page rather than left
  // to a toast that scrolls away: the zeroes they leave behind sit here for as
  // long as the couple is reading them.
  //
  // ONE list, not two. This branch arrived with its own `unseen` state and its
  // own Promise.allSettled block; both were superseded by #659, which landed
  // the same correctness fix through loadDashboardSources while this PR was
  // held. The rebase drops the duplicate and the briefing reads THIS list.
  //
  // That is not merely deduplication — it fixes a real defect in the version
  // being dropped. The old `unseen` carried LABELS ('your budget'), while
  // buildBriefing tests KEYS (`unseen.includes('budget')`), so the check that
  // stops the briefing calling a FAILED store an empty one could never match.
  // loadDashboardSources returns the keys, so it now does.
  const [unseenSources, setUnseenSources] = useState([]);
  const [avaOpen, setAvaOpen] = useState(false);

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Links to append ?collabOwner=... so navigating from here never drops
  // the collaboration context (a bare createPageUrl() link would silently
  // land the collaborator back on their OWN, unrelated dashboard page).
  const collabSuffix = isCollaborating ? `?collabOwner=${encodeURIComponent(collab.ownerUserId)}` : '';

  useEffect(() => { init(); }, [isCollaborating]);

  // Track purchase_completed when Stripe redirects back with ?checkout=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      const plan = params.get('plan') || 'pro';
      const amount = plan === 'ultra' ? 99 : 49;
      track('purchase_completed', { plan, amount, currency: 'USD' });
      // Clean up the query string so a refresh doesn't re-fire the event
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  // Best-effort — a failure here (e.g. no questionnaires created yet)
  // shouldn't block the rest of the dashboard from loading.
  const fetchQuestionnaireResponses = async () => {
    try {
      const res = await fetch('/api/questionnaire-responses-for-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.responses || [];
    } catch {
      return [];
    }
  };

  const init = async () => {
    setUnseenSources([]);
    try {
      if (isCollaborating) {
        // No welcome banner/onboarding-tips prompt — those are owner-onboarding
        // concepts, meaningless while borrowing someone else's wedding.
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          setGuests(data.Guest || []);
          setBudget(data.Budget || []);
          setSchedule(data.Schedule || []);
        } else {
          toast.error("Failed to load your dashboard data");
        }
        setLoading(false);
        return;
      }
      const currentUser = await base44.auth.me();
      if (currentUser?.id) identify(currentUser.id, { email: currentUser.email, name: currentUser.full_name });
      // Promise.all rejected on the FIRST store that failed and discarded the
      // seven that had already succeeded — one flaky request and the whole page
      // rendered as a brand-new, empty account behind a single toast. Every
      // stat card then read zero, which is a CLAIM about this couple's wedding.
      //
      // loadDashboardSources settles all of them: what loaded is shown, and
      // what did not is named above the numbers it is missing from. It needs
      // { strict: true } — the soft default turns a transport failure into []
      // one layer down, which arrives here indistinguishable from success.
      const [{ data, failed }, questionnaireData] = await Promise.all([
        loadDashboardSources({
          guests:    () => getMyGuestsWithRsvp(undefined, undefined, { strict: true }),
          budget:    () => getMyRecords('Budget', undefined, undefined, { strict: true }),
          schedule:  () => getMyRecords('Schedule', undefined, undefined, { strict: true }),
          tasks:     () => getMyRecords('Task', undefined, undefined, { strict: true }),
          notes:     () => getMyRecords('Note', undefined, undefined, { strict: true }),
          vendors:   () => getMyRecords('Vendor', undefined, undefined, { strict: true }),
          moodboard: () => getMyRecords('MoodboardItem', undefined, undefined, { strict: true }),
        }),
        // Deliberately outside the classification: this one returns [] rather
        // than rejecting, by design. Inside the map it could never fail, which
        // would make a total outage read as merely partial.
        fetchQuestionnaireResponses(),
      ]);
      setGuests(data.guests || []); setBudget(data.budget || []); setSchedule(data.schedule || []);
      setTasks(data.tasks || []); setNotes(data.notes || []); setVendors(data.vendors || []);
      setMoodboardItems(data.moodboard || []); setQuestionnaireResponses(questionnaireData);
      setUnseenSources(failed);
    } catch {
      toast.error("Failed to load your dashboard data");
    }
    setLoading(false);
  };

  const retryLoad = () => { setLoading(true); init(); };

  const stats = React.useMemo(() => {
    // Counts ATTENDEES, not Guest rows: a plus-one is a person at the wedding,
    // and this card used to omit all 40 of them. "Total guests" here said 202
    // while the Guests page's card said 242 — the same label, two numbers, on
    // two pages a couple reads minutes apart.
    //
    // AUDIT_2026-07.md S21: previously rsvp_status !== 'pending', which
    // silently counted an unset/undefined status as "responded" — every
    // sibling tally in the app treats a falsy status as not-yet-responded.
    const { combined } = tallyAttendees(resolveAttendees(guests));
    const { total: totalGuests, responded, attending, declined } = combined;
    const totalBudget = budget.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
    const totalSpent = budget.reduce((s, i) => s + (i.actual_amount || 0), 0);
    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    // responseRate removed: computed here since forever and rendered nowhere.
    // Dead code shaped exactly like a live downstream figure is worse than dead
    // code that looks dead — it invites the next reader to reason about a
    // number no one sees.
    return { totalGuests, responded, attending, declined, totalBudget, totalSpent, budgetPercentage, remainingBudget: totalBudget - totalSpent };
  }, [guests, budget]);

  const STAT_CARDS = [
    { label: 'Total guests', value: stats.totalGuests, suffix: '', url: 'Guests' },
    { label: 'Attending', value: stats.attending, suffix: '', url: 'Guests' },
    { label: 'Budget used', value: Math.round(stats.budgetPercentage), suffix: '%', url: 'Budget' },
    { label: 'Events planned', value: schedule.length, suffix: '', url: 'Schedule' },
  ];

  // A collaborator only ever gets a working link to a page they were also
  // granted separately — Dashboard permission shows the summary numbers,
  // it doesn't imply access to the underlying pages themselves.
  const visibleQuickLinks = isCollaborating
    ? QUICK_LINKS.filter(l => hasPagePermission(collab.permissions, l.url, 'view'))
    : QUICK_LINKS;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Overall" subtitle="Your wedding planning at a glance" />

      {/* THE BRIEFING IS THE PAGE'S FIRST THING. Overall is the one place, and
          the first thing on it answers "what needs me today" before any module
          card offers somewhere to go. */}
      <Briefing
        tasks={tasks} schedule={schedule} guests={guests}
        budget={budget} vendors={vendors} unseen={unseenSources} loading={loading}
      />

      {/* Some stores loaded and some did not. The cards below are built from
          partial data, so their zeroes are not facts about this wedding — say
          which ones we could not read rather than letting them stand. Same
          copy shape and same offer as DailyUpdate's banner, deliberately: a
          couple meets these two pages minutes apart. */}
      {!loading && unseenSources.length > 0 && (
        <div style={{
          background: '#FFFFFF', padding: '16px 32px',
          borderBottom: '1px solid rgba(10,10,10,0.12)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, color: 'rgba(10,10,10,0.6)',
          }}>
            Your {formatSourceList(unseenSources)} could not be loaded, so the numbers below are incomplete.
          </span>
          <button
            onClick={retryLoad}
            style={{
              border: '1px solid rgba(10,10,10,0.45)', background: 'transparent',
              color: '#0A0A0A', borderRadius: 999, padding: '6px 14px',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Stat cards — 2-col on mobile, 4-col on desktop */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        {STAT_CARDS.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            suffix={s.suffix}
            url={s.url}
            collabSuffix={collabSuffix}
            isLast={i === STAT_CARDS.length - 1}
            loading={loading}
          />
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px' }}>
        <AvaButton label="Ask Ava to review your wedding plan" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Quick navigation links */}
      <div style={{ padding: '24px 32px 0' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          border: '1px solid rgba(10,10,10,0.12)',
          marginBottom: 24,
        }}>
          {visibleQuickLinks.map((l, i) => (
            <QuickLink key={l.label} label={l.label} url={l.url} collabSuffix={collabSuffix} isLast={i === visibleQuickLinks.length - 1} />
          ))}
        </div>
        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.12)', marginBottom: 0 }} />
      </div>

      {/* Two-column layout: stacks on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row lg:items-stretch" style={{ minHeight: 'calc(100vh - 300px)' }}>

        {/* Left: charts */}
        <div className="flex flex-col gap-8 min-w-0 lg:flex-[2_1_0]" style={{ padding: '32px 32px 48px' }}>
          <RSVPChart guests={guests} />
          <BudgetSummary budget={budget} stats={stats} />
        </div>

        {/* Right: grey panel */}
        <div className="flex flex-col gap-6 min-w-0 border-t border-[rgba(10,10,10,0.12)] lg:border-t-0 lg:border-l lg:flex-[1_1_0]" style={{ background: '#F7F7F7', padding: '24px 20px 32px' }}>
          <UpcomingTasks schedule={schedule} />
          <RecentActivity guests={guests} budget={budget} schedule={schedule} vendors={vendors} moodboardItems={moodboardItems} tasks={tasks} notes={notes} questionnaireResponses={questionnaireResponses} />
        </div>

      </div>


      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Review your wedding plan"
        systemPrompt="You are Ava, a wedding planning AI for Openinvite. Help the couple review their overall wedding plan, identify gaps, and suggest next steps."
        quickActions={["What should I focus on this week?", "What's missing from my plan?", "Give me a wedding planning checklist", "How far along am I?"]}
      />
    </div>
  );
}

function StatCard({ label, value, suffix, url, collabSuffix = '', isLast, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={createPageUrl(url) + collabSuffix}
      className="grow shrink basis-1/2 min-w-0 lg:flex-1 block"
      style={{
        padding: '24px 32px',
        minHeight: 80,
        borderRight: !isLast ? '1px solid rgba(10,10,10,0.12)' : 'none',
        borderRadius: 0,
        boxShadow: 'none',
        textDecoration: 'none',
        background: hovered ? 'rgba(10,10,10,0.02)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={statLabelStyle}>{label}</p>
      {loading
        ? <div style={{ width: 60, height: 36, background: 'rgba(10,10,10,0.06)' }} />
        : <p style={statValueStyle}><CountUp to={value} suffix={suffix} /></p>
      }
    </Link>
  );
}
