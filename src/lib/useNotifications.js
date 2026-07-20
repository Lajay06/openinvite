import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// AUDIT/notifications: bell badge + dropdown poll on this key. Any mutation
// that changes a notification's read state should invalidate it — mirrors
// LAYOUT_QUERY_KEY's own invalidate-after-mutate convention in Layout.jsx.
export const NOTIFICATIONS_QUERY_KEY = 'notifications';

const Notification = base44.entities.Notification;

// 60s: frequent enough that a new RSVP/collaborator notification shows up
// without a manual refresh, infrequent enough not to hammer the API for a
// badge count nobody is staring at continuously. Matches the "sensible
// polling interval" the feature spec asked for, not a websocket.
const POLL_INTERVAL_MS = 60_000;

export function useNotifications(userId) {
  return useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: async () => {
      const rows = await Notification.filter({ recipient_user_id: userId }, '-created_date', 30);
      // is_test excluded client-side, not via the query filter — Base44
      // doesn't guarantee it backfills the schema default on records
      // written before the field existed, so an exact-match filter could
      // silently hide real rows. See tests/persistence/notifications.mjs.
      return rows.filter(n => !n.is_test);
    },
    enabled: !!userId,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS / 2,
  });
}

export function useMarkNotificationRead(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] }),
  });
}

export function useMarkAllNotificationsRead(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unreadIds) => {
      await Promise.all(unreadIds.map((id) => Notification.update(id, { read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] }),
  });
}
