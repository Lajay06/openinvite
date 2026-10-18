import React from "react";
import { Link } from "react-router-dom";
import CookieBanner from "./CookieBanner";
import OpeninviteLogo from '@/components/public/OpeninviteLogo';
import { isProfessionalOn } from '@/lib/professionalBrand';

export default function PublicFooter() {
  return (
    <>
    <footer data-public-footer className="bg-white border-t border-[#E0E0DC]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Logo col */}
          <div>
            <OpeninviteLogo size={34} ground="light" />
            <p style={{ color: 'rgba(10,10,10,0.6)', fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>
              You should enjoy yourself.
            </p>
          </div>

          {/* Links */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A', marginBottom: 16 }}>Links</p>
            <ul className="space-y-3">
              <li><Link to="/" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Home</Link></li>
              <li><Link to="/about" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">About</Link></li>
              <li><Link to="/universes" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Universes</Link></li>
              <li><Link to="/gifting" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Gifting</Link></li>
              <li><Link to="/faq" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">FAQ</Link></li>
              {/* Openinvite Professional's page, only while VITE_PROFESSIONAL=1. */}
              {isProfessionalOn() && <li><Link to="/professional" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">For planners</Link></li>}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A', marginBottom: 16 }}>Legal</p>
            <ul className="space-y-3">
              <li><Link to="/privacy-policy" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Privacy policy</Link></li>
              <li><Link to="/terms-of-service" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Terms of service</Link></li>
              <li><Link to="/cookie-policy" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Cookie policy</Link></li>
              <li><Link to="/refund-policy" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Refund policy</Link></li>
              <li><Link to="/data-deletion" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors">Data deletion</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0A0A0A', marginBottom: 16 }}>Contact</p>
            <Link to="/contact" className="text-[#0A0A0A] hover:text-[#E03553] text-sm transition-colors block mb-2">
              Get in touch
            </Link>

            {/* No social icons until the owner sends the three account URLs
                (owner ruling on #1092): they linked to # and went nowhere. */}
          </div>
        </div>

        <div className="border-t border-[#E0E0DC] pt-8">
          <p style={{ color: 'rgba(10,10,10,0.6)', fontSize: 12 }}>© 2026 Openinvite. All rights reserved.</p>
        </div>
      </div>
    </footer>
    <CookieBanner />
    </>
  );
}