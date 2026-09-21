import React from 'react';
import { CheckCheck, BellOff, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Screen from '../shell/Screen';
import { RowGroup, EmptyState, ErrorState, SkeletonRows } from '../ui';
import { groupByTime } from './feed';
import ActivityRow, { ActivityGroupTitle } from './ActivityRow';

/**
 * The notification center. Grouped Today / This week / Earlier in the
 * shared activity rows (ActivityRow, the same as Home's "Latest"). Tap
 * opens the item's screen. Presentational: everything comes in as props.
 */
export default function NotificationsScreen({ items = [], loading, error, onRetry, onMarkAllRead, onOpen, onSettings, back, now = Date.now() }) {
  const navigate = useNavigate();
  const groups = groupByTime(items, now);
  const unread = items.filter((i) => i.unread).length;
  return (
    <Screen
      title="Notifications"
      subtitle={unread ? `${unread} unread` : items.length ? 'All caught up' : ''}
      back={back}
      actions={[
        ...(unread ? [{ icon: CheckCheck, label: 'Mark all as read', onClick: onMarkAllRead }] : []),
        { icon: Settings2, label: 'Notification settings', onClick: onSettings },
      ]}
    >
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : items.length === 0 ? (
          <EmptyState icon={BellOff} text="Nothing yet. Replies, messages and requests will show up here as they arrive." />
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              <ActivityGroupTitle>{g.title}</ActivityGroupTitle>
              <RowGroup>
                {g.items.map((it) => <ActivityRow key={it.id} item={it} now={now} onOpen={(item) => { onOpen?.(item); navigate(item.link); }} />)}
              </RowGroup>
            </section>
          ))
        )}
      </div>
    </Screen>
  );
}
