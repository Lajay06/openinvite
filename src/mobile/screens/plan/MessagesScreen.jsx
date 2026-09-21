import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, MailOpen } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, FilterPills, EmptyState, ErrorState, SkeletonRows, StatusPill, SwipeRow, SWIPE_ICONS } from '../../ui';
import { initials } from '../../lib/format';
import { relativeTime } from '../../notifications/feed';

const FILTERS = [{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'unreplied', label: 'To reply' }, { key: 'replied', label: 'Replied' }];

/** Conversation list. One row per guest message; unread rows are bold. */
export default function MessagesScreen({ messages = [], onOpen, onMarkRead, loading, error, onRetry, back, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const visible = messages.filter((m) => filter === 'all' || (filter === 'unread' && !m.read) || (filter === 'unreplied' && !m.replied) || (filter === 'replied' && m.replied));
  const unread = messages.filter((m) => !m.read).length;
  return (
    <Screen title="Messages" subtitle={loading ? '' : unread ? `${unread} unread` : `${messages.length} message${messages.length === 1 ? '' : 's'}`} back={back} onRefresh={onRefresh}>
      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
      <div className="oi-m-stack" style={{ marginTop: 12 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : messages.length === 0 ? (
          <EmptyState icon={MessageCircle} text="No messages yet. When a guest writes to you from your site, it lands here." />
        ) : visible.length === 0 ? (
          <EmptyState icon={MailOpen} text="Nothing here for this filter." />
        ) : (
          <RowGroup>
            {visible.map((m) => (
              <SwipeRow key={m.id} actions={onMarkRead ? [{ key: 'read', icon: SWIPE_ICONS.read, label: m.read ? 'Mark unread' : 'Mark read', tone: 'primary', onAction: () => onMarkRead(m) }] : []}>
                <Row initials={initials(m.guest_name)} onClick={() => onOpen(m)} tile={m.read ? 'default' : 'primary'} trailing={m.replied ? <StatusPill tone="ok">Replied</StatusPill> : !m.read ? <span className="oi-m-notif__unread" /> : null}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span className="oi-m-row__label" style={{ fontWeight: m.read ? 400 : 600 }}>{m.guest_name || 'Guest'}</span>
                    <span className="oi-m-meta" style={{ flexShrink: 0 }}>{relativeTime(new Date(m.created_date).getTime())}</span>
                  </div>
                  <div className="oi-m-row__sub">{m.message}</div>
                </Row>
              </SwipeRow>
            ))}
          </RowGroup>
        )}
      </div>
    </Screen>
  );
}

/** One thread: the guest's message, the reply if any, and a composer pinned above the keyboard. */
export function ThreadScreen({ message, onReply, sending, back }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: 'end' }); }, [message]);
  if (!message) {
    return <Screen title="Message" back={back}><div className="oi-m-stack"><p className="oi-m-meta">This message could not be found.</p></div></Screen>;
  }
  const submit = async () => {
    if (!text.trim() || sending) return;
    await onReply(text.trim());
    setText('');
  };
  const composer = (
    <div className="oi-m-composer">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={message.replied ? 'Send another reply' : 'Write a reply'} rows={1} enterKeyHint="send" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
      <button type="button" className="oi-m-iconbtn" onClick={submit} aria-label="Send" disabled={!text.trim() || sending} style={{ background: text.trim() ? 'var(--m-primary)' : 'var(--m-card)', color: text.trim() ? '#FFFFFF' : 'var(--m-text-2)' }}>
        <Send size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
  return (
    <Screen title={message.guest_name || 'Guest'} subtitle={message.guest_email || ''} back={back} footer={composer}>
      <div className="oi-m-thread">
        <div className="oi-m-bubble oi-m-bubble--in">
          {message.message}
          <div className="oi-m-bubble__meta">{relativeTime(new Date(message.created_date).getTime())}{message.channel ? ` · ${message.channel}` : ''}</div>
        </div>
        {message.reply && (
          <div className="oi-m-bubble oi-m-bubble--out">
            {message.reply}
            <div className="oi-m-bubble__meta">{message.reply_sent_at ? relativeTime(new Date(message.reply_sent_at).getTime()) : 'Sent'}</div>
          </div>
        )}
        <div ref={ref} />
      </div>
    </Screen>
  );
}
