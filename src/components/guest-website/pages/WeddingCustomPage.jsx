/**
 * WeddingCustomPage — what a couple's own "New page" renders.
 *
 * Before this, a custom slug fell through `PAGE_COMPONENTS[page] ||
 * WeddingHomePage` and rendered the HOME PAGE under a different address. It
 * never got that far in practice, because the availability check dropped the
 * slug first and served "This invitation isn't available" — but the fallback
 * was the second thing wrong and would have been the visible one once the
 * first was fixed.
 *
 * A custom page renders its own title and its own blocks, through the same
 * UniverseBlocks renderer the home page uses (WeddingHomePage.jsx:822), so it
 * inherits every universe's typography and marks with no per-universe work.
 *
 * A BLANK PAGE RENDERS BLANK, deliberately. NewPageModal stores
 * `sections: []` and offers five templates that no renderer consumes; wiring
 * those to real layouts is a feature and is filed, not invented here. What a
 * couple gets today is a real, reachable, navigable page with their title on
 * it — which is what was missing.
 */
import React from 'react';
import GuestPageHeading from '../GuestPageHeading';
import UniverseBlocks from '../blocks/UniverseBlocks';
import { customPageFor } from '@/lib/customPages';

export default function WeddingCustomPage(props) {
  const { weddingDetails, theme, typography, universeConfig, currentPage } = props;
  const page = customPageFor(weddingDetails, currentPage);
  if (!page) return null;

  return (
    <div style={{ background: theme?.lightBg, color: theme?.lightText, minHeight: '60vh', padding: '64px 24px 96px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <GuestPageHeading
          title={page.name || page.slug}
          theme={theme}
          typography={typography}
          universeConfig={universeConfig}
          textColor={theme?.lightText}
        />
      </div>
      <UniverseBlocks
        blocks={page.blocks}
        weddingDetails={weddingDetails}
        theme={theme}
        typography={typography}
        universeConfig={universeConfig}
        editable={props.editable}
        onRequestInsert={props.onRequestInsert}
        onMoveBlock={props.onMoveBlock}
        onDeleteBlock={props.onDeleteBlock}
        onSelectBlock={props.onSelectBlock}
        selectedBlockId={props.selectedBlockId}
      />
    </div>
  );
}
