import React from "react";
import { Link } from "react-router-dom";
import CookieBanner from "./CookieBanner";

export default function PublicFooter() {
  return (
    <>
    <footer className="bg-white border-t border-[#E0E0DC]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Logo col */}
          <div>
            <Link to="/">
              <img src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png" alt="openinvite" style={{ height: "20px", width: "auto", display: "block" }} />
            </Link>
            <p style={{ color: 'rgba(10,10,10,0.4)', fontSize: 12, lineHeight: 1.7 }}>
              Wedding planning, beautifully designed.
            </p>
          </div>

          {/* Links */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A', marginBottom: 16 }}>Links</p>
            <ul className="space-y-3">
              <li><Link to="/" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Home</Link></li>
              <li><Link to="/About" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">About</Link></li>
              <li><Link to="/universes" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Universes</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A', marginBottom: 16 }}>Legal</p>
            <ul className="space-y-3">
              <li><Link to="/privacy-policy" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms-of-service" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Terms of service</Link></li>
              <li><Link to="/cookie-policy" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Cookie policy</Link></li>
              <li><Link to="/refund-policy" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Refund policy</Link></li>
              <li><Link to="/data-deletion" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Data deletion</Link></li>
              <li><Link to="/Contact" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A', marginBottom: 16 }}>Contact</p>
            <Link to="/Contact" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors block mb-2">
              Get in touch
            </Link>
            <a href="mailto:info@openinvite.com" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">
              info@openinvite.com
            </a>

            {/* Social icons */}
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-[#0A0A0A] hover:text-[#E03553] transition-colors" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                </svg>
              </a>
              <a href="#" className="text-[#0A0A0A] hover:text-[#E03553] transition-colors" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="#" className="text-[#0A0A0A] hover:text-[#E03553] transition-colors" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E0E0DC] pt-8">
          <p style={{ color: 'rgba(10,10,10,0.4)', fontSize: 12 }}>© 2026 OpenInvite. All rights reserved.</p>
        </div>
      </div>
    </footer>
    <CookieBanner />
    </>
  );
}