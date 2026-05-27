import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { base44 } from "@/api/base44Client";
import { ImageSlider } from "@/components/ui/ImageSlider";
import { track, identify } from "@/lib/analytics";
import { identifyUser as crispIdentify } from "@/lib/crisp";

// Cloudflare Turnstile site key.
// Falls back to Cloudflare's public "always pass" test key so the site works
// without env vars in development.
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

// Debug: log which key is active at module load time so it shows in DevTools
// immediately when the auth page is opened.
console.log(
  "[signup] TURNSTILE_SITE_KEY:",
  import.meta.env.VITE_TURNSTILE_SITE_KEY
    ? "custom key (" + import.meta.env.VITE_TURNSTILE_SITE_KEY.slice(0, 8) + "…)"
    : "⚠️  VITE_TURNSTILE_SITE_KEY not set — using Cloudflare test key (always-pass)"
);

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

/* ── Social provider icons ────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path d="M11.4 24H0V12.6h11.4V24z" fill="#F25022"/>
    <path d="M24 24H12.6V12.6H24V24z" fill="#00A4EF"/>
    <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#7FBA00"/>
    <path d="M24 11.4H12.6V0H24v11.4z" fill="#FFB900"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const SOCIAL_PROVIDERS = [
  {
    id: "google",
    label: "Google",
    Icon: GoogleIcon,
    bg: "#ffffff", color: "#0A0A0A",
    border: "1px solid rgba(10,10,10,0.18)",
  },
  {
    id: "apple",
    label: "Apple",
    Icon: AppleIcon,
    bg: "#0A0A0A", color: "#ffffff",
    border: "1px solid #0A0A0A",
  },
  {
    id: "microsoft",
    label: "Microsoft",
    Icon: MicrosoftIcon,
    bg: "#ffffff", color: "#0A0A0A",
    border: "1px solid rgba(10,10,10,0.18)",
  },
  {
    id: "facebook",
    label: "Facebook",
    Icon: FacebookIcon,
    bg: "#1877F2", color: "#ffffff",
    border: "1px solid #1877F2",
  },
];

/* ── Social sign-in block ─────────────────────────────────────── */
function SocialSignIn() {
  const handleProvider = (provider) => {
    base44.auth.loginWithProvider(provider, "/Dashboard");
  };

  return (
    <>
      {/* 2-column grid — collapses to 1 column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]" style={{ marginBottom: 20 }}>
        {SOCIAL_PROVIDERS.map(({ id, label, Icon, bg, color, border }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleProvider(id)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7, padding: "10px 8px",
              background: bg, color, border,
              borderRadius: 999, cursor: "pointer",
              fontFamily: PJS, fontSize: 13, fontWeight: 600,
              transition: "opacity 0.15s ease",
              whiteSpace: "nowrap",
              boxSizing: "border-box", width: "100%",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <Icon />
            {/* On mobile (1 col, full width): "Continue with Google"
                On desktop (2 col, narrow): "Google" */}
            <span>
              <span className="sm:hidden">Continue with </span>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(10,10,10,0.1)" }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
          color: "rgba(10,10,10,0.4)", fontFamily: PJS, whiteSpace: "nowrap",
        }}>
          or continue with email
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(10,10,10,0.1)" }} />
      </div>
    </>
  );
}

