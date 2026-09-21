import React, { useRef, useState } from 'react';

/**
 * A horizontal row with dot pagination. size: 'peek' (78%, the next card
 * peeks in from the right) | 'narrow' (62%) | 'wide' (a sliver of the next
 * card) | 'full' (one card fills the view, nothing peeks, one card per
 * swipe; the Home hero).
 */
export default function PeekCarousel({ children, size = 'peek', dots = true }) {
  const items = React.Children.toArray(children);
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.firstElementChild) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 12;
    const w = el.firstElementChild.getBoundingClientRect().width + gap;
    setIndex(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / w))));
  };
  return (
    <div>
      <div className={`oi-m-peek${size === 'wide' ? ' oi-m-peek--wide' : size === 'narrow' ? ' oi-m-peek--narrow' : size === 'full' ? ' oi-m-peek--full' : ''}`} ref={ref} onScroll={onScroll} role="region" aria-roledescription="carousel" aria-label={`${items.length} items`}>
        {items.map((child, i) => <div className="oi-m-peek__item" key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`}>{child}</div>)}
      </div>
      {dots && items.length > 1 && (
        <div className="oi-m-dots" aria-hidden="true">
          {items.map((_, i) => <span key={i} className={`oi-m-dots__dot${i === index ? ' oi-m-dots__dot--on' : ''}`} />)}
        </div>
      )}
    </div>
  );
}
