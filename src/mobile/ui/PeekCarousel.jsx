import React, { useRef, useState } from 'react';

/**
 * A horizontal row where the next card peeks in from the right, with dot
 * pagination. size: 'peek' (78%) | 'wide' (100%) | 'narrow' (62%).
 */
export default function PeekCarousel({ children, size = 'peek', dots = true }) {
  const items = React.Children.toArray(children);
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.firstElementChild) return;
    const w = el.firstElementChild.getBoundingClientRect().width + 12;
    setIndex(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / w))));
  };
  return (
    <div>
      <div className={`oi-m-peek${size === 'wide' ? ' oi-m-peek--wide' : size === 'narrow' ? ' oi-m-peek--narrow' : ''}`} ref={ref} onScroll={onScroll}>
        {items.map((child, i) => <div className="oi-m-peek__item" key={i}>{child}</div>)}
      </div>
      {dots && items.length > 1 && (
        <div className="oi-m-dots" aria-hidden="true">
          {items.map((_, i) => <span key={i} className={`oi-m-dots__dot${i === index ? ' oi-m-dots__dot--on' : ''}`} />)}
        </div>
      )}
    </div>
  );
}
