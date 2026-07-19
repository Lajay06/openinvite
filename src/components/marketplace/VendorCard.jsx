import React from 'react';
import { MapPin, Star, Heart, Camera, Video, UtensilsCrossed, Flower, Palette, Scissors, Music2, Sparkles, Building2, Car, FileText, Cake, Award, MoreHorizontal, Bookmark } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORY_CONFIG = {
  'Photography':   { icon: Camera,         color: '#E03553', bg: 'rgba(224,53,83,0.1)' },
  'Videography':   { icon: Video,           color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  'Catering':      { icon: UtensilsCrossed, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'Florals':       { icon: Flower,          color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  'Styling':       { icon: Palette,         color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
  'Hair & makeup': { icon: Scissors,        color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  'Music & DJ':    { icon: Music2,          color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  'Entertainment': { icon: Sparkles,        color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  'Venues':        { icon: Building2,       color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  'Transport':     { icon: Car,             color: '#14B8A6', bg: 'rgba(20,184,166,0.1)' },
  'Celebrant':     { icon: Heart,           color: '#EC4899', bg: 'rgba(236,72,153,0.1)' },
  'Stationery':    { icon: FileText,        color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  'Cake':          { icon: Cake,            color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'Jewellery':     { icon: Award,           color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  'Other':         { icon: MoreHorizontal,  color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
};

function StarRow({ rating }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={11}
          style={{ color: n <= Math.round(rating) ? '#F59E0B' : 'rgba(10,10,10,0.15)',
            fill: n <= Math.round(rating) ? '#F59E0B' : 'transparent' }} />
      ))}
    </span>
  );
}

function VendorThumbnail({ vendor, cfg }) {
  const Icon = cfg.icon;
  const [failed, setFailed] = React.useState(false);
  if (vendor.photoReference && !failed) {
    return (
      <img
        src={`/api/places-photo?ref=${encodeURIComponent(vendor.photoReference)}&maxwidth=120`}
        alt={vendor.name}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0, marginTop: 2 }}
      />
    );
  }
  return (
    <div style={{ width: 56, height: 56, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
      <Icon size={20} style={{ color: cfg.color }} />
    </div>
  );
}

export default function VendorCard({ vendor, onViewProfile, onSave, isSaved, isSaving }) {
  const cfg = CATEGORY_CONFIG[vendor.category] || CATEGORY_CONFIG['Other'];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '20px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
      <VendorThumbnail vendor={vendor} cfg={cfg} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{vendor.name}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 9px', borderRadius: 999, fontFamily: PJS }}>{vendor.category}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          {vendor.rating != null && (
            <>
              <StarRow rating={vendor.rating} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{vendor.rating}</span>
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>({vendor.reviewCount} reviews)</span>
            </>
          )}
          {vendor.priceRange && (
            <>
              <span style={{ color: 'rgba(10,10,10,0.2)', fontSize: 11 }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{vendor.priceRange}</span>
            </>
          )}
          {vendor.location && (
            <>
              <span style={{ color: 'rgba(10,10,10,0.2)', fontSize: 11 }}>·</span>
              <MapPin size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', fontFamily: PJS }}>{vendor.location}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => onViewProfile(vendor)}
          style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', color: '#0A0A0A', transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0A0A0A'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,10,10,0.15)'; }}
        >
          View profile
        </button>
        <button
          onClick={() => onSave(vendor)}
          disabled={isSaved || isSaving}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: PJS, cursor: isSaved ? 'default' : 'pointer', border: 'none', background: 'none', color: isSaved ? '#10B981' : 'rgba(10,10,10,0.6)', padding: '2px 0', transition: 'color 0.12s' }}
          onMouseEnter={e => { if (!isSaved) e.currentTarget.style.color = '#0A0A0A'; }}
          onMouseLeave={e => { if (!isSaved) e.currentTarget.style.color = 'rgba(10,10,10,0.6)'; }}
        >
          <Bookmark size={11} style={{ fill: isSaved ? '#10B981' : 'transparent' }} />
          {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
