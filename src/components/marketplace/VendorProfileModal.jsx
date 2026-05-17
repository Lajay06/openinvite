import React, { useState } from 'react';
import { X, MapPin, Globe, Phone, Mail, Star, Check, ExternalLink, Bookmark, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = ['About', 'Services & pricing', 'Reviews', 'Gallery', 'Contact'];

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
  outline: 'none', padding: '6px 0', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, display: 'block', marginBottom: 6,
};

function StarRow({ rating, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size}
          style={{ color: n <= Math.round(rating) ? '#F59E0B' : 'rgba(10,10,10,0.15)',
            fill: n <= Math.round(rating) ? '#F59E0B' : 'transparent' }} />
      ))}
    </span>
  );
}

function AboutTab({ vendor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, lineHeight: 1.7 }}>{vendor.description}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {vendor.yearsInBusiness && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 4 }}>Years in business</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>{vendor.yearsInBusiness} years</div>
          </div>
        )}
        {vendor.languages?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 4 }}>Languages</div>
            <div style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS }}>{vendor.languages.join(', ')}</div>
          </div>
        )}
      </div>
      {vendor.serviceArea?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8 }}>Service area</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {vendor.serviceArea.map(area => (
              <span key={area} style={{ fontSize: 12, color: '#0A0A0A', background: 'rgba(10,10,10,0.06)', padding: '4px 10px', borderRadius: 999, fontFamily: PJS }}>{area}</span>
            ))}
          </div>
        </div>
      )}
      {vendor.certifications?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8 }}>Awards & certifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {vendor.certifications.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={12} style={{ color: '#10B981', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesTab({ vendor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {vendor.packages?.map((pkg, i) => (
        <div key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{pkg.name}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>{pkg.price}</div>
          </div>
          {pkg.includes?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pkg.includes.map((item, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={12} style={{ color: '#10B981', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', fontFamily: PJS }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {vendor.depositTerms && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6 }}>Deposit & payment terms</div>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, lineHeight: 1.6 }}>{vendor.depositTerms}</p>
        </div>
      )}
      {vendor.cancellationPolicy && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6 }}>Cancellation policy</div>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, lineHeight: 1.6 }}>{vendor.cancellationPolicy}</p>
        </div>
      )}
    </div>
  );
}

function ReviewsTab({ vendor }) {
  const reviews = vendor.reviews || [];
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : vendor.rating;
  const breakdown = [5,4,3,2,1].map(n => ({ star: n, count: reviews.filter(r => r.rating === n).length }));
  const maxCount = Math.max(...breakdown.map(b => b.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.03em', lineHeight: 1 }}>{avg}</div>
          <StarRow rating={parseFloat(avg)} size={16} />
          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginTop: 4 }}>{reviews.length || vendor.reviewCount} reviews</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {breakdown.map(b => (
            <div key={b.star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, width: 12, textAlign: 'right' }}>{b.star}</span>
              <Star size={10} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 6, background: 'rgba(10,10,10,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(b.count / maxCount) * 100}%`, background: '#F59E0B', borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, width: 16 }}>{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual reviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{r.date}</div>
              </div>
              <StarRow rating={r.rating} size={11} />
            </div>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, lineHeight: 1.6 }}>{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryTab() {
  const GRAD = [
    'linear-gradient(135deg, #fce7f3, #fbcfe8)',
    'linear-gradient(135deg, #ede9fe, #ddd6fe)',
    'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    'linear-gradient(135deg, #fef9c3, #fde68a)',
    'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    'linear-gradient(135deg, #ffe4e6, #fecdd3)',
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {GRAD.map((g, i) => (
        <div key={i} style={{ height: 160, background: g, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>Photo {i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function ContactTab({ vendor, onSave, isSaved }) {
  const [form, setForm] = useState({ name: '', email: '', date: localStorage.getItem('oi_wedding_date') || '', message: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Direct links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {vendor.website && (
          <a href={vendor.website} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = '#0A0A0A'}>
            <Globe size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            {vendor.website}
            <ExternalLink size={11} style={{ color: 'rgba(10,10,10,0.3)' }} />
          </a>
        )}
        {vendor.phone && (
          <a href={`tel:${vendor.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = '#0A0A0A'}>
            <Phone size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            {vendor.phone}
          </a>
        )}
        {vendor.email && (
          <a href={`mailto:${vendor.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = '#0A0A0A'}>
            <Mail size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />
            {vendor.email}
          </a>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Send an enquiry</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Your name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" style={inputStyle}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" style={inputStyle}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Wedding date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inputStyle}
            onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
        </div>
        <div>
          <label style={labelStyle}>Message</label>
          <textarea value={form.message} onChange={e => set('message', e.target.value)}
            placeholder="Tell them about your wedding and what you need…"
            rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            onFocus={e => e.target.style.borderBottomColor = '#E03553'} onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ flex: 2, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: 'none', background: '#E03553', color: '#FFFFFF' }}
            onClick={() => toast.success('Enquiry sent!')}
          >
            Send enquiry
          </button>
          <button
            onClick={() => onSave(vendor)}
            disabled={isSaved}
            style={{ flex: 1, padding: '10px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: isSaved ? 'default' : 'pointer', border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', color: isSaved ? '#10B981' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            <Bookmark size={12} style={{ fill: isSaved ? '#10B981' : 'transparent', color: isSaved ? '#10B981' : '#0A0A0A' }} />
            {isSaved ? 'Saved' : 'Save to my vendors'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorProfileModal({ vendor, onClose, onGetQuote, onSave, isSaved }) {
  const [tab, setTab] = useState('About');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24, overflowY: 'auto' }}>
      <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', fontFamily: PJS }}>
        {/* Cover gradient */}
        <div style={{ height: 100, background: 'linear-gradient(135deg, rgba(224,53,83,0.15), rgba(147,51,234,0.12))', position: 'relative' }}>
          <button onClick={onClose}
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
            <X size={16} />
          </button>
        </div>

        {/* Vendor identity */}
        <div style={{ padding: '20px 28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>{vendor.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#E03553', background: 'rgba(224,53,83,0.1)', padding: '2px 9px', borderRadius: 999 }}>{vendor.category}</span>
                {vendor.online && <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 9px', borderRadius: 999 }}>Online</span>}
                {vendor.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(10,10,10,0.5)' }}>
                    <MapPin size={11} />
                    {vendor.location}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <StarRow rating={vendor.rating} size={13} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{vendor.rating}</span>
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)' }}>({vendor.reviewCount} reviews)</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginLeft: 4 }}>{vendor.priceRange}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <button onClick={() => onGetQuote(vendor)}
                style={{ padding: '9px 18px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: 'none', background: '#E03553', color: '#FFFFFF' }}>
                Get quote
              </button>
              <button onClick={() => onSave(vendor)} disabled={isSaved}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, fontFamily: PJS, cursor: isSaved ? 'default' : 'pointer', border: 'none', background: 'none', color: isSaved ? '#10B981' : 'rgba(10,10,10,0.4)', padding: 0 }}>
                <Bookmark size={12} style={{ fill: isSaved ? '#10B981' : 'transparent' }} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '10px 16px', fontSize: 13, fontWeight: tab === t ? 700 : 500, fontFamily: PJS, cursor: 'pointer', border: 'none', background: 'none', color: tab === t ? '#0A0A0A' : 'rgba(10,10,10,0.45)', borderBottom: tab === t ? '2px solid #0A0A0A' : '2px solid transparent', marginBottom: -1 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 28px 32px' }}>
          {tab === 'About' && <AboutTab vendor={vendor} />}
          {tab === 'Services & pricing' && <ServicesTab vendor={vendor} />}
          {tab === 'Reviews' && <ReviewsTab vendor={vendor} />}
          {tab === 'Gallery' && <GalleryTab />}
          {tab === 'Contact' && <ContactTab vendor={vendor} onSave={onSave} isSaved={isSaved} />}
        </div>
      </div>
    </div>
  );
}
