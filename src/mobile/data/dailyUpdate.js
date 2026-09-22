import { useMemo } from 'react';
import { useApi } from './api';
import useLoad from './useLoad';
import { todosFrom, resolveDayState, avaSentence, greetingFor } from '@/lib/dayState';
import { coupleDisplayName } from '@/lib/coupleNames';
import { daysUntilWedding } from '@/lib/weddingCountdown';

/** "Monday 7 September", as Briefing.jsx's eyebrow prints it: weekday, day, month, no year. */
export function todayLabel(now = new Date()) {
  return `${now.toLocaleDateString(undefined, { weekday: 'long' })} ${now.getDate()} ${now.toLocaleDateString(undefined, { month: 'long' })}`;
}

/** Local calendar day, for "shown once a day". */
export function dayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * DailyUpdate.jsx's sentence, split for the phone: the greeting by local
 * time of day, then the lines after it. `avaSentence` is the desktop's own
 * function over the desktop's own day state, so the two screens say the
 * same thing for the same couple on the same day; nothing is rewritten
 * here. The one change of glyph: the waiting form's dash reads as a comma
 * (the app's copy rule).
 */
export function splitSentence(sentence, greeting) {
  const rest = String(sentence || '').startsWith(greeting) ? String(sentence).slice(greeting.length).trim() : String(sentence || '');
  const lines = rest.replace(/\s[—–]\s/g, ', ').split(/(?<=\.)\s+(?=[A-Z])/).map((l) => l.trim()).filter(Boolean);
  return lines;
}

/**
 * The daily update's data: the same stores DailyUpdate.jsx reads (guests,
 * to-dos, schedule, budget, vendors, the wedding details), each failing
 * soft and named when it does, so the day state can say what it could not
 * read rather than calling a failed load a clear day.
 */
export function useDailyUpdate() {
  const api = useApi();
  const load = useLoad(async () => {
    const failed = [];
    const soft = (p, name) => p.catch(() => { failed.push(name); return []; });
    const [details, guests, notes, schedule, budget, vendors] = await Promise.all([
      api.wedding.get().catch(() => null),
      soft(api.guests.list(), 'guests'),
      soft(api.list('Note', '-created_date'), 'to-dos'),
      soft(api.list('Schedule', 'start_time'), 'schedule'),
      soft(api.list('Budget', '-created_date'), 'budget'),
      soft(api.list('Vendor', '-created_date'), 'vendors'),
    ]);
    return { details, guests, tasks: todosFrom({ notes }), schedule, budget, vendors, failed };
  }, []);
  const content = useMemo(() => {
    const d = load.data;
    if (!d) return null;
    return buildDailyUpdate(d);
  }, [load.data]);
  return { ...load, content };
}

/** The screen's words from loaded stores (also used by the preview with fixtures). */
export function buildDailyUpdate({ details, guests = [], tasks = [], schedule = [], budget = [], vendors = [], failed = [] }, now = new Date()) {
  const daysOut = details?.weddingDate ? daysUntilWedding(details.weddingDate) : null;
  const day = resolveDayState({ tasks, schedule, guests, budget, vendors, unseen: failed, daysOut, now });
  const fullName = coupleDisplayName(details || {});
  const greeting = greetingFor(now, fullName);
  const sentence = avaSentence(day, { fullName, now });
  return { dateLabel: todayLabel(now), greeting, lines: splitSentence(sentence, greeting), sentence, badge: day.badge };
}
