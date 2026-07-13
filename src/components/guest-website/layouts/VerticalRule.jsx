/**
 * VerticalRule — the vertical counterpart to HairlineRule, used by the
 * "kyoto-vertical" layout as the spine that reinforces its vertical rhythm
 * (couple names stacked line over line, an asymmetric column against vast
 * negative space) — still a bare, unpatterned line, just oriented along
 * the axis this layout actually composes on.
 */
import React from 'react';

export default function VerticalRule({ color = '#000000', opacity = 0.2, height = 64, thickness = 1, style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: thickness,
        height,
        backgroundColor: color,
        opacity,
        ...style,
      }}
    />
  );
}
