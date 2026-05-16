import React from 'react';
import { Music, Beer, Mic, DoorOpen, Crown, Users, Square, Circle } from 'lucide-react';

const STYLES = {
  'dance-floor':      { bg: 'rgba(128,61,129,0.1)',  border: '1px solid rgba(128,61,129,0.4)', color: '#803D81', Icon: Music },
  'bar':              { bg: 'rgba(221,247,98,0.25)', border: '1px solid rgba(107,119,0,0.4)',  color: '#6b7700', Icon: Beer },
  'stage':            { bg: '#0A1930',               border: 'none',                            color: '#FFFFFF', Icon: Mic },
  'entrance':         { bg: 'rgba(10,10,10,0.05)',   border: '1px solid rgba(10,10,10,0.2)',   color: '#444444', Icon: DoorOpen },
  'bridal-table':     { bg: 'rgba(224,53,83,0.07)',  border: '1px solid rgba(224,53,83,0.35)', color: '#E03553', Icon: Crown },
  'toilets':          { bg: 'rgba(10,10,10,0.04)',   border: '1px solid rgba(10,10,10,0.14)',  color: '#444444', Icon: Users },
  'rectangle':        { bg: 'rgba(10,10,10,0.04)',   border: '1.5px dashed rgba(10,10,10,0.18)', color: '#444444', Icon: Square },
  'large-rectangle':  { bg: 'rgba(10,10,10,0.04)',   border: '1.5px dashed rgba(10,10,10,0.18)', color: '#444444', Icon: Square },
  'circle':           { bg: 'rgba(10,10,10,0.04)',   border: '1.5px dashed rgba(10,10,10,0.18)', color: '#444444', Icon: Circle },
  'large-circle':     { bg: 'rgba(10,10,10,0.04)',   border: '1.5px dashed rgba(10,10,10,0.18)', color: '#444444', Icon: Circle },
};

export default function VisualAsset({ asset }) {
  const s = STYLES[asset.type] || STYLES['rectangle'];
  const isCircle = asset.type?.includes('circle');
  const { Icon } = s;

  return (
    <div style={{
      width: asset.width,
      height: asset.height,
      background: s.bg,
      border: s.border,
      borderRadius: isCircle ? '50%' : 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    }}>
      {Icon && <Icon size={13} style={{ color: s.color, flexShrink: 0 }} />}
      <span style={{
        color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif",
        textAlign: 'center', lineHeight: 1.2, padding: '0 6px',
      }}>
        {asset.name}
      </span>
    </div>
  );
}
