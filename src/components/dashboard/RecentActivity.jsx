import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Wallet, Store, Calendar, Image, ListTodo, MessageCircle,
  Check, X, HelpCircle, DollarSign, CheckCircle2, CalendarPlus, Plus, CheckSquare,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { color, font } from '@/styles/tokens';

const PJS = font.family;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: color.textMuted,
  fontFamily: PJS,
};

// Category icon on the left — signals "what area of the wedding", distinct
// from the pill on the right which signals "what happened". Same icon set
// AnimatedSidebar/TopBarSearch already use per page, for a consistent
// mental model across the app.
const CATEGORY_ICON = {
  guest: Users,
  budget: Wallet,
  vendor: Store,
  schedule: Calendar,
  design: Image,
  task: ListTodo,
  questionnaire: MessageCircle,
};

const CATEGORY_TARGET_PAGE = {
  guest: 'Guests',
  budget: 'Budget',
  vendor: 'Vendors',
  schedule: 'Schedule',
  design: 'Moodboard',
  task: 'TodoList',
  questionnaire: 'Polls',
};

const RSVP_LABEL = { attending: 'yes', declined: 'no', maybe: 'maybe' };

// Matches VendorForm.jsx's CATEGORIES — a human, role-based noun reads
// better in a feed than the raw category slug ("Photographer booked" vs
// "Photography booked").
const VENDOR_CATEGORY_ROLE = {
  venue: 'Venue', catering: 'Caterer', photography: 'Photographer', videography: 'Videographer',
  flowers: 'Florist', music: 'Music vendor', bakery: 'Bakery', transportation: 'Transport vendor',
  beauty: 'Hair & makeup artist', attire: 'Stylist', planning: 'Planner', decorations: 'Decorator',
  entertainment: 'Entertainment vendor', other: 'Vendor',
};

function getPill(type) {
  if (type === 'attending')    return { label: 'Attending',    bg: color.red,               color: color.white, border: 'none', Icon: Check };
  if (type === 'declined')     return { label: 'Declined',     bg: color.black,              color: color.white, border: 'none', Icon: X };
  if (type === 'maybe')        return { label: 'Maybe',        bg: 'rgba(10,10,10,0.07)',    color: color.textMuted, border: `1px solid ${color.border}`, Icon: HelpCircle };
  if (type === 'payment')      return { label: 'Payment',      bg: color.lime,               color: color.black, border: 'none', Icon: DollarSign };
  if (type === 'vendor')       return { label: 'Booked',       bg: color.lime,               color: color.black, border: 'none', Icon: CheckCircle2 };
  if (type === 'schedule')     return { label: 'Scheduled',    bg: color.navy,               color: color.white, border: 'none', Icon: CalendarPlus };
  if (type === 'design')       return { label: 'Added',        bg: color.purple,             color: color.white, border: 'none', Icon: Plus };
  if (type === 'task')         return { label: 'Task done',    bg: color.purple,             color: color.white, border: 'none', Icon: CheckSquare };
  if (type === 'questionnaire') return { label: 'Questionnaire', bg: '#6B2CAE',              color: color.white, border: 'none', Icon: MessageCircle };
  return { label: 'Update', bg: '#F5F4F0', color: color.black, border: `1px solid ${color.border}`, Icon: null };
}

