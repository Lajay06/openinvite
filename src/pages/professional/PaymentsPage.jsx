/**
 * src/pages/professional/PaymentsPage.jsx
 *
 * THE PAYMENT SCHEDULE ACROSS EVERY EVENT, opening on "Due this week".
 * Only events the member may see money on.
 */
import React from 'react';
import { useProStore, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { money, dueThisWeek, isOverdue, total } from '@/lib/professionalMoney';
import { ProPage, ProEmpty, Stat } from '@/components/professional/ProPage';
import PaymentRows from '@/components/professional/PaymentRows';

export default function PaymentsPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const events = store.ProEvent.filter((e) => can(me, 'money.view', e));
  const ids = new Set(events.map((e) => e.id));
  const payments = store.PaymentDue.filter((p) => ids.has(p.event_id));
  const week = dueThisWeek(payments);
  const overdue = payments.filter((p) => isOverdue(p));
  const editable = events.some((e) => can(me, 'money.edit', e));

  if (!events.length) {
    return <ProPage title="Payments"><ProEmpty title="No payments to show" line="Payments show for events where you look after the money." /></ProPage>;
  }
  return (
    <ProPage title="Payments" subtitle="Tracking only. Nothing is charged here.">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Stat label="Due this week" value={money(total(week))} sub={`${week.length} payment${week.length === 1 ? '' : 's'}`} />
        <Stat label="Overdue" value={money(total(overdue))} sub={`${overdue.length} payment${overdue.length === 1 ? '' : 's'}`} />
        <Stat label="Still due, all events" value={money(total(payments.filter((p) => p.status === 'due')))} />
      </div>
      <PaymentRows payments={payments} events={events} editable={editable} />
    </ProPage>
  );
}
