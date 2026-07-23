# Marketing site image manifest

*Tracks every Cloudinary asset used on the marketing site so no photo appears
twice across the whole site. Cloud: `dsr84xknv`. Update this file in the same
commit as any change that adds, removes, or moves a marketing-site image.*

Folders in the account (as of this audit): Amalfi, Couple (87), Cultural (1),
Food (32), Invite Textures (24), Jackson (2), Jaipur (2), Kyoto (1), Launch
(37 — placeholder couple, "Bandits" shoot by Pali Mendez), Marrakech (4),
Paris (1), Party (29), Planning (38), Relax (13), Texture (11), Tulum (10),
Universe (5). Amalfi is empty. Most single-universe-named folders (Kyoto,
Paris, Marrakech, Tulum) have only 1-10 photos — not enough for a dedicated
photo per universe, so most of the 20 universes draw from the large generic
pools (Couple/Food/Party/Planning/Relax) instead.

## Already in use before this overhaul (baseline — do not reassign)

| public_id | Folder | Used on |
|---|---|---|
| `DTS_Remote_Studio_Tino_Renato_Photos_ID3726_vgcgmv` | Planning | Home (ScrollMorph ring) |
| `DTS_Fall_Dinner_Kristine_Isabedra_Photos_ID2915_pqoldr` | Food | Home (ScrollMorph ring) |
| `DTS_Weirdly_Ever_After_Agustín_Farías_Photos_ID8960_nspx4l` | Couple | Home (ScrollMorph ring) |
| `jeffrey-clayton-KFtKSReIoRs-unsplash_qhubdf` | Couple | Home (ScrollMorph ring) |
| `justin-follis-A7Um4oi-UYU-unsplash_bbjjam` | Couple | Home (ScrollMorph ring) |
| `alok-verma-ARLh7m5S4VA-unsplash_eslg13` | Couple | Home (ScrollMorph ring) |
| `DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa` | Planning | Home (ScrollMorph ring) |
| `DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d` | Relax | Home (ScrollMorph ring) |
| `DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0` | Relax | Home (ScrollMorph ring) |
| `DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx` | Planning | Home (ScrollMorph ring) |
| `DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID6161_isrtef` | Planning | Home (ScrollMorph ring) |
| `DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID6784_fveq2c` | Party | Home (ScrollMorph ring) |
| `DTS_In_Focus_Daniel_Farò_Photos_ID5015_deiknt` | Texture | Universes.jsx hero |
| `DTS_PLAYER_TWO_JELLY_LUISE_Photos_ID13458_a53qq3` | Planning | Home (ScrollMorph ring) |
| `DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID3470_knfncz` | Texture | Home (ScrollMorph ring) |
| `DTS_Grand_Design_Daniel_Farò_Photos_ID4152_auimyj` | Couple | Home (ScrollMorph ring) |
| `kiet-trinh-L5gTFp1iGHE-unsplash_lpjp5z` | Couple | Home (ScrollMorph ring) |
| `DTS_Remote_Studio_Tino_Renato_Photos_ID3722_copy_qbcgts` | Planning | Home (ScrollMorph ring) |
| `aditya-gautama-putra-k0tGYZ6Xbhg-unsplash_z5r24i` | Couple | Home (ScrollMorph ring) |
| `rio-syhputra-a7vmvXei7fE-unsplash_vojinz` | Couple | Home (ScrollMorph ring) |
| `nicolo-salinetti-FiGEvsSG4vU-unsplash_ai9pim` | Universe | Universes.jsx — Capri |
| `alex-boyd-HhFi1gKYosc-unsplash_*` (prtm0n on-site; folder copy is `_oe7e8n`, same source photo, different upload) | Paris | Universes.jsx — Paris |
| `alex-bertha-Jyg7xHRmXiU-unsplash_ypu0wy` | Universe | Universes.jsx — Tulum |
| `anne-laure-p-PbemriYGLoQ-unsplash_*` (rgyetw on-site; folder copy is `_qssibt`, same source photo, different upload) | Kyoto | Universes.jsx — Kyoto |
| `manuel-moreno-DGa0LQ0yDPc-unsplash_nbgivs` | Universe | Universes.jsx — London |

`ScrollMorphSection.jsx`'s "So, why us?" ring (20 wixstatic-hosted images) is
being replaced entirely in this overhaul (task 1) — those wixstatic URLs are
not part of this manifest since they're leaving the site, but the Cloudinary
ones just above are already live elsewhere and must not be reused.

