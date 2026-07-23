import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, DollarSign, CheckSquare, MessageCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: PJS,
};

const TYPE_LINK = {
  attending: 'Guests',
  declined: 'Guests',
  payment: 'Budget',
  task: 'TodoList',
  questionnaire: 'Polls',
};

function getPill(type) {
  if (type === 'attending') return { label: 'Attending', bg: '#E03553', color: '#FFFFFF', border: 'none', Icon: Check };
  if (type === 'declined')  return { label: 'Declined',  bg: '#0A0A0A', color: '#FFFFFF', border: 'none', Icon: X };
  if (type === 'payment')   return { label: 'Payment',   bg: '#DDF762', color: '#0A0A0A', border: 'none', Icon: DollarSign };
  if (type === 'task')      return { label: 'Task done',  bg: '#803D81', color: '#FFFFFF', border: 'none', Icon: CheckSquare };
  if (type === 'questionnaire') return { label: 'Questionnaire', bg: '#6B2CAE', color: '#FFFFFF', border: 'none', Icon: MessageCircle };
  return { label: 'Update', bg: '#F5F4F0', color: '#0A0A0A', border: '1px solid #E5E5E5', Icon: null };
}

function timeAgo(d) {
  const h = Math.abs(new Date() - new Date(d)) / 3600000;
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RecentActivity({ guests, budget, tasks = [], notes = [], questionnaireResponses = [] }) {
  const navigate = useNavigate();

  const activities = useMemo(() => {
    const ga = guests.filter(g => g.rsvp_date).map(g => ({
      desc: g.name,
      date: g.rsvp_date,
      type: g.rsvp_status,
    }));
    const ba = budget.filter(b => b.payment_date).map(b => ({
      desc: `Payment: ${b.item_name}`,
      date: b.payment_date,
      type: 'payment',
    }));
    const ta = [...tasks, ...notes].filter(t => t.completed).map(t => ({
      desc: `Completed: ${t.title}`,
      date: t.updated_date,
      type: 'task',
    }));
    const qa = questionnaireResponses.map(r => ({
      desc: `${r.guest_name} answered a questionnaire`,
      date: r.submitted_at,
      type: 'questionnaire',
    }));
    return [...ga, ...ba, ...ta, ...qa].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  }, [guests, budget, tasks, notes, questionnaireResponses]);

  return (
    <div>
      <div style={{ padding: '4px 0 12px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={labelStyle}>Recent activity</p>
      </div>
      <div>
        {activities.length > 0 ? activities.map((a, i) => {
          const pill = getPill(a.type);
          const Icon = pill.Icon;
          const target = TYPE_LINK[a.type];
          return (
            <div
              key={i}
              onClick={target ? () => navigate(createPageUrl(target)) : undefined}
              role={target ? 'button' : undefined}
              tabIndex={target ? 0 : undefined}
              onKeyDown={target ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(createPageUrl(target)); } } : undefined}
              style={{
                padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                borderBottom: '1px solid rgba(10,10,10,0.05)',
                cursor: target ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (target) e.currentTarget.style.background = 'rgba(224,53,83,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, margin: 0, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  background: pill.bg, color: pill.color,
                  border: pill.border, borderRadius: 999,
                  fontSize: 10, fontWeight: 600, fontFamily: PJS,
                  padding: '3px 9px 3px 7px', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  {Icon && <Icon size={10} strokeWidth={2.25} />}
                  {pill.label}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                  {timeAgo(a.date)}
                </span>
              </div>
            </div>
          );
        }) : (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>No activity yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
