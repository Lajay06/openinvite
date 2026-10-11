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
 * written to PlanGift before Stripe confirms. The pay step is a stub that goes
 * nowhere: checkout is item 6.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import { SelectCard } from '@/components/onboarding/OnboardingStep8Fork';
import { AccordionSection, Pill } from '@/components/onboarding/OnboardingStep5WeddingType';
import { UniverseGridTile } from '@/components/onboarding/OnboardingStepUniverse';
import OnboardingCompletion from '@/components/onboarding/OnboardingCompletion';
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import PlanBadge from '@/components/shared/PlanBadge';
import { renderGiftReveal, noteImageUrl } from '@/lib/giftEmailTemplate';
import { resolveCheckoutPriceId, PLAN_PRICES } from '@/lib/checkoutSession';
import { loadFontFamilies } from '@/lib/selfHostedFonts';
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
const BIG_BADGE = { padding: '3px 8px', fontSize: 13 };

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
function withPlanBadge(text, plan) {
  const parts = String(text).split('{Plan}');
  return parts.flatMap((p, i) => (i === 0 ? [p] : [<PlanBadge key={i} plan={plan} {...BIG_BADGE} />, p]));
}

const heading = { fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: INK, fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.15 };
const sub = { fontSize: 16, color: MUTED, fontFamily: PJS, margin: '0 0 32px', lineHeight: 1.6 };
const primary = 'px-8 py-3 rounded-full text-white text-sm font-medium bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 border-none cursor-pointer disabled:opacity-40 disabled:cursor-default';

/**
 * ONBOARDING'S NAMES-STEP INPUT, REUSED AS ITS PATTERN (onboarding has no
 * input component): the placeholder is the label, grey until typed, no box,
 * an underline that turns pink once there is a value or focus. The one
 * difference is the width: the names step caps a name at 300px, and an email
 * address does not fit in 300px at this size, so these run the column's width.
 */
const nameInputStyle = (value, focused) => ({
  background: 'transparent', border: 'none',
  borderBottom: (value || focused) ? '2px solid #ec4899' : '1px solid rgba(10,10,10,0.18)',
  width: '100%', fontSize: 32, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS,
  padding: '4px 8px', outline: 'none', textAlign: 'left',
});
function UnderlineInput({ value, onChange, placeholder, type = 'text', autoComplete = 'off' }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} placeholder={placeholder} aria-label={placeholder} className="s1-input" autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={nameInputStyle(value, focused)} />
  );
}

