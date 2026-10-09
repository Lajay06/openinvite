import React, { useState, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
// EVERY READER OF THE DEADLINE GOES THROUGH THE SHARED FORMATTER.
// These nine lines did `new Date(value).toLocaleDateString()`, and a bare
// YYYY-MM-DD parses as UTC midnight while toLocaleDateString renders in the
// viewer's zone, so a 2027-05-01 deadline printed 4/30/2027 in Los Angeles:
// the guest was told a day earlier than the couple typed. src/lib/rsvpDeadline.js
// builds the date in local time so the calendar day survives.
import { formatDeadline } from '@/lib/rsvpDeadline';
import MinimalSectionMark from '../layouts/MinimalSectionMark';
import { sectionMarkFor, pageAnchorFor } from '../layouts/sectionMarks';
import HairlineRule from '../layouts/HairlineRule';
import KyotoSectionMark from '../layouts/KyotoSectionMark';
import VerticalRule from '../layouts/VerticalRule';
import BrooklynSectionMark from '../layouts/BrooklynSectionMark';
import TicketStub from '../layouts/TicketStub';
import BaliSectionMark from '../layouts/BaliSectionMark';
import WaveDivider from '../layouts/WaveDivider';
import ParisSectionMark from '../layouts/ParisSectionMark';
import CapriSectionMark from '../layouts/CapriSectionMark';
import MykonosSectionMark from '../layouts/MykonosSectionMark';
import CapeTownSectionMark from '../layouts/CapeTownSectionMark';
import VineRule from '../layouts/VineRule';
import { getCachedWeddingPassword } from '@/lib/guestSitePassword';
import RsvpForm from '@/components/rsvp/RSVPPage';
import GuestNoteForm from '../GuestNoteForm';
import { formSurfaces } from '@/lib/surfaceTint';

const STATUS = { idle: 'idle', sending: 'sending', sent: 'sent', error: 'error' };
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * THE GATE'S COPY, AND WHICH HALF A UNIVERSE MAY SPEAK IN ITS OWN VOICE.
 *
 * Owner ruling 2026-09-27: "universe voices may keep their own INTRO line if
 * they already tell the guest what happens; the functional sentence and the
 * button are global and not overridable."
 *
 * So the paragraph is two parts. The FRAMING is a default that any of the 19
 * universe voices replaces — that is what `copy.rsvpIntro` is for, and the
 * comment on RecognisedRsvp below explains why flattening those voices under one
 * fallback is the thing to avoid. The FUNCTIONAL sentence is appended every
 * time, in every universe, because a guest who cannot find their invitation
 * needs to be told what this box does in words that do not vary.
 *
 * ONE DEFINITION EACH, not nine copies. This page has nine per-universe layout
 * branches and the old strings were written out nine times apiece; a change
 * then had to be made nine times or it was made wrong.
 */
const GATE_FRAMING = 'Your reply is tied to your personal invitation.';
const GATE_FUNCTIONAL = "Enter the email your invitation was sent to and we'll send your link again.";
/** Global, and deliberately not `copy.rsvpCta` — see the ruling above. */
const GATE_CTA = 'Send my link';

export default function WeddingRSVPPage({
  weddingDetails, theme, typography, universeConfig,
  recognisedToken = '', onForgetGuest,
}) {
  const S = formSurfaces(theme);
  const content = weddingDetails.rsvpContent || {};

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(STATUS.idle);

  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  // A RECOGNISED GUEST GETS THEIR OWN FORM, right here on the tab.
  //
  // This is the whole point of the work: the site is the invitation, one of its
  // pages is the RSVP, and replying does not eject the guest from the site they
  // were reading. No email box, no second step, no separate destination.
  //
  // The email bridge below is what an UNRECOGNISED visitor sees -- a fallback
  // state on this tab, not the page itself. That is the inversion: it used to be
  // the only thing here.
  if (recognisedToken) {
    return (
      <RecognisedRsvp
        token={recognisedToken}
        onForgetGuest={onForgetGuest}
        weddingDetails={weddingDetails}
        theme={theme}
        typography={typography}
        universeConfig={universeConfig}
      />
    );
  }


  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isEditorial = universeConfig?.layout === 'editorial-masthead';
  const isMinimal = universeConfig?.layout === 'london-minimal';
  const isKyoto = universeConfig?.layout === 'kyoto-vertical';
  const isBrooklyn = universeConfig?.layout === 'brooklyn-offgrid';
  const isBali = universeConfig?.layout === 'bali-organic';
  const isParis = universeConfig?.layout === 'paris-couture';
  const isCapri = universeConfig?.layout === 'capri-citrus';
  const isMykonos = universeConfig?.layout === 'mykonos-whitewash';
  const isCapeTown = universeConfig?.layout === 'capetown-estate';
  const copy = universeConfig?.copy || {};

  const handleSubmit = async () => {
    if (!isValidEmail || status === STATUS.sending) return;
    if (!tsTokenRef.current) { setStatus(STATUS.error); return; }
    setStatus(STATUS.sending);
    try {
      const res = await fetch('/api/rsvp-link-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, weddingSlug: weddingDetails.slug, turnstileToken: tsTokenRef.current,
          password: getCachedWeddingPassword(weddingDetails.slug) }),
      });
      setStatus(res.ok ? STATUS.sent : STATUS.error);
      tsTokenRef.current = '';
      turnstileRef.current?.reset();
    } catch {
      setStatus(STATUS.error);
    }
  };

  if (isParis) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '110px 40px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <ParisSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', letterSpacing: '0.04em', color: theme.accent, marginBottom: 32 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" style={{ margin: '0 0 40px', fontSize: '0.9375rem', fontFamily: typography.bodyFont, lineHeight: 1.75 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <HairlineRule color={fieldColor} opacity={0.3} width={60} style={{ margin: '0 auto 24px' }} />
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.24em', textTransform: 'uppercase', color: fieldColor, opacity: 0.55, display: 'block', marginBottom: '12px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', textAlign: 'center', backgroundColor: S.surface,
                    border: 'none', borderBottom: `1px solid ${fieldColor}30`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 32px', backgroundColor: theme.accent, color: theme.lightBg,
                  border: 'none', borderRadius: 0,
                  fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase',
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '8px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCapri) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '90px 32px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <CapriSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)', margin: '0 0 20px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.875rem', fontWeight: 600, color: theme.accent, marginBottom: 28 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" className="wb-display-face" style={{ margin: '0 0 32px', fontSize: '1rem', fontFamily: typography.headingFont, lineHeight: 1.65 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.accent, display: 'block', marginBottom: '10px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', backgroundColor: S.surface,
                    border: 'none', borderBottom: `1px solid ${fieldColor}40`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px', backgroundColor: theme.accent, color: theme.lightBg,
                  border: 'none', borderRadius: 999,
                  fontSize: '0.875rem', fontWeight: 700,
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '4px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isMykonos) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '130px 48px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MykonosSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, letterSpacing: '-0.01em', fontSize: 'clamp(2rem, 5vw, 2.75rem)', margin: '0 0 28px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', color: theme.accent, marginBottom: 32 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" style={{ margin: '0 0 40px', fontSize: '0.9375rem', fontFamily: typography.bodyFont, lineHeight: 1.75 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: fieldColor, opacity: 0.5, display: 'block', marginBottom: '10px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', backgroundColor: S.surface,
                    border: 'none', borderBottom: `1px solid ${fieldColor}30`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px', backgroundColor: theme.accent, color: theme.lightBg,
                  border: 'none', borderRadius: 0,
                  fontSize: '0.8125rem', fontWeight: 600,
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '4px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCapeTown) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '100px 48px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <CapeTownSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 2.75rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.875rem', color: theme.accent, marginBottom: 32 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" className="wb-display-face" style={{ margin: '0 0 32px', fontSize: '1rem', fontFamily: typography.headingFont, lineHeight: 1.8 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          <VineRule color={fieldColor} opacity={0.4} style={{ maxWidth: 140, marginBottom: 32 }} />

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.06em', color: theme.accent, display: 'block', marginBottom: '10px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', backgroundColor: S.surface,
                    border: 'none', borderBottom: `1px solid ${fieldColor}40`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px', backgroundColor: theme.accent, color: theme.lightBg,
                  border: 'none', borderRadius: 999,
                  fontSize: '0.875rem', fontWeight: 600,
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '4px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isKyoto) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '130px 48px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <KyotoSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.01em', margin: '0 0 28px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', color: theme.accent, marginBottom: 40 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" style={{ margin: '0 0 48px', fontSize: '1rem', fontFamily: typography.bodyFont, lineHeight: 1.9, opacity: 0.85 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ display: 'flex', gap: 20 }}>
              <VerticalRule color={theme.accent} opacity={0.4} height={44} style={{ flexShrink: 0, marginTop: 4 }} />
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.8, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: fieldColor, opacity: 0.5, display: 'block', marginBottom: '12px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', backgroundColor: S.surface, border: 'none',
                    borderBottom: `1px solid ${fieldColor}30`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px', backgroundColor: theme.accent, color: theme.darkBg,
                  border: 'none', borderRadius: 0,
                  fontSize: '0.8125rem', fontWeight: 500, letterSpacing: '0.04em',
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '8px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isBrooklyn) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '100px 32px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <BrooklynSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.5rem, 7vw, 4rem)', margin: '0 0 20px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', fontWeight: 600, color: theme.accent, marginBottom: 32 }}>
              Respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" style={{ margin: '0 0 36px', fontSize: '1rem', fontFamily: typography.bodyFont, lineHeight: 1.7 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <TicketStub color={theme.accent} width={80} height={10} style={{ marginBottom: 20 }} />
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.accent, display: 'block', marginBottom: '10px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', backgroundColor: S.surface,
                    border: 'none', borderBottom: `2px solid ${fieldColor}`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '14px 32px', backgroundColor: theme.accent, color: theme.lightBg,
                  border: 'none', borderRadius: 0,
                  fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '8px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isBali) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '100px 40px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <BaliSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.875rem', color: theme.accent, marginBottom: 32 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" className="wb-display-face" style={{ margin: '0 0 32px', fontSize: '1rem', fontFamily: typography.headingFont, lineHeight: 1.75 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          <WaveDivider color={fieldColor} opacity={0.3} height={16} style={{ maxWidth: 140, marginBottom: 32 }} />

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, margin: 0 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.1em', color: theme.accent, display: 'block', marginBottom: '10px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', backgroundColor: S.surface,
                    border: 'none', borderBottom: `1px solid ${fieldColor}40`, padding: '8px 0',
                    color: fieldColor, fontSize: '1rem', fontFamily: typography.bodyFont, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px', backgroundColor: theme.accent, color: theme.lightBg,
                  border: 'none', borderRadius: 999,
                  fontSize: '0.875rem', fontWeight: 600,
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '4px',
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isMinimal) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '120px 24px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MinimalSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 data-oi-anchor="heading" style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontStyle: 'italic', fontSize: 'clamp(2rem, 4.5vw, 2.75rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', letterSpacing: '0.04em', color: theme.accent, marginBottom: 40 }}>
              Please respond by {formatDeadline(content.rsvpDeadline)}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p data-oi-anchor="paragraph" className="wb-display-face" style={{ margin: '0 0 48px', fontSize: '1rem', fontFamily: typography.headingFont, fontStyle: 'italic', lineHeight: 1.7, opacity: 0.85 }}>
              {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
            </p>
          </SectionReveal>

          {status === STATUS.sent ? (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <HairlineRule color={fieldColor} opacity={0.2} width={40} style={{ margin: '0 auto 32px' }} />
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}>
                {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
              </p>
            </SectionReveal>
          ) : (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
              <HairlineRule color={fieldColor} opacity={0.2} width={40} style={{ margin: '0 auto 40px' }} />

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.24em', textTransform: 'uppercase', color: fieldColor, opacity: 0.5, display: 'block', marginBottom: '12px' }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    backgroundColor: S.surface,
                    border: 'none',
                    borderBottom: `1px solid ${fieldColor}30`,
                    padding: '8px 0',
                    color: fieldColor,
                    fontSize: '1rem',
                    fontFamily: typography.bodyFont,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 32px',
                  backgroundColor: 'transparent',
                  color: theme.accent,
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 999,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '8px'
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </SectionReveal>
          )}

          {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
              This screen asks for an address and sends a link; if the address
              is not on the list, or the question is something else entirely,
              it answered nothing. The note form is the same component and the
              same endpoint as the after-reply one, with no prefill — nobody
              has been recognized on this path, so there is nothing to know. */}
          <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
            <GuestNoteForm
              weddingDetails={weddingDetails}
              theme={theme}
              typography={typography}
              universeConfig={universeConfig}
              heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
            />
          </div>
        </div>
      </div>
    );
  }

  // THE DEFAULT BRANCH IS ELEVEN UNIVERSES, NOT A FALLBACK. Tulum and the ten
  // expansion universes (amalfi … shanghai) all land here, and until Batch 2
  // phase two it rendered a plain centered "RSVP" and never drew their own
  // mark — their copy.rsvpKicker existed and was never shown. Their mark now
  // opens the page as it does on every other page (GuestPageHeading), and the
  // heading, the deadline line and the intro follow that mark's anchor rather
  // than a fixed center. Marrakech's editorial kicker was forced center here,
  // the one page where it fought its own mark; it takes its own alignment now.
  const DefaultMark = sectionMarkFor(universeConfig);
  const anchor = pageAnchorFor(universeConfig);
  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        {/* A universe with no rsvpKicker (tulum) has no words for a kicker, so
            its mark carries the page title itself and is the page's only
            heading — as GuestPageHeading does on every other page. */}
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          {copy.rsvpKicker
            ? <DefaultMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
            : <DefaultMark as="h1" kicker="RSVP" theme={theme} typography={typography} accentColor={theme.accent} />}
        </SectionReveal>
        {copy.rsvpKicker && (
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <h1 data-oi-anchor="heading"
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: typography.headingWeight,
              fontStyle: isEditorial ? 'italic' : 'normal',
              marginBottom: '12px',
              textAlign: anchor
            }}
          >
            RSVP
          </h1>
        </SectionReveal>
        )}

        {content.rsvpDeadline && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              textAlign: anchor,
              fontSize: '0.875rem',
              color: theme.accent,
              marginBottom: '32px'
            }}
          >
            Please respond by {formatDeadline(content.rsvpDeadline)}
          </SectionReveal>
        )}

        {/* THE FORM CARD IS THE BLOCK. Its edge sits on the column, on the
            anchor with the mark and the heading; the words inside it are
            inset by its padding, as words in a card are. anchorRoot says so
            to the guard. */}
        <SectionReveal
          anchorRoot
          universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
          style={{
            backgroundColor: theme.darkBg,
            color: theme.darkText,
            padding: '40px',
            borderRadius: 0
          }}
        >
          <p data-oi-anchor="paragraph" style={{
            textAlign: anchor,
            margin: '0 0 28px',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: theme.darkText,
            opacity: 0.85,
          }}>
            {copy.rsvpIntro || GATE_FRAMING} {GATE_FUNCTIONAL}
          </p>

          {status === STATUS.sent ? (
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: theme.darkText }}>
              {copy.rsvpSent || "If that email is on the guest list, we've just sent your personal RSVP link — check your inbox (and spam folder, just in case)."}
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: theme.accent,
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === STATUS.error) setStatus(STATUS.idle); }}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    backgroundColor: S.surface,
                    border: 'none',
                    borderBottom: `1px solid ${theme.accent}40`,
                    padding: '8px 0',
                    color: theme.darkText,
                    fontSize: '1rem',
                    fontFamily: typography.bodyFont,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {status === STATUS.error && (
                <p style={{ fontSize: '0.8125rem', color: '#E03553', marginBottom: '16px' }}>
                  Something went wrong — please try again in a moment.
                </p>
              )}

              {/* Invisible Turnstile — execution="render" auto-generates a token on mount */}
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => { tsTokenRef.current = token; }}
                onExpire={() => { tsTokenRef.current = ''; }}
                options={{ appearance: 'execute', execution: 'render' }}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValidEmail || status === STATUS.sending}
                style={{
                  padding: '12px 28px',
                  backgroundColor: theme.accent,
                  color: theme.darkBg,
                  border: 'none',
                  borderRadius: 999,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: (!isValidEmail || status === STATUS.sending) ? 'not-allowed' : 'pointer',
                  opacity: (!isValidEmail || status === STATUS.sending) ? 0.5 : 1,
                  marginTop: '4px'
                }}
              >
                {status === STATUS.sending ? 'Sending…' : GATE_CTA}
              </button>
            </>
          )}
        </SectionReveal>

        {/* THE GUEST WHO CANNOT FIND THEIR INVITATION HAD NOWHERE TO GO.
            This screen asks for an address and sends a link; if the address
            is not on the list, or the question is something else entirely,
            it answered nothing. The note form is the same component and the
            same endpoint as the after-reply one, with no prefill — nobody
            has been recognized on this path, so there is nothing to know. */}
        <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${theme.accent}22` }}>
          <GuestNoteForm
            weddingDetails={weddingDetails}
            theme={theme}
            typography={typography}
            universeConfig={universeConfig}
            heading={(firstNames) => `Can't find your invitation, or have a question for ${firstNames}?`}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The recognised guest's own RSVP, embedded in the site.
 *
 * Two things sit above the form: a short warmth-only line (the mechanism
 * sentence is deleted — a guest who is already recognised does not need to be
 * told how to receive a link they have already used), and the "not you?"
 * control.
 *
 * That control is deliberately VISIBLE rather than tucked into a footer. It is
 * the shared-phone and family-computer answer, and recognition now outlives the
 * tab, so it is doing more work than it would with session-scoped storage. A
 * guest who is shown someone else's name must be able to fix it without
 * hunting.
 */
