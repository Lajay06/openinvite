/**
 * src/components/professional/event/BudgetTab.jsx
 *
 * THE PROFESSIONAL'S OWN BUDGET for this event: their fee, commissions and
 * costs, and what is left. The couple's budget appears beside it, read-only,
 * only when the couple shares it.
 */
import React, { useState } from 'react';
import { useProStore, create, remove } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { money, budgetTotals, COST_KINDS } from '@/lib/professionalMoney';
import { linkedFeedFor } from '@/lib/professionalFeedClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProTable, Stat, Field } from '../ProPage';
import { downloadCsv, fileSlug } from '../proExport';
import { s, PRO } from '../proTheme';

export default function BudgetTab({ event, me, readOnly }) {
  const store = useProStore();
  const mobile = useIsMobile();
  const lines = store.ProCost.filter((c) => c.event_id === event.id);
  const t = budgetTotals(lines);
  const couple = linkedFeedFor(event, store)?.budget || null;
  const editable = !readOnly && can(me, 'money.edit', event);
  const [form, setForm] = useState({ kind: 'fee', label: '', amount: '' });
  const add = (e) => {
    e.preventDefault();
    if (!form.label.trim() || !(Number(form.amount) > 0)) return;
    create('ProCost', { event_id: event.id, kind: form.kind, label: form.label.trim(), amount: Number(form.amount), is_test: true });
    setForm({ kind: form.kind, label: '', amount: '' });
  };
  const csv = () => downloadCsv(`${fileSlug(`${event.couple_names} budget`)}.csv`, ['Kind', 'Line', 'Amount'], lines.map((l) => [COST_KINDS.find((k) => k.key === l.kind)?.label, l.label, l.amount]));

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexDirection: mobile ? 'column' : 'row' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Stat label="Your fee" value={money(t.fee)} />
          <Stat label="Commissions" value={money(t.commission)} />
          <Stat label="Costs" value={money(t.cost)} />
          <Stat label="What you keep" value={money(t.left)} />
        </div>
        {editable && (
          <form onSubmit={add} style={{ ...s.card, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '160px 1fr 140px auto', gap: 12, alignItems: 'end' }}>
            <Field label="Kind"><select style={s.input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{COST_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</select></Field>
            <Field label="Line"><input style={s.input} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Planning fee, final installment" /></Field>
            <Field label="Amount (US$)"><input inputMode="decimal" style={s.input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <button type="submit" style={s.btnPrimary}>Add line</button>
          </form>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" style={s.btnSecondary} onClick={csv}>CSV</button></div>
        <ProTable
          label="Your budget for this event"
          rows={lines}
          empty="No lines yet. Add your fee first."
          columns={[
            { key: 'kind', label: 'Kind', render: (l) => COST_KINDS.find((k) => k.key === l.kind)?.label },
            { key: 'label', label: 'Line', render: (l) => <span style={{ fontWeight: 600 }}>{l.label}</span> },
            { key: 'amount', label: 'Amount', align: 'right', render: (l) => (l.kind === 'cost' ? `minus ${money(l.amount)}` : money(l.amount)) },
            ...(editable ? [{ key: 'x', label: '', render: (l) => <button type="button" style={s.btnQuiet} onClick={() => remove('ProCost', l.id)}>Remove</button> }] : []),
          ]}
        />
      </div>
      <aside aria-label="The couple's budget" style={{ ...s.card, width: mobile ? '100%' : 260, flexShrink: 0 }}>
        <h3 style={{ ...s.cardTitle, marginBottom: 4 }}>The couple&apos;s budget</h3>
        {couple ? (
          <>
            <p style={{ ...s.secondary, margin: '0 0 10px' }}>Shared from their Openinvite. Read-only.</p>
            <div style={s.body}>Total {money(couple.total)}</div>
            <div style={s.body}>Spent {money(couple.spent)}</div>
          </>
        ) : (
          <p style={{ ...s.secondary, margin: 0, color: PRO.muted }}>{event.kind === 'linked' ? 'The couple hasn’t shared their budget. They choose that in their Openinvite.' : 'Shows here when a linked couple shares their budget.'}</p>
        )}
      </aside>
    </div>
  );
}