/** The live email preview: the template's own HTML, nothing redrawn. `fit` sizes it to the email on a phone. */
function EmailPreview({ draft, fit = false }) {
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
  // On a phone the frame takes the email's own height, so the page scrolls
  // rather than a box inside it. allow-same-origin (no scripts) lets the
  // frame be measured; nothing in the email runs.
  const [height, setHeight] = useState(1400);
  const measure = (e) => { try { setHeight(e.currentTarget.contentDocument.documentElement.scrollHeight); } catch { /* keep the default */ } };
  return (
    <div data-gift-preview={fit ? 'phone' : 'side'} style={{ height: fit ? 'auto' : '100%', background: '#F7F7F7' }}>
      <iframe title="Their email, as they will see it" srcDoc={html} sandbox={fit ? 'allow-same-origin' : ''} onLoad={fit ? measure : undefined}
        style={{ width: '100%', height: fit ? height : '100%', border: 0, display: 'block' }} />
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

/** A style chip's label in its own face: the handwriting sample is the same Cloudinary render the email uses. */
function styleSample(st) {
  if (st.key === 'hand') return <img src={noteImageUrl(st.label, 'hand', { ground: 'FFFFFF' })} alt={st.label} style={{ height: 16, width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} />;
  return <span style={st.key === 'serif' ? { fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15 } : undefined}>{st.label}</span>;
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
  useEffect(() => { loadFontFamilies(['Cormorant Garamond']); }, []);
  useEffect(() => { writeDraft(draft); }, [draft]);

  if (!on) return <Navigate to="/gifting" replace />;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const go = (step) => set({ step: Math.max(1, Math.min(PAGES, step)) });
  const toggle = (key) => setOpenSection((cur) => (cur === key ? null : key));
  const plan = draft.plan || 'ultra';
  const vars = { giver: draft.giver, names: draft.names, email: draft.email, plan };
  const s = draft.step;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
  const photoSide = s === 1 ? { image: ONBOARDING_IMAGES.STEP_ONE }
    : s === 2 ? { image: ONBOARDING_IMAGES.WHO }
      : s === 4 ? { image: ONBOARDING_IMAGES.DONE }
        : { aside: <EmailPreview draft={draft} /> };
  const notePreview = draft.note.trim() ? `${draft.note.trim().slice(0, 40)}${draft.note.trim().length > 40 ? '...' : ''}` : '';
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
        {top}

        {s === 1 && (
          <>
            <h1 style={heading}>{COPY.plan.heading}</h1>
            <p style={sub}>{COPY.plan.sub}</p>
            <div className="grid grid-cols-1 gap-6">
              {['pro', 'ultra'].map((p) => (
                <SelectCard key={p} title={<PlanBadge plan={p} {...BIG_BADGE} />} body={COPY.plan[p]} selected={draft.plan === p} onSelect={() => set({ plan: p, step: 2 })}>
                  <ul data-plan-lines style={{ listStyle: 'none', margin: '-12px 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {COPY.plan[`${p}Lines`].map((line) => (
                      <li key={line} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555555', fontSize: 14, fontFamily: PJS }}>
                        <span style={{ color: '#E03553', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>•</span> {line}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 28, fontWeight: 800, color: INK, margin: '0 0 24px', fontFamily: PJS }}>{priceLabel(p)}</p>
                </SelectCard>
              ))}
            </div>
          </>
        )}

        {s === 2 && (
          <>
            <h1 style={heading}>{COPY.who.heading}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
              <UnderlineInput value={draft.names} onChange={(v) => set({ names: v })} placeholder={COPY.who.namesLabel} />
              <UnderlineInput value={draft.email} onChange={(v) => set({ email: v })} placeholder={COPY.who.emailLabel} type="email" />
              <UnderlineInput value={draft.giver} onChange={(v) => set({ giver: v })} placeholder={COPY.who.giverLabel} autoComplete="name" />
            </div>
            <button type="button" className={primary} disabled={!(draft.names.trim() && validEmail && draft.giver.trim())} onClick={() => go(3)} style={{ marginTop: 48 }}>Continue →</button>
          </>
        )}

        {s === 3 && (
          <>
            <h1 style={heading}>{COPY.theirs.heading}</h1>
            <div data-gift-accordion style={{ marginTop: 24, borderTop: `1px solid ${color.border}` }}>
              <AccordionSection title={COPY.theirs.note} isOpen={openSection === 'note'} onToggle={() => toggle('note')} summary={notePreview ? [notePreview, styleLabel] : []}>
                <textarea value={draft.note} maxLength={NOTE_MAX} rows={5} placeholder={COPY.theirs.note} aria-label={COPY.theirs.note} className="s1-input"
                  onChange={(e) => set({ note: e.target.value })}
                  style={{ ...nameInputStyle(draft.note, false), fontSize: 17, fontWeight: 400, lineHeight: 1.6, resize: 'vertical' }} />
                <p style={{ fontSize: 12, color: MUTED, fontFamily: PJS, margin: '6px 0 14px', textAlign: 'right' }}>{draft.note.length}/{NOTE_MAX}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {NOTE_STYLES.map((st) => <Pill key={st.key} label={styleSample(st)} selected={draft.noteStyle === st.key} onClick={() => set({ noteStyle: st.key })} />)}
                </div>
              </AccordionSection>
              <AccordionSection title={COPY.theirs.headline} isOpen={openSection === 'headline'} onToggle={() => toggle('headline')} summary={[headlineText(draft.headlineKey, draft.names)]}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HEADLINES.map((h) => <Pill key={h.key} label={headlineText(h.key, draft.names)} selected={draft.headlineKey === h.key} onClick={() => set({ headlineKey: h.key })} />)}
                </div>
              </AccordionSection>
              <AccordionSection title={COPY.theirs.photo} isOpen={openSection === 'photo'} onToggle={() => toggle('photo')} summary={[photoLabel(draft.photoId)]}>
                <div className="universe-grid" style={{ display: 'grid', gap: 3 }}>
                  {GIFT_PHOTOS.map((p, i) => (
                    <UniverseGridTile key={p.id} index={i} hideExplore
                      universe={{ id: p.id, name: p.label, colors: {} }}
                      imageSrc={giftPhotoUrl(p.id, { width: 600, ratio: '3:4' })}
                      isSelected={draft.photoId === p.id}
                      onExplore={() => set({ photoId: p.id })} onSelectTile={() => set({ photoId: p.id })} />
                  ))}
                </div>
              </AccordionSection>
              <AccordionSection title={COPY.theirs.when} isOpen={openSection === 'when'} onToggle={() => toggle('when')} summary={[whenLabel]}>
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
            {/* THE PAY STEP IS A STUB: it goes to the done page and charges
                nothing. Checkout is item 6, held. */}
            <button type="button" className={primary} disabled={!draft.note.trim() || (draft.when === 'date' && !draft.date)} onClick={() => go(4)} style={{ marginTop: 24 }}>
              {`Pay ${priceLabel(plan)} and send`}
            </button>
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
