import React from 'react';
import { useCountUp } from './motion';

/** Half-width: circular icon, label, big number. `number` may be a string (money). */
export default function StatCard({ icon: Icon, label, number, numeric, prefix = '', suffix = '', sub, ink = false, onClick }) {
  const [count, ref] = useCountUp(typeof numeric === 'number' ? numeric : 0, { enabled: typeof numeric === 'number' });
  const Tag = onClick ? 'button' : 'div';
  const shown = typeof numeric === 'number' ? `${prefix}${count.toLocaleString('en-US')}${suffix}` : number;
  return (
    <Tag type={onClick ? 'button' : undefined} className={`oi-m-stat${ink ? ' oi-m-stat--ink' : ''}${onClick ? ' oi-m-press' : ''}`} onClick={onClick} ref={ref}>
      {Icon && <span className="oi-m-stat__icon"><Icon size={18} strokeWidth={1.75} /></span>}
      <div>
        <div className="oi-m-meta">{label}</div>
        <div className={`oi-m-stat__num${String(shown).length > 7 ? ' oi-m-stat__num--long' : ''}`}>{shown}</div>
        {sub && <div className="oi-m-meta" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
    </Tag>
  );
}
