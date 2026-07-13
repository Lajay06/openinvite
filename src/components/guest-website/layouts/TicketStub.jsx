/**
 * TicketStub — the "brooklyn-offgrid" layout's signature motif: a bold
 * solid accent block with a perforated tear-line edge, like a gig-poster
 * ticket stub. Generated purely with CSS (a repeating radial-gradient
 * cutting notches along one edge) — no image asset. Bold and graphic,
 * the deliberate opposite of the other universes' quiet woven/bare-line
 * marks: Brooklyn's restraint is structural (off-grid asymmetry, a lot of
 * flat colour) rather than textural.
 */
import React from 'react';

export default function TicketStub({ color = '#000000', width = 64, height = 10, notchSize = 5, style, className }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width,
        height,
        backgroundColor: color,
        backgroundImage: `radial-gradient(circle at 0 50%, transparent ${notchSize}px, ${color} ${notchSize}px)`,
        backgroundSize: `${notchSize * 2.4}px 100%`,
        backgroundRepeat: 'repeat-x',
        ...style,
      }}
    />
  );
}
