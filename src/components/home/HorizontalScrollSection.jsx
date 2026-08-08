import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApplePillButton from "@/components/motion/ApplePillButton";

const prefersReduced = () =>
typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function addGlare(cardEl) {
  if (prefersReduced()) return;
  const onMove = (e) => {
    const rect = cardEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    cardEl.style.setProperty("--glare-x", `${x}%`);
    cardEl.style.setProperty("--glare-y", `${y}%`);
  };
  cardEl.addEventListener("mousemove", onMove, { passive: true });
  return () => cardEl.removeEventListener("mousemove", onMove);
}

// Real product areas, pulled straight from the app's own sidebar (see
// AnimatedSidebar.jsx NAV_SECTIONS + the two top-level items + Invitations/
// Notes, which are real pages without a sidebar entry — 40 tools total,
// grouped here into 7 honest cards instead of decorative copy).
const CARDS = [
{
  num: "01",
  title: "Guest management",
  desc: "RSVP tracking, seating charts and the wedding party, all in one list that never gets out of sync.",
  bullets: ["Guest list & RSVP tracking", "Seating chart planner", "Wedding party coordination"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8875_cwnpxl.jpg"
},
{
  num: "02",
  title: "Budget & registry",
  desc: "See what's spent, what's owed and what's coming, plus a registry your guests actually enjoy using.",
  bullets: ["Budget vs. actual spend", "Vendor payment tracking", "Gift registry"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BEHIND_THE_SCENES_Shauna_Summers_Photos_ID8234_esice8.jpg"
},
{
  num: "03",
  title: "Planning & schedule",
  desc: "A day-of timeline builder, a shared to-do list, and daily nudges so nothing slips through.",
  bullets: ["Day-of timeline builder", "Shared to-do list", "Daily planning updates"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1784100467/DTS_Weekend_Brainstorm_Kristine_Isabedra_Photos_ID2889_etg9ko.jpg"
},
{
  num: "04",
  title: "Vendors",
  desc: "Track every vendor you've booked, and discover new ones without leaving your planner.",
  bullets: ["Vendor directory", "Marketplace discovery", "Payment & contract tracking"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1779185603/DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj.jpg"
},
{
  num: "05",
  title: "Style & experience",
  desc: "Moodboards, music, photography and styling: every creative decision, kept in one place.",
  bullets: ["Moodboard & styling", "Music & guest song requests", "Photography & vows"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz.jpg"
},
{
  num: "06",
  title: "Plus 1",
  desc: "Bring someone into the planning. Invite your partner, a parent or a friend to share the load.",
  bullets: ["Invite a partner, parent or friend", "Their own login and their own access", "Everyone stays in sync automatically"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj.jpg"
},
{
  num: "07",
  title: "Guest suite",
  desc: "Accommodation, transport, live streaming and polls: the parts of the day your guests actually need to know.",
  bullets: ["Accommodation & transport", "Live streaming for absent guests", "Guest polls & Q&A"],
  photo: "https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1779185630/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3565_ys7asa.jpg"
},
];


const DOT_COLORS = ["#FFFFFF", "#FFFFFF", "#FFFFFF"];

// PublicNav's desktop pill is position: fixed at top: 20 with height: 48, so
// it occupies the first 68px of the viewport without contributing any layout
// height. The sticky viewport below subtracts this so the card row centers in
// the visible area rather than behind the nav.
const NAV_OCCUPIED_HEIGHT = 68;

export default function HorizontalScrollSection() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const section = sectionRef.current;
    const track = trackRef.current;
    const progressBar = progressRef.current;

    const updateScroll = () => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const scrollY = window.scrollY;
      const progress = Math.max(0, Math.min(1, (scrollY - sectionTop) / (sectionHeight - window.innerHeight)));

      if (track) {
        const trackWidth = track.scrollWidth;
        const maxTranslate = -(trackWidth - window.innerWidth);
        track.style.transform = `translateX(${progress * maxTranslate}px)`;
      }

      if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
      }
    };

    const handleScroll = () => {
      requestAnimationFrame(updateScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile]);

  if (isMobile) {
    return (
      <section style={{ background: "#0A0A0A", padding: "60px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(32px, 6vw, 80px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {CARDS.map((card, i) =>
            <div
              key={i}
              style={{
                height: 300,
                position: "relative",
                overflow: "hidden",
                borderRadius: 0,
                backgroundImage: `url(${card.photo})`,
                backgroundSize: "cover",
                backgroundPosition: card.photoPosition || "center",
                opacity: 0,
                transform: "translateY(20px)",
                animation: `fadeUp 0.6s ease-out ${i * 0.1}s forwards`
              }}>
              
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px", color: "#fff", zIndex: 2 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{card.num}</p>
                  <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, hyphens: "none" }}>{card.title}</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>{card.desc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </section>);

  }

  return (
    <div
      ref={sectionRef}
      className="horizontal-scroll-section"
      style={{
        position: "relative",
        height: "600vh",
        background: "#0A0A0A"
      }}>
      
      {/* paddingTop reserves the band the fixed nav sits over, so the flex
          centring below happens in the area the visitor can actually see
          rather than in the full 100vh. Without it the card row centers on
          the whole viewport, the nav covers the top of that space, and the
          block reads top-heavy: measured on production, 22px of black above
          the card against 90px below it at 1440x900, and 12px against 80px
          at 1440x800 — a 68px imbalance at both.

          68px is PublicNav's occupied height on desktop: it is fixed at
          top: 20 with height: 48 (see PublicNav.jsx). Below 768px this
          component returns a different stacked layout entirely and never
          reaches this branch, so the desktop nav is always the one in play
          here.

          Padding rather than a margin on the track because an absolutely
          positioned child resolves top: 0 against the padding box, whose
          top edge padding does not move — so the progress bar stays exactly
          where it was. */}
      <div
        className="sticky-container"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          paddingTop: NAV_OCCUPIED_HEIGHT,
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          background: "#0A0A0A"
        }}>
        
        {/* Features label + progress bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: "40px clamp(32px, 6vw, 80px)"
          }}>
          
          <div style={{ width: "100%", height: 2, background: "#222", borderRadius: 0 }}>
            <div
              ref={progressRef}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #E03553, #803D81)",
                width: "0%",
                transition: "none"
              }} />
            
          </div>
        </div>

        {/* Horizontal track */}
        <div
          ref={trackRef}
          className="horizontal-track"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            willChange: "transform",
            paddingLeft: "10vw",
            gap: "4vw",
            transition: "none",
            transform: "translateX(0)"
          }}>
          
          {CARDS.map((card, i) =>
          <div
            key={i}
            className="horizontal-card"
            ref={(el) => {if (el) addGlare(el);}}
            style={{
              width: "clamp(300px, 75vw, 900px)",
              height: "80vh",
              flexShrink: 0,
              overflow: "hidden",
              borderRadius: 0,
              position: "relative",
              backgroundImage: `url(${card.photo})`,
              backgroundSize: "cover",
              backgroundPosition: card.photoPosition || "center"
            }}>
            
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)" }} />
              <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "60px",
                color: "#fff",
                zIndex: 10
              }}>
              
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>{card.num}</p>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 600, marginBottom: 12, hyphens: "none", maxWidth: 500, lineHeight: 1.1 }}>
                   {card.title}
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 24, maxWidth: 420 }}>
                   {card.desc}
                </p>
                <div style={{marginTop: 20}}>
                  {card.bullets.map((bullet, bi) => (
                    <div key={bi} style={{
                      padding: '12px 0',
                      borderBottom: bi < card.bullets.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      fontSize: 14,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}>
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* End card */}
          <div
            style={{
              width: "100vw",
              height: "80vh",
              flexShrink: 0,
              background: "#0A0A0A",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
            
            <h2 style={{ fontSize: "clamp(48px, 8vw, 96px)", fontWeight: 600, color: "#fff", marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1 }} className="text-base">
              40 planning tools.
            </h2>
            <p style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 400, color: "rgba(255,255,255,0.6)", marginBottom: 48 }}>
              One platform.
            </p>
            <ApplePillButton onClick={() => navigate('/Features')}>
              Explore all features
            </ApplePillButton>
          </div>
        </div>
      </div>
    </div>);

}