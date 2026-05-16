import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';

const IMG_WIDTH = 60;
const IMG_HEIGHT = 85;
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000;

const IMAGES = [
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

const lerp = (start, end, t) => start * (1 - t) + end * t;

function FlipCard({ src, index, target }) {
   return (
     <motion.div
       animate={{
         x: target.x,
         y: target.y,
         rotate: target.rotation,
         scale: target.scale,
         opacity: target.opacity,
       }}
       transition={{ type: "spring", stiffness: 80, damping: 20, restDelta: 0.001 }}
       style={{
         position: "absolute",
         width: IMG_WIDTH,
         height: IMG_HEIGHT,
         transformStyle: "preserve-3d",
         perspective: "1000px",
         cursor: "pointer",
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
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden",
          borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          backfaceVisibility: "hidden"
        }}>
          <img src={src} alt={`card-${index}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.1)" }} />
        </div>
        {/* Back */}
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden",
          borderRadius: "12px", background: "#111111",
          border: "1px solid #333",
          backfaceVisibility: "hidden", transform: "rotateY(180deg)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "24px", height: "2px", background: "linear-gradient(135deg, #E03553, #803D81)", margin: "0 auto 8px" }} />
            <p style={{ color: "#FFFFFF", fontSize: "10px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, letterSpacing: "0.1em" }}>VIEW</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScrollMorphHero() {
  const [introPhase, setIntroPhase] = useState("scatter");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [morphValue, setMorphValue] = useState(0);
  const [rotateValue, setRotateValue] = useState(0);
  const [parallaxValue, setParallaxValue] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
    return () => observer.disconnect();
  }, []);

  const virtualScroll = useMotionValue(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = null;
    let lastScroll = -1;

    const handleWheel = (e) => {
      e.preventDefault();
      const newScroll = Math.min(Math.max(scrollRef.current + e.deltaY, 0), MAX_SCROLL);
      scrollRef.current = newScroll;

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        if (scrollRef.current !== lastScroll) {
          lastScroll = scrollRef.current;
          virtualScroll.set(scrollRef.current);
        }
        rafId = null;
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [virtualScroll]);

  const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
  const smoothMorph = useSpring(morphProgress, { stiffness: 80, damping: 20, restDelta: 0.001 });
  const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
  const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 80, damping: 20, restDelta: 0.001 });
  const mouseX = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 40, damping: 20, restDelta: 0.001 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseX.set(normalizedX * 100);
    };
    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX]);

  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase("line"), 500);
    const t2 = setTimeout(() => setIntroPhase("circle"), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const u1 = smoothMorph.on("change", setMorphValue);
    const u2 = smoothScrollRotate.on("change", setRotateValue);
    const u3 = smoothMouseX.on("change", setParallaxValue);
    return () => { u1(); u2(); u3(); };
  }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

  const scatterPositions = useMemo(() => IMAGES.map(() => ({
    x: (Math.random() - 0.5) * 1500,
    y: (Math.random() - 0.5) * 1000,
    rotation: (Math.random() - 0.5) * 180,
    scale: 0.6,
    opacity: 0,
  })), []);

  const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
  const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100vh", background: "#0A0A0A", overflow: "hidden" }}>

      {/* Intro text */}
      <div style={{ position: "absolute", zIndex: 0, top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={introPhase === "circle" && morphValue < 0.5
            ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" }
            : { opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 1 }}
          style={{
            fontSize: "clamp(24px, 4vw, 48px)", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em", whiteSpace: "nowrap",
            willChange: "opacity, transform",
            WebkitTransform: "translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          Every moment, beautifully planned.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.5 - morphValue } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{ marginTop: "16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: "#E03553", fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: "uppercase" }}
        >
          SCROLL TO EXPLORE
        </motion.p>
      </div>

      {/* Arc content */}
      <motion.div
        style={{
          opacity: contentOpacity, y: contentY, position: "absolute", top: "8%", zIndex: 10, width: "100%", textAlign: "center", pointerEvents: "none", padding: "0 32px",
          willChange: "opacity, transform",
          WebkitTransform: "translateZ(0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <p style={{ color: "#DDF762", fontSize: "11px", fontWeight: 500, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "12px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          OPENINVITE
        </p>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", marginBottom: "12px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Your wedding, beautifully planned.
        </h2>
        <p style={{ fontSize: "16px", color: "#888888", maxWidth: "500px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6 }}>
          Scroll through the moments that make your day unforgettable.
        </p>
      </motion.div>

      {/* Cards */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
        {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
          let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

          if (introPhase === "scatter") {
            target = scatterPositions[i];
          } else if (introPhase === "line") {
            const lineSpacing = 70;
            const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
            target = { x: i * lineSpacing - lineTotalWidth / 2, y: 0, rotation: 0, scale: 1, opacity: 1 };
          } else {
            const isMobile = containerSize.width < 768;
            const minDimension = Math.min(containerSize.width, containerSize.height);
            const circleRadius = Math.min(minDimension * 0.35, 350);
            const circleAngle = (i / TOTAL_IMAGES) * 360;
            const circleRad = (circleAngle * Math.PI) / 180;
            const circlePos = {
              x: Math.cos(circleRad) * circleRadius,
              y: Math.sin(circleRad) * circleRadius,
              rotation: circleAngle + 90,
            };

            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);
            const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25);
            const arcCenterY = arcApexY + arcRadius;
            const spreadAngle = isMobile ? 100 : 130;
            const startAngle = -90 - (spreadAngle / 2);
            const step = spreadAngle / (TOTAL_IMAGES - 1);
            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);
            const maxRotation = spreadAngle * 0.8;
            const boundedRotation = -scrollProgress * maxRotation;
            const currentArcAngle = startAngle + (i * step) + boundedRotation;
            const arcRad = (currentArcAngle * Math.PI) / 180;
            const arcPos = {
              x: Math.cos(arcRad) * arcRadius + parallaxValue,
              y: Math.sin(arcRad) * arcRadius + arcCenterY,
              rotation: currentArcAngle + 90,
              scale: isMobile ? 1.4 : 1.8,
            };

            target = {
              x: lerp(circlePos.x, arcPos.x, morphValue),
              y: lerp(circlePos.y, arcPos.y, morphValue),
              rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
              scale: lerp(1, arcPos.scale, morphValue),
              opacity: 1,
            };
          }

          return <FlipCard key={i} src={src} index={i} target={target} />;
        })}
      </div>

      {/* Bottom gradient fade */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "120px", background: "linear-gradient(to top, #0A0A0A, transparent)", pointerEvents: "none", zIndex: 20 }} />
    </div>
  );
}

export default function ScrollMorphPage() {
  useEffect(() => {
    document.title = "Scroll Morph — Openinvite Test";
    return () => { document.title = "Openinvite"; };
  }, []);

  return (
    <div style={{
      background: "#0A0A0A", minHeight: "100vh",
      WebkitTransform: "translateZ(0)",
      transform: "translateZ(0)",
      WebkitPerspective: "1000px",
      perspective: "1000px",
    }}>
      {/* Back link */}
      <Link
        to="/"
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          zIndex: 100,
          color: "#FFFFFF",
          fontSize: "12px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textDecoration: "none",
          opacity: 0.6,
          letterSpacing: "0.05em",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
      >
        ← Back to home
      </Link>

      <ScrollMorphHero />
    </div>
  );
}