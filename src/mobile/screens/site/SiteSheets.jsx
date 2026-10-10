import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BottomSheet, PillButton, TextField, Switch } from '../../ui';

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
              : incomplete && <p className="oi-m-meta">Enter a password to turn protection on. Until you do, your guest suite stays public.</p>}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
