import React, { useRef, useState } from 'react';

/**
 * A horizontal row where the next card peeks in from the right, with dot
 * pagination. Each child is one card.
 */
export default function PeekCarousel({ children }) {
  const items = React.Children.toArray(children);
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.firstElementChild) return;
    const w = el.firstElementChild.getBoundingClientRect().width + 8;
    setIndex(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / w))));
  };
  return (
    <div>
      <div className="oi-m-peek" ref={ref} onScroll={onScroll}>
        {items.map((child, i) => (
          <div className="oi-m-peek__item" key={i}>{child}</div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="oi-m-dots" aria-hidden="true">
          {items.map((_, i) => (
            <span key={i} className={`oi-m-dot${i === index ? ' oi-m-dot--on' : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
