import React from 'react';
import SmartImage from './SmartImage';
import StatusPill from './StatusPill';

/** Photo on top (16px) and the title, with an optional sentence-case status badge on the photo. No secondary line: image cards carry their title only (goal 4); a `line` passed by a caller is ignored. */
export default function ImageCard({ image, alt = '', title, badge, badgeTone = 'light', onClick, ratio = '4/3', width = 280 }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`oi-m-imgcard${onClick ? ' oi-m-press' : ''}`} onClick={onClick}>
      {badge && <span className="oi-m-imgcard__badge"><StatusPill tone={badgeTone}>{badge}</StatusPill></span>}
      <SmartImage src={image} alt={alt} width={width} ratio={ratio} />
      <div className="oi-m-imgcard__body">
        <div className="oi-m-imgcard__title">{title}</div>
      </div>
    </Tag>
  );
}
