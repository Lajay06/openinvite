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
 * SAVE CHANGES (item 8) goes to api/gift-link.js. A new address moves the
 * claim link to a new version, so the old link stops opening the gift, and if
 * the reveal already went it goes again to the new address. Once the couple
 * have claimed it, or for a link that no longer works, the page is a plain
 * line.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import { EDIT, CLAIM, NOTE_MAX } from '@/lib/giftingV2';
import { loadGiftByToken, saveGiftEdit, isSampleToken, GIFT_LINKS_LIVE } from '@/lib/giftLinks';
import { isValidGiftEmail } from '@/lib/giftInput';
import { heading, primary, nameInputStyle, UnderlineInput, EmailPreview } from '@/pages/GiftV2';
import { PlainLinkPage } from '@/pages/GiftClaim';

const PJS = "'Plus Jakarta Sans', sans-serif";
const MUTED = 'rgba(10,10,10,0.6)';

export default function GiftEdit() {
  const { token } = useParams();
  const [gift, setGift] = useState(undefined);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    let live = true;
    loadGiftByToken(token, 'edit').then((g) => { if (!live) return; setGift(g); if (g?.status === 'open') setDraft(g); });
    return () => { live = false; };
  }, [token]);

  if (gift === null) return <Navigate to="/gifting" replace />;
  if (gift === undefined) return null;
  if (gift.status === 'claimed') return <PlainLinkPage text={EDIT.claimed} />;
  if (gift.status !== 'open' || !draft) return <PlainLinkPage text={EDIT.gone} />;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  // The product's one address check (src/lib/giftInput.js): a stray full stop fails.
  const validEmail = isValidGiftEmail(draft.email);
  const changed = draft.email !== gift.email || draft.note !== gift.note;
  const save = async () => {
    if (isSampleToken(token)) return; // a sample changes nothing
    setSaving(true);
    setNotice(null);
    const out = await saveGiftEdit(token, { email: draft.email, note: draft.note });
    setSaving(false);
    if (out.ok) { setGift({ ...gift, email: draft.email.trim(), note: draft.note.trim() }); setNotice(out.resent ? EDIT.savedResent : EDIT.saved); return; }
    if (out.reason === 'claimed') { setGift({ ...gift, status: 'claimed' }); return; }
    if (out.reason === 'gone') { setGift({ status: 'used' }); return; }
    setNotice(CLAIM.retry);
  };
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
          disabled={!GIFT_LINKS_LIVE || saving || !changed || !validEmail || !draft.note.trim()} onClick={save} style={{ marginTop: 40 }}>{EDIT.save}</button>
        {notice && <p role="status" data-gift-edit-notice style={{ fontSize: 15, color: '#0A0A0A', fontFamily: PJS, margin: '16px 0 0', lineHeight: 1.6 }}>{notice}</p>}
      </div>
    </OnboardingShell>
  );
}
