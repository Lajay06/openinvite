# Openinvite — Visual Content Strategy

*How a SaaS with no physical product produces product shots, lifestyle imagery, video,
and UGC. Companion to MARKETING_AUDIT.md — that doc fixes what the marketing site says;
this one fixes what it shows. Reference doc, not a prompt.*

---

## The core reframe

Openinvite's output IS the photogenic object. The product produces beautiful wedding
websites, invitations, and immersive universes — so the "product photo" is the published
site scrolling on a phone, not a screenshot of admin UI. This is the Squarespace/Webflow
playbook: you never see software, you see what the software made. We add what they lack:
weddings are the highest-emotion purchase context on the internet.

**The one hard rule: every pixel of UI shown is real, captured product.** AI tools may
generate the *scene around* the product, never the product itself. Fake UI is slop and a
credibility risk — the brand premise is that the real thing is this polished.

---

## The four layers

### 1. Product-shot layer — real UI, beautiful frames
Screen recordings and device renders of the actual product.
- **Assets:** Aman universe full-page scroll (phone + desktop), builder-in-use recording,
  guest suite walkthrough, invitation open animation, RSVP flow on mobile.
- **Tools:** Screen Studio (smooth cursor recordings), Rotato or similar (3D device
  renders from real screenshots), CleanShot (stills).
- **Where used:** marketing site heroes/sections (fixes the audit finding: descriptions
  with nothing to see), social, ads.

### 2. Lifestyle layer — AI for the scene, never the screen
Higgsfield-class generation produces the *context*: couple on the couch planning, laptop
on a café table, phone in hand at a venue. Composite real UI captures onto the screens.
- AI provides the set; the product provides the screen. This is how a SaaS gets
  lifestyle photography without a shoot budget.
- Keep generated scenes plausible and Australian where visible (venues, light).
- Disclose nothing about the scene being generated is needed if no real people/places
  are implied; never imply a real customer that doesn't exist (no fake testimonials).

### 3. UGC layer — film the reaction, not the software
The emotional moment is the demo.
- **Formats:** guest POV opening a stunning invitation on their phone; couple's reaction
  seeing their finished site; "building my wedding website" POV; "rating wedding
  websites" formats; "our guests keep messaging about our website."
- **Pre-PMF bridge:** founder-led build-in-public content (Aussie wedding-tech founder is
  an underused niche). Post-PMF: seed real couples — early customers get their site
  featured in exchange for a reaction clip; bake the ask into onboarding/after-wedding
  flow.
- UGC must never be fabricated as if from real customers. Founder content is honest by
  construction; staged demo clips are labelled as demos.

### 4. Transformation layer — blank → world in 60 seconds
Builder timelapses per universe. Transformation is the most-watched format in every
visual category and the builder produces it natively.
- Ten universes = a ten-part series, not a one-off. Aman first (flagship rule).
- Cut points: blank canvas → universe applied → photos in → texture/motion on →
  published scroll on a phone.

---

## The two force-multipliers

- **John & Suzanne is the hero demo.** Every asset stars the same polished record —
  polishing it is marketing spend. Keep it pristine; consider a second record later for
  a contrasting universe.
- **Cloudinary is the asset pipeline** (already integrated: dsr84xknv). Every capture
  gets uploaded, transformed (f_auto/q_auto, crops per placement), and reused across the
  marketing site, ads, and social. One capture, many placements.

---

## Channel mapping (lean)

| Channel | Primary formats | Cadence reality (solo founder) |
|---|---|---|
| Marketing site | Device renders, scroll videos, section visuals | Produced once per audit slice |
| Instagram/TikTok | Transformation timelapses, UGC-style POV, invitation opens | 1–2/week sustainable |
| Product Hunt launch | Hero video (60–90s), gallery device renders | One-off, pre-launch sprint |
| Ads (later) | Lifestyle composites + product close-ups | Post-PMF |

---

## Production checklist (solo, no budget)

1. Polish John & Suzanne to hero state (already largely done).
2. Capture set A — stills: full-page screenshots of every guest-site page, both photo
   states, desktop + mobile. Upload to Cloudinary under openinvite/marketing/.
3. Capture set B — motion: Screen Studio recordings — published-site scroll (phone
   ratio), builder session, invitation open, RSVP flow.
4. Device renders: run the best stills/clips through Rotato → hero assets.
5. First timelapse: Aman blank→published, cut to 60s.
6. Slot assets into the marketing site per MARKETING_AUDIT.md placement plan (each
   slice = one PR, verify live).
7. Founder content starts when comfortable — phone, face optional, build-in-public.

## Sequencing note

Capture AFTER the visual work lands, not before: the texture library, Celebration
close-out, and any guest-site polish change what the product looks like. Don't
produce a hero video of a site that changes next month. Strategy now → capture when
the guest site hits its next stable visual state.

---

*Status: strategy agreed. First action when capture-ready: checklist steps 1–4, then
the Product Hunt hero video before launch.*
