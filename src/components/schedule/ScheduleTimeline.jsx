import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2, Calendar, MapPin, User } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_CONFIG = {
  ceremony:       { bg: '#E03553',               text: '#FFFFFF', label: 'Ceremony' },
  reception:      { bg: '#803D81',               text: '#FFFFFF', label: 'Reception' },
  photography:    { bg: '#0A1930',               text: '#FFFFFF', label: 'Photography' },
  preparation:    { bg: '#DDF762',               text: '#0A1930', label: 'Preparation' },
  transportation: { bg: 'rgba(221,247,98,0.6)', text: '#0A1930', label: 'Transportation' },
  rehearsal:      { bg: '#0A0A0A',               text: '#FFFFFF', label: 'Rehearsal' },
  pre_wedding:    { bg: 'rgba(128,61,129,0.2)', text: '#803D81', label: 'Pre-wedding' },
  post_wedding:   { bg: 'rgba(224,53,83,0.12)', text: '#E03553', label: 'Post-wedding' },
  other:          { bg: 'rgba(10,10,10,0.07)',  text: '#444444', label: 'Other' },
};

const pillBase = {
  display: 'inline-block', fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
};

const fmtTime = (t) => {
  if (!t) return '';
  try { return format(new Date(`2024-01-01T${t}`), 'h:mm a'); } catch { return t; }
};

const fmtDate = (d) => {
  if (!d) return 'No date set';
  try { return format(new Date(d + 'T00:00:00'), 'MMMM d, yyyy'); } catch { return d; }
};

export default function ScheduleTimeline({ items, onEdit, onDelete, readOnly = false }) {
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

  // Group by date
  const grouped = items.reduce((acc, item) => {
    const key = item.event_date || '__nodate__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {Object.entries(grouped).map(([date, dateItems]) => (
        <div key={date}>
          {/* Date header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{
              color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap',
            }}>
              {date === '__nodate__' ? 'No date set' : fmtDate(date)}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
            <span style={{
              color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {dateItems.length} {dateItems.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {/* Timeline items */}
          <div style={{ position: 'relative', paddingLeft: 88 }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: 72, top: 8, bottom: 8, width: 1, background: 'rgba(10,10,10,0.08)' }} />

            {dateItems.map((item, idx) => {
              const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
              const dotColor = ['rgba(10,10,10,0.07)', 'rgba(128,61,129,0.2)', 'rgba(224,53,83,0.12)', 'rgba(221,247,98,0.6)'].includes(cfg.bg)
                ? cfg.text : cfg.bg;

              return (
                <div key={item.id} style={{ position: 'relative', marginBottom: idx < dateItems.length - 1 ? 16 : 0 }}>
                  {/* Time label */}
                  <div style={{ position: 'absolute', left: -88, top: 10, width: 72, textAlign: 'right', paddingRight: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block' }}>
                      {fmtTime(item.start_time)}
                    </span>
                    {item.end_time && (
                      <span style={{ fontSize: 10, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'block' }}>
                        {fmtTime(item.end_time)}
                      </span>
                    )}
                  </div>

                  {/* Dot */}
                  <div style={{
                    position: 'absolute', left: -20, top: 12,
                    width: 10, height: 10, borderRadius: '50%',
                    background: dotColor, border: '2px solid #FFFFFF',
                    boxShadow: '0 0 0 1px rgba(10,10,10,0.15)', zIndex: 1,
                  }} />

                  {/* Event card */}
                  <div style={{ border: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    {/* Left colour strip */}
                    <div style={{ width: 4, alignSelf: 'stretch', flexShrink: 0, background: cfg.bg, minHeight: 52 }} />

                    <div style={{ flex: 1, minWidth: 0, padding: '12px 0 12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {item.event_name}
                      </p>
                      {item.description && (
                        <p style={{ fontSize: 11, color: '#444444', margin: '3px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.description}</p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
                        {item.location && (
                          <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={10} style={{ color: 'rgba(10,10,10,0.6)' }} />{item.location}
                          </span>
                        )}
                        {item.responsible_person && (
                          <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 3 }}>
                            <User size={10} style={{ color: 'rgba(10,10,10,0.6)' }} />{item.responsible_person}
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p style={{ fontSize: 11, color: '#444444', fontStyle: 'italic', margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '12px 12px 12px 0' }}>
                      <span style={{ ...pillBase, background: cfg.bg, color: cfg.text }}>
                        {cfg.label}
                      </span>
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
