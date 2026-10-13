/**
 * src/pages/GiftV2.jsx
 *
 * GIVE OPENINVITE LIKE A GIFT: THE GIVER'S FOUR PAGES AT /gift, FLAGGED.
 * goals/2026-10-11-gifting-v2.md, item 1 and its amendment (the owner's
 * review of #994). Behind GIFTING_V2 (src/lib/giftingV2.js); with the flag
 * off, /gift sends the visitor to the v1 page at /gifting, which keeps
 * working until the flag flips.
 *
 * THE ONBOARDING IMPLEMENTATION, CONSUMED, NOT ITS LOOK COPIED: the shell
 * (OnboardingShell), the Select card (SelectCard, from OnboardingStep8Fork),
 * the theme accordion and its option pills (AccordionSection and Pill, from
 * OnboardingStep5WeddingType), the universe grid's tile and grid rule
 * (UniverseGridTile), the completion screen (OnboardingCompletion), and the
 * names step's placeholder-as-label underline inputs, reused as a pattern
 * because onboarding has no input component. Each consumed component gained
 * only additive props or an export; every existing consumer renders byte for
 * byte as before. Pro and Ultra are named with the dashboard's plan badge
 * (PlanBadge), wherever they appear.
 *
 * Pages: 1 the gift (onboarding's welcome image); 2 who it is for (the names
 * step's image); 3 make it theirs, one accordion, with the live email preview
 * on the photo side, rendered by the template the email is sent from; 4 done
 * (the completion image). On a phone the preview is a collapsible panel on
 * page 3.
 *
 * DRAFT STATE lives in sessionStorage under one key until payment; nothing is
 * written to PlanGift before Stripe confirms. Pay (item 6) hands the draft to
 * checkout, which holds it server side for 60 minutes (GiftDraft) and sends
 * the giver to Stripe; the webhook writes the gift (item 7).
 *
 * The input, the email preview, the style sample, the badge line and the type
 * styles are exported for the claim and edit pages (item 3), which use them as
 * they are; exporting changes nothing about how these four pages render.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import OnboardingStep1Names from '@/components/onboarding/OnboardingStep1Names';
import { ShellStepChrome } from '@/components/onboarding/OnboardingStepChrome';
import { SelectCard } from '@/components/onboarding/OnboardingStep8Fork';
import { AccordionSection, Pill } from '@/components/onboarding/OnboardingStep5WeddingType';
import { UniverseGridTile } from '@/components/onboarding/OnboardingStepUniverse';
import OnboardingCompletion from '@/components/onboarding/OnboardingCompletion';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import PlanBadge from '@/components/shared/PlanBadge';
import { renderGiftReveal } from '@/lib/giftEmailTemplate';
import { resolveCheckoutPriceId, PLAN_PRICES, startGiftV2Checkout } from '@/lib/checkoutSession';
import { GIFT_TRY_AGAIN, EMAIL_CHECK, isValidGiftEmail, normalizeGiftEmail } from '@/lib/giftInput';
import { loadFontFamilies } from '@/lib/selfHostedFonts';
import { CAVEAT, ensureCaveat } from '@/lib/caveatFont';
import { color } from '@/styles/tokens';
import {
  isGiftingV2On, GIFT_DRAFT_KEY, GIFT_PHOTOS, DEFAULT_PHOTO_ID, giftPhotoUrl, photoLabel, ONBOARDING_IMAGES,
  HEADLINES, DEFAULT_HEADLINE, headlineText, NOTE_STYLES, NOTE_MAX, COPY, fill,
  timezoneInWords, browserTimezone,
} from '@/lib/giftingV2';

const PJS = "'Plus Jakarta Sans', sans-serif";
const INK = '#0A0A0A';
const MUTED = 'rgba(10,10,10,0.6)';
const PAGES = 4;
// The email's own width (src/lib/giftEmailTemplate.js lays it out at 600).
const EMAIL_WIDTH = 600;
export const BIG_BADGE = { padding: '3px 8px', fontSize: 13 };

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
  return `${currency === 'aud' ? 'A$' : 'US$'}${PLAN_PRICES[currency]?.[plan]}`;
}

/** A copy line with {Plan} set as the plan's badge. */
export function withPlanBadge(text, plan) {
  const parts = String(text).split('{Plan}');
  return parts.flatMap((p, i) => (i === 0 ? [p] : [<PlanBadge key={i} plan={plan} {...BIG_BADGE} />, p]));
}

