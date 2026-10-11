# Pay it forward (lane C, opened 2026-10-10)

Lane C. Starts after goals/2026-10-10-collaborators-safe-and-truthful.md closes. Runs under the goal autonomy protocol in WORKFLOW.md. No dev server, no browser, no local CI shards: lanes A and B own those. Branch prefix c/. No em or en dashes anywhere. US English.

Everything ships behind a flag, REFERRALS_ENABLED, default off. Server side it is process.env.REFERRALS_ENABLED === 'true', read at call time. Client side it is import.meta.env.VITE_REFERRALS_ENABLED === 'true'. Unset means off. The owner sets both in Vercel when ready. With the flag off, the new api files return 404, the /r/ route redirects to /pricing without storing anything, and no banner or card renders.

Legal review: yes, at close. A referral link records who sent whom: one User field on the friend and one hashed row per join. The discount terms (US$10, USD only, first-time customers only) appear on the pricing page and the plan step.

## Territory

src/App.jsx (one route), new src/pages/ReferralLanding.jsx, new src/lib/referral.js, src/pages/Pricing.jsx (marketing page: run npm run test:marketing-routes before merge), src/pages/ChoosePlan.jsx (held), new api/referral-join.js and api/referral-count.js (both held), new src/components/dashboard/ReferralCard.jsx, src/pages/Account.jsx, tests/persistence. The schema mirror PR is held.

Not touched: Register.jsx, Login.jsx, src/lib/AuthContext.jsx, src/components/auth/, every file on the payments freeze list (scripts/check-payments-freeze.mjs), and api/emails/. src/lib/checkoutSession.js is read, not changed.

## Rulings in advance

From the owner, 2026-10-10. Lane C's Scout 2 proposal as written, with these rulings:

- The shared code is FRIEND10: US$10 off, USD only, first-time customers only. The owner creates it in the Stripe dashboard when item 1 starts.
- The banner shows only when the checkout currency is USD.
- The count is friends who joined, not friends who paid.
- ReferralJoin stores hashed ids only, like CollaboratorGrant.
- referral_code is 8 characters from a non-ambiguous alphabet, never the slug.
- Self-referral is blocked server side.
- The dashboard card lives on Account and is hidden in collaborator sessions.
- Card copy: "Give a friend US$10 off", the link, and "{n} friends have joined so far".
- The post-launch pre-apply step is written as the last item and marked FROZEN, not built.

Schema, added by the owner and then mirrored in a held PR: User.referral_code, User.referred_by_code, and the entity ReferralJoin.

Held: ChoosePlan.jsx, the two new api files, the mirror.

## Facts from the scout

- api/create-checkout-session.js:36 sets allow_promotion_codes: true on every session, gift sessions included. So FRIEND10 works the day the owner creates it, with no code change. That is why "first-time customers only" matters: it keeps the code off a second purchase and off gift checkouts by an existing customer.
- Stripe rejects a session that sets both allow_promotion_codes and discounts. The FROZEN item 7 has to choose one per session.
- src/lib/checkoutSession.js resolves the price USD first and returns { priceId, currency }. The banner's USD check reads that same resolver, so the banner and the checkout can never disagree.
- Gift codes today are minted by the webhook (api/webhooks/stripe.js:203-231) and reach people only by email. Nothing on the site displays a code. FRIEND10 is the first code the site itself shows.
- Every sign-up and sign-in passes through /choose-plan (Register.jsx:55-64, Login.jsx:34-35), which is why capture lives there and the auth pages stay untouched.
- User rows are not readable across accounts. A count of friends needs its own entity, so ReferralJoin follows the create null, read null, hashed-id pattern in BASE44_PLATFORM_NOTES.md.

## Items

0. Owner prerequisites, then STOP. Ask the owner to add the three schema pieces in Base44 chat:
   - User.referral_code: string. "8 characters, server generated, unique by construction."
   - User.referred_by_code: string. "The referral code this account arrived with. Set once."
   - Entity ReferralJoin: create null, read null, update and delete owner-scoped. Fields: referrer_code_hash (string), joined_user_id_hash (string), joined_at (date-time), is_test (boolean). Both hashes are HMAC-SHA256 under BASE44_ADMIN_KEY, the same construction as api/_lib/collaboratorAuth.js's hashId.

   Then the mirror PR, HELD: base44/entities/User.jsonc, new base44/entities/ReferralJoin.jsonc, src/lib/entityFields.generated.js, and a mirror guard section asserting the fields and RLS. Resume at item 1 once it is on main.

