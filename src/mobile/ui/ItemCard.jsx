import React from 'react';
import SmartImage from './SmartImage';
import StatusPill from './StatusPill';

/**
 * An item that is its own rounded card, for lists that are browsed: a 72px
 * thumbnail or color tile on the left, title, one meta line, a key value
 * bottom left, one trailing action on the right edge. The whole card taps
 * through. See DESIGN_MOBILE.md, "Lists".
 *
 * props: image | icon (+ tile color), title, meta, value, badge/badgeTone,
 * action { icon, label, onClick, tone }, onClick
 */
export default function ItemCard({ image, alt = '', icon: Icon, tile = 'neutral', title, meta, value, badge, badgeTone = 'neutral', action, onClick, initials }) {
  // The card is a div: the tap-through is an invisible button stretched over
  // it, so the trailing action can be a real button too (no nested buttons).
  return (
    <div className={`oi-m-item${onClick ? ' oi-m-press oi-m-item--pressable' : ''}`}>
      {onClick && <button type="button" className="oi-m-item__hit" onClick={onClick} aria-label={typeof title === 'string' ? title : 'Open'} />}
      {image ? (
        <SmartImage src={image} alt={alt} width={72} height={72} className="oi-m-item__thumb" />
      ) : (
        <span className={`oi-m-item__thumb oi-m-item__thumb--tile oi-m-row__tile--${tile}`}>
          {Icon ? <Icon size={24} strokeWidth={1.75} /> : <span className="oi-m-item__initials">{initials}</span>}
        </span>
      )}
      <div className="oi-m-item__body">
        <div className="oi-m-item__title">{title}</div>
        {meta && <div className="oi-m-item__meta">{meta}</div>}
        {(value || badge) && (
          <div className="oi-m-item__foot">
            {value && <span className="oi-m-item__value">{value}</span>}
            {badge && <StatusPill tone={badgeTone}>{badge}</StatusPill>}
          </div>
        )}
      </div>
      {action && (
        <button
          type="button"
          className={`oi-m-item__action${action.tone === 'primary' ? ' oi-m-item__action--primary' : ''}`}
          aria-label={action.label}
          onClick={(e) => { e.stopPropagation(); action.onClick?.(); }}
        >
          <action.icon size={20} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

/** A column of ItemCards with the 12px gap. */
export function ItemList({ children }) {
  return <div className="oi-m-items">{children}</div>;
}
