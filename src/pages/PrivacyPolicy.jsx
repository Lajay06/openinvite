import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const PJS = "'Plus Jakarta Sans', sans-serif";
const H1  = { fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 };
const H2  = { fontSize: 20, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.01em', marginTop: 48, marginBottom: 14 };
const H3  = { fontSize: 16, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, marginTop: 24, marginBottom: 8 };
const P   = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, marginBottom: 14 };
const UL  = { fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, paddingLeft: 20, marginBottom: 14 };
const LK  = { color: '#E03553', textDecoration: 'none' };
const DIV = { borderTop: '1px solid rgba(10,10,10,0.06)', marginTop: 48 };

export default function PrivacyPolicy() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Last updated: May 2026</div>
          <h1 style={H1}>Privacy policy</h1>

          <div style={{ background: 'rgba(224,53,83,0.04)', border: '1px solid rgba(224,53,83,0.12)', padding: '20px 24px', marginBottom: 48 }}>
            <p style={{ ...P, marginBottom: 0, fontWeight: 600, color: '#0A0A0A' }}>The short version</p>
            <p style={{ ...P, marginBottom: 0 }}>We collect only what we need to help you plan your wedding. We never sell your data. Your guests' information belongs to you, and you can delete everything at any time.</p>
          </div>

          <div style={DIV} />

          <h2 style={H2}>1. What we collect</h2>

          <h3 style={H3}>Account information</h3>
          <p style={P}>When you sign up, we collect your name, email address, and authentication credentials (managed via Google OAuth).</p>

          <h3 style={H3}>Wedding details</h3>
          <p style={P}>Information you add about your event — wedding date, location, couple names, and other planning details you choose to store.</p>

          <h3 style={H3}>Guest data</h3>
          <p style={P}>Names, email addresses, RSVPs, dietary requirements, and other information you enter for your guests. This data is entered by you and belongs to you — we store it on your behalf as a data processor.</p>

          <h3 style={H3}>Usage data</h3>
          <p style={P}>Information about how you use the platform — pages visited, features used, and actions taken. This helps us improve the product.</p>

          <h3 style={H3}>Payment information</h3>
          <p style={P}>Payments are processed by <strong>Stripe</strong>. We do not store your card details. Stripe's privacy policy governs how your payment data is handled.</p>

          <h3 style={H3}>AI conversations</h3>
          <p style={P}>When you interact with Ava (our AI assistant), your messages and Ava's responses are processed. These interactions may be reviewed to improve the service.</p>

          <div style={DIV} />
          <h2 style={H2}>2. How we use your data</h2>
          <ul style={UL}>
            <li>To provide, maintain, and improve the OpenInvite platform</li>
            <li>To power AI features — Ava uses your wedding context to give relevant advice</li>
            <li>To send service-related notifications (booking reminders, feature updates) — with your consent</li>
            <li>To respond to support requests and enquiries</li>
            <li>To detect and prevent fraud or abuse</li>
          </ul>
          <p style={{ ...P, fontWeight: 600 }}>We do NOT sell your personal data to third parties. We do NOT use guest data for advertising.</p>

          <div style={DIV} />
          <h2 style={H2}>3. AI and data</h2>
          <p style={P}>Ava is powered by <strong>Anthropic's Claude AI</strong>. When you use Ava, your conversation and relevant wedding context is sent to Anthropic's API to generate responses. Anthropic's privacy policy governs how they handle this data.</p>
          <ul style={UL}>
            <li>AI conversations may be reviewed to improve the service</li>
            <li>Ava's suggestions are assistive only — not professional legal, medical, financial, or cultural advice</li>
            <li>You remain responsible for all final content, decisions, and communications</li>
            <li>Verify any cultural, religious, or sensitive suggestions independently</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>4. Guest data — your responsibilities</h2>
          <p style={P}>When you store your guests' personal information in OpenInvite, <strong>you are the data controller</strong> and we are the data processor.</p>
          <ul style={UL}>
            <li>You are responsible for having a lawful basis to store your guests' information</li>
            <li>You should inform guests that their details are being stored for event coordination purposes</li>
            <li>Guest data is linked to your account and is deleted when you delete your account</li>
            <li>Do not store sensitive data (medical records, financial information) beyond what is needed for event planning</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>5. Data storage and security</h2>
          <p style={P}>Your data is stored securely via Base44's infrastructure. All data is encrypted in transit (TLS) and at rest. We use industry-standard security practices to protect your information.</p>
          <p style={P}>We regularly review our security practices and respond promptly to any identified vulnerabilities. If you discover a security issue, please contact us at <a href="mailto:hello@openinvite.com" style={LK}>hello@openinvite.com</a>.</p>

          <div style={DIV} />
          <h2 style={H2}>6. Your rights</h2>
          <p style={P}>You have the following rights regarding your personal data:</p>
          <ul style={UL}>
            <li><strong>Access</strong> — request a copy of the data we hold about you</li>
            <li><strong>Correction</strong> — update or correct inaccurate data</li>
            <li><strong>Deletion</strong> — delete your account and all associated data</li>
            <li><strong>Portability</strong> — export your data in a portable format</li>
            <li><strong>Withdraw consent</strong> — opt out of non-essential communications at any time</li>
          </ul>
          <p style={P}><strong>EU/UK users (GDPR):</strong> You have additional rights including the right to object to processing and the right to lodge a complaint with your supervisory authority.</p>
          <p style={P}><strong>Australian users:</strong> Your rights are governed by the Privacy Act 1988 (Cth) and the Australian Privacy Principles.</p>
          <p style={P}>To exercise any of these rights, contact us at <a href="mailto:hello@openinvite.com" style={LK}>hello@openinvite.com</a> or use our <Link to="/data-deletion" style={LK}>data deletion page</Link>.</p>

          <div style={DIV} />
          <h2 style={H2}>7. Cookies</h2>
          <p style={P}>We use cookies to keep you logged in and remember your preferences. For full details, see our <Link to="/cookie-policy" style={LK}>Cookie policy</Link>.</p>

          <div style={DIV} />
          <h2 style={H2}>8. Third-party services</h2>
          <p style={P}>We use the following third-party services to provide OpenInvite:</p>
          <ul style={UL}>
            <li><strong>Base44</strong> — database infrastructure and backend services</li>
            <li><strong>Anthropic</strong> — AI (powers Ava)</li>
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Vercel</strong> — hosting and deployment</li>
            <li><strong>Google</strong> — authentication (Google sign-in)</li>
          </ul>
          <p style={P}>Each of these services has its own privacy policy governing how they process data on our behalf.</p>

          <div style={DIV} />
          <h2 style={H2}>9. Data retention</h2>
          <ul style={UL}>
            <li><strong>Active accounts:</strong> data is kept for as long as your account is active</li>
            <li><strong>Deleted accounts:</strong> all data is removed within 30 days of account deletion</li>
            <li><strong>Backups:</strong> backup copies are purged within 90 days</li>
            <li><strong>Legal obligations:</strong> some data (e.g. transaction records) may be retained longer where required by law</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>10. Contact us</h2>
          <p style={P}>If you have any questions about this privacy policy or how we handle your data, please contact us:</p>
          <p style={P}>
            <strong>Email:</strong> <a href="mailto:hello@openinvite.com" style={LK}>hello@openinvite.com</a><br />
            <strong>Website:</strong> <Link to="/Contact" style={LK}>openinvite.com/contact</Link>
          </p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
