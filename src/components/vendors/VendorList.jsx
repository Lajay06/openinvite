import React, { useState, useRef, useEffect } from 'react';
import DataTable from '@/components/shared/DataTable';
import { Edit2, Trash2, Briefcase, Phone, Mail, Star, DollarSign, ExternalLink, FolderOpen } from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const STATUS_STYLES = {
  booked:            { background: '#DDF762',              color: '#0A1930' },
  quoted:            { background: '#803D81',              color: '#FFFFFF' },
  meeting_scheduled: { background: 'rgba(128,61,129,0.1)', color: '#803D81', border: '1px solid rgba(128,61,129,0.3)' },
  contacted:         { background: '#0A1930',              color: '#FFFFFF' },
  researching:       { background: 'rgba(10,10,10,0.07)', color: 'rgba(10,10,10,0.6)', border: '1px solid rgba(10,10,10,0.15)' },
  rejected:          { background: 'rgba(224,53,83,0.08)', color: '#E03553', border: '1px solid rgba(224,53,83,0.2)' },
};

const STATUS_LABELS = { meeting_scheduled: 'Meeting scheduled' };

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
  other:         { color: 'rgba(10,10,10,0.6)', border: '1px solid rgba(10,10,10,0.2)' },
};

const CATEGORY_LABELS = {
  venue: "Venue", catering: "Catering", photography: "Photography", videography: "Videography",
  flowers: "Florals", music: "Music & DJ", bakery: "Bakery", beauty: "Hair & makeup",
  attire: "Attire", transportation: "Transport", planning: "Planning",
  decorations: "Decorations", entertainment: "Entertainment", other: "Other",
};

