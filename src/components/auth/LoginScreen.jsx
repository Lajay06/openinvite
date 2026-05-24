import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const SLIDER_IMAGES = [
  "https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg",
];

function ImageSlider({ images, interval = 4500 }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % images.length), interval);
    return () => clearInterval(t);
  }, [images, interval]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0A0A0A" }}>
      <AnimatePresence initial={false}>
        <motion.img
          key={idx}
          src={images[idx]}
          alt=""
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AnimatePresence>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.52) 100%)" }} />
      <div style={{ position: "absolute", top: 32, left: 32, zIndex: 2 }}>
        <img src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png" style={{ height: 24 }} alt="openinvite" />
      </div>
      <div style={{ position: "absolute", bottom: 52, left: 32, right: 32, zIndex: 2 }}>
        <p style={{ color: "#FFFFFF", fontSize: 17, fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.01em", marginBottom: 8 }}>
          "Planning a wedding should feel as exciting as the day itself."
        </p>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>— The Openinvite Team</p>
      </div>
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 2 }}>
        {images.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? "#FFFFFF" : "rgba(255,255,255,0.35)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s ease" }} />
        ))}
      </div>
    </div>
  );
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { y: 14, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 110, damping: 14 } },
};

const inputStyle = {
  width: "100%",
  padding: "0 0 9px 0",
  border: "none",
  borderBottom: "1px solid rgba(10,10,10,0.18)",
  background: "transparent",
  fontSize: 14,
  fontWeight: 500,
  color: "#0A0A0A",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(10,10,10,0.4)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 6,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'verify'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  // OTP verify state
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendMsg, setResendMsg] = useState("");
  const digitRefs = useRef([]);
  const otpCode = digits.join('');

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setResetMsg("");
    setResendMsg("");
  };

  // SDK method is resetPasswordRequest, not sendPasswordResetEmail
  const handleForgotPassword = async () => {
    setError("");
    setResetMsg("");
    if (!email.trim()) {
      setError("Please enter your email address first.");
      return;
    }
    try {
      await base44.auth.resetPasswordRequest(email);
      setResetMsg("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err?.message || "Could not send reset email. Please try again.");
    }
  };

  // FIX 1: Google OAuth — loginWithProvider is the correct SDK method.
  // loginWithGoogle() does not exist in the Base44 SDK.
  // The root cause of "just refreshes" was appBaseUrl not being set in
  // base44Client.js, causing the redirect to go to a relative path on
  // the current domain. That is now fixed.
  const handleGoogleLogin = async () => {
    setError("");
    try {
      base44.auth.loginWithProvider('google', window.location.origin + '/Dashboard');
      // SDK performs a full-page redirect — nothing to await here.
      // On return, app-params.js extracts access_token from the URL and
      // base44Client.js calls setToken(), persisting it to localStorage.
    } catch (err) {
      setError(err?.message || 'Google sign in failed. Please try again.');
    }
  };

  // Login — e.preventDefault() stops the browser from doing a native form
  // POST which would reload the page. loginViaEmailPassword calls setToken()
  // internally, so base44_access_token is written to localStorage before
  // the full-page redirect, allowing AuthContext.checkAppState() to find
  // a valid token on the next load.
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password.trim()) { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // loginViaEmailPassword calls setToken() internally — token is now in localStorage.
      window.location.href = '/Dashboard';
    } catch (err) {
      setError(err?.message || 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  // Signup — register the account. If the API returns a token immediately,
  // persist it and route to onboarding. If it requires email verification
  // (no token returned), switch to the OTP verify step inline.
  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password.trim()) { setError("Please enter a password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const regResponse = await base44.auth.register({ email, password, full_name: fullName });
      const { access_token: regToken } = regResponse || {};

      if (regToken) {
        // No verification step — token returned directly, go straight to onboarding
        base44.auth.setToken(regToken);
        window.location.href = '/onboarding';
      } else {
        // Email verification required — show OTP step
        setLoading(false);
        setDigits(['', '', '', '', '', '']);
        setResendMsg('');
        setMode('verify');
      }
    } catch (err) {
      setError(err?.message || 'Could not create account. Please try again.');
      setLoading(false);
    }
  };

  // Verify OTP — submit the 6-digit code the user received by email
  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setResendMsg("");
    if (otpCode.length < 6 || digits.some(d => d === '')) {
      setError("Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      const verifyResponse = await base44.auth.verifyOtp({ email, otpCode });
      const { access_token } = verifyResponse || {};

      if (access_token) {
        base44.auth.setToken(access_token);
      } else {
        // Token not in verify response — log in now that email is verified
        await base44.auth.loginViaEmailPassword(email, password);
      }
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err?.message || 'Invalid or expired code. Please try again.');
      setLoading(false);
    }
  };

  // Resend OTP — fires base44.auth.resendOtp and shows confirmation
  const handleResend = async () => {
    setError("");
    setResendMsg("");
    try {
      await base44.auth.resendOtp(email);
      setResendMsg("Code resent. Check your inbox.");
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err?.message || 'Could not resend code. Please try again.');
    }
  };

  // OTP digit helpers
  const handleDigitChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return; // digits only
    const next = [...digits];
    next[idx] = val.slice(-1); // keep only the last typed digit
    setDigits(next);
    setError("");
    if (val && idx < 5) setTimeout(() => digitRefs.current[idx + 1]?.focus(), 0);
  };

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) digitRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    setError("");
    setTimeout(() => digitRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
  };

  const focusRed = (e) => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; };
  const blurNormal = (e) => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; };

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F5", padding: 24, boxSizing: "border-box" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 960, height: 680, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 0, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.05)" }}
      >
        {/* LEFT — photo slider */}
        <div className="hidden md:block" style={{ height: "100%" }}>
          <ImageSlider images={SLIDER_IMAGES} />
        </div>

        {/* RIGHT — form panel */}
        <div
          style={{ background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 40px", gridColumn: "span 2" }}
          className="md:[grid-column:span_1]"
        >
          <motion.div style={{ width: "100%", maxWidth: 320 }} variants={stagger} initial="hidden" animate="visible">

            {mode === 'verify' ? (
              <>
                {/* Verify heading */}
                <motion.div variants={item} style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Check your email.
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(10,10,10,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>
                    We sent a 6-digit code to <strong style={{ color: "#0A0A0A", fontWeight: 600 }}>{email}</strong>. Enter it below to verify your account.
                  </p>
                </motion.div>

                {/* OTP form */}
                <form onSubmit={handleVerify}>
                  <motion.div variants={item} style={{ marginBottom: 28 }}>
                    {/* 6-digit boxes */}
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
                            width: 44,
                            height: 52,
                            textAlign: "center",
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#0A0A0A",
                            border: "none",
                            borderBottom: digit ? "2px solid #E03553" : "2px solid rgba(10,10,10,0.18)",
                            background: "transparent",
                            outline: "none",
                            borderRadius: 0,
                            caretColor: "#E03553",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: "border-color 0.15s ease",
                          }}
                          onFocus={e => { e.target.style.borderBottomColor = "#E03553"; }}
                          onBlur={e => { e.target.style.borderBottomColor = digits[idx] ? "#E03553" : "rgba(10,10,10,0.18)"; }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: 12, color: "#E03553", marginBottom: 12, textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {error}
                    </motion.p>
                  )}

                  {resendMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: 12, color: "#444444", marginBottom: 12, textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {resendMsg}
                    </motion.p>
                  )}

                  <motion.div variants={item} style={{ marginBottom: 16 }}>
                    <button
                      type="submit"
                      disabled={loading || otpCode.length < 6}
                      style={{
                        width: "100%",
                        padding: 13,
                        background: (loading || otpCode.length < 6) ? "rgba(224,53,83,0.5)" : "#E03553",
                        border: "none",
                        borderRadius: 999,
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: (loading || otpCode.length < 6) ? "not-allowed" : "pointer",
                        boxSizing: "border-box",
                        transition: "background 0.2s ease",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {loading ? "Verifying…" : "Verify"}
                    </button>
                  </motion.div>
                </form>

                <motion.p variants={item} style={{ textAlign: "center", fontSize: 12, color: "rgba(10,10,10,0.4)", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Didn't receive a code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Resend code
                  </button>
                </motion.p>

                <motion.p variants={item} style={{ textAlign: "center", fontSize: 12, color: "rgba(10,10,10,0.4)", marginTop: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    style={{ color: "rgba(10,10,10,0.4)", background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    ← Back to sign up
                  </button>
                </motion.p>
              </>
            ) : mode === 'login' ? (
              <>
                {/* Login heading */}
                <motion.div variants={item} style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Welcome back.
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(10,10,10,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Sign in to continue planning your perfect day.
                  </p>
                </motion.div>

                {/* Google SSO — temporarily hidden */}
                {/* <motion.button variants={item} onClick={handleGoogleLogin} disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 16px", border: "1px solid rgba(10,10,10,0.12)", borderRadius: 999, background: "#FFFFFF", cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 20, boxSizing: "border-box", transition: "background 0.15s ease", opacity: loading ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }} whileHover={{ background: loading ? "#FFFFFF" : "#FAFAFA" }} whileTap={{ scale: loading ? 1 : 0.99 }}><GoogleIcon />Continue with Google</motion.button> */}
                <motion.p variants={item} style={{ fontSize: 12, color: "rgba(10,10,10,0.35)", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24, textAlign: "center" }}>
                  Google sign-in coming soon
                </motion.p>

                {/* Email/password form */}
                <form onSubmit={handleEmailSubmit}>
                  <motion.div variants={item} style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={inputStyle}
                      disabled={loading}
                      onFocus={focusRed}
                      onBlur={blurNormal}
                    />
                  </motion.div>

                  <motion.div variants={item} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={labelStyle}>Password</label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        style={{ fontSize: 12, fontWeight: 500, color: "#E03553", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
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
                      onBlur={blurNormal}
                    />
                  </motion.div>

                  {resetMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: 12, color: "#444444", marginBottom: 12, marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {resetMsg}
                    </motion.p>
                  )}

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: 12, color: "#E03553", marginBottom: 12, marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.div variants={item} style={{ marginBottom: 20, marginTop: 20 }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ width: "100%", padding: 13, background: loading ? "rgba(224,53,83,0.6)" : "#E03553", border: "none", borderRadius: 999, color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxSizing: "border-box", transition: "background 0.2s ease", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {loading ? "Signing in…" : "Sign in"}
                    </button>
                  </motion.div>
                </form>

                <motion.p variants={item} style={{ textAlign: "center", fontSize: 12, color: "rgba(10,10,10,0.4)", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Don't have an account?{" "}
                  <button onClick={() => switchMode('signup')} style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Start for free
                  </button>
                </motion.p>
              </>
            ) : (
              <>
                {/* Signup heading */}
                <motion.div variants={item} style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Create your account.
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(10,10,10,0.5)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Start planning your perfect day today.
                  </p>
                </motion.div>

                {/* Google SSO for signup — temporarily hidden */}
                {/* <motion.button variants={item} onClick={handleGoogleLogin} disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 16px", border: "1px solid rgba(10,10,10,0.12)", borderRadius: 999, background: "#FFFFFF", cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 20, boxSizing: "border-box", transition: "background 0.15s ease", opacity: loading ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }} whileHover={{ background: loading ? "#FFFFFF" : "#FAFAFA" }} whileTap={{ scale: loading ? 1 : 0.99 }}><GoogleIcon />Sign up with Google</motion.button> */}
                <motion.p variants={item} style={{ fontSize: 12, color: "rgba(10,10,10,0.35)", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24, textAlign: "center" }}>
                  Google sign-in coming soon
                </motion.p>

                {/* Signup form */}
                <form onSubmit={handleSignup}>
                  <motion.div variants={item} style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Full name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      style={inputStyle}
                      disabled={loading}
                      onFocus={focusRed}
                      onBlur={blurNormal}
                    />
                  </motion.div>

                  <motion.div variants={item} style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={inputStyle}
                      disabled={loading}
                      onFocus={focusRed}
                      onBlur={blurNormal}
                    />
                  </motion.div>

                  <motion.div variants={item} style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Password</label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={inputStyle}
                      disabled={loading}
                      onFocus={focusRed}
                      onBlur={blurNormal}
                    />
                  </motion.div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: 12, color: "#E03553", marginBottom: 12, marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.div variants={item} style={{ marginBottom: 20, marginTop: 20 }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ width: "100%", padding: 13, background: loading ? "rgba(224,53,83,0.6)" : "#E03553", border: "none", borderRadius: 999, color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxSizing: "border-box", transition: "background 0.2s ease", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {loading ? "Creating account…" : "Create account"}
                    </button>
                  </motion.div>
                </form>

                <motion.p variants={item} style={{ textAlign: "center", fontSize: 12, color: "rgba(10,10,10,0.4)", lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Already have an account?{" "}
                  <button onClick={() => switchMode('login')} style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Sign in
                  </button>
                </motion.p>
              </>
            )}

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
