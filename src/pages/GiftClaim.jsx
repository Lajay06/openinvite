/**
 * src/pages/GiftClaim.jsx
 *
 * THE COUPLE'S CLAIM PAGE, /gift/claim/:token, FLAGGED. goals/2026-10-11-
 * gifting-v2.md, item 3. What the reveal email's button opens: the onboarding
 * shell with the giver's photo on the photo side, and on the content side the
 * headline the giver chose, the body line, the note card and Open your gift,
 * with nothing to enter. On a phone, where the shell hides its photo side,
 * the photo sits above the headline.
 *
 * READ-ONLY UNTIL ITEM 8 (src/lib/giftLinks.js): the button is shown and
 * disabled; sign in, the claim endpoint, the plan rules and the landing line
 * in onboarding arrive with it. A used, expired or unknown link is the goal's
 * plain page.
 *
 * The note card is the email's card (src/lib/giftEmailTemplate.js) on the
 * page: the warm white ground, the large red quote, the note in its style (the
 * serif and handwriting notes as the same Cloudinary render the email uses),
 * the giver in small caps. Square corners, as every card in the product; the
 * 8px radius is the email's alone.
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import PlanBadge from '@/components/shared/PlanBadge';
import { noteImageUrl } from '@/lib/giftEmailTemplate';
import { REVEAL, CLAIM, fill, headlineText, giftPhotoUrl, photoLabel, ONBOARDING_IMAGES } from '@/lib/giftingV2';
import { loadGiftByToken, GIFT_LINKS_LIVE } from '@/lib/giftLinks';
import { heading, sub, primary, BIG_BADGE } from '@/pages/GiftV2';

const PJS = "'Plus Jakarta Sans', sans-serif";
const NOTE_INK = '#1C1916';

/** A body line with each plan name set as its badge, as the email does. */
function withBadges(text) {
  return String(text).split(/\b(Ultra|Pro)\b/).map((part, i) =>
    (part === 'Ultra' || part === 'Pro') ? <PlanBadge key={i} plan={part.toLowerCase()} {...BIG_BADGE} /> : part);
}

export function NoteCard({ note, noteStyle, giver }) {
  const rendered = noteStyle === 'serif' || noteStyle === 'hand';
  return (
    <div data-gift-note-card style={{ background: '#F6F2EC', padding: '24px 28px 26px', margin: '0 0 32px' }}>
      <p aria-hidden="true" style={{ margin: '0 0 6px', fontSize: 56, lineHeight: 0.8, fontWeight: 700, color: '#E03553', fontFamily: 'Georgia, serif' }}>&ldquo;</p>
      {rendered
        ? <img src={noteImageUrl(note, noteStyle)} alt={note} style={{ display: 'block', width: '100%', maxWidth: 520, height: 'auto' }} />
        : <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: NOTE_INK, fontFamily: PJS, whiteSpace: 'pre-wrap' }}>{note}</p>}
      <p style={{ margin: '16px 0 0', fontSize: 13, fontVariant: 'small-caps', color: 'rgba(28,25,22,0.75)', fontFamily: PJS }}>{giver}</p>
    </div>
  );
}

/** The goal's plain page for a used, expired or unknown link. */
export function PlainLinkPage({ text }) {
  return (
    <OnboardingShell contentMaxWidth={600} image={ONBOARDING_IMAGES.STEP_ONE}>
      <div data-gift-link-plain style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        <div style={{ margin: '0 0 40px' }}><OpeninviteLogo ground="light" size={24} /></div>
        <p style={{ ...sub, color: '#0A0A0A', fontSize: 18 }}>{text}</p>
      </div>
    </OnboardingShell>
  );
}

export default function GiftClaim() {
  const { token } = useParams();
  const [gift, setGift] = useState(undefined);
  useEffect(() => { let live = true; loadGiftByToken(token).then((g) => { if (live) setGift(g); }); return () => { live = false; }; }, [token]);

  if (gift === null) return <Navigate to="/gifting" replace />;
  if (gift === undefined) return null;
  if (gift.status !== 'open') return <PlainLinkPage text={CLAIM.used} />;

  const vars = { giver: gift.giver, names: gift.names, plan: gift.plan };
  return (
    <OnboardingShell contentMaxWidth={600} image={giftPhotoUrl(gift.photoId, { width: 1600, ratio: '4:5' })}>
      <div data-gift-claim style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        <div style={{ margin: '0 0 40px' }}><OpeninviteLogo ground="light" size={24} /></div>
        {/* The shell hides its photo side below 768px, as onboarding does, and
            the photo is the giver's choice: on a phone it sits above the
            headline at the email's own 6:5. */}
        <img className="md:hidden" data-gift-claim-phone-photo src={giftPhotoUrl(gift.photoId, { width: 800 })} alt={photoLabel(gift.photoId)}
          style={{ display: 'block', width: '100%', aspectRatio: '6 / 5', objectFit: 'cover', margin: '0 0 32px' }} />
        <h1 style={heading}>{headlineText(gift.headlineKey, gift.names)}</h1>
        <p style={sub}>{withBadges(fill(REVEAL.body[gift.plan] || REVEAL.body.ultra, vars))}</p>
        <NoteCard note={gift.note} noteStyle={gift.noteStyle} giver={gift.giver} />
        <button type="button" className={primary} disabled={!GIFT_LINKS_LIVE} data-gift-claim-button>{CLAIM.button}</button>
        <p style={{ ...sub, fontSize: 14, margin: '16px 0 0' }}>{CLAIM.under}</p>
      </div>
    </OnboardingShell>
  );
}
