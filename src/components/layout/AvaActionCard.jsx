/**
 * AvaActionCard — the confirm card, on either surface.
 *
 * Ruling 11: "the pod's mirror is empty until the confirm card is ported to
 * it". This is the port. It was inside AvaModal as a private component; the
 * pod could not import it, and copying it would have made two cards that drift.
 *
 * ONE COMPONENT, TWO SURFACES, VIA A `tone` PROP. The modal is light
 * (#0A0A0A on white) and the pod is dark (#1A1A1A). Every colour the card uses
 * is read from a tone table rather than written inline, so the two can never
 * diverge in anything but colour — and a third surface, if there is ever one,
 * adds a row rather than a component.
 *
 * WHAT THE CARD SAYS IS THE MIRROR'S OWN WORDS. `actionLabel` renders the
 * couple's values in the field names the relevant page uses (spec: "the actual
 * values in the actual field names"), so a couple can check the card against
 * the page it will change.
 */
import React from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { budgetCategoryLabel } from '@/lib/budgetCategories';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TONES = {
  light: {
    border: '1px solid rgba(147,51,234,0.2)', bg: 'rgba(147,51,234,0.04)',
    eyebrow: 'rgba(147,51,234,0.6)', text: '#0A0A0A',
    cancelBorder: '1px solid rgba(10,10,10,0.15)', cancelText: 'rgba(10,10,10,0.6)',
    confirmBg: 'linear-gradient(135deg, #ec4899, #9333ea)', confirmText: '#fff',
    doneText: 'rgba(10,10,10,0.6)',
  },
  // The pod's own surface: it sits on #1A1A1A, so the light card's near-black
  // type would be invisible on it. Same geometry, same copy, inverted values.
  dark: {
    border: '1px solid rgba(255,255,255,0.14)', bg: 'rgba(255,255,255,0.05)',
    eyebrow: 'rgba(255,255,255,0.5)', text: '#FFFFFF',
    cancelBorder: '1px solid rgba(255,255,255,0.2)', cancelText: 'rgba(255,255,255,0.65)',
    confirmBg: '#E03553', confirmText: '#FFFFFF',
    doneText: 'rgba(255,255,255,0.6)',
  },
};

/** What the card says it will do, in the page's own field names. */
export function actionLabel(type, data = {}) {
  switch (type) {
    case 'create_guest':       return `Add "${data.name || 'guest'}" to your guest list`;
    case 'update_guest':       return `Update guest record${data.rsvp_status ? ` → ${data.rsvp_status}` : ''}`;
    case 'create_budget_item': return `Add budget item: ${data.item_name || data.category || 'item'}${data.budgeted_amount ? ` ($${Number(data.budgeted_amount).toLocaleString()})` : ''}`;
    case 'create_vendor':      return `Add ${data.name || 'vendor'} to your vendors${data.category ? ` (${data.category})` : ''}`;
    case 'update_vendor':      return `Update vendor record${data.status ? ` → ${data.status}` : ''}`;
    case 'create_schedule':    return `Add to schedule: "${data.event_name || 'item'}"${data.start_time ? ` at ${data.start_time}` : ''}`;
    case 'create_todo':        return `Add to your to-do list: "${data.title || 'item'}"${data.due_date ? ` — due ${data.due_date}` : ''}`;
    case 'update_todo':        return data.completed
      ? `Tick ${data.title ? `"${data.title}"` : 'that'} off your to-do list`
      : `Update ${data.title ? `"${data.title}"` : 'that to-do'}`;
    case 'set_budget_allocation': return `Set your ${budgetCategoryLabel(data.category || '').toLowerCase()} allocation to $${Number(data.amount || 0).toLocaleString()}`;
    case 'navigate':           return `Go to ${(data.path || '').replace(/^\//, '')} page`;
    default:                   return `Run: ${type}`;
  }
}

/**
 * 'Could not do that' is the fallback, not the message.
 *
 * The executor has always returned a sentence saying what happened, and this
 * card has always thrown it away — every failure, from a refused enum to a
 * to-do that does not exist, read as the same four words. The couple who
 * confirmed a tick-off and got "Could not do that" had no way to learn that
 * Ava had looked for a to-do by a name nothing matched.
 */
const STATUS_TEXT = { done: 'Done', error: 'Could not do that', executing: 'Working…', cancelled: 'Cancelled' };
const statusText = (action) => action.status === 'error' && action.error ? action.error : STATUS_TEXT[action.status];

export default function AvaActionCard({ action, tone = 'light', onConfirm, onCancel }) {
  const t = TONES[tone] || TONES.light;
  const STATUS_ICON = {
    done:      <Check size={12} style={{ color: '#10B981' }} />,
    error:     <AlertCircle size={12} style={{ color: '#E03553' }} />,
    executing: <Loader2 size={12} className="animate-spin" style={{ color: t.eyebrow }} />,
    cancelled: null,
  };

  return (
    <div style={{ margin: '6px 0 4px', padding: '10px 14px', border: t.border, background: t.bg, fontFamily: PJS }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.eyebrow, marginBottom: 5 }}>Ava wants to</div>
      <div style={{ fontSize: 13, color: t.text, marginBottom: action.status === 'pending' ? 10 : 6 }}>
        {actionLabel(action.type, action.data)}
      </div>

      {action.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: t.cancelBorder, background: 'none', color: t.cancelText }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: 'none', background: t.confirmBg, color: t.confirmText }}>
            Confirm
          </button>
        </div>
      )}

      {action.status !== 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          color: action.status === 'done' ? '#10B981' : action.status === 'error' ? '#E03553' : t.doneText }}>
          {STATUS_ICON[action.status]}
          {statusText(action)}
        </div>
      )}
    </div>
  );
}
