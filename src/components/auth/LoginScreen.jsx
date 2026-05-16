import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(10,10,10,0.4)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSSO = () => {
    // Treat SSO as demo login — set local auth and redirect
    localStorage.setItem("oi_auth", "1");
    localStorage.setItem("oi_user", JSON.stringify({ email: "user@openinvite.com" }));
    window.location.href = "/Dashboard";
  };

  const handleEmailSubmit = (e) => {
    e?.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password.trim()) { setError("Please enter your password."); return; }
    setLoading(true);
    localStorage.setItem("oi_auth", "1");
    localStorage.setItem("oi_user", JSON.stringify({ email }));
    window.location.href = "/Dashboard";
  };

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

            {/* Heading */}
            <motion.div variants={item} style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 6 }}>
                Welcome back.
              </h1>
              <p style={{ fontSize: 14, color: "rgba(10,10,10,0.5)" }}>
                Sign in to continue planning your perfect day.
              </p>
            </motion.div>

            {/* Google SSO */}
            <motion.button
              variants={item}
              onClick={handleSSO}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 16px", border: "1px solid rgba(10,10,10,0.12)", borderRadius: 999, background: "#FFFFFF", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 20, boxSizing: "border-box", transition: "background 0.15s ease" }}
              whileHover={{ background: "#FAFAFA" }}
              whileTap={{ scale: 0.99 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </motion.button>

            {/* Divider */}
            <motion.div variants={item} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(10,10,10,0.08)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(10,10,10,0.35)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(10,10,10,0.08)" }} />
            </motion.div>

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
                  onFocus={e => (e.target.style.borderBottomColor = "#E03553")}
                  onBlur={e => (e.target.style.borderBottomColor = "rgba(10,10,10,0.18)")}
                />
              </motion.div>

              <motion.div variants={item} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={labelStyle}>Password</label>
                  <button type="button" onClick={handleSSO} style={{ fontSize: 12, fontWeight: 500, color: "#E03553", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderBottomColor = "#E03553")}
                  onBlur={e => (e.target.style.borderBottomColor = "rgba(10,10,10,0.18)")}
                />
              </motion.div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ fontSize: 12, color: "#E03553", marginBottom: 12 }}
                >
                  {error}
                </motion.p>
              )}

              <motion.div variants={item} style={{ marginBottom: 20, marginTop: 20 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: 13, background: loading ? "rgba(224,53,83,0.6)" : "#E03553", border: "none", borderRadius: 999, color: "#FFFFFF", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxSizing: "border-box", transition: "background 0.2s ease" }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </motion.div>
            </form>

            <motion.p variants={item} style={{ textAlign: "center", fontSize: 12, color: "rgba(10,10,10,0.4)", lineHeight: 1.6 }}>
              Don't have an account?{" "}
              <button onClick={handleSSO} style={{ color: "#E03553", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}>
                Start for free
              </button>
            </motion.p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
