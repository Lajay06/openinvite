# What Base44's copy of the app has that GitHub does not

Captured 2026-10-16, read only, before any sync. Step 1 of the levelling the
owner ruled on 2026-10-15: the two things Base44's copy holds that main does
not are written down here FIRST, so bringing the two sides level cannot lose
them.

Nothing here is wired into anything. These files are a record, not inputs.

## Why a capture comes before a sync

Base44's copy of the app and this repo have drifted in both directions. On
application code Base44 is only ever behind: in `src/lib` it has 128 of main's
192 files and none that main lacks, and in `package.json` it has 101 of main's
135 scripts and none that main lacks. A sync in the GitHub to Base44 direction
therefore costs Base44 nothing.

It is ahead on exactly two things, and both would be overwritten by that sync:

1. its dependency pins, below, and
2. its own copy of the verification email template,
   `EmailVerification.materialized.html` here.

So they are copied out before anything is copied in.

## 1. The dependency pins

Base44's `package.json`, read 2026-10-16:

| package | Base44 | main |
| --- | --- | --- |
| `@base44/sdk` | `^0.8.54` | `^0.8.48` |
| `@base44/vite-plugin` | `^1.0.47` | `^1.0.35` |

Neither `0.8.53` nor `0.8.54` has ever appeared in this repo's history, so these
did not come from here. They are almost certainly the work of
`base44-builder[bot]`, whose commits are titled "Update base44 packages".

The pin moved while it was being watched: the 2026-10-14 reading in
`goals/2026-10-10-collaborators-safe-and-truthful.md` recorded `^0.8.53`, and
two days later it is `^0.8.54`. **Base44's copy changes on its own**, which is
the reason a sync has to be dated and verified rather than assumed to hold.

These pins are NOT applied here. They go to main as an ordinary PR with CI
proving the build, which is step 2. Taking them that way, rather than letting a
sync carry them, is the whole point: a dependency bump should arrive with a
green build behind it, not as a side effect of a settings change.

## 2. The materialized verification email

`EmailVerification.materialized.html`, 121 lines, byte for byte as the app held
it on 2026-10-16. **This is the email being sent to real people today**, and it
is the launch blocker the owner named on 2026-10-15.

It is not Base44's generic default, and the earlier record calling it that was
wrong in a way worth correcting. It already carries:

- `#e03553`, the product's own primary colour, as a full-bleed header band
- Plus Jakarta Sans
- the Openinvite logo, hosted on `media.base44.com`
- `{{otp_code}}` and `{{first_name}}`, Base44's placeholder names

Base44's materialize step themed its layout with the app's own published
colours. That is exactly why what arrives reads as "Base44's pink": the pink is
ours, and the layout is theirs. The wordmark is set in
`text-transform: uppercase`, which is where the capitals come from.

Two details in it are worth keeping for their own sake, because they are
Base44's platform behaviour written down in Base44's own words:

- The OTP sits on `muted_surface_color`, and the comment records that
  `primary_color` is contrast checked only against the CTA button, never
  against the muted surface, so a low contrast `--primary` would be unreadable
  there.
- The logo sits on a white chip, so a logo carrying its own dark background
  reads as a badge rather than a raw box bleeding into the band.

Our replacement lives at `base44/emails/EmailVerification.html` on main: 103
lines, the grey ground, the white card, the full logo and one photo, with
`{{otp_code}}` in the body at line 77 and both images on Cloudinary. It is held
until the sync is resolved, and it needs no further edit to pass Base44's
`missing_code` check.

## What is deliberately NOT in this directory

A copy of Base44's whole tree. Base44 holds no application file that main
lacks, so there is nothing else to rescue; the full file by file list is the
step 3 report, not a second copy of the app.

This directory also sits OUTSIDE `base44/`. An app's email templates are files
in `base44/emails/`, so a capture placed there could be read as a second live
template. It is in `docs/` for that reason.
