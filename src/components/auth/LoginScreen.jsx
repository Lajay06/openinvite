import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ImageSlider } from "@/components/ui/ImageSlider";
import { track, identify } from "@/lib/analytics";
import { identifyUser as crispIdentify } from "@/lib/crisp";

const SLIDER_IMAGES = [
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185627/DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185610/justin-follis-A7Um4oi-UYU-unsplash_bbjjam.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185631/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779185626/DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa.jpg",
  "https://res.cloudinary.com/dsr84xknv/image/upload/v1779241859/rio-syhputra-a7vmvXei7fE-unsplash_vojinz.jpg",
];

const PJS = "'Plus Jakarta Sans', sans-serif";

/* ── Shared field styles ──────────────────────────────────────── */
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
const blurGrey  = (e) => { e.target.style.borderBottomColor = "#E5E5E5"; };

/* ── Framer stagger ───────────────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

export default function LoginScreen() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'verify'
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resetMsg, setResetMsg] = useState("");

  // OTP verify state
  const [digits, setDigits]     = useState(["", "", "", "", "", ""]);
  const [resendMsg, setResendMsg] = useState("");
  const digitRefs = useRef([]);
  const otpCode = digits.join("");

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setResetMsg("");
    setResendMsg("");
  };

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleForgotPassword = async () => {
    setError(""); setResetMsg("");
    if (!email.trim()) { setError("Please enter your email address first."); return; }
    try {
      await base44.auth.resetPasswordRequest(email);
      setResetMsg("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err?.message || "Could not send reset email. Please try again.");
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim())    { setError("Please enter your email address."); return; }
    if (!password.trim()) { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      const me = await base44.auth.loginViaEmailPassword(email, password);
      track('user_logged_in', { method: 'email' });
      if (me?.id) identify(me.id, { email: me.email, name: me.full_name });
      crispIdentify(me?.email, me?.full_name);
      window.location.href = "/Dashboard";
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim())    { setError("Please enter your full name."); return; }
    if (!email.trim())       { setError("Please enter your email address."); return; }
    if (!password.trim())    { setError("Please enter a password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await base44.auth.register({ email, password, full_name: fullName });
      const { access_token: tok } = res || {};
      if (tok) {
        base44.auth.setToken(tok);
        track('user_signed_up', { method: 'email' });
        crispIdentify(email, fullName);
        window.location.href = "/onboarding";
      } else {
        setLoading(false);
        setDigits(["", "", "", "", "", ""]);
        setResendMsg("");
        setMode("verify");
      }
    } catch (err) {
      setError(err?.message || "Could not create account. Please try again.");
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(""); setResendMsg("");
    if (otpCode.length < 6 || digits.some(d => d === "")) {
      setError("Please enter all 6 digits."); return;
    }
    setLoading(true);
    try {
      const res = await base44.auth.verifyOtp({ email, otpCode });
      const { access_token } = res || {};
      if (access_token) {
        base44.auth.setToken(access_token);
      } else {
        await base44.auth.loginViaEmailPassword(email, password);
      }
      track('user_signed_up', { method: 'email_otp' });
      crispIdentify(email, fullName);
      window.location.href = "/onboarding";
    } catch (err) {
      setError(err?.message || "Invalid or expired code. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(""); setResendMsg("");
    try {
      await base44.auth.resendOtp(email);
      setResendMsg("Code resent. Check your inbox.");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err?.message || "Could not resend code. Please try again.");
    }
  };

  const handleDigitChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[idx] = val.slice(-1);
    setDigits(next);
    setError("");
    if (val && idx < 5) setTimeout(() => digitRefs.current[idx + 1]?.focus(), 0);
  };

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) digitRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft"  && idx > 0) digitRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError("");
    setTimeout(() => digitRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
  };

  /* ── Shared button ────────────────────────────────────────── */
  const PrimaryBtn = ({ children, onClick, disabled, type = "submit" }) => (
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

  /* ── Layout ───────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* LEFT — photo slider (hidden on mobile) */}
      <div className="hidden md:block" style={{ width: "50%", flexShrink: 0, height: "100vh" }}>
        <ImageSlider images={SLIDER_IMAGES} />
      </div>

      {/* RIGHT — form panel */}
      <div style={{
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
          key={mode}
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ width: "100%", maxWidth: 400, margin: "0 auto", padding: "0 48px" }}
        >

          {/* ── VERIFY OTP ──────────────────────────────── */}
          {mode === "verify" && (
            <>
              <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", margin: "0 0 8px", fontFamily: PJS }}>
                  Check your email.
                </h1>
                <p style={{ fontSize: 14, color: "#999999", fontFamily: PJS, lineHeight: 1.55, margin: 0 }}>
                  We sent a 6-digit code to{" "}
                  <strong style={{ color: "#0A0A0A", fontWeight: 600 }}>{email}</strong>.
                  Enter it below to verify your account.
                </p>
              </motion.div>

              <form onSubmit={handleVerify}>
                <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => digitRefs.current[idx] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigitChange(idx, e.target.value)}
                        onKeyDown={e => handleDigitKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleDigitPaste : undefined}
                        disabled={loading}
                        style={{
                          width: 44, height: 52,
                          textAlign: "center",
                          fontSize: 26, fontWeight: 700,
                          color: "#0A0A0A",
                          border: "none",
                          borderBottom: digit ? "2px solid #E03553" : "2px solid #E5E5E5",
                          background: "transparent",
                          outline: "none",
                          borderRadius: 0,
                          caretColor: "#E03553",
                          fontFamily: PJS,
                          transition: "border-color 0.15s ease",
                        }}
                        onFocus={e => { e.target.style.borderBottomColor = "#E03553"; }}
                        onBlur={e => { e.target.style.borderBottomColor = digits[idx] ? "#E03553" : "#E5E5E5"; }}
                      />
                    ))}
                  </div>
                </motion.div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: "#E03553", marginBottom: 8, textAlign: "center", fontFamily: PJS }}
                  >{error}</motion.p>
                )}
                {resendMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: "#555", marginBottom: 8, textAlign: "center", fontFamily: PJS }}
                  >{resendMsg}</motion.p>
                )}

                <PrimaryBtn disabled={loading || otpCode.length < 6}>
                  {loading ? "Verifying…" : "Verify"}
                </PrimaryBtn>
              </form>

              <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 20, fontFamily: PJS }}>
                Didn't receive a code?{" "}
                <button type="button" onClick={handleResend}
                  style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, fontFamily: PJS }}>
                  Resend
                </button>
              </p>
              <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 8, fontFamily: PJS }}>
                <button type="button" onClick={() => switchMode("signup")}
                  style={{ color: "#999", background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0, fontFamily: PJS }}>
                  ← Back to sign up
                </button>
              </p>
            </>
          )}

          {/* ── LOGIN ───────────────────────────────────── */}
          {mode === "login" && (
            <>
              <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", margin: "0 0 6px", fontFamily: PJS }}>
                  Welcome back.
                </h1>
                <p style={{ fontSize: 14, color: "#999999", fontFamily: PJS, margin: 0 }}>
                  Sign in to continue planning your perfect day.
                </p>
              </motion.div>

              <motion.p variants={fadeUp} style={{ fontSize: 12, color: "#999999", textAlign: "center", marginBottom: 24, fontFamily: PJS }}>
                Google sign-in coming soon
              </motion.p>

              <form onSubmit={handleEmailSubmit}>
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
                  />
                </motion.div>

                <motion.div variants={fadeUp} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={labelStyle}>Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{ fontSize: 13, color: "#E03553", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: PJS }}
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                    onFocus={focusRed}
                    onBlur={blurGrey}
                  />
                </motion.div>

                {resetMsg && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: "#555", marginTop: 8, fontFamily: PJS }}>
                    {resetMsg}
                  </motion.p>
                )}
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: "#E03553", marginTop: 8, fontFamily: PJS }}>
                    {error}
                  </motion.p>
                )}

                <PrimaryBtn disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </PrimaryBtn>
              </form>

              <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 20, fontFamily: PJS }}>
                Don't have an account?{" "}
                <button onClick={() => switchMode("signup")}
                  style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, fontFamily: PJS }}>
                  Start for free
                </button>
              </p>
            </>
          )}

          {/* ── SIGNUP ──────────────────────────────────── */}
          {mode === "signup" && (
            <>
              <motion.div variants={fadeUp} style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", margin: "0 0 6px", fontFamily: PJS }}>
                  Create your account.
                </h1>
                <p style={{ fontSize: 14, color: "#999999", fontFamily: PJS, margin: 0 }}>
                  Start planning your perfect day today.
                </p>
              </motion.div>

              <motion.p variants={fadeUp} style={{ fontSize: 12, color: "#999999", textAlign: "center", marginBottom: 24, fontFamily: PJS }}>
                Google sign-in coming soon
              </motion.p>

              <form onSubmit={handleSignup}>
                <motion.div variants={fadeUp} style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Full name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                    onFocus={focusRed}
                    onBlur={blurGrey}
                  />
                </motion.div>

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
                  />
                </motion.div>

                <motion.div variants={fadeUp} style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={inputStyle}
                    disabled={loading}
                    onFocus={focusRed}
                    onBlur={blurGrey}
                  />
                </motion.div>

                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: "#E03553", marginTop: 8, fontFamily: PJS }}>
                    {error}
                  </motion.p>
                )}

                <PrimaryBtn disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </PrimaryBtn>
              </form>

              <p style={{ textAlign: "center", fontSize: 13, color: "#999", marginTop: 20, fontFamily: PJS }}>
                Already have an account?{" "}
                <button onClick={() => switchMode("login")}
                  style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, fontFamily: PJS }}>
                  Sign in
                </button>
              </p>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
}
