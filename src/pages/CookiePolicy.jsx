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
              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0A0A0A', whiteSpace: 'nowrap' }}>{row[0]}</td>
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

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Last updated: May 2026</div>
          <h1 style={H1}>Cookie policy</h1>
          <p style={{ ...P, fontSize: 16, color: 'rgba(10,10,10,0.6)', marginBottom: 48 }}>We keep cookies to a minimum. Here is exactly what we use and why.</p>

          <div style={DIV} />
          <h2 style={H2}>1. What are cookies?</h2>
          <p style={P}>Cookies are small text files stored on your device by your browser. They help websites remember information between visits — like whether you are logged in or what your preferences are.</p>
          <p style={P}>Cookies are not executable programs and cannot access files on your device. They simply store small pieces of text.</p>

          <div style={DIV} />
          <h2 style={H2}>2. Cookies we use</h2>

          <h3 style={H3}>Essential cookies — always on</h3>
          <p style={P}>These cookies are required for the service to function. They cannot be turned off.</p>
          <CookieTable rows={[
            ['oi_auth', 'Keeps you logged in to your OpenInvite account', 'Session / 30 days'],
            ['oi_session', 'Maintains your current session state', 'Session'],
            ['oi_cookie_consent', 'Remembers your cookie consent choice', '1 year'],
          ]} />

          <h3 style={H3}>Preference cookies</h3>
          <p style={P}>These cookies remember your in-app settings so we can restore them on your next visit.</p>
          <CookieTable rows={[
            ['oi_wedding_date', 'Stores your wedding date for quick access', 'Persistent'],
            ['oi_couple_name', 'Stores your couple name for personalisation', 'Persistent'],
            ['oi_wedding_city', 'Stores your wedding location', 'Persistent'],
          ]} />

          <h3 style={H3}>Analytics cookies — with consent</h3>
          <p style={P}>If you accept analytics cookies, we may use privacy-preserving analytics to understand how the platform is being used. This helps us build better features.</p>
          <p style={P}>We do not use advertising cookies or sell analytics data to third parties.</p>

          <div style={DIV} />
          <h2 style={H2}>3. How to control cookies</h2>
          <p style={P}>You can manage your cookie consent at any time:</p>
          <ul style={UL}>
            <li>Use the cookie banner shown on your first visit to accept or decline analytics cookies</li>
            <li>Clear cookies via your browser settings at any time</li>
            <li>Use your browser's privacy mode to prevent persistent cookies</li>
          </ul>
          <p style={P}>Note: disabling essential cookies will prevent you from staying logged in.</p>
          <p style={P}>Most browsers let you control cookies in their settings. Visit your browser's help pages for instructions:</p>
          <ul style={UL}>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={LK}>Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" style={LK}>Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/en-au/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={LK}>Apple Safari</a></li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>4. Third-party cookies</h2>
          <p style={P}>Some of our third-party services may set their own cookies:</p>
          <ul style={UL}>
            <li><strong>Google</strong> — sets cookies as part of Google sign-in (OAuth)</li>
            <li><strong>Stripe</strong> — sets cookies to prevent fraud during checkout</li>
          </ul>
          <p style={P}>These cookies are governed by the respective companies' privacy policies.</p>

          <div style={DIV} />
          <h2 style={H2}>5. Contact us</h2>
          <p style={P}>Questions about cookies? <a href="mailto:hello@openinvite.com" style={LK}>hello@openinvite.com</a></p>
          <p style={P}>For broader privacy questions, see our <Link to="/privacy-policy" style={LK}>Privacy policy</Link>.</p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
