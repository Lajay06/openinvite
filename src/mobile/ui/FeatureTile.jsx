import React from 'react';
import SmartImage from './SmartImage';

/**
 * Plan hub tile: a photo or a color panel, a Lucide icon in a circle, and
 * the feature name. Nothing else: tiles carry their title only (goal 4). A
 * `stat` passed by a caller is ignored. `tone`: 'photo' (needs image) |
 * 'white' | 'neutral' | 'tint'.
 */
export default function FeatureTile({ icon: Icon, name, image, alt = '', tone, onClick }) {
  const photo = !!image;
  const cls = photo ? ' oi-m-tile--photo' : tone === 'neutral' ? ' oi-m-tile--neutral' : tone === 'tint' ? ' oi-m-tile--tint' : '';
  return (
    <button type="button" className={`oi-m-tile oi-m-press${cls}`} onClick={onClick}>
      {photo && <SmartImage src={image} alt={alt} width={180} height={150} square tone="ink" />}
      {photo && <div className="oi-m-hero__scrim" />}
      <div className="oi-m-tile__top">
        {Icon && <span className="oi-m-tile__icon"><Icon size={18} strokeWidth={1.75} /></span>}
      </div>
      <div className="oi-m-tile__bottom">
        <div className="oi-m-tile__name">{name}</div>
      </div>
    </button>
  );
}
