import { prefGet, prefSet } from '../native';
import { NOTIFICATION_GROUPS } from './copy';

/**
 * Read and unread state, and the settings, stored with Capacitor
 * Preferences natively and localStorage on the web. Small JSON blobs.
 */
const KEYS = { seen: 'notif_seen_at', dismissed: 'notif_dismissed', settings: 'notif_settings', banner: 'notif_banner_seen' };

export async function loadState() {
  const [seen, dismissed, settings, bannerSeen] = await Promise.all([prefGet(KEYS.seen), prefGet(KEYS.dismissed), prefGet(KEYS.settings), prefGet(KEYS.banner)]);
  return {
    seenAt: seen ? Number(seen) || 0 : 0,
    dismissed: safeParse(dismissed, []),
    settings: { ...defaultSettings(), ...safeParse(settings, {}) },
    bannerSeen: safeParse(bannerSeen, []),
  };
}

export async function saveSeenAt(ts) { await prefSet(KEYS.seen, String(ts)); }
export async function saveDismissed(ids) { await prefSet(KEYS.dismissed, JSON.stringify(ids.slice(-500))); }
export async function saveSettings(settings) { await prefSet(KEYS.settings, JSON.stringify(settings)); }
export async function saveBannerSeen(ids) { await prefSet(KEYS.banner, JSON.stringify(ids.slice(-200))); }

export function defaultSettings() {
  const groups = {};
  for (const g of NOTIFICATION_GROUPS) groups[g.key] = true;
  return { groups, quietHours: { enabled: false, from: '22:00', to: '07:00' } };
}

function safeParse(s, fallback) {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
