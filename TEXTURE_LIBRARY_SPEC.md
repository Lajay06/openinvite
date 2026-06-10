# Openinvite — Universe Texture Library (C3) Spec

*Design + technical spec for the 10-texture system that gives each universe material depth.
Roadmap item C3, building on C1 (grain tune, shipped) and gated behind C2 (section-level
texture). This is a reference doc — not a prompt. Build prompts get written per-slice on
return, one PR each, verify live before merge.*

---

## Purpose

WithJoy has 600 flat templates. We have 10 immersive worlds. Texture is one of the three
things that makes a world feel like a world (texture, motion, coordinated assets). This
spec defines the texture half so it's built once, correctly, instead of grown ad-hoc.

Aman is the flagship: every pattern proves on Aman first, then scales to the other
universes (working rule #7).

---

## The core architecture decision

**Two rendering systems behind one token interface.**

Some textures can be generated procedurally (SVG/CSS noise and patterns — tiny payload,
infinitely tunable, no assets). Others genuinely cannot: convincing marble veining or
suede nap requires real tileable imagery. Pretending otherwise produces ten variations
of noise filters cosplaying as marble.

So:

- **Procedural textures** — SVG `feTurbulence` / CSS-generated, inline or data-URI.
  Zero network cost, intensity tuned by opacity.
- **Image textures** — tileable assets hosted on **Cloudinary** (cloud: dsr84xknv),
  applied as repeating backgrounds, intensity tuned by overlay opacity.

Both are addressed identically by the rest of the system: a texture **token** —
`{ texture_id, intensity }`. Nothing outside the texture layer knows or cares which
rendering system a texture uses. This is what lets us add/swap textures later without
touching the builder or the universes.

---

## The library (10)

| id | Name (UI label) | System | Notes |
|---|---|---|---|
| `grain` | Grain | Procedural | Exists today (C1). Becomes token #1; its tuned barely-there value is the reference intensity for the whole library. |
| `linen` | Linen | Procedural | Fine cross-hatch weave. SVG pattern. |
| `plaster` | Plaster | Procedural | Soft mottled variation, lower frequency than grain. |
| `paper` | Paper | Procedural | Subtle fibre noise, slightly warmer than grain. |
| `canvas` | Canvas | Procedural | Coarser weave than linen. |
| `stone` | Stone | Image | Honed stone, matte. Tileable. |
| `marble` | Marble | Image | Veining must not visibly repeat — large tile (~1024px+), seamless. The hardest asset; source carefully. |
| `leather` | Leather | Image | Fine pebble grain, matte, no specular shine. |
| `suede` | Suede | Image | Soft nap, very low contrast. Risks reading as "dirty blur" at low quality — needs a good source asset. |
| `silk` | Silk | Image | Subtle sheen banding. Lowest default intensity of the set — silk shouts fastest. |

5 procedural + 5 image. Swappable later because of the token interface.

---

## Intensity model

Carries forward the C1 pattern: one CSS custom property per scope.

- `--texture-id` and `--texture-opacity` set at the **universe root** (default for the
  whole site) — extends the `--universe-grain-opacity` variable created in the C1 PR.
- When C2 lands, the same two properties can be overridden at the **section root**, so a
  section can vary or disable texture. Cascade does the work; no JS.
- Intensity is a 0–1 opacity on the texture layer. Default per texture is calibrated so
  every texture at default reads *barely-there* — the C1 standard: visible on close
  inspection of flat areas, invisible at a glance. Image textures will typically sit even
  lower than procedural ones (real imagery reads stronger at equal opacity).
- Builder exposes intensity as a simple Subtle / Medium / Strong choice mapping to
  calibrated values per texture — not a raw slider. Couples shouldn't tune opacity
  decimals; that's our job.

**Discipline (from the font-bug scar):** all texture selectors scoped under the universe
root (`.wb-guest-root` discipline). No global selectors, no `!important`. Texture must
never bleed into the dashboard, builder chrome, or marketing site.

---

## Cloudinary asset requirements (the 5 image textures)

- Tileable/seamless, greyscale or near-greyscale (colour comes from the universe palette
  underneath, not the texture asset — keeps one asset usable across all 10 universes).
- Marble: large tile, ≥1024px, veining non-repeating at typical viewport widths.
  Others: 512px tiles acceptable.
- Delivered via Cloudinary transforms: `f_auto,q_auto`, width-capped. Target **≤ ~80KB**
  per texture as served. One texture asset per page load (the active one) — never load
  the library.
- Upload under a predictable folder: `openinvite/textures/{id}.jpg` so the token maps
  to the URL mechanically.
- Sourcing: licence-clean texture sources or generated. No rips from texture sites with
  unclear licences — this is a commercial product.

## Performance budget

- Procedural: effectively free (inline SVG data-URIs).
- Image: one cached, compressed tile per published page. No measurable LCP impact at
  ≤80KB with `q_auto`. The texture layer is a single absolutely-positioned overlay
  (`pointer-events: none`), not per-element backgrounds — one paint layer, no layout cost.
- Mobile: same system; consider halving default opacity on small screens where texture
  reads stronger per pixel. Decide during Aman calibration, not in the abstract.

---

## How it reaches couples (builder)

- Texture lives under the **Universe** controls (per the Phase 1 builder IA — universe
  as banner, B1). Each universe ships with a **default texture + intensity** chosen by
  us as part of its world identity (Aman = grain; assign the rest during build).
- Couples can change texture and intensity (Subtle/Medium/Strong) — a refinement of the
  world, not a 600-template free-for-all. Ten worlds × tasteful texture variation is
  depth; arbitrary combinations is WithJoy's flatness with extra steps.
- Per-section override arrives with C2 and reuses the same token — no new UI concept.

---

## Build sequence (return runway — each line ≈ one PR, verify live)

1. **Token plumbing (procedural-only).** Texture token at universe root; implement the
   5 procedural textures; migrate the existing grain to token #1. Aman only. No builder
   UI yet — switch by changing the stored value. *Proves the architecture cheaply.*
2. **Image pipeline.** Source + upload the 5 Cloudinary assets; implement the image
   renderer behind the same token; calibrate each default intensity on Aman against the
   C1 barely-there standard. Verify payload ≤ budget in the Network tab.
3. **Builder control.** Texture picker + Subtle/Medium/Strong in the universe controls.
   *Gated on Phase 1 builder IA (B1) — do not build this control into the old panel.*
4. **Per-section override.** Lands with/after C2, reusing the token via section-root
   override.
5. **Scale to the other 9 universes.** Assign each universe its default texture +
   intensity as a deliberate art-direction pass (one PR can cover assignment; it's data,
   not code).

Dependency note: 1–2 are independent of the builder redesign and could start any time.
3 waits for Phase 1. 4 waits for C2. This is consistent with the roadmap's ordering —
the *system* can be built early; the *controls* wait for the IA.

---

## Open items to settle during build (not blockers now)

- Final default texture per universe (art-direction pass, step 5).
- Whether mobile gets a global intensity reduction (decide on Aman, step 2).
- Marble asset sourcing — the one asset worth real effort; bad marble is worse than
  no marble.

---

*Status: spec agreed on paper. Slots into the roadmap as the C3 definition; C1 shipped,
C2 still gates per-section work. On return: this doc + SMART_RSVP_MODEL.md are the two
build runways; sequence against each other then (RSVP PR 1 was flagged as day-one).*
