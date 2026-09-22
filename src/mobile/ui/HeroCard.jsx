import React from 'react';
import SmartImage from './SmartImage';
import PillButton from './PillButton';

/**
 * Full width, 4:5, photo with scrim, small label, big title or number, one
 * pill. `number` renders in the 56px hero figure. Without a photo it is an
 * ink panel, so nothing is ever blank. The photo is a still (goal 6): no
 * parallax, no scale.
 */
export default function HeroCard({ image, alt = '', label, title, number, sub, action, onAction, short = false, topRight, children, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`oi-m-hero${short ? ' oi-m-hero--short' : ''}${onClick ? ' oi-m-press' : ''}`} onClick={onClick}>
      <SmartImage src={image} alt={alt} width={360} ratio={short ? '4/3' : '4/5'} square eager tone="ink" />
      <div className="oi-m-hero__scrim" />
      {topRight && <div className="oi-m-hero__top">{topRight}</div>}
      <div className="oi-m-hero__body">
        {label && <div className="oi-m-hero__label">{label}</div>}
        {number != null && <div className="oi-m-hero-num">{number}</div>}
        {title && <div className="oi-m-hero__title">{title}</div>}
        {sub && <div className="oi-m-body oi-m-on-dark-2">{sub}</div>}
        {children}
        {action && <PillButton variant="light" size="sm" onClick={(e) => { e.stopPropagation(); onAction?.(); }}>{action}</PillButton>}
      </div>
    </Tag>
  );
}
