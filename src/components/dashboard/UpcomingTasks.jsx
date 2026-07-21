import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const CATEGORY_COLOURS = {
  ceremony:      "#E03553",
  reception:     "#803D81",
  photography:   "#6B2CAE",
  preparation:   "#3a7a96",
  transportation:"#8a9a00",
  rehearsal:     "#0A1930",
  pre_wedding:   "#803D81",
  post_wedding:  "#6B2CAE",
  other:         "rgba(10,10,10,0.3)",
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function UpcomingTasks({ schedule }) {
  const navigate = useNavigate();
  const upcoming = React.useMemo(() =>
    [...schedule].sort((a, b) => {
      const dateCompare = (a.event_date || '').localeCompare(b.event_date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time || '').localeCompare(b.start_time || '');
    }).slice(0, 6),
    [schedule]
  );

  return (
    <div>
      <div style={{ padding: '4px 0 12px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={labelStyle}>Upcoming events</p>
        <Link to={createPageUrl("Schedule")} style={{ ...labelStyle, fontSize: 9, color: 'rgba(10,10,10,0.6)', textDecoration: 'none' }}>View all</Link>
      </div>
      <div>
        {upcoming.length > 0 ? upcoming.map(ev => {
          const colour = CATEGORY_COLOURS[ev.category] || "rgba(10,10,10,0.3)";
          return (
            <div
              key={ev.id}
              onClick={() => navigate(createPageUrl("Schedule"))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(createPageUrl("Schedule")); } }}
              style={{
                padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(10,10,10,0.05)', cursor: 'pointer', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: colour, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.event_name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
                    {ev.event_date ? format(new Date(`${ev.event_date}T00:00:00`), 'MMM d') : ''}
                    {ev.event_date && ev.start_time ? ' · ' : ''}
                    {ev.start_time ? format(new Date(`2024-01-01T${ev.start_time}`), 'h:mm a') : ''}
                  </p>
                </div>
              </div>
              <span style={{
                background: colour, color: '#fff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
                padding: '3px 8px', borderRadius: 999, flexShrink: 0, marginLeft: 8,
              }}>
                {ev.category?.replace(/_/g, ' ')}
              </span>
            </div>
          );
        }) : (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 10 }}>No events scheduled.</p>
            <Link to={createPageUrl("Schedule")} className="btn-editorial-secondary" style={{ fontSize: 10, padding: '6px 16px' }}>Add event</Link>
          </div>
        )}
      </div>
    </div>
  );
}
