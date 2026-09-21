import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { BottomSheet, PillButton, TextField, TextAreaField, Switch, RowGroup, Checkbox, StatusPill, FilterPills } from '../../ui';
import PillChoice from '../../ui/PillChoice';
import { exportImage, isNative } from '../../native';
import { RSVP_LABEL, RSVP_TONE } from '../../lib/format';
import { isAttending, isDeclined, isPending } from '@/lib/guestRsvpTally';

/**
 * StudioShareTab.jsx's password gate, as a sheet. The stored credential is a
 * hash the server never returns, so this is "set a new one or clear it",
 * never "here is your password"; enabled rides in the same patch as the
 * credential so the two cannot disagree (websitePasswordGate.js).
 */
export function PasswordSheet({ open, onClose, enabled, hasStored, onSave }) {
  const [wants, setWants] = useState(!!enabled);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setWants(!!enabled); setDraft(''); } }, [open, enabled]);
  const incomplete = wants && !hasStored && !draft.trim();
  const save = async () => {
    setBusy(true);
    try {
      if (!wants) await onSave({ websitePasswordEnabled: false });
      else if (draft.trim()) await onSave({ websitePassword: draft, websitePasswordEnabled: true });
      else if (hasStored) await onSave({ websitePasswordEnabled: true });
      else { setBusy(false); return; }
      toast.success(wants ? 'Password protection is on' : 'Password protection is off');
      onClose();
    } catch (e) { toast.error(e?.message || 'Could not save the password setting. Try again.'); } finally { setBusy(false); }
  };
  const clear = async () => { setBusy(true); try { await onSave({ websitePassword: '', websitePasswordEnabled: false }); toast.success('Password cleared'); onClose(); } catch { toast.error('Could not clear the password.'); } finally { setBusy(false); } };
  return (
    <BottomSheet open={open} onClose={onClose} title="Password protection" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={busy || incomplete} style={{ flex: 1 }}>{busy ? 'Saving' : 'Save'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="oi-m-row" style={{ padding: '8px 4px', background: 'transparent' }}>
          <div className="oi-m-row__body"><div className="oi-m-row__label">Guests must enter a password</div><div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>Turning it off keeps the password for later.</div></div>
          <Switch on={wants} onChange={setWants} label="Password protection" />
        </div>
        {wants && (
          <>
            <TextField label={hasStored ? 'New password' : 'Password'} type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={hasStored ? 'Type a new one to replace it' : 'Choose a password'} autoCapitalize="off" autoCorrect="off" />
            {hasStored ? <p className="oi-m-meta">A password is set. It cannot be shown again: type a new one to replace it, or <button type="button" className="oi-m-block__link" style={{ display: 'inline', minHeight: 0, padding: 0 }} onClick={clear}>clear it</button>.</p>
              : incomplete && <p className="oi-m-meta">Enter a password to turn protection on. Until you do, your site stays public.</p>}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** StudioShareTab.jsx's QR: drawn in the browser from the slug, never from a third-party encoder; saved as a PNG. */
export function QrSheet({ open, onClose, siteUrl }) {
  const [png, setPng] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !siteUrl) return undefined;
    let live = true;
    import('qrcode').then((qr) => qr.toDataURL(siteUrl, { margin: 1, width: 400, color: { dark: '#0A0A0A', light: '#FFFFFF' } })).then((d) => { if (live) setPng(d); }).catch(() => { if (live) setError('That QR could not be drawn.'); });
    return () => { live = false; };
  }, [open, siteUrl]);
  const save = async () => { const r = await exportImage('wedding-qr.png', png); if (r === 'failed') toast(isNative() ? 'Press and hold the code to save it to Photos.' : 'Could not save the code.'); };
  return (
    <BottomSheet open={open} onClose={onClose} title="QR code" footer={<PillButton variant="primary" block icon={Download} onClick={save} disabled={!png}>Save the code</PillButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {!siteUrl ? <p className="oi-m-body">Your site has no address yet, so there is nothing to encode.</p> : error ? <p className="oi-m-body">{error} The address is {siteUrl.replace(/^https?:\/\//, '')}.</p> : png ? <img src={png} alt={`QR code for ${siteUrl}`} width={220} height={220} style={{ borderRadius: 'var(--m-r-image)', background: '#FFFFFF', padding: 8 }} /> : <div style={{ width: 220, height: 220, borderRadius: 'var(--m-r-image)', background: 'var(--m-neutral)' }} />}
        {siteUrl && <p className="oi-m-meta" style={{ overflowWrap: 'anywhere', textAlign: 'center' }}>{siteUrl.replace(/^https?:\/\//, '')}</p>}
        <p className="oi-m-meta" style={{ textAlign: 'center' }}>Print it on the invitation or a sign at the venue. It opens your site.</p>
      </div>
    </BottomSheet>
  );
}

/* StudioShareTab.jsx's four email types, verbatim. */
const EMAIL_TYPES = [
  { id: 'save-the-date', label: 'Save the date', desc: 'First announcement' },
  { id: 'website-share', label: 'Website share', desc: 'Share your website link' },
  { id: 'rsvp-reminder', label: 'RSVP reminder', desc: 'Nudge non-responders' },
  { id: 'update', label: 'Wedding update', desc: 'Share new information' },
];
const QUICK = [
  { key: 'all', label: 'All guests', test: () => true },
  { key: 'pending', label: 'Not yet replied', test: isPending },
  { key: 'attending', label: 'Attending', test: isAttending },
  { key: 'declined', label: 'Declined', test: isDeclined },
];

/** StudioShareTab.jsx's Email your guests: pick guests, an email type, subject and message ({guestName} personalizes), one SendEmail per guest with the site link appended. */
export function EmailGuestsSheet({ open, onClose, guests = [], siteUrl, onSend }) {
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState('');
  const [type, setType] = useState('website-share');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { if (open) { setSelected(new Set()); setQ(''); setType('website-share'); setSubject(''); setMessage(''); } }, [open]);
  const filtered = useMemo(() => { const s = q.trim().toLowerCase(); return guests.filter((g) => !s || (g.name || '').toLowerCase().includes(s) || (g.email || '').toLowerCase().includes(s)); }, [guests, q]);
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const send = async () => {
    const targets = guests.filter((g) => selected.has(g.id) && g.email);
    if (!targets.length) { toast.error('Choose guests with an email address.'); return; }
    setSending(true);
    let ok = 0; let failed = 0;
    for (const g of targets) {
      try { await onSend({ to: g.email, subject, body: `${message.replace(/{guestName}/g, g.name || 'Guest')}\n\n${siteUrl}` }); ok += 1; } catch { failed += 1; }
    }
    setSending(false);
    if (failed) toast.error(`Sent to ${ok} guest${ok === 1 ? '' : 's'}. ${failed} failed, try again for ${failed === 1 ? 'that guest' : 'those guests'}.`);
    else { toast.success(`Sent to ${ok} guest${ok === 1 ? '' : 's'}`); onClose(); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Email your guests" full footer={<PillButton variant="primary" block icon={Mail} onClick={send} disabled={sending || selected.size === 0 || !subject.trim() || !message.trim()}>{sending ? 'Sending' : selected.size ? `Send to ${selected.size} guest${selected.size === 1 ? '' : 's'}` : 'Choose guests to send'}</PillButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="oi-m-meta">Send your guest suite straight to your guest list.</p>
        <FilterPills options={QUICK.map((f) => ({ key: f.key, label: f.label, count: guests.filter(f.test).length }))} value="" onChange={(k) => { const f = QUICK.find((x) => x.key === k); if (f) setSelected(new Set(guests.filter(f.test).map((g) => g.id))); }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}><TextField label="Find a guest" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" /></div>
          {selected.size > 0 && <PillButton variant="ghost" size="sm" icon={X} onClick={() => setSelected(new Set())} style={{ alignSelf: 'flex-end' }}>Clear {selected.size}</PillButton>}
        </div>
        {filtered.length === 0 ? <p className="oi-m-meta">No guests yet.</p> : (
          <RowGroup>
            {filtered.map((g) => (
              <div key={g.id} className="oi-m-row">
                <Checkbox checked={selected.has(g.id)} onChange={() => toggle(g.id)} label={g.name} />
                <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={() => toggle(g.id)}>
                  <div className="oi-m-row__label">{g.name}</div>
                  <div className="oi-m-row__sub">{g.email || 'No email'}</div>
                </button>
                <StatusPill tone={RSVP_TONE[g.rsvp_status] || 'neutral'}>{RSVP_LABEL[g.rsvp_status] || 'Pending'}</StatusPill>
              </div>
            ))}
          </RowGroup>
        )}
        <PillChoice label="Email type" options={EMAIL_TYPES.map((t) => ({ value: t.id, label: t.label }))} value={type} onChange={(v) => v && setType(v)} hint={EMAIL_TYPES.find((t) => t.id === type)?.desc} />
        <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A subject line" />
        <TextAreaField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Write the email. Your site link is added at the end." />
        <p className="oi-m-meta">Use {'{guestName}'} to personalize each email automatically.</p>
      </div>
    </BottomSheet>
  );
}
