import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", to: "/Features" },
  { label: "Ava", to: "/ava" },
  { label: "Universes", to: "/universes" },
  { label: "Pricing", to: "/Pricing" },
];

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 80);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const linkColor = "#ffffff";

  if (scrolled) {
    // Floating pill navbar
    return (
      <>
        <nav
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(10,10,10,0.85)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999,
            padding: "10px 24px",
            alignItems: "center",
            gap: 28,
            height: 48,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            opacity: scrolled ? 1 : 0,
            transition: "opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
          className="hidden md:flex"
        >
          <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png" alt="openinvite" style={{ height: 20, width: "auto", display: "block" }} />
          </Link>

          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  color: isActive(link.to) ? "#E03553" : "rgba(255,255,255,0.85)",
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#E03553"}
                onMouseLeave={e => e.currentTarget.style.color = isActive(link.to) ? "#E03553" : "rgba(255,255,255,0.85)"}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={handleLogin}
              aria-label="Log in"
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.75)", padding: 0,
                transition: "color 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
            >
              <UserIcon />
            </button>
            <a
              href="/signup"
              style={{ background: "#E03553", color: "#ffffff", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: "none", transition: "opacity 0.2s ease", display: "inline-block" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Get started
            </a>
          </div>
        </nav>

        {/* Mobile full bar — always shown on mobile */}
        <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#222222]">
          <div className="px-6 h-16 flex items-center justify-between">
            <Link to="/" style={{ textDecoration: "none" }}>
              <img src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png" alt="openinvite" style={{ height: 24, width: "auto" }} />
            </Link>
            <button className="text-white" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {open && (
            <div className="bg-[#0A0A0A] border-t border-[#222222] px-6 py-6 space-y-4">
              {NAV_LINKS.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="block text-[rgba(255,255,255,0.4)] hover:text-white text-sm transition-colors">{link.label}</Link>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleLogin} className="text-white text-sm font-semibold" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Log in
                </button>
                <a href="/signup" style={{ background: "#E03553", color: "#ffffff", borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: "none" }}>
                  Get started
                </a>
              </div>
            </div>
          )}
        </nav>
      </>
    );
  }

  // Full width bar at top
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#222222]">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" style={{ textDecoration: "none" }}>
            <img src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png" alt="openinvite" style={{ height: 28, width: "auto" }} />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm transition-colors duration-200"
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, color: isActive(link.to) ? "#E03553" : "#ffffff", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.color = "#E03553"}
                onMouseLeave={e => e.currentTarget.style.color = isActive(link.to) ? "#E03553" : "#ffffff"}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleLogin}
              aria-label="Log in"
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.75)", padding: 0,
                transition: "color 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
            >
              <UserIcon />
            </button>
            <a
              href="/signup"
              style={{ background: "#E03553", color: "#ffffff", borderRadius: 999, padding: "7px 16px", fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: "none", transition: "opacity 0.2s ease", display: "inline-block" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Get started
            </a>
          </div>

          <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden bg-[#0A0A0A] border-t border-[#222222] px-6 py-6 space-y-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="block text-[rgba(255,255,255,0.4)] hover:text-white text-sm transition-colors">{link.label}</Link>
            ))}
            <button onClick={handleLogin} className="flex items-center gap-2 text-white text-sm font-semibold">
              <UserIcon /> Log in
            </button>
          </div>
        )}
      </nav>
    </>
  );
}