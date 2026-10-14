/**
 * src/pages/professional/VendorBookPage.jsx
 *
 * THE VENDOR BOOK ACROSS ALL EVENTS: reusable contacts with role, company,
 * phone, email, insurance expiry and notes, and how many events each is on.
 */
import React, { useState } from 'react';
import { useProStore, CURRENT } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { insuranceState, INSURANCE_TEXT } from '@/lib/professionalVendors';
import { shortDate } from '@/lib/professionalEvents';
import { ProPage, ProTable, Pill } from '@/components/professional/ProPage';
import VendorDialog from '@/components/professional/VendorDialog';
import { downloadCsv } from '@/components/professional/proExport';
import { s } from '@/components/professional/proTheme';

const TONE = { expired: 'bad', soon: 'wait', ok: 'good', none: 'plain' };

export default function VendorBookPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const editable = can(me, 'workspace.templates');
  const vendors = store.VendorContact.filter((v) => v.workspace_id === CURRENT.workspaceId)
    .filter((v) => !q || `${v.company} ${v.role} ${v.contact}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.company.localeCompare(b.company));
  const uses = (id) => store.ProVendorBooking.filter((b) => b.vendor_id === id).length;

  const csv = () => downloadCsv('vendor-book.csv', ['Company', 'Role', 'Contact', 'Phone', 'Email', 'Insurance expires', 'Events', 'Notes'],
    vendors.map((v) => [v.company, v.role, v.contact, v.phone, v.email, v.insurance_expires || '', uses(v.id), v.notes]));

  return (
    <ProPage
      title="Vendor book"
      subtitle={`${vendors.length} vendors`}
      actions={(
        <>
          <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
          {editable && <button type="button" style={s.btnPrimary} onClick={() => setEditing({})}>Add a vendor</button>}
        </>
      )}
    >
      <div style={{ marginBottom: 12, maxWidth: 320 }}>
        <input aria-label="Search vendors" placeholder="Search by company, role or contact" value={q} onChange={(e) => setQ(e.target.value)} style={s.input} />
      </div>
      <ProTable
        label="Vendor book"
        rows={vendors}
        onRowClick={editable ? (v) => setEditing(v) : undefined}
        empty="No vendors yet. Add the people you book again and again."
        columns={[
          { key: 'company', label: 'Company', render: (v) => <span style={{ fontWeight: 600 }}>{v.company}</span> },
          { key: 'role', label: 'Role' },
          { key: 'contact', label: 'Contact' },
          { key: 'phone', label: 'Phone', render: (v) => (v.phone ? <a href={`tel:${v.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit' }}>{v.phone}</a> : '') },
          { key: 'email', label: 'Email' },
          { key: 'ins', label: 'Insurance', render: (v) => { const st = insuranceState(v.insurance_expires); return <span title={v.insurance_expires ? shortDate(v.insurance_expires) : ''}><Pill tone={TONE[st]}>{INSURANCE_TEXT[st]}</Pill></span>; } },
          { key: 'uses', label: 'Events', align: 'right', render: (v) => uses(v.id) },
        ]}
      />
      {editing && <VendorDialog vendor={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </ProPage>
  );
}
