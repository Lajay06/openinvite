/**
 * src/mobile/images.ts
 *
 * THE ONE PLACE A DECORATIVE IMAGE IS NAMED. Every slot in the app that
 * shows a photo the couple did not upload (hero fallbacks, Plan hub tiles,
 * keep-planning cards, empty states, welcome screens, the lock-screen
 * mock) is listed here with its Cloudinary public id, alt text, where it is
 * used, the size it is drawn at, and a focal point where the crop matters.
 * No Cloudinary id for a decorative slot may live anywhere else in
 * src/mobile/. /m/preview/images renders this file as a gallery.
 *
 * ONE LIBRARY. Every id here is one of the 95 photos in the Cloudinary
 * folder `app` (cloud dsr84xknv; 73 at goal 5, 22 more added by the owner
 * on 2026-09-22 for the splash pool), plus the airport and poolside photos
 * the owner added at the cloud's root, listed through the Admin API and
 * viewed one by one before it was assigned. Each photo is
 * used once across the whole app, so no photo repeats on a screen; the
 * `screen` field is what /m/preview/images checks. Crops are chosen so no
 * face is cut (`focal`), and photos with closed eyes in the focal area were
 * left out. The fixture stand-ins for the couple's own uploads are slots
 * here too, so no Cloudinary id lives anywhere else in src/mobile/.
 *
 * `todo: true` marks a slot that has no good photo; the gallery shows the
 * marker and the slot draws a color panel. None are todo after goal 6:
 * the owner added 22 photos to `app` on 2026-09-22 and the two tiles that
 * waited (tileEmergency, tileConsiderations) took theirs from that batch.
 *
 * ONCE, APP-WIDE (goal 5). A public id may appear in one slot only, and
 * `duplicateIds()` is empty by construction: /m/preview/images throws
 * when it is not. The one deliberate repeat is not a slot at all: the
 * couple's own cover photo is their identity and shows on the Home hero,
 * the Account card and the lock screen, the way a profile photo would.
 * In the preview that is `fixtureCover`; the Guest suite tab previews the guest suite's
 * own hero block (`fixtureSite`) and the Home heroes exclude site blocks,
 * so no library photo is drawn twice.
 *
 * STILLS ONLY. No component may derive motion from an id that starts with
 * DTS_. Public ids are never invented.
 */

export interface ImageSlot {
  /** Cloudinary public id (version prefix included where the desktop uses one), or '' when todo. */
  id: string;
  alt: string;
  /** Where the slot is drawn. */
  usedIn: string;
  /** The screen the slot is drawn on; two slots on one screen must not share an id. */
  screen: string;
  /** The CSS pixel size the slot is drawn at, before 2x/3x. */
  size: { w: number; h: number };
  ratio: '4/5' | '4/3' | '16/9' | '1/1' | '3/2';
  /** object-position when the default center crop loses the subject. */
  focal?: string;
  /** Cloudinary crop gravity for the slot (north, south, face) where g_auto cuts the subject; lib/images.js deliver() honors it. */
  gravity?: string;
  /** No good photo yet: render a color panel and show a "needs photo" marker in the gallery. */
  todo?: boolean;
  /** The panel tone used while todo. */
  tone?: 'ink' | 'neutral' | 'tint';
}

