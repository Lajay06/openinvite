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
        display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
        padding: '10px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
        background: unread ? 'rgba(224,53,83,0.05)' : 'transparent',
        borderBottom: '1px solid rgba(10,10,10,0.06)', fontFamily: PJS,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = unread ? 'rgba(224,53,83,0.09)' : 'rgba(10,10,10,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = unread ? 'rgba(224,53,83,0.05)' : 'transparent'; }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: unread ? 'rgba(224,53,83,0.12)' : 'rgba(10,10,10,0.06)',
        color: unread ? '#E03553' : 'rgba(10,10,10,0.5)',
      }}>
        <Icon size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>
          {notification.title}
        </p>
        {notification.body && (
          <p style={{
            fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '0 0 4px', fontFamily: PJS,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {notification.body}
          </p>
        )}
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>
          {formatDistanceToNowStrict(parseBase44Date(notification.created_date), { addSuffix: true })}
        </p>
      </div>
      {unread && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E03553', flexShrink: 0, marginTop: 6 }} />
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
        width: 340, maxHeight: 420, display: 'flex', flexDirection: 'column',
        background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)', overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Notifications</span>
        {unreadIds.length > 0 && (
          <button
            onClick={() => markAllRead.mutate(unreadIds)}
            disabled={markAllRead.isPending}
            style={{
              background: 'none', border: 'none', cursor: markAllRead.isPending ? 'not-allowed' : 'pointer',
              fontSize: 11, fontWeight: 600, color: '#E03553', fontFamily: PJS, padding: 0,
              display: 'flex', alignItems: 'center', gap: 4, opacity: markAllRead.isPending ? 0.5 : 1,
            }}
          >
            {markAllRead.isPending && <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />}
            Mark all read
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Bell size={20} style={{ color: 'rgba(10,10,10,0.2)', marginBottom: 8 }} />
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
