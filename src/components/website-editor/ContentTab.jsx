import React from 'react';
import { Button } from '@/components/ui/button';

export default function ContentTab({ wedding, onChange }) {
  const EditInput = ({ label, value, onChange: onInput, type = 'text' }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.1em', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onInput(e.target.value)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #DDDDDD',
          padding: '8px 0',
          fontSize: '14px',
          color: '#0A0A0A',
          outline: 'none',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderBottomColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderBottomColor = '#DDDDDD'}
      />
    </div>
  );

  const EditTextarea = ({ label, value, onChange: onInput, rows = 3 }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.1em', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
        {label}
      </label>
      <textarea
        value={value || ''}
        onChange={e => onInput(e.target.value)}
        rows={rows}
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px solid #DDDDDD',
          padding: '8px',
          fontSize: '14px',
          color: '#0A0A0A',
          outline: 'none',
          fontFamily: 'inherit',
          resize: 'vertical',
          transition: 'border-color 0.2s ease',
          boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = '#0A0A0A'}
        onBlur={e => e.target.style.borderColor = '#DDDDDD'}
      />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* HERO */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Hero
        </h3>
        <EditInput
          label="Hero Video URL"
          value={wedding.heroVideoUrl}
          onChange={v => onChange('heroVideoUrl', v)}
        />
        <EditInput
          label="Cover Photo URL"
          value={wedding.coverPhoto}
          onChange={v => onChange('coverPhoto', v)}
        />
      </div>

      {/* COUPLE NAMES */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Couple Names
        </h3>
        <EditInput
          label="Couple Names (e.g., Sarah & James)"
          value={wedding.coupleNames}
          onChange={v => onChange('coupleNames', v)}
        />
        <EditInput
          label="Wedding Date"
          value={wedding.weddingDate}
          onChange={v => onChange('weddingDate', v)}
          type="date"
        />
      </div>

      {/* WELCOME MESSAGE */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Welcome Message
        </h3>
        <EditTextarea
          label="Welcome Quote"
          value={wedding.welcomeMessage}
          onChange={v => onChange('welcomeMessage', v.slice(0, 280))}
          rows={4}
        />
        <p style={{ fontSize: '11px', color: '#888888', margin: '4px 0 0' }}>
          {(wedding.welcomeMessage || '').length} / 280
        </p>
      </div>

      {/* CEREMONY — read-only: edit in Event Details → Venue */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ceremony
        </h3>
        <p style={{ fontSize: '11px', color: '#888888', margin: '0 0 10px' }}>Edit in <strong>Event Details → Venue</strong></p>
        {wedding.mainCeremony?.venueName && <p style={{ fontSize: 13, color: '#0A0A0A', margin: '0 0 4px' }}>{wedding.mainCeremony.venueName}</p>}
        {wedding.mainCeremony?.address && <p style={{ fontSize: 11, color: '#888888', margin: '0 0 4px' }}>{wedding.mainCeremony.address}</p>}
        {wedding.mainCeremony?.startTime && <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>{wedding.mainCeremony.startTime}{wedding.mainCeremony?.endTime ? ` – ${wedding.mainCeremony.endTime}` : ''}</p>}
      </div>

      {/* RECEPTION — read-only: edit in Event Details → Venue */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Reception
        </h3>
        {wedding.reception?.venueName && <p style={{ fontSize: 13, color: '#0A0A0A', margin: '0 0 4px' }}>{wedding.reception.venueName}</p>}
        {wedding.reception?.address && <p style={{ fontSize: 11, color: '#888888', margin: '0 0 4px' }}>{wedding.reception.address}</p>}
        {wedding.reception?.startTime && <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>{wedding.reception.startTime}{wedding.reception?.endTime ? ` – ${wedding.reception.endTime}` : ''}</p>}
      </div>

      {/* OUR STORY */}
      <div>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Our Story
        </h3>
        <EditTextarea
          label="Couple's Story"
          value={wedding.coupleStory}
          onChange={v => onChange('coupleStory', v)}
          rows={6}
        />
      </div>
    </div>
  );
}