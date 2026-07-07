import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function BulletList({ items, textColor, hairline }) {
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={item}
          style={{
            padding: '14px 0',
            borderBottom: i < items.length - 1 ? `1px solid ${hairline}` : 'none',
            fontFamily: PJS, fontSize: 16, fontWeight: 600, color: textColor, opacity: 0.85,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
