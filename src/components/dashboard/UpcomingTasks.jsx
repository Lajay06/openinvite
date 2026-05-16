import React from 'react';
import { Link } from "react-router-dom";
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
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function UpcomingTasks({ schedule }) {
  const upcoming = React.useMemo(() =>
    [...schedule].sort((a, b) => a.start_time?.localeCompare(b.start_time)).slice(0, 6),
    [schedule]
  );

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={labelStyle}>Upcoming events</p>
        <Link to={createPageUrl("Schedule")} style={{ ...labelStyle, fontSize: 9, color: 'rgba(10,10,10,0.4)', textDecoration: 'none' }}>View all</Link>
      </div>
      <div>
        {upcoming.length > 0 ? upcoming.map(ev => {
          const colour = CATEGORY_COLOURS[ev.category] || "rgba(10,10,10,0.3)";
          return (
            <div key={ev.id} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: colour, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ev.event_name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {ev.start_time ? format(new Date(`2024-01-01T${ev.start_time}`), 'h:mm a') : ''}
                  </p>
                </div>
              </div>
              <span style={{
                background: colour, color: '#fff',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 999,
              }}>
                {ev.category?.replace(/_/g, ' ')}
              </span>
            </div>
          );
        }) : (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 12 }}>No events scheduled.</p>
            <Link to={createPageUrl("Schedule")} className="btn-editorial-secondary" style={{ fontSize: 10, padding: '6px 16px' }}>Add event</Link>
          </div>
        )}
      </div>
    </div>
  );
}
