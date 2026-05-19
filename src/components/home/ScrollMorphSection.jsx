import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useTransform, useSpring, useMotionValue } from 'framer-motion';

const MORPH_IMAGES = [
  "https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_fc15a5b1a8764b65949ef99231041ead~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_b014095a4e4f42a9a415f314cad6b260~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_370cde85ab644a8fad626149c63f7f0c~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_d44e25f4998148b5a36522f648fbc794~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_f912572c44a94a71a99d2672ac25e364~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_2d4ea077497f48679138b2e04dbc7e3a~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_f936e32d99904a6cbdfe46282fe4b39b~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_9be952c6ade04b5cb84818743f98684d~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_57a2dcf2b5254f6696ae3ff26400ffaf~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_66d79e02de6a4ab59870b43560bf2971~mv2.jpg",
  "https://static.wixstatic.com/media/d2df22_2c30e2cd6b6e47e49d01917aa4726aff~mv2.jpg",
];

const lerp = (a, b, t) => a * (1 - t) + b * t;
const lerp01 = (val, min, max) => Math.max(0, Math.min(1, (val - min) / (max - min)));
const IMG_W = 60;
const IMG_H = 85;
const TOTAL = 20;

function FlipCard({ src, index, target }) {
  return (
    <motion.div
      animate={{ x: target.x, y: target.y, rotate: target.rotation, scale: target.scale, opacity: target.opacity }}
      transition={{ type: "spring", stiffness: 80, damping: 20, restDelta: 0.001 }}
      style={{
        position: "absolute", width: IMG_W, height: IMG_H, transformStyle: "preserve-3d", perspective: "1000px", cursor: "pointer",
        willChange: "transform",
        WebkitTransform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <motion.div
        style={{ position: "relative", height: "100%", width: "100%", transformStyle: "preserve-3d" }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ rotateY: 180 }}
      >
        {/* Front */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", backfaceVisibility: "hidden" }}>
          <img src={src} alt={`morph-${index}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        {/* Back */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "#111111", border: "1px solid #333", backfaceVisibility: "hidden", transform: "rotateY(180deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 24, height: 2, background: "linear-gradient(135deg,#E03553,#803D81)", margin: "0 auto 8px" }} />
            <p style={{ color: "#fff", fontSize: 9, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, letterSpacing: "0.15em", margin: 0 }}>OPENINVITE</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ScrollMorphSection() {
  const [introPhase, setIntroPhase] = useState("scatter");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [morphVal, setMorphVal] = useState(0);
  const [rotateVal, setRotateVal] = useState(0);
  const [parallaxVal, setParallaxVal] = useState(0);
  const [scrolled, setScrolled] = useState(0);

  const stickyRef = useRef(null);
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const virtualScroll = useMotionValue(0);

  // Resize observer on sticky inner
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setContainerSize({ width: r.width, height: r.height });
    });
    obs.observe(el);
    setContainerSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => obs.disconnect();
  }, []);

  // Intro sequence (time-based, triggers once on mount)
  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase("line"), 500);
    const t2 = setTimeout(() => setIntroPhase("circle"), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Scroll driver — clean RAF throttled implementation
  useEffect(() => {
    const outer = containerRef.current;
    if (!outer) return;

    let rafId = null;
    let lastScroll = -1;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const outerTop = outer.offsetTop;
        const scrollValue = Math.max(0, window.scrollY - outerTop);
        const clamped = Math.min(scrollValue, 5000);
        
        if (clamped !== lastScroll) {
          lastScroll = clamped;
          virtualScroll.set(clamped);
          setScrolled(clamped);
        }
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [virtualScroll]);

  // Mousemove parallax
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseX.set(nx * 80);
    };
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX]);

  // Card animation driven by scroll progress in range 500–3000
  const morphProgress = useTransform(virtualScroll, [800, 1400], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 80, damping: 20, restDelta: 0.001 });
  const scrollRotate = useTransform(virtualScroll, [1400, 3000], [0, 360]);
  const smoothRotate = useSpring(scrollRotate, { stiffness: 80, damping: 20, restDelta: 0.001 });
  const smoothMouse = useSpring(mouseX, { stiffness: 40, damping: 20, restDelta: 0.001 });

  useEffect(() => {
    const u1 = smoothMorph.on("change", setMorphVal);
    const u2 = smoothRotate.on("change", setRotateVal);
    const u3 = smoothMouse.on("change", setParallaxVal);
    return () => { u1(); u2(); u3(); };
  }, [smoothMorph, smoothRotate, smoothMouse]);

  // Scatter positions for cards
  const scatterPositions = useMemo(() => MORPH_IMAGES.map(() => ({
    x: (Math.random() - 0.5) * 1500,
    y: (Math.random() - 0.5) * 1000,
    rotation: (Math.random() - 0.5) * 180,
    scale: 0.6,
    opacity: 0,
  })), []);

  // Phase opacity calculations using linear interpolation
  const headlineOpacity = 1 - lerp01(scrolled, 0, 500);
  const endTextOpacity = 1;
  const continueOpacity = lerp01(scrolled, 2800, 3200);
  const cardsVisible = scrolled > 300;

  return (
    <>
      <style>{`
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .scroll-morph-section {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          -webkit-perspective: 1000px;
          perspective: 1000px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .scroll-morph-section * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>

      {/* OUTER: tall container — 4000px for scroll room */}
      <div ref={containerRef} style={{ position: 'relative', height: '4000px' }}>

        {/* INNER: sticky — pins to viewport */}
        <div
          ref={stickyRef}
          style={{
            position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#0A0A0A',
            WebkitTransform: "translateZ(0)",
            transform: "translateZ(0)",
            WebkitPerspective: "1000px",
            perspective: "1000px",
          }}
        >

          {/* PHASE 1: Headline "So, why us?" — fades out 0→500px */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            opacity: headlineOpacity,
            pointerEvents: 'none',
            zIndex: 10,
            width: '100%',
            padding: '0 40px',
            willChange: 'opacity',
          }}>
            <h2 style={{
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              margin: 0,
            }}>So, why us?</h2>
          </div>

          {/* PHASE 3: End text "Every detail, beautifully handled." — fades in 3000→3500px */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            opacity: endTextOpacity,
            pointerEvents: 'none',
            zIndex: 10,
            width: '100%',
            padding: '0 40px',
          }}>
            <h2 style={{
              color: '#FFFFFF',
              fontSize: 'clamp(48px, 7vw, 88px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              margin: 0,
              textAlign: 'center',
            }}>
              Every detail, beautifully handled.
            </h2>
            <p style={{
              color: '#AAAAAA',
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 400,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.01em',
              lineHeight: 1.6,
              maxWidth: '600px',
              margin: '20px auto 0',
            }}>
              Planning, invitations, guests, timelines and budgets, intelligently connected in one seamless experience.
            </p>
          </div>

          {/* Continue scrolling indicator — appears 2800→3200px */}
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            opacity: continueOpacity,
            zIndex: 20,
            pointerEvents: 'none',
          }}>
            <p style={{
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              marginBottom: '8px',
              margin: 0,
            }}>
              Continue scrolling
            </p>
            <div style={{
              width: '20px',
              height: '20px',
              margin: '8px auto 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'bounceDown 1.5s ease-in-out infinite',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E03553" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>
          </div>

          {/* Cards stage — visible when scrolled > 300 */}
          {cardsVisible && (
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}>
              {MORPH_IMAGES.slice(0, TOTAL).map((src, i) => {
                let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

                if (introPhase === "scatter") {
                  target = scatterPositions[i];
                } else if (introPhase === "line") {
                  const spacing = 70;
                  target = { x: i * spacing - (TOTAL * spacing) / 2, y: 0, rotation: 0, scale: 1, opacity: 1 };
                } else {
                  const isMobile = containerSize.width < 768;
                  const minDim = Math.min(containerSize.width, containerSize.height);
                  const circleR = Math.min(minDim * 0.35, 350);
                  const cAngle = (i / TOTAL) * 360;
                  const cRad = (cAngle * Math.PI) / 180;
                  const circlePos = {
                    x: Math.cos(cRad) * circleR,
                    y: Math.sin(cRad) * circleR,
                    rotation: cAngle + 90,
                  };

                  const baseR = Math.min(containerSize.width, containerSize.height * 1.5);
                  const arcR = baseR * (isMobile ? 1.4 : 1.1);
                  const arcApexY = containerSize.height * (isMobile ? 0.1 : 0.05);
                  const arcCenterY = arcApexY + arcR;
                  const spread = isMobile ? 100 : 130;
                  const startAngle = -90 - spread / 2;
                  const step = spread / (TOTAL - 1);
                  const scrollProg = Math.min(Math.max(rotateVal / 360, 0), 1);
                  const boundedRot = -scrollProg * spread * 0.8;
                  const arcAngle = startAngle + i * step + boundedRot;
                  const arcRad = (arcAngle * Math.PI) / 180;
                  const arcPos = {
                    x: Math.cos(arcRad) * arcR + parallaxVal,
                    y: Math.sin(arcRad) * arcR + arcCenterY,
                    rotation: arcAngle + 90,
                    scale: isMobile ? 1.4 : 1.8,
                  };

                  target = {
                    x: lerp(circlePos.x, arcPos.x, morphVal),
                    y: lerp(circlePos.y, arcPos.y, morphVal),
                    rotation: lerp(circlePos.rotation, arcPos.rotation, morphVal),
                    scale: lerp(1, arcPos.scale, morphVal),
                    opacity: 1,
                  };
                }

                return <FlipCard key={i} src={src} index={i} target={target} />;
              })}
            </div>
          )}

          {/* Bottom gradient — prevents cards from bleeding into next section */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: "linear-gradient(to top, #0A0A0A, transparent)",
            pointerEvents: "none",
            zIndex: 20,
          }} />

        </div>
      </div>
    </>
  );
  }