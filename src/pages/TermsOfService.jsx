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

export default function TermsOfService() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Last updated: May 2026</div>
          <h1 style={H1}>Terms of service</h1>

          <div style={{ background: 'rgba(224,53,83,0.04)', border: '1px solid rgba(224,53,83,0.12)', padding: '20px 24px', marginBottom: 48 }}>
            <p style={{ ...P, marginBottom: 0, fontWeight: 600, color: '#0A0A0A' }}>The short version</p>
            <p style={{ ...P, marginBottom: 0 }}>Use OpenInvite to plan your wedding. Be respectful. Your content is yours. We provide the tools — you make the decisions.</p>
          </div>

          <div style={DIV} />
          <h2 style={H2}>1. Acceptance of terms</h2>
          <p style={P}>By creating an account or using OpenInvite, you agree to these terms of service. If you do not agree, please do not use the service.</p>
          <p style={P}>We may update these terms from time to time. We will notify you of material changes by email or in-app notification. Continued use after changes constitutes acceptance.</p>

          <div style={DIV} />
          <h2 style={H2}>2. Description of service</h2>
          <p style={P}>OpenInvite is a wedding planning platform that helps couples organise their big day. The service includes:</p>
          <ul style={UL}>
            <li>Guest list management and RSVP tracking</li>
            <li>Budget planning and vendor management</li>
            <li>AI-powered planning assistance via Ava</li>
            <li>Wedding website creation</li>
            <li>Seating, schedule, and checklist tools</li>
          </ul>
          <p style={P}>We reserve the right to modify, add, or discontinue features at any time.</p>

          <div style={DIV} />
          <h2 style={H2}>3. Account registration</h2>
          <ul style={UL}>
            <li>You must be at least 18 years old to create an account</li>
            <li>One account per person — creating multiple accounts is not permitted</li>
            <li>You are responsible for keeping your credentials secure</li>
            <li>Notify us immediately if you suspect unauthorised access to your account</li>
            <li>You are responsible for all activity that occurs under your account</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>4. Acceptable use</h2>
          <p style={P}>You agree not to use OpenInvite to:</p>
          <ul style={UL}>
            <li>Send unsolicited communications (spam) to your guests</li>
            <li>Submit fake RSVPs or falsify guest information</li>
            <li>Scrape, copy, or reproduce the platform or its content</li>
            <li>Resell or provide access to the service to third parties</li>
            <li>Upload harmful, illegal, or offensive content</li>
            <li>Interfere with the platform's technical operation</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
          <p style={P}>We reserve the right to suspend or terminate accounts that violate these guidelines.</p>

          <div style={DIV} />
          <h2 style={H2}>5. Your content</h2>
          <p style={P}>All content you create in OpenInvite — guest lists, vendor notes, vows, messages, and wedding details — remains yours. You own it.</p>
          <p style={P}>By using the service, you grant us a limited, non-exclusive licence to store, process, and display your content solely to provide the service to you. We will not use your content for any other purpose.</p>
          <p style={P}>You are responsible for the accuracy of your content and for ensuring you have the right to share any information you upload (including your guests' personal details).</p>

          <div style={DIV} />
          <h2 style={H2}>6. AI-generated content</h2>
          <p style={P}>Ava, our AI assistant, provides suggestions and helps you draft content. Please note:</p>
          <ul style={UL}>
            <li>Ava's suggestions are assistive only and not professional advice</li>
            <li>Ava is not a lawyer, financial advisor, dietitian, or medical professional</li>
            <li>You are responsible for all final decisions and content you publish</li>
            <li>Cultural, religious, and ceremony content should be verified with the relevant parties</li>
            <li>AI-generated content may occasionally be inaccurate — always review before using</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>7. Subscriptions and payments</h2>
          <h3 style={H3}>Plans</h3>
          <p style={P}>OpenInvite offers free and paid subscription plans. Paid plans unlock additional features.</p>

          <h3 style={H3}>Billing</h3>
          <p style={P}>Paid plans are billed monthly or annually (as selected at checkout). Billing is automatic until you cancel.</p>

          <h3 style={H3}>Cancellation</h3>
          <p style={P}>You may cancel at any time. Upon cancellation, you retain access to paid features until the end of your current billing period. We do not offer partial refunds for unused time, except as stated in our <Link to="/refund-policy" style={LK}>Refund policy</Link>.</p>

          <h3 style={H3}>Price changes</h3>
          <p style={P}>We may change subscription prices with 30 days' notice. If you disagree with a price change, you may cancel before it takes effect.</p>

          <div style={DIV} />
          <h2 style={H2}>8. Intellectual property</h2>
          <p style={P}><strong>Yours:</strong> All wedding content, guest data, and personal information you create belongs to you.</p>
          <p style={P}><strong>Ours:</strong> The OpenInvite platform, brand, design, code, and all non-user content is our intellectual property. You may not copy, reproduce, or distribute it without permission.</p>

          <div style={DIV} />
          <h2 style={H2}>9. Termination</h2>
          <p style={P}>You may delete your account at any time from your account settings. We will process deletion requests within 30 days.</p>
          <p style={P}>We may suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose a risk to other users — with or without notice depending on severity.</p>

          <div style={DIV} />
          <h2 style={H2}>10. Limitation of liability</h2>
          <p style={P}>OpenInvite is a planning tool, not a wedding service provider. We are not liable for:</p>
          <ul style={UL}>
            <li>The quality, availability, or conduct of any vendors you find or book</li>
            <li>The accuracy of AI-generated suggestions from Ava</li>
            <li>Any disputes between you and wedding vendors or guests</li>
            <li>Loss of data due to circumstances beyond our control</li>
            <li>Indirect, incidental, or consequential damages arising from use of the service</li>
          </ul>
          <p style={P}>To the extent permitted by law, our total liability to you in connection with the service shall not exceed the amounts you paid us in the 12 months preceding the claim.</p>

          <div style={DIV} />
          <h2 style={H2}>11. Governing law</h2>
          <p style={P}>These terms are governed by the laws of New South Wales, Australia. Any disputes will be resolved in the courts of New South Wales.</p>
          <p style={P}>If you are located in another jurisdiction, local consumer protection laws may also apply.</p>

          <div style={DIV} />
          <h2 style={H2}>12. Changes to these terms</h2>
          <p style={P}>We will notify you of any material changes to these terms by email and/or in-app notification at least 14 days before they take effect. Your continued use of the service after the effective date constitutes acceptance of the updated terms.</p>

          <div style={DIV} />
          <h2 style={H2}>Contact us</h2>
          <p style={P}>Questions about these terms? <a href="mailto:hello@openinvite.com" style={LK}>hello@openinvite.com</a></p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
