/**
 * src/pages/GiftV2.jsx
 *
 * GIVE OPENINVITE LIKE A GIFT: THE GIVER'S SEVEN PAGES AT /gift, FLAGGED.
 * goals/2026-10-11-gifting-v2.md, item 1. Behind GIFTING_V2 (src/lib/
 * giftingV2.js); with the flag off, /gift sends the visitor to the v1 page at
 * /gifting, which keeps working until the flag flips.
 *
 * THE ONBOARDING SHELL, CONSUMED, NOT FORKED: OnboardingShell's split, its
 * white content column, onboarding's Select card (SelectCard, exported from
 * OnboardingStep8Fork), the universe grid's tile (UniverseGridTile) and the
 * completion screen (OnboardingCompletion). Each gained only additive props;
 * every existing consumer renders byte for byte as before.
 *
 * THE PHOTO SIDE: step 1 and the done screen show onboarding's own images
 * (ONBOARDING_IMAGES); steps 2 to 6 show the live email preview, rendered by
 * the same template the email is sent from (src/lib/giftEmailTemplate.js).
 *
 * DRAFT STATE lives in sessionStorage under one key until payment; nothing is
 * written to PlanGift before Stripe confirms. Item 1's pay step is a stub
 * that goes nowhere: checkout is item 6.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import { SelectCard } from '@/components/onboarding/OnboardingStep8Fork';
import { UniverseGridTile } from '@/components/onboarding/OnboardingStepUniverse';
import OnboardingCompletion from '@/components/onboarding/OnboardingCompletion';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import { renderGiftReveal, noteImageUrl } from '@/lib/giftEmailTemplate';
import { resolveCheckoutPriceId, PLAN_PRICES } from '@/lib/checkoutSession';
import { loadFontFamilies } from '@/lib/selfHostedFonts';
import {
  isGiftingV2On, GIFT_DRAFT_KEY, GIFT_PHOTOS, DEFAULT_PHOTO_ID, giftPhotoUrl, ONBOARDING_IMAGES,
  HEADLINES, DEFAULT_HEADLINE, headlineText, NOTE_STYLES, NOTE_MAX, PLAN_NAMES, COPY, fill,
  timezoneInWords, browserTimezone,
} from '@/lib/giftingV2';

const PJS = "'Plus Jakarta Sans', sans-serif";
const INK = '#0A0A0A';
const MUTED = 'rgba(10,10,10,0.6)';
const STEPS = 7;

const EMPTY = { step: 1, plan: null, names: '', email: '', giver: '', note: '', noteStyle: 'plain', headlineKey: DEFAULT_HEADLINE, photoId: DEFAULT_PHOTO_ID, when: 'now', date: '' };
// The owner's sample for the review screenshots (?sample=1): giver Sam, couple
// Isla and Theo, Ultra, The boxes, a plain note.
const SAMPLE = { ...EMPTY, plan: 'ultra', names: 'Isla and Theo', email: 'isla.and.theo@example.com', giver: 'Sam', note: 'You two found each other, and now the planning finds its place too. Enjoy every bit of it. With love, Sam' };

function readDraft() {
  try { const raw = sessionStorage.getItem(GIFT_DRAFT_KEY); return raw ? { ...EMPTY, ...JSON.parse(raw) } : null; } catch { return null; }
}
function writeDraft(d) {
  try { sessionStorage.setItem(GIFT_DRAFT_KEY, JSON.stringify(d)); } catch { /* private mode: the draft lives in memory only */ }
}

/** The price the existing resolver would charge, as a label: US$99, or A$149 where it falls back to AUD. */
function priceLabel(plan) {
  const { currency } = resolveCheckoutPriceId(plan);
  const amount = PLAN_PRICES[currency]?.[plan];
  return `${currency === 'aud' ? 'A$' : 'US$'}${amount}`;
}

const heading = { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: INK, fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.15 };
const sub = { fontSize: 16, color: MUTED, fontFamily: PJS, margin: '0 0 32px', lineHeight: 1.6 };
const label = { display: 'block', fontSize: 14, fontWeight: 600, color: INK, fontFamily: PJS, margin: '0 0 6px' };
const help = { fontSize: 13, color: MUTED, fontFamily: PJS, margin: '6px 0 0', lineHeight: 1.5 };
const field = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', fontSize: 20, fontWeight: 600, color: INK, fontFamily: PJS, padding: '6px 0', outline: 'none' };
const primary = 'px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 border-none cursor-pointer disabled:opacity-40 disabled:cursor-default';

