import React, { useState, useEffect, useRef } from 'react';
import { GuestMessage } from '@/entities/GuestMessage';
import { Guest } from '@/entities/Guest';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Reply, Search, CheckCheck, Send, Heart, Mail, User, EyeOff, Eye, MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import WhatsAppConnect from "../components/messages/WhatsAppConnect";
import WhatsAppCompose from "../components/messages/WhatsAppCompose";
import WhatsAppQRCode from "../components/messages/WhatsAppQRCode";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'unreplied', label: 'Unreplied' },
  { key: 'replied', label: 'Replied' },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [composingGuest, setComposingGuest] = useState(null);

  useEffect(() => {
    loadMessages();
    loadWhatsAppSettings();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await GuestMessage.list('-created_date');
      setMessages(data);
      const unread = data.filter(msg => !msg.read);
      for (const msg of unread) {
        await GuestMessage.update(msg.id, { ...msg, read: true });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    setLoading(false);
  };

  const loadWhatsAppSettings = () => {
    const stored = localStorage.getItem('whatsapp_connected');
    const phone = localStorage.getItem('whatsapp_phone');
    if (stored === 'true' && phone) {
      setWhatsappConnected(true);
      setWhatsappPhone(phone);
    }
  };

  const handleWhatsAppConnect = (phone) => {
    if (phone) {
      setWhatsappConnected(true);
      setWhatsappPhone(phone);
      localStorage.setItem('whatsapp_connected', 'true');
      localStorage.setItem('whatsapp_phone', phone);
    } else {
      setWhatsappConnected(false);
      setWhatsappPhone('');
      localStorage.removeItem('whatsapp_connected');
      localStorage.removeItem('whatsapp_phone');
    }
  };

  const handleReply = async (messageId) => {
    if (!replyText.trim()) return;
    try {
      const message = messages.find(msg => msg.id === messageId);
      await GuestMessage.update(messageId, { ...message, reply: replyText, replied: true });
      setReplyingTo(null);
      setReplyText('');
      loadMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const toggleRead = async (messageId) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      await GuestMessage.update(messageId, { ...message, read: !message.read });
      loadMessages();
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.message.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'unread') return matchesSearch && !message.read;
    if (filterStatus === 'replied') return matchesSearch && message.replied;
    if (filterStatus === 'unreplied') return matchesSearch && !message.replied;
    return matchesSearch;
  });

  const stats = {
    total: messages.length,
    unread: messages.filter(msg => !msg.read).length,
    replied: messages.filter(msg => msg.replied).length,
    unreplied: messages.filter(msg => !msg.replied).length,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
        <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Messages" subtitle="Read and reply to messages from your guests" />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total', value: stats.total },
          { label: 'Unread', value: stats.unread },
          { label: 'Replied', value: stats.replied },
          { label: 'Unreplied', value: stats.unreplied },
        ].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0 0' }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* WhatsApp banner */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <WhatsAppConnect
          isConnected={whatsappConnected}
          connectedPhone={whatsappPhone}
          onConnect={handleWhatsAppConnect}
        />
      </div>

      {/* Search + filter pills toolbar */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)' }} />
          <input
            style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '8px 0 8px 22px', boxSizing: 'border-box' }}
            placeholder="Search by guest name or message…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)}
              style={{ padding: '5px 14px', borderRadius: 999, border: `1.5px solid ${filterStatus === f.key ? '#0A0A0A' : 'rgba(10,10,10,0.12)'}`, background: filterStatus === f.key ? '#0A0A0A' : 'transparent', color: filterStatus === f.key ? '#FFFFFF' : '#444444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages list */}
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filteredMessages.length > 0 ? filteredMessages.map((message) => (
          <div key={message.id}
            style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', padding: '20px 0', background: !message.read ? 'rgba(224,53,83,0.02)' : 'transparent' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: 'rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {message.guest_name}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 999, background: message.read ? 'rgba(10,10,10,0.06)' : 'rgba(224,53,83,0.1)', color: message.read ? '#444444' : '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {message.read ? 'Read' : 'New'}
                    </span>
                    {message.replied && (
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 999, background: 'rgba(107,119,0,0.1)', color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCheck size={10} />Replied
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {message.guest_email && (
                      <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} />{message.guest_email}
                      </span>
                    )}
                    <span style={{ ...labelStyle, color: '#444444' }}>
                      {format(new Date(message.created_date), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <button onClick={() => toggleRead(message.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', display: 'flex', padding: 6 }}
                  title={message.read ? 'Mark unread' : 'Mark read'}
                  onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
                  {message.read ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                {whatsappConnected && message.guest_phone && (
                  <button onClick={() => setComposingGuest(message)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', display: 'flex', padding: 6 }}
                    title="Send WhatsApp message"
                    onMouseEnter={e => e.currentTarget.style.color = '#25D366'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
                    <MessageSquare size={14} />
                  </button>
                )}
                <button onClick={() => { setReplyingTo(replyingTo === message.id ? null : message.id); setReplyText(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: replyingTo === message.id ? '#E03553' : 'rgba(10,10,10,0.35)', display: 'flex', padding: 6 }}
                  title="Reply"
                  onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
                  onMouseLeave={e => e.currentTarget.style.color = replyingTo === message.id ? '#E03553' : 'rgba(10,10,10,0.35)'}>
                  <Reply size={14} />
                </button>
              </div>
            </div>

            {/* Message body */}
            <div style={{ background: '#F5F5F5', padding: '12px 14px', marginBottom: 10, marginLeft: 42 }}>
              <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.6 }}>
                {message.message}
              </p>
            </div>

            {/* Existing reply */}
            {message.replied && message.reply && (
              <div style={{ borderLeft: '2px solid #E03553', paddingLeft: 14, marginBottom: 10, marginLeft: 42 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Heart size={11} style={{ color: '#E03553' }} />
                  <span style={{ ...labelStyle, color: '#E03553' }}>Your reply</span>
                </div>
                <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.6 }}>
                  {message.reply}
                </p>
              </div>
            )}

            {/* Reply form */}
            {replyingTo === message.id && (
              <div style={{ marginLeft: 42, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Textarea
                  placeholder="Type your reply…"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  style={{ minHeight: 80 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                    className="btn-editorial-secondary" style={{ fontSize: 12 }}>Cancel</button>
                  <button onClick={() => handleReply(message.id)} disabled={!replyText.trim()}
                    className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: !replyText.trim() ? 0.5 : 1 }}>
                    <Send size={12} />Send reply
                  </button>
                </div>
              </div>
            )}
          </div>
        )) : (
          <div style={{ padding: '64px 0', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)' }}>
            <MessageCircle size={36} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>
              {searchTerm || filterStatus !== 'all' ? 'No messages found' : 'No messages yet'}
            </p>
            <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Guest messages will appear here once guests start reaching out through the guest portal.'}
            </p>
          </div>
        )}
      </div>

      {/* WhatsApp QR section */}
      {whatsappConnected && (
        <div style={{ padding: '24px 32px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', justifyContent: 'center' }}>
          <WhatsAppQRCode phoneNumber={whatsappPhone} />
        </div>
      )}

      {/* WhatsApp Compose panel */}
      {composingGuest && (
        <WhatsAppCompose
          guest={{ id: composingGuest.guest_id, name: composingGuest.guest_name, phone: composingGuest.guest_phone }}
          onClose={() => setComposingGuest(null)}
          onSent={() => loadMessages()}
        />
      )}
    </div>
  );
}
