import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function CountUp({ to, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}{suffix}</>;
}

function ProgressBar({ value }) {
  return (
    <div style={{ height: 3, background: 'rgba(10,10,10,0.08)', width: '100%' }}>
      <div style={{ height: '100%', width: `${value}%`, background: 'linear-gradient(90deg, #E03553, #803D81)', transition: 'width 0.5s' }} />
    </div>
  );
}

function ChecklistSection({ items }) {
  const completed = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div>
      {/* Section progress */}
      <div style={{ padding: '12px 0 16px', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {completed} of {items.length} completed
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {progress}%
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Items */}
      <div>
        {items.map((item, i) => (
          <Link to={item.link} key={i} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '1px solid rgba(10,10,10,0.06)', opacity: item.completed ? 0.55 : 1, cursor: 'pointer' }}
              onMouseEnter={e => { if (!item.completed) e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {item.completed
                ? <CheckCircle2 size={16} style={{ color: '#E03553', flexShrink: 0 }} />
                : <Circle size={16} style={{ color: 'rgba(10,10,10,0.2)', flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: item.completed ? 'line-through' : 'none' }}>
                  {item.title}
                  {item.count !== undefined && (
                    <span style={{ marginLeft: 5, fontSize: 11, color: '#444444', fontWeight: 400 }}>({item.count})</span>
                  )}
                </span>
                <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ChecklistPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ essentials: [], niceToHave: [] });

  useEffect(() => { checkCompletion(); }, []);

  const checkCompletion = async () => {
    try {
      const [invitation, weddingDetails, guests, budget, schedule, vendors, tables] = await Promise.all([
        base44.entities.Invitation.list().catch(() => []),
        base44.entities.WeddingDetails.list().catch(() => []),
        base44.entities.Guest.list().catch(() => []),
        base44.entities.Budget.list().catch(() => []),
        base44.entities.Schedule.list().catch(() => []),
        base44.entities.Vendor.list().catch(() => []),
        base44.entities.Table.list().catch(() => []),
      ]);

      const inv = invitation[0];
      const wd = weddingDetails[0];
      const booked = vendors.filter(v => v.status === 'booked');

      const essentials = [
        { title: 'Set wedding date', description: 'Choose your wedding date', completed: !!inv?.wedding_date, link: createPageUrl('EventDetails') },
        { title: 'Create guest list', description: 'Add your guests', completed: guests.length > 0, link: createPageUrl('Guests'), count: guests.length },
        { title: 'Set budget', description: 'Plan your wedding budget', completed: budget.length > 0, link: createPageUrl('Budget'), count: budget.length },
        { title: 'Book ceremony venue', description: 'Secure your ceremony location', completed: !!wd?.mainCeremony?.venueName, link: createPageUrl('EventDetails') },
        { title: 'Book reception venue', description: 'Secure your reception location', completed: !!wd?.reception?.venueName, link: createPageUrl('EventDetails') },
        { title: 'Book photographer', description: 'Hire your photographer', completed: booked.some(v => v.category === 'photography'), link: createPageUrl('Photography') },
        { title: 'Book caterer', description: 'Secure catering services', completed: booked.some(v => v.category === 'catering'), link: createPageUrl('Catering') },
        { title: 'Send invitations', description: 'Send out wedding invitations', completed: inv?.rsvp_deadline != null, link: createPageUrl('GuestSuite') },
        { title: 'Plan ceremony', description: 'Finalise ceremony details', completed: !!wd?.celebrant?.name, link: createPageUrl('EventDetails') },
        { title: 'Arrange music / DJ', description: 'Book entertainment', completed: booked.some(v => v.category === 'music'), link: createPageUrl('Music') },
      ];

      const niceToHave = [
        { title: 'Create wedding website', description: 'Share details with guests online', completed: !!inv?.personalized_messages, link: createPageUrl('GuestSuite') },
        { title: 'Plan seating chart', description: 'Organise guest seating', completed: tables.length > 0, link: createPageUrl('Seating'), count: tables.length },
        { title: 'Create gift registry', description: 'Set up your registry', completed: false, link: createPageUrl('Registry') },
        { title: 'Book videographer', description: 'Capture video memories', completed: booked.some(v => v.category === 'videography'), link: createPageUrl('Photography') },
        { title: 'Arrange flowers', description: 'Plan floral arrangements', completed: booked.some(v => v.category === 'flowers'), link: createPageUrl('Vendors') },
        { title: 'Plan transportation', description: 'Arrange guest / couple transport', completed: !!wd?.transportation, link: createPageUrl('Vendors') },
        { title: 'Book hair & makeup', description: 'Secure beauty services', completed: booked.some(v => v.category === 'beauty'), link: createPageUrl('Vendors') },
        { title: 'Create our story', description: 'Share your love story', completed: false, link: createPageUrl('OurStory') },
        { title: 'Plan rehearsal dinner', description: 'Organise pre-wedding dinner', completed: !!wd?.rehearsal?.venue, link: createPageUrl('EventDetails') },
        { title: 'Design moodboard', description: 'Create visual inspiration', completed: false, link: createPageUrl('Moodboard') },
      ];

      setStatus({ essentials, niceToHave });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const allItems = [...status.essentials, ...status.niceToHave];
  const totalDone = allItems.filter(i => i.completed).length;
  const overallProgress = allItems.length > 0 ? Math.round((totalDone / allItems.length) * 100) : 0;
  const essentialsDone = status.essentials.filter(i => i.completed).length;
  const niceDone = status.niceToHave.filter(i => i.completed).length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
        <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {/* Sub-header */}
      <div style={{ height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Checklist</span>
      </div>
      {/* Descriptor strip */}
      <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Track every task from first steps to big day</span>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Overall progress', value: overallProgress, suffix: '%' },
          { label: 'Essentials done', value: essentialsDone },
          { label: 'Nice-to-haves done', value: niceDone },
        ].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0 0' }}>
              <CountUp to={s.value} suffix={s.suffix || ''} />
            </p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div style={{ padding: '24px 32px 0', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={labelStyle}>Overall completion</span>
          <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {totalDone} of {allItems.length} completed
          </span>
        </div>
        <div style={{ marginBottom: 24 }}>
          <ProgressBar value={overallProgress} />
        </div>
      </div>

      {/* Checklist sections */}
      <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={labelStyle}>Essentials</span>
            <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {essentialsDone}/{status.essentials.length}
            </span>
          </div>
          <ChecklistSection items={status.essentials} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={labelStyle}>Nice to have</span>
            <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {niceDone}/{status.niceToHave.length}
            </span>
          </div>
          <ChecklistSection items={status.niceToHave} />
        </div>
      </div>
    </div>
  );
}
