// LOCAL ONLY, branch d/shots-local, never committed: steps the demo through the
// eight App Store screens on a timer so the simulator needs no taps.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// The harness clock: today at 9:41 in the morning, matching the status bar, so
// the daily update greets "Morning". Shifts every no-argument Date and Date.now.
const RealDate = Date;
const target = new RealDate(); target.setHours(9, 41, 0, 0);
const OFFSET = target.getTime() - RealDate.now();
class ShotDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(RealDate.now() + OFFSET); else super(...a); }
  static now() { return RealDate.now() + OFFSET; }
}
globalThis.Date = ShotDate;

const START = 22000;
const STEP = 12000;
const clickText = (t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); if (b) b.click(); };
const STEPS = [
  (go) => { clickText("Let's go"); go('/m/preview/plan'); },
  (go) => go('/m/preview/guests'),
  (go) => go('/m/preview/site'),
  (go) => go('/m/preview/plan/schedule?segment=runsheet'),
  (go) => go('/m/preview/plan/seating'),
  (go) => go('/m/preview/plan/budget'),
  (go) => { go('/m/preview'); setTimeout(() => { document.querySelector('.oi-m-ava')?.click(); setTimeout(() => document.activeElement?.blur(), 600); }, 1500); },
];

export function useShotTour() {
  const navigate = useNavigate();
  useEffect(() => {
    const go = (p) => navigate(p);
    const timers = STEPS.map((fn, i) => setTimeout(() => fn(go), START + i * STEP));
    return () => timers.forEach(clearTimeout);
  }, []);
}
