import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const PJS = "'Plus Jakarta Sans', sans-serif";
const H1  = { fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 };
const H2  = { fontSize: 20, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em', marginTop: 48, marginBottom: 14 };
const H3  = { fontSize: 16, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, marginTop: 28, marginBottom: 8 };
const P   = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, marginBottom: 14 };
const UL  = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, paddingLeft: 20, marginBottom: 14 };
const LK  = { color: '#E03553', textDecoration: 'none' };
const DIV = { borderTop: '1px solid rgba(10,10,10,0.06)', marginTop: 48 };

function CookieTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: PJS, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(10,10,10,0.1)' }}>
            {['Name', 'Purpose', 'Duration'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#0A0A0A', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', background: i % 2 === 0 ? 'rgba(10,10,10,0.02)' : 'transparent' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0A0A0A', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{row[0]}</td>
              <td style={{ padding: '10px 12px', color: 'rgba(10,10,10,0.7)' }}>{row[1]}</td>
              <td style={{ padding: '10px 12px', color: 'rgba(10,10,10,0.5)', whiteSpace: 'nowrap' }}>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicy() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Last updated: 9 July 2026</div>
          <h1 style={H1}>Cookie policy</h1>
          <p style={{ ...P, fontSize: 16, color: 'rgba(10,10,10,0.6)', marginBottom: 48 }}>We keep cookies and similar browser-storage technologies to a minimum. Here is exactly what we use and why.</p>

          <div style={DIV} />
          <h2 style={H2}>1. What this covers</h2>
          <p style={P}>Cookies are small text files a website can store in your browser. We — and some of the third-party services we use — also use your browser's local storage for the same kind of purpose (keeping you signed in, remembering a choice). This policy covers both, referred to together as "cookies" below.</p>

          <div style={DIV} />
          <h2 style={H2}>2. Cookies and storage we use directly</h2>

          <h3 style={H3}>Essential — always on</h3>
          <p style={P}>Required for the service to function. They cannot be turned off.</p>
          <CookieTable rows={[
            ['base44_access_token', 'Keeps you signed in to your OpenInvite account', 'Until you sign out'],
            ['oi_auth / oi_user', 'Stores your session state and basic profile so the app doesn\'t need to re-check on every page', 'Until you sign out'],
            ['oi_cookie_consent', 'Remembers your cookie consent choice from the banner', '1 year'],
            ['wb_pw_&#123;wedding-slug&#125;', 'On a password-protected wedding site, remembers that a guest has already entered the correct password for that visit', 'Browser session'],
          ]} />

          <h3 style={H3}>Analytics — with consent</h3>
          <p style={P}>If you accept analytics cookies, we use <strong>PostHog</strong> to understand how the platform is used — pages visited and features used — so we can build better features. We do not use advertising cookies, and we do not sell analytics data to third parties.</p>

          <div style={DIV} />
          <h2 style={H2}>3. How to control cookies</h2>
          <ul style={UL}>
            <li>Use the cookie banner shown on your first visit to accept or decline analytics cookies</li>
            <li>Clear cookies and site data via your browser settings at any time</li>
            <li>Use your browser's private/incognito mode to avoid persistent storage</li>
          </ul>
          <p style={P}>Note: clearing or blocking essential cookies will sign you out and may break password-protected guest sites you've already unlocked.</p>
          <p style={P}>Most browsers let you manage cookies in their settings:</p>
          <ul style={UL}>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={LK}>Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" style={LK}>Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/en-au/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={LK}>Apple Safari</a></li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>4. Cookies set by third-party services</h2>
          <p style={P}>Some of the services we use (see our <Link to="/privacy-policy" style={LK}>Privacy policy</Link> for the full list and what each processes) may set their own cookies in your browser:</p>
          <ul style={UL}>
            <li><strong>Google</strong> — if you choose "continue with Google" to sign in</li>
            <li><strong>Stripe</strong> — during checkout, to help prevent payment fraud</li>
            <li><strong>PostHog</strong> — analytics, only if you've consented (see above)</li>
            <li><strong>Crisp</strong> — if you open the live chat support widget</li>
            <li><strong>Cloudflare Turnstile</strong> — on public forms (RSVP-link requests, sign-up), to confirm a human is submitting</li>
          </ul>
          <p style={P}>These are governed by each company's own privacy and cookie policies.</p>

          <div style={DIV} />
          <h2 style={H2}>5. Contact us</h2>
          <p style={P}>Questions about cookies? <a href="mailto:hello@openinvite.com.au" style={LK}>hello@openinvite.com.au</a></p>
          <p style={P}>For broader privacy questions, see our <Link to="/privacy-policy" style={LK}>Privacy policy</Link>.</p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
