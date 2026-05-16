/**
 * Central photo library — all real user photos from Wix media library.
 */

const PHOTOS = {
  // ── HOMEPAGE ──────────────────────────────────────────────────
  // Photo 1 - Homepage hero (HERO ONLY)
  photoA: "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg",

  // Red silhouette (section 2) — DO NOT CHANGE
  redSilhouette: "https://static.wixstatic.com/media/d2df22_c34b84a5b42f49b0963b953b94c0e8c4~mv2.jpg",

  // Photo 2 - Feature 1 Timeline (landscape split)
  photoB: "https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg",

  // Photo 3 - Feature 2 Playlists (full bleed landscape)
  photoC: "https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg",

  // Photo 4 - Feature 3 Guest grid top-left
  photoD: "https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg",

  // Photo 5 - Feature 3 Guest grid top-right
  photoE: "https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg",

  // Photo 6 - Feature 3 Guest grid bottom-left
  photoF: "https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg",

  // Photo 7 - Feature 3 Guest grid bottom-right
  photoG: "https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg",

  // Photo 8 - Feature 4 Budget (landscape split)
  photoH: "https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg",

  // Photo 9 - Feature 5 Invitations (full bleed landscape)
  photoI: "https://static.wixstatic.com/media/d2df22_fc15a5b1a8764b65949ef99231041ead~mv2.jpg",

  // Photo 10 - Testimonials section background
  photoJ: "https://static.wixstatic.com/media/d2df22_b014095a4e4f42a9a415f314cad6b260~mv2.jpg",

  // Photo 11 - Ava AI section right column
  photoK: "https://static.wixstatic.com/media/d2df22_370cde85ab644a8fad626149c63f7f0c~mv2.jpg",

  // Photo 12 - Full bleed photo CTA "Your wedding deserves this"
  photoCTA: "https://static.wixstatic.com/media/d2df22_d44e25f4998148b5a36522f648fbc794~mv2.jpg",

  // Photo 13 - Pricing final CTA background (homepage pricing section bg)
  photoPricingBg: "https://static.wixstatic.com/media/d2df22_f912572c44a94a71a99d2672ac25e364~mv2.jpg",

  // ── /features PAGE ────────────────────────────────────────────
  // Photo 14 - Quick Start section
  photoM: "https://static.wixstatic.com/media/d2df22_2d4ea077497f48679138b2e04dbc7e3a~mv2.jpg",

  // Photo 15 - Dashboard section
  photoN: "https://static.wixstatic.com/media/d2df22_f936e32d99904a6cbdfe46282fe4b39b~mv2.jpg",

  // Photo 16 - Ava AI full bleed background
  photoO: "https://static.wixstatic.com/media/d2df22_9be952c6ade04b5cb84818743f98684d~mv2.jpg",

  // Photo 17 - /features card 1 BUDGET
  photoP: "https://static.wixstatic.com/media/d2df22_f2f5ea9dcdfb49e096f754589076731a~mv2.jpg",

  // Photo 18 - /features card 2 REGISTRY
  photoQ: "https://static.wixstatic.com/media/d2df22_57a2dcf2b5254f6696ae3ff26400ffaf~mv2.jpg",

  // Photo 19 - /features card 3 PLANNING
  photoR: "https://static.wixstatic.com/media/d2df22_66d79e02de6a4ab59870b43560bf2971~mv2.jpg",

  // Photo 20 - /features card 4 AI
  photoFeatAI: "https://static.wixstatic.com/media/d2df22_2c30e2cd6b6e47e49d01917aa4726aff~mv2.jpg",

  // Photo 21 - /features card 5 GUESTS
  photoFeatGuests: "https://static.wixstatic.com/media/d2df22_0ed67853fdc84cc59872d1df0adbc40b~mv2.jpg",

  // Photo 22 - /features card 6 MUSIC
  photoFeatMusic: "https://static.wixstatic.com/media/d2df22_1c2d8e21463346568144d509fa561d8c~mv2.jpg",

  // Photo 23 - Invitations x Guest Suite full bleed
  photoS: "https://static.wixstatic.com/media/d2df22_a29f8a39603044f4b85cf06b7eae217f~mv2.jpg",

  // ── /about PAGE ────────────────────────────────────────────────
  // Photo 24 - Mission section (full bleed)
  photoU: "https://static.wixstatic.com/media/d2df22_b48450b2bc39468aba20f625f723f604~mv2.jpg",

  // Photo 25 - Pull quote full bleed
  photoV: "https://static.wixstatic.com/media/d2df22_a5872ee8f65340ac9f613896274efac4~mv2.jpg",

  // Photo 26 - About card 1
  photoAbout1: "https://static.wixstatic.com/media/d2df22_485495e7f0fc43b29dfe2c7fe2435a04~mv2.jpg",

  // Photo 27 - About card 2
  photoAbout2: "https://static.wixstatic.com/media/d2df22_50c6777d3465434690e1479f3bd0082d~mv2.jpg",

  // Photo 28 - About card 3
  photoAbout3: "https://static.wixstatic.com/media/d2df22_67a8924dbf374d5d8891e45729a60ba0~mv2.jpg",

  // Photo 29 - About card 4
  photoAbout4: "https://static.wixstatic.com/media/d2df22_f19a9d87136e489bbabe85776a13afd5~mv2.jpg",

  // Photo 30 - About card 5
  photoAbout5: "https://static.wixstatic.com/media/d2df22_9bfbd182ff52452d87d70bbe7d1dc46e~mv2.jpg",

  // Photo 31 - /pricing final CTA background
  photoPricingCTA: "https://static.wixstatic.com/media/d2df22_15e91395d79342a5996e5e663c247a6e~mv2.jpg",

  // Photo 32 - /contact page banner background
  photoContact: "https://static.wixstatic.com/media/d2df22_5f864fb8dc374942930cb254fc220681~mv2.jpg",

  // ── LEGACY aliases (kept for any references not yet migrated) ──
  photoL: "https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg",
  photoT: "https://static.wixstatic.com/media/d2df22_b48450b2bc39468aba20f625f723f604~mv2.jpg",
  photoW: "https://static.wixstatic.com/media/d2df22_a5872ee8f65340ac9f613896274efac4~mv2.jpg",
  photoX: "https://static.wixstatic.com/media/d2df22_485495e7f0fc43b29dfe2c7fe2435a04~mv2.jpg",
};

export { PHOTOS };