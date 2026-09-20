import React from 'react';
import SmartImage from './SmartImage';

/**
 * Plan hub tile: a photo or a color panel, a Lucide icon in a circle, the
 * feature name, one live stat. `tone`: 'photo' (needs image) | 'white' |
 * 'sand' | 'blush'.
 */
export default function FeatureTile({ icon: Icon, name, stat, image, alt = '', tone, onClick }) {
  const photo = !!image;
  const cls = photo ? ' oi-m-tile--photo' : tone === 'sand' ? ' oi-m-tile--sand' : tone === 'blush' ? ' oi-m-tile--blush' : '';
  return (
    <button type="button" className={`oi-m-tile oi-m-press${cls}`} onClick={onClick}>
      {photo && <SmartImage src={image} alt={alt} width={180} height={150} square tone="ink" />}
      {photo && <div className="oi-m-hero__scrim" />}
      <div className="oi-m-tile__top">
        {Icon && <span className="oi-m-tile__icon"><Icon size={18} strokeWidth={1.75} /></span>}
      </div>
      <div className="oi-m-tile__bottom">
        <div className="oi-m-tile__name">{name}</div>
        {stat && <div className="oi-m-tile__stat">{stat}</div>}
      </div>
    </button>
  );
}
