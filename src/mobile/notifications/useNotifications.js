import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getMyRecords, getMyGuestsWithRsvp, getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { daysUntilWedding } from '@/lib/weddingCountdown';
import { buildFeed } from './feed';
import { loadState, saveSeenAt, saveDismissed, saveSettings, saveBannerSeen, defaultSettings } from './store';
import { NOTIFICATION_GROUPS } from './copy';

const Notification = base44.entities.Notification;
const POLL_MS = 60000;

/**
 * THE ONE NOTIFICATIONS HOOK. Merges the server-written Notification entity
 * (rsvp_received, collaborator_joined, questionnaire_answered) with a feed
 * derived from the couple's own data (messages, song requests, poll votes,
 * gifts, tasks due, payments due). Read state: the entity's own `read` for
 * its rows; a last-seen timestamp plus dismissed ids in Preferences /
 * localStorage for the derived rows.
 *
 * Interface (what the screens see):
 *   items, unread, loading, error, reload,
 *   markAllRead(), markRead(item), settings, setSettings(), latestUnseen
 *
 * A real notifications table later only replaces `load()`.
 */
export default function useNotifications({ base = '/m', symbol = '$' } = {}) {
  const { user } = useAuth();
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [state, setState] = useState({ seenAt: 0, dismissed: [], settings: defaultSettings(), bannerSeen: [] });
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const [entity, guests, messages, songReqRes, pollVotes, details, gifts, tasks, budget, guestbook] = await Promise.all([
        user?.id ? Notification.filter({ recipient_user_id: user.id }, '-created_date', 30).catch(() => []) : [],
        getMyGuestsWithRsvp('created_date').catch(() => []),
        getMyRecords('GuestMessage', '-created_date').catch(() => []),
        fetchSongRequests(),
        getMyRecords('PollVote', '-created_date').catch(() => []),
        getMyWeddingDetails().catch(() => null),
        getMyRecords('ReceivedGift', '-created_date').catch(() => []),
        getMyRecords('Note', '-created_date').catch(() => []),
        getMyRecords('Budget', '-created_date').catch(() => []),
        getMyRecords('GuestbookEntry', '-created_date').catch(() => []),
      ]);
      const days = details?.weddingDate ? daysUntilWedding(details.weddingDate) : null;
      const open = (tasks || []).filter((t) => t.view_type === 'todo' && !t.completed).length;
      const briefing = { days, sentence: open ? `${open} open task${open === 1 ? '' : 's'} and ${(guests || []).filter((g) => g.invite_sent_at && (!g.rsvp_status || g.rsvp_status === 'pending')).length} guests still to reply.` : 'Nothing overdue. A good day to look at your guest suite.' };
      if (alive.current) { setRaw({ entity: entity.filter((n) => !n.is_test), guests, messages, songRequests: songReqRes, pollVotes, polls: details?.polls || [], gifts, tasks: (tasks || []).filter((t) => t.view_type === 'todo'), budget, guestbook, briefing }); setError(null); }
    } catch (e) {
      if (alive.current) setError(e);
    }
  }, [user?.id]);

  useEffect(() => {
    alive.current = true;
    loadState().then((s) => { if (alive.current) setState(s); });
    load();
    const id = setInterval(load, POLL_MS);
    return () => { alive.current = false; clearInterval(id); };
  }, [load]);

  const items = useMemo(() => {
    if (!raw) return [];
    const enabled = new Set(NOTIFICATION_GROUPS.filter((g) => state.settings.groups?.[g.key] !== false).flatMap((g) => g.types));
    return buildFeed({ ...raw, symbol, base })
      .filter((it) => enabled.has(it.type))
      .map((it) => ({ ...it, unread: it.readOnServer != null ? !it.readOnServer && it.ts > state.seenAt : it.ts > state.seenAt && !state.dismissed.includes(it.id) }));
  }, [raw, state, symbol, base]);

  const unread = items.filter((i) => i.unread).length;
  // The messages button's own count (goal 8): guest messages not yet read, by the record's own flag, whatever the notification settings say.
  const unreadMessages = (raw?.messages || []).filter((m) => !m.read).length;
  const latestUnseen = items.find((i) => i.unread && !state.bannerSeen.includes(i.id) && i.ts > Date.now() - 6 * 3600000) || null;

  const markAllRead = useCallback(async () => {
    const ts = Date.now();
    setState((s) => ({ ...s, seenAt: ts }));
    await saveSeenAt(ts);
    const serverUnread = items.filter((i) => i.entityId && i.unread);
    await Promise.all(serverUnread.map((i) => Notification.update(i.entityId, { read: true }).catch(() => {})));
    load();
  }, [items, load]);

  const markRead = useCallback(async (item) => {
    setState((s) => ({ ...s, dismissed: [...s.dismissed, item.id] }));
    await saveDismissed([...state.dismissed, item.id]);
    if (item.entityId) await Notification.update(item.entityId, { read: true }).catch(() => {});
  }, [state.dismissed]);

  const setSettings = useCallback(async (next) => {
    let before = null;
    setState((s) => { before = s.settings; return { ...s, settings: next }; });
    try { await saveSettings(next); } catch { setState((s) => ({ ...s, settings: before })); }
  }, []);

  const bannerShown = useCallback(async (item) => {
    const next = [...state.bannerSeen, item.id];
    setState((s) => ({ ...s, bannerSeen: next }));
    await saveBannerSeen(next);
  }, [state.bannerSeen]);

  return { items, unread, unreadMessages, loading: raw == null && !error, error, reload: load, markAllRead, markRead, settings: state.settings, setSettings, latestUnseen, bannerShown };
}

async function fetchSongRequests() {
  try {
    const token = localStorage.getItem('base44_access_token');
    const res = await fetch('/api/song-request-review', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const { requests } = await res.json();
    return requests || [];
  } catch { return []; }
}
