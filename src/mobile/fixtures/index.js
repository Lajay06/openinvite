/**
 * Fixture data for /m/preview. An Australian couple, about 80 guests with
 * mixed RSVP states, a part-complete task list, and a budget with several
 * categories. Field names match the real entities (Guest, Note, Budget,
 * Schedule, Vendor, WeddingDetails) so the presentational screens render the
 * same shapes they get from the containers. Deterministic: no Math.random.
 */

const FIRST = ['Amelia', 'Oliver', 'Charlotte', 'Jack', 'Isla', 'Noah', 'Mia', 'William', 'Grace', 'Leo', 'Ava', 'Henry', 'Chloe', 'Thomas', 'Zoe', 'Lucas', 'Ruby', 'Ethan', 'Sophie', 'Harrison', 'Evie', 'Oscar', 'Matilda', 'Hunter', 'Ivy', 'Levi', 'Willow', 'Archie', 'Harper', 'Cooper', 'Ella', 'Max', 'Lily', 'Finn', 'Sienna', 'Elijah', 'Layla', 'Mason', 'Hannah', 'Xavier'];
const LAST = ['Nguyen', 'Smith', 'Williams', 'Chen', 'Brown', 'Taylor', 'Jones', 'Singh', 'Wilson', 'Lee', 'Martin', 'Kelly', 'Thompson', 'Ryan', 'Walker', 'Kaur', 'Robinson', 'Scott', 'Anderson', 'White'];
const CATEGORIES = ['family', 'friends', 'colleagues', 'partners_family', 'partners_friends'];
const STATUSES = ['attending', 'attending', 'attending', 'pending', 'declined', 'attending', 'pending', 'maybe', 'attending', 'pending'];
const DIETS = ['', '', '', 'Vegetarian', '', 'Gluten free', '', '', 'Vegan', ''];

export const FIXTURE_USER = {
  id: 'preview-user',
  full_name: 'Priya Nair',
  email: 'priya@example.com',
  plan: 'pro',
  planActivatedAt: '2026-03-02T00:00:00Z',
  created_date: '2026-02-20T00:00:00Z',
};

