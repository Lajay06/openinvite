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
 * OPEN YOUR GIFT (item 8): signed out, it goes to sign in with this page as
 * where to come back (ChoosePlan lets a /gift/claim/ return straight
 * through), and the page claims on return; signed in, it claims at once. The
 * claim endpoint applies the plan rules (api/_lib/giftClaim.js); on success
 * the couple land in onboarding with the goal's one line at the top. An
 * account that already has more than the gift is told so and the gift stays
 * unclaimed. A used, expired or unknown link is the goal's plain page.
 *
 * The note card is the email's card (src/lib/giftEmailTemplate.js) on the
 * page: the warm white ground, the large red quote, the note in its style (the
 * serif and handwriting notes as the same Cloudinary render the email uses),
 * the giver in small caps. Square corners, as every card in the product; the
 * 8px radius is the email's alone.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import PlanBadge from '@/components/shared/PlanBadge';
import { loadFontFamilies } from '@/lib/selfHostedFonts';
import { CAVEAT, ensureCaveat } from '@/lib/caveatFont';
import { claimReturnPath, rememberPendingClaim, clearPendingClaim } from '@/lib/giftClaimReturn';
import { REVEAL, CLAIM, fill, headlineText, giftPhotoUrl, ONBOARDING_IMAGES, noteFaceSize } from '@/lib/giftingV2';
import { useAuth } from '@/lib/AuthContext';
import { loadGiftByToken, claimGiftLink, isSampleToken, GIFT_LINKS_LIVE, GIFT_LANDING_KEY } from '@/lib/giftLinks';
import { heading, sub, primary, BIG_BADGE } from '@/pages/GiftV2';

const PJS = "'Plus Jakarta Sans', sans-serif";
const NOTE_INK = '#1C1916';

/** A body line with each plan name set as its badge, as the email does. */
function withBadges(text) {
  return String(text).split(/\b(Ultra|Pro)\b/).map((part, i) =>
    (part === 'Ultra' || part === 'Pro') ? <PlanBadge key={i} plan={part.toLowerCase()} {...BIG_BADGE} /> : part);
}

/**
 * The note in its style as LIVE TEXT (owner ruling 2026-10-13: the handwriting
 * note was a raster scaled up, and blurry at 1440 and on retina). Serif is the
 * self-hosted Cormorant Garamond upright, handwriting the self-hosted Caveat
 * (src/lib/caveatFont.js), both sharp at any size. The email keeps its
 * Cloudinary image, since Gmail loads no web fonts.
 */
// The face goes through --oi-note-font and the .oi-note-face escape in
// src/index.css, because the global Plus Jakarta Sans lock beats an inline
// fontFamily.
const NOTE_FACE = {
  plain: { '--oi-note-font': PJS, fontSize: 17, lineHeight: 1.6 },
  // Every style looks the plain note's size, on the plain note's line, the
  // serif upright (owner ruling 2026-10-14), as in the email: noteFaceSize
  // matches the lowercase height.
  serif: { '--oi-note-font': "'Cormorant Garamond', Georgia, serif", fontStyle: 'normal', fontSize: noteFaceSize('serif', 17), lineHeight: '27.2px' },
  hand: { '--oi-note-font': CAVEAT, fontSize: noteFaceSize('hand', 17), lineHeight: '27.2px' },
};

export function NoteCard({ note, noteStyle, giver }) {
  useEffect(() => {
    if (noteStyle === 'serif') loadFontFamilies(['Cormorant Garamond']);
    if (noteStyle === 'hand') ensureCaveat();
  }, [noteStyle]);
  return (
    <div data-gift-note-card style={{ background: '#F5F5F5', padding: '24px 28px 26px', margin: '0 0 32px' }}>
      <p aria-hidden="true" style={{ margin: '0 0 6px', fontSize: 56, lineHeight: 0.8, fontWeight: 700, color: '#E03553', fontFamily: 'Georgia, serif' }}>&ldquo;</p>
      <p data-note-style={noteStyle} className="oi-note-face" style={{ margin: 0, color: NOTE_INK, whiteSpace: 'pre-wrap', ...(NOTE_FACE[noteStyle] || NOTE_FACE.plain) }}>{note}</p>
      <p style={{ margin: '16px 0 0', fontSize: 13, fontVariant: 'small-caps', color: 'rgba(28,25,22,0.75)', fontFamily: PJS }}>{giver}</p>
    </div>
  );
}