Hero images (per standing instruction, kept as-is, not reassigned):
`HeroCollage.jsx` imagery is out of scope for this pass.

## Newly assigned in this overhaul

| public_id | Folder | Used on |
|---|---|---|
| `DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2677_e2cw9w` | Party | Home — features scroll, card 1 (Guest management) |
| `DTS_Ceramic_Daniel_Farò_Photos_ID3766_gipmok` | Planning | Home — features scroll, card 2 (Budget & registry) |
| `DTS_Weekend_Brainstorm_Kristine_Isabedra_Photos_ID2889_etg9ko` | Planning | Home — features scroll, card 3 (Planning & schedule) |
| `DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj` | Food | Home — features scroll, card 4 (Vendors) |
| `DTS_Tradition_Chris_Abatzis_Photos_ID9180_eg2nbh` | Couple | Home — features scroll, card 5 (Style & experience) |
| `tim-oun-n4Qtylea9-M-unsplash_elfx1q` | Universe | Home — features scroll, card 6 (Universes) |
| `DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3565_ys7asa` | Relax | Home — features scroll, card 7 (Guest suite) |

Note: the old `HorizontalScrollSection.jsx` cards used 5 `static.wixstatic.com`
URLs (not this manifest's concern — being retired, not reused) plus a hacky
render-time override that relabelled the "Digital Invitations" card as
"Universes". Replaced with 7 honest cards, real Cloudinary photos, no
runtime title swap.

| `DTS_Quiet_Glamour_DTS_Studio_Photos_ID8355_zhr0xb` | Food | Universes.jsx grid — London fallback (only universe with no dedicated `/universes/*.jpg`, renamed from Aman for trademark caution) |

Universes.jsx's grid (all 20 worlds) otherwise uses the pre-existing local
`public/universes/{id}.jpg` photography (already the app's own canonical
per-universe images, used in the real Design Studio picker) — not Cloudinary,
and not part of this no-repeat audit since each is already dedicated to
exactly one universe.

| `DTS_SILVER_HOUR_Franco_Dupuy_Photos_ID14690_mjiupn` | Couple | About.jsx — "every kind of love" full-bleed |
| `DTS_LEAP_Shauna_Summers_Photos_ID7601_k27hx3` | Party | About.jsx — photo pair, left |
| `DTS_Like_a_Movie_Foster___Asher_Photos_ID1041_mudxwa` | Couple | About.jsx — photo pair, right |
| `DTS_la_calma_Parole_Dure_Photos_ID5853_haflhv` | Relax | About.jsx — full-bleed before stats |

**Cohesion sweep (task 9):** Features.jsx's dead "Invitations x Guest Suite"
section (`InvitationsSection` — was `return null;`, rendering nothing) was
revived with real copy and the local `/universes/marrakech.jpg` (same
canonical per-universe asset used on the Universes grid — not a Cloudinary
pick, not part of the no-repeat pool, appropriate to reference again as "here's
what a universe looks like").

**Finding, not a straight "move":** About.jsx's original 4 photos (`photoU`,
`photoAbout1/2/3` in `photos.js`, all `static.wixstatic.com`) turned out to
be generic off-brand lifestyle/fashion stock on inspection (a cocktail
glass, a nightclub tinsel portrait, street fashion, a hotel-bathroom scene)
— none depicted a couple or a wedding. Promoting them to Home/Features as
instructed would have hurt cohesion rather than helped it, so instead:
About's 4 slots got fresh, on-theme Cloudinary photography (the older
couple walking arm in arm is a genuinely strong match for the page's own
"every kind of couple" copy), and the 4 wixstatic images were retired
outright rather than moved — they were never "good imagery," just unused
now. `photos.js`'s `photoU`/`photoAbout1`/`photoAbout2`/`photoAbout3` keys
are now dead (left in place; not otherwise referenced) — candidate for the
cohesion-sweep cleanup pass.

## Round 2 (marketing feedback pass)

| public_id | Folder | Used on |
|---|---|---|
| `/universes/kyoto.jpg` (local, not Cloudinary) | — | Home — ScrollExpandMedia background behind the universe-choosing video moment |
| `DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID3470_knfncz` | Texture | Home — features carousel, card 6 (Digital invitations, backfilled after removing the Universes card — see below) |

