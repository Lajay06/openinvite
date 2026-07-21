import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Calendar, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";

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

export default function ScheduleList({ items, onEdit, onDelete, readOnly = false, loading = false }) {
  if (loading) return null;
  if (items.length === 0) {
    return (
      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
        <Calendar size={28} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
          No events scheduled yet.
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
              <TableHead>Event</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Responsible</TableHead>
              <TableHead style={{ width: 48 }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
