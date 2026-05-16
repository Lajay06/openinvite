import React, { useState, useRef, useEffect } from 'react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DatePicker({ value, onChange, label, placeholder = 'Select date', dark = false }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => value ? new Date(value + 'T00:00:00') : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value) setViewMonth(new Date(value + 'T00:00:00'));
  }, [value]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const isSelected = (day) => {
    if (!value) return false;
    const d = new Date(value + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  };

  const isToday = (day) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  const selectDay = (day) => {
    onChange(`${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
    setOpen(false);
  };

  const labelStyle = dark
    ? { fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }
    : { fontSize: 11, fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 };

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 16 }}>
      {label && <p style={labelStyle}>{label}</p>}

      {/* Trigger */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${open ? '#E03553' : dark ? '#333' : '#DDDDDD'}`,
        padding: '8px 0', cursor: 'pointer', transition: 'border-color 0.2s',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={open ? '#E03553' : '#AAAAAA'} strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
        </svg>
        <span style={{ flex: 1, fontSize: 14, color: value ? (dark ? '#fff' : '#0A0A0A') : '#AAAAAA', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        {value && (
          <button onClick={e => { e.stopPropagation(); onChange(''); }} style={{ background: 'none', border: 'none', color: '#AAAAAA', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Calendar */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 9999,
          background: '#FFFFFF', border: '1px solid #EEEEEE',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          padding: 16, width: 280, marginTop: 4,
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => setViewMonth(new Date(year, month - 1))} style={{ background: 'none', border: '1px solid #EEEEEE', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#444' }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{MONTH_NAMES[month]} {year}</span>
            <button onClick={() => setViewMonth(new Date(year, month + 1))} style={{ background: 'none', border: '1px solid #EEEEEE', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#444' }}>›</button>
          </div>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#AAAAAA', padding: '4px 0' }}>{d}</div>)}
          </div>
          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array(firstDay).fill(null).map((_,i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_,i) => {
              const day = i + 1;
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <div key={day} onClick={() => selectDay(day)} style={{
                  textAlign: 'center', padding: '6px 0', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  background: sel ? 'linear-gradient(135deg, #E03553, #803D81)' : tod ? 'rgba(224,53,83,0.08)' : 'transparent',
                  color: sel ? '#FFFFFF' : tod ? '#E03553' : '#0A0A0A',
                  fontWeight: sel || tod ? 700 : 400, transition: 'all 0.1s',
                }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#F5F5F5'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = tod ? 'rgba(224,53,83,0.08)' : 'transparent'; }}
                >{day}</div>
              );
            })}
          </div>
          {/* Quick actions */}
          <div style={{ borderTop: '1px solid #F0F0F0', marginTop: 10, paddingTop: 10, display: 'flex', gap: 6 }}>
            <button onClick={() => { onChange(new Date().toISOString().split('T')[0]); setOpen(false); }} style={{ flex: 1, padding: '6px', border: '1px solid #EEEEEE', background: 'transparent', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#444', fontWeight: 600, fontFamily: 'inherit' }}>Today</button>
            <button onClick={() => { onChange(''); setOpen(false); }} style={{ flex: 1, padding: '6px', border: '1px solid #EEEEEE', background: 'transparent', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#888', fontFamily: 'inherit' }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}