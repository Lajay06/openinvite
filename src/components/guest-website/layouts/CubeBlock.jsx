/**
 * CubeBlock — the "mykonos-whitewash" layout's signature motif: a plain
 * solid rectangular block of the deep cobalt accent, no line, no pattern
 * — a literal architectural cube standing in the composition's negative
 * space. Mykonos's restraint is structural (a lot of white, one solid
 * colour block) rather than textural, the same way Brooklyn's is
 * structural rather than woven — but a Brooklyn TicketStub is a bold
 * rule with a torn edge; a CubeBlock is a plain, whitewashed-architecture
 * solid, no edge treatment at all.
 */
import React from 'react';

export default function CubeBlock({ color = '#000000', width = 56, height = 56, style }) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height, backgroundColor: color, flexShrink: 0, ...style }}
    />
  );
}