export const IMAGES = {
  /* ── Home hero fallbacks: only when the couple has no imagery of their own ── */
  heroDays: { id: 'hf_20260904_055316_4efc8628-77ed-4737-83bd-d0715cf99d43_eoixpp', alt: 'A couple in an arched doorway, forehead to forehead', usedIn: 'Home hero, days to go', screen: 'home', size: { w: 358, h: 448 }, ratio: '4/5', focal: '50% 30%' },
  heroReplies: { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14215_bykr7b', alt: 'A couple walking hand in hand at sunset', usedIn: 'Home hero, replies', screen: 'home', size: { w: 358, h: 448 }, ratio: '4/5', focal: '50% 40%' },
  heroAva: { id: 'hf_20260904_112950_ee43be91-2036-4b97-8ff9-f490913bfded_q6rrgk', alt: 'A couple laughing at a bar table', usedIn: 'Home hero, from Ava', screen: 'home', size: { w: 358, h: 448 }, ratio: '4/5', focal: '50% 35%' },
  heroShare: { id: 'pin_marrakech_couple', alt: 'Friends on a rooftop at dusk with a tray of drinks', usedIn: 'Home hero, share your guest suite', screen: 'home', size: { w: 358, h: 448 }, ratio: '4/5', focal: '50% 40%' },
  /* ── Home keep-planning cards: six fixed photos by position, whatever feature lands there, so no Plan tile photo is drawn twice ── */
  keepPlanning1: { id: 'DTS_SNOWBOUND_Daniel_Farò_Photos_ID12430_hmrv0c', alt: 'A couple under a yellow blanket with mugs', usedIn: 'Home, keep planning card 1', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3' },
  keepPlanning2: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', alt: 'Running along a white wall', usedIn: 'Home, keep planning card 2', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3' },
  keepPlanning3: { id: 'DTS_SNOWBOUND_Daniel_Farò_Photos_ID12449_f9hidr', alt: 'Two in the snow, arms wide', usedIn: 'Home, keep planning card 3', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3' },
  keepPlanning4: { id: 'DTS_First_Date_Marlen_Stahlhuth_Photos_ID4764_nostak', alt: 'Two friends looking up at the sky', usedIn: 'Home, keep planning card 4', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3', focal: '50% 35%' },
  keepPlanning5: { id: 'pin_aspen_couple', alt: 'Hot drinks on the slopes', usedIn: 'Home, keep planning card 5', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3', focal: '50% 40%' },
  keepPlanning6: { id: 'pin_seoul_couple', alt: 'Street food at a night market', usedIn: 'Home, keep planning card 6', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3', focal: '50% 45%' },
  /* ── Plan hub tiles ── */
  tileEventDetails: { id: 'DTS_ISOLA_Daniel_Farò_Photos_ID13172_fu4zfe', alt: 'Two hands and a pair of rings on a table', usedIn: 'Plan hub, Event details tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSchedule: { id: 'DTS_INFLUENCER_Daniel_Farò_Photos_ID8195_hcbnri', alt: 'Planning on a laptop, phone in hand', usedIn: 'Plan hub, Schedule tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 30%' },
  tileGuests: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2', alt: 'Friends leaping over a hay bale', usedIn: 'Plan hub, Guest list tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSeating: { id: 'DTS_Banquet_Daniel_Farò_Photos_ID5359_z6zqs8', alt: 'A dinner table from above, plates and wine', usedIn: 'Plan hub, Seating tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileWeddingParty: { id: 'DTS_VINYL_TASTE_Ivan_Resnik_Photos_ID14915_xtfezz', alt: 'Two friends laughing on a doorstep', usedIn: 'Plan hub, Wedding party tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 30%' },
  tileMoodboard: { id: 'DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2680_fnyjzd', alt: 'A bouquet held against pink', usedIn: 'Plan hub, Moodboard tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  /* Goal 6 photo fix: the earlier photo was framed below the chin, so every crop cut the face; this one is an outfit with no face to cut. */
  tileStyling: { id: 'DTS_FIRST_ROUND_JELLY_LUISE_Photos_ID10632_ecexru', alt: 'A silver skirt and a pink cocktail', usedIn: 'Plan hub, Styling tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileBeauty: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8875_cwnpxl', alt: 'Getting ready at a bathroom mirror', usedIn: 'Plan hub, Beauty tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileFood: { id: 'DTS_LAST_SUPPER_PALI_MENDEZ_Photos_ID13819_kvl7b7', alt: 'A croquembouche and bowls of berries', usedIn: 'Plan hub, Food & beverage tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileMusic: { id: 'DTS_Pride_Agustín_Farías_Photos_ID5544_sgsmaz', alt: 'A party under falling tinsel', usedIn: 'Plan hub, Music tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tilePhotography: { id: 'DTS_Young_Latin_Martin_Pisotti_Photos_ID6999_p6ixxt', alt: 'Two friends in a portrait', usedIn: 'Plan hub, Photography tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tileGuestGifts: { id: 'DTS_Philia_Daniel_Farò_Photos_ID4659_pnnku3', alt: 'A hand holding a bottle of champagne', usedIn: 'Plan hub, Guest gifts tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileVendors: { id: 'DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa', alt: 'Arranging flowers in a vase', usedIn: 'Plan hub, My vendors tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 35%' },
  tileMarketplace: { id: 'marrakech-hero_sbciuz', alt: 'A couple in a souk', usedIn: 'Plan hub, Marketplace tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileCeremony: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14213_wbsnwi', alt: 'A couple on the steps in their wedding clothes', usedIn: 'Plan hub, Ceremony details tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tileTransport: { id: 'hf_20260904_063711_294c70f5-51b6-4194-bef1-72f6cf26aa3f_hc1r7a', alt: 'A couple in the back of a car at night', usedIn: 'Plan hub, Getting here tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileAccommodation: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_-_Print_ew6e2a', alt: 'Two in bathrobes on a hotel bed', usedIn: 'Plan hub, Stay tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileBudget: { id: 'DTS_SOJOURN_Franco_Dupuy_Photos_ID10730_je7niq', alt: 'Working on a laptop, racket by the wall', usedIn: 'Plan hub, Budget tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 35%' },
  tileRegistry: { id: 'DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx', alt: 'Carrying an armful of wrapped parcels', usedIn: 'Plan hub, Registry tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileHoneymoon: { id: 'tulum-hero_nbr4op', alt: 'A couple walking along a beach', usedIn: 'Plan hub, Honeymoon tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  /* Goal 5: the tiles that were icon panels. Send invites and Invitations stay icon tiles on purpose (they hand off to desktop); goal 6 asks for photos on Emergency contact and Considerations, below. The one library photo still unassigned (a couple in bed) has closed eyes in its focal area and stays out, as goal 4 ruled. */
  tileChecklist: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14188_oqc9dm', alt: 'A game of chess by the window', usedIn: 'Plan hub, To do tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tilePolls: { id: 'hf_20260917_161857_658d1c99-742d-4bba-930c-4d52299b90c9_ccpphs', alt: 'Drinks at a party', usedIn: 'Plan hub, Polls & games tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 35%' },
  tileMessages: { id: 'hf_20260904_010212_e9bf35e3-c220-4d78-8595-01d39c75be7e_se9wle', alt: 'Sitting close on a leather banquette', usedIn: 'Plan hub, Messages tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tileVows: { id: 'DTS_day_tripping_Agustín_Farías_Photos_ID6199_g2inky', alt: 'An embrace by the waterfall', usedIn: 'Plan hub, Vows & speeches tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileStudio: { id: 'shanghai-hero_ixxql3', alt: 'A couple against a city skyline at night', usedIn: 'Plan hub, Design studio tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSuiteSchedule: { id: 'DTS_LUNAR_Daniel_Farò_Photos_ID11268_bm3gla', alt: 'Dusk by the water', usedIn: 'Plan hub, guest suite Schedule tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileQna: { id: 'DTS_SILVER_HOUR_Franco_Dupuy_Photos_ID14690_mjiupn', alt: 'Dressed up outside a cafe', usedIn: 'Plan hub, Q&A tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 30%' },
  tileSuiteRegistry: { id: 'hf_20260905_095507_0842f0f9-82bb-462a-9756-c6d1b1cb4486_po7vnk', alt: 'Grilling together at night', usedIn: 'Plan hub, guest suite Registry tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tileSuiteAccommodation: { id: 'DTS_Remote_Studio_Tino_Renato_Photos_ID3731_bqr4fe', alt: 'Reading on a poolside lounger', usedIn: 'Plan hub, guest suite Stay tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 60%' },
  tileSuiteTransport: { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14261_wcy4l1', alt: 'A piggyback through the desert', usedIn: 'Plan hub, guest suite Getting here tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileExperience: { id: 'DTS_Springtime_Rob_Christain_Crosby_Photos_ID3094_kjiq9v', alt: 'Skating down a palm-lined street', usedIn: 'Plan hub, Experience guide tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 60%' },
  tileGoodToKnow: { id: 'DTS_LAST_SUPPER_PALI_MENDEZ_Photos_ID13840_nxtipc', alt: 'A martini against red velvet', usedIn: 'Plan hub, Good to know tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  /* Goal 6 photo fixes: both from the owner's 2026-09-22 batch, used nowhere else. */
  tileEmergency: { id: 'DTS_SOJOURN_Franco_Dupuy_Photos_ID10782_kwgbsm', alt: 'Head down over a laptop in a booth', usedIn: 'Plan hub, Emergency contact tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 0%', gravity: 'north' },
  tileConsiderations: { id: 'DTS_Passion_Economy_Daniel_Farò_Photos_ID4725_lxcdnt', alt: 'A glass of water with a sprig of flowers', usedIn: 'Plan hub, Considerations tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSuitePolls: { id: 'DTS_Pride_Agustín_Farías_Photos_ID5510_dn4jws', alt: 'A kiss at sunset', usedIn: 'Plan hub, Guest polls tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  /* ── Empty states ── */
  emptyVendors: { id: 'DTS_Banquet_Daniel_Farò_Photos_ID5367_hgnaqg', alt: 'Hands serving plates at a counter', usedIn: 'My vendors, empty state', screen: 'vendors', size: { w: 326, h: 183 }, ratio: '16/9' },
  emptyGuests: { id: 'DTS_BEHIND_THE_SCENES_Shauna_Summers_Photos_ID8234_esice8', alt: 'Two friends laughing over a phone', usedIn: 'Guests, empty state', screen: 'guests', size: { w: 326, h: 183 }, ratio: '16/9', focal: '50% 30%' },
  emptyMoodboard: { id: 'DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz', alt: 'A dessert table of pink cakes', usedIn: 'Moodboard, empty state', screen: 'moodboard', size: { w: 326, h: 183 }, ratio: '16/9' },
  emptyRegistry: { id: 'DTS_WANDER_Jessica_MADAVO_Photos_ID12138_dpboww', alt: 'A flower stall in full bloom', usedIn: 'Registry, empty state', screen: 'registry', size: { w: 326, h: 183 }, ratio: '16/9' },
  /* ── Launch and first run ── */
  /* The splash pool (goal 6): one photo per open, never the same twice running, the whole pool before a repeat (lib/splashPool.js).
     14 photos: the two from goal 6's first pass and 12 of the 22 the owner added on 2026-09-22, each viewed at the phone's
     crop behind the logo and scrim (calm, sharp, faces whole, eyes open). Six more are needed for the 20 the goal asks for. */
  splash1: { id: 'kyoto-hero_vlwgtw', alt: 'A couple walking through a bamboo grove', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 50%' },
  welcome1: { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14280_cddisg', alt: 'A couple under a wide sky', usedIn: 'Welcome, screen 1', screen: 'welcome', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 35%' },
  welcome2: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1041_mudxwa', alt: 'Carrying each other through the snow', usedIn: 'Welcome, screen 2', screen: 'welcome', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 40%' },
  welcome3: { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', alt: 'Sharing cake at the party', usedIn: 'Welcome, screen 3', screen: 'welcome', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 40%' },
  login: { id: 'DTS_First_Date_Marlen_Stahlhuth_Photos_ID4795_upbdbr', alt: 'A couple sitting on a wall under the sky', usedIn: 'Mobile login, top panel', screen: 'login', size: { w: 390, h: 260 }, ratio: '3/2', focal: '50% 40%' },
  priming: { id: 'DTS_Weirdly_Ever_After_Agustín_Farías_Photos_ID8960_nspx4l', alt: 'A kiss on the cheek against orange', usedIn: 'Notification priming, top panel', screen: 'priming', size: { w: 390, h: 260 }, ratio: '3/2', focal: '50% 35%' },
  lock: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp', alt: 'A couple in a mountain meadow', usedIn: 'Face ID lock screen (the couple\'s own photo first)', screen: 'lock', size: { w: 390, h: 844 }, ratio: '4/5' },
  /* ── Preview artifacts ── */
  splash2: { id: 'hf_20260905_005926_9ff8ad93-21a0-4c2f-8f41-94cd140aa0ee_ib1qrr', alt: 'Steps down to the sea between flowering walls', usedIn: 'In-app splash pool, behind the logo (was the push preview wallpaper; that mock now draws the demo couple\'s cover)', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash3: { id: 'hf_20260904_112950_c28145cb-425f-4060-803e-0ef8ad0474c9_okqxth', alt: 'A couple walking a seawall at sunset', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash4: { id: 'hf_20260903_232125_e3d26c1d-ea6a-4374-9443-107018d470f2_fn7vuc', alt: 'Leaping into the sea from the rocks', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash5: { id: 'hf_20260904_090923_faab7fc5-e634-424b-95b7-39315dccbcf3_qe3lsz', alt: 'Laughing in a blue doorway', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash6: { id: 'hf_20260903_230909_75ff5eec-e9d1-46cf-95d2-5867030db959_hqk13n', alt: 'Two helmets in a car mirror', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash7: { id: 'DTS_ISOLA_Daniel_Farò_Photos_ID13167_iwrgom', alt: 'An open window onto the hills', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash8: { id: 'DTS_SILVER_HOUR_Franco_Dupuy_Photos_ID14693_qexopz', alt: 'Carrying tulips through a flower market', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash9: { id: 'DTS_DECADENT_Debora_Spanhol_Photos_ID12510_ebyjqj', alt: 'A raspberry cake with a ribbon', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash10: { id: 'DTS_SOFT_LUXE_Daniel_Farò_Photos_ID10822_kqgeik', alt: 'Carrying a wrapped bouquet', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash11: { id: 'DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0', alt: 'Breakfast by the pool under palms', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash12: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8872_o6lwqt', alt: 'Glasses raised together', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash13: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14202_q14mwq', alt: 'A kiss in a tall window', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  splash14: { id: 'DTS_EAT_RICH_Fanette_Guilloud_Photos_ID13901_olnatb', alt: 'Olives in a martini', usedIn: 'In-app splash pool, behind the logo', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5' },
  /* ── Demo place tiles: what Google's photo would be in the connected app (preview and demo only) ── */
  placeCeremony: { id: 'tulum-hero_pfdffd', alt: 'A wedding party on the sand', usedIn: 'Demo: the ceremony venue photo on Event details, and the Places search result', screen: 'event-details', size: { w: 358, h: 200 }, ratio: '16/9' },
  placeReception: { id: 'C17E98A9-5E5C-410A-B3F5-46098E2DFD6C_buezni', alt: 'A shared table from above', usedIn: 'Demo: the reception venue photo on Event details', screen: 'event-details', size: { w: 358, h: 200 }, ratio: '16/9' },
  placeStay1: { id: 'hf_20260904_090923_955b7356-c7d6-4f54-a3fd-5aae76c514ed_jq9izj', alt: 'A whitewashed hotel with blue railings', usedIn: 'Demo: guest suite accommodation, place 1 (also the welcome drinks venue)', screen: 'suite-accommodation', size: { w: 358, h: 200 }, ratio: '16/9', focal: '50% 45%' },
  placeStay2: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14166_tqzysj', alt: 'A bright hotel suite', usedIn: 'Demo: guest suite accommodation, place 2', screen: 'suite-accommodation', size: { w: 358, h: 200 }, ratio: '16/9' },
  placeAirport: { id: 'hf_20260921_234435_574beb4c-4fd7-4b47-948d-35721b323d3d_nxxjhz', alt: 'A couple walking toward the gates with suitcases', usedIn: 'Demo: guest suite transport, the airport', screen: 'suite-transport', size: { w: 358, h: 200 }, ratio: '16/9', focal: '50% 60%' },
  placePick1: { id: 'hf_20260917_170201_93bb15ab-fa11-4849-b922-4eca471c3d50_cwapbb', alt: 'A table at a seaside restaurant', usedIn: 'Demo: experience guide, coffee pick', screen: 'experience', size: { w: 358, h: 200 }, ratio: '16/9', focal: '50% 40%' },
  placePick2: { id: 'pin_edinburgh_couple', alt: 'A windy walk on the headland', usedIn: 'Demo: experience guide, outdoors pick', screen: 'experience', size: { w: 358, h: 200 }, ratio: '16/9', focal: '50% 40%' },
  placeMarket1: { id: 'hf_20260904_090213_dcaa917a-e117-4610-8618-a399139999a4_jv74kl', alt: 'A black and white portrait in a doorway', usedIn: 'Demo: marketplace result 1, the photographer', screen: 'marketplace', size: { w: 72, h: 72 }, ratio: '1/1', focal: '50% 35%' },
  placeMarket2: { id: 'DTS_New_Friends_and_Old_Cameras_Maresa_Smith_Photos_ID521_tkvtqe', alt: 'An armful of purple flowers', usedIn: 'Demo: marketplace result 2, the florist', screen: 'marketplace', size: { w: 72, h: 72 }, ratio: '1/1' },
  placeMarket3: { id: 'DTS_FIRST_ROUND_JELLY_LUISE_Photos_ID10648_vcwiko', alt: 'A close portrait with a glass', usedIn: 'Demo: marketplace result 3, the beauty salon', screen: 'marketplace', size: { w: 72, h: 72 }, ratio: '1/1', focal: '50% 30%' },
  /* ── The demo couple's photos (goal 6): stand-ins for the couple's own uploads, treated as theirs on the Home heroes, the daily update, the Account card, the lock screen and the Guest suite preview; used nowhere else ── */
  fixtureCover: { id: 'aspen-hero_zeblit', alt: 'A couple running through snow between pines', usedIn: 'Fixture cover photo, the couple\'s identity: Home hero 1, the Account card, the lock screen', screen: 'home', size: { w: 390, h: 488 }, ratio: '4/5', focal: '50% 45%' },
  fixtureSite: { id: 'hf_20260905_024502_4d83f52a-6e0b-4646-8139-ecb322b66c97_wvmeaa', alt: 'A snowball fight under the pines', usedIn: 'Fixture guest suite hero block: the Guest suite tab preview', screen: 'site', size: { w: 342, h: 428 }, ratio: '4/5', focal: '50% 40%' },
  fixtureStory1: { id: 'florence-hero_up7h6h', alt: 'A couple wheeling a bicycle down a stone lane', usedIn: 'Fixture Our Story photo 1: Home hero', screen: 'home', size: { w: 390, h: 488 }, ratio: '4/5', focal: '50% 45%' },
  fixtureStory2: { id: 'hf_20260917_170201_de2267ae-fe05-4cfc-8a7c-5733336600d0_ybyaaj', alt: 'A couple dressed up on a bridge at night', usedIn: 'Fixture Our Story photo 2: Home hero', screen: 'home', size: { w: 390, h: 488 }, ratio: '4/5', focal: '50% 35%' },
  fixtureStory3: { id: 'hf_20260905_002721_b09968b5-48aa-43ca-ad4f-76ac3cee3ccf_ly1f2r', alt: 'A couple against a city skyline', usedIn: 'Fixture Our Story photo 3: Home hero', screen: 'home', size: { w: 390, h: 488 }, ratio: '4/5', focal: '50% 35%' },
  fixturePin1: { id: 'DTS_TERRA_Chris_Abatzis_Photos_ID13220_kxcbio', alt: 'Lilies in red light', usedIn: 'Fixture moodboard pin 1', screen: 'moodboard', size: { w: 170, h: 170 }, ratio: '1/1' },
  fixturePin2: { id: 'DTS_Quiet_Glamour_DTS_Studio_Photos_ID8376_ove6fd', alt: 'Flowers carried down a street', usedIn: 'Fixture moodboard pin 2', screen: 'moodboard', size: { w: 170, h: 170 }, ratio: '1/1' },
  fixturePin3: { id: 'DTS_FIRST_ROUND_JELLY_LUISE_Photos_ID10636_otundm', alt: 'A cocktail in a coupe', usedIn: 'Fixture moodboard pin 3', screen: 'moodboard', size: { w: 170, h: 170 }, ratio: '1/1' },
  fixturePin4: { id: 'DTS_CURATIVE_Chris_Abatzis_Photos_ID7678_dlsgrm', alt: 'Two white shirts, arms linked', usedIn: 'Fixture moodboard pin 4', screen: 'moodboard', size: { w: 170, h: 170 }, ratio: '1/1' },
} as const satisfies Record<string, ImageSlot>;

export type ImageKey = keyof typeof IMAGES;

export const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';

/** The delivery URL for a slot, or '' when it is todo (so SmartImage draws the panel). */
export function imageUrl(key: ImageKey): string {
  const slot = IMAGES[key] as ImageSlot;
  // Some ids carry accented letters (Farò, Agustín); encode per segment so
  // the URL is valid everywhere and round-trips through deliver().
  return slot.id ? `${CLOUD}/${slot.gravity ? `g_${slot.gravity}/` : ''}${slot.id.split('/').map(encodeURIComponent).join('/')}` : '';
}

/** Every slot, for the gallery and the docs. */
export function allSlots(): Array<ImageSlot & { key: ImageKey }> {
  return (Object.keys(IMAGES) as ImageKey[]).map((key) => ({ key, ...(IMAGES[key] as ImageSlot) }));
}

/** The slots still waiting for a photo. */
export function todoSlots() {
  return allSlots().filter((s) => s.todo);
}

/** Slots anywhere in the app that share a photo: the gallery throws on any. Empty is the rule. */
export function duplicateIds(): Array<{ id: string; keys: ImageKey[] }> {
  const seen = new Map<string, ImageKey[]>();
  for (const s of allSlots()) {
    if (!s.id) continue;
    seen.set(s.id, [...(seen.get(s.id) || []), s.key]);
  }
  return [...seen.entries()].filter(([, keys]) => keys.length > 1).map(([id, keys]) => ({ id, keys }));
}

/** Every photo used, for the docs and the once-only check. */
export function usedIds(): string[] {
  return allSlots().map((s) => s.id).filter(Boolean);
}
