import React, { useEffect, useMemo, useState } from 'react';
import { Search, Send, UserPlus, BookUser } from 'lucide-react';
import toast from 'react-hot-toast';
import { BottomSheet, RowGroup, Checkbox, PillButton, StatusPill, SkeletonRows, EmptyState } from '../../ui';
import { initials } from '../../lib/format';
import { toE164 } from '@/lib/phoneE164';
import { hapticLight } from '../../native';

/**
 * Contacts import (goal 8, item 9): pick people from the phone's contacts
 * and add them as guests through the existing create-guest mutation, with
 * name, email, phone and address mapped to the desktop's guest fields
 * (`name`, `email`, `phone` in E.164, `mailing_address`). A searchable
 * multi-select; each contact that is already on the list is marked and
 * cannot be chosen twice (matched by email, by phone digits, or by name).
 * Permission is asked for only when this sheet opens (native.ts
 * readContacts). Then "Invite now" hands the new guests to Send invites.
 *
 * props: open, onClose, api, existingGuests, country, onCreate(fields),
 * onImported(created[]), onInvite(created[])
 */
const norm = (s) => String(s || '').trim().toLowerCase();
const digits = (s) => String(s || '').replace(/\D/g, '').slice(-9);

export function findDuplicate(contact, guests = []) {
  const email = norm(contact.email); const ph = digits(contact.phone); const name = norm(contact.name);
  return guests.find((g) => (email && norm(g.email) === email) || (ph && ph.length >= 6 && digits(g.phone) === ph) || (name && norm(g.name) === name)) || null;
}

export function contactToGuest(c, country = 'AU') {
  return {
    name: c.name || c.email || c.phone,
    ...(c.email ? { email: c.email } : {}),
    ...(c.phone ? { phone: toE164(c.phone, country) || c.phone } : {}),
    ...(c.address ? { mailing_address: c.address } : {}),
    rsvp_status: 'pending',
  };
}

export default function ContactsImportSheet({ open, onClose, api, existingGuests = [], country = 'AU', onCreate, onImported, onInvite }) {
  const [state, setState] = useState({ loading: true, status: null, contacts: [] });
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // created guests, for "Invite now"

  useEffect(() => {
    if (!open) { setSelected(new Set()); setQ(''); setDone(null); return undefined; }
    let live = true;
    setState({ loading: true, status: null, contacts: [] });
    api.contacts().then((r) => { if (live) setState({ loading: false, status: r.status, contacts: r.contacts || [] }); }).catch(() => { if (live) setState({ loading: false, status: 'unavailable', contacts: [] }); });
    return () => { live = false; };
  }, [open, api]);

  const rows = useMemo(() => state.contacts.map((c) => ({ ...c, dup: findDuplicate(c, existingGuests) })), [state.contacts, existingGuests]);
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return s ? rows.filter((c) => [c.name, c.email, c.phone].some((v) => (v || '').toLowerCase().includes(s))) : rows; }, [rows, q]);
  const toggle = (c) => setSelected((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; });
  const chosen = rows.filter((c) => selected.has(c.id) && !c.dup);

  const add = async () => {
    if (!chosen.length) return;
    setBusy(true);
    const created = []; let failed = 0;
    for (const c of chosen) {
      try { const g = await onCreate(contactToGuest(c, country)); created.push(g && g.id ? g : { ...contactToGuest(c, country), id: g?.id }); } catch { failed++; }
    }
    setBusy(false);
    hapticLight();
    if (created.length) toast.success(`${created.length} guest${created.length === 1 ? '' : 's'} added from your contacts`);
    if (failed) toast.error(`${failed} could not be added`);
    onImported?.(created);
    if (created.length) setDone(created); else onClose();
  };

  const footer = done ? (
    <>
      <PillButton variant="secondary" onClick={onClose}>Done</PillButton>
      <PillButton variant="primary" style={{ flex: 1 }} icon={Send} onClick={() => { onInvite?.(done); onClose(); }}>Invite now</PillButton>
    </>
  ) : (
    <>
      <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
      <PillButton variant="primary" style={{ flex: 1 }} icon={UserPlus} onClick={add} disabled={busy || chosen.length === 0}>{busy ? 'Adding' : `Add ${chosen.length || ''} guest${chosen.length === 1 ? '' : 's'}`}</PillButton>
    </>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={done ? 'Added' : 'From contacts'} full footer={footer}>
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="oi-m-body">{done.length} guest{done.length === 1 ? ' is' : 's are'} on your list. Invite {done.length === 1 ? 'them' : 'them all'} now, or come back to it from Send invites.</p>
          <RowGroup>{done.map((g, i) => <div key={g.id || i} className="oi-m-row"><span className="oi-m-row__tile" style={{ fontSize: 12, fontWeight: 600 }}>{initials(g.name)}</span><div className="oi-m-row__body"><div className="oi-m-row__label">{g.name}</div><div className="oi-m-row__sub">{[g.email, g.phone].filter(Boolean).join(', ') || 'No email or phone'}</div></div></div>)}</RowGroup>
        </div>
      ) : state.loading ? <SkeletonRows count={8} /> : state.status === 'denied' ? (
        <EmptyState icon={BookUser} text="Openinvite was not allowed to read your contacts. Allow it in Settings, Openinvite, Contacts, or import from a file instead." />
      ) : state.status === 'unavailable' ? (
        <EmptyState icon={BookUser} text="Contacts are read from the phone. On the web, import from a CSV or Excel file instead." />
      ) : rows.length === 0 ? (
        <EmptyState icon={BookUser} text="No contacts with a name, email or phone number were found." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
            <input className="oi-m-input" style={{ paddingLeft: 42 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your contacts" aria-label="Search your contacts" />
          </div>
          <div className="oi-m-section-head">
            <span className="oi-m-meta">{chosen.length} chosen, {rows.filter((c) => c.dup).length} already guests</span>
            <button type="button" className="oi-m-block__link" onClick={() => setSelected((s) => { const free = shown.filter((c) => !c.dup); const all = free.every((c) => s.has(c.id)); const n = new Set(s); free.forEach((c) => (all ? n.delete(c.id) : n.add(c.id))); return n; })}>{shown.filter((c) => !c.dup).every((c) => selected.has(c.id)) && shown.some((c) => !c.dup) ? 'Clear' : 'Select all shown'}</button>
          </div>
          {shown.length === 0 ? <EmptyState icon={Search} text="No contacts match." /> : (
            <RowGroup>
              {shown.map((c) => (
                <div key={c.id} className="oi-m-row" style={c.dup ? { opacity: 0.7 } : undefined}>
                  <Checkbox checked={selected.has(c.id) && !c.dup} onChange={() => !c.dup && toggle(c)} label={c.name} disabled={!!c.dup} />
                  <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={() => !c.dup && toggle(c)} disabled={!!c.dup}>
                    <div className="oi-m-row__label">{c.name || c.email || c.phone}</div>
                    <div className="oi-m-row__sub">{[c.email, c.phone].filter(Boolean).join(', ') || 'No email or phone'}</div>
                  </button>
                  {c.dup ? <StatusPill tone="neutral">Already a guest</StatusPill> : <span className="oi-m-row__tile" style={{ fontSize: 12, fontWeight: 600 }}>{initials(c.name)}</span>}
                </div>
              ))}
            </RowGroup>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
