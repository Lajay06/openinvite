import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Calendar, MapPin, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORY_CONFIG = {
  ceremony:       { bg: '#E03553',               text: '#FFFFFF', label: 'Ceremony' },
  reception:      { bg: '#803D81',               text: '#FFFFFF', label: 'Reception' },
  photography:    { bg: '#0A1930',               text: '#FFFFFF', label: 'Photography' },
  preparation:    { bg: '#DDF762',               text: '#0A1930', label: 'Preparation' },
  transportation: { bg: 'rgba(221,247,98,0.6)',  text: '#0A1930', label: 'Transportation' },
  rehearsal:      { bg: '#0A0A0A',               text: '#FFFFFF', label: 'Rehearsal' },
  pre_wedding:    { bg: 'rgba(128,61,129,0.2)',  text: '#803D81', label: 'Pre-wedding' },
  post_wedding:   { bg: 'rgba(224,53,83,0.12)', text: '#E03553', label: 'Post-wedding' },
  other:          { bg: 'rgba(10,10,10,0.07)',   text: '#444444', label: 'Other' },
};

// These backgrounds are light-coloured and need a border for the timeline dot to be visible
const LIGHT_BACKGROUNDS = new Set([
  'rgba(10,10,10,0.07)', 'rgba(128,61,129,0.2)',
  'rgba(224,53,83,0.12)', 'rgba(221,247,98,0.6)', '#DDF762',
]);

function fmtTime(t) {
  if (!t) return '';
  try {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return t; }
}

function fmtDateHeading(d) {
  if (!d) return 'NO DATE SET';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return d; }
}

export default function GuestSuiteSchedule() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Schedule.list('start_time')
      .then(data => setItems(data || []))
      .catch(e => console.error('GuestSuiteSchedule load error', e))
      .finally(() => setLoading(false));
  }, []);

  // Group by date preserving sort order from entity
  const grouped = items.reduce((acc, item) => {
    const key = item.event_date || '__nodate__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Schedule"
        subtitle="Your wedding day timeline — read only"
      />

      {/* Connected banner */}
      <div style={{
        padding: '10px 32px',
        background: 'rgba(224,53,83,0.04)',
        borderBottom: '1px solid rgba(224,53,83,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ This schedule is pulled from Day of → Schedule and is visible to guests
        </span>
        <button
          onClick={() => navigate(createPageUrl('Schedule'))}
          style={{
            fontSize: 12, fontWeight: 700, color: '#E03553',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS,
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}
        >
          Edit in Schedule planning page <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{
              width: 48, height: 48, background: 'rgba(10,10,10,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Calendar size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              No schedule events yet
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px', lineHeight: 1.6 }}>
              Build your wedding day timeline in Day of → Schedule and it will appear here automatically.
            </p>
            <button
              onClick={() => navigate(createPageUrl('Schedule'))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 700, color: '#E03553',
                background: 'none', border: '1px solid rgba(224,53,83,0.3)',
                borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontFamily: PJS,
              }}
            >
              Build timeline in Schedule <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {Object.entries(grouped).map(([date, dateItems]) => (
              <div key={date}>
                {/* Date heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    color: 'rgba(10,10,10,0.4)', fontFamily: PJS, whiteSpace: 'nowrap',
                  }}>
                    {fmtDateHeading(date)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                    {dateItems.length} {dateItems.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {/* Timeline */}
                <div style={{ position: 'relative', paddingLeft: 92 }}>
                  {/* Vertical spine */}
                  <div style={{
                    position: 'absolute', left: 76, top: 6, bottom: 6,
                    width: 1, background: 'rgba(10,10,10,0.08)',
                  }} />

                  {dateItems.map((item, idx) => {
                    const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                    const isLight = LIGHT_BACKGROUNDS.has(cfg.bg);
                    const dotColor = isLight ? cfg.text : cfg.bg;

                    return (
                      <div key={item.id || idx} style={{ position: 'relative', marginBottom: idx < dateItems.length - 1 ? 24 : 0 }}>
                        {/* Time column */}
                        <div style={{ position: 'absolute', left: -92, top: 2, width: 68, textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1.3 }}>
                            {fmtTime(item.start_time) || '—'}
                          </span>
                          {item.end_time && (
                            <span style={{ display: 'block', fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
                              {fmtTime(item.end_time)}
                            </span>
                          )}
                        </div>

                        {/* Timeline dot */}
                        <div style={{
                          position: 'absolute', left: -20, top: 6,
                          width: 10, height: 10, borderRadius: '50%',
                          background: dotColor,
                          border: isLight ? '1.5px solid rgba(10,10,10,0.15)' : 'none',
                        }} />

                        {/* Event card */}
                        <div style={{ border: '1px solid rgba(10,10,10,0.07)', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: item.description || item.location ? 6 : 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, flex: 1, lineHeight: 1.3 }}>
                              {item.event_name}
                            </span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                              padding: '2px 8px', borderRadius: 999, flexShrink: 0,
                              background: cfg.bg, color: cfg.text, fontFamily: PJS,
                            }}>
                              {cfg.label}
                            </span>
                          </div>

                          {item.description && (
                            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 6px', lineHeight: 1.5 }}>
                              {item.description}
                            </p>
                          )}

                          {item.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS }}>
                              <MapPin size={11} strokeWidth={1.8} />
                              {item.location}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
