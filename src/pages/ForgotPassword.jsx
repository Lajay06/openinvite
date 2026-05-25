import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ImageSlider } from "@/components/ui/ImageSlider";

const SLIDER_IMAGES = [
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185627/DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185610/justin-follis-A7Um4oi-UYU-unsplash_bbjjam.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185631/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185626/DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779241859/rio-syhputra-a7vmvXei7fE-unsplash_vojinz.jpg",
];

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#555555",
  letterSpacing: "0.06em",
  marginBottom: 6,
  fontFamily: PJS,
};

const inputStyle = {
  width: "100%",
  padding: "0 0 10px 0",
  border: "none",
  borderBottom: "1px solid #E5E5E5",
  background: "transparent",
  fontSize: 14,
  fontWeight: 400,
  color: "#0A0A0A",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: PJS,
  transition: "border-color 0.15s ease",
};

const focusRed = (e) => { e.target.style.borderBottomColor = "#E03553"; };
const blurGrey = (e) => { e.target.style.borderBottomColor = "#E5E5E5"; };

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

function PrimaryBtn({ children, disabled, type = "submit", onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "12px 0",
        background: disabled ? "rgba(224,53,83,0.5)" : "#E03553",
        color: "#FFFFFF",
        border: "none",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: PJS,
        marginTop: 24,
        transition: "background 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email.trim());
      setSent(true);
    } catch (err) {
      setError(err?.message || "Could not send reset email. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* LEFT — photo slider (hidden on mobile) */}
      <div className="hidden md:block" style={{ width: "50%", flexShrink: 0, height: "100vh" }}>
        <ImageSlider images={SLIDER_IMAGES} />
      </div>

      {/* RIGHT — form panel */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflowY: "auto",
          background: "#FFFFFF",
        }}
        className="md:w-1/2"
      >
        <motion.div
          key={sent ? "success" : "form"}
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", maxWidth: 400, margin: "0 auto", padding: "0 48px" }}
        >

          {/* ── SUCCESS STATE ──────────────────────────────── */}
          {sent ? (
            <>
              <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: PJS }}>
                  Check your email.
                </h1>
                <p style={{ fontSize: 14, color: "#999999", fontFamily: PJS, lineHeight: 1.55, margin: 0 }}>
                  We've sent a password reset link to{" "}
                  <strong style={{ color: "#0A0A0A", fontWeight: 600 }}>{email}</strong>.
                  Follow the link in your inbox to set a new password.
                </p>
              </motion.div>

              <motion.p variants={fadeUp} style={{ fontSize: 13, color: "#999", fontFamily: PJS, marginBottom: 16 }}>
                Didn't receive it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => { setSent(false); setError(""); }}
                  style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, fontFamily: PJS }}
                >
                  try again
                </button>.
              </motion.p>

              <motion.p variants={fadeUp} style={{ fontSize: 13, color: "#999", fontFamily: PJS }}>
                <a
                  href="/login"
                  style={{ color: "#E03553", textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: PJS }}
                >
                  ← Back to sign in
                </a>
              </motion.p>
            </>
          ) : (

            /* ── FORM STATE ───────────────────────────────── */
            <>
              <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: PJS }}>
                  Forgot your password?
                </h1>
                <p style={{ fontSize: 14, color: "#999999", fontFamily: PJS, lineHeight: 1.55, margin: 0 }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </motion.div>

              <form onSubmit={handleSubmit}>
                <motion.div variants={fadeUp} style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                    onFocus={focusRed}
                    onBlur={blurGrey}
                    autoFocus
                  />
                </motion.div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: "#E03553", marginTop: 8, fontFamily: PJS }}
                  >
                    {error}
                  </motion.p>
                )}

                <PrimaryBtn disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </PrimaryBtn>
              </form>

              <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 20, fontFamily: PJS }}>
                <a
                  href="/login"
                  style={{ color: "#E03553", textDecoration: "none", fontWeight: 600, fontSize: 13, fontFamily: PJS }}
                >
                  ← Back to sign in
                </a>
              </p>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
}
