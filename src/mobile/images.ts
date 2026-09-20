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
 * `todo: true` marks a slot that has no good photo yet and falls back to a
 * colour panel. That list is the shopping list for the next batch.
 *
 * STILLS ONLY. No component may derive motion from an id that starts with
 * DTS_. Public ids are never invented: each one is already served on the
 * marketing site or the universes page, and each was checked to resolve.
 */

export interface ImageSlot {
  /** Cloudinary public id (version prefix included where the site uses one), or '' when todo. */
  id: string;
  alt: string;
  /** Where the slot is drawn. */
  usedIn: string;
  /** The CSS pixel size the slot is drawn at, before 2x/3x. */
  size: { w: number; h: number };
  ratio: '4/5' | '4/3' | '16/9' | '1/1' | '3/2';
  /** object-position when the default centre crop loses the subject. */
  focal?: string;
  /** No good photo yet: render a colour panel and show a "needs photo" marker in the gallery. */
  todo?: boolean;
  /** The panel tone used while todo. */
  tone?: 'ink' | 'sand' | 'blush';
}

export const IMAGES = {
  /* ── Hero fallbacks (used only when the couple has no imagery and their universe has no sample) ── */
  heroDays: { id: 'DTS_Slices_of_Summer_Mark_La_Montagne_Photos_ID2661_vb5omq', alt: 'Two friends lying in the grass at a summer wedding', usedIn: 'Home hero, days to go', size: { w: 358, h: 448 }, ratio: '4/5' },
  heroReplies: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', alt: 'A couple laughing together outdoors', usedIn: 'Home hero, replies', size: { w: 358, h: 448 }, ratio: '4/5' },
  heroAva: { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', alt: 'Guests dancing at a reception', usedIn: 'Home hero, from Ava', size: { w: 358, h: 448 }, ratio: '4/5' },
  heroShare: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp', alt: 'A ceremony under trees', usedIn: 'Home hero, share your site', size: { w: 358, h: 448 }, ratio: '4/5' },

  /* ── Plan hub tiles ── */
  tileEventDetails: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', alt: 'A couple laughing together outdoors', usedIn: 'Plan hub, Event details tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileGuests: { id: 'DTS_Slices_of_Summer_Mark_La_Montagne_Photos_ID2661_vb5omq', alt: 'Two friends lying in the grass', usedIn: 'Plan hub, Guest list tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSeating: { id: 'DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj', alt: 'A long dinner table set for a reception', usedIn: 'Plan hub, Seating tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileWeddingParty: { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h', alt: 'A group of friends in the evening light', usedIn: 'Plan hub, Wedding party tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileMoodboard: { id: 'DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz', alt: 'A dessert table with cakes and fruit', usedIn: 'Plan hub, Moodboard tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileStyling: { id: 'DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2680_fnyjzd', alt: 'Someone holding a bouquet of flowers', usedIn: 'Plan hub, Styling tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileBeauty: { id: 'DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa', alt: 'Getting ready in the morning', usedIn: 'Plan hub, Beauty tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileFood: { id: 'v1779185603/DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj', alt: 'A plated dinner', usedIn: 'Plan hub, Food & beverage tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileMusic: { id: 'DTS_PLAYER_TWO_JELLY_LUISE_Photos_ID13458_a53qq3', alt: 'A record player', usedIn: 'Plan hub, Music tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tilePhotography: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', alt: 'A couple laughing together outdoors', usedIn: 'Plan hub, Photography tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileGuestGifts: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14166_tqzysj', alt: 'A hotel suite with gifts laid out', usedIn: 'Plan hub, Guest gifts tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileMarketplace: { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', alt: 'Guests dancing at a reception', usedIn: 'Plan hub, Marketplace tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileCeremony: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp', alt: 'A ceremony under trees', usedIn: 'Plan hub, Ceremony details tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileAccommodation: { id: 'DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d', alt: 'A hotel room door with a do not disturb sign', usedIn: 'Plan hub, Accommodation tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileRegistry: { id: 'DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14166_tqzysj', alt: 'A hotel suite with gifts laid out', usedIn: 'Plan hub, Registry tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileHoneymoon: { id: 'v1779185631/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0', alt: 'A couple on holiday by the sea', usedIn: 'Plan hub, Honeymoon tile', size: { w: 171, h: 148 }, ratio: '4/3' },
  tileSchedule: { id: '', alt: 'The wedding day timeline', usedIn: 'Plan hub, Schedule tile', size: { w: 171, h: 148 }, ratio: '4/3', todo: true, tone: 'sand' },
  tileBudget: { id: '', alt: 'Planning the budget', usedIn: 'Plan hub, Budget tile', size: { w: 171, h: 148 }, ratio: '4/3', todo: true, tone: 'sand' },
  tileVendors: { id: '', alt: 'Meeting a vendor', usedIn: 'Plan hub, My vendors tile', size: { w: 171, h: 148 }, ratio: '4/3', todo: true, tone: 'sand' },
  tileTransport: { id: '', alt: 'Guests arriving by car', usedIn: 'Plan hub, Transport tile', size: { w: 171, h: 148 }, ratio: '4/3', todo: true, tone: 'sand' },

  /* ── Keep planning cards (Home): reuse the tile images by feature; these two are extra ── */
  keepPlanningDefault: { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', alt: 'Guests dancing at a reception', usedIn: 'Home, keep planning card with no feature image', size: { w: 240, h: 180 }, ratio: '4/3' },

  /* ── Empty states ── */
  emptyVendors: { id: 'DTS_Fine_Dining_Patrick_Chin_Photos_ID955_uoaegj', alt: 'A plated dinner', usedIn: 'My vendors, empty state', size: { w: 326, h: 183 }, ratio: '16/9' },
  emptyGuests: { id: '', alt: 'Friends together', usedIn: 'Guests, empty state', size: { w: 326, h: 183 }, ratio: '16/9', todo: true, tone: 'blush' },
  emptyMoodboard: { id: 'DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz', alt: 'A dessert table with cakes and fruit', usedIn: 'Moodboard, empty state', size: { w: 326, h: 183 }, ratio: '16/9' },
  emptyRegistry: { id: '', alt: 'A wrapped gift', usedIn: 'Registry, empty state', size: { w: 326, h: 183 }, ratio: '16/9', todo: true, tone: 'blush' },

  /* ── First run ── */
  welcome1: { id: 'DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', alt: 'A couple laughing together outdoors', usedIn: 'Welcome, screen 1', size: { w: 390, h: 844 }, ratio: '4/5', focal: '50% 35%' },
  welcome2: { id: 'DTS_Slices_of_Summer_Mark_La_Montagne_Photos_ID2661_vb5omq', alt: 'Two friends lying in the grass', usedIn: 'Welcome, screen 2', size: { w: 390, h: 844 }, ratio: '4/5' },
  welcome3: { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', alt: 'Guests dancing at a reception', usedIn: 'Welcome, screen 3', size: { w: 390, h: 844 }, ratio: '4/5' },
  login: { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp', alt: 'A ceremony under trees', usedIn: 'Mobile login, top panel', size: { w: 390, h: 260 }, ratio: '3/2', focal: '50% 40%' },
  priming: { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h', alt: 'A group of friends in the evening light', usedIn: 'Notification priming, top panel', size: { w: 390, h: 260 }, ratio: '3/2' },
  lock: { id: '', alt: 'The Openinvite mark', usedIn: 'Face ID lock screen (uses the couple\'s own photo first, then ink)', size: { w: 390, h: 844 }, ratio: '4/5', todo: true, tone: 'ink' },

  /* ── Preview artefacts ── */
  lockScreenWallpaper: { id: 'DTS_Slices_of_Summer_Mark_La_Montagne_Photos_ID2661_vb5omq', alt: 'Two friends lying in the grass', usedIn: '/m/preview/push wallpaper (the couple\'s own photo when they have one)', size: { w: 390, h: 844 }, ratio: '4/5' },
} as const satisfies Record<string, ImageSlot>;

export type ImageKey = keyof typeof IMAGES;

export const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';

/** The delivery URL for a slot, or '' when it is todo (so SmartImage draws the panel). */
export function imageUrl(key: ImageKey): string {
  const slot = IMAGES[key] as ImageSlot;
  return slot.id ? `${CLOUD}/${slot.id}` : '';
}

/** Every slot, for the gallery and the docs. */
export function allSlots(): Array<ImageSlot & { key: ImageKey }> {
  return (Object.keys(IMAGES) as ImageKey[]).map((key) => ({ key, ...(IMAGES[key] as ImageSlot) }));
}

/** The slots still waiting for a photo. */
export function todoSlots() {
  return allSlots().filter((s) => s.todo);
}