/** The live email preview on the photo side: the template's own HTML, nothing redrawn. */
function EmailPreview({ draft }) {
  // The rendered styles fetch an image from Cloudinary for every change, so
  // they settle for 300 ms; plain text follows every keystroke.
  const [shown, setShown] = useState(draft);
  useEffect(() => {
    if (draft.noteStyle === 'plain') { setShown(draft); return undefined; }
    const t = setTimeout(() => setShown(draft), 300);
    return () => clearTimeout(t);
  }, [draft]);
  const { html } = useMemo(() => renderGiftReveal({
    plan: shown.plan || 'ultra', giver: shown.giver || 'Your name', names: shown.names || 'You two',
    note: shown.note || 'Your note goes here, exactly as you write it.', noteStyle: shown.noteStyle,
    headlineKey: shown.headlineKey, photoId: shown.photoId,
  }), [shown]);
  return (
    <div data-gift-preview style={{ height: '100%', background: '#F7F7F7' }}>
      <iframe title="Their email, as they will see it" srcDoc={html} sandbox="" style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
    </div>
  );
}

function StyleChoice({ style, selected, onSelect }) {
  const sample = style.key === 'hand'
    ? <img src={noteImageUrl(style.label, 'hand', { ground: 'FFFFFF' })} alt={style.label} style={{ height: 22, width: 'auto', display: 'block' }} />
    : <span style={{ fontFamily: style.key === 'serif' ? "'Cormorant Garamond', serif" : PJS, fontStyle: style.key === 'serif' ? 'italic' : 'normal', fontSize: style.key === 'serif' ? 20 : 15 }}>{style.label}</span>;
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} data-note-style={style.key}
      style={{ padding: '10px 18px', borderRadius: 999, border: selected ? `2px solid ${INK}` : '1px solid rgba(10,10,10,0.18)', background: '#FFFFFF', color: INK, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
      {sample}
    </button>
  );
}

