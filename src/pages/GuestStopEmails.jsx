import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

/**
 * /guest-stop-emails/:token — THE WAY OUT FOR A GUEST.
 *
 * Item 6 of goals/2026-10-09-reply-lifecycle.md. The footer line in any
 * guest-facing email lands here, this sets Guest.email_opt_out without
 * requiring login, and it shows one line.
 *
 * ── WHY THE WRITE HAPPENS HERE AND NOT IN THE LINK ───────────────────────
 *
 * Mail clients, link scanners and corporate proxies fetch the URLs in an email
 * before a human sees them. If the link itself were a GET that performed the
 * write, those fetches would opt guests out of invitations they never opened,
 * and the couple would never know why half their list went quiet. A prefetcher
 * does not run JavaScript, so the write lives in the POST this page makes on
 * mount. Same reasoning as /stop-emails/:token, and the same shape.
 *
 * ── THE LINE IS THE OWNER'S, AND IT IS ONLY SAID WHEN IT IS TRUE ─────────
 *
 * Verbatim from the goal: "Done. {couple names} will not email you about the
 * wedding again. You can still reply on their website whenever you like."
 * Rendered only after the endpoint answers 200. A failure says so plainly
 * instead, because a page that says "Done" over a failed write is the one
 * outcome worse than an error: the guest stops looking and the mail keeps
 * coming.
 *
 * THE SECOND SENTENCE IS NOT A CONSOLATION, it is the important half. Opting
 * out of email is not opting out of the wedding, and a guest who assumed
 * otherwise would never reply.
 *
 * NO LOGIN, NO NAV, NO BRANDING BEYOND THE WORDMARK. Whoever opens this has
 * asked to be left alone; the page is not an opportunity to sell them
 * anything.
 */

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function GuestStopEmails() {
  const { token } = useParams();
  const [state, setState] = useState('working');
  const [coupleNames, setCoupleNames] = useState('');
  // ONCE, EVEN UNDER STRICT MODE'S DOUBLE MOUNT. The write is idempotent, so a
  // second POST would be harmless, but a page whose effect fires twice in
  // development and once in production is a page nobody can reason about.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) { setState('failed'); return; }
    let live = true;
    fetch('/api/guest-stop-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!live) return;
        if (!res.ok) { setState('failed'); return; }
        // THE NAMES ARE OPTIONAL, THE OUTCOME IS NOT. A 200 means the flag is
        // set, so the page says Done whether or not the names resolved.
        const data = await res.json().catch(() => ({}));
        setCoupleNames(typeof data?.coupleNames === 'string' ? data.coupleNames : '');
        setState('done');
      })
      .catch(() => { if (live) setState('failed'); });
    return () => { live = false; };
  }, [token]);

  // "The couple" rather than an empty gap, for the same reason the server
  // falls back: a sentence with a hole in it reads as a bug.
  const names = coupleNames.trim() || 'The couple';

  return (
    <div style={{
      minHeight: '100vh', background: '#f6f4f1', fontFamily: PJS,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{ background: '#ffffff', padding: '48px 40px', maxWidth: 440, width: '100%' }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1785659181/email-assets/openinvite-icon-mark.png"
          width="28"
          height="28"
          alt="Openinvite"
          style={{ display: 'block', width: 28, height: 28, marginBottom: 28 }}
        />
        <p
          data-guest-stop-state={state}
          style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#0A0A0A', fontFamily: PJS }}
        >
          {state === 'working' && 'One moment.'}
          {state === 'done' && `Done. ${names} will not email you about the wedding again. You can still reply on their website whenever you like.`}
          {state === 'failed' && 'That link did not work. Nothing was changed, so you may still get these emails. Reply to the email you came from and a real person will turn them off.'}
        </p>
      </div>
    </div>
  );
}
