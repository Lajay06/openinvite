import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, XCircle, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const Guest = base44.entities.Guest;
const Budget = base44.entities.Budget;
const Vendor = base44.entities.Vendor;
const Schedule = base44.entities.Schedule;
const Note = base44.entities.Note;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS,
};

const ESSENTIALS_DEFAULT = [
  'Book the venue',
  'Choose a photographer',
  'Send save the dates',
  'Book the caterer',
  'Finalise guest list',
  'Order wedding dress/suit',
  'Book celebrant/officiant',
  'Arrange accommodation for guests',
];

const NICE_TO_HAVE_DEFAULT = [
  'Hire a videographer',
  'Arrange flowers and florals',
  'Book hair and makeup',
  'Plan honeymoon',
  'Create wedding website',
  'Arrange transport',
];

function loadChecklist() {
  try {
    const saved = localStorage.getItem('oi_checklist');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { essentials: [], niceToHave: [] };
}

function CountUp({ to, suffix = '' }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / 1200, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{value}{suffix}</>;
}

function ProgressBar({ value }) {
  return (
    <div style={{ height: 3, background: 'rgba(10,10,10,0.08)', width: '100%' }}>
      <div style={{ height: '100%', width: `${value}%`, background: 'linear-gradient(90deg, #E03553, #803D81)', transition: 'width 0.5s' }} />
    </div>
  );
}

function CheckItem({ item, onToggle }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 8px',
        borderBottom: '1px solid rgba(10,10,10,0.06)',
        opacity: item.done ? 0.5 : 1,
        cursor: 'pointer',
        transition: 'background 0.15s',
        outline: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {item.done
        ? <CheckCircle2 size={16} style={{ color: '#E03553', flexShrink: 0 }} />
        : <Circle size={16} style={{ color: 'rgba(10,10,10,0.2)', flexShrink: 0 }} />
      }
      <span style={{
        fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS,
        textDecoration: item.done ? 'line-through' : 'none',
      }}>
        {item.title}
      </span>
    </div>
  );
}

function ChecklistSection({ title, items, onToggle }) {
  const done = items.filter(i => i.done).length;
  const progress = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={labelStyle}>{title}</span>
        <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>{done}/{items.length}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>{done} of {items.length} completed</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      {items.map((item, i) => (
        <CheckItem key={i} item={item} onToggle={() => onToggle(i)} />
      ))}
    </div>
  );
}

// --- Planning overview ---

const OVERVIEW_GROUPS = [
  {
    group: 'Essential',
    items: [
      { key: 'wedding_date',         label: 'Wedding date set',          route: '/event-details' },
      { key: 'guests_started',       label: 'Guest list started',        route: '/guests' },
      { key: 'budget_setup',         label: 'Budget set up',             route: '/budget' },
      { key: 'venue_sourced',        label: 'Venue sourced or booked',   route: '/vendors' },
      { key: 'photographer_sourced', label: 'Photographer sourced',      route: '/vendors' },
      { key: 'caterer_sourced',      label: 'Caterer sourced',           route: '/vendors' },
    ],
  },
  {
    group: 'Recommended',
    items: [
      { key: 'rsvps_tracked',    label: 'RSVPs being tracked',       route: '/guests' },
      { key: 'schedule_created', label: 'Day schedule created',      route: '/schedule' },
      { key: 'music_sourced',    label: 'Music / DJ sourced',        route: '/vendors' },
      { key: 'florist_sourced',  label: 'Florist sourced',           route: '/vendors' },
      { key: 'notes_added',      label: 'Vows or speeches started',  route: '/vows-speeches' },
    ],
  },
  {
    group: 'Nice to have',
    items: [
      { key: 'videographer_sourced', label: 'Videographer sourced',    route: '/vendors' },
      { key: 'transport_arranged',   label: 'Transport arranged',      route: '/vendors' },
      { key: 'beauty_sourced',       label: 'Beauty & hair sourced',   route: '/vendors' },
      { key: 'wedding_city',         label: 'Wedding location set',    route: '/event-details' },
    ],
  },
];

function evaluateStatus({ guests, budgets, vendors, schedules, notes }) {
  return {
    wedding_date:         !!localStorage.getItem('oi_wedding_date'),
    guests_started:       guests.length > 0,
    budget_setup:         budgets.length > 0,
    venue_sourced:        vendors.some(v => v.category === 'venue'),
    photographer_sourced: vendors.some(v => v.category === 'photography'),
    caterer_sourced:      vendors.some(v => v.category === 'catering'),
    rsvps_tracked:        guests.some(g => g.rsvp_status && g.rsvp_status !== 'pending'),
    schedule_created:     schedules.length > 0,
    music_sourced:        vendors.some(v => v.category === 'music'),
    florist_sourced:      vendors.some(v => v.category === 'flowers'),
    notes_added:          notes.length > 0,
    videographer_sourced: vendors.some(v => v.category === 'videography'),
    transport_arranged:   vendors.some(v => v.category === 'transportation'),
    beauty_sourced:       vendors.some(v => v.category === 'beauty'),
    wedding_city:         !!localStorage.getItem('oi_wedding_city'),
  };
}

