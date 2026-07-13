import React, { useState, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import SectionReveal from '../SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import EditorialSectionKicker from '../layouts/EditorialSectionKicker';
import MinimalSectionMark from '../layouts/MinimalSectionMark';
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

const STATUS = { idle: 'idle', sending: 'sending', sent: 'sent', error: 'error' };
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function WeddingRSVPPage({ weddingDetails, theme, typography, universeConfig }) {
  const content = weddingDetails.rsvpContent || {};
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(STATUS.idle);

  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isEditorial = universeConfig?.layout === 'editorial-masthead';
  const isMinimal = universeConfig?.layout === 'aman-minimal';
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
        body: JSON.stringify({ email, weddingSlug: weddingDetails.slug, turnstileToken: tsTokenRef.current }),
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
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '110px 40px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <ParisSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', letterSpacing: '0.04em', color: theme.accent, marginBottom: 32 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 40px', fontSize: '0.9375rem', fontFamily: typography.bodyFont, lineHeight: 1.75 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', textAlign: 'center', backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isCapri) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '90px 32px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <CapriSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)', margin: '0 0 20px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.875rem', fontWeight: 600, color: theme.accent, marginBottom: 28 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 32px', fontSize: '1rem', fontFamily: typography.headingFont, lineHeight: 1.65 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isMykonos) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '130px 48px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MykonosSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, letterSpacing: '-0.01em', fontSize: 'clamp(2rem, 5vw, 2.75rem)', margin: '0 0 28px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', color: theme.accent, marginBottom: 32 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 40px', fontSize: '0.9375rem', fontFamily: typography.bodyFont, lineHeight: 1.75 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isCapeTown) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '100px 48px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <CapeTownSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 2.75rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.875rem', color: theme.accent, marginBottom: 32 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 32px', fontSize: '1rem', fontFamily: typography.headingFont, lineHeight: 1.8 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isKyoto) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '130px 48px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <KyotoSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', letterSpacing: '0.01em', margin: '0 0 28px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', color: theme.accent, marginBottom: 40 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 48px', fontSize: '1rem', fontFamily: typography.bodyFont, lineHeight: 1.9, opacity: 0.85 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', backgroundColor: 'transparent', border: 'none',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isBrooklyn) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '100px 32px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <BrooklynSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} accentColor={theme.accent} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.5rem, 7vw, 4rem)', margin: '0 0 20px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', fontWeight: 600, color: theme.accent, marginBottom: 32 }}>
              Respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 36px', fontSize: '1rem', fontFamily: typography.bodyFont, lineHeight: 1.7 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isBali) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '100px 40px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <BaliSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.875rem', color: theme.accent, marginBottom: 32 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 32px', fontSize: '1rem', fontFamily: typography.headingFont, lineHeight: 1.75 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    width: '100%', backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  if (isMinimal) {
    const fieldColor = theme.lightText;
    return (
      <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '120px 24px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <MinimalSectionMark kicker={copy.rsvpKicker} theme={theme} typography={typography} />
          </SectionReveal>

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontStyle: 'italic', fontSize: 'clamp(2rem, 4.5vw, 2.75rem)', margin: '0 0 24px' }}>
              RSVP
            </h1>
          </SectionReveal>

          {content.rsvpDeadline && (
            <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)} style={{ fontSize: '0.8125rem', letterSpacing: '0.04em', color: theme.accent, marginBottom: 40 }}>
              Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
            </SectionReveal>
          )}

          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <p style={{ margin: '0 0 48px', fontSize: '1rem', fontFamily: typography.headingFont, fontStyle: 'italic', lineHeight: 1.7, opacity: 0.85 }}>
              {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </SectionReveal>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.lightBg, color: theme.lightText, minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        {isEditorial && (
          <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
            <EditorialSectionKicker kicker={copy.rsvpKicker} theme={theme} typography={typography} align="center" />
          </SectionReveal>
        )}
        <SectionReveal universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}>
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: typography.headingWeight,
              fontStyle: isEditorial ? 'italic' : 'normal',
              marginBottom: '12px',
              textAlign: 'center'
            }}
          >
            RSVP
          </h1>
        </SectionReveal>

        {content.rsvpDeadline && (
          <SectionReveal
            universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              color: theme.accent,
              marginBottom: '32px'
            }}
          >
            Please respond by {new Date(content.rsvpDeadline).toLocaleDateString()}
          </SectionReveal>
        )}

        <SectionReveal
          universeConfig={universeConfig} disabled={!isMotionEnabled(weddingDetails)}
          style={{
            backgroundColor: theme.darkBg,
            color: theme.darkText,
            padding: '40px',
            borderRadius: 0
          }}
        >
          <p style={{
            margin: '0 0 28px',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: theme.darkText,
            opacity: 0.85,
          }}>
            {copy.rsvpIntro || "Each guest responds using their own personal invite link. If you can't find yours, enter the email your invite was sent to and we'll send it straight to your inbox."}
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
                    backgroundColor: 'transparent',
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
                {status === STATUS.sending ? 'Sending…' : (copy.rsvpCta || 'Send me my RSVP link')}
              </button>
            </>
          )}
        </SectionReveal>
      </div>
    </div>
  );
}
