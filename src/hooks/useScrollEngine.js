/**
 * Core scroll engine — single rAF loop, shared across the page.
 * Returns current scroll Y via a ref (no re-renders).
 */
import { useEffect, useRef } from "react";

let listeners = [];
let rafId = null;
let lastY = 0;

function tick() {
  const y = window.scrollY;
  if (y !== lastY) {
    lastY = y;
    listeners.forEach(fn => fn(y));
  }
  rafId = requestAnimationFrame(tick);
}

function addListener(fn) {
  if (!listeners.length) rafId = requestAnimationFrame(tick);
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(l => l !== fn);
    if (!listeners.length && rafId) { cancelAnimationFrame(rafId); rafId = null; }
  };
}

export function useScrollEngine(callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    return addListener(y => cbRef.current(y));
  }, []);
}