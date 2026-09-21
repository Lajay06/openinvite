import React, { useState } from 'react';
import { Mail, Link2, Send, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { PanelCard, RowGroup, Row, TextField, PillButton, SkeletonRows, ErrorState } from '../../ui';
import { shareLink } from '../../native';
import { dateLong } from '../../lib/format';

/**
 * Invitations. The builder is a canvas and stays on desktop; what is not
 * canvas lives here: InvitationBuilder.jsx's first-invitation form
 * (couple names and date, Invitation.create with the starter design) and
 * InvitationStudio.jsx's Copy invitation link. Sending is under Send invites.
 */
export default function InvitationsScreen({ invitation, invitationUrl, loading, error, onRetry, onCreate, onDesktop, onSend, back }) {
  const [names, setNames] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const create = async () => {
    if (!names.trim()) { setErr("Enter the couple's names."); return; }
    setBusy(true); setErr('');
    try { await onCreate({ coupleNames: names.trim(), weddingDate: date }); toast.success('Invitation created'); } catch (e) { setErr(e?.message || 'Could not create the invitation.'); } finally { setBusy(false); }
  };
  const copy = async () => { const r = await shareLink({ title: 'Our invitation', url: invitationUrl }); if (r === 'copied') toast.success('Invitation link copied'); else if (r === 'failed') toast.error('Could not copy the link'); };
  const saved = invitation?.updated_date || invitation?.created_date;
  return (
    <Screen title="Invitations" back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={3} /> : invitation ? (
          <>
            <PanelCard tone="ink" label={saved ? `Saved ${dateLong(saved)}` : 'Your invitation'} title={invitation.couple_names || 'Your invitation'} body="The design is drawn in the builder on desktop. Share the link, or send it to guests from here." />
            <RowGroup>
              <Row icon={Link2} tile="neutral" label="Copy invitation link" sub={invitationUrl.replace(/^https?:\/\//, '')} onClick={copy} chevron={false} />
              <Row icon={Send} tile="neutral" label="Send invites" sub="Email or WhatsApp, with each guest's RSVP link" onClick={onSend} />
              <Row icon={Monitor} tile="neutral" label="Open the builder on desktop" sub="Layout, colors, type and imagery" onClick={onDesktop} />
            </RowGroup>
          </>
        ) : (
          <>
            <PanelCard tone="ink" label="No invitation yet" title="Start your invitation" body="Give it the names and the date. The design opens in the builder on desktop from there." />
            <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TextField label="Couple's names" value={names} onChange={(e) => setNames(e.target.value)} placeholder="Priya & Tom" autoCapitalize="words" error={err} />
              <TextField label="Wedding date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <PillButton variant="primary" block icon={Mail} onClick={create} disabled={busy}>{busy ? 'Creating' : 'Create the invitation'}</PillButton>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