function PlanningOverview() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [guests, budgets, vendors, schedules, notes] = await Promise.all([
          Guest.list().catch(() => []),
          Budget.list().catch(() => []),
          Vendor.list().catch(() => []),
          Schedule.list().catch(() => []),
          Note.list().catch(() => []),
        ]);
        if (!cancelled) setStatus(evaluateStatus({ guests, budgets, vendors, schedules, notes }));
      } catch {
        if (!cancelled) setStatus({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(10,10,10,0.08)', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: PJS, marginTop: 16 }}>Scanning your planning data…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const allItems = OVERVIEW_GROUPS.flatMap(g => g.items);
  const completedCount = allItems.filter(i => status?.[i.key]).length;
  const overallProgress = allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  return (
    <div style={{ padding: '32px 32px 48px' }}>
      {/* Progress summary */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={labelStyle}>Planning progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{completedCount} of {allItems.length} complete</span>
        </div>
        <ProgressBar value={overallProgress} />
      </div>

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
        {OVERVIEW_GROUPS.map(group => {
          const groupDone = group.items.filter(i => status?.[i.key]).length;
          return (
            <div key={group.group}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={labelStyle}>{group.group}</span>
                <span style={{ fontSize: 11, color: '#444444', fontFamily: PJS }}>({groupDone}/{group.items.length})</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
              </div>
              <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
                {group.items.map((item, idx) => {
                  const done = !!status?.[item.key];
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px',
                        borderBottom: idx < group.items.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                        background: '#FFFFFF',
                      }}
                    >
                      {done
                        ? <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        : <XCircle size={16} style={{ color: '#E03553', flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: done ? '#444444' : '#0A0A0A', fontFamily: PJS }}>
                        {item.label}
                      </span>
                      {!done && (
                        <button
                          onClick={() => navigate(item.route)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS,
                            padding: '4px 8px', borderRadius: 999,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                          Go <ArrowRight size={12} />
                        </button>
                      )}
                      {done && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', fontFamily: PJS, padding: '2px 10px', borderRadius: 999, background: 'rgba(22,163,74,0.1)' }}>
                          Done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main page ---

const TABS = [
  { key: 'my-checklist', label: 'My checklist' },
  { key: 'overview',     label: 'Planning overview' },
];

export default function ChecklistPage({ embedded = false }) {
  const [lists, setLists] = useState(() => loadChecklist());
  const [activeTab, setActiveTab] = useState('my-checklist');
  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('oi_checklist', JSON.stringify(lists));
  }, [lists]);

  const toggleEssential = (idx) => {
    setLists(prev => ({ ...prev, essentials: prev.essentials.map((it, i) => i === idx ? { ...it, done: !it.done } : it) }));
  };

  const toggleNice = (idx) => {
    setLists(prev => ({ ...prev, niceToHave: prev.niceToHave.map((it, i) => i === idx ? { ...it, done: !it.done } : it) }));
  };

  const allItems = [...lists.essentials, ...lists.niceToHave];
  const totalDone = allItems.filter(i => i.done).length;
  const overallProgress = allItems.length > 0 ? Math.round((totalDone / allItems.length) * 100) : 0;
  const essentialsDone = lists.essentials.filter(i => i.done).length;
  const niceDone = lists.niceToHave.filter(i => i.done).length;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {!embedded && <DashboardPageHeader title="Checklist" subtitle="Track every task from first steps to big day" />}

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Overall progress', value: overallProgress, suffix: '%' },
          { label: 'Essentials done', value: essentialsDone },
          { label: 'Nice-to-haves done', value: niceDone },
        ].map((s, i, arr) => (
          <div key={i} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={{ ...labelStyle, margin: 0, marginBottom: 10 }}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} suffix={s.suffix || ''} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to review your checklist" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '0 32px' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 0', marginRight: 28,
              fontSize: 13, fontWeight: 600, fontFamily: PJS,
              color: activeTab === tab.key ? '#E03553' : '#444444',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'my-checklist' && (
        <>
          {allItems.length === 0 ? (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, marginBottom: 8 }}>
                Your checklist is empty
              </p>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, maxWidth: 360, margin: '0 auto 24px' }}>
                Switch to the Planning overview tab to track your key wedding milestones.
              </p>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  background: '#0A0A0A', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: PJS,
                  padding: '10px 24px', borderRadius: 999,
                }}
              >
                View planning overview
              </button>
            </div>
          ) : (
            <>
              {/* Overall progress bar */}
              <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={labelStyle}>Overall completion</span>
                  <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>
                    {totalDone} of {allItems.length} completed
                  </span>
                </div>
                <ProgressBar value={overallProgress} />
              </div>

              {/* Two-column checklist */}
              <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
                <ChecklistSection
                  title="Essentials"
                  items={lists.essentials}
                  onToggle={toggleEssential}
                />
                <ChecklistSection
                  title="Nice to have"
                  items={lists.niceToHave}
                  onToggle={toggleNice}
                />
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'overview' && <PlanningOverview />}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Checklist advisor"
        systemPrompt="You are Ava, a wedding planning checklist advisor. Help prioritise tasks and stay on track."
        quickActions={["What should I do this month?", "Am I behind schedule?", "Most important tasks right now", "12-month wedding checklist"]}
      />
    </div>
  );
}
