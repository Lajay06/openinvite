import React from "react";
import { Link } from "react-router-dom";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Unlike PaymentSuccess.jsx, this page never polls for anything — a gift
// purchase never changes the buyer's own account state (see
// api/webhooks/stripe.js's gift-mode branch: it never writes a User.plan),
// so there is nothing on this page to wait for. Confirmation is async and
// happens by email (PR G4, gifting v2 bridge).
export default function GiftPurchaseSuccess() {
  return (
    <div
      style={{
        minHeight: "100vh", background: "#0A0A0A", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24, fontFamily: PJS,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 20, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: 64 }}
        />

        <div
          style={{
            width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9.5 17.5L19 7" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 16px", fontFamily: PJS }}>
          Your gift is on its way.
        </h1>

        <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.5)", margin: "0 0 48px", fontFamily: PJS }}>
          Check your inbox for a receipt with your gift code. We're emailing your recipient right now too, if the address you entered was correct.
        </p>

        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 40 }} />

        <Link to="/" style={{ textDecoration: "none" }}>
          <button
            style={{
              background: "#FFFFFF", color: "#0A0A0A", border: "none", borderRadius: 999,
              padding: "14px 40px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: PJS,
            }}
          >
            Back to Openinvite
          </button>
        </Link>
      </div>
    </div>
  );
}
