import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Briefcase, Phone, Mail, Star, DollarSign, ExternalLink, FolderOpen } from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const STATUS_STYLES = {
  booked:      { background: '#DDF762',              color: '#0A1930' },
  quoted:      { background: '#803D81',              color: '#FFFFFF' },
  contacted:   { background: '#0A1930',              color: '#FFFFFF' },
  researching: { background: 'rgba(10,10,10,0.07)', color: 'rgba(10,10,10,0.6)', border: '1px solid rgba(10,10,10,0.15)' },
  rejected:    { background: 'rgba(224,53,83,0.08)', color: '#E03553', border: '1px solid rgba(224,53,83,0.2)' },
};

const CATEGORY_STYLES = {
  venue:         { color: '#E03553', border: '1px solid rgba(224,53,83,0.35)' },
  catering:      { color: '#6b7700', border: '1px solid rgba(107,119,0,0.35)' },
  photography:   { color: '#803D81', border: '1px solid rgba(128,61,129,0.35)' },
  videography:   { color: '#803D81', border: '1px solid rgba(128,61,129,0.35)' },
  flowers:       { color: '#2d7d46', border: '1px solid rgba(45,125,70,0.35)' },
  music:         { color: '#0A1930', border: '1px solid rgba(10,25,48,0.35)' },
  bakery:        { color: '#6b7700', border: '1px solid rgba(107,119,0,0.35)' },
  transportation:{ color: '#44547a', border: '1px solid rgba(68,84,122,0.35)' },
  beauty:        { color: '#E03553', border: '1px solid rgba(224,53,83,0.35)' },
  attire:        { color: '#0A1930', border: '1px solid rgba(10,25,48,0.35)' },
  planning:      { color: '#803D81', border: '1px solid rgba(128,61,129,0.35)' },
  decorations:   { color: '#E03553', border: '1px solid rgba(224,53,83,0.35)' },
  entertainment: { color: '#0A1930', border: '1px solid rgba(10,25,48,0.35)' },
  other:         { color: 'rgba(10,10,10,0.5)', border: '1px solid rgba(10,10,10,0.2)' },
};

const CATEGORY_LABELS = {
  venue: "Venue", catering: "Catering", photography: "Photography", videography: "Videography",
  flowers: "Florals", music: "Music & DJ", bakery: "Bakery", beauty: "Hair & makeup",
  attire: "Attire", transportation: "Transport", planning: "Planning",
  decorations: "Decorations", entertainment: "Entertainment", other: "Other",
};

function domainFromWebsite(website) {
  if (!website) return null;
  try {
    return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname;
  } catch {
    return null;
  }
}

// Google's favicon service for a lightweight per-vendor logo — falls back to
// an initial-letter avatar when there's no website or the favicon 404s.
function VendorLogo({ vendor }) {
  const domain = domainFromWebsite(vendor.website);
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(10,10,10,0.5)', fontFamily: PJS }}>
          {vendor.name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, objectFit: 'contain', background: 'rgba(10,10,10,0.03)' }}
    />
  );
}

function Pill({ value, styleMap, labelMap }) {
  const s = styleMap[value] || styleMap.other || styleMap.researching;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 600, fontFamily: PJS,
      letterSpacing: '0.04em',
      background: s?.background || 'transparent',
      color: s?.color || 'rgba(10,10,10,0.6)',
      border: s?.border || 'none',
      whiteSpace: 'nowrap',
    }}>
      {labelMap ? (labelMap[value] || value) : value}
    </span>
  );
}

export default function VendorList({ vendors, onEdit, onDelete, onManage }) {
  if (vendors.length === 0) {
    return (
      <div style={{ padding: '64px 32px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.06)' }}>
        <Briefcase size={24} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
          No vendors match your filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      {vendors.map((vendor, idx) => (
        <div
          key={vendor.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 0',
            borderTop: idx === 0 ? '1px solid rgba(10,10,10,0.06)' : 'none',
            borderBottom: '1px solid rgba(10,10,10,0.05)',
          }}
        >
          {/* Logo + name + contact */}
          <div style={{ flex: '0 0 200px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <VendorLogo vendor={vendor} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {vendor.name}
              </p>
              {vendor.contact_person && (
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '2px 0 0', fontFamily: PJS }}>
                  {vendor.contact_person}
                </p>
              )}
            </div>
          </div>

          {/* Category + Status + Rating */}
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {vendor.category && (
              <Pill value={vendor.category} styleMap={CATEGORY_STYLES} labelMap={CATEGORY_LABELS} />
            )}
            {vendor.status && (
              <Pill value={vendor.status} styleMap={STATUS_STYLES} labelMap={null} />
            )}
            {(vendor.rating || vendor.google_rating) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#0A0A0A', fontFamily: PJS }}>
                <Star size={11} style={{ color: '#6b7700', fill: '#DDF762', flexShrink: 0 }} />
                {vendor.rating || vendor.google_rating}
              </span>
            )}
          </div>

          {/* Contact info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            {vendor.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={11} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>{vendor.phone}</span>
              </div>
            )}
            {vendor.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={11} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{vendor.email}</span>
              </div>
            )}
          </div>

          {/* Quoted price */}
          <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
            {vendor.quoted_price ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <DollarSign size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS }}>
                  {Number(vendor.quoted_price).toLocaleString()}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>
            )}
          </div>

          {/* Website */}
          <div style={{ flex: '0 0 60px', textAlign: 'center' }}>
            {vendor.website ? (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#E03553', fontFamily: PJS, textDecoration: 'none', fontWeight: 600 }}>
                Visit <ExternalLink size={10} />
              </a>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.2)', fontFamily: PJS }}>—</span>
            )}
          </div>

          {/* Actions — hidden entirely (not disabled-looking) when nothing is passed, e.g. a read-only collaborator */}
          <div style={{ flex: '0 0 auto' }}>
            {(onManage || onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" style={{ width: 28, height: 28 }}>
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onManage && (
                    <DropdownMenuItem onClick={() => onManage(vendor)}>
                      <FolderOpen size={13} style={{ marginRight: 8 }} />Manage
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(vendor)}>
                      <Edit2 size={13} style={{ marginRight: 8 }} />Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(vendor.id)} style={{ color: '#E03553' }}>
                      <Trash2 size={13} style={{ marginRight: 8 }} />Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