Not part of the no-repeat pool — same canonical per-universe local asset
already used on the Universes.jsx grid, reused deliberately here (same
precedent as Features.jsx's `marrakech.jpg` reuse above: "here's a real
universe" is the point, not a violation).

`scripts/audit-image-repeats.mjs` (`npm run audit:images`) now checks this
automatically instead of relying solely on this hand-maintained log —
see that file's header comment for what it catches and why the manifest
alone missed the FeatureGuests.jsx repeated-photo bug.

## Round 3 (owner feedback pass)

| public_id | Folder | Used on |
|---|---|---|
| `manuel-moreno-DGa0LQ0yDPc-unsplash_nbgivs` | Universe | Features.jsx — Quick Start section (replaces the cocktail-glass photo, which was also FeatureBudget.jsx's photo — a real duplicate reached through `PHOTOS.photoM` that the URL-literal-only audit had missed) |

Freed up rather than picked fresh: previously the Aman universe's stock
photo on Universes.jsx, orphaned once that page switched to local
`/universes/*.jpg` canonical photography. Confirmed unused anywhere else
in `src/` before reassigning. `photoM` and `photoO` removed from
`src/lib/photos.js` (both dead); `TryItSection.jsx` deleted (dead code —
not imported anywhere — rather than left as an unrendered duplicate of
FeatureGuests.jsx's photo). `scripts/audit-image-repeats.mjs` updated to
resolve `PHOTOS.key` references against `photos.js`, so a dictionary-
reached duplicate like this one won't need a human to catch it next time.

Home's new UniverseTeaserSection reuses 4 universes' own canonical
`imageUrl` (Tulum, Kyoto, Capri, Paris — same UNIVERSE_CATALOG entries
Universes.jsx renders) as a small preview row. Same precedent as the
Kyoto/Marrakech reuse above: the app's own per-universe photography,
deliberately shown again as "here's a taste of the range," not a
no-repeat violation. Not caught by `audit-image-repeats.mjs` (the URLs
are resolved at runtime from `UNIVERSE_CATALOG`, not literal strings in
source) — a known limitation, acceptable here since the reuse is
intentional and documented.

## Round 4 (Aman → London rename)

The Aman universe was renamed to London (trademark caution — Aman is a
real luxury hotel brand). No dedicated London photography exists (same
gap Aman had — it never got one either); the same `DTS_Quiet_Glamour`
fallback above stays in place, now keyed to `london` instead of `aman`
everywhere it's referenced (`Universes.jsx`'s `FALLBACK_IMAGE`,
`OnboardingStepUniverse.jsx`'s universe list). Flagged for real London
photography (grand, classical, city-elegant) when available.

Also fixed in passing: `OnboardingStepUniverse.jsx`'s old Aman entry
pointed at an unrelated Wix-hosted desert/countryside couple photo
(`d2df22_8e79926ce6c74e55aa7ee84c8a8be77c`), not a London or even an
Aman-appropriate image — a pre-existing mismatch, now pointed at the
same Cloudinary fallback as everywhere else.

## Round 5 (marketing round 4 — photo swaps)

Checked already-uploaded Cloudinary assets (Admin API, cloud `dsr84xknv`)
against this manifest's used-list before assigning any of these, to keep
the no-repeat rule real rather than assumed.

| public_id | Folder | Used on |
|---|---|---|
| `DTS_BY_WATER_Daniel_Farò_Photos_ID7930_auruje` | Couple | Contact.jsx hero (replaces a Wix-hosted generic photo) |
| `DTS_INFLUENCER_Daniel_Farò_Photos_ID8195_hcbnri` | (unfoldered) | Features.jsx — Quick Start section (replaces `manuel-moreno-...`, itself freed up by Aman's rename — see Round 3/4 above) |
| `DTS_SOJOURN_Franco_Dupuy_Photos_ID10730_je7niq` | (unfoldered) | FeatureGuests.jsx — Advanced guest management (replaces a Wix-hosted photo) |

`manuel-moreno-DGa0LQ0yDPc-unsplash_nbgivs` (previously Quick Start) and
the Contact.jsx hero's old Wix URL are now unused anywhere in `src/`.
FeatureGuests.jsx's old Wix URL (`d2df22_b014095a4e4f42a9a415f314cad6b260`)
still has one reference left, in `src/pages/ScrollMorph.jsx` — that page
isn't registered in `pages.config.js` or linked from anywhere live
(pre-existing orphaned code, not part of this pass), so it's not a real
no-repeat conflict, just noting it rather than silently overclaiming
"fully unused."

## Round 6 (marketing round 4 follow-ups)

| public_id | Folder | Used on |
|---|---|---|
| `alex-plesovskich-VPrTqd8B230-unsplash_gwgyej` | Universe | UniverseMiniHero.jsx — homepage full-bleed photo moment (was uploaded but never referenced anywhere; confirmed via Admin API against this manifest before assigning) |
| `DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3` | Couple | FullBleedPhotoCTA.jsx — "Your wedding deserves this." (replaces a base44.com-proxied copy of `DTS_Modern_Home_Rob_Christain_Crosby_Photos_ID3654`, itself freed up back in Round 3; ID1042 is a different, previously-unused sibling shot from ID1041, already used on About.jsx) |
| `asso-myron-aOWUqj5vuOE-unsplash_yptsz1` | (unfoldered) | Contact.jsx — merged hero (photo + heading now one component; was uploaded but never referenced) |

`manuel-moreno-DGa0LQ0yDPc-unsplash_nbgivs` (Universe folder) is unused
again after Round 5 moved Quick Start to `DTS_INFLUENCER_...` — left
unused rather than reassigned here, no section needed it this round.

UniverseTeaserSection.jsx's preview row grew from 4 to 5 universes
(added `marrakech`) — same precedent as the existing Tulum/Kyoto/Capri/
Paris reuse noted above (the app's own canonical per-universe
photography, shown again deliberately), not a no-repeat violation.

## Round 7 (dashboard/site review pass)

| public_id | Folder | Used on |
|---|---|---|
| `DTS_AURA_Fanette_Guilloud_Photos_ID12987_rupmuq` | (unfoldered) | Contact.jsx — merged hero (replaces `asso-myron-...`, itself freed up here — never referenced elsewhere) |
| `DTS_BANDITS_PALI_MENDEZ_Photos_ID14260_s1kb8c` | Couple | UniverseMiniHero.jsx — homepage full-bleed photo (replaces `alex-plesovskich-...`, itself freed up here — never referenced elsewhere) |

Both `asso-myron-aOWUqj5vuOE-unsplash_yptsz1` and
`alex-plesovskich-VPrTqd8B230-unsplash_gwgyej` are now unused anywhere
in `src/`.

## Round 8 (London real photography)

| public_id | Folder | Used on |
|---|---|---|
| `DTS_Streets_of_London_Richard_Harris_Photos_ID942_q3iyyy` | (unfoldered) | `public/universes/london.jpg` + `london-800.jpg` (1600×1148 native, 800×574 resized) — London's first dedicated photography, replacing the interim `DTS_Quiet_Glamour_DTS_Studio_Photos_ID8355` placeholder everywhere it was standing in |

Real photography now exists for London, closing the last gap from
Round 4's Aman→London rename. `UNIVERSE_CONFIGS.london.imageUrl` in
`websiteThemes.js` changed from `null` to `/universes/london.jpg`,
matching the local-file convention all other 19 universes already use.
This alone propagates to every surface that reads the shared catalog:
`UniverseBanner.jsx` (Design Studio universe selector, switches from
the composition/motif fallback to the real photo), `UniverseWorldView.jsx`
(world page), and `Universes.jsx`'s grid/showcase tiles (via
`universe.imageUrl`).

Two surfaces don't read the shared catalog and had their own hardcoded
copies of the `ID8355` interim placeholder, fixed separately:
`OnboardingStepUniverse.jsx`'s universe-picker card (now points at
`/universes/london.jpg` instead of the Cloudinary placeholder URL), and
`Universes.jsx`'s `FALLBACK_IMAGE.london` (removed — dead now that
`imageUrl` is set, left as an empty object as a safety net for any
future photo-less universe).

`DTS_Quiet_Glamour_DTS_Studio_Photos_ID8355_zhr0xb` is now unused
anywhere in `src/`.

Not touched: `LondonUniverseView.jsx`'s (the onboarding preview overlay,
`src/components/studio/LondonUniverseView.jsx`) hero/mood-grid images —
those are generic Wix-hosted mood/atmosphere stock photos shared across
several universes' onboarding cards (e.g. the same URLs back Tulum's and
Kyoto's picker thumbnails), not location-specific placeholders standing
in for London, so out of scope for this photo swap. Also not touched:
`Universes.jsx`'s `SHOWCASE_UNIVERSE_IDS` — London still isn't in the
5-universe curated showcase; that's a separate editorial call from
whether it has a photo at all, and the comment there was updated to say
so rather than imply it's still photo-blocked.
