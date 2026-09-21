import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * A row inside a rounded card: circular icon tile, label (+ sub), value,
 * chevron. Renders a button when it has somewhere to go. `tile` picks the
 * tile color: default | primary | ink | neutral | tint | ok | warn.
 */
export default function Row({ icon: Icon, label, sub, value, to, onClick, chevron, tile = 'default', trailing, wrap = false, initials, children }) {
  const navigate = useNavigate();
  const pressable = !!(to || onClick);
  const showChevron = chevron ?? pressable;
  const Tag = pressable ? 'button' : 'div';
  const handle = () => { if (onClick) onClick(); else if (to) navigate(to); };
  return (
    <Tag type={pressable ? 'button' : undefined} className={`oi-m-row${pressable ? ' oi-m-row--pressable' : ''}`} onClick={pressable ? handle : undefined}>
      {(Icon || initials) && (
        <span className={`oi-m-row__tile${tile !== 'default' ? ` oi-m-row__tile--${tile}` : ''}`}>
          {Icon ? <Icon size={19} strokeWidth={1.75} /> : initials}
        </span>
      )}
      <div className="oi-m-row__body">
        {children || (
          <>
            <div className={`oi-m-row__label${wrap ? ' oi-m-row__label--wrap' : ''}`}>{label}</div>
            {sub && <div className="oi-m-row__sub">{sub}</div>}
          </>
        )}
      </div>
      {value != null && value !== '' && <span className="oi-m-row__value">{value}</span>}
      {trailing}
      {showChevron && <ChevronRight size={20} strokeWidth={1.75} className="oi-m-row__chevron" />}
    </Tag>
  );
}

/** Rows in a rounded white card. */
export function RowGroup({ children, style }) {
  return <div className="oi-m-card oi-m-card--flush" style={style}>{children}</div>;
}
