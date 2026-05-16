import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import RSVPChart from "../components/dashboard/RSVPChart";
import BudgetSummary from "../components/dashboard/BudgetSummary";
import UpcomingTasks from "../components/dashboard/UpcomingTasks";
import RecentActivity from "../components/dashboard/RecentActivity";
import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";
import TipsModal from "../components/dashboard/TipsModal";
const Guest = base44.entities.Guest;
const Budget = base44.entities.Budget;
const Schedule = base44.entities.Schedule;

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

function QuickLink({ label, url, isLast }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={createPageUrl(url)}
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
  color: 'rgba(10,10,10,0.4)',
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
  const [loading, setLoading] = useState(true);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser && !currentUser.onboarding_completed) setShowWelcomeBanner(true);
      const tipsShown = localStorage.getItem('openinvite_tips_shown');
      if (!tipsShown) setShowTipsModal(true);
      const [guestData, budgetData, scheduleData] = await Promise.all([
        Guest.list(), Budget.list(), Schedule.list(),
      ]);
      setGuests(guestData); setBudget(budgetData); setSchedule(scheduleData);
    } catch {}
    setLoading(false);
  };

  const stats = React.useMemo(() => {
    const totalGuests = guests.length;
    const responded = guests.filter(g => g.rsvp_status !== 'pending').length;
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined = guests.filter(g => g.rsvp_status === 'declined').length;
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

  const dismissWelcome = async () => {
    setShowWelcomeBanner(false);
    try { await base44.auth.updateMe({ onboarding_completed: true }); } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Overall" subtitle="Your wedding planning at a glance" />

      {/* Stat cards — full-width horizontal, equal columns */}
      <div style={{
        display: 'flex',
        width: '100%',
        borderBottom: '1px solid rgba(10,10,10,0.08)',
      }}>
        {STAT_CARDS.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            suffix={s.suffix}
            url={s.url}
            isLast={i === STAT_CARDS.length - 1}
            loading={loading}
          />
        ))}
      </div>

      {/* Quick navigation links */}
      <div style={{ padding: '24px 32px 0' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          border: '1px solid rgba(10,10,10,0.08)',
          marginBottom: 24,
        }}>
          {QUICK_LINKS.map((l, i) => (
            <QuickLink key={l.label} label={l.label} url={l.url} isLast={i === QUICK_LINKS.length - 1} />
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', marginBottom: 0 }} />
      </div>

      {/* Two-column layout: main content left | grey right panel */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - 300px)' }}>

        {/* Left: charts */}
        <div style={{ flex: '2 1 0', padding: '32px 32px 48px', display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          <RSVPChart guests={guests} />
          <BudgetSummary budget={budget} stats={stats} />
        </div>

        {/* Right: grey panel */}
        <div style={{ flex: '1 1 0', background: '#F7F7F7', borderLeft: '1px solid rgba(10,10,10,0.08)', padding: '32px 24px 48px', display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          <UpcomingTasks schedule={schedule} />
          <RecentActivity guests={guests} budget={budget} />
        </div>

      </div>

      <AIWeddingAssistant />
      {showTipsModal && (
        <TipsModal onClose={() => {
          setShowTipsModal(false);
          localStorage.setItem('openinvite_tips_shown', 'true');
        }} />
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, url, isLast, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={createPageUrl(url)}
      style={{
        flex: 1,
        padding: '24px 32px',
        minHeight: 80,
        borderRight: !isLast ? '1px solid rgba(10,10,10,0.08)' : 'none',
        borderRadius: 0,
        boxShadow: 'none',
        textDecoration: 'none',
        display: 'block',
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
