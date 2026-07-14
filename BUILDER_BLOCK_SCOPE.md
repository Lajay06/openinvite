# Block builder scope — "freedom within beauty"

Ground truth for `feat/block-builder`, following the read-only scoping pass
done before this branch existed. Captured here so the plan survives the
session and the PR description can point at one place.

## Why not the old system

The pre-#92 section builder (`WBSectionRenderer.jsx`, `SectionWrap`,
`SectionTemplatePicker.jsx`, `pageSections`, `AvaAutoFillModal`'s
pageSections path, the `selectedSection`/`sectionPickerOpen` state in
`StudioWebsite.jsx`, and `SectionEditorPanel`/`SectionContentEditor` in
`WBRightPanel.jsx`) is fully orphaned — confirmed by grep: `PreviewContent`
in `StudioWebsite.jsx` is passed every section-related prop but its body
only destructures `{universeTheme, details, currentPage, onPageChange}` and
renders `RealWebsitePreview`, dropping the rest; the "Auto-fill with Ava"
button has no `onClick` at all. It also rendered off a flat
`{theme, typo, universeTheme}` prop shape with per-section manual style
overrides (`section.style.backgroundType/paddingY/textAlign`) — the opposite
of universe-native, and the reason it diverged from the published site in
the first place (the real pages never read `pageSections`). This PR deletes
it rather than resurrecting it.

## Hard constraint

Published site (`MultiPageWeddingWebsite.jsx`), builder canvas
(`StudioWebsite.jsx` → `RealWebsitePreview`), and full-screen preview
(`FullScreenPreview.jsx` → `RealWebsitePreview`) must stay the same render
tree. Blocks are therefore rendered *inside* the real page components
(`WeddingHomePage.jsx` etc.), via a small dispatcher those components import
— not a sibling tree fed the same data independently. Any approach that
needs a second renderer is out.

## Block model

Additive `blocks` array nested inside the *existing* per-page content
objects (`homeContent`, `ourStoryContent`, `celebrationContent` for v1) —
these are already registered on Base44 as open, schema-less objects, so no
schema change is needed. Existing named fields (`tagline`, `storyText`,
`photos`, `milestones`, …) are untouched; blocks render as additional
content, so a wedding with no `blocks` array (every existing wedding today)
renders exactly as before.

```
pageContent.blocks: Array<{
  id: string,            // 'blk_' + timestamp
  type: 'heading' | 'paragraph' | 'photo' | 'gallery' | 'quote' | 'spacer',
  order: number,
  content: { ... type-specific, see UniverseBlocks.jsx },
}>
```

## Universe inheritance

Every block always resolves `theme` (colours) and `typography` (fonts)
from the same `resolveColors`/`resolveTypography` the real page components
already use — non-negotiable, this is what makes a block "look Aman" vs
"look Marrakech" by construction, not by the couple's choice. On top of
that, two block types get a genuine per-universe *shape* accent, reusing
already-built primitives from `src/components/guest-website/layouts/`
(one implementation each, not reimplemented):

- `spacer` (divider) — HairlineRule / ZelligeDivider / VerticalRule+EnsoRing /
  TicketStub / WaveDivider / CitrusScallop / VineRule / CubeBlock, keyed off
  `universeConfig.layout`, tinted with `theme.accent`.
- `heading`'s optional kicker — the matching `*SectionMark`/
  `EditorialSectionKicker` component, same keying.

No per-block manual style override (no couple-chosen background/colour) —
that's the "free-form" escape hatch the old system had and this
deliberately doesn't.

## Pages wired in v1

`home`, `our-story`, `celebration` — the three general-purpose content
pages. RSVP/registry/music/photos/etc. keep their existing dedicated
editors and are not touched.
