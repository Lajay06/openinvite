import React, { useState, useRef, useMemo } from 'react';
import { Printer, Edit2, Clock } from 'lucide-react';

const CATEGORY_CONFIG = {
  ceremony:       { label: 'Ceremony',       bg: '#E03553',               text: '#FFFFFF' },
  reception:      { label: 'Reception',      bg: '#803D81',               text: '#FFFFFF' },
  photography:    { label: 'Photography',    bg: '#0A1930',               text: '#FFFFFF' },
  preparation:    { label: 'Preparation',    bg: '#DDF762',               text: '#0A1930' },
  transportation: { label: 'Transportation', bg: 'rgba(221,247,98,0.8)', text: '#0A1930' },
  rehearsal:      { label: 'Rehearsal',      bg: '#0A0A0A',               text: '#FFFFFF' },
  pre_wedding:    { label: 'Pre-wedding',    bg: 'rgba(128,61,129,0.25)',text: '#803D81' },
  post_wedding:   { label: 'Post-wedding',   bg: 'rgba(224,53,83,0.18)', text: '#E03553' },
  other:          { label: 'Other',          bg: 'rgba(10,10,10,0.08)',  text: '#444444' },
};

const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins) => {
  const clamped = Math.max(0, Math.min(1439, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const HOUR_HEIGHT = 80;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
};

export default function WeddingDayTimelineBuilder({ scheduleItems, onEdit, onAddEvent, onTimeUpdate, readOnly = false }) {
  const printRef = useRef(null);
  const timelineRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffsetMins, setDragOffsetMins] = useState(0);
  const [ghostMins, setGhostMins] = useState(null);

  const { startHour, endHour, hours } = useMemo(() => {
    const times = scheduleItems.flatMap(i => [
      timeToMinutes(i.start_time),
      timeToMinutes(i.end_time || i.start_time) + 30,
    ]);
    const minMins = times.length ? Math.min(...times) : 8 * 60;
    const maxMins = times.length ? Math.max(...times) : 22 * 60;
    const start = Math.max(0, Math.floor(minMins / 60) - 1);
    const end = Math.min(24, Math.ceil(maxMins / 60) + 1);
    return {
      startHour: start, endHour: end,
      hours: Array.from({ length: end - start }, (_, i) => start + i),
    };
  }, [scheduleItems]);

  const sorted = useMemo(() =>
    [...scheduleItems].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
    [scheduleItems]
  );

  const getTop = (t) => ((timeToMinutes(t) - startHour * 60) / 60) * HOUR_HEIGHT;
  const getHeight = (start, end) => {
    if (!end) return HOUR_HEIGHT * 0.5;
    return Math.max((timeToMinutes(end) - timeToMinutes(start)) / 60 * HOUR_HEIGHT, 32);
  };

  const handleDragStart = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetMins = Math.round(((e.clientY - rect.top) / HOUR_HEIGHT) * 60);
    setDraggingId(item.id);
    setDragOffsetMins(offsetMins);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const rawMins = startHour * 60 + ((e.clientY - rect.top) / HOUR_HEIGHT) * 60 - dragOffsetMins;
    setGhostMins(Math.round(rawMins / 15) * 15);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggingId || ghostMins === null) return;
    const item = scheduleItems.find(i => i.id === draggingId);
    if (!item) return;
    const newStart = Math.max(0, Math.min(23 * 60 + 45, ghostMins));
    const dur = item.end_time ? timeToMinutes(item.end_time) - timeToMinutes(item.start_time) : 30;
    onTimeUpdate && onTimeUpdate(item.id, minutesToTime(newStart), minutesToTime(newStart + dur));
    setDraggingId(null);
    setGhostMins(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setGhostMins(null);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    await new Promise(r => setTimeout(r, 80));
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 20;
    const imgH = (canvas.height * imgW) / canvas.width;
    pdf.setFontSize(16); pdf.setTextColor(10, 10, 10);
    pdf.text('Wedding day timeline', 10, 14);
    pdf.setFontSize(9); pdf.setTextColor(120, 120, 120);
    pdf.text(`Generated ${new Date().toLocaleDateString()}`, 10, 20);
    const y = 26;
    const ratio = imgH > pageH - y - 10 ? (pageH - y - 10) / imgH : 1;
    pdf.addImage(imgData, 'PNG', 10, y, imgW * ratio, imgH * ratio);
    pdf.save('wedding-day-timeline.pdf');
    setIsExporting(false);
  };

  const totalHours = endHour - startHour;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>
            Visual day timeline
          </p>
          <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>
            {sorted.length} {sorted.length === 1 ? 'event' : 'events'} · drag blocks to reposition
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting || sorted.length === 0}
          className="btn-editorial-secondary"
          style={{ opacity: sorted.length === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Printer size={13} />
          {isExporting ? 'Exporting…' : 'Print PDF'}
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <span key={key} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 600,
            padding: '4px 10px', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif",
            background: cfg.bg, color: cfg.text,
          }}>
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Timeline chart */}
      {sorted.length === 0 ? (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
          <Clock size={28} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 16px' }}>
            No events yet — add one to build your timeline.
          </p>
          {onAddEvent && (
            <button onClick={onAddEvent} className="btn-primary">+ Add event</button>
          )}
        </div>
      ) : (
        <div ref={printRef} style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={labelStyle}>Wedding day timeline</p>
          </div>
          <div style={{ display: 'flex', minHeight: totalHours * HOUR_HEIGHT + 'px', userSelect: 'none' }}>

            {/* Hour labels */}
            <div style={{ flexShrink: 0, width: 64, borderRight: '1px solid rgba(10,10,10,0.06)', position: 'relative', height: totalHours * HOUR_HEIGHT + 'px' }}>
              {hours.map((hour, i) => (
                <div key={hour} style={{
                  position: 'absolute', width: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
                  top: i * HOUR_HEIGHT - 8 + 'px',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(10,10,10,0.35)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid + event blocks (droppable area) */}
            <div
              ref={timelineRef}
              style={{ flex: 1, position: 'relative', height: totalHours * HOUR_HEIGHT + 'px' }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Hour lines */}
              {hours.map((_, i) => (
                <div key={`hr-${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * HOUR_HEIGHT + 'px', borderTop: '1px solid rgba(10,10,10,0.06)' }} />
              ))}
              {/* 30-min dashed lines */}
              {hours.map((_, i) => (
                <div key={`hh-${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (i + 0.5) * HOUR_HEIGHT + 'px', borderTop: '1px dashed rgba(10,10,10,0.04)' }} />
              ))}

              {/* Ghost drop indicator */}
              {draggingId && ghostMins !== null && (
                <div style={{
                  position: 'absolute', left: 6, right: 6, height: 2,
                  top: ((ghostMins - startHour * 60) / 60) * HOUR_HEIGHT + 'px',
                  background: '#E03553', opacity: 0.7, pointerEvents: 'none', zIndex: 20,
                }} />
              )}

              {/* Event blocks */}
              {sorted.map((item) => {
                const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                const top = getTop(item.start_time);
                const height = getHeight(item.start_time, item.end_time);
                const dur = item.end_time ? timeToMinutes(item.end_time) - timeToMinutes(item.start_time) : 30;
                const isDragging = draggingId === item.id;

                return (
                  <div
                    key={item.id}
                    draggable={!readOnly}
                    onDragStart={readOnly ? undefined : (e) => handleDragStart(e, item)}
                    onDragEnd={readOnly ? undefined : handleDragEnd}
                    onClick={readOnly ? undefined : () => !isDragging && onEdit && onEdit(item)}
                    style={{
                      position: 'absolute', left: 6, right: 6,
                      top: top + 'px', height: Math.max(height, 32) + 'px',
                      background: cfg.bg, color: cfg.text,
                      padding: '4px 8px', overflow: 'hidden',
                      cursor: readOnly ? 'default' : (isDragging ? 'grabbing' : 'grab'),
                      opacity: isDragging ? 0.35 : 1,
                      transition: isDragging ? 'none' : 'opacity 0.15s',
                      zIndex: isDragging ? 5 : 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{
                          fontSize: 11, fontWeight: 700, margin: 0,
                          color: cfg.text, fontFamily: "'Plus Jakarta Sans', sans-serif",
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {item.event_name}
                        </p>
                        {height > 40 && (
                          <p style={{ fontSize: 10, color: cfg.text, opacity: 0.7, margin: '1px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {fmt12(item.start_time)}{item.end_time ? ` – ${fmt12(item.end_time)}` : ''} ({dur}m)
                          </p>
                        )}
                        {height > 58 && item.location && (
                          <p style={{ fontSize: 10, color: cfg.text, opacity: 0.6, margin: '1px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.location}
                          </p>
                        )}
                      </div>
                      {!readOnly && <Edit2 size={10} style={{ color: cfg.text, opacity: 0.5, flexShrink: 0, marginTop: 2 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compact ordered list below the chart */}
      {sorted.length > 0 && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={labelStyle}>Event list</p>
            <p style={labelStyle}>{sorted.length} {sorted.length === 1 ? 'event' : 'events'}</p>
          </div>
          {sorted.map((item, idx) => {
            const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
            const dur = item.end_time ? timeToMinutes(item.end_time) - timeToMinutes(item.start_time) : null;
            return (
              <div
                key={item.id}
                onClick={() => onEdit && onEdit(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer',
                  borderBottom: idx < sorted.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 3, height: 28, background: cfg.bg, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 64, flexShrink: 0 }}>
                  {fmt12(item.start_time)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.event_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#444444', margin: '1px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {cfg.label}{item.location ? ` · ${item.location}` : ''}{dur ? ` · ${dur}m` : ''}
                  </p>
                </div>
                {item.responsible_person && (
                  <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}>
                    {item.responsible_person}
                  </span>
                )}
                <Edit2 size={13} style={{ color: 'rgba(10,10,10,0.2)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
