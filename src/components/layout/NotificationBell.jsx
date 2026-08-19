import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Users, HelpCircle, Clock, Info, Loader2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useModalFocusTrap } from '@/lib/a11y';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/useNotifications';
import { parseBase44Date } from '@/lib/base44Date';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TYPE_ICON = {
  rsvp_received: CheckCircle2,
  collaborator_joined: Users,
  questionnaire_answered: HelpCircle,
  task_due: Clock,
  system: Info,
};

function NotificationRow({ notification, onOpen }) {
  const Icon = TYPE_ICON[notification.type] || Info;
  const unread = !notification.read;
  return (
    <button
      onClick={() => onOpen(notification)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
        padding: '14px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
        background: unread ? 'rgba(224,53,83,0.035)' : '#FFFFFF',
        fontFamily: PJS, transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = unread ? 'rgba(224,53,83,0.035)' : '#FFFFFF'; }}
    >
      {/* Neutral icon circle regardless of read state — colour was doing
          double duty as an unread signal; the tint + dot already cover that,
          so the icon itself stays calm and consistent. */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.6)',
      }}>
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {notification.title}
        </p>
        {notification.body && (
          <p style={{
            fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '0 0 3px', fontFamily: PJS,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {notification.body}
          </p>
        )}
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>
          {formatDistanceToNowStrict(parseBase44Date(notification.created_date), { addSuffix: true })}
        </p>
      </div>
      {unread && (
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E03553', flexShrink: 0, marginTop: 5 }} />
      )}
    </button>
  );
}

function NotificationDropdown({ userId, notifications, onClose, triggerRef }) {
  const navigate = useNavigate();
  const dialogRef = useModalFocusTrap(onClose);
  const markRead = useMarkNotificationRead(userId);
  const markAllRead = useMarkAllNotificationsRead(userId);
  const unreadIds = notifications.filter(n => !n.read).map(n => n.id);

  useEffect(() => {
    function handleClickOutside(e) {
      const dialog = dialogRef.current;
      const trigger = triggerRef.current;
      if (dialog && !dialog.contains(e.target) && trigger && !trigger.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = (notification) => {
    if (!notification.read) markRead.mutate(notification.id);
    onClose();
    if (notification.link) navigate(notification.link);
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
        width: 360, maxHeight: 440, display: 'flex', flexDirection: 'column',
        background: '#FFFFFF', borderRadius: 12,
        boxShadow: '0 8px 30px rgba(10,10,10,0.14)', overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px 12px', flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>Notifications</span>
        {unreadIds.length > 0 && (
          <button
            onClick={() => markAllRead.mutate(unreadIds)}
            disabled={markAllRead.isPending}
            style={{
              background: 'none', border: 'none', cursor: markAllRead.isPending ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 500, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: 0,
              display: 'flex', alignItems: 'center', gap: 4, opacity: markAllRead.isPending ? 0.5 : 1,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => { if (!markAllRead.isPending) { e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.textDecoration = 'underline'; } }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.6)'; e.currentTarget.style.textDecoration = 'none'; }}
          >
            {markAllRead.isPending && <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />}
            Mark all read
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <Bell size={20} style={{ color: 'rgba(10,10,10,0.3)', marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationRow key={n.id} notification={n} onOpen={handleOpen} />
          ))
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { data: notifications = [] } = useNotifications(userId);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={open}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.55)', padding: 6, borderRadius: 999,
          display: 'flex', alignItems: 'center', position: 'relative',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
      >
        <Bell size={16} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#E03553' }} />
        )}
      </button>

      {open && (
        <NotificationDropdown
          userId={userId}
          notifications={notifications}
          onClose={() => setOpen(false)}
          triggerRef={triggerRef}
        />
      )}
    </div>
  );
}
