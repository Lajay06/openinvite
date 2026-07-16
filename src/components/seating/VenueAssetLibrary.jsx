import React from 'react';
import { LayoutGrid, Plus, Music, Beer, Mic, DoorOpen, Crown, Users, Square, Circle } from 'lucide-react';

const VENUE_ASSETS = [
  { name: 'Dance floor',  type: 'dance-floor',  Icon: Music,  width: 150, height: 150 },
  { name: 'Bar',          type: 'bar',          Icon: Beer,   width: 120, height: 60 },
  { name: 'Stage',        type: 'stage',        Icon: Mic,    width: 200, height: 100 },
  { name: 'Entrance',     type: 'entrance',     Icon: DoorOpen, width: 120, height: 40 },
  { name: 'Bridal table', type: 'bridal-table', Icon: Crown,  width: 250, height: 80 },
  { name: 'Toilets',      type: 'toilets',      Icon: Users,  width: 80,  height: 60 },
];

const SHAPES = [
  { name: 'Rectangle',       type: 'rectangle',       Icon: Square, width: 100, height: 60 },
  { name: 'Large rectangle', type: 'large-rectangle', Icon: Square, width: 200, height: 100 },
  { name: 'Circle',          type: 'circle',          Icon: Circle, width: 80,  height: 80 },
  { name: 'Large circle',    type: 'large-circle',    Icon: Circle, width: 120, height: 120 },
];

const sectionLabel = {
  letterSpacing: '0.1em', color: 'rgba(10,10,10,0.35)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '10px 16px 4px',
};

function AssetButton({ label, Icon, onClick }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: '7px 16px', background: hov ? 'rgba(10,10,10,0.04)' : 'none',
        border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 500, color: '#444444',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'background 0.1s', textAlign: 'left',
      }}
    >
      {Icon && <Icon size={12} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />}
      {label}
    </button>
  );
}

export default function VenueAssetLibrary({ onAddTable, onAddAsset, onImportLayout, uploadingImage, readOnly = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <LayoutGrid size={13} style={{ color: 'rgba(10,10,10,0.35)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Layout items
        </span>
      </div>

      {readOnly ? (
        <p style={{ padding: '16px', fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          View only — the couple can add or rearrange tables and venue items.
        </p>
      ) : (
        <>
          {/* Add Table */}
          <div style={{ padding: '12px 16px 4px', flexShrink: 0 }}>
            <button
              onClick={onAddTable}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
            >
              <Plus size={12} />Add table
            </button>
          </div>

          {/* Venue assets */}
          <div style={{ flexShrink: 0 }}>
            <span style={sectionLabel}>Venue assets</span>
            {VENUE_ASSETS.map(a => (
              <AssetButton key={a.type} label={a.name} Icon={a.Icon} onClick={() => onAddAsset(a)} />
            ))}
          </div>

          {/* Basic shapes */}
          <div style={{ borderTop: '1px solid rgba(10,10,10,0.06)', flexShrink: 0 }}>
            <span style={sectionLabel}>Basic shapes</span>
            {SHAPES.map(s => (
              <AssetButton key={s.type} label={s.name} Icon={s.Icon} onClick={() => onAddAsset(s)} />
            ))}
          </div>
        </>
      )}

      {/* Import layout: intentionally hidden pre-launch
          (fix/seating-select-import-cleanup) — future feature, not launch
          scope. The upload handler (handleImportLayout in Seating.jsx) and
          uploadingImage state are left intact; onImportLayout/uploadingImage
          are still threaded through as props below. Re-add the entry point
          here (it used to be pinned to the bottom via marginTop: 'auto') to
          bring the feature back — no other wiring needs to change. */}
    </div>
  );
}
