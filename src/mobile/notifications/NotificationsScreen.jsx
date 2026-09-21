import React from 'react';
import { CheckCheck, BellOff, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Screen from '../shell/Screen';
import { RowGroup, EmptyState, ErrorState, SkeletonRows } from '../ui';
import { groupByTime, relativeTime } from './feed';
import { typeIcon } from './icons';

/**
 * The notification center. Grouped Today / This week / Earlier. Tap opens
 * the item's screen. Presentational: everything comes in as props.
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
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{g.title}</h2>
              <RowGroup>
                {g.items.map((it) => {
                  const { icon: Icon, tile } = typeIcon(it.type);
                  return (
                    <button key={it.id} type="button" className="oi-m-row oi-m-row--pressable" onClick={() => { onOpen?.(it); navigate(it.link); }} style={{ alignItems: 'flex-start', padding: '14px 16px' }}>
                      <span className={`oi-m-row__tile oi-m-row__tile--${tile}`}><Icon size={18} strokeWidth={1.75} /></span>
                      <div className="oi-m-row__body">
                        <div className="oi-m-row__label" style={{ whiteSpace: 'normal', fontWeight: it.unread ? 600 : 400 }}>{it.title}</div>
                        <div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>{it.body}</div>
                        <div className="oi-m-meta" style={{ marginTop: 4 }}>{relativeTime(it.ts, now)}</div>
                      </div>
                      {it.unread && <span className="oi-m-notif__unread" style={{ marginTop: 8 }} />}
                    </button>
                  );
                })}
              </RowGroup>
            </section>
          ))
        )}
      </div>
    </Screen>
  );
}
