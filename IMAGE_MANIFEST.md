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
| `manuel-moreno-DGa0LQ0yDPc-unsplash_nbgivs` | Universe | Universes.jsx — Aman |

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

| `DTS_Quiet_Glamour_DTS_Studio_Photos_ID8355_zhr0xb` | Food | Universes.jsx grid — Aman fallback (only universe with no dedicated `/universes/*.jpg`) |

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
