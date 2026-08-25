# FINDING — the universe accents are not usable as text colors

Measured 2026-08-25 from `UNIVERSE_CONFIGS`. **Findings only. Escalated to the
design lane; no palette is changed here.**

Surfaced while fixing P2c ("Getting around" rendering dark-on-dark). The fix
for that page is shipped. **This note is about the palettes themselves**, and
it is an input to work that has not been built yet.

## The numbers

Bold = below the 4.5:1 text floor.

| Universe | accent | on its `lightBg` | on its `darkBg` | best available foreground ON the accent | after `accentText()` |
|---|---|---:|---:|---:|---:|
| `london` | `#C4956A` | **2.27** | 7.4 | 5.89 | 4.83 |
| `tulum` | `#D4845A` | **2.46** | 4.63 | 4.63 | 4.71 |
| `kyoto` | `#4B5A6E` | 6.3 | **2.48** | 6.3 | 6.3 |
| `capri` | `#C4A130` | **2.29** | 5 | 5.81 | 4.78 |
| `marrakech` | `#B5654A` | **3.46** | **4.06** | **4.06** | 4.56 |
| `brooklyn` | `#C24A2E` | **4.47** | **3.5** | **4.47** | 4.75 |
| `bali` | `#C97654` | **2.8** | **2.91** | **4.13** | 4.54 |
| `paris` | `#1A1816` | 16.57 | **1.04** | 16.57 | 16.57 |
| `capetown` | `#6B7757` | **4.01** | **2.48** | **4.01** | 4.53 |
| `mykonos` | `#2F6FCC` | 4.92 | **2.66** | 4.92 | 4.92 |
| `amalfi` | `#D9A441` | **2.15** | **3.26** | **3.26** | 4.71 |
| `sedona` | `#B5522A` | **3.77** | **2.74** | **3.77** | 4.6 |
| `aspen` | `#3D5A46` | 7.23 | **1.79** | 7.23 | 7.23 |
| `taj` | `#C9922E` | **2.55** | 4.78 | 6 | 4.63 |
| `havana` | `#D9713C` | **2.69** | **4.01** | **4.01** | 4.8 |
| `edinburgh` | `#6B2333` | 9.31 | **1.08** | 9.31 | 9.31 |
| `monaco` | `#B8963E` | **2.81** | 6.9 | 6.9 | 4.97 |
| `florence` | `#B5643A` | **3.6** | **2.66** | **3.6** | 4.52 |
| `seoul` | `#9B8AC4` | **2.8** | **4.43** | **4.43** | 4.54 |
| `shanghai` | `#C9A227` | **2.13** | 7.31 | 7.31 | 4.55 |

- **15 of 20** accents fail 4.5:1 against their own light ground.
- **14 of 20** fail against their own dark ground.
- **9 of 20** have NO usable foreground — neither the palette's light text
  nor its dark text clears 4.5:1 against the accent, so a filled accent chip
  cannot be made readable by choosing a text color. amalfi bottoms out at 3.26.

## Why this matters beyond one page

Four unbuilt pieces of work assume the accent is usable as a text color:

- **The hero programme's fine-stroke targets** — a hairline or a small label in
  accent over a photograph is the hardest contrast case in the product, and the
  accent already fails on flat ground.
- **Signature authoring toward 20 universes** — new accents chosen the same way
  will inherit the same property.
- **The icon vocabulary** — accent-colored icons sit at WCAG 1.4.11's 3:1 rather
  than 4.5:1, which several accents also fail on dark grounds.
- **P4c, true dark backgrounds** — deepening `darkBg` makes the dark column
  worse, not better.

## What has been done, and what has not

`accentText()` darkens the accent toward the palette's own ink until it clears
the floor, hue preserved; `accentChip()` deepens the FILL where no foreground
works. Both are derived per palette, so they hold for a 21st universe without
edits. The final column shows every palette landing just over 4.5.

**That is a rendering compensation, not a palette decision.** The accents remain
what they are; the guest site now derives readable variants where it needs text.
Whether the palettes themselves should change is the design lane's call, and the
question is worth asking before twenty more are authored the same way.