/* ── Framer stagger ───────────────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

export default function LoginScreen({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'verify'
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // OTP verify state
  const [digits, setDigits]     = useState(["", "", "", "", "", ""]);
  const [resendMsg, setResendMsg] = useState("");
  const digitRefs = useRef([]);
  const otpCode = digits.join("");

  // ── Turnstile (invisible CAPTCHA) ────────────────────────────────────────
  // execution="render" → widget auto-runs on mount and calls onSuccess with a
  // pre-generated token. We store it in tsTokenRef (a ref, NOT state) so
  // handleSignup can read it synchronously on submit — using state here caused
  // a race condition where React's async batching meant the token wasn't yet
  // visible to handleSignup even though onSuccess had already fired.
  //
  // pendingSignup is only set when the user submits before the token arrives
  // (e.g. very slow Cloudflare load). A hard 8-second timeout prevents an
  // indefinite hang in that case.
  const turnstileRef   = useRef(null);
  const pendingSignup  = useRef(false); // true while waiting for a late token
  const tsTimeoutRef   = useRef(null);  // handle for the 8-second hang-guard
  const tsTokenRef     = useRef("");    // pre-generated Turnstile token (ref = sync read)

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setResendMsg("");
  };

  /* ── Handlers ─────────────────────────────────────────────── */
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

  // ── Step 1: form submit — validate fields, then proceed with Turnstile ──────
  const handleSignup = (e) => {
    e.preventDefault();
    setError("");
    const tok = tsTokenRef.current;
    console.log("[signup] Form submitted — tsTokenRef available:", !!tok);

    if (!fullName.trim())    { setError("Please enter your full name."); return; }
    if (!email.trim())       { setError("Please enter your email address."); return; }
    if (!password.trim())    { setError("Please enter a password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);

    if (tok) {
      // Happy path: Turnstile already resolved before the user hit submit.
      // Consume the token synchronously (ref read, no async batching) and
      // reset the widget so a fresh token is ready on any subsequent attempt.
      console.log("[signup] ✅ Pre-generated token available — proceeding immediately");
      tsTokenRef.current = "";
      turnstileRef.current?.reset();
      doSignup(tok);
    } else {
      // Turnstile hasn't resolved yet (very slow Cloudflare load).
      // Set the pending flag and wait — onTurnstileSuccess will call doSignup.
      // Hard 8-second timeout prevents the form hanging forever.
      console.log("[signup] ⏳ Token not yet available — waiting for Turnstile...");
      pendingSignup.current = true;
      tsTimeoutRef.current = setTimeout(() => {
        if (pendingSignup.current) {
          pendingSignup.current = false;
          console.error("[signup] ❌ Turnstile timed out after 8 s");
          setError("Security check timed out. Please refresh the page and try again.");
          setLoading(false);
        }
      }, 8_000);
    }
    // Flow continues in onTurnstileSuccess → doSignup (if token was pending)
  };

  // ── Step 2: Turnstile resolved — run server-side checks, then register ────
  const doSignup = async (tok) => {
    console.log("[signup] doSignup() called — calling /api/verify-signup");

    // Pre-registration gate: Turnstile + disposable email + rate limit.
    // AbortController gives a hard 12-second deadline so a crashed/hung
    // Vercel function can never leave the form stuck in loading state forever.
    const controller = new AbortController();
    const abortTimer = setTimeout(() => {
      console.error("[signup] /api/verify-signup — aborting after 12 s (no response)");
      controller.abort();
    }, 12_000);

    try {
      const verifyRes = await fetch("/api/verify-signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, turnstileToken: tok }),
        signal:  controller.signal,
      });
      clearTimeout(abortTimer);
      const verifyJson = await verifyRes.json();
      console.log("[signup] /api/verify-signup →", verifyRes.status, verifyJson);

      if (!verifyRes.ok) {
        setError(verifyJson.error || "Signup verification failed. Please try again.");
        setLoading(false);
        turnstileRef.current?.reset();
        return;
      }
    } catch (err) {
      clearTimeout(abortTimer);
      if (err.name === "AbortError") {
        console.error("[signup] /api/verify-signup timed out — function may have crashed");
        setError("Request timed out. Please refresh and try again.");
      } else {
        console.error("[signup] /api/verify-signup network error:", err?.message);
        setError("Network error. Please check your connection and try again.");
      }
      setLoading(false);
      turnstileRef.current?.reset();
      return;
    }

    // All server checks passed — create the Base44 account
    console.log("[signup] Pre-registration checks passed — calling base44.auth.register()");
    try {
      const res = await base44.auth.register({ email, password, full_name: fullName });
      const { access_token } = res || {};
      if (access_token) {
        console.log("[signup] ✅ Registration complete — redirecting to /onboarding");
        base44.auth.setToken(access_token);
        track("user_signed_up", { method: "email" });
        crispIdentify(email, fullName);
        window.location.href = "/onboarding";
      } else {
        // OTP email sent — show verify screen
        console.log("[signup] OTP sent — switching to verify screen");
        setLoading(false);
        setDigits(["", "", "", "", "", ""]);
        setResendMsg("");
        setMode("verify");
      }
    } catch (err) {
      console.error("[signup] base44.auth.register() error:", err?.message);
      setError(err?.message || "Could not create account. Please try again.");
      setLoading(false);
      turnstileRef.current?.reset();
    }
  };

  // ── Turnstile callbacks ────────────────────────────────────────────────────
  const onTurnstileSuccess = (token) => {
    console.log("[signup] ✅ Turnstile onSuccess fired");
    // Clear the hang-guard timeout (it's only set when the user submitted before
    // the token was ready).
    if (tsTimeoutRef.current) {
      clearTimeout(tsTimeoutRef.current);
      tsTimeoutRef.current = null;
    }
    if (pendingSignup.current) {
      // User already clicked submit while we were waiting — proceed immediately.
      console.log("[signup] Pending submit found — proceeding with new token");
      pendingSignup.current = false;
      doSignup(token);
    } else {
      // Normal path: cache the token synchronously in a ref so handleSignup
      // can read it instantly on submit without async batching delays.
      tsTokenRef.current = token;
    }
  };

  const onTurnstileError = () => {
    console.error("[signup] ❌ Turnstile onError fired");
    tsTokenRef.current = "";
    if (tsTimeoutRef.current) {
      clearTimeout(tsTimeoutRef.current);
      tsTimeoutRef.current = null;
    }
    if (pendingSignup.current) {
      pendingSignup.current = false;
      setError("Security check failed. Please refresh the page and try again.");
      setLoading(false);
    }
  };

  const onTurnstileExpire = () => {
    // Token expired (5-min TTL) before the user submitted.
    // Reset to get a fresh token automatically.
    console.log("[signup] Turnstile token expired — resetting for fresh token");
    tsTokenRef.current = "";
    turnstileRef.current?.reset();
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

      {/* LEFT — static photo (hidden on mobile) */}
      <div className="hidden md:block" style={{ width: "50%", flexShrink: 0, height: "100vh" }}>
        <img
          src="https://res.cloudinary.com/dsr84xknv/image/upload/v1779185606/DTS_Weirdly_Ever_After_Agust%C3%ADn_Far%C3%ADas_Photos_ID8960_nspx4l.jpg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
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

              <motion.div variants={fadeUp}>
                <SocialSignIn />
              </motion.div>

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
                    <a
                      href="/forgot-password"
                      style={{ fontSize: 13, color: "#E03553", textDecoration: "none", fontFamily: PJS }}
                    >
                      Forgot password?
                    </a>
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

              <motion.div variants={fadeUp}>
                <SocialSignIn />
              </motion.div>

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

                {/*
                  Invisible Turnstile — renders as a 0×0 element.
                  execution="render" → widget auto-runs on mount and calls
                  onSuccess with a pre-generated token. On form submit the
                  token is already in tsToken state, so there is zero wait.
                  (execution="execute" was removed because if the Cloudflare
                  script hadn't fully initialised, execute() was a silent
                  no-op and the form hung indefinitely.)
                */}
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={onTurnstileSuccess}
                  onError={onTurnstileError}
                  onExpire={onTurnstileExpire}
                  options={{ appearance: "execute", execution: "render" }}
                />

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