export const heading = { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: INK, fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.15 };
export const sub = { fontSize: 16, color: MUTED, fontFamily: PJS, margin: '0 0 32px', lineHeight: 1.6 };
export const primary = 'px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 border-none cursor-pointer disabled:opacity-40 disabled:cursor-default';

/**
 * ONBOARDING'S NAMES-STEP INPUT, REUSED AS ITS PATTERN (onboarding has no
 * input component): the placeholder is the label, gray until typed, no box,
 * an underline that turns pink once there is a value or focus. The one
 * difference is the width: the names step caps a name at 300px, and an email
 * address does not fit in 300px at this size, so these run the column's width.
 */
export const nameInputStyle = (value, focused) => ({
  background: 'transparent', border: 'none',
  borderBottom: (value || focused) ? '2px solid #ec4899' : '1px solid rgba(10,10,10,0.18)',
  width: '100%', fontSize: 32, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS,
  padding: '4px 8px', outline: 'none', textAlign: 'left',
});
export function UnderlineInput({ value, onChange, placeholder, type = 'text', autoComplete = 'off', onBlur, invalid = false, describedBy }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} placeholder={placeholder} aria-label={placeholder} className="s1-input" autoComplete={autoComplete}
      aria-invalid={invalid || undefined} aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); if (onBlur) onBlur(); }}
      style={nameInputStyle(value, focused)} />
  );
}

/** The live email preview: the template's own HTML, nothing redrawn. `fit` sizes it to the email on a phone. */
export function EmailPreview({ draft, fit = false }) {
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
  // The frame is measured in both modes: allow-same-origin with no scripts
  // lets the page read its height, and nothing in the email runs.
  //   On a phone it takes the email's own height, so the page scrolls rather
  //   than a box inside it.
  //   On the photo side (owner ruling 2026-10-13) the whole email fits the
  //   viewport with no scrolling: the frame is laid out at the email's own
  //   600px and full height, then scaled down as one unit by a single
  //   transform, so the email is never reflowed.
  const [height, setHeight] = useState(1400);
  const [box, setBox] = useState(null);
  const wrapRef = React.useRef(null);
  const measure = (e) => { try { setHeight(e.currentTarget.contentDocument.documentElement.scrollHeight); } catch { /* keep the default */ } };
  useEffect(() => {
    if (fit || !wrapRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [fit]);
  if (fit) {
    return (
      <div data-gift-preview="phone" style={{ height: 'auto', background: '#F7F7F7' }}>
        <iframe title="Their email, as they will see it" srcDoc={html} sandbox="allow-same-origin" onLoad={measure}
          style={{ width: '100%', height, border: 0, display: 'block' }} />
      </div>
    );
  }
  const PAD = 24;
  const scale = box ? Math.min(1, (box.h - PAD * 2) / height, (box.w - PAD * 2) / EMAIL_WIDTH) : 1;
  return (
    <div ref={wrapRef} data-gift-preview="side" data-preview-scale={scale.toFixed(3)} style={{ position: 'relative', height: '100%', overflow: 'hidden', background: '#F7F7F7' }}>
      <iframe title="Their email, as they will see it" srcDoc={html} sandbox="allow-same-origin" onLoad={measure} scrolling="no"
        style={{
          position: 'absolute', top: PAD, left: '50%', width: EMAIL_WIDTH, height, border: 0, display: 'block',
          transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center',
        }} />
    </div>
  );
}

/**
 * THE PREVIEW ON A PHONE (owner ruling 2026-10-11), page 3 only: below 768px
 * the photo side is hidden, as in onboarding, and a giver must still see what
 * they are buying. Onboarding has no phone pattern for its photo side, so this
 * is a plain full-width panel under the form, collapsed until asked for.
 */
function PhonePreview({ draft }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden" data-gift-phone-preview style={{ marginTop: 40, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', minHeight: 44, background: 'none', border: 'none', borderBottom: open ? 'none' : '1px solid rgba(10,10,10,0.12)', color: INK, fontSize: 16, fontWeight: 600, fontFamily: PJS, cursor: 'pointer' }}>
        See what they will get
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ margin: '0 -16px' }}><EmailPreview draft={draft} fit /></div>}
    </div>
  );
}

