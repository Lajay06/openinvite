import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';
import { useMarketingSeo } from '@/hooks/useMarketingSeo';

const PJS = "'Plus Jakarta Sans', sans-serif";
const H1  = { fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 };
const H2  = { fontSize: 20, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em', marginTop: 48, marginBottom: 14 };
const H3  = { fontSize: 16, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, marginTop: 24, marginBottom: 8 };
const P   = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, marginBottom: 14 };
const UL  = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, paddingLeft: 20, marginBottom: 14 };
const LK  = { color: '#E03553', textDecoration: 'none' };
const DIV = { borderTop: '1px solid rgba(10,10,10,0.06)', marginTop: 48 };

function ProcessorTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: PJS, fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid rgba(10,10,10,0.1)' }}>
            {['Service', 'What it receives', 'Purpose'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#0A0A0A', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', background: i % 2 === 0 ? 'rgba(10,10,10,0.02)' : 'transparent' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0A0A0A', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{row[0]}</td>
              <td style={{ padding: '10px 12px', color: 'rgba(10,10,10,0.7)', verticalAlign: 'top' }}>{row[1]}</td>
              <td style={{ padding: '10px 12px', color: 'rgba(10,10,10,0.7)', verticalAlign: 'top' }}>{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicy() {
  useMarketingSeo();
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 10 }}>Last updated: 9 July 2026</div>
          <h1 style={H1}>Privacy policy</h1>

          <div style={{ background: 'rgba(224,53,83,0.04)', border: '1px solid rgba(224,53,83,0.12)', padding: '20px 24px', marginBottom: 48 }}>
            <p style={{ ...P, marginBottom: 0, fontWeight: 600, color: '#0A0A0A' }}>The short version</p>
            <p style={{ ...P, marginBottom: 0 }}>We collect what we need to run your wedding planning and your guests' invitation, RSVP, and guest-site experience. We never sell personal information. A small number of specialist providers (payments, hosting, email, analytics, support chat, maps, and music search) process data on our behalf, each for a specific purpose set out below.</p>
          </div>

          <div style={DIV} />

          <h2 style={H2}>1. Who this policy covers</h2>
          <p style={P}>OpenInvite is used by two kinds of people: <strong>couples</strong> (account holders who plan a wedding and pay for the service) and <strong>guests</strong> (people a couple invites, who interact with the couple's published wedding website, RSVP form, and related pages; guests do not create an OpenInvite account).</p>

          <div style={DIV} />
          <h2 style={H2}>2. What we collect</h2>

          <h3 style={H3}>From couples (account holders)</h3>
          <ul style={UL}>
            <li><strong>Account information</strong>: name, email address, and authentication credentials (sign-up/login is handled by our backend platform, Base44, including an optional "continue with Google" option)</li>
            <li><strong>Wedding details</strong>: wedding date, venue and location details, ceremony/reception information, theme and styling choices, and other planning content you choose to store</li>
            <li><strong>Payment information</strong>: OpenInvite is a one-time-purchase product (Pro or Ultra plan). Payments are processed by <strong>Stripe</strong>; we do not receive or store your full card number. Stripe shares with us the information needed to confirm your purchase (email, plan, amount, transaction status)</li>
            <li><strong>Content you create</strong>: guest lists, budget and vendor notes, seating plans, checklists, vows/speech drafts, moodboard images, and messages you send through the platform</li>
            <li><strong>AI assistant conversations</strong>: when you use Ava or another in-app AI assistant, your prompts and the relevant wedding context you're asking about are processed to generate a response</li>
            <li><strong>Usage data</strong>: pages visited and features used, collected via analytics (see section 6)</li>
          </ul>

          <h3 style={H3}>From guests</h3>
          <p style={P}>A couple may add or import the following about their guests, and a guest may submit some of it directly through the published wedding site:</p>
          <ul style={UL}>
            <li>Name, email address, phone number, and postal address (if provided for invitations)</li>
            <li>RSVP responses, per-event attendance, and any plus-one details</li>
            <li>Meal preference and dietary requirements</li>
            <li>Notes to the couple and song requests</li>
            <li>Photos uploaded to a shared wedding gallery, where the couple has enabled this</li>
          </ul>
          <p style={P}>Guests do not create an OpenInvite account. Access to a guest's own RSVP page is by a private link unique to that guest.</p>

          <div style={DIV} />
          <h2 style={H2}>3. How we use this data</h2>
          <ul style={UL}>
            <li>To provide, operate, and maintain the OpenInvite platform for couples and their guests</li>
            <li>To power AI planning assistance: the assistant uses your own wedding context to give relevant suggestions</li>
            <li>To process payments and confirm plan purchases</li>
            <li>To send service emails: invitations and RSVP links to guests on a couple's behalf, account and receipt emails to couples, and (where enabled) marketing/product emails you can opt out of</li>
            <li>To respond to support requests</li>
            <li>To detect and prevent fraud, spam, and abuse (including automated-bot checks on public forms)</li>
            <li>To understand product usage in aggregate, so we can improve features</li>
          </ul>
          <p style={{ ...P, fontWeight: 600 }}>We do not sell personal information. We do not use guest data for advertising.</p>

          <div style={DIV} />
          <h2 style={H2}>4. AI features</h2>
          <p style={P}>Ava and the platform's other AI assistants are provided through our backend platform, Base44's, AI processing capability. When you use an AI feature, your message and the relevant wedding context needed to answer it are sent for processing and a response is returned.</p>
          <ul style={UL}>
            <li>AI suggestions are assistive only: never professional legal, medical, financial, or cultural advice</li>
            <li>You remain responsible for all final content, decisions, and communications</li>
            <li>Verify any cultural, religious, or safety-relevant suggestions independently</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>5. Guest data: the couple's responsibilities</h2>
          <p style={P}>When a couple stores or imports their guests' personal information in OpenInvite, <strong>the couple is the data controller and OpenInvite is the data processor</strong> for that guest data.</p>
          <ul style={UL}>
            <li>The couple is responsible for having a lawful basis to collect and store their guests' information</li>
            <li>The couple should let guests know their details are being stored for wedding coordination purposes</li>
            <li>Guest data is linked to the couple's account and is deleted when that account is deleted</li>
            <li>Couples should avoid storing sensitive information (e.g. detailed medical records) beyond what's needed for event planning, such as a dietary requirement</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>6. Cookies and analytics</h2>
          <p style={P}>We use a small number of cookies and similar browser-storage technologies to keep you logged in, remember a guest wedding site's password unlock for the session, and, where you consent, understand product usage. Full detail, including exactly which technologies are used and how to control them, is in our <Link to="/cookie-policy" style={LK}>Cookie policy</Link>.</p>

          <div style={DIV} />
          <h2 style={H2}>7. Third-party services</h2>
          <p style={P}>We use the following specialist providers to run OpenInvite. Each processes only what it needs for its specific purpose, and each has its own privacy policy governing how it handles data on our behalf.</p>
          <ProcessorTable rows={[
            ['Base44', 'All account, wedding, guest, RSVP, and photo data: our backend database and application platform', 'Hosts and processes all product data; also provides AI processing and file storage'],
            ['Vercel', 'Hosting infrastructure, request logs', 'Hosts the website and serverless functions'],
            ['Resend', 'Guest and couple email addresses, names, wedding details, RSVP links', 'Sends invitation, RSVP-link, and account emails'],
            ['Stripe', "Couple's email, payment method, plan and price details", 'Processes one-time plan payments; manages the billing portal'],
            ['PostHog', "Couple's email and name (once logged in), pages visited, feature usage", 'Product analytics, so we can see what to improve'],
            ['Sentry', 'Error reports and, for a sample of sessions, a masked session replay', 'Error monitoring, to find and fix bugs'],
            ['Cloudinary', 'No personal data: hosts static marketing images only', 'Serves images on our public marketing pages'],
            ['Google Places', 'Venue and vendor search terms a couple types', 'Powers venue/vendor location search and suggestions'],
            ['Spotify', "Couple's Spotify profile (display name, photo) and song search terms", 'Music playlist and song-request features'],
            ['Cloudflare Turnstile', 'Client IP address, a bot-detection challenge token', 'Confirms a human is submitting public forms (RSVP-link requests, sign-up)'],
          ]} />

          <div style={DIV} />
          <h2 style={H2}>8. Data storage and security</h2>
          <p style={P}>Product data is stored via Base44's infrastructure and is encrypted in transit (TLS). We follow reasonable, industry-standard security practices to protect your information and respond promptly to any identified vulnerability.</p>
          <p style={P}>If you discover a security issue, please contact us at <a href="mailto:hello@openinvite.com.au" style={LK}>hello@openinvite.com.au</a>.</p>

          <div style={DIV} />
          <h2 style={H2}>9. Data retention</h2>
          <ul style={UL}>
            <li><strong>Active accounts</strong>: data is kept for as long as the account is active</li>
            <li><strong>Deleted accounts</strong>: account and associated guest data is removed within 30 days of a verified deletion request</li>
            <li><strong>Backups</strong>: backup copies are purged within 90 days of deletion</li>
            <li><strong>Legal and financial records</strong>: some transaction records may be retained longer where required by law</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>10. Your rights</h2>
          <p style={P}>OpenInvite is an Australian business and this policy is written with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs) in mind. If you are a couple with an OpenInvite account, or a guest whose information a couple has stored, you can ask us to:</p>
          <ul style={UL}>
            <li><strong>Access</strong>: request a copy of the personal information we hold about you</li>
            <li><strong>Correct</strong>: update or correct inaccurate information</li>
            <li><strong>Delete</strong>: delete an account and its associated data, or a specific guest's data on request to the couple who added it</li>
            <li><strong>Ask questions</strong>: about how your information is being handled</li>
          </ul>
          <p style={P}>To exercise any of these rights, contact us at <a href="mailto:customercare@openinvite.com.au" style={LK}>customercare@openinvite.com.au</a>, or see our <Link to="/data-deletion" style={LK}>data deletion</Link> page for account and data removal requests. If you are unsatisfied with our response, Australian residents may lodge a complaint with the <a href="https://www.oaic.gov.au/" target="_blank" rel="noopener noreferrer" style={LK}>Office of the Australian Information Commissioner (OAIC)</a>.</p>

          <div style={DIV} />
          <h2 style={H2}>11. Changes to this policy</h2>
          <p style={P}>We may update this policy from time to time. We'll update the "last updated" date above, and where a change is material we'll also notify account holders by email or in-app notice.</p>

          <div style={DIV} />
          <h2 style={H2}>12. Contact us</h2>
          <p style={P}>
            <strong>Email:</strong> <a href="mailto:hello@openinvite.com.au" style={LK}>hello@openinvite.com.au</a><br />
            <strong>Support:</strong> <a href="mailto:customercare@openinvite.com.au" style={LK}>customercare@openinvite.com.au</a><br />
            <strong>Website:</strong> <Link to="/Contact" style={LK}>openinvite.com.au/contact</Link>
          </p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
