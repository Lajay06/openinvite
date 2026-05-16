import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const ACTIONS = [
  { label: "Guest list", url: "Guests", desc: "Manage RSVPs and guest info" },
  { label: "Budget", url: "Budget", desc: "Track expenses and spending" },
  { label: "Schedule", url: "Schedule", desc: "Build your wedding timeline" },
  { label: "Invitations", url: "Invitations", desc: "Design digital invites" },
];

export default function QuickActions() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
      {ACTIONS.map(({ label, url, desc }) => (
        <Link key={label} to={createPageUrl(url)}
          style={{ background: '#fff', padding: '24px', borderRight: '1px solid rgba(10,10,10,0.08)', textDecoration: 'none', display: 'block', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0A0A0A'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          className="group">
          <p style={{ ...labelStyle, marginBottom: 8 }} className="group-hover:text-[rgba(255,255,255,0.4)]">{label}</p>
          <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="group-hover:text-white">{desc}</p>
        </Link>
      ))}
    </div>
  );
}