/**
 * A style chip's label in its own face. The handwriting sample is live text in
 * the self-hosted Caveat (owner ruling 2026-10-13): it inherits the pill's
 * color, white on black when selected, with no background of its own.
 */
export function styleSample(st) {
  // Through the .oi-note-face escape (src/index.css): the global Plus Jakarta
  // Sans lock beats an inline fontFamily, which is why these samples showed in
  // the product face. Color is inherited from the pill.
  if (st.key === 'hand') return <span data-style-sample="hand" className="oi-note-face" style={{ '--oi-note-font': CAVEAT, fontSize: 19, lineHeight: 1 }}>{st.label}</span>;
  if (st.key === 'serif') return <span data-style-sample="serif" className="oi-note-face" style={{ '--oi-note-font': "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: 16 }}>{st.label}</span>;
  return <span>{st.label}</span>;
}

export default function GiftV2() {
  const [params] = useSearchParams();
  const on = isGiftingV2On();
  const [draft, setDraft] = useState(() => {
    if (params.get('sample') === '1') return { ...SAMPLE, step: Number(params.get('step')) || 1 };
    return readDraft() || EMPTY;
  });
  // Page 3's accordion: collapsed by default, the first section open.
  const [openSection, setOpenSection] = useState(params.get('section') || 'note');
  const tz = useMemo(() => browserTimezone(), []);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(false);
  // Back from Stripe: the payment went through, so the giver sees the done page.
  useEffect(() => { if (params.get('paid') === '1') setDraft((d) => ({ ...d, step: 4 })); }, [params]);
  useEffect(() => { loadFontFamilies(['Cormorant Garamond']); ensureCaveat(); }, []);
  useEffect(() => { writeDraft(draft); }, [draft]);

  if (!on) return <Navigate to="/gifting" replace />;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const pay = async () => {
    setPaying(true);
    setPayError(false);
    const result = await startGiftV2Checkout(draft, tz);
    if (result.url) { window.location.assign(result.url); return; }
    // Only ever the fixed line below, never what the server said.
    setPayError(!!result.error);
    setPaying(false);
  };
  const go = (step) => set({ step: Math.max(1, Math.min(PAGES, step)) });
  const toggle = (key) => setOpenSection((cur) => (cur === key ? null : key));
  const plan = draft.plan || 'ultra';
  const vars = { giver: draft.giver, names: draft.names, email: draft.email, plan };
  const s = draft.step;
  // Trimmed and checked before Continue and Pay (owner ruling 2026-10-13):
  // a trailing full stop is not an address.
  const validEmail = isValidGiftEmail(draft.email);
  const photoSide = s === 1 ? { image: ONBOARDING_IMAGES.STEP_ONE }
    : s === 2 ? { image: ONBOARDING_IMAGES.WHO }
      : s === 4 ? { image: ONBOARDING_IMAGES.DONE }
        : { aside: <EmailPreview draft={draft} /> };
  // The whole note, never cut short (owner ruling 2026-10-13): the chip wraps.
  const notePreview = draft.note.trim();
  const styleLabel = NOTE_STYLES.find((x) => x.key === draft.noteStyle)?.label;
  const whenLabel = draft.when === 'date' && draft.date ? `${COPY.when.date.title}, ${draft.date}` : draft.when === 'date' ? COPY.when.date.title : COPY.when.now.title;

  const top = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 40px' }}>
      <OpeninviteLogo ground="light" size={24} />
      {s > 1 && s < PAGES && (
        <button type="button" onClick={() => go(s - 1)} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 14, fontFamily: PJS, cursor: 'pointer', padding: 8 }}>Back</button>
      )}
    </div>
  );

  return (
    <OnboardingShell contentMaxWidth={600} {...photoSide}>
      <style>{`
        .s1-input::placeholder { color: rgba(10,10,10,0.58); }
        .universe-grid { grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 700px) { .universe-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1000px) { .universe-grid { grid-template-columns: repeat(5, 1fr); } }
      `}</style>
      <div data-gift-step={s} style={{ padding: '32px 0 48px', fontFamily: PJS }}>
        {s !== 2 && top}

        {s === 1 && (
          <>
            <h1 style={heading}>{COPY.plan.heading}</h1>
            <p style={sub}>{COPY.plan.sub}</p>
            {/* BOTH PLANS ON ONE SCREEN (owner ruling 2026-10-13): side by
                side and compact, the whole card selects it, and one Continue
                below both replaces each card's Select button. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-plan-cards>
              {['pro', 'ultra'].map((p) => (
                <SelectCard key={p} wholeCard padding={24} title={<PlanBadge plan={p} {...BIG_BADGE} />} body={COPY.plan[p]} selected={draft.plan === p} onSelect={() => set({ plan: p })}>
                  <ul data-plan-lines style={{ listStyle: 'none', margin: '-12px 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {COPY.plan[`${p}Lines`].map((line) => (
                      <li key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555555', fontSize: 14, fontFamily: PJS }}>
                        <span style={{ color: '#E03553', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>•</span> {line}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 28, fontWeight: 800, color: INK, margin: 'auto 0 0', fontFamily: PJS }}>{priceLabel(p)}</p>
                </SelectCard>
              ))}
            </div>
            <button type="button" className={primary} disabled={!draft.plan} onClick={() => go(2)} style={{ marginTop: 32 }} data-plan-continue>Continue →</button>
          </>
        )}

        {/* PAGE 2 IS ONBOARDING STEP 1 (owner ruling 2026-10-13: "not a
            lookalike"): the same chrome and the same component, with the
            gift's three lines. The address is trimmed and checked by the
            product's validator before Continue appears. */}
        {s === 2 && (
          <div data-gift-page2>
            <ShellStepChrome showStepCounter stepNum={2} totalSteps={PAGES} showBack onBack={() => go(1)} />
            <OnboardingStep1Names
              data={draft}
              lines={[
                { key: 'names', text: COPY.who.forLine, placeholder: COPY.who.namesLabel, fit: true },
                { key: 'email', text: COPY.who.toLine, placeholder: COPY.who.emailLabel, type: 'email', valid: isValidGiftEmail, hint: EMAIL_CHECK, fit: true },
                { key: 'giver', text: COPY.who.fromLine, placeholder: COPY.who.giverLabel, fit: true },
              ]}
              onNext={(v) => set({ names: v.names.trim(), email: normalizeGiftEmail(v.email), giver: v.giver.trim(), step: 3 })}
            />
          </div>
        )}

        {s === 3 && (
          <>
            <h1 style={heading}>{COPY.theirs.heading}</h1>
            <div data-gift-accordion style={{ marginTop: 24, borderTop: `1px solid ${color.border}` }}>
              <AccordionSection summaryWrap title={COPY.theirs.note} isOpen={openSection === 'note'} onToggle={() => toggle('note')} summary={notePreview ? [notePreview, styleLabel] : []}>
                <textarea value={draft.note} maxLength={NOTE_MAX} rows={5} placeholder={COPY.theirs.note} aria-label={COPY.theirs.note} className="s1-input"
                  onChange={(e) => set({ note: e.target.value })}
                  style={{ ...nameInputStyle(draft.note, false), fontSize: 17, fontWeight: 400, lineHeight: 1.6, resize: 'vertical' }} />
                <p style={{ fontSize: 12, color: MUTED, fontFamily: PJS, margin: '6px 0 14px', textAlign: 'right' }}>{draft.note.length}/{NOTE_MAX}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {NOTE_STYLES.map((st) => <Pill key={st.key} label={styleSample(st)} selected={draft.noteStyle === st.key} onClick={() => set({ noteStyle: st.key })} />)}
                </div>
              </AccordionSection>
              <AccordionSection summaryWrap title={COPY.theirs.headline} isOpen={openSection === 'headline'} onToggle={() => toggle('headline')} summary={[headlineText(draft.headlineKey, draft.names)]}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HEADLINES.map((h) => <Pill key={h.key} label={headlineText(h.key, draft.names)} selected={draft.headlineKey === h.key} onClick={() => set({ headlineKey: h.key })} />)}
                </div>
              </AccordionSection>
              <AccordionSection summaryWrap title={COPY.theirs.photo} isOpen={openSection === 'photo'} onToggle={() => toggle('photo')} summary={[photoLabel(draft.photoId)]}>
                <div className="universe-grid" style={{ display: 'grid', gap: 3 }}>
                  {GIFT_PHOTOS.map((p, i) => (
                    <UniverseGridTile key={p.id} index={i} hideExplore caption
                      universe={{ id: p.id, name: p.label, colors: {} }}
                      imageSrc={giftPhotoUrl(p.id, { width: 600, ratio: '3:4' })}
                      isSelected={draft.photoId === p.id}
                      onExplore={() => set({ photoId: p.id })} onSelectTile={() => set({ photoId: p.id })} />
                  ))}
                </div>
              </AccordionSection>
              <AccordionSection summaryWrap title={COPY.theirs.when} isOpen={openSection === 'when'} onToggle={() => toggle('when')} summary={[whenLabel]}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Pill label={COPY.when.now.title} selected={draft.when === 'now'} onClick={() => set({ when: 'now' })} />
                  <Pill label={COPY.when.date.title} selected={draft.when === 'date'} onClick={() => set({ when: 'date' })} />
                </div>
                <p style={{ fontSize: 12, color: MUTED, fontFamily: PJS, margin: '12px 0 0' }}>{draft.when === 'date' ? COPY.when.date.line : COPY.when.now.line}</p>
                {draft.when === 'date' && (
                  <div style={{ marginTop: 12 }}>
                    <input type="date" aria-label="The morning it lands" value={draft.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ date: e.target.value })}
                      style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${color.border}`, color: INK, fontFamily: PJS, fontSize: 13, padding: '6px 2px', width: 280, outline: 'none' }} />
                    <p style={{ fontSize: 12, color: MUTED, fontFamily: PJS, margin: '8px 0 0' }}>{COPY.when.tzLine.replace('{timezone}', timezoneInWords(tz) || 'your timezone')}</p>
                  </div>
                )}
              </AccordionSection>
            </div>

            <div data-gift-summary style={{ marginTop: 32, borderTop: '1px solid rgba(10,10,10,0.12)' }}>
              {[['Gift', <span key="g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Openinvite <PlanBadge plan={plan} {...BIG_BADGE} /></span>], ['For', draft.names], ['To', draft.email], ['From', draft.giver], ['Total', priceLabel(plan)]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(10,10,10,0.12)', fontSize: 15, fontFamily: PJS }}>
                  <span style={{ color: MUTED }}>{k}</span><span style={{ color: INK, fontWeight: k === 'Total' ? 700 : 500, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: MUTED, fontFamily: PJS, margin: '16px 0 0', lineHeight: 1.5 }}>{COPY.when.fine}</p>
            {/* PAY (item 6): the draft goes to checkout, which holds it server
                side and sends the giver to Stripe; Stripe returns them to
                /gift?paid=1, which opens the done page. */}
            <button type="button" className={primary} disabled={paying || !validEmail || !draft.note.trim() || (draft.when === 'date' && !draft.date)} onClick={pay} style={{ marginTop: 24 }}>
              {`Pay ${priceLabel(plan)} and send`}
            </button>
            {payError && <p role="alert" data-gift-pay-error style={{ fontSize: 14, color: '#B0263F', fontFamily: PJS, margin: '12px 0 0' }}>{GIFT_TRY_AGAIN}</p>}
            <PhonePreview draft={draft} />
          </>
        )}

        {s === 4 && (
          <OnboardingCompletion onDone={() => {}} data={{}} heading={fill(COPY.done.heading, vars)} body={fill(COPY.done.body, vars)}>
            <div style={{ border: '1px solid rgba(10,10,10,0.18)', padding: 20, margin: '0 0 20px' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: INK, margin: '0 0 8px', fontFamily: PJS }}>{COPY.done.boxTitle}</p>
              <p data-done-box style={{ fontSize: 15, lineHeight: 1.6, color: INK, margin: 0, fontFamily: PJS }}>{withPlanBadge(fill(COPY.done.box, { ...vars, plan: null }), plan)}</p>
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
