import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6, display: 'block' };
const inputStyle = { width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0', boxSizing: 'border-box' };

export default function QuoteRequestModal({ vendor, onClose }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', date: '', guests: '', budget: '', message: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    toast.success(`Quote request sent to ${vendor.name}!`);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', borderRadius: 0, fontFamily: PJS }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>Request a quote</div>
            <div style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', marginTop: 3 }}>from {vendor.name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 2, marginTop: 2 }}
            onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Your name</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" style={inputStyle}
                onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" style={inputStyle}
                onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Wedding date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle}
                onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
            </div>
            <div>
              <label style={labelStyle}>Guest count</label>
              <input type="number" value={form.guests} onChange={e => set('guests', e.target.value)} placeholder="e.g. 120" style={inputStyle}
                onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Budget range</label>
            <input value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="e.g. $2,000–$4,000" style={inputStyle}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
          </div>

          <div>
            <label style={labelStyle}>Message</label>
            <textarea required value={form.message} onChange={e => set('message', e.target.value)}
              placeholder="Tell them about your wedding and what you're looking for…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '11px 0', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', color: '#0A0A0A' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '11px 0', borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: PJS, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: '#E03553', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Loader2 size={14} className="animate-spin" />Sending…</> : 'Send quote request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
