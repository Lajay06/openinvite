import React, { useEffect, useRef, useState, useCallback } from "react";
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

const CARDS = [
{
  num: "01",
  title: "Advanced Guest Management",
  desc: "From RSVP tracking to seating charts, we handle the guest list chaos so you can stay cool, calm, and perfectly in control.",
  bullets: ["Unlimited guest lists", "Real-time RSVP tracking", "Smart table assignments"],
  photo: "https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg"
},
{
  num: "02",
  title: "Smart Budget Tracking",
  desc: "Plan like a pro. Full visibility, clear control, and a few clever nudges to keep things beautifully on track.",
  bullets: ["Budget vs. actual spend", "Vendor payment scheduling", "Visual expense analytics"],
  photo: "https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg"
},
{
  num: "03",
  title: "Timeline & Schedule Planning",
  desc: "Run the day like a director — with an intuitive builder that keeps every moment smooth, stylish, and on time.",
  bullets: ["Visual timeline builder", "Vendor coordination", "Seamless day-of rundown"],
  photo: "https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg"
},
{
  num: "04",
  title: "Collaborative Playlists",
  desc: "Curate the ultimate wedding soundtrack — and let your guests be part of the vibe.",
  bullets: ["Spotify integration", "Guest song suggestions", "DJ collaboration tools"],
  photo: "https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg"
},
{
  num: "05",
  title: "Digital Invitations",
  desc: "Make a first impression that actually impresses. Design stunning digital invites, send with ease, track every RSVP.",
  bullets: ["Custom invitation designs", "Real-time RSVP tracking", "Guest messaging"],
  photo: "https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg"
},
{
  num: "06",
  title: "AI Assistant — Ava",
  desc: "Ava takes the guesswork out of planning — smart suggestions, personalised insights, always one step ahead.",
  bullets: ["Personalised recommendations", "Smart budget tips", "Automated task suggestions"],
  photo: "https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg"
}];


const DOT_COLORS = ["#FFFFFF", "#FFFFFF", "#FFFFFF"];

export default function HorizontalScrollSection() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const indicatorRef = useRef(null);
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
    const indicator = indicatorRef.current;

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

      if (indicator) {
        indicator.style.opacity = progress < 0.1 ? 1 : 0;
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
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#DDF762", marginBottom: 60 }}>Features</p>
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
                backgroundPosition: "center",
                opacity: 0,
                transform: "translateY(20px)",
                animation: `fadeUp 0.6s ease-out ${i * 0.1}s forwards`
              }}>
              
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 24px", color: "#fff", zIndex: 2 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "#888", marginBottom: 12 }}>{card.num}</p>
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
      
      <div
        className="sticky-container"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
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
          
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#DDF762", marginBottom: 16 }}>Features</p>
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
              backgroundPosition: "center"
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
              
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "#888", marginBottom: 16 }}>{card.num}</p>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 600, marginBottom: 12, hyphens: "none", maxWidth: 500, lineHeight: 1.1 }}>
                   {card.title === "Digital Invitations" ? "Universes" : card.title}
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 24, maxWidth: 420 }}>
                   {card.title === "Digital Invitations" ? "Choose your aesthetic universe. Every invitation, asset and piece of design follows a single visual vision — from your Save the Date to your Thank You Notes. 9 universes, 10 pieces each." : card.desc}
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
              37 planning tools.
            </h2>
            <p style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 400, color: "rgba(255,255,255,0.6)", marginBottom: 48 }}>
              One platform.
            </p>
            <ApplePillButton onClick={() => navigate('/Features')}>
              Explore all features
            </ApplePillButton>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          ref={indicatorRef}
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            zIndex: 20,
            transition: "opacity 0.3s ease",
            opacity: 1
          }}>
          
          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff" }}>
            SCROLL TO EXPLORE →
          </p>
        </div>
      </div>
    </div>);

}