1. FRIEND10 and the flag. When this item starts, tell the owner to create FRIEND10 in the Stripe dashboard: amount off US$10, currency USD only, first-time customers only, no product restriction beyond Pro and Ultra. The terminal never touches Stripe.
   - Add src/lib/referral.js: the flag read (wrapped, never throws), the stored-code read and write (localStorage key oi_ref, 30 days, wrapped in try and catch), and the alphabet.
   - The alphabet is 23456789ABCDEFGHJKMNPQRSTUVWXYZ: no 0, 1, I, L or O.
   - Guards: the flag defaults off; the stored code expires after 30 days; a throwing localStorage reads as no code.

2. The link. Route /r/:code in src/App.jsx renders ReferralLanding, which:
   - normalizes the code to uppercase;
   - stores it only if it is 8 characters from the alphabet;
   - redirects to /pricing.
   - Guards: valid stored, invalid ignored, flag off stores nothing. Marketing-routes test.

3. Code and count, api/referral-count.js, HELD. GET, authenticated as the caller.
   - If the caller has no referral_code, generate 8 characters with crypto.randomInt over the alphabet and write it with the caller's own token. Collisions are not checked: 31 to the power of 8 is about 8.5 times 10 to the 11th, and nothing maps a code back to a user, so a collision would only merge two counts.
   - Returns { code, link, count }, where count is the number of distinct joined_user_id_hash rows under hashId(code), excluding is_test.
   - 404 when the flag is off.
   - Guards (stubbed fetch): a code is generated once and reused; the count dedupes the same joiner; is_test rows are excluded.

4. Capture, api/referral-join.js (HELD) and ChoosePlan.jsx (HELD). POST { code }, authenticated as the joiner.
   - Server refuses, with no write, when the flag is off, the code is malformed, the caller already has referred_by_code, or the code equals the caller's own referral_code. That last case is the self-referral block, and it is server side.
   - Also refused: a caller created more than 7 days ago, so "joined" means a new account and an old customer clicking a link is not counted. This 7-day window is lane C's addition, ruled to stand 2026-10-11.
   - Otherwise it writes referred_by_code with the caller's own token and one ReferralJoin row, and skips the row if one already exists for this joiner.
   - ChoosePlan calls it once on mount when a stored code exists, then clears the stored code whatever the answer. It never blocks the plan step.
   - Guards: self-referral refused, a second join refused, an old account refused, a malformed code refused, one row per joiner. The plant removes the self-referral check.

5. The banner. Shown only when the flag is on, a code is stored, and src/lib/checkoutSession.js resolves USD.
   - Copy, verbatim: "Your friend gave you US$10 off. Use code FRIEND10 at checkout."
   - Placement: one band at the top of Pricing.jsx, and one line directly above the Pro and Ultra buttons on ChoosePlan.jsx (held, same PR as item 4 or its own).
   - Product chrome rules apply on ChoosePlan: sentence case, no exclamation mark, textMuted for the supporting line.
   - Guards: shown for USD with a code; hidden for AUD, with no code, and with the flag off. Marketing-routes test.

6. The card, src/components/dashboard/ReferralCard.jsx on src/pages/Account.jsx.
   - Copy, verbatim: heading "Give a friend US$10 off", the link with a "Copy link" button, and "{n} friends have joined so far".
   - When n is 1, the line is "1 friend has joined so far". That singular is lane C's wording, ruled to stand 2026-10-11.
   - Hidden when the flag is off and in a collaborator session.
   - No box-shadow, no rounded corners except the button.
   - Guards: hidden under a collaborator context, hidden with the flag off, singular and plural copy.

7. Pre-apply the code, FROZEN, NOT BUILT. Written here so it is not lost.
   - After launch, in api/create-checkout-session.js's buildCheckoutSessionParams: when the server-verified user has referred_by_code, the session is not a gift, and the resolved currency is USD, pass discounts: [{ promotion_code: <FRIEND10's promotion code id, from a server env var> }] and leave out allow_promotion_codes for that session only.
   - Read the referrer from the verified user, never from the request body.
   - Needs a commit with a Payments-Change: trailer, the owner's line, and a test-mode evidence run. Not part of this goal.

## Stop conditions

As CLAUDE.md. Any held-list or do-not-touch file outside the named exceptions: stop and report. Never touch Stripe. Never print a secret. Never run a guard listed in LIVE_CREDENTIAL_GUARDS. Item 0 stops for the schema. Items 3 and 4, ChoosePlan.jsx and the mirror are held: print the five-marks block for each and wait for the line. Item 7 is not built.

## State

As of 2026-10-11, ruled, not started. Blocked on the collaborator goal closing.

## Lessons

## Close

Lessons section, then the last line: "Closed <date> at main <full SHA>, PRs <list>". Then the end-of-goal report. Tell the owner the flag is still off and which two Vercel variables turn it on. Tell the legal reviewer: referred_by_code on User, ReferralJoin's hashed rows, the 7-day new-account window, and the discount terms shown on Pricing and ChoosePlan.
