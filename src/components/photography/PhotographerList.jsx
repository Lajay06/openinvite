import React from 'react';
import { Camera, Video, Edit, Trash2, Star, MapPin, Phone, Mail, Globe, Instagram, Calendar, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  researching: { background: 'rgba(10,10,10,0.06)', color: '#444444' },
  contacted: { background: 'rgba(58,122,150,0.12)', color: '#3a7a96' },
  meeting_scheduled: { background: 'rgba(128,61,129,0.12)', color: '#803D81' },
  quoted: { background: 'rgba(107,119,0,0.12)', color: '#6b7700' },
  booked: { background: 'rgba(107,119,0,0.15)', color: '#6b7700' },
  rejected: { background: 'rgba(224,53,83,0.12)', color: '#E03553' },
};

const STATUS_LABELS = {
  researching: 'Researching', contacted: 'Contacted',
  meeting_scheduled: 'Meeting scheduled', quoted: 'Quoted',
  booked: 'Booked', rejected: 'Rejected',
};

export default function PhotographerList({ photographers, onEdit, onDelete }) {
  if (photographers.length === 0) {
    return (
      <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Camera size={40} style={{ color: 'rgba(10,10,10,0.15)' }} />
        <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          No professionals added yet. Search or add one to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
      {photographers.map(photographer => {
        const statusStyle = STATUS_STYLES[photographer.status] || STATUS_STYLES.researching;
        const isBooked = photographer.status === 'booked';
        return (
          <div key={photographer.id}
            style={{
              border: isBooked ? '1px solid rgba(107,119,0,0.3)' : '1px solid rgba(10,10,10,0.08)',
              borderLeft: isBooked ? '3px solid rgba(107,119,0,0.5)' : undefined,
              background: '#FFFFFF',
              padding: '16px 18px',
            }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  {(photographer.type === 'photographer' || photographer.type === 'both') && <Camera size={14} style={{ color: '#E03553' }} />}
                  {(photographer.type === 'videographer' || photographer.type === 'both') && <Video size={14} style={{ color: '#803D81' }} />}
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{photographer.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, ...(STATUS_STYLES[photographer.status] || STATUS_STYLES.researching), fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {STATUS_LABELS[photographer.status] || photographer.status}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {photographer.type === 'both' ? 'Photo & video' : photographer.type}
                  </span>
                  {photographer.rating && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <Star size={11} style={{ color: '#6b7700', fill: '#6b7700' }} />{photographer.rating}
                    </span>
                  )}
                  {photographer.price_range && (
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{photographer.price_range}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => onEdit(photographer)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 6 }}>
                  <Edit size={14} />
                </button>
                <button onClick={() => onDelete(photographer.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', display: 'flex', padding: 6 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Image */}
            {photographer.image_url && (
              <div style={{ marginBottom: 12, overflow: 'hidden' }}>
                <img src={photographer.image_url} alt={photographer.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              </div>
            )}

            {/* Style Tags */}
            {photographer.style && photographer.style.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {photographer.style.map((s, idx) => (
                  <span key={idx} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, fontSize: 12 }}>
              {photographer.contact_person && (
                <span style={{ color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Contact: {photographer.contact_person}</span>
              )}
              {photographer.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <MapPin size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />{photographer.address}
                </span>
              )}
              {photographer.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Phone size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />
                  <a href={`tel:${photographer.phone}`} style={{ color: '#444444', textDecoration: 'none' }}>{photographer.phone}</a>
                </span>
              )}
              {photographer.email && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Mail size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />
                  <a href={`mailto:${photographer.email}`} style={{ color: '#444444', textDecoration: 'none' }}>{photographer.email}</a>
                </span>
              )}
              {photographer.instagram && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Instagram size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />
                  <span style={{ color: '#E03553' }}>{photographer.instagram}</span>
                </span>
              )}
            </div>

            {/* Booking details (booked) */}
            {isBooked && (
              <div style={{ background: 'rgba(107,119,0,0.06)', border: '1px solid rgba(107,119,0,0.2)', padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {photographer.booking_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Calendar size={11} />{format(new Date(photographer.booking_date), 'MMMM d, yyyy')}
                  </span>
                )}
                {photographer.start_time && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Clock size={11} />{photographer.start_time} – {photographer.end_time || 'TBD'}
                    {photographer.hours_booked && ` (${photographer.hours_booked}h)`}
                  </span>
                )}
                {photographer.quoted_price && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <DollarSign size={11} />${photographer.quoted_price.toLocaleString()}
                    {photographer.deposit_paid && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(107,119,0,0.12)', color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Deposit paid
                      </span>
                    )}
                  </span>
                )}
                {photographer.package_selected && (
                  <span style={{ fontSize: 12, color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Package: {photographer.package_selected}</span>
                )}
              </div>
            )}

            {/* Pricing (non-booked) */}
            {!isBooked && (photographer.starting_price || photographer.quoted_price) && (
              <div style={{ background: '#F5F5F5', padding: '10px 12px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {photographer.starting_price && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Starting from:</span>
                    <span style={{ fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${photographer.starting_price.toLocaleString()}</span>
                  </div>
                )}
                {photographer.quoted_price && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quoted:</span>
                    <span style={{ fontWeight: 700, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${photographer.quoted_price.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            {(photographer.second_shooter || photographer.backup_equipment || photographer.delivery_timeline || photographer.image_count) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10, fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {photographer.second_shooter && <span>✓ Second shooter included</span>}
                {photographer.backup_equipment && <span>✓ Backup equipment</span>}
                {photographer.delivery_timeline && <span>Delivery: {photographer.delivery_timeline}</span>}
                {photographer.image_count && <span>{photographer.image_count} edited images</span>}
              </div>
            )}

            {/* Links */}
            {(photographer.website || photographer.portfolio_url) && (
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(10,10,10,0.08)', flexWrap: 'wrap' }}>
                {photographer.website && (
                  <a href={photographer.website} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)', fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: 'none' }}>
                    <Globe size={11} />Website
                  </a>
                )}
                {photographer.portfolio_url && (
                  <a href={photographer.portfolio_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.18)', fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", textDecoration: 'none' }}>
                    <Camera size={11} />Portfolio
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
