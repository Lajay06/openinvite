# Goal: consumer launch website (lane B)

Owner ruling, 2026-10-15: everything is geared to launching Openinvite for couples, plus the mobile app. Professional and Friends of Openinvite come after launch. Nothing in this goal adds, shows or links to Professional or Friends.

Lane: B. Tab "LANE B marketing and recordings". Folder ~/Downloads/openinvite-3.
Starts only after the owner confirms gifting v2 is switched on in production.

## The outcome

When this run ends, the owner opens one preview link and sees the marketing site as it will launch: the five photo-led product sections in place, no old screenshot-in-a-box sections left, every page clean at phone and desktop width, and nothing to fix on brand.

## The brand contract (every item is built and checked against this)

1. One grammar for every page: full-bleed 900px panels, a photo or a solid ground (black #0A0A0A or white) edge to edge, big left-aligned Plus Jakarta Sans headline, one red #E03553 pill CTA. Grounds alternate black and white.
2. A new section replaces a section with the same job and height. It is never inserted as an extra block.
3. No eyebrows, no cream, no new fonts, no new button styles, no new layouts, no gradients that the site does not already use.
4. Copy: US English, sentence case, no em or en dashes, plain words. "Guest Suite" with both capitals. Sample names and numbers are sample.
5. Photos: only owned Higgsfield photos already on Cloudinary. DTS photos never go into any AI tool. No new photo generation in this run; if a section needs a photo that does not exist, use the closest listed one and say so in the report.
6. If an item cannot meet the contract, it stops and is reported. It is never shipped "close enough".

## Items, in order

### 1. Features page showcase (concepts 1 to 4)
Per claude/product-showcase-placement-2026-10-14 (copied below):
- Section 4, Customizable Dashboard, becomes Concept 1 "They see the invitation. You see everything." on a WHITE ground (sparkler photo right half, cards over it), so the order stays black, white, black.
- Section 5, Everything on your phone, and section 6, the accordion, stay.
- The long white block (Timeline and schedule, Advanced guest management, Smart budget) becomes: Concept 4 "From yes to the send-off" (black, timeline), Concept 2 "The best part of planning is the replies" (white, guest management), Concept 3 "Sort the seats on Sunday" (confetti photo, seating), then Smart budget as text on white.
- Hero, intro strip, quick start wizard and CTA stay.

### 2. Home page showcase (concept 5)
Concept 5 "One Guest Suite. Twenty worlds." replaces "One aesthetic vision, from your invitation to your RSVP." Rebuilt on BLACK. Nothing else is added to Home.

Photo ids (Higgsfield, on Cloudinary): 038 phone hf_20260905_124238_2e0981ad-2b66-46cc-948d-a8db441b4929_whdhah; 048 chips hf_20260915_122132_c3f8db65-0e64-4b62-9899-3c91a50de3fc; 049 courtyard hf_20260915_122359_5755b079-7dba-4705-92d0-36e2eea2cb50; 051 torii hf_20260915_122359_f6bb72b7-1000-47ba-9d24-a7856a636992; 054 confetti hf_20260915_122700_2ef05ef1-ca02-4db5-b8b9-09d4934d4245; 070 getting ready hf_20260915_125454_58abbb41-3096-4a0b-a6ee-cc9b48b3f91c; 074 sparklers hf_20260915_125903_4a726188-2300-4b7d-b1f2-916ce22b4ba3; 080 lemons hf_20260915_130747_dc1199a9-365b-4bdb-b766-117c9a39f190; 107 airport hf_20260921_234435_574beb4c-4fd7-4b47-948d-35721b323d3d_nxxjhz.

The design source is the "Product showcase concepts" Design artifact. Match it; where the live site's grammar and the concept differ, the site's grammar wins.

### 3. The screenshot sweep
List every remaining section on every marketing page that shows a product screenshot in a box on a light ground (the old grammar). For each: replace it under rule 2 if one of the five concepts does that job, otherwise leave it and put it in the report with a one-line suggestion. Universes, Ava, Pricing, Gifting and About get no showcase.

### 4. Gifting and pricing consistency (after switch-on)
Gifting is now live. Check that the Gifting page, Pricing, nav and footer all agree: US$49 Pro, US$99 Ultra, 24 months, pay once, 14-day trial; gift links work; the gift path from Home and Pricing reaches /gift. Copy fixes only. No payments file is touched (create-checkout-session.js, api/webhooks/stripe.js, planPricing.js, planGift.js, giftAuth.js are frozen).

### 5. Hidden until after launch
"For planners" stays flag-off. No Professional or Friends link, page or mention on any public page. A guard proves it on the built preview.

### 6. Launch polish pass, every marketing page, at 390 and 1440
- No sideways scroll, no clipped text, no overlapping elements.
- Every image returns 200 and has alt text.
- Each page has its own title, description and share image; sitemap and robots are correct; no internal link returns 404.
- The bare domain answers with a 308 to www.
Fix what is copy or layout. Report anything else.

### 7. Tracking, read only
Report what analytics and ad tracking is installed today (Google, Meta, TikTok or none), what fires on sign-up and on purchase, and exactly what the owner must create or supply before ad spend. Add no new third-party script in this run.

## Rules
- Preview branch b/consumer-launch-site, cut from main after the gifting switch-on. Each item is its own commit so any one can be dropped.
- PRs are opened HELD. Nothing merges in this run; the owner reviews the preview first.
- No Base44 app file saves, no Base44 schema changes, no Pull in Base44.
- No secret is read from .env.local. No vercel env ls or pull.
- One headless browser at a time; the owner's Mac is short on memory. Close previews when done.
- No other lane's branch or PR is touched.

## Stop conditions
1. A payments file or Base44 app file would need to change.
2. A section cannot meet the brand contract.
3. A guard or the full suite fails twice in a row on the same head.
4. Anything would make Professional or Friends visible.
On a stop: commit what is clean, write the reason, continue with the next independent item if there is one, otherwise end the run.

## The final report (one, at the end)
- The preview link, and screenshots of every changed section at 390 and 1440.
- Per item: done, partial or stopped, with commits.
- The screenshot-sweep list.
- The tracking findings and the owner's to-do for ads.
- Every held PR with its five marks, together, for one review.
