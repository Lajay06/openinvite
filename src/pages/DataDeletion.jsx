import React from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/public/PublicNav';
import PublicFooter from '@/components/public/PublicFooter';

const PJS = "'Plus Jakarta Sans', sans-serif";
const LK  = { color: '#E03553', textDecoration: 'none' };

export default function DataDeletion() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <PublicNav />
      <main style={{ paddingTop: 120, paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 10 }}>Last updated: 9 July 2026</div>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>Delete your account and data</h1>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 48 }}>
            We're sorry to see you go. Your data belongs to you — here's exactly how to remove it.
          </p>

          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, marginBottom: 6 }}>Email us a deletion request</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 16 }}>
                  Send an email to <a href="mailto:customercare@openinvite.com.au?subject=Account deletion request" style={LK}>customercare@openinvite.com.au</a> from the email address on your OpenInvite account, with the subject line <strong>"Account deletion request"</strong>. We verify every request by email before deleting anything, to make sure it's really you.
                </p>
                <a href="mailto:customercare@openinvite.com.au?subject=Account deletion request"
                  style={{ display: 'inline-block', padding: '9px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: PJS, background: '#0A0A0A', color: '#FFFFFF', textDecoration: 'none' }}>
                  Email customercare@openinvite.com.au
                </a>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, border: '1px solid rgba(10,10,10,0.08)', padding: '28px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, marginBottom: 6 }}>We confirm and process it</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                  Once we've verified the request is from the account holder, we process the deletion and send a confirmation email within <strong>7 business days</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* What gets deleted */}
          <div style={{ marginTop: 48, borderTop: '1px solid rgba(10,10,10,0.06)', paddingTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, marginBottom: 14 }}>What gets deleted</h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, marginBottom: 14 }}>When we delete your account, the following is permanently removed within 30 days:</p>
            <ul style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)', fontFamily: PJS, paddingLeft: 20, marginBottom: 14 }}>
              <li>Your account and profile information</li>
              <li>All wedding details and planning data</li>
              <li>Your guest list, RSVP, and guestbook data</li>
              <li>Budget, vendor, seating, checklist, and schedule data</li>
              <li>Your published wedding website, if you created one</li>
              <li>Your AI assistant conversation history</li>
            </ul>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(10,10,10,0.5)', fontFamily: PJS }}>
              Backup copies are purged within 90 days of deletion. Some transaction records may be retained longer where required by law. See our <Link to="/privacy-policy" style={LK}>Privacy policy</Link> for full detail.
            </p>
          </div>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
