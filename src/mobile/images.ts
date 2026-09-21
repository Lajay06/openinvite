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
 * ONE LIBRARY. Every id here is one of the 73 photos in the Cloudinary
 * folder `app` (cloud dsr84xknv), listed through the Admin API on
 * 2026-09-21 and viewed one by one before it was assigned. Each photo is
 * used once across the whole app, so no photo repeats on a screen; the
 * `screen` field is what /m/preview/images checks. Crops are chosen so no
 * face is cut (`focal`), and photos with closed eyes in the focal area were
 * left out. The fixture stand-ins for the couple's own uploads are slots
 * here too, so no Cloudinary id lives anywhere else in src/mobile/.
 *
 * `todo: true` marks a slot that has no good photo; none do now, and the
 * gallery still shows the marker if one ever returns.
 *
 * STILLS ONLY. No component may derive motion from an id that starts with
 * DTS_. Public ids are never invented.
 */

export interface ImageSlot {
  /** Cloudinary public id (version prefix included where the site uses one), or '' when todo. */
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
  heroShare: { id: 'pin_marrakech_couple', alt: 'Friends on a rooftop at dusk with a tray of drinks', usedIn: 'Home hero, share your site', screen: 'home', size: { w: 358, h: 448 }, ratio: '4/5', focal: '50% 40%' },
  keepPlanningDefault: { id: 'DTS_SNOWBOUND_Daniel_Farò_Photos_ID12430_hmrv0c', alt: 'A couple under a yellow blanket with mugs', usedIn: 'Home, keep planning card with no feature image', screen: 'home', size: { w: 240, h: 180 }, ratio: '4/3' },
  /* ── Plan hub tiles (also the Home keep-planning cards, by feature) ── */
  tileEventDetails: { id: 'DTS_ISOLA_Daniel_Farò_Photos_ID13172_fu4zfe', alt: 'Two hands and a pair of rings on a table', usedIn: 'Plan hub, Event details tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSchedule: { id: 'DTS_INFLUENCER_Daniel_Farò_Photos_ID8195_hcbnri', alt: 'Planning on a laptop, phone in hand', usedIn: 'Plan hub, Schedule tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 30%' },
  tileGuests: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9181_erzsi2', alt: 'Friends leaping over a hay bale', usedIn: 'Plan hub, Guest list tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSeating: { id: 'DTS_Banquet_Daniel_Farò_Photos_ID5359_z6zqs8', alt: 'A dinner table from above, plates and wine', usedIn: 'Plan hub, Seating tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileWeddingParty: { id: 'DTS_VINYL_TASTE_Ivan_Resnik_Photos_ID14915_xtfezz', alt: 'Two friends laughing on a doorstep', usedIn: 'Plan hub, Wedding party tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 30%' },
  tileMoodboard: { id: 'DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2680_fnyjzd', alt: 'A bouquet held against pink', usedIn: 'Plan hub, Moodboard tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileStyling: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8869_rpi65n', alt: 'A satin suit and a smile', usedIn: 'Plan hub, Styling tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 25%' },
  tileBeauty: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8875_cwnpxl', alt: 'Getting ready at a bathroom mirror', usedIn: 'Plan hub, Beauty tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileFood: { id: 'DTS_LAST_SUPPER_PALI_MENDEZ_Photos_ID13819_kvl7b7', alt: 'A croquembouche and bowls of berries', usedIn: 'Plan hub, Food & beverage tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileMusic: { id: 'DTS_Pride_Agustín_Farías_Photos_ID5544_sgsmaz', alt: 'A party under falling tinsel', usedIn: 'Plan hub, Music tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tilePhotography: { id: 'DTS_Young_Latin_Martin_Pisotti_Photos_ID6999_p6ixxt', alt: 'Two friends in a portrait', usedIn: 'Plan hub, Photography tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tileGuestGifts: { id: 'DTS_Philia_Daniel_Farò_Photos_ID4659_pnnku3', alt: 'A hand holding a bottle of champagne', usedIn: 'Plan hub, Guest gifts tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileVendors: { id: 'DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa', alt: 'Arranging flowers in a vase', usedIn: 'Plan hub, My vendors tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 35%' },
  tileMarketplace: { id: 'marrakech-hero_sbciuz', alt: 'A couple in a souk', usedIn: 'Plan hub, Marketplace tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileCeremony: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14213_wbsnwi', alt: 'A couple on the steps in their wedding clothes', usedIn: 'Plan hub, Ceremony details tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 40%' },
  tileTransport: { id: 'hf_20260904_063711_294c70f5-51b6-4194-bef1-72f6cf26aa3f_hc1r7a', alt: 'A couple in the back of a car at night', usedIn: 'Plan hub, Transport tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileAccommodation: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_-_Print_ew6e2a', alt: 'Two in bathrobes on a hotel bed', usedIn: 'Plan hub, Accommodation tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileBudget: { id: 'DTS_SOJOURN_Franco_Dupuy_Photos_ID10730_je7niq', alt: 'Working on a laptop, racket by the wall', usedIn: 'Plan hub, Budget tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3', focal: '50% 35%' },
  tileRegistry: { id: 'DTS_THE_INTERN_Shauna_Summers_Photos_ID11406_giy6nx', alt: 'Carrying an armful of wrapped parcels', usedIn: 'Plan hub, Registry tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileHoneymoon: { id: 'tulum-hero_nbr4op', alt: 'A couple walking along a beach', usedIn: 'Plan hub, Honeymoon tile', screen: 'plan', size: { w: 171, h: 148 }, ratio: '4/3' },
  /* ── Empty states ── */
  emptyVendors: { id: 'DTS_Banquet_Daniel_Farò_Photos_ID5367_hgnaqg', alt: 'Hands serving plates at a counter', usedIn: 'My vendors, empty state', screen: 'vendors', size: { w: 326, h: 183 }, ratio: '16/9' },
  emptyGuests: { id: 'DTS_BEHIND_THE_SCENES_Shauna_Summers_Photos_ID8234_esice8', alt: 'Two friends laughing over a phone', usedIn: 'Guests, empty state', screen: 'guests', size: { w: 326, h: 183 }, ratio: '16/9', focal: '50% 30%' },
  emptyMoodboard: { id: 'DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz', alt: 'A dessert table of pink cakes', usedIn: 'Moodboard, empty state', screen: 'moodboard', size: { w: 326, h: 183 }, ratio: '16/9' },
  emptyRegistry: { id: 'DTS_WANDER_Jessica_MADAVO_Photos_ID12138_dpboww', alt: 'A flower stall in full bloom', usedIn: 'Registry, empty state', screen: 'registry', size: { w: 326, h: 183 }, ratio: '16/9' },
  /* ── Launch and first run ── */
  splash: { id: 'kyoto-hero_vlwgtw', alt: 'A couple walking through a bamboo grove', usedIn: 'In-app splash, behind the logo (once per app open)', screen: 'splash', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 50%' },
  welcome1: { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14280_cddisg', alt: 'A couple under a wide sky', usedIn: 'Welcome, screen 1', screen: 'welcome', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 35%' },
  welcome2: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1041_mudxwa', alt: 'Carrying each other through the snow', usedIn: 'Welcome, screen 2', screen: 'welcome', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 40%' },
  welcome3: { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', alt: 'Sharing cake at the party', usedIn: 'Welcome, screen 3', screen: 'welcome', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 40%' },
  login: { id: 'DTS_First_Date_Marlen_Stahlhuth_Photos_ID4795_upbdbr', alt: 'A couple sitting on a wall under the sky', usedIn: 'Mobile login, top panel', screen: 'login', size: { w: 390, h: 260 }, ratio: '3/2', focal: '50% 40%' },
  priming: { id: 'DTS_Weirdly_Ever_After_Agustín_Farías_Photos_ID8960_nspx4l', alt: 'A kiss on the cheek against orange', usedIn: 'Notification priming, top panel', screen: 'priming', size: { w: 390, h: 260 }, ratio: '3/2', focal: '50% 35%' },
  lock: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp', alt: 'A couple in a mountain meadow', usedIn: 'Face ID lock screen (the couple\'s own photo first)', screen: 'lock', size: { w: 390, h: 844 }, ratio: '4/5' },
  /* ── Preview artifacts ── */
  lockScreenWallpaper: { id: 'hf_20260905_005926_9ff8ad93-21a0-4c2f-8f41-94cd140aa0ee_ib1qrr', alt: 'Steps down to the sea between flowering walls', usedIn: '/m/preview/push wallpaper (the couple\'s own photo when they have one)', screen: 'push', size: { w: 390, h: 844 }, ratio: '4/5' },
  /* ── Fixture stand-ins for the couple\'s own uploads (preview and demo only) ── */
  fixtureCover: { id: 'aspen-hero_zeblit', alt: 'A couple running through snow between pines', usedIn: 'Fixture cover photo: Home hero, Site preview, Account', screen: 'home', size: { w: 390, h: 488 }, ratio: '4/5', focal: '50% 45%' },
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
  return slot.id ? `${CLOUD}/${slot.id.split('/').map(encodeURIComponent).join('/')}` : '';
}

/** Every slot, for the gallery and the docs. */
export function allSlots(): Array<ImageSlot & { key: ImageKey }> {
  return (Object.keys(IMAGES) as ImageKey[]).map((key) => ({ key, ...(IMAGES[key] as ImageSlot) }));
}

/** The slots still waiting for a photo. */
export function todoSlots() {
  return allSlots().filter((s) => s.todo);
}

/** Slots on the same screen that share a photo: what the gallery flags. Empty is the rule. */
export function repeatedSlots(): Array<{ id: string; screen: string; keys: ImageKey[] }> {
  const seen = new Map<string, ImageKey[]>();
  for (const s of allSlots()) {
    if (!s.id) continue;
    const k = `${s.screen}::${s.id}`;
    seen.set(k, [...(seen.get(k) || []), s.key]);
  }
  return [...seen.entries()].filter(([, keys]) => keys.length > 1).map(([k, keys]) => ({ screen: k.split('::')[0], id: k.split('::')[1], keys }));
}

/** Every photo used, for the docs and the once-only check. */
export function usedIds(): string[] {
  return allSlots().map((s) => s.id).filter(Boolean);
}
