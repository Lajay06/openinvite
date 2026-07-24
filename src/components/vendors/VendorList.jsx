import React, { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

// Round 8 ask #12: sortable columns, same interaction as GuestList.jsx's
// SortableHead (click cycles asc -> desc -> unsorted/default order) — kept
// as a near-identical copy rather than a shared import since the two
// tables' column sets and value shapes differ enough that a shared
// abstraction would need its own indirection layer for little benefit.
function naturalCompare(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

const VENDOR_STATUS_SORT_RANK = { booked: 0, quoted: 1, contacted: 2, researching: 3, rejected: 4 };

const SORTABLE_COLUMNS = {
  name:     { getValue: v => v.name || '', compare: naturalCompare },
  category: { getValue: v => CATEGORY_LABELS[v.category] || v.category || '', compare: naturalCompare },
  status:   { getValue: v => v.status, compare: (a, b) => (VENDOR_STATUS_SORT_RANK[a] ?? 5) - (VENDOR_STATUS_SORT_RANK[b] ?? 5) },
  cost:     { getValue: v => v.quoted_price ?? null, compare: (a, b) => a - b },
};

function sortVendors(vendors, sortState) {
  if (!sortState?.field) return vendors;
  const { getValue, compare } = SORTABLE_COLUMNS[sortState.field];
  const dir = sortState.direction === 'desc' ? -1 : 1;
  return [...vendors].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    const aBlank = va === '' || va == null;
    const bBlank = vb === '' || vb == null;
    if (aBlank && bBlank) return 0;
    if (aBlank) return 1; // blanks always last, regardless of direction
    if (bBlank) return -1;
    return compare(va, vb) * dir;
  });
}

/** Clickable column header — cycles asc → desc → unsorted (back to default order). */
function SortableHead({ field, label, sortState, onSort, style }) {
  const active = sortState?.field === field;
  const direction = active ? sortState.direction : null;
  return (
    <TableHead
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      title={`Sort by ${label.toLowerCase()}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 10, color: active ? '#E03553' : 'rgba(10,10,10,0.25)', lineHeight: 1 }}>
          {active ? (direction === 'desc' ? '▼' : '▲') : '⇅'}
        </span>
      </span>
    </TableHead>
  );
}

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
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
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
      style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, objectFit: 'contain', background: 'rgba(10,10,10,0.03)' }}
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

function FavouriteStar({ vendor, onToggle }) {
  if (!onToggle) {
    return vendor.is_favourite ? (
      <Star size={15} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
    ) : null;
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(vendor); }}
      aria-label={vendor.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
      title={vendor.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
      style={{ background: 'none', border: 'none', padding: 4, margin: -4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <Star
        size={15}
        style={{
          color: vendor.is_favourite ? '#F59E0B' : 'rgba(10,10,10,0.25)',
          fill: vendor.is_favourite ? '#F59E0B' : 'none',
          transition: 'color 0.15s, fill 0.15s',
        }}
      />
    </button>
  );
}

export default function VendorList({ vendors, onEdit, onDelete, onManage, onToggleFavourite, scrollToVendorId, highlightedVendorId }) {
  const rowRefs = useRef(new Map());
  const scrolledForId = useRef(null);
  const [sortState, setSortState] = useState({ field: null, direction: 'asc' });

  // Cycles a column through asc → desc → unsorted (back to the default,
  // caller-provided order) — clicking a different column always starts at asc.
  const handleSort = (field) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return { field: null, direction: 'asc' };
    });
  };

  // Same pattern as GuestList's scrollToGuestId — scrolls a search result's
  // row into view once it actually exists in `vendors`, fires once per id.
  useEffect(() => {
    if (!scrollToVendorId || scrolledForId.current === scrollToVendorId) return;
    const el = rowRefs.current.get(scrollToVendorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolledForId.current = scrollToVendorId;
    }
  }, [scrollToVendorId, vendors]);

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
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FAFAFA' }}>
              <TableHead style={{ width: 32 }} />
              <SortableHead field="name" label="Vendor" sortState={sortState} onSort={handleSort} />
              <SortableHead field="category" label="Category" sortState={sortState} onSort={handleSort} />
              <SortableHead field="status" label="Status" sortState={sortState} onSort={handleSort} />
              <TableHead>Contact</TableHead>
              <TableHead>Website</TableHead>
              <SortableHead field="cost" label="Price" sortState={sortState} onSort={handleSort} />
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortVendors(vendors, sortState).map((vendor) => (
              <TableRow
                key={vendor.id}
                ref={el => { if (el) rowRefs.current.set(vendor.id, el); else rowRefs.current.delete(vendor.id); }}
                style={{
                  background: vendor.id === highlightedVendorId ? 'rgba(224,53,83,0.12)' : undefined,
                  transition: 'background 1.2s ease',
                }}
              >
                {/* Favourite star */}
                <TableCell className="align-middle">
                  <FavouriteStar vendor={vendor} onToggle={onToggleFavourite} />
                </TableCell>

                {/* Vendor — logo + name + contact person, same shape as GuestList's avatar + name cell */}
                <TableCell className="align-middle">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <VendorLogo vendor={vendor} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS, whiteSpace: 'nowrap' }}>
                        {vendor.name}
                      </p>
                      {vendor.contact_person && (
                        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '2px 0 0', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                          {vendor.contact_person}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="align-middle">
                  {vendor.category ? <Pill value={vendor.category} styleMap={CATEGORY_STYLES} labelMap={CATEGORY_LABELS} /> : <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>}
                </TableCell>

                <TableCell className="align-middle">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {vendor.status ? <Pill value={vendor.status} styleMap={STATUS_STYLES} labelMap={null} /> : <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>}
                    {(vendor.rating || vendor.google_rating) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#0A0A0A', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                        <Star size={11} style={{ color: '#6b7700', fill: '#DDF762', flexShrink: 0 }} />
                        {vendor.rating || vendor.google_rating}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="align-middle">
                  {vendor.phone || vendor.email ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {vendor.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Phone size={11} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS, whiteSpace: 'nowrap' }}>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Mail size={11} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS, whiteSpace: 'nowrap' }}>{vendor.email}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>
                  )}
                </TableCell>

                <TableCell className="align-middle">
                  {vendor.website ? (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#E03553', fontFamily: PJS, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Visit <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>
                  )}
                </TableCell>

                <TableCell className="align-middle">
                  {vendor.quoted_price ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <DollarSign size={11} style={{ color: 'rgba(10,10,10,0.35)' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, whiteSpace: 'nowrap' }}>
                        {Number(vendor.quoted_price).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>
                  )}
                </TableCell>

                {/* Actions — hidden entirely (not disabled-looking) when nothing is passed, e.g. a read-only collaborator */}
                <TableCell className="align-middle">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
