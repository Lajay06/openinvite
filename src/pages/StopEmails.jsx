import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

/**
 * /stop-emails/:token — THE WAY OUT OF THE RETENTION EMAILS.
 *
 * Item 3 of goals/2026-10-08-retention-emails.md: the footer link lands here,
 * this sets lifecycleEmails false without requiring login, and it shows one
 * line.
 *
 * ── WHY THE WRITE HAPPENS HERE AND NOT IN THE LINK ─────────────────────────
 *
 * Mail clients, link scanners and corporate proxies fetch the URLs in an email
 * before a human sees them. If the link itself were a GET that performed the
 * write, those fetches would unsubscribe couples from mail they never opened.
 * A prefetcher does not run JavaScript, so the write lives in the POST this
 * page makes on mount.
 *
 * ── ONE LINE, AND IT IS ONLY SAID WHEN IT IS TRUE ──────────────────────────
 *
 * The goal gives the success line verbatim: "Done. No more of these from us."
 * It is rendered only after the endpoint answers 200. A failure says so in the
 * shortest plain English instead, because a page that says "Done" over a
 * failed write is the one outcome worse than an error: the couple stops
 * looking, and the mail keeps coming.
 *
 * NO LOGIN, NO NAV, NO BRANDING BEYOND THE WORDMARK. Whoever opens this has
 * asked to be left alone; the page is not an opportunity to sell them
 * anything.
 */

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function StopEmails() {
  const { token } = useParams();
  const [state, setState] = useState('working');
  // ONCE, EVEN UNDER STRICT MODE'S DOUBLE MOUNT. The write is idempotent, so a
  // second POST would be harmless, but a page whose effect fires twice in
  // development and once in production is a page nobody can reason about.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    if (!token) { setState('failed'); return; }
    let live = true;
    fetch('/api/stop-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => { if (live) setState(res.ok ? 'done' : 'failed'); })
      .catch(() => { if (live) setState('failed'); });
    return () => { live = false; };
  }, [token]);

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
          data-stop-emails-state={state}
          style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#0A0A0A', fontFamily: PJS }}
        >
          {state === 'working' && 'One moment.'}
          {state === 'done' && 'Done. No more of these from us.'}
          {state === 'failed' && 'That link did not work. Nothing was changed, so you may still get these emails. Reply to the email you came from and a real person will turn them off.'}
        </p>
      </div>
    </div>
  );
}