function timeAgo(d) {
  const minutes = Math.abs(new Date() - new Date(d)) / 60000;
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Where a click should land — the record's own id as `highlightId`, which
// the destination page/list resolves into a scroll + brief highlight (same
// mechanism TopBarSearch's goTo() uses). Budget only renders its table on
// the "expenses" tab, so that needs to switch too; Schedule/Moodboard
// resolve their own tab/board on arrival.
function linkStateFor(category, recordId) {
  if (!recordId) return undefined;
  if (category === 'budget') return { highlightId: recordId, activityTab: 'expenses' };
  return { highlightId: recordId };
}

export default function RecentActivity({ guests = [], budget = [], schedule = [], vendors = [], moodboardItems = [], tasks = [], notes = [], questionnaireResponses = [] }) {
  const navigate = useNavigate();

  const activities = useMemo(() => {
    const ga = guests
      .filter(g => g.rsvp_date && RSVP_LABEL[g.rsvp_status])
      .map(g => ({
        id: `guest-${g.id}`,
        desc: `${g.name} RSVP'd ${RSVP_LABEL[g.rsvp_status]}`,
        date: g.rsvp_date,
        category: 'guest',
        type: g.rsvp_status,
        recordId: g.id,
      }));

    const ba = budget
      .filter(b => b.payment_date && b.item_name)
      .map(b => ({
        id: `budget-${b.id}`,
        desc: `$${Math.round(b.actual_amount || b.budgeted_amount || 0).toLocaleString()} paid for ${b.item_name}`,
        date: b.payment_date,
        category: 'budget',
        type: 'payment',
        recordId: b.id,
      }));

    // Vendor.status has no change history — this reads off the *current*
    // status at the record's most recent timestamp, same best-effort
    // approach as the task/note "completed" entries below.
    const va = vendors
      .filter(v => v.status === 'booked' && v.name && (v.updated_date || v.created_date))
      .map(v => ({
        id: `vendor-${v.id}`,
        desc: `${VENDOR_CATEGORY_ROLE[v.category] || 'Vendor'} booked: ${v.name}`,
        date: v.updated_date || v.created_date,
        category: 'vendor',
        type: 'vendor',
        recordId: v.id,
      }));

    const sa = schedule
      .filter(s => s.created_date && s.event_name)
      .map(s => ({
        id: `schedule-${s.id}`,
        desc: `${s.event_name} added to the run sheet`,
        date: s.created_date,
        category: 'schedule',
        type: 'schedule',
        recordId: s.id,
      }));

    const da = moodboardItems
      .filter(m => m.created_date && m.title)
      .map(m => ({
        id: `design-${m.id}`,
        desc: `New moodboard item: ${m.title}`,
        date: m.created_date,
        category: 'design',
        type: 'design',
        recordId: m.id,
      }));

    const ta = [...tasks, ...notes]
      .filter(t => t.completed && t.title)
      .map(t => ({
        id: `task-${t.id}`,
        desc: `Completed: ${t.title}`,
        date: t.updated_date,
        category: 'task',
        type: 'task',
        recordId: t.id,
      }));

    const qa = questionnaireResponses
      .filter(r => r.guest_name && r.submitted_at)
      .map((r, i) => ({
        id: `qna-${r.id || i}`,
        desc: `${r.guest_name} answered a questionnaire`,
        date: r.submitted_at,
        category: 'questionnaire',
        type: 'questionnaire',
        recordId: null,
      }));

    return [...ga, ...ba, ...va, ...sa, ...da, ...ta, ...qa]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [guests, budget, schedule, vendors, moodboardItems, tasks, notes, questionnaireResponses]);

  return (
    <div>
      <div style={{ padding: '4px 0 12px', borderBottom: `1px solid ${color.border}` }}>
        <p style={labelStyle}>Recent activity</p>
      </div>
      <div>
        {activities.length > 0 ? activities.map((a) => {
          const pill = getPill(a.type);
          const PillIcon = pill.Icon;
          const CategoryIcon = CATEGORY_ICON[a.category];
          const targetPage = CATEGORY_TARGET_PAGE[a.category];
          const linkState = linkStateFor(a.category, a.recordId);
          const goTo = () => {
            if (!targetPage) return;
            navigate(createPageUrl(targetPage), linkState ? { state: linkState } : undefined);
          };
          return (
            <div
              key={a.id}
              onClick={targetPage ? goTo : undefined}
              role={targetPage ? 'button' : undefined}
              tabIndex={targetPage ? 0 : undefined}
              onKeyDown={targetPage ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(); } } : undefined}
              style={{
                padding: '7px 4px', margin: '0 -4px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: `1px solid rgba(10,10,10,0.05)`,
                cursor: targetPage ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (targetPage) e.currentTarget.style.background = 'rgba(224,53,83,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: color.border, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {CategoryIcon && <CategoryIcon size={13} strokeWidth={1.9} style={{ color: color.iconMuted }} />}
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: color.black, fontFamily: PJS, margin: 0, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  background: pill.bg, color: pill.color,
                  border: pill.border, borderRadius: 999,
                  fontSize: 10, fontWeight: 600, fontFamily: PJS,
                  padding: '3px 9px 3px 7px', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  {PillIcon && <PillIcon size={10} strokeWidth={2.25} />}
                  {pill.label}
                </span>
                <span style={{ fontSize: 11, color: color.textMuted, fontFamily: PJS, whiteSpace: 'nowrap' }}>
                  {timeAgo(a.date)}
                </span>
              </div>
            </div>
          );
        }) : (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: color.textMuted, fontFamily: PJS }}>No activity yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
