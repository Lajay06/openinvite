import React, { useState, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import SectionReveal from './SectionReveal';
import { isMotionEnabled } from '@/lib/universeStyling';
import { formSurfaces, accentChip } from '@/lib/surfaceTint';
import { getCachedWeddingPassword } from '@/lib/guestSitePassword';
import { coupleFirstNames } from '@/lib/coupleNames';

/**
 * GuestNoteForm — "A question for Ada & Alan?"
 *
 * ONE FORM, TWO PLACES: the bottom of the RSVP page once a reply is in, and
 * the bottom of Good to know. Both are moments when a guest has just finished
 * reading and is most likely to have a question, and neither had anywhere to
 * put one. Until now the only route to the couple was replying to an
 * invitation email — which works, and stays, but leaves nothing on their
 * dashboard and no record either of them can find again.
 *
 * WHY IT IS ONE COMPONENT AND NOT TWO COPIES. The two placements differ only
 * in what they can prefill: the RSVP page knows who the guest is, because they
 * arrived on a token; Good to know does not. Everything else — the endpoint,
 * the caps, the Turnstile gate, the sent line — is the same, and a second copy
 * of it would drift from the first the first time one was edited.
 *
 * THE UNIVERSE OWNS THE LOOK. Ground, ink, controls and the action all come
 * from the couple's palette through surfaceTint, exactly as the RSVP form and
 * the song-request form do. Nothing here is a hard-coded color, and there is no
 * souvenir vocabulary: a universe evokes its place through type and palette,
 * never through the words in a form label.
 *
 * FIRST NAMES, NOT FULL ONES. "A question for Ada Lovelace & Alan Turing?"
 * reads like a form; the guest is on the couple's own site and knows who they
 * are. See coupleFirstNames.
 */

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/** The server's own cap, repeated here so the box stops rather than the endpoint. */
const MAX_MESSAGE = 1000;

const STATUS = { idle: 'idle', sending: 'sending', sent: 'sent' };

export default function GuestNoteForm({
  weddingDetails, theme, typography, universeConfig,
  prefillName = '', prefillEmail = '',
}) {
  const slug = weddingDetails?.slug;
  const firstNames = coupleFirstNames(weddingDetails, 'the couple');

  const S = formSurfaces(theme);
  const chip = accentChip(theme);
  const reveal = { universeConfig, disabled: !isMotionEnabled(weddingDetails) };

  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(STATUS.idle);
  const [error, setError] = useState('');
  // THE ADDRESS THE SENT LINE NAMES IS THE ONE THAT WAS SENT, captured at
  // submit. Reading the live input would let the sentence change under a guest
  // who kept typing after it appeared.
  const [sentTo, setSentTo] = useState('');

  const turnstileRef = useRef(null);
  const tsTokenRef = useRef('');

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = !!name.trim() && emailLooksValid && !!message.trim()
    && status !== STATUS.sending;

  // NO SLUG, NO FORM. The component is rendered by page components that the
  // builder canvas also renders, and a canvas has no published wedding to post
  // to — so rather than offering a guest a button that cannot work, it is not
  // drawn at all. That is also what keeps this out of every editor: an editor
  // rendering the page with no slug shows the page without the form, which is
  // exactly what a guest sees on an unpublished site.
  if (!slug) return null;

  const send = async () => {
    if (!canSubmit) return;
    if (!tsTokenRef.current) {
      setError('Security check still loading — please try again in a moment.');
      return;
    }
    setError('');
    setStatus(STATUS.sending);
    const address = email.trim();
    try {
      const res = await fetch('/api/guest-note-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug: slug,
          name: name.trim(),
          email: address,
          message: message.trim(),
          password: getCachedWeddingPassword(slug),
          turnstileToken: tsTokenRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        // A CONSUMED TOKEN IS NOT REUSABLE. Reset, or a second attempt fails
        // the security check rather than the thing that actually went wrong.
        tsTokenRef.current = '';
        turnstileRef.current?.reset();
        setStatus(STATUS.idle);
        return;
      }
      setSentTo(address);
      setStatus(STATUS.sent);
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus(STATUS.idle);
    }
  };

  const label = {
    fontFamily: typography.bodyFont,
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: theme.lightText,
    opacity: 0.7,
    display: 'block',
    marginBottom: 8,
  };

  const field = {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: S.surface,
    border: `1px solid ${S.border}`,
    borderRadius: 0,
    color: theme.lightText,
    fontFamily: typography.bodyFont,
    fontSize: '1rem',
    marginBottom: 16,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const heading = {
    fontFamily: typography.headingFont,
    fontWeight: typography.headingWeight,
    fontStyle: typography.headingStyle || 'normal',
    color: theme.lightText,
    fontSize: 'clamp(1.25rem,3vw,1.75rem)',
    textAlign: 'center',
    margin: '0 0 8px',
  };

  const body = {
    fontFamily: typography.bodyFont,
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: theme.lightText,
    opacity: 0.8,
    textAlign: 'center',
  };

  if (status === STATUS.sent) {
    return (
      <SectionReveal {...reveal}>
        {/* THE ADDRESS IS IN THE SENTENCE ON PURPOSE. A guest who mistyped it
            finds out here, while they still remember what they typed, rather
            than by never hearing back. */}
        <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', padding: '8px 0' }}>
          <p style={{ ...body, opacity: 1, margin: 0 }} data-guest-note-sent>
            Sent. {firstNames} will reply to {sentTo}.
          </p>
        </div>
      </SectionReveal>
    );
  }

  return (
    <SectionReveal {...reveal}>
      <div style={{ maxWidth: 460, margin: '0 auto' }} data-guest-note-form>
        <h2 style={heading}>A question for {firstNames}?</h2>
        <p style={{ ...body, margin: '0 0 24px' }}>
          Send them a note and they will reply to your email.
        </p>

        <label style={label} htmlFor={`guest-note-name-${slug}`}>Your name</label>
        <input
          id={`guest-note-name-${slug}`}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          style={field}
        />

        <label style={label} htmlFor={`guest-note-email-${slug}`}>Your email</label>
        <input
          id={`guest-note-email-${slug}`}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={field}
        />

        <label style={label} htmlFor={`guest-note-message-${slug}`}>Your message</label>
        <textarea
          id={`guest-note-message-${slug}`}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ask them anything"
          rows={4}
          maxLength={MAX_MESSAGE}
          style={{ ...field, resize: 'none', marginBottom: 8 }}
        />
        <p style={{ ...body, textAlign: 'right', fontSize: '0.75rem', opacity: 0.6, margin: '0 0 16px' }}>
          {MAX_MESSAGE - message.length} characters left
        </p>

        {error && (
          <p style={{ fontFamily: typography.bodyFont, fontSize: '0.8125rem', color: '#E03553', margin: '0 0 16px' }}>
            {error}
          </p>
        )}

        {/* Invisible Turnstile — execution="render" generates a token on mount,
            the same gate every other unauthenticated guest form uses. */}
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => { tsTokenRef.current = token; }}
          onExpire={() => { tsTokenRef.current = ''; }}
          options={{ appearance: 'execute', execution: 'render' }}
        />

        <button
          type="button"
          onClick={send}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '18px', minHeight: 60,
            backgroundColor: chip.background, color: chip.color,
            border: 'none', borderRadius: 0,
            fontFamily: typography.bodyFont, fontSize: '0.875rem', fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {status === STATUS.sending ? 'Sending…' : 'Send note'}
        </button>
      </div>
    </SectionReveal>
  );
}
