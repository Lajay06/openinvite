import React, { useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getMyInvitation } from '@/lib/resolveMyWedding';

const WHATSAPP_GREEN = "#25D366";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const TEMPLATES = [
  { id: "rsvp", name: "RSVP reminder", template: "Hi {guest_name}! 👋 We'd love to know if you can make it to our wedding on {wedding_date}. Please RSVP: {rsvp_link} 💍" },
  { id: "save_date", name: "Save the date", template: "Hi {guest_name}! We're getting married! 🎉 Save the date: {wedding_date} at {venue}. Formal invitation coming soon!" },
  { id: "details", name: "Event details", template: "Hi {guest_name}! Here are the details for our wedding 💍\nDate: {wedding_date}\nCeremony: {ceremony_time} at {ceremony_venue}\nReception: {reception_time} at {reception_venue}" },
  { id: "thank_you", name: "Thank you", template: "Hi {guest_name}! Thank you so much for celebrating with us 🙏 It meant the world to have you there. With love, {couple_names}" },
  { id: "custom", name: "Custom message", template: "" },
];

export default function WhatsAppCompose({ guest, onClose, onSent }) {
  const [template, setTemplate] = useState("custom");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(guest?.phone || "");
  const [loading, setLoading] = useState(false);
  const [variables, setVariables] = useState({});

  React.useEffect(() => { loadVariables(); }, []);

  React.useEffect(() => {
    if (template !== "custom") {
      const selected = TEMPLATES.find(t => t.id === template);
      if (selected) setMessage(renderTemplate(selected.template));
    }
  }, [template, variables]);

  const loadVariables = async () => {
    try {
      // Each guest gets their own personal /rsvp/:token link (same mechanism
      // as SendInvitesModal) — generate and persist one if this guest doesn't
      // have one yet, rather than pointing at the retired /GuestRSVP page.
      let token = guest?.rsvp_link_id;
      if (guest?.id && !token) {
        token = crypto.randomUUID();
        base44.entities.Guest.update(guest.id, { rsvp_link_id: token }).catch(() => {});
      }

      const inv = await getMyInvitation();
      if (inv) {
        setVariables({
          couple_names: inv.couple_names || "", wedding_date: inv.wedding_date || "",
          rsvp_link: token ? `${window.location.origin}/rsvp/${token}` : '', venue: "venue TBD",
          ceremony_time: "TBD", ceremony_venue: "TBD",
          reception_time: "TBD", reception_venue: "TBD",
        });
      }
    } catch (e) { console.error("Error loading variables:", e); }
  };

  const renderTemplate = (tpl) => {
    let rendered = tpl;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    });
    if (guest?.name) rendered = rendered.replace(/{guest_name}/g, guest.name);
    return rendered;
  };

  const handleSend = async () => {
    if (!message.trim() || !phone.trim()) return;
    setLoading(true);
    const cleaned = phone.replace(/\D/g, "");
    const formatted = !cleaned.startsWith("61") && !cleaned.startsWith("1") ? "61" + cleaned : cleaned;
    const link = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    if (guest?.id && onSent) onSent();
    window.open(link, "_blank");
    setLoading(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 480, background: '#FFFFFF', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', zIndex: 9200, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Send WhatsApp message</span>
          <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{guest?.name || 'Guest'}</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+61412345678"
            style={{ ...inputStyle, fontFamily: 'monospace, monospace' }}
          />
          <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Include country code (e.g., +61 for Australia)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Template</label>
          <select
            value={template}
            onChange={e => setTemplate(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0', minHeight: 120, resize: 'vertical' }}
          />
          <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{message.length} characters</span>
        </div>

        <div style={{ background: '#F5F5F5', padding: '10px 12px', fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Opens WhatsApp on your device or browser
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} className="btn-editorial-secondary" style={{ flex: 1, fontSize: 13 }}>Cancel</button>
        <button onClick={handleSend} disabled={loading || !message.trim() || !phone.trim()}
          style={{ flex: 1, padding: '9px 16px', background: WHATSAPP_GREEN, color: '#FFFFFF', border: 'none', borderRadius: 999, cursor: loading || !message.trim() || !phone.trim() ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading || !message.trim() || !phone.trim() ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          Send via WhatsApp
        </button>
      </div>
    </div>
  );
}
