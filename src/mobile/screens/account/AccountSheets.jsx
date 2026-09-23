import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
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
 * temperature unit (tempUnit). Email, password and deletion stay on the
 * desktop page: the auth surface is locked by CLAUDE.md.
 */
export function AccountDetailsSheet({ open, user, currencyCode, onClose, onSave, onDesktop }) {
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
        <PillChoice label="Temperature" options={UNITS} value={f.tempUnit} onChange={(v) => v && setF((s) => ({ ...s, tempUnit: v }))} hint="For the weather on your guest suite and in the app" />
        <RowGroup><Row icon={KeyRound} tile="neutral" label="Password and account" sub="Change your password or delete your account on the website" onClick={onDesktop} /></RowGroup>
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
