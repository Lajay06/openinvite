/**
 * src/pages/GiftEdit.jsx
 *
 * THE GIVER'S EDIT PAGE, /gift/edit/:token, FLAGGED. goals/2026-10-11-
 * gifting-v2.md, item 3: change the address or the note until the couple
 * open the gift. Opened by the confirmation email's outlined button and the
 * done page's link, with the edit token.
 *
 * The flow's own parts, as they are: the onboarding shell with the live email
 * preview on the photo side (the template the email is sent from, so the giver
 * sees the change land), the names step's underline input for the address,
 * and page 3's multi-line note field.
 *
 * READ-ONLY UNTIL ITEM 8 (src/lib/giftLinks.js): the fields can be tried and
 * the preview follows them, but Save changes is disabled; nothing is written.
 * Once the couple have opened the gift, or for a link that no longer works,
 * the page is a plain line.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import { EDIT, NOTE_MAX } from '@/lib/giftingV2';
import { loadGiftByToken, GIFT_LINKS_LIVE } from '@/lib/giftLinks';
import { heading, primary, nameInputStyle, UnderlineInput, EmailPreview } from '@/pages/GiftV2';
import { PlainLinkPage } from '@/pages/GiftClaim';

const PJS = "'Plus Jakarta Sans', sans-serif";
const MUTED = 'rgba(10,10,10,0.6)';

export default function GiftEdit() {
  const { token } = useParams();
  const [gift, setGift] = useState(undefined);
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    let live = true;
    loadGiftByToken(token).then((g) => { if (!live) return; setGift(g); if (g?.status === 'open') setDraft(g); });
    return () => { live = false; };
  }, [token]);

  if (gift === null) return <Navigate to="/gifting" replace />;
  if (gift === undefined) return null;
  if (gift.status === 'claimed') return <PlainLinkPage text={EDIT.claimed} />;
  if (gift.status !== 'open' || !draft) return <PlainLinkPage text={EDIT.gone} />;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
  const changed = draft.email !== gift.email || draft.note !== gift.note;
  return (
    <OnboardingShell contentMaxWidth={600} aside={<EmailPreview draft={draft} />}>
      <style>{'.s1-input::placeholder { color: rgba(10,10,10,0.58); }'}</style>
      <div data-gift-edit style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        <div style={{ margin: '0 0 40px' }}><OpeninviteLogo ground="light" size={24} /></div>
        <h1 style={heading}>{EDIT.heading}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
          <UnderlineInput value={draft.email} onChange={(v) => set({ email: v })} placeholder={EDIT.emailLabel} type="email" />
          <div>
            <textarea value={draft.note} maxLength={NOTE_MAX} rows={5} placeholder={EDIT.noteLabel} aria-label={EDIT.noteLabel} className="s1-input"
              onChange={(e) => set({ note: e.target.value })}
              style={{ ...nameInputStyle(draft.note, false), fontSize: 17, fontWeight: 400, lineHeight: 1.6, resize: 'vertical' }} />
            <p style={{ fontSize: 12, color: MUTED, fontFamily: PJS, margin: '6px 0 0', textAlign: 'right' }}>{draft.note.length}/{NOTE_MAX}</p>
          </div>
        </div>
        <button type="button" className={primary} data-gift-edit-save
          disabled={!GIFT_LINKS_LIVE || !changed || !validEmail || !draft.note.trim()} style={{ marginTop: 40 }}>{EDIT.save}</button>
      </div>
    </OnboardingShell>
  );
}
