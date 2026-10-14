/**
 * src/components/professional/event/PaymentsTab.jsx
 *
 * This event's payment schedule.
 */
import React from 'react';
import { useProStore } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import PaymentRows from '../PaymentRows';
import { fileSlug } from '../proExport';

export default function PaymentsTab({ event, me, readOnly }) {
  const store = useProStore();
  const payments = store.PaymentDue.filter((p) => p.event_id === event.id);
  return (
    <PaymentRows
      payments={payments}
      events={[event]}
      editable={!readOnly && can(me, 'money.edit', event)}
      showEvent={false}
      defaultFilter="all"
      defaultEventId={event.id}
      csvName={`${fileSlug(`${event.couple_names} payments`)}.csv`}
    />
  );
}
