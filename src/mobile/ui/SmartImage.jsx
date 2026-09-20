import React, { useState } from 'react';
import { deliver, srcSetFor } from '../lib/images';

/**
 * A photo slot that is never broken or empty. Reserves its aspect ratio,
 * shows a tinted placeholder while loading, lazy loads below the fold, and
 * delivers Cloudinary at the slot's size for 2x and 3x screens. With no
 * `src` it renders the placeholder alone (a colour panel), so the caller
 * never has to branch.
 *
 * props: src, alt (required), width (CSS px of the slot), ratio ('4/5', '16/9',
 * '1/1'), square (no radius, for use inside a hero), eager, style, className
 */
export default function SmartImage({ src, alt = '', width = 360, height, ratio, square = false, eager = false, style, className = '', tone = 'sand' }) {
  const [state, setState] = useState('loading');
  const h = height || (ratio ? Math.round(width / ratioNumber(ratio)) : undefined);
  const ok = !!src && state !== 'error';
  return (
    <div
      className={`oi-m-img${ok && state === 'loaded' ? ' oi-m-img--loaded' : ''}${square ? ' oi-m-img--square' : ''} ${className}`}
      style={{ aspectRatio: ratio ? ratio.replace('/', ' / ') : undefined, background: tone === 'ink' ? 'var(--m-ink)' : tone === 'blush' ? 'var(--m-blush)' : 'var(--m-sand)', ...style }}
      aria-label={!ok ? alt : undefined}
      role={!ok && alt ? 'img' : undefined}
    >
      {ok && (
        <img
          className="oi-m-img__el"
          src={deliver(src, { width, height: h, dpr: 2 })}
          srcSet={srcSetFor(src, { width, height: h })}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      )}
    </div>
  );
}

function ratioNumber(r) {
  const [a, b] = String(r).split('/').map(Number);
  return a && b ? a / b : 1;
}
