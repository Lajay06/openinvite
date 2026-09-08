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
 * A BLANK PAGE RENDERS BLANK, deliberately. NewPageModal offers five
 * templates that no renderer consumes; wiring those to real layouts is a
 * feature and is filed, not invented here. In the builder a blank page is not
 * empty though — UniverseBlocks renders its insert affordance whenever
 * `editable`, so the page opens asking to be filled.
 *
 * THE BLOCKS COME FROM `customPageContent`, keyed by slug, not from the page
 * record. `page.blocks` could never have persisted: `customPages` declares its
 * item `properties`, and Base44 strips every key such a schema does not name.
 * See customPageBlocks in lib/customPages.js.
 */
import React from 'react';
import GuestPageHeading from '../GuestPageHeading';
import UniverseBlocks from '../blocks/UniverseBlocks';
import { customPageFor, customPageBlocks } from '@/lib/customPages';

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
        blocks={customPageBlocks(weddingDetails, currentPage)}
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
