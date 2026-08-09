# Marketing lane — shared-component claims

Claims are held while a PR is open and released when it merges. A claim means
this lane is MODIFYING the component, not just consuming it.

## Open

- **MarketingHero** — adding an optional `copyBand` prop (soft scrim behind the
  hero copy only, replacing the full-height gradient for pages that opt in).
  Claimed for the /tour hero work. Default is off, so every other consumer
  (About, Ava, Features, Gifting, Pricing, Universes) keeps its current
  full-height gradient and renders byte-identically.

## Released

- **MarketingEndCap** — `scrim` prop (#334), `cta` prop (#351), container
  `maxWidth` 900 -> 1320 (#356).
- **MarketingHero** — `srcSet` / `sizes` props (#360).
