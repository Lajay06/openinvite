# iPhone device check

For the owner, on a real iPhone, before TestFlight. Item 2 of
`goals/2026-10-15-app-store-launch.md` (owner step 2). One step at a time: note
pass or fail, and take a screenshot of anything unexpected. Never type a
password or code anywhere but the phone.

## Before you start

- The iPhone unlocked, the cable, Xcode.
- Three test accounts you control, none of them uri.jay09 or adminopeninvite:
  a spare Google account, an Apple ID (the one on the phone is fine; "Hide My
  Email" is fine too), and an Openinvite email and password account.
- The build: Xcode, File, Open, `~/Downloads/oi5-d-device/ios/App/App.xcodeproj`.
  It is current main plus the five held launch PRs (#1079 to #1083), synced
  with `npm run mobile:real`. Signing and Capabilities: choose your team. Pick
  the iPhone as the destination, not a simulator, and press Command R.

## Sign in

1. **Google.** Continue with Google. Safari opens Google; pick the spare
   account. Expected: "Open in Openinvite?", then the app on Home, signed in.
   If Google or Base44 shows an error about the return address instead, stop
   and screenshot it: that is the trigger for the universal-link fallback.
2. **Log out.** Account, Log out. Expected: the phone's own sign-in screen,
   not the website's login page.
3. **Apple.** Continue with Apple, then the same as step 1. If it fails, the
   ruling is to remove Apple and Google together; email stays.
4. **Email.** Sign in with the email and password account. Expected: Home.
5. **Stays signed in.** Swipe the app away completely, open it again.
   Expected: still signed in, no sign-in screen.

## Native features

6. **Face ID.** Account, Require Face ID to open, on. Swipe the app away and
   open it. Expected: the Face ID prompt, then the app.
7. **Camera.** Plan, Moodboard, add a pin, Take photo. Expected: the
   permission prompt reads "Openinvite uses the camera so you can take a photo
   for your moodboard or your site", and the photo lands on the board.
8. **Contacts.** Guests, add, From contacts. Expected: the permission prompt,
   then your contacts to pick from; the one you pick becomes a guest.
9. **Location.** Plan, Marketplace, Use my location. Expected: the prompt
   reads "Openinvite uses your location only when you tap Use my location, to
   find vendors and places near you", then results near you.
10. **Deep link.** In Safari's address bar type `openinvite://plan/budget` and
    go. Expected: the app opens on Budget.
11. **Keyboard.** Guests, add a guest, tap through every field. Expected: the
    field you are typing in stays above the keyboard, and the sheet scrolls.

## Store rules

12. **Website pages open in Safari.** Account, Privacy policy, then Terms of
    service, then Contact support; Guest Suite tab, View Guest Suite.
    Expected: each opens in Safari itself, never inside the app.
13. **Nothing to buy.** Account: the Plan row shows the plan with nothing to
    press, and nothing anywhere says upgrade or shows a price.
14. **Delete account, look only.** Account, Delete account. Expected: the
    sheet lists what is deleted and says 7 business days; Delete my account
    stays grey until DELETE is typed. Press Cancel. Submitting sends a real
    deletion request to hello@openinvite.com.au.

## Send back

The step numbers with pass or fail, the screenshots, and the exact text of any
error. The lane fixes nothing on the device; it reads the results.