function RecognisedRsvp({ token, onForgetGuest, weddingDetails, theme, typography, universeConfig }) {
  // The universe's own copy, the same source the unrecognised intro reads
  // (universeConfig.copy, NOT weddingDetails.rsvpContent -- that is the
  // couple's overrides object and holds no universe defaults). Getting this
  // wrong renders the shared fallback under every one of the 19 voices, which
  // is exactly what the per-universe line exists to avoid.
  const copy = universeConfig?.copy || {};
  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100dvh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{
          fontFamily: typography.bodyFont, fontSize: '0.9375rem', lineHeight: 1.75,
          margin: '0 0 28px', textAlign: 'center',
        }}>
          {copy.rsvpWelcome || 'We are so glad you are here.'}
        </p>

        <RsvpForm token={token} embedded />

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            type="button"
            onClick={onForgetGuest}
            style={{
              // M-2: measured at 37px in WebKit. WCAG 2.5.5 wants 44; the
              // padding does the work so the underline still hugs the text.
              background: 'none', border: 'none', padding: '13px 8px', cursor: 'pointer',
              minHeight: 44, display: 'inline-flex', alignItems: 'center',
              fontFamily: typography.bodyFont, fontSize: '0.875rem',
              color: theme.lightText, opacity: 0.7,
              textDecoration: 'underline', textUnderlineOffset: '3px',
            }}
          >
            Not you? Use a different invitation
          </button>
        </div>
      </div>
    </div>
  );
}
