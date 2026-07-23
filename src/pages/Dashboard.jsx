import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { track, identify } from "@/lib/analytics";
import toast from "react-hot-toast";

import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import RSVPChart from "../components/dashboard/RSVPChart";
import BudgetSummary from "../components/dashboard/BudgetSummary";
import UpcomingTasks from "../components/dashboard/UpcomingTasks";
import RecentActivity from "../components/dashboard/RecentActivity";
import TipsModal from "../components/dashboard/TipsModal";
import { getMyRecords, getMyGuestsWithRsvp } from "@/lib/resolveMyWedding";
import { tallyGuestRsvp } from "@/lib/guestRsvpTally";
import { useCollaboratorContext, hasPagePermission } from "@/lib/collaboratorContext";

const QUICK_LINKS = [
  { label: "Guest list", url: "Guests" },
  { label: "Budget", url: "Budget" },
  { label: "Schedule", url: "Schedule" },
  { label: "Vendors", url: "Vendors" },
  { label: "Registry", url: "Registry" },
  { label: "Seating", url: "Seating" },
];

function CountUp({ to, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <>{value}{suffix}</>;
}

function QuickLink({ label, url, isLast, collabSuffix }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={createPageUrl(url) + collabSuffix}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        borderRight: !isLast ? '1px solid rgba(10,10,10,0.08)' : 'none',
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
        color: hovered ? '#FFFFFF' : 'rgba(10,10,10,0.5)',
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
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
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
      const amount = plan === 'ultra' ? 149 : 79;
      track('purchase_completed', { plan, amount, currency: 'AUD' });
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
      if (currentUser && !currentUser.onboardingCompleted) setShowWelcomeBanner(true);
      const tipsShown = localStorage.getItem('openinvite_tips_shown');
      if (!tipsShown) setShowTipsModal(true);
      const [guestData, budgetData, scheduleData, taskData, noteData, questionnaireData] = await Promise.all([
        getMyGuestsWithRsvp(), getMyRecords('Budget'), getMyRecords('Schedule'),
        getMyRecords('Task'), getMyRecords('Note'), fetchQuestionnaireResponses(),
      ]);
      setGuests(guestData); setBudget(budgetData); setSchedule(scheduleData);
      setTasks(taskData); setNotes(noteData); setQuestionnaireResponses(questionnaireData);
    } catch {
      toast.error("Failed to load your dashboard data");
    }
    setLoading(false);
  };

  const stats = React.useMemo(() => {
    const totalGuests = guests.length;
    // AUDIT_2026-07.md S21: previously rsvp_status !== 'pending', which
    // silently counted an unset/undefined status as "responded" — every
    // sibling tally in the app treats a falsy status as not-yet-responded,
    // same as tallyGuestRsvp does.
    const { responded, attending, declined } = tallyGuestRsvp(guests);
    const totalBudget = budget.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
    const totalSpent = budget.reduce((s, i) => s + (i.actual_amount || 0), 0);
    const budgetPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    return { totalGuests, responded, attending, declined, responseRate: totalGuests > 0 ? (responded / totalGuests) * 100 : 0, totalBudget, totalSpent, budgetPercentage, remainingBudget: totalBudget - totalSpent };
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

  const dismissWelcome = async () => {
    setShowWelcomeBanner(false);
    try { await base44.auth.updateMe({ onboardingCompleted: true }); } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Overall" subtitle="Your wedding planning at a glance" />

      {/* Stat cards — 2-col on mobile, 4-col on desktop */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
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
          border: '1px solid rgba(10,10,10,0.08)',
          marginBottom: 24,
        }}>
          {visibleQuickLinks.map((l, i) => (
            <QuickLink key={l.label} label={l.label} url={l.url} collabSuffix={collabSuffix} isLast={i === visibleQuickLinks.length - 1} />
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', marginBottom: 0 }} />
      </div>

      {/* Two-column layout: stacks on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row lg:items-stretch" style={{ minHeight: 'calc(100vh - 300px)' }}>

        {/* Left: charts */}
        <div className="flex flex-col gap-8 min-w-0 lg:flex-[2_1_0]" style={{ padding: '32px 32px 48px' }}>
          <RSVPChart guests={guests} />
          <BudgetSummary budget={budget} stats={stats} />
        </div>

        {/* Right: grey panel */}
        <div className="flex flex-col gap-6 min-w-0 border-t border-[rgba(10,10,10,0.08)] lg:border-t-0 lg:border-l lg:flex-[1_1_0]" style={{ background: '#F7F7F7', padding: '24px 20px 32px' }}>
          <UpcomingTasks schedule={schedule} />
          <RecentActivity guests={guests} budget={budget} tasks={tasks} notes={notes} questionnaireResponses={questionnaireResponses} />
        </div>

      </div>


      {showTipsModal && (
        <TipsModal onClose={() => {
          setShowTipsModal(false);
          localStorage.setItem('openinvite_tips_shown', 'true');
        }} />
      )}

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
        borderRight: !isLast ? '1px solid rgba(10,10,10,0.08)' : 'none',
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
