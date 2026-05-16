import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
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
  return {
    essentials: ESSENTIALS_DEFAULT.map(t => ({ title: t, done: false })),
    niceToHave: NICE_TO_HAVE_DEFAULT.map(t => ({ title: t, done: false })),
  };
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

export default function ChecklistPage() {
  const [lists, setLists] = useState(() => loadChecklist());

  useEffect(() => {
    localStorage.setItem('oi_checklist', JSON.stringify(lists));
  }, [lists]);

  const toggleEssential = (idx) => {
    setLists(prev => {
      const next = { ...prev, essentials: prev.essentials.map((it, i) => i === idx ? { ...it, done: !it.done } : it) };
      return next;
    });
  };

  const toggleNice = (idx) => {
    setLists(prev => {
      const next = { ...prev, niceToHave: prev.niceToHave.map((it, i) => i === idx ? { ...it, done: !it.done } : it) };
      return next;
    });
  };

  const allItems = [...lists.essentials, ...lists.niceToHave];
  const totalDone = allItems.filter(i => i.done).length;
  const overallProgress = allItems.length > 0 ? Math.round((totalDone / allItems.length) * 100) : 0;
  const essentialsDone = lists.essentials.filter(i => i.done).length;
  const niceDone = lists.niceToHave.filter(i => i.done).length;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Checklist" subtitle="Track every task from first steps to big day" />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Overall progress', value: overallProgress, suffix: '%' },
          { label: 'Essentials done', value: essentialsDone },
          { label: 'Nice-to-haves done', value: niceDone },
        ].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '8px 0 0' }}>
              <CountUp to={s.value} suffix={s.suffix || ''} />
            </p>
          </div>
        ))}
      </div>

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
    </div>
  );
}