// Round 8 ask #12 kept a near-identical copy of GuestList's SortableHead
// here, on the argument that "the two tables' column sets and value shapes
// differ enough that a shared abstraction would need its own indirection
// layer for little benefit". The shared shell exists now and the column sets
// go through it as data, so the copy is gone and the sort behaviour is
// whatever the shell does — which is the point of having one.
//
// The SORT ORDER stays here: rank a status, natural-compare a name, blanks
// last. That is vendor knowledge, not table knowledge.
function naturalCompare(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

const VENDOR_STATUS_SORT_RANK = { booked: 0, quoted: 1, meeting_scheduled: 2, contacted: 3, researching: 4, rejected: 5 };

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
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
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
      aria-label={vendor.is_favourite ? 'Remove from favorites' : 'Add to favorites'}
      title={vendor.is_favourite ? 'Remove from favorites' : 'Add to favorites'}
      style={{ background: 'none', border: 'none', padding: 4, margin: -4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    >
      <Star
        size={15}
        style={{
          color: vendor.is_favourite ? '#F59E0B' : 'rgba(10,10,10,0.45)',
          fill: vendor.is_favourite ? '#F59E0B' : 'none',
          transition: 'color 0.15s, fill 0.15s',
        }}
      />
    </button>
  );
}

/**
 * The inline detail — a row of the same table, not a layer over it.
 *
 * ONLY WHAT IS NOT ALREADY IN THE ROW. Repeating the phone number a couple can
 * already see two lines up is how a detail view teaches people to ignore it.
 * Contact, category, status, price and website are columns; this is the rest
 * of what they entered, and nothing invented for the sake of filling space.
 *
 * A vendor with none of these gets a sentence saying so and the way to add
 * them, which is the same rule every empty surface in this product follows.
 */
function VendorDetail({ vendor, onEdit, onManage }) {
  const money = (v) => `$${Number(v).toLocaleString()}`;
  const fields = [
    ['Address', vendor.address],
    ['Booking date', vendor.booking_date],
    ['Meeting date', vendor.meeting_date],
    ['Package', vendor.package_selected],
    ['Deposit', vendor.deposit_amount ? `${money(vendor.deposit_amount)}${vendor.deposit_paid ? ' — paid' : ' — not paid yet'}` : null],
    ['Contract', vendor.contract_signed ? `Signed${vendor.contract_date ? ` ${vendor.contract_date}` : ''}` : null],
    ['Payment schedule', vendor.payment_schedule],
    ['Services', vendor.services_offered],
    ['Style', vendor.style],
    ['Instagram', vendor.instagram],
    ['Special requests', vendor.special_requests],
    ['Notes', vendor.notes],
  ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');

  return (
    <div style={{ padding: '14px 16px 16px 46px', fontFamily: PJS }}>
      {fields.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
          Nothing else recorded for {vendor.name} yet. Edit to add dates, a deposit, or your notes.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 24px' }}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.6)', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 12, color: '#0A0A0A', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{value}</p>
            </div>
          ))}
        </div>
      )}
      {(onEdit || onManage) && (
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          {onEdit && (
            <button type="button" onClick={() => onEdit(vendor)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS }}>
              Edit
            </button>
          )}
          {onManage && (
            <button type="button" onClick={() => onManage(vendor)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS }}>
              Manage
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorList({ vendors, onEdit, onDelete, onManage, onToggleFavourite, scrollToVendorId, highlightedVendorId }) {
  const wrapRef = useRef(null);
  const scrolledForId = useRef(null);
  const [sortState, setSortState] = useState({ field: null, direction: 'asc' });
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpand = (id) => setExpandedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

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
  // The row is found by the shell's `data-row-id`, which is why that attribute
  // is on every row rather than being a prop only this page passes.
  useEffect(() => {
    if (!scrollToVendorId || scrolledForId.current === scrollToVendorId) return;
    const el = wrapRef.current?.querySelector(`[data-row-id="${scrollToVendorId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolledForId.current = scrollToVendorId;
    }
  }, [scrollToVendorId, vendors]);

  const dash = (n = 12) => <span style={{ fontSize: n, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>—</span>;

  const columns = [
    {
      // US spelling on the new key. The surrounding props are
      // \`onToggleFavourite\`/\`FavouriteStar\` — pre-existing drift this package
      // does not rename, but a line this commit writes obeys the rule.
      key: 'favorite', label: '', width: 32,
      render: (vendor) => <FavouriteStar vendor={vendor} onToggle={onToggleFavourite} />,
    },
    {
      key: 'name', label: 'Vendor', sortable: true,
      render: (vendor) => (
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
      ),
    },
    {
      key: 'category', label: 'Category', sortable: true,
      render: (vendor) => (vendor.category
        ? <Pill value={vendor.category} styleMap={CATEGORY_STYLES} labelMap={CATEGORY_LABELS} />
        : dash()),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (vendor) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {vendor.status ? <Pill value={vendor.status} styleMap={STATUS_STYLES} labelMap={STATUS_LABELS} /> : dash()}
          {(vendor.rating || vendor.google_rating) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#0A0A0A', fontFamily: PJS, whiteSpace: 'nowrap' }}>
              <Star size={11} style={{ color: '#6b7700', fill: '#DDF762', flexShrink: 0 }} />
              {vendor.rating || vendor.google_rating}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'contact', label: 'Contact',
      render: (vendor) => ((vendor.phone || vendor.email) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {vendor.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={11} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS, whiteSpace: 'nowrap' }}>{vendor.phone}</span>
            </div>
          )}
          {vendor.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mail size={11} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS, whiteSpace: 'nowrap' }}>{vendor.email}</span>
            </div>
          )}
        </div>
      ) : dash()),
    },
    {
      key: 'website', label: 'Website',
      render: (vendor) => (vendor.website ? (
        <a href={vendor.website} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#E03553', fontFamily: PJS, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
          Visit <ExternalLink size={10} />
        </a>
      ) : dash()),
    },
    {
      key: 'cost', label: 'Price', sortable: true,
      render: (vendor) => (vendor.quoted_price ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <DollarSign size={11} style={{ color: 'rgba(10,10,10,0.45)' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, whiteSpace: 'nowrap' }}>
            {Number(vendor.quoted_price).toLocaleString()}
          </span>
        </div>
      ) : dash(13)),
    },
  ];

  // Hidden entirely (not disabled-looking) when nothing is passed, e.g. a
  // read-only collaborator. MANAGE STAYS: the chevron is now how a couple
  // reads a vendor, and Manage is how they work on one.
  const actions = (vendor) => [
    ...(onManage ? [{ label: 'Manage', icon: FolderOpen, onClick: () => onManage(vendor) }] : []),
    ...(onEdit ? [{ label: 'Edit', icon: Edit2, onClick: () => onEdit(vendor) }] : []),
    ...(onDelete ? [{ label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(vendor.id) }] : []),
  ];

  return (
    <div ref={wrapRef}>
      <DataTable
        columns={columns}
        rows={sortVendors(vendors, sortState)}
        rowKey={(v) => v.id}
        sortState={sortState}
        onSort={handleSort}
        actions={actions}
        rowStyle={(vendor) => ({
          background: vendor.id === highlightedVendorId ? 'rgba(224,53,83,0.12)' : undefined,
          transition: 'background 1.2s ease',
        })}
        expandable
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        expandLabel={(vendor, open) => (open ? `Hide ${vendor.name}'s details` : `Show ${vendor.name}'s details`)}
        renderDetail={(vendor) => <VendorDetail vendor={vendor} onEdit={onEdit} onManage={onManage} />}
        empty={(
          <>
            <Briefcase size={24} style={{ color: 'rgba(10,10,10,0.3)', margin: '0 auto 12px', display: 'block' }} />
            No vendors match your filters.
          </>
        )}
      />
    </div>
  );
}
