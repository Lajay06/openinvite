import { notificationCopy } from './copy';
import { scheduleLocalNotifications } from '../native';

/**
 * The test notification (goal 7): three real Openinvite notifications from
 * the copy catalog, 10, 20 and 30 seconds out, so the owner has time to
 * lock the phone and watch them land. Where the feed already has a reply,
 * a payment or the briefing, their words are used; otherwise a sample from
 * the same templates. Tapping one opens the same link the notification
 * center's row would.
 */
const SAMPLE = {
  rsvp_attending: () => notificationCopy('rsvp_attending', { names: ['Amelia Nguyen'], count: 2, replied: 41, invited: 120 }),
  payment_due: () => notificationCopy('payment_due', { item: 'Catering balance', vendor: 'The Fig Tree', amount: 'A$12,300', due: 'Friday' }),
  briefing: () => notificationCopy('briefing', { days: 179, sentence: '7 open tasks and 30 guests still to reply. The florist deposit is due Friday.' }),
};

export function buildTestNotices(base = '/m', items = [], now = Date.now()) {
  const pick = (types, fallbackType, fallbackLink) => {
    const it = items.find((i) => types.includes(i.type));
    if (it) return { type: it.type, title: it.title, body: it.body, link: it.link || fallbackLink };
    return { type: fallbackType, ...SAMPLE[fallbackType](), link: fallbackLink };
  };
  const plan = [
    [pick(['rsvp_attending', 'rsvp_declined', 'rsvp_maybe'], 'rsvp_attending', `${base}/guests`), 10],
    [pick(['payment_due'], 'payment_due', `${base}/plan/budget`), 20],
    [pick(['briefing'], 'briefing', base), 30],
  ];
  return plan.map(([n, secs], i) => ({ id: 7001 + i, ...n, at: new Date(now + secs * 1000) }));
}

/** Schedules the three. Resolves false when the plugin is not there (the web). */
export async function sendTestNotifications(base, items) {
  return scheduleLocalNotifications(buildTestNotices(base, items));
}
