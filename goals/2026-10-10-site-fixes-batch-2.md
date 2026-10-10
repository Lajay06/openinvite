# Site fixes batch 2 (owner walkthrough 2026-10-10; lane B, ahead of the mobile pass)

Lane B. Runs under the goal autonomy protocol in WORKFLOW.md. Marketing pages only. One PR per item.

The owner's walkthrough of the marketing site, condensed: the app section looked basic and generic, not on brand; the phone picture read as stretched; it should be a real-looking phone, composed in a way that is different like the rest of the site (death-to-stock photography, funky, a little edgy); the section ran from Ava straight into the app with no title banner like the Ava and universes sections have; the features accordion lost its weight, one sentence per feature where there used to be four bullets, and showed a colored bar on the left the owner does not want; the vendors feature must say the marketplace is connected to Google Places with vendors worldwide. The copy itself is good and stays.

## Items

1. Phones. The app section on /, /features and /app shows the site's own phone: a generic phone drawn in CSS, an even thin matte near-black bezel on all four sides, corners rounded to match, no notch, no island, no buttons, no camera, no logo, no maker's proportions. The real daily update recording, shot at a 440 by 956 viewport at 3x (1320 by 2868), fills the screen opening at native size, never resized, with a poster still from the same recording before load and under prefers-reduced-motion. Behind it, POOL_PARTY #15749 full bleed with film grain on the photograph only; the phone large and off-center over the quiet part of the frame; the copy beside it, never on it. Same build on all three pages, larger on /app.
2. Title banners. The app section opens on the same title banner structure as the Ava section on all three pages. Not a photo moment; the phone is the photo moment.
3. Accordion. No colored left bar and no colored glyph. Four bullets per feature, every bullet true of the product; the vendors row says "A marketplace connected to Google Places, with vendors worldwide".

## Device frames: why no manufacturer's frame is used

Apple Design Resources licence: section 2A grants use solely for mock-ups of interfaces for software that runs only on Apple's operating systems, and 2B excludes mock-ups for software on any non-Apple operating system and the use of the resources in website content. Openinvite is a web app with an Android app coming, so the iPhone bezels cannot be used on the site; the pack's files were deleted locally and none is referenced or committed. Samsung's developer terms limit the site's materials, the Galaxy emulator skins included, to personal, non-commercial use and grant no right to Samsung's trademarks, so no Galaxy is pictured; Android stays in the copy only. When the app runs on a phone, the owner's own photograph of a real iPhone running it, per Apple's marketing guidelines, replaces the site's phone shape.

## Rulings in advance

Copy verbatim, US English, no em or en dashes, no emojis, guest suite vocabulary. No store badge or store link anywhere. A new recording is uploaded to a new path with overwrite off and the code switches to it; a live Cloudinary path is never overwritten.

## Guards

The marketing copy guard pins the accordion's 32 bullets and that the bar's rule is gone; each banner sits directly above its app section in the Ava banner's structure; the phone recording is 1320 by 2868 and never resized, at a new Cloudinary path with overwrite off; the phone frame is CSS in the repo with no raster frame; no file from the Apple pack is committed or referenced; no store badge or link anywhere.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".

Closed 2026-10-10 at main 08d0eb06cd87fd3264109864acf28d2512af950c, PRs #954 #956 #958
