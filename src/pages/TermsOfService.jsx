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

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 10 }}>Last updated: 9 July 2026</div>
          <h1 style={H1}>Terms of service</h1>

          <div style={{ background: 'rgba(224,53,83,0.04)', border: '1px solid rgba(224,53,83,0.12)', padding: '20px 24px', marginBottom: 48 }}>
            <p style={{ ...P, marginBottom: 0, fontWeight: 600, color: '#0A0A0A' }}>The short version</p>
            <p style={{ ...P, marginBottom: 0 }}>Use OpenInvite to plan your wedding. Pro and Ultra are one-time purchases, not subscriptions. Be respectful of your guests and other users. Your content is yours — we provide the tools, you make the decisions.</p>
          </div>

          <div style={DIV} />
          <h2 style={H2}>1. Acceptance of terms</h2>
          <p style={P}>By creating an account or using OpenInvite, you agree to these terms of service. If you do not agree, please do not use the service.</p>
          <p style={P}>We may update these terms from time to time. We'll notify account holders of material changes by email or in-app notice. Continued use after a change takes effect constitutes acceptance.</p>

          <div style={DIV} />
          <h2 style={H2}>2. Who these terms apply to</h2>
          <p style={P}><strong>Couples</strong> create an OpenInvite account, purchase a plan, and use the platform to plan their wedding and manage their guest list. <strong>Guests</strong> are the people a couple invites — guests interact with a couple's published wedding website, RSVP form, guestbook, and related pages without creating their own account, using a private link the couple sends them.</p>
          <p style={P}>These terms govern both roles. A couple is responsible for their guests' use of the guest-facing pages the couple has published, in the same way a host is responsible for an event they organise.</p>

          <div style={DIV} />
          <h2 style={H2}>3. Description of service</h2>
          <p style={P}>OpenInvite is a wedding planning platform. Depending on plan, the service includes:</p>
          <ul style={UL}>
            <li>Guest list management and per-event RSVP tracking</li>
            <li>Budget, vendor, seating, schedule, and checklist tools</li>
            <li>AI-powered planning assistance via Ava and other in-app assistants</li>
            <li>A wedding website builder, guestbook, and guest song requests</li>
          </ul>
          <p style={P}>We may modify, add, or discontinue individual features at any time. We will not discontinue the core service you paid for during your 24-month access period without reasonable notice.</p>

          <div style={DIV} />
          <h2 style={H2}>4. Account registration</h2>
          <ul style={UL}>
            <li>You must be at least 18 years old to create an account</li>
            <li>One account per couple — creating multiple accounts to bypass plan limits is not permitted</li>
            <li>You are responsible for keeping your credentials secure</li>
            <li>Notify us immediately if you suspect unauthorised access to your account</li>
            <li>You are responsible for all activity that occurs under your account, including content your guests submit through pages you've published</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>5. Acceptable use</h2>
          <p style={P}>You agree not to use OpenInvite to:</p>
          <ul style={UL}>
            <li>Send unsolicited communications (spam) through the platform</li>
            <li>Submit fake RSVPs, guestbook entries, or falsified guest information</li>
            <li>Scrape, copy, or reproduce the platform or its content</li>
            <li>Resell or provide access to the service to third parties</li>
            <li>Upload harmful, illegal, or offensive content</li>
            <li>Attempt to bypass rate limits, bot-detection, or other abuse-prevention measures on public pages</li>
            <li>Interfere with the platform's technical operation</li>
            <li>Violate any applicable law or regulation</li>
          </ul>
          <p style={P}>We reserve the right to suspend or terminate accounts that violate these guidelines.</p>

          <div style={DIV} />
          <h2 style={H2}>6. Your content</h2>
          <p style={P}>All content you create in OpenInvite — guest lists, vendor notes, vows, messages, and wedding details — remains yours. You own it.</p>
          <p style={P}>By using the service, you grant us a limited, non-exclusive licence to store, process, and display your content solely to provide the service to you (and, where relevant, your guests). We will not use your content for any other purpose.</p>
          <p style={P}>You are responsible for the accuracy of your content and for ensuring you have the right to share any information you upload — including your guests' personal details.</p>

          <div style={DIV} />
          <h2 style={H2}>7. AI-generated content</h2>
          <p style={P}>Ava and the platform's other AI assistants provide suggestions and help you draft content. Please note:</p>
          <ul style={UL}>
            <li>AI suggestions are assistive only, not professional advice</li>
            <li>Ava is not a lawyer, financial advisor, dietitian, or medical professional</li>
            <li>You are responsible for all final decisions and content you publish</li>
            <li>Cultural, religious, and ceremony content should be verified with the relevant parties</li>
            <li>AI-generated content may occasionally be inaccurate — always review before using</li>
          </ul>

          <div style={DIV} />
          <h2 style={H2}>8. Plans and payment</h2>
          <h3 style={H3}>Plans</h3>
          <p style={P}>OpenInvite offers a free trial and two paid, <strong>one-time-payment</strong> plans — Pro ($79 AUD) and Ultra ($149 AUD) — each giving 24 months of access from purchase. These are not recurring subscriptions: you are charged once, at checkout, and are not billed again for that plan.</p>

          <h3 style={H3}>Billing</h3>
          <p style={P}>Payments are processed securely by Stripe. We do not store your full card details.</p>

          <h3 style={H3}>Refunds</h3>
          <p style={P}>We offer a 14-day money-back guarantee from your purchase date. See our <Link to="/refund-policy" style={LK}>Refund policy</Link> for full detail.</p>

          <h3 style={H3}>Price changes</h3>
          <p style={P}>We may change plan prices at any time; a price change never affects a plan you've already purchased.</p>

          <div style={DIV} />
          <h2 style={H2}>9. Intellectual property</h2>
          <p style={P}><strong>Yours:</strong> all wedding content, guest data, and personal information you create belongs to you.</p>
          <p style={P}><strong>Ours:</strong> the OpenInvite platform, brand, design, code, and all non-user content is our intellectual property. You may not copy, reproduce, or distribute it without permission.</p>

          <div style={DIV} />
          <h2 style={H2}>10. Termination</h2>
          <p style={P}>You may delete your account at any time — see our <Link to="/data-deletion" style={LK}>data deletion</Link> page. We process deletion requests within 30 days.</p>
          <p style={P}>We may suspend or terminate accounts that violate these terms, engage in fraudulent activity, or pose a risk to other users or their guests — with or without notice depending on severity.</p>

          <div style={DIV} />
          <h2 style={H2}>11. Limitation of liability</h2>
          <p style={P}>OpenInvite is a planning tool, not a wedding service provider. We are not liable for:</p>
          <ul style={UL}>
            <li>The quality, availability, or conduct of any vendors you find or book</li>
            <li>The accuracy of AI-generated suggestions</li>
            <li>Any disputes between you and your guests or wedding vendors</li>
            <li>Loss of data due to circumstances beyond our reasonable control</li>
            <li>Indirect, incidental, or consequential damages arising from use of the service</li>
          </ul>
          <p style={P}>To the extent permitted by law, our total liability to you in connection with the service will not exceed the amount you paid us for your plan.</p>
          <p style={P}>Nothing in these terms excludes, restricts, or modifies any consumer guarantee, right, or remedy under the Australian Consumer Law that cannot lawfully be excluded.</p>

          <div style={DIV} />
          <h2 style={H2}>12. Governing law</h2>
          <p style={P}>These terms are governed by the laws of New South Wales, Australia. Any disputes will be resolved in the courts of New South Wales.</p>
          <p style={P}>If you are located in another jurisdiction, local consumer protection laws may also apply to you.</p>

          <div style={DIV} />
          <h2 style={H2}>13. Changes to these terms</h2>
          <p style={P}>We will notify account holders of material changes to these terms by email and/or in-app notice at least 14 days before they take effect. Continued use of the service after the effective date constitutes acceptance of the updated terms.</p>

          <div style={DIV} />
          <h2 style={H2}>Contact us</h2>
          <p style={P}>Questions about these terms? <a href="mailto:hello@openinvite.com.au" style={LK}>hello@openinvite.com.au</a></p>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