export default function GiftV2() {
  const [params] = useSearchParams();
  const on = isGiftingV2On();
  const [draft, setDraft] = useState(() => {
    if (params.get('sample') === '1') return { ...SAMPLE, step: Number(params.get('step')) || 1 };
    return readDraft() || EMPTY;
  });
  const tz = useMemo(() => browserTimezone(), []);
  useEffect(() => { loadFontFamilies(['Cormorant Garamond']); }, []);
  useEffect(() => { writeDraft(draft); }, [draft]);

  if (!on) return <Navigate to="/gifting" replace />;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const go = (step) => set({ step: Math.max(1, Math.min(STEPS, step)) });
  const vars = { giver: draft.giver, names: draft.names, email: draft.email, plan: draft.plan || 'ultra' };
  const s = draft.step;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
  const photoSide = s === 1 ? { image: ONBOARDING_IMAGES.STEP_ONE } : s === 7 ? { image: ONBOARDING_IMAGES.DONE } : { aside: <EmailPreview draft={draft} /> };

  const top = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 40px' }}>
      <OpeninviteLogo ground="light" size={24} />
      {s > 1 && s < 7 && (
        <button type="button" onClick={() => go(s - 1)} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 14, fontFamily: PJS, cursor: 'pointer', padding: 8 }}>Back</button>
      )}
    </div>
  );
  const next = (enabled, text = 'Continue') => (
    <button type="button" className={primary} disabled={!enabled} onClick={() => go(s + 1)} style={{ marginTop: 32 }}>{text}</button>
  );

  return (
    <OnboardingShell contentMaxWidth={600} {...photoSide}>
      <div data-gift-step={s} style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        {top}

        {s === 1 && (
          <>
            <h1 style={heading}>{COPY.plan.heading}</h1>
            <p style={sub}>{COPY.plan.sub}</p>
            <div className="grid grid-cols-1 gap-6">
              {['pro', 'ultra'].map((plan) => (
                <SelectCard key={plan} title={PLAN_NAMES[plan]} body={COPY.plan[plan]} selected={draft.plan === plan} onSelect={() => set({ plan, step: 2 })}>
                  <p style={{ fontSize: 28, fontWeight: 800, color: INK, margin: '0 0 24px', fontFamily: PJS }}>{priceLabel(plan)}</p>
                </SelectCard>
              ))}
            </div>
          </>
        )}

        {s === 2 && (
          <>
            <h1 style={heading}>{COPY.who.heading}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 24 }}>
              <div>
                <label style={label} htmlFor="gift-names">{COPY.who.namesLabel}</label>
                <input id="gift-names" style={field} value={draft.names} onChange={(e) => set({ names: e.target.value })} autoComplete="off" />
                <p style={help}>{COPY.who.namesHelp}</p>
              </div>
              <div>
                <label style={label} htmlFor="gift-email">{COPY.who.emailLabel}</label>
                <input id="gift-email" type="email" style={field} value={draft.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" />
                <p style={help}>{COPY.who.emailHelp}</p>
              </div>
              <div>
                <label style={label} htmlFor="gift-giver">{COPY.who.giverLabel}</label>
                <input id="gift-giver" style={field} value={draft.giver} onChange={(e) => set({ giver: e.target.value })} autoComplete="name" />
              </div>
            </div>
            {next(draft.names.trim() && validEmail && draft.giver.trim())}
          </>
        )}

        {s === 3 && (
          <>
            <h1 style={heading}>{COPY.note.heading}</h1>
            <textarea aria-label={COPY.note.heading} value={draft.note} maxLength={NOTE_MAX} onChange={(e) => set({ note: e.target.value })} rows={7}
              style={{ ...field, fontSize: 17, fontWeight: 400, lineHeight: 1.6, border: '1px solid rgba(10,10,10,0.18)', padding: 14, resize: 'vertical', marginTop: 16 }} />
            <p style={help}>{COPY.note.help} <span style={{ float: 'right' }}>{draft.note.length}/{NOTE_MAX}</span></p>
            <p style={{ ...label, margin: '28px 0 10px' }}>{COPY.note.styleLabel}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {NOTE_STYLES.map((st) => <StyleChoice key={st.key} style={st} selected={draft.noteStyle === st.key} onSelect={() => set({ noteStyle: st.key })} />)}
            </div>
            {next(draft.note.trim().length > 0)}
          </>
        )}

        {s === 4 && (
          <>
            <h1 style={heading}>{COPY.headline.heading}</h1>
            <div className="grid grid-cols-1 gap-4" style={{ marginTop: 24 }}>
              {HEADLINES.map((h) => (
                <SelectCard key={h.key} title={headlineText(h.key, draft.names)} body="" selected={draft.headlineKey === h.key} onSelect={() => set({ headlineKey: h.key })} />
              ))}
            </div>
            {next(true)}
          </>
        )}

        {s === 5 && (
          <>
            <h1 style={heading}>{COPY.photo.heading}</h1>
            <p style={sub}>{COPY.photo.sub}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {GIFT_PHOTOS.map((p, i) => (
                <UniverseGridTile key={p.id} index={i} hideExplore
                  universe={{ id: p.id, name: p.label, colors: {} }}
                  imageSrc={giftPhotoUrl(p.id, { width: 600, ratio: '3:4' })}
                  isSelected={draft.photoId === p.id}
                  onExplore={() => set({ photoId: p.id })} onSelectTile={() => set({ photoId: p.id })} />
              ))}
            </div>
            {next(true)}
          </>
        )}

        {s === 6 && (
          <>
            <h1 style={heading}>{COPY.when.heading}</h1>
            <div className="grid grid-cols-1 gap-4" style={{ marginTop: 24 }}>
              <SelectCard title={COPY.when.now.title} body={COPY.when.now.line} selected={draft.when === 'now'} onSelect={() => set({ when: 'now' })} />
              <SelectCard title={COPY.when.date.title} body={COPY.when.date.line} selected={draft.when === 'date'} onSelect={() => set({ when: 'date' })}>
                {draft.when === 'date' && (
                  <div style={{ margin: '0 0 24px' }}>
                    <input type="date" aria-label="The morning it lands" style={{ ...field, fontSize: 17 }} value={draft.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ date: e.target.value })} />
                    <p style={help}>{COPY.when.tzLine.replace('{timezone}', timezoneInWords(tz) || 'your timezone')}</p>
                  </div>
                )}
              </SelectCard>
            </div>
            <div data-gift-summary style={{ marginTop: 32, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
              {[['Gift', `Openinvite ${PLAN_NAMES[draft.plan || 'ultra']}`], ['For', draft.names], ['To', draft.email], ['From', draft.giver], ['Total', priceLabel(draft.plan || 'ultra')]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.12)', fontSize: 15, fontFamily: PJS }}>
                  <span style={{ color: MUTED }}>{k}</span><span style={{ color: INK, fontWeight: k === 'Total' ? 700 : 500, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ ...help, marginTop: 16 }}>{COPY.when.fine}</p>
            {/* ITEM 1'S PAY STEP IS A STUB: it goes to the done screen and
                charges nothing. Checkout is item 6, held. */}
            <button type="button" className={primary} disabled={draft.when === 'date' && !draft.date} onClick={() => go(7)} style={{ marginTop: 24 }}>
              {`Pay ${priceLabel(draft.plan || 'ultra')} and send`}
            </button>
          </>
        )}

        {s === 7 && (
          <OnboardingCompletion onDone={() => {}} data={{}} heading={fill(COPY.done.heading, vars)} body={fill(COPY.done.body, vars)}>
            <div style={{ border: '1px solid rgba(10,10,10,0.18)', padding: 20, margin: '0 0 20px' }}>
              <p style={{ ...label, margin: '0 0 8px' }}>{COPY.done.boxTitle}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: INK, margin: 0, fontFamily: PJS }}>{fill(COPY.done.box, vars)}</p>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: MUTED, margin: '0 0 28px', fontFamily: PJS }}>{COPY.done.second}</p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <a href="#change" style={{ color: '#E03553', fontWeight: 600, fontSize: 15, fontFamily: PJS }}>{COPY.done.change}</a>
              <button type="button" onClick={() => setDraft({ ...EMPTY })} style={{ background: 'none', border: 'none', padding: 0, color: '#E03553', fontWeight: 600, fontSize: 15, fontFamily: PJS, cursor: 'pointer' }}>{COPY.done.another}</button>
            </div>
          </OnboardingCompletion>
        )}
      </div>
    </OnboardingShell>
  );
}
