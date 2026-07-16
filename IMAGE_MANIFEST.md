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

*(filled in as each section ships — see per-section commits)*
