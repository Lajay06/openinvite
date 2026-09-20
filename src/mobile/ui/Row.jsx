import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Account-style row: icon tile, label (+ optional sub line), value, chevron.
 * Renders a button when it has somewhere to go, a plain div otherwise.
 */
export default function Row({ icon: Icon, label, sub, value, to, onClick, chevron, tile = 'default', trailing, children }) {
  const navigate = useNavigate();
  const pressable = !!(to || onClick);
  const showChevron = chevron ?? pressable;
  const Tag = pressable ? 'button' : 'div';
  const handle = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };
  return (
    <Tag
      type={pressable ? 'button' : undefined}
      className={`oi-m-row${pressable ? ' oi-m-row--pressable' : ''}`}
      onClick={pressable ? handle : undefined}
    >
      {Icon && (
        <span className={`oi-m-row__tile${tile === 'primary' ? ' oi-m-row__tile--primary' : ''}`}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      {children ? (
        <div className="oi-m-row__body">{children}</div>
      ) : (
        <div className="oi-m-row__body">
          <div className="oi-m-row__label">{label}</div>
          {sub && <div className="oi-m-row__sub">{sub}</div>}
        </div>
      )}
      {value != null && value !== '' && <span className="oi-m-row__value">{value}</span>}
      {trailing}
      {showChevron && <ChevronRight size={20} strokeWidth={1.75} className="oi-m-row__chevron" />}
    </Tag>
  );
}
