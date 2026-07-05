/**
 * TextureOverlay — barely-perceptible texture layer for universe dark sections.
 * Generalises the original C1 GrainOverlay.jsx into a token-addressed system
 * (TEXTURE_LIBRARY_SPEC.md C3 step 1): any of the 5 procedural textures can
 * render through this one component by id.
 *
 * Usage: render as the FIRST child of a `position: relative` dark container.
 * It sits at natural DOM order (below later siblings) with no explicit z-index,
 * so content stacks on top without any z-index wrangling. Single absolutely-
 * positioned, pointer-events:none overlay — one paint layer, no layout cost.
 *
 * Opacity resolves through the `--texture-opacity` CSS custom property (set
 * at the universe root by MultiPageWeddingWebsite.jsx), falling back to the
 * `opacity` prop, then to the texture's own calibrated default — exactly the
 * cascade the original --universe-grain-opacity var used, now generalised
 * across the whole library instead of being grain-only.
 */
import React from 'react';
import { getTexture } from '@/lib/textures';

export default function TextureOverlay({ textureId, opacity }) {
  const texture = getTexture(textureId);
  const fallbackOpacity = opacity ?? texture.defaultOpacity;

  return (
    <div
      aria-hidden="true"
      style={{
        position:         'absolute',
        inset:            0,
        pointerEvents:    'none',
        backgroundImage:  texture.backgroundImage,
        backgroundRepeat: 'repeat',
        backgroundSize:   texture.backgroundSize,
        opacity:          `var(--texture-opacity, ${fallbackOpacity})`,
      }}
    />
  );
}
