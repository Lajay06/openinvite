import React, { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Calendar, CalendarPlus, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { buildIcsCalendar, downloadIcs, slugifyForFilename } from "@/lib/ics";

const CATEGORY_CONFIG = {
  ceremony:       { color: '#E03553', border: '1px solid #E03553',              bg: 'transparent' },
  reception:      { color: '#803D81', border: '1px solid #803D81',              bg: 'transparent' },
  photography:    { color: '#0A1930', border: '1px solid #0A1930',              bg: 'transparent' },
  preparation:    { color: '#0A1930', border: 'none',                           bg: '#DDF762' },
  transportation: { color: '#0A1930', border: 'none',                           bg: 'rgba(221,247,98,0.6)' },
  rehearsal:      { color: '#FFFFFF', border: 'none',                           bg: '#0A1930' },
  pre_wedding:    { color: '#803D81', border: '1px solid #803D81',              bg: 'transparent' },
  post_wedding:   { color: '#E03553', border: '1px solid #E03553',              bg: 'transparent' },
  other:          { color: '#444444', border: '1px solid rgba(10,10,10,0.25)', bg: 'transparent' },
};

// Same pill language as VendorList.jsx's status/category Pill — rounded,
// padded chips, not outlined boxy tags (dashboard round 6, item 8).
const pillBase = {
  display: 'inline-flex', alignItems: 'center',
  padding: '2px 8px', borderRadius: 999,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
};

const CategoryPill = ({ category }) => {
  const style = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  return (
    <span style={{ ...pillBase, background: style.bg, color: style.color, border: style.border }}>
      {category?.replace(/_/g, ' ')}
    </span>
  );
};

const fmtTime = (t) => {
  if (!t) return '—';
  try { return format(new Date(`2024-01-01T${t}`), 'h:mm a'); } catch { return t; }
};

function downloadEventIcs(item) {
  if (!item.event_date || !item.start_time) return;
  const ics = buildIcsCalendar([item], item.event_name);
  downloadIcs(`${slugifyForFilename(item.event_name)}.ics`, ics);
}

const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d + 'T00:00:00'), 'MMM d'); } catch { return d; }
};

// Same sort pattern as GuestList.jsx's SORTABLE_COLUMNS/SortableHead — ISO
// date (YYYY-MM-DD) and 24h time (HH:MM) strings sort correctly as plain
// strings, no Date-object parsing needed.
function naturalCompare(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

const SORTABLE_COLUMNS = {
  event:       { getValue: i => i.event_name || '' },
  category:    { getValue: i => i.category || '' },
  date:        { getValue: i => i.event_date || '' },
  time:        { getValue: i => i.start_time || '' },
  location:    { getValue: i => i.location || '' },
  responsible: { getValue: i => i.responsible_person || '' },
};

function sortItems(items, sortState) {
  if (!sortState?.field) return items;
  const { getValue } = SORTABLE_COLUMNS[sortState.field];
  const dir = sortState.direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    const aBlank = va === '' || va == null;
    const bBlank = vb === '' || vb == null;
    if (aBlank && bBlank) return 0;
    if (aBlank) return 1; // blanks always last, regardless of direction
    if (bBlank) return -1;
    return naturalCompare(va, vb) * dir;
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

export default function ScheduleList({ items, onEdit, onDelete, readOnly = false, loading = false, scrollToItemId, highlightedItemId }) {
  const rowRefs = useRef(new Map());
  const scrolledForId = useRef(null);
  const [sortState, setSortState] = useState(null); // null = default (incoming) order

  const handleSort = (field) => {
    setSortState(prev => {
      if (prev?.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return null; // third click: back to default order
    });
  };

  const sortedItems = sortItems(items, sortState);

  // Same pattern as VendorList's scrollToVendorId — scrolls a Recent
  // activity/search result's row into view once it exists in `items`.
  useEffect(() => {
    if (!scrollToItemId || scrolledForId.current === scrollToItemId) return;
    const el = rowRefs.current.get(scrollToItemId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolledForId.current = scrollToItemId;
    }
  }, [scrollToItemId, items]);

  if (loading) return null;
  if (items.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.12)', padding: '64px 32px', textAlign: 'center' }}>
        <Calendar size={28} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
          No events scheduled yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.12)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FAFAFA' }}>
              <SortableHead field="event" label="Event" sortState={sortState} onSort={handleSort} />
              <SortableHead field="category" label="Category" sortState={sortState} onSort={handleSort} />
              <SortableHead field="date" label="Date" sortState={sortState} onSort={handleSort} />
              <SortableHead field="time" label="Time" sortState={sortState} onSort={handleSort} />
              <SortableHead field="location" label="Location" sortState={sortState} onSort={handleSort} />
              <SortableHead field="responsible" label="Responsible" sortState={sortState} onSort={handleSort} />
              <TableHead style={{ width: 80 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow
                key={item.id}
                ref={el => { if (el) rowRefs.current.set(item.id, el); else rowRefs.current.delete(item.id); }}
                style={{
                  background: item.id === highlightedItemId ? 'rgba(224,53,83,0.12)' : undefined,
                  transition: 'background 1.2s ease',
                }}
              >
                <TableCell>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {item.event_name}
                  </p>
                  {item.description && (
                    <p style={{ fontSize: 11, color: '#444444', margin: '2px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.description}
                    </p>
                  )}
                  {item.notes && (
                    <p style={{ fontSize: 11, color: '#444444', fontStyle: 'italic', margin: '2px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {item.notes}
                    </p>
                  )}
                </TableCell>
                <TableCell><CategoryPill category={item.category} /></TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={11} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {fmtDate(item.event_date)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {fmtTime(item.start_time)}{item.end_time ? ` – ${fmtTime(item.end_time)}` : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {item.location ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={11} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.location}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.responsible_person ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={11} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.responsible_person}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="ghost" size="icon"
                      title="Add to calendar (.ics)"
                      onClick={() => downloadEventIcs(item)}
                      disabled={!item.event_date || !item.start_time}
                    >
                      <CalendarPlus size={14} />
                    </Button>
                    {!readOnly && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal size={15} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Edit2 size={13} style={{ marginRight: 8 }} />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(item.id)} style={{ color: '#E03553' }}>
                            <Trash2 size={13} style={{ marginRight: 8 }} />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
