import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-driven curtain transition between sections
 * Creates a smooth "ink wash" effect as sections scroll into view
 */
export function useSectionCurtain(sectionRef) {
  const curtainRef = useRef(null);
  const [curtainScale, setCurtainScale] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !curtainRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const vh = window.innerHeight;

      // Progress: 0 when section top is at bottom of viewport, 1 when at top
      const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));
      // Scale from 1 (covering) to 0 (revealed) as section scrolls in
      const scale = Math.max(0, 1 - progress * 2);

      setCurtainScale(scale);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial call
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionRef]);

  return { curtainRef, curtainScale };
}