export const FIXTURE_WEDDING = {
  id: 'preview-wedding',
  couple1Name: 'Priya',
  couple2Name: 'Tom',
  weddingDate: '2027-03-20',
  activeUniverse: 'tulum',
  slug: 'priya-and-tom',
  websiteEnabled: true,
  coverPhoto: 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_Slices_of_Summer_Mark_La_Montagne_Photos_ID2661_vb5omq',
  ourStoryContent: { photos: ['https://res.cloudinary.com/dsr84xknv/image/upload/DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10310_o5dcie', 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp'] },
  guestCount: 82,
  mainCeremony: { venue: 'The Fig Tree', address: '4 Beach Rd, Byron Bay NSW 2481', time: '15:00' },
  reception: { venue: 'The Fig Tree', address: '4 Beach Rd, Byron Bay NSW 2481', time: '18:00' },
  budget: {
    total: 52000,
    categories: { venue: 18000, catering: 14000, photography: 5500, flowers: 3200, music: 2800, attire: 3500, transportation: 1200, decorations: 1800, rings: 0, stationery: 700, beauty: 900, honeymoon: 0, miscellaneous: 400 },
  },
};

export const FIXTURE_GUESTS = Array.from({ length: 82 }).map((_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const status = STATUSES[i % STATUSES.length];
  const invited = i % 9 !== 4;
  return {
    id: `g${i + 1}`,
    name: `${first} ${last}`,
    email: `${first}.${last}@example.com`.toLowerCase(),
    phone: i % 3 === 0 ? `+6141${String(2000000 + i * 137).slice(0, 7)}` : '',
    category: CATEGORIES[i % CATEGORIES.length],
    rsvp_status: invited ? status : 'pending',
    invite_sent_at: invited ? '2026-08-14T03:00:00Z' : null,
    rsvp_date: invited && status !== 'pending' ? `2026-09-${String(1 + (i % 20)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:10:00Z` : null,
    plus_one: i % 5 === 0,
    plus_one_name: i % 5 === 0 ? `${FIRST[(i + 3) % FIRST.length]} ${last}` : '',
    dietary_requirements: DIETS[i % DIETS.length],
    table_assignment: i % 4 === 0 ? `Table ${(i % 8) + 1}` : '',
    created_date: `2026-06-${String((i % 28) + 1).padStart(2, '0')}T02:00:00Z`,
  };
});

export const FIXTURE_TASKS = [
  { id: 't1', title: 'Confirm final numbers with The Fig Tree', completed: false, priority: 'High', due_date: '2026-10-02', status: 'Ideas' },
  { id: 't2', title: 'Book the celebrant for the rehearsal', completed: false, priority: 'High', due_date: '2026-09-28', status: 'Ideas' },
  { id: 't3', title: 'Send the save the dates', completed: true, priority: 'High', due_date: '2026-08-10', status: 'Done' },
  { id: 't4', title: 'Choose the first dance song', completed: false, priority: 'Medium', due_date: '2026-11-15', status: 'Ideas' },
  { id: 't5', title: 'Order the ceremony flowers', completed: false, priority: 'Medium', due_date: '2026-12-01', status: 'In progress' },
  { id: 't6', title: 'Try the cake samples', completed: true, priority: 'Low', due_date: '2026-08-30', status: 'Done' },
  { id: 't7', title: 'Book the hair and makeup trial', completed: false, priority: 'Medium', due_date: '2026-10-20', status: 'Ideas' },
  { id: 't8', title: 'Write the vows', completed: false, priority: 'Low', due_date: '2027-02-01', status: 'Ideas' },
  { id: 't9', title: 'Reserve the shuttle bus', completed: true, priority: 'Medium', due_date: '2026-09-01', status: 'Done' },
  { id: 't10', title: 'Pick the welcome drinks', completed: false, priority: 'Low', due_date: '', status: 'Ideas' },
].map((t) => ({ ...t, view_type: 'todo', created_date: '2026-07-01T00:00:00Z' }));

export const FIXTURE_BUDGET = [
  { id: 'b1', category: 'venue', item_name: 'The Fig Tree hire', budgeted_amount: 18000, actual_amount: 18000, vendor: 'The Fig Tree', paid: true },
  { id: 'b2', category: 'catering', item_name: 'Three course dinner, 82 guests', budgeted_amount: 12300, actual_amount: 12300, vendor: 'The Fig Tree', paid: false, payment_date: '2026-09-25' },
  { id: 'b3', category: 'catering', item_name: 'Canapes and welcome drinks', budgeted_amount: 1700, actual_amount: 0, vendor: 'The Fig Tree', paid: false },
  { id: 'b4', category: 'photography', item_name: 'Full day coverage', budgeted_amount: 5500, actual_amount: 5200, vendor: 'Ilford Studio', paid: false, payment_date: '2026-10-15' },
  { id: 'b5', category: 'flowers', item_name: 'Ceremony arbour and bouquets', budgeted_amount: 3200, actual_amount: 2400, vendor: 'Bloom & Vine', paid: true },
  { id: 'b6', category: 'music', item_name: 'DJ, reception', budgeted_amount: 2800, actual_amount: 0, vendor: '', paid: false },
  { id: 'b7', category: 'attire', item_name: 'Dress and alterations', budgeted_amount: 3500, actual_amount: 3150, vendor: '', paid: true },
  { id: 'b8', category: 'transportation', item_name: 'Guest shuttle', budgeted_amount: 1200, actual_amount: 1200, vendor: 'Byron Coaches', paid: false },
  { id: 'b9', category: 'decorations', item_name: 'Table styling', budgeted_amount: 1800, actual_amount: 0, vendor: '', paid: false },
  { id: 'b10', category: 'beauty', item_name: 'Hair and makeup, four people', budgeted_amount: 900, actual_amount: 900, vendor: 'Sable Beauty', paid: false },
  { id: 'b11', category: 'stationery', item_name: 'Invitations and menus', budgeted_amount: 700, actual_amount: 640, vendor: '', paid: true },
].map((b) => ({ ...b, created_date: '2026-07-01T00:00:00Z' }));

export const FIXTURE_SCHEDULE = [
  { id: 's1', event_name: 'Guests arrive', event_date: '2027-03-20', start_time: '14:30', end_time: '15:00', location: 'The Fig Tree lawn', category: 'ceremony' },
  { id: 's2', event_name: 'Ceremony', event_date: '2027-03-20', start_time: '15:00', end_time: '15:40', location: 'The Fig Tree lawn', category: 'ceremony' },
  { id: 's3', event_name: 'Photos and canapes', event_date: '2027-03-20', start_time: '15:45', end_time: '17:30', location: 'Garden', category: 'reception' },
  { id: 's4', event_name: 'Reception opens', event_date: '2027-03-20', start_time: '18:00', end_time: '', location: 'The Barn', category: 'reception' },
  { id: 's5', event_name: 'Speeches', event_date: '2027-03-20', start_time: '19:30', end_time: '20:00', location: 'The Barn', category: 'reception' },
  { id: 's6', event_name: 'First dance', event_date: '2027-03-20', start_time: '20:30', end_time: '', location: 'The Barn', category: 'reception' },
  { id: 's7', event_name: 'Rehearsal dinner', event_date: '2027-03-19', start_time: '18:30', end_time: '', location: 'Beach Hotel', category: 'planning' },
];

export const FIXTURE_VENDORS = [
  { id: 'v1', name: 'The Fig Tree', category: 'venue', status: 'booked', quoted_price: 18000 },
  { id: 'v2', name: 'Bloom & Vine', category: 'flowers', status: 'booked', quoted_price: 2400 },
  { id: 'v3', name: 'Ilford Studio', category: 'photography', status: 'quoted', quoted_price: 5200 },
  { id: 'v4', name: 'Sable Beauty', category: 'beauty', status: 'booked', quoted_price: 900 },
  { id: 'v5', name: 'Kestrel Films', category: 'videography', status: 'researching' },
  { id: 'v6', name: 'Byron Coaches', category: 'transportation', status: 'contacted', quoted_price: 1200 },
];

export const FIXTURE_AVA_MESSAGES = [
  { role: 'assistant', text: 'Hi Priya. You have 14 guests still to reply and the celebrant is not booked yet. Want me to draft a reminder to the guests who have not replied?' },
  { role: 'user', text: 'Yes please, keep it short.' },
  { role: 'assistant', text: 'Here is a draft: "Hi, we would love to know if you can make it on 20 March. Reply through the link when you have a moment." I can send it to the 14 guests, or you can edit it first.' },
];

/* ── Goal 2: every feature has realistic preview data ──────────────────── */

export const FIXTURE_MESSAGES = [
  { id: 'm1', guest_name: 'Amelia Nguyen', guest_email: 'amelia.nguyen@example.com', message: 'Hi both, is there parking at The Fig Tree or should we book a cab? Mum has a walking frame so the closer the better.', read: false, replied: false, channel: 'website', created_date: '2026-09-20T22:14:00Z' },
  { id: 'm2', guest_name: 'Oliver Singh', guest_email: 'oliver.singh@example.com', message: 'Can I bring Priya a proper Chennai filter coffee kit as a gift or is that too on the nose', read: false, replied: false, channel: 'website', created_date: '2026-09-20T09:30:00Z' },
  { id: 'm3', guest_name: 'Charlotte Walker', guest_email: 'charlotte.walker@example.com', message: 'We have booked the Beach Hotel for the Friday and Saturday. Is the rehearsal dinner open to plus ones?', read: true, replied: true, reply: 'Yes, bring Sam. Rehearsal dinner is 6.30 at the Beach Hotel, casual.', reply_sent_at: '2026-09-18T04:10:00Z', channel: 'website', created_date: '2026-09-17T23:05:00Z' },
  { id: 'm4', guest_name: 'Jack Smith', guest_email: 'jack.smith@example.com', message: 'Song request: Dancing in the Moonlight. Non negotiable.', read: true, replied: false, channel: 'website', created_date: '2026-09-15T11:00:00Z' },
];

export const FIXTURE_SONG_REQUESTS = [
  { id: 'sr1', title: 'Dancing in the Moonlight', artist: 'Toploader', submittedBy: 'Jack Smith', status: 'pending', guestNote: 'Non negotiable', created_date: '2026-09-15T11:02:00Z' },
  { id: 'sr2', title: 'September', artist: 'Earth, Wind & Fire', submittedBy: 'Grace Robinson', status: 'pending', created_date: '2026-09-19T06:40:00Z' },
  { id: 'sr3', title: 'Cruel Summer', artist: 'Taylor Swift', submittedBy: 'Isla Wilson', status: 'added', created_date: '2026-09-10T02:00:00Z' },
  { id: 'sr4', title: 'Mr. Brightside', artist: 'The Killers', submittedBy: 'Leo Chen', status: 'declined', created_date: '2026-09-08T02:00:00Z' },
];

export const FIXTURE_MUSIC = [
  { id: 'mu1', song_title: 'Golden Hour', artist: 'JVKE', category: 'ceremony', approved: true, guest_suggestion: false },
  { id: 'mu2', song_title: 'Lover', artist: 'Taylor Swift', category: 'first_dance', approved: true, guest_suggestion: false },
  { id: 'mu3', song_title: 'Cruel Summer', artist: 'Taylor Swift', category: 'party', approved: true, guest_suggestion: true },
  { id: 'mu4', song_title: 'Sunday Best', artist: 'Surfaces', category: 'cocktail', approved: true, guest_suggestion: false },
];

export const FIXTURE_POLLS = [
  { id: 'p1', title: 'Which song gets everyone on the floor', category: 'music', options: [{ id: 'o1', label: 'September', votes: 0 }, { id: 'o2', label: 'Dancing Queen', votes: 0 }, { id: 'o3', label: 'Mr. Brightside', votes: 0 }], allowComments: true, comments: [], isActive: true, createdAt: '2026-09-01T00:00:00Z' },
  { id: 'p2', title: 'Late night snack', category: 'food', options: [{ id: 'o4', label: 'Toasties', votes: 0 }, { id: 'o5', label: 'Tacos', votes: 0 }], allowComments: false, comments: [], isActive: false, createdAt: '2026-08-10T00:00:00Z' },
];

export const FIXTURE_POLL_VOTES = [
  ...Array.from({ length: 14 }).map((_, i) => ({ id: `v${i}`, poll_id: 'p1', option_id: ['o1', 'o2', 'o3'][i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 0], guest_identifier: `g${i}`, created_date: `2026-09-${String(12 + (i % 8)).padStart(2, '0')}T0${i % 9}:00:00Z` })),
  ...Array.from({ length: 22 }).map((_, i) => ({ id: `w${i}`, poll_id: 'p2', option_id: i % 5 === 0 ? 'o5' : 'o4', guest_identifier: `g${i}`, created_date: '2026-08-20T00:00:00Z' })),
];

export const FIXTURE_GIFTS = [
  { id: 'gf1', item_name: 'Le Creuset casserole', giver_name: 'Amelia Nguyen', estimated_value: 420, received_date: '2026-09-19', delivery_status: 'received', thank_you_sent: false, created_date: '2026-09-19T03:00:00Z' },
  { id: 'gf2', item_name: 'Honeymoon fund', giver_name: 'The Walkers', estimated_value: 250, received_date: '2026-09-14', delivery_status: 'received', thank_you_sent: true, created_date: '2026-09-14T03:00:00Z' },
];

export const FIXTURE_REGISTRY = {
  links: [{ id: 'rl1', store_name: 'Myer', url: 'https://www.myer.com.au/giftregistry', description: 'Kitchen and home' }, { id: 'rl2', store_name: 'The Wedding Fund', url: 'https://example.com/fund', description: 'Contributions towards the honeymoon' }],
  products: [{ id: 'rp1', name: 'Le Creuset casserole, 24cm', price: 420, quantity_requested: 1, quantity_purchased: 1, registry_platform: 'Myer', priority: 'high' }, { id: 'rp2', name: 'Linen sheet set, queen', price: 280, quantity_requested: 2, quantity_purchased: 0, registry_platform: 'Bed Threads', priority: 'medium' }, { id: 'rp3', name: 'Stanley thermos', price: 65, quantity_requested: 2, quantity_purchased: 1, registry_platform: 'Myer', priority: 'low' }],
  funds: [{ id: 'cf1', title: 'Honeymoon in Hokkaido', description: 'A week in the snow and a lot of ramen', requested_amount: 4000, category: 'honeymoon', payment_link_url: 'https://example.com/pay' }],
  received: FIXTURE_GIFTS,
};

export const FIXTURE_VOWS = [
  { id: 'vs1', title: 'My vows', type: 'vow', author: 'Priya', content: 'Tom, the first thing you ever said to me was a question about parking.', created_date: '2026-08-01T00:00:00Z' },
  { id: 'vs2', title: 'Best man speech', type: 'speech', author: 'Ben', content: '', created_date: '2026-08-20T00:00:00Z' },
];

export const FIXTURE_MOODBOARD = [
  { id: 'mb1', title: 'Arbour with native greenery', category: 'flowers', image_url: 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_Natural_Beauty_Rob_Christain_Crosby_Photos_ID2680_fnyjzd', tags: ['ceremony', 'green'] },
  { id: 'mb2', title: 'Long tables, linen, candles', category: 'decor', image_url: 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj', tags: ['reception'] },
  { id: 'mb3', title: 'Slip dress, no veil', category: 'dress', image_url: 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz', tags: ['attire'] },
  { id: 'mb4', title: 'Golden hour portraits', category: 'other', image_url: 'https://res.cloudinary.com/dsr84xknv/image/upload/DTS_Like_a_Movie_Foster___Asher_Photos_ID1042_qaddk3', tags: ['photos'] },
];

export const FIXTURE_TABLES = [
  { id: 'tb1', name: 'Table 1', capacity: 8, shape: 'round', event_id: 'reception', assigned_guests: [{ guest_id: 'g1', seat_index: 0 }, { guest_id: 'g2', seat_index: 1 }, { guest_id: 'g3', seat_index: 2 }, { guest_id: 'g6', seat_index: 3 }] },
  { id: 'tb2', name: 'Table 2', capacity: 8, shape: 'round', event_id: 'reception', assigned_guests: [{ guest_id: 'g7', seat_index: 0 }, { guest_id: 'g8', seat_index: 1 }] },
  { id: 'tb3', name: 'The kids table', capacity: 6, shape: 'rect', event_id: 'reception', assigned_guests: [] },
];

export const FIXTURE_NOTIFICATION_ENTITY = [
  { id: 'n1', type: 'rsvp_received', title: 'Amelia Nguyen is coming', body: 'Amelia and a plus one. 61 of 73 have replied.', link: '/Guests', read: false, created_date: '2026-09-21T00:20:00Z' },
  { id: 'n2', type: 'collaborator_joined', title: 'Maya Nair joined as a collaborator', body: 'They can see guests and the budget.', link: '/Dashboard', read: true, created_date: '2026-09-16T07:00:00Z' },
];

/** WeddingDetails sub-objects the detail screens read. Merged into FIXTURE_WEDDING by the preview. */
export const FIXTURE_DETAILS_EXTRA = {
  mainCeremony: { venueName: 'The Fig Tree', address: '4 Beach Rd, Byron Bay NSW 2481', startTime: '15:00', dressCode: 'Cocktail, barefoot welcome' },
  reception: { venueName: 'The Fig Tree, the Barn', address: '4 Beach Rd, Byron Bay NSW 2481', startTime: '18:00', dressCode: '' },
  celebrant: { name: 'Jo Marsh', title: '', type: 'celebrant', phone: '+61 412 000 111', email: 'jo@example.com', notes: 'Wants the readings by 1 March.' },
  ceremonyType: 'Civil, outdoors', ceremonyMusic: 'Golden Hour on the walk in', ceremonyReadings: 'Union by Robert Fulghum', vowsNotes: 'Two minutes each, no jokes about parking',
  flowers: { bouquet: 'Loose natives, white and green', bridesmaidBouquets: 'Smaller versions of the same', ceremony: 'Arbour dressed in eucalyptus', centerpieces: 'Bud vases along the tables' },
  decorations: { theme: 'Barefoot, unhurried', colorScheme: 'White, sage, stone' },
  beauty: { styleNotes: 'Soft, glowy, nothing heavy', hairInspo: 'Loose waves, half up' },
  foodBeverage: { serviceStyle: 'family_style', barType: 'open', signatureCocktail: 'Yuzu spritz', dietaryRequirements: '3 vegetarian, 1 coeliac, 1 vegan', weddingCakeDetails: 'Two tiers, lemon and elderflower' },
  photography: { photographyStyle: 'Candid, film', photographyHours: 10, mustHaveShots: 'Both grandmothers together', videoStyle: 'Documentary' },
  weddingFavours: { concept: 'Local honey', supplierName: 'Byron Bee Co', totalBudget: 400, orderedStatus: 'ordered', packagingType: 'Small jar with a tag' },
  transport: { recommendedMode: 'Shuttle from the Beach Hotel', coupleNote: 'A shuttle leaves the Beach Hotel at 2.15pm and brings everyone home at midnight.', parking: { venueParking: true, venueParkingNotes: 'About 40 spots on the grass, weather permitting' }, shuttles: [{ name: 'Beach Hotel shuttle', type: 'Coach', pickupLocation: 'Beach Hotel', pickupTime: '14:15', dropoffLocation: 'The Fig Tree', returnTime: '00:00', capacity: 50, contact: 'Byron Coaches' }] },
  accommodation: { checkInDate: '2027-03-19', checkOutDate: '2027-03-21', coupleNote: 'Most of us are at the Beach Hotel.', manualProperties: [{ name: 'Beach Hotel', address: 'Bay St, Byron Bay', url: 'https://example.com/beach-hotel', priceRange: '$$' }, { name: 'Elements of Byron', address: 'Bayshore Dr', url: 'https://example.com/elements', priceRange: '$$$' }] },
  emergencyContacts: { primary: { name: 'Maya Nair', role: 'Sister of the bride', phone: '+61 400 111 222' }, backup: { name: 'Ben Cooper', role: 'Best man', phone: '+61 400 333 444' }, venue: { name: 'Fig Tree events desk', phone: '+61 2 6685 0000' }, otherNotes: 'Nearest hospital is Byron Central, 10 minutes.' },
  honeymoonDetails: { destination: 'Hokkaido', departureDate: '2027-03-24', returnDate: '2027-04-02', hotelName: 'Niseko lodge', budget: 9000, activitiesPlanned: 'Snow, onsen, ramen' },
  weddingParty: { bridesmaids: [{ name: 'Maya Nair', guestId: null, phone: '+61 400 111 222', notes: 'Maid of honor' }, { name: 'Chloe Lee', guestId: null, phone: '', notes: '' }], groomsmen: [{ name: 'Ben Cooper', guestId: null, phone: '+61 400 333 444', notes: 'Best man' }, { name: 'Harrison Kelly', guestId: null, phone: '', notes: '' }], flowerGirls: [{ name: 'Ivy Nguyen', guestId: null, phone: '', notes: 'Age 5' }], readers: [{ name: 'Oliver Singh', guestId: null, phone: '', notes: '' }] },
  qna: [{ question: 'What should I wear', answer: 'Cocktail, and the ceremony is on grass, so think about heels.' }, { question: 'Is there parking', answer: 'Yes, on the grass at the venue. There is also a shuttle from the Beach Hotel.' }, { question: 'Can I bring my kids', answer: 'Yes, little ones are welcome all day.' }],
  weddingPolicies: { photography: { enabled: true, unplugged: true, message: 'Phones away for the ceremony, then snap away.' }, children: { enabled: true, message: 'Little ones are welcome all day.' }, gifts: { enabled: true, message: 'Your company is the gift. If you would like to give something, the registry is on the site.' }, dressCode: { enabled: true, message: 'Cocktail, barefoot welcome.' }, socialMedia: { enabled: false }, dietary: { enabled: true, message: 'Tell us when you reply and we will look after you.' }, lateArrival: { enabled: false } },
  guestSuiteAccommodation: { places: [{ id: 'pa1', name: 'Beach Hotel', address: 'Bay St, Byron Bay', note: 'Where most of us are staying' }, { id: 'pa2', name: 'Elements of Byron', address: 'Bayshore Dr', note: 'Quieter, with a pool' }] },
  guestSuiteTransport: { places: [{ id: 'pt1', name: 'Ballina Byron Gateway Airport', address: 'Southern Cross Dr, Ballina', note: '30 minutes from the venue' }], notes: [] },
  experienceGuide: { couplePicks: [{ id: 'ep1', name: 'Bayleaf Cafe', address: 'Marvell St', note: 'Our Saturday breakfast', is_couple_pick: true }, { id: 'ep2', name: 'Cape Byron lighthouse walk', address: 'Lighthouse Rd', note: 'Go early', is_couple_pick: true }] },
  polls: FIXTURE_POLLS,
  music: { playlists: [{ id: 'primary', name: 'Wedding playlist', enabled: true, playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC' }] },
  websiteEnabled: true,
};

Object.assign(FIXTURE_WEDDING, FIXTURE_DETAILS_EXTRA);
