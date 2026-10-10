import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, MailOpen, Search, Settings2, MailCheck, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { Row, RowGroup, FilterPills, EmptyState, ErrorState, SkeletonRows, StatusPill, SwipeRow, SWIPE_ICONS, SearchScreen, BottomSheet, PillButton, TextField, TextAreaField, SelectField } from '../../ui';
import { initials } from '../../lib/format';
import { relativeTime } from '../../notifications/feed';
import { openExternal } from '../../native';
import { toWaMe, toE164, needsCountryCode } from '@/lib/phoneE164';
import { COUNTRY_OPTIONS } from '../guests/guestFields';

const FILTERS = [{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'unreplied', label: 'To reply' }, { key: 'replied', label: 'Replied' }];

/** Conversation list: the four filters, search by guest or message, the count line, the couple's WhatsApp number. */
export default function MessagesScreen({ messages = [], onOpen, onMarkRead, whatsappPhone = '', onWhatsappPhone, country = 'AU', loading, error, onRetry, back, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [settings, setSettings] = useState(false);
  const visible = messages.filter((m) => filter === 'all' || (filter === 'unread' && !m.read) || (filter === 'unreplied' && !m.replied) || (filter === 'replied' && m.replied));
  const unread = messages.filter((m) => !m.read).length;
  const replied = messages.filter((m) => m.replied).length;
  const results = useMemo(() => { const s = q.trim().toLowerCase(); return s ? messages.filter((m) => (m.guest_name || '').toLowerCase().includes(s) || (m.message || '').toLowerCase().includes(s)) : []; }, [messages, q]);
  const row = (m, onTap) => (
    <Row key={m.id} initials={initials(m.guest_name)} onClick={onTap} tile={m.read ? 'default' : 'primary'} trailing={m.replied ? <StatusPill tone="ok">Replied</StatusPill> : !m.read ? <span className="oi-m-notif__unread" /> : null}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span className="oi-m-row__label" style={{ fontWeight: m.read ? 400 : 600 }}>{m.guest_name || 'Guest'}</span>
        <span className="oi-m-meta" style={{ flexShrink: 0 }}>{relativeTime(new Date(m.created_date).getTime())}</span>
      </div>
      <div className="oi-m-row__sub">{m.message}</div>
    </Row>
  );
  return (
    <>
    <Screen title="Messages" subtitle={loading ? '' : `${messages.length} message${messages.length === 1 ? '' : 's'}, ${unread} unread, ${replied} replied, ${messages.length - replied} to reply`} back={back} onRefresh={onRefresh} actions={[{ icon: Search, label: 'Search messages', onClick: () => setSearchOpen(true) }, { icon: Settings2, label: 'WhatsApp number', onClick: () => setSettings(true) }]}>
      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
      <div className="oi-m-stack" style={{ marginTop: 12 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : messages.length === 0 ? (
          <EmptyState icon={MessageCircle} text="No messages yet. When a guest writes to you from your guest suite, it lands here." />
        ) : visible.length === 0 ? (
          <EmptyState icon={MailOpen} text="Nothing here for this filter." />
        ) : (
          <RowGroup>
            {visible.map((m) => (
              <SwipeRow key={m.id} actions={onMarkRead ? [{ key: 'read', icon: SWIPE_ICONS.read, label: m.read ? 'Mark unread' : 'Mark read', tone: 'primary', onAction: () => onMarkRead(m) }] : []}>
                {row(m, () => onOpen(m))}
              </SwipeRow>
            ))}
          </RowGroup>
        )}
      </div>
    </Screen>
    <SearchScreen open={searchOpen} onClose={() => { setSearchOpen(false); setQ(''); }} value={q} onChange={setQ} placeholder="Search by guest name or message">
      {q.trim() === '' ? <p className="oi-m-meta" style={{ padding: 16 }}>Start typing to search your messages.</p> : results.length === 0 ? <p className="oi-m-meta" style={{ padding: 16 }}>No messages match that.</p> : <div className="oi-m-stack"><RowGroup>{results.map((m) => row(m, () => { setSearchOpen(false); setQ(''); onOpen(m); }))}</RowGroup></div>}
    </SearchScreen>
    <WhatsAppNumberSheet open={settings} onClose={() => setSettings(false)} phone={whatsappPhone} country={country} onSave={onWhatsappPhone} />
    </>
  );
}

/** WhatsAppConnect.jsx: the couple's own number, kept on the device, so guests can message it. */
function WhatsAppNumberSheet({ open, onClose, phone, country, onSave }) {
  const [v, setV] = useState(phone || '');
  const [iso, setIso] = useState(country);
  useEffect(() => { if (open) { setV(phone || ''); setIso(country); } }, [open, phone, country]);
  const bad = v.trim() && needsCountryCode(v, iso);
  const save = () => { const e164 = v.trim() ? toE164(v, iso) : ''; if (v.trim() && !e164) return; onSave(e164 || ''); onClose(); toast.success(e164 ? 'WhatsApp number saved' : 'WhatsApp number removed'); };
  return (
    <BottomSheet open={open} onClose={onClose} title="Your WhatsApp number" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={!!bad} style={{ flex: 1 }}>Save</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="oi-m-meta">Shown to guests on your guest suite so they can message you. Kept on this device, as the website keeps it in the browser.</p>
        <SelectField label="Country" value={iso} onChange={(e) => setIso(e.target.value)} options={COUNTRY_OPTIONS} />
        <TextField label="Number" type="tel" inputMode="tel" value={v} onChange={(e) => setV(e.target.value)} placeholder="+61 4..." error={bad ? 'That does not look like a phone number. Include the country code.' : ''} />
        {phone && toWaMe(phone) && <p className="oi-m-meta">Guests reach you at wa.me/{toWaMe(phone)}</p>}
      </div>
    </BottomSheet>
  );
}

/** WhatsAppCompose.jsx: a template with the wedding's details filled in, then wa.me opens in WhatsApp. */
const TEMPLATES = [
  { id: 'rsvp', name: 'RSVP reminder', template: "Hi {guest_name}! We'd love to know if you can make it to our wedding on {wedding_date}. Please RSVP: {rsvp_link}" },
  { id: 'save_date', name: 'Save the date', template: "Hi {guest_name}! We're getting married. Save the date: {wedding_date} at {venue}. Formal invitation coming soon." },
  { id: 'details', name: 'Event details', template: 'Hi {guest_name}! Here are the details for our wedding.\nDate: {wedding_date}\nCeremony: {ceremony_time} at {ceremony_venue}\nReception: {reception_time} at {reception_venue}' },
  { id: 'thank_you', name: 'Thank you', template: 'Hi {guest_name}! Thank you so much for celebrating with us. It meant the world to have you there. With love, {couple_names}' },
  { id: 'custom', name: 'Custom message', template: '' },
];
const RSVP_PLACEHOLDER = '{rsvp_link}';

export function WhatsAppComposeSheet({ open, onClose, guest, phone: initialPhone, variables = {}, country = 'AU', linkState = 'loading', onSent }) {
  const [template, setTemplate] = useState('custom');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(initialPhone || '');
  const [iso, setIso] = useState(country);
  useEffect(() => { if (open) { setTemplate('custom'); setMessage(''); setPhone(initialPhone || ''); setIso(country); } }, [open, initialPhone, country]);
  const render = (tpl) => {
    let out = tpl;
    Object.entries(variables).forEach(([k, val]) => { if (k === 'rsvp_link' && !val) return; out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), val || ''); });
    if (guest?.name) out = out.replace(/{guest_name}/g, guest.name);
    return out;
  };
  useEffect(() => { if (template !== 'custom') { const t = TEMPLATES.find((x) => x.id === template); if (t) setMessage(render(t.template)); } }, [template, variables]); // eslint-disable-line react-hooks/exhaustive-deps
  const linkMissing = message.includes(RSVP_PLACEHOLDER);
  const badPhone = phone.trim() && !toWaMe(phone, iso);
  const send = () => {
    if (!message.trim() || !phone.trim() || linkMissing || badPhone) return;
    openExternal(`https://wa.me/${toWaMe(phone, iso)}?text=${encodeURIComponent(message)}`);
    onSent?.();
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={guest?.name ? `WhatsApp ${guest.name.split(' ')[0]}` : 'WhatsApp'} full footer={(
      <>
        <PillButton variant="secondary" onClick={onClose}>Cancel</PillButton>
        <PillButton variant="primary" icon={MessageCircle} onClick={send} disabled={!message.trim() || !phone.trim() || linkMissing || !!badPhone} style={{ flex: 1 }}>Open in WhatsApp</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SelectField label="Template" value={template} onChange={(e) => setTemplate(e.target.value)} options={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} />
        <SelectField label="Country" value={iso} onChange={(e) => setIso(e.target.value)} options={COUNTRY_OPTIONS} />
        <TextField label="Phone number" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="The guest's mobile" error={badPhone ? 'That does not look like a phone number.' : ''} />
        <TextAreaField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Type your message" />
        {linkMissing && <p className="oi-m-field__error" role="alert">{linkState === 'loading' ? 'Getting this guest\'s RSVP link.' : 'This guest has no RSVP link yet, so the reminder cannot be sent. Add them to the guest list first.'}</p>}
        <p className="oi-m-meta">This opens WhatsApp with the message ready to send from your own account. Nothing is sent from here.</p>
      </div>
    </BottomSheet>
  );
}

/** One thread: the guest's message, the reply if any, and a composer pinned above the keyboard. */
export function ThreadScreen({ message, onReply, sending, back, onToggleRead, onWhatsApp }) {
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
    <Screen title={message.guest_name || 'Guest'} subtitle={message.guest_email || ''} back={back} footer={composer} actions={[...(onToggleRead ? [{ icon: message.read ? Mail : MailCheck, label: message.read ? 'Mark as unread' : 'Mark as read', onClick: onToggleRead }] : []), ...(onWhatsApp ? [{ icon: MessageCircle, label: 'Open in WhatsApp', onClick: onWhatsApp }] : [])]}>
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