/**
 * A claim link already used, expired or unknown (owner's copy, 2026-10-14):
 * the heading, the line, and Log in, which returns to the dashboard (the
 * login page's own default). Its own photo: the owner's pick is pending, so
 * it keeps the page's photo until then.
 */
export function UsedClaimPage() {
  return (
    <OnboardingShell contentMaxWidth={600} image={ONBOARDING_IMAGES.STEP_ONE}>
      <div data-gift-claim-used style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        <div style={{ margin: '0 0 40px' }}><OpeninviteLogo ground="light" size={24} /></div>
        <h1 style={heading}>{CLAIM.usedHeading}</h1>
        <p style={{ ...sub, margin: '0 0 32px' }}>{CLAIM.usedLine}</p>
        <Link to="/login" className={primary} data-gift-claim-login>{CLAIM.usedButton}</Link>
      </div>
    </OnboardingShell>
  );
}

/** The goal's plain page for an edit link that can no longer edit. */
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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [gift, setGift] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  useEffect(() => { let live = true; loadGiftByToken(token, 'claim').then((g) => { if (live) setGift(g); }); return () => { live = false; }; }, [token]);

  // To Create account, with the gift both in ?next= and remembered in this
  // browser (src/lib/giftClaimReturn.js), so any way in comes back here.
  const signIn = () => {
    const back = claimReturnPath(token);
    rememberPendingClaim(back);
    navigate(`/register?next=${encodeURIComponent(back)}`);
  };
  const claim = async () => {
    if (isSampleToken(token)) return; // a sample claims nothing
    if (!user) { signIn(); return; }
    setBusy(true);
    setMessage(null);
    const out = await claimGiftLink(token);
    if (out.ok || out.reason === 'used') clearPendingClaim();
    if (out.ok) {
      try { sessionStorage.setItem(GIFT_LANDING_KEY, fill(CLAIM.landing, { giver: out.giver, plan: out.plan })); } catch { /* the line is a nicety */ }
      // A full load, so the account is read again with its new plan.
      window.location.assign(out.next);
      return;
    }
    setBusy(false);
    if (out.reason === 'sign_in') { signIn(); return; }
    if (out.reason === 'used') { setGift({ status: 'used' }); return; }
    if (out.reason === 'more_than_gift') { setMessage(fill(CLAIM.moreThanGift, { giver: out.giver || gift?.giver || '' })); return; }
    setMessage(CLAIM.retry);
  };
  // Back from signing in: claim once, without a second tap.
  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (autoTried || isLoadingAuth || !user || params.get('go') !== '1' || gift?.status !== 'open') return;
    setAutoTried(true);
    claim();
  }, [autoTried, isLoadingAuth, user, params, gift]);

  if (gift === null) return <Navigate to="/gifting" replace />;
  if (gift === undefined) return null;
  if (gift.status !== 'open') return <UsedClaimPage />;

  const vars = { giver: gift.giver, names: gift.names, plan: gift.plan };
  return (
    <OnboardingShell contentMaxWidth={600} image={giftPhotoUrl(gift.photoId, { width: 1600, ratio: '4:5' })}>
      <div data-gift-claim style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        <div style={{ margin: '0 0 40px' }}><OpeninviteLogo ground="light" size={24} /></div>
        {/* TEXT ONLY ON THIS SIDE (owner ruling 2026-10-13): the photo is the
            full-height one on the left, once. It also showed here, twice. */}
        <h1 style={heading}>{headlineText(gift.headlineKey, gift.names)}</h1>
        <p style={sub}>{withBadges(fill(REVEAL.body[gift.plan] || REVEAL.body.ultra, vars))}</p>
        <NoteCard note={gift.note} noteStyle={gift.noteStyle} giver={gift.giver} />
        <button type="button" className={primary} disabled={!GIFT_LINKS_LIVE || busy} onClick={claim} data-gift-claim-button>{CLAIM.button}</button>
        <p style={{ ...sub, fontSize: 14, margin: '16px 0 0' }}>{CLAIM.under}</p>
        {message && <p role="alert" data-gift-claim-message style={{ ...sub, color: '#0A0A0A', fontSize: 15, margin: '16px 0 0' }}>{message}</p>}
      </div>
    </OnboardingShell>
  );
}
