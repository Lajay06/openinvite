import React from 'react';

/** Flat loading blocks. kind: 'text' | 'title' | 'row' | 'block' | 'hero' */
export function Skeleton({ kind = 'text', width, style }) {
  return <div className={`oi-m-skel oi-m-skel--${kind}`} style={{ width, ...style }} aria-hidden="true" />;
}

export function SkeletonRows({ count = 4 }) {
  return (
    <div className="oi-m-card oi-m-card--flush" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="oi-m-row" style={{ gap: 12 }}>
          <Skeleton kind="circle" style={{ width: 40, height: 40 }} />
          <div className="oi-m-row__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton kind="text" width="60%" />
            <Skeleton kind="text" width="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
