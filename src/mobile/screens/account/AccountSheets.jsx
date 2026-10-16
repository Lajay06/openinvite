import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { WHAT_IS_DELETED } from '../../lib/accountDeletion';
import { BottomSheet, PillButton, TextField, SelectField, Switch, Row, RowGroup } from '../../ui';
import PillChoice from '../../ui/PillChoice';
import { useOnline } from '../../shell/OfflineBanner';
import { CURRENCIES } from '@/contexts/CurrencyContext';
import { DEFAULT_NOTIFICATION_PREFS } from '@/lib/notificationPrefs';

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}, ${c.name}` }));
const UNITS = [{ value: 'C', label: 'Celsius' }, { value: 'F', label: 'Fahrenheit' }];

/**
 * Account details, as Account.jsx's Settings tab: the name
 * (base44.auth.updateMe full_name), the currency (CurrencyModal) and the
 * temperature unit (tempUnit). The email cannot change here, and the password
 * changes through Forgot password on the sign-in screen: the app links to no
 * account page of the website (App Store rule 3.1.1, ruling 1).
 */
export function AccountDetailsSheet({ open, user, currencyCode, onClose, onSave }) {
  const offline = !useOnline();
  const [f, setF] = useState({ full_name: '', currency: 'USD', tempUnit: 'C' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setF({ full_name: user?.full_name || '', currency: currencyCode || user?.currency || 'USD', tempUnit: user?.tempUnit || 'C' }); setError(''); } }, [open, user, currencyCode]);
  const submit = async () => {
    if (!f.full_name.trim()) { setError('Add your name.'); return; }
    setSaving(true);
    try { await onSave({ ...f, full_name: f.full_name.trim() }); onClose(); } catch { setError(offline ? 'You are offline. Your details are not saved. Try again once you are back on a connection.' : 'Your details did not save. Try again.'); } finally { setSaving(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Account details" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Save'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Your name" value={f.full_name} onChange={(e) => setF((s) => ({ ...s, full_name: e.target.value }))} autoCapitalize="words" error={error} />
        <TextField label="Email" value={user?.email || ''} readOnly />
        <SelectField label="Currency" value={f.currency} onChange={(e) => setF((s) => ({ ...s, currency: e.target.value }))} options={CURRENCY_OPTIONS} />
        <PillChoice label="Temperature" options={UNITS} value={f.tempUnit} onChange={(v) => v && setF((s) => ({ ...s, tempUnit: v }))} hint="For the weather on your Guest Suite and in the app" />
        <RowGroup><Row icon={KeyRound} tile="neutral" label="Password" sub="To change it, log out and choose Forgot password" /></RowGroup>
      </div>
    </BottomSheet>
  );
}

const PREF_ROWS = [
  { key: 'instant_email_rsvp', title: 'Instant email on RSVP', sub: 'Get emailed as soon as a guest responds' },
  { key: 'instant_email_collaborator', title: 'Instant email on collaborator activity', sub: 'Get emailed when a collaborator joins or makes changes' },
  { key: 'weekly_digest', title: 'Weekly digest', sub: 'A weekly summary of RSVPs, tasks and activity' },
  { key: 'in_app_only', title: 'In-app only', sub: 'Turn off all emails above. You still see everything in the bell' },
];

/** Email notification preferences, as Account.jsx's Notifications tab: each switch saves `notification_prefs` at once. */
export function EmailPreferencesSheet({ open, user, onClose, onSave }) {
  const offline = !useOnline();
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notification_prefs || {}) }));
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (open) { setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notification_prefs || {}) }); setFailed(false); } }, [open, user]);
  const toggle = async (key, on) => {
    const previous = prefs;
    const next = { ...prefs, [key]: on };
    setPrefs(next);
    setFailed(false);
    try { await onSave(next); } catch { setPrefs(previous); setFailed(true); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Email notifications" footer={<PillButton variant="primary" block onClick={onClose}>Done</PillButton>}>
      <p className="oi-m-meta" style={{ marginBottom: 12 }}>In-app notifications (the bell) are always on. These control email.</p>
      <RowGroup>
        {PREF_ROWS.map((r) => {
          const disabled = r.key !== 'in_app_only' && prefs.in_app_only;
          return (
            <div key={r.key} className="oi-m-row" style={{ minHeight: 68, opacity: disabled ? 0.4 : 1 }}>
              <div className="oi-m-row__body"><div className="oi-m-row__label oi-m-row__label--wrap">{r.title}</div><div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>{r.sub}</div></div>
              <Switch on={!!prefs[r.key]} onChange={(on) => { if (!disabled) toggle(r.key, on); }} label={r.title} />
            </div>
          );
        })}
      </RowGroup>
      {failed && <p className="oi-m-field__error" role="alert" style={{ marginTop: 12 }}>{offline ? 'You are offline. Your notification settings are not saved. Try again once you are back on a connection.' : 'Your notification settings did not save. Try again.'}</p>}
    </BottomSheet>
  );
}

/**
 * Delete account (ruling 2, App Store rule 5.1.1(v)). Names what is deleted,
 * asks for DELETE typed as the website's DeleteAccountModal does, and hands the
 * request to onConfirm, which runs the website's deletion request.
 */
export function DeleteAccountSheet({ open, user, onClose, onConfirm }) {
  const offline = !useOnline();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTyped(''); setError(''); } }, [open]);
  const ready = typed.trim() === 'DELETE' && !busy;
  const submit = async () => {
    if (!ready) return;
    setBusy(true); setError('');
    try { await onConfirm(); onClose(); } catch { setError(offline ? 'You are offline. Nothing was sent. Try again once you are back on a connection.' : 'The request did not go through. Try again, or use Contact support.'); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Delete account" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" onClick={submit} disabled={!ready} style={{ flex: 1 }} data-delete-account-confirm="">{busy ? 'Sending' : 'Delete my account'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-delete-account-sheet="">
        <p className="oi-m-body">This deletes the Openinvite account for <span className="oi-m-strong">{user?.email || 'this email'}</span>. Once we confirm the request is yours, we permanently remove:</p>
        <ul className="oi-m-body" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {WHAT_IS_DELETED.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p className="oi-m-meta">We confirm by email within 7 business days. This cannot be undone.</p>
        <TextField label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoCorrect="off" placeholder="DELETE" error={error} />
      </div>
    </BottomSheet>
  );
}
