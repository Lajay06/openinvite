/**
 * Fixture data for /m/preview. An Australian couple, about 80 guests with
 * mixed RSVP states, a part-complete task list, and a budget with several
 * categories. Field names match the real entities (Guest, Note, Budget,
 * Schedule, Vendor, WeddingDetails) so the presentational screens render the
 * same shapes they get from the containers. Deterministic: no Math.random.
 */

import { imageUrl } from '../images';

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
  coverPhoto: imageUrl('fixtureCover'),
  ourStoryContent: { photos: [imageUrl('fixtureStory1'), imageUrl('fixtureStory2'), imageUrl('fixtureStory3')] },
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
    plus_one_email: i % 10 === 0 ? `${FIRST[(i + 3) % FIRST.length]}.${last}@example.com`.toLowerCase() : '',
    plus_one_dietary_restrictions: i % 10 === 0 ? 'Vegetarian' : '',
    dietary_restrictions: DIETS[i % DIETS.length],
    meal_choice: invited && status === 'attending' ? (i % 2 ? 'meal-fish' : 'meal-chicken') : '',
    plus_one_meal_choice: i % 10 === 0 && status === 'attending' ? 'meal-veg' : '',
    tags: i % 6 === 0 ? ['Close friends'] : i % 7 === 0 ? ['Extended family'] : i % 11 === 0 ? ['University', 'Close friends'] : [],
    table_assignment: i % 4 === 0 ? `Table ${(i % 8) + 1}` : '',
    mailing_address: i % 8 === 0 ? `${12 + i} Jonson St\nByron Bay NSW 2481` : '',
    notes: i % 13 === 0 ? 'Needs a lift from the airport.' : '',
    invite_channel: invited ? (i % 3 === 0 ? 'email+whatsapp' : 'email') : '',
    reminder_sent_at: invited && status === 'pending' && i % 2 === 0 ? '2026-09-10T03:00:00Z' : null,
    rsvp_note: invited && status === 'attending' && i % 9 === 0 ? 'Cannot wait. Save us a seat near the dance floor.' : '',
    song_request: invited && i % 17 === 0 ? 'September, Earth Wind and Fire' : '',
    event_responses: invited ? [
      { event_id: 'main-ceremony', invited: true, status: status === 'attending' ? 'yes' : status === 'declined' ? 'no' : 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: status !== 'pending' ? `2026-09-${String(1 + (i % 20)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:10:00Z` : null },
      { event_id: 'reception', invited: true, status: status === 'attending' ? 'yes' : status === 'declined' ? 'no' : 'pending', meal_choice: status === 'attending' ? (i % 2 ? 'meal-fish' : 'meal-chicken') : null, plus_ones: i % 5 === 0 && status === 'attending' ? 1 : 0, plus_one_names: i % 5 === 0 && status === 'attending' ? [`${FIRST[(i + 3) % FIRST.length]} ${last}`] : [], responded_at: status !== 'pending' ? `2026-09-${String(1 + (i % 20)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:10:00Z` : null },
      { event_id: 'ev-welcome', invited: i % 3 !== 2, status: i % 3 !== 2 && status === 'attending' ? 'yes' : 'pending', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: null },
    ] : [],
    created_date: `2026-06-${String((i % 28) + 1).padStart(2, '0')}T02:00:00Z`,
  };
});

export const FIXTURE_TASKS = [
  { id: 't1', title: 'Confirm final numbers with The Fig Tree', description: 'They need the final count and the dietary list two weeks out.', completed: false, priority: 'high', due_date: '2026-10-02', status: 'In progress' },
  { id: 't2', title: 'Book the celebrant for the rehearsal', completed: false, priority: 'high', due_date: '2026-09-28', status: 'Ideas' },
  { id: 't3', title: 'Send the save the dates', completed: true, priority: 'high', due_date: '2026-08-10', status: 'Done' },
  { id: 't4', title: 'Choose the first dance song', completed: false, priority: 'medium', due_date: '2026-11-15', status: 'Ideas' },
  { id: 't5', title: 'Order the ceremony flowers', completed: false, priority: 'medium', due_date: '2026-12-01', status: 'In progress' },
  { id: 't6', title: 'Try the cake samples', completed: true, priority: 'low', due_date: '2026-08-30', status: 'Done' },
  { id: 't7', title: 'Book the hair and makeup trial', completed: false, priority: 'medium', due_date: '2026-10-20', status: 'Ideas' },
  { id: 't8', title: 'Write the vows', completed: false, priority: 'low', due_date: '2027-02-01', status: 'Ideas' },
  { id: 't9', title: 'Reserve the shuttle bus', completed: true, priority: 'medium', due_date: '2026-09-01', status: 'Done' },
  { id: 't10', title: 'Pick the welcome drinks', completed: false, priority: 'low', due_date: '', status: 'Ideas' },
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
  { id: 'v1', name: 'The Fig Tree', category: 'venue', status: 'booked', quoted_price: 18000, contact_person: 'Sam Reid', phone: '+61 2 6685 0000', email: 'events@example.com', website: 'https://example.com/fig-tree', address: '4 Beach Rd, Byron Bay NSW 2481', price_range: '$$$', rating: 4.8, contract_date: '2026-07-14', contract_signed: true, deposit_paid: true, deposit_amount: 5000, payment_schedule: 'Deposit paid, balance two weeks out', is_favourite: true, notes: 'Wet weather plan is the Barn.' },
  { id: 'v2', name: 'Bloom & Vine', category: 'flowers', status: 'booked', quoted_price: 2400, contact_person: 'Ines', phone: '+61 400 555 010', email: 'hello@example.com', price_range: '$$', deposit_paid: true, deposit_amount: 600 },
  { id: 'v3', name: 'Ilford Studio', category: 'photography', status: 'quoted', quoted_price: 5200, contact_person: 'Dane', phone: '+61 400 555 020', email: 'dane@example.com', website: 'https://example.com/ilford', instagram: '@ilfordstudio', reviews_count: 64, starting_price: 4200, package_selected: 'Full day', hours_booked: 10, style: ['candid', 'documentary'], portfolio_url: 'https://example.com/ilford/work', delivery_timeline: '6 to 8 weeks', image_count: 600, second_shooter: true, backup_equipment: true, travel_fee: 0 },
  { id: 'v4', name: 'Sable Beauty', category: 'beauty', status: 'booked', quoted_price: 900, contact_person: 'Ruby', phone: '+61 400 555 030' },
  { id: 'v5', name: 'Kestrel Films', category: 'videography', status: 'researching', website: 'https://example.com/kestrel', video_length: '4 minute highlight film', editing_style: 'Warm, filmic' },
  { id: 'v6', name: 'Byron Coaches', category: 'transportation', status: 'contacted', quoted_price: 1200, phone: '+61 2 6685 1111' },
].map((v) => ({ ...v, created_date: '2026-06-01T00:00:00Z' }));

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
  { id: 'p1', title: 'Which song gets everyone on the floor', category: 'Dance floor', emoji: '', options: [{ id: 'o1', label: 'September', votes: 0 }, { id: 'o2', label: 'Dancing Queen', votes: 0 }, { id: 'o3', label: 'Mr. Brightside', votes: 0 }], allowComments: true, comments: [], isActive: true, createdAt: '2026-09-01T00:00:00Z', avaInsight: 'September is running away with it.', expiresAt: null },
  { id: 'p2', title: 'Late night snack', category: 'Midnight snack', emoji: '', options: [{ id: 'o4', label: 'Toasties', votes: 0 }, { id: 'o5', label: 'Tacos', votes: 0 }], allowComments: false, comments: [], isActive: false, createdAt: '2026-08-10T00:00:00Z', avaInsight: null, expiresAt: null },
];

export const FIXTURE_POLL_VOTES = [
  ...Array.from({ length: 14 }).map((_, i) => ({ id: `v${i}`, poll_id: 'p1', option_id: ['o1', 'o2', 'o3'][i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 0], guest_identifier: `g${i}`, created_date: `2026-09-${String(12 + (i % 8)).padStart(2, '0')}T0${i % 9}:00:00Z` })),
  ...Array.from({ length: 22 }).map((_, i) => ({ id: `w${i}`, poll_id: 'p2', option_id: i % 5 === 0 ? 'o5' : 'o4', guest_identifier: `g${i}`, created_date: '2026-08-20T00:00:00Z' })),
];

export const FIXTURE_GIFTS = [
  { id: 'gf1', item_name: 'Le Creuset casserole', giver_guest_id: 'g1', giver_name: 'Amelia Nguyen', giver_email: 'amelia.nguyen@example.com', estimated_value: 420, received_date: '2026-09-19', delivery_status: 'received', thank_you_sent: false, thank_you_date: '', thank_you_note: '', category: 'physical', notes: '', created_date: '2026-09-19T03:00:00Z' },
  { id: 'gf2', item_name: 'Honeymoon fund', giver_guest_id: 'g3', giver_name: 'Charlotte Walker', giver_email: 'charlotte.walker@example.com', estimated_value: 250, received_date: '2026-09-14', delivery_status: 'received', thank_you_sent: true, thank_you_date: '2026-09-16', thank_you_note: 'Thank you both, the fund is going straight on ramen.', category: 'cash', notes: '', created_date: '2026-09-14T03:00:00Z' },
  { id: 'gf3', item_name: 'Linen sheet set', giver_guest_id: '', giver_name: 'Aunty Meera', giver_email: '', estimated_value: 280, received_date: '', delivery_status: 'expected', thank_you_sent: false, thank_you_date: '', thank_you_note: '', category: 'physical', notes: 'Coming with her on the day.', created_date: '2026-09-20T03:00:00Z' },
];

export const FIXTURE_REGISTRY = {
  links: [{ id: 'rl1', store_name: 'Myer', url: 'https://www.myer.com.au/giftregistry', description: 'Kitchen and home', image_url: '' }, { id: 'rl2', store_name: 'The Wedding Fund', url: 'https://example.com/fund', description: 'Contributions towards the honeymoon', image_url: '' }],
  products: [{ id: 'rp1', name: 'Le Creuset casserole, 24cm', price: 420, category: 'kitchen', quantity_requested: 1, quantity_purchased: 1, registry_platform: 'Other', priority: 'high', purchased_by: [{ guest_name: 'Amelia Nguyen', quantity: 1, message: 'Sunday roasts on us', purchase_date: '2026-09-19T00:00:00Z' }] }, { id: 'rp2', name: 'Linen sheet set, queen', price: 280, category: 'bedding', quantity_requested: 2, quantity_purchased: 0, registry_platform: 'Other', priority: 'medium', purchased_by: [] }, { id: 'rp3', name: 'Stanley thermos', price: 65, category: 'outdoor', quantity_requested: 2, quantity_purchased: 1, registry_platform: 'Amazon', priority: 'low', purchased_by: [{ guest_name: 'Leo Chen', quantity: 1, message: '', purchase_date: '2026-09-10T00:00:00Z' }] }],
  funds: [{ id: 'cf1', title: 'Honeymoon in Hokkaido', description: 'A week in the snow and a lot of ramen', requested_amount: 4000, category: 'honeymoon', payment_link_url: 'https://example.com/pay', image_url: '' }],
  received: FIXTURE_GIFTS,
};

export const FIXTURE_VOWS = [
  { id: 'vs1', title: 'My vows', type: 'vow', author: 'Priya', content: 'Tom, the first thing you ever said to me was a question about parking.', created_date: '2026-08-01T00:00:00Z' },
  { id: 'vs2', title: 'Best man speech', type: 'speech', author: 'Ben', content: '', created_date: '2026-08-20T00:00:00Z' },
];

export const FIXTURE_MOODBOARD = [
  { id: 'mb1', title: 'Lilies in red light', category: 'flowers', image_url: imageUrl('fixturePin1'), tags: ['ceremony', 'evening'], board_name: 'Main board', source_url: '', notes: 'For the arbour, if Ines can get them in March.' },
  { id: 'mb2', title: 'Flowers carried down the street', category: 'decor', image_url: imageUrl('fixturePin2'), tags: ['reception'], board_name: 'Main board', source_url: 'https://example.com/pin/2', notes: '' },
  { id: 'mb3', title: 'A coupe for cocktail hour', category: 'other', image_url: imageUrl('fixturePin3'), tags: ['drinks'], board_name: 'Main board', source_url: '', notes: '' },
  { id: 'mb4', title: 'White shirts, arms linked', category: 'dress', image_url: imageUrl('fixturePin4'), tags: ['attire'], board_name: 'Dress inspiration', source_url: '', notes: '' },
];

export const FIXTURE_TABLES = [
  { id: 'tb1', name: 'Table 1', capacity: 8, shape: 'round', event_id: 'reception', assigned_guests: [{ guest_id: 'g1', seat_index: 0 }, { guest_id: 'g2', seat_index: 1 }, { guest_id: 'g3', seat_index: 2 }, { guest_id: 'g6', seat_index: 3 }] },
  { id: 'tb2', name: 'Table 2', capacity: 8, shape: 'round', event_id: 'reception', assigned_guests: [{ guest_id: 'g7', seat_index: 0 }, { guest_id: 'g8', seat_index: 1 }] },
  { id: 'tb3', name: 'The kids table', capacity: 6, shape: 'rectangle', event_id: 'reception', assigned_guests: [] },
];

export const FIXTURE_NOTIFICATION_ENTITY = [
  { id: 'n1', type: 'rsvp_received', title: 'Amelia Nguyen is coming', body: 'Amelia and a plus one. 61 of 73 have replied.', link: '/Guests', read: false, created_date: '2026-09-21T00:20:00Z' },
  { id: 'n2', type: 'collaborator_joined', title: 'Maya Nair joined as a collaborator', body: 'They can see guests and the budget.', link: '/Dashboard', read: true, created_date: '2026-09-16T07:00:00Z' },
];

/** WeddingDetails sub-objects the detail screens read. Merged into FIXTURE_WEDDING by the preview. */
export const FIXTURE_DETAILS_EXTRA = {
  guestType: 'celebration',
  previousSlugs: [],
  mainCeremony: { venueName: 'The Fig Tree', address: '4 Beach Rd, Byron Bay NSW 2481', placeId: 'demo-fig-tree', mapsUrl: 'https://www.google.com/maps/place/?q=place_id:demo-fig-tree', photoUrl: imageUrl('placeCeremony'), startTime: '15:00', endTime: '15:40', dressCode: 'Cocktail, barefoot welcome', parkingInfo: 'On the grass by the gate', accessibilityNotes: 'Flat path from the car park to the lawn', notes: '' },
  reception: { venueName: 'The Barn at Fig Tree', address: '4 Beach Rd, Byron Bay NSW 2481', placeId: 'demo-barn', mapsUrl: 'https://www.google.com/maps/place/?q=place_id:demo-barn', photoUrl: imageUrl('placeReception'), startTime: '18:00', endTime: '23:30', dressCode: '', parkingInfo: '', accessibilityNotes: '', notes: 'Bar closes at 11.' },
  preWeddingEvents: [
    { id: 'ev-welcome', event_id: 'ev-welcome', name: 'Welcome drinks', type: 'Welcome Cocktails', kind: 'pre', date: '2027-03-19', startTime: '18:30', endTime: '21:00', time: '18:30', venueName: 'Beach Hotel', venue: 'Beach Hotel', venueAddress: '1 Bay St, Byron Bay NSW 2481', address: '1 Bay St, Byron Bay NSW 2481', venueMapsUrl: 'https://www.google.com/maps/place/?q=place_id:demo-beach-hotel', venuePhotoUrl: imageUrl('placeStay1'), venuePlaceId: 'demo-beach-hotel', dressCode: 'Casual', parkingInfo: '', accessibilityNotes: '', notes: 'Come and go as you like.', details: 'Come and go as you like.' },
  ],
  postWeddingEvents: [
    { id: 'ev-brunch', event_id: 'ev-brunch', name: 'Recovery brunch', type: 'Next-Day Brunch', kind: 'post', date: '2027-03-21', startTime: '10:00', endTime: '12:30', time: '10:00', venueName: 'Bayleaf Cafe', venue: 'Bayleaf Cafe', venueAddress: '2 Marvell St, Byron Bay NSW 2481', address: '2 Marvell St, Byron Bay NSW 2481', venueMapsUrl: 'https://www.google.com/maps/place/?q=place_id:demo-bayleaf', venuePhotoUrl: '', venuePlaceId: 'demo-bayleaf', dressCode: '', parkingInfo: '', accessibilityNotes: '', notes: '', details: '' },
  ],
  theme: { aesthetic: ['Beach', 'Boho'], faith: 'Non-religious', faithSecondary: '', culture: ['Indian'], cultureOther: '', atmosphere: ['Outdoor & nature', 'Big party'], season: 'Autumn', setting: 'Mix of both' },
  celebrant: { name: 'Jo Marsh', title: '', type: 'celebrant', phone: '+61 412 000 111', email: 'jo@example.com', notes: 'Wants the readings by 1 March.' },
  license: { issuingOffice: 'Births, Deaths and Marriages NSW', applicationDate: '2027-01-15', issueDate: '', expiryDate: '', licenseNumber: '', witnessesRequired: 2, notes: '' },
  ceremonyType: 'Civil, outdoors', ceremonyMusic: 'Golden Hour on the walk in', ceremonyReadings: 'Union by Robert Fulghum', vowsNotes: 'Two minutes each, no jokes about parking',
  attire: {
    outfits: [
      { id: 'of1', role: 'Bride', name: 'Priya', description: 'Ivory silk slip, low back', source: 'Grace Loves Lace', status: 'In alterations', measurements: 'AU 10', cost: '$2,400', photoUrl: '' },
      { id: 'of2', role: 'Groom', name: 'Tom', description: 'Sand linen suit, no tie', source: 'MJ Bale', status: 'Ordered', measurements: '40R', cost: '$900', photoUrl: '' },
      { id: 'of3', role: 'Bridesmaid', name: 'Maya', description: 'Sage, any style she likes', source: 'Her choice', status: 'Researching', measurements: '', cost: '', photoUrl: '' },
    ],
    tailorVendorId: '',
    tailor: { notes: 'Second fitting booked for February.' },
    fittings: [{ id: 'ft1', date: '2027-02-10', who: 'Priya', notes: 'Hem and the back strap' }],
    accessories: [{ id: 'ac1', item: 'Veil', for: 'Priya', notes: 'Fingertip length' }, { id: 'ac2', item: 'Cufflinks', for: 'Tom', notes: 'His grandfather\'s' }],
    notes: 'Ceremony is on grass, so no stilettos.',
  },
  flowers: { vendorId: 'v2', bouquet: 'Loose natives, white and green', bridesmaidBouquets: 'Smaller versions of the same', boutonnieres: 'A sprig of eucalyptus', additional: '', ceremony: 'Arbour dressed in eucalyptus', centerpieces: 'Bud vases along the tables', notes: '' },
  decorations: { vendorId: '', theme: 'Barefoot, unhurried', colorScheme: 'White, sage, stone', ceremonyDecorations: 'Arbour, a runner of petals', receptionDecorations: 'Festoon lights over the long tables', lighting: 'Festoons and candles', linens: 'Oatmeal linen', specialElements: 'A polaroid wall', notes: '' },
  beauty: {
    hairArtistVendorId: 'v4', makeupArtistVendorId: 'v4', styleNotes: 'Soft, glowy, nothing heavy', hairInspo: 'Loose waves, half up',
    gettingReadyPeople: [{ id: 'gp1', name: 'Priya', role: 'Bride', service: 'both' }, { id: 'gp2', name: 'Maya', role: 'Maid of honor', service: 'both' }, { id: 'gp3', name: 'Chloe', role: 'Bridesmaid', service: 'hair' }, { id: 'gp4', name: 'Meera', role: 'Mum', service: 'makeup' }],
    skincareTimeline: [{ id: 'sk1', timeframe: '6 months before', treatment: 'Start a proper routine', notes: '', done: true }, { id: 'sk2', timeframe: '2 weeks before', treatment: 'Last facial', notes: 'Nothing new after this', done: false }],
    trials: [{ id: 'tr1', date: '2026-10-20', artist: 'Ruby at Sable', lookDescription: 'Soft glam, brown liner', notes: 'Loved it. Less blush next time.', rating: 5 }],
  },
  foodBeverage: { vendorId: 'v1', serviceStyle: 'family_style', barType: 'full_bar', signatureCocktail: 'Yuzu spritz', dietaryRequirements: '3 vegetarian, 1 coeliac, 1 vegan', weddingCakeDetails: 'Two tiers, lemon and elderflower', barNotes: 'Local beer and a NSW white', additionalNotes: '' },
  menuItems: [{ name: 'Burrata, peach, basil', description: 'To start, shared' }, { name: 'Slow lamb shoulder', description: 'With the good potatoes' }, { name: 'Lemon and elderflower cake', description: 'Instead of dessert' }],
  mealOptions: [{ id: 'meal-chicken', label: 'Roast chicken' }, { id: 'meal-fish', label: 'Market fish' }, { id: 'meal-veg', label: 'Pumpkin and sage lasagne' }],
  photography: { photographerVendorId: 'v3', videographerVendorId: '', photographyStyle: 'Candid, film', photographyPackage: 'Full day', photographyHours: 10, editingStyle: 'True to color', editedPhotosCount: 600, photoDeliveryTimeline: '6 to 8 weeks', deliveryFormat: 'Online gallery', gettingReadyShots: 'The dress on the hanger, Mum doing the bangles', ceremonyShots: 'The walk in, the rings, the kiss', familyPortraits: 'Both families together, then each side', receptionShots: 'Speeches, the cake, the dance floor', mustHaveShots: 'Both grandmothers together', videographyPackage: '', videoStyle: 'Documentary', videoLength: '', videoDeliveryTimeline: '' },
  weddingFavours: { concept: 'Local honey', supplierName: 'Byron Bee Co', totalBudget: 400, orderedStatus: 'ordered', favourItems: [{ name: 'Honey jar, 100g', quantity: 90, costPerUnit: 4, notes: 'Wildflower' }, { name: 'Kraft tag', quantity: 90, costPerUnit: 0.3, notes: '' }], packagingType: 'Small jar with a tag', packagingSupplier: 'Byron Bee Co', personalised: true, personalisationDetails: 'Names and the date on the tag', tagsNotes: '', displayNotes: 'One at each place setting', additionalNotes: '' },
  transport: {
    recommendedMode: 'shuttle', coupleNote: 'A shuttle leaves the Beach Hotel at 2.15pm and brings everyone home at midnight.', freeTextNotes: '',
    parking: { venueParking: true, venueParkingNotes: 'About 40 spots on the grass, weather permitting', nearbyCarParks: [{ name: 'Beach car park', address: 'Bay St', distance: '5 minutes', cost: 'Free after 6pm' }], streetParking: 'Beach Rd, limited', accessibilityNotes: 'Two spots by the gate' },
    publicTransport: { generalNotes: 'Buses run hourly from Ballina.', routes: [{ type: 'bus', notes: 'Route 640 from Ballina airport to Byron', totalTime: '45 minutes' }] },
    rideshare: { pickupLocation: 'The front gate on Beach Rd', dropoffLocation: 'Same gate', lateNightNote: 'Book ahead, cars are scarce after 11.' },
    shuttles: [{ id: 's_1', name: 'Beach Hotel shuttle', type: 'coach', pickupLocation: 'Beach Hotel', pickupTime: '14:15', dropoffLocation: 'The Fig Tree', returnTime: '00:00', capacity: 50, contact: 'Byron Coaches', notes: '' }],
  },
  accommodation: {
    checkInDate: '2027-03-19', checkOutDate: '2027-03-21', coupleNote: 'Most of us are at the Beach Hotel.', additionalNotes: '',
    manualProperties: [
      { id: 'mp1', name: 'Beach Hotel', address: '1 Bay St, Byron Bay', website: 'https://example.com/beach-hotel', phone: '+61 2 6685 6402', bookingCode: 'PRIYATOM', coupleNote: 'Mention the wedding for the group rate.', tags: ['Where most guests are staying', 'Walk to venue'], isMainGuestHotel: true, isClosestToVenue: false, isBestValue: false, isPinned: true, photoUrl: '' },
      { id: 'mp2', name: 'Elements of Byron', address: '144 Bayshore Dr', website: 'https://example.com/elements', phone: '', bookingCode: '', coupleNote: '', tags: ['Premium option', 'Great for families'], isMainGuestHotel: false, isClosestToVenue: false, isBestValue: false, isPinned: false, photoUrl: '' },
    ],
  },
  emergencyContacts: { primary: { name: 'Maya Nair', role: 'Sister of the bride', phone: '+61 400 111 222' }, backup: { name: 'Ben Cooper', role: 'Best man', phone: '+61 400 333 444' }, venue: { name: 'Fig Tree events desk', phone: '+61 2 6685 0000' }, otherNotes: 'Nearest hospital is Byron Central, 10 minutes.' },
  dayVendorContacts: [{ name: 'Dane, Ilford Studio', role: 'Photographer', phone: '+61 400 555 020' }, { name: 'Ines, Bloom & Vine', role: 'Florist', phone: '+61 400 555 010' }],
  honeymoonDetails: { destination: 'Hokkaido', departureDate: '2027-03-24', returnDate: '2027-04-02', budget: 9000, departureAirport: 'Sydney', flightReference: 'QF27', travelInsurance: true, travelInsuranceDetails: 'Cover-More, policy ending 4471', hotelName: 'Niseko lodge', checkInDate: '2027-03-25', checkOutDate: '2027-04-01', bookingReference: 'NSK-2027-118', confirmationNumber: '', activitiesPlanned: 'Snow, onsen, ramen', packingNotes: 'Thermals, the good camera', notes: '' },
  weddingParty: {
    maidOfHonour: { name: 'Maya Nair', guestId: null }, bestMan: { name: 'Ben Cooper', guestId: null }, keyRoleNotes: 'Maya has the rings until the morning.',
    bridesmaids: [{ name: 'Maya Nair', guestId: null, phone: '+61 400 111 222', notes: 'Maid of honor' }, { name: 'Chloe Lee', guestId: 'g13', phone: '', notes: '' }],
    groomsmen: [{ name: 'Ben Cooper', guestId: null, phone: '+61 400 333 444', notes: 'Best man' }, { name: 'Harrison Kelly', guestId: 'g20', phone: '', notes: '' }],
    flowerGirls: [{ name: 'Ivy Nguyen', guestId: null, phone: '', notes: 'Age 5' }],
    readers: [{ name: 'Oliver Singh', guestId: 'g2', phone: '', notes: '' }],
  },
  qna: [{ id: 1, question: 'What should I wear', answer: 'Cocktail, and the ceremony is on grass, so think about heels.' }, { id: 2, question: 'Is there parking', answer: 'Yes, on the grass at the venue. There is also a shuttle from the Beach Hotel.' }, { id: 3, question: 'Can I bring my kids', answer: 'Yes, little ones are welcome all day.' }],
  weddingPolicies: {
    photography: { unplugged: true, message: 'Phones away for the ceremony, then snap away.', display: true },
    socialMedia: { noCeremony: true, tagUs: true, hashtag: '#PriyaAndTomDoByron', message: '', display: true },
    children: { option: 'all', message: 'Little ones are welcome all day.', display: true },
    dietary: { description: 'Vegetarian, vegan and gluten free are all covered.', contactName: 'Priya', contactEmail: 'priya@example.com', display: true },
    gifts: { option: 'welcome', registryUrl: '', message: 'Your company is the gift. If you would like to give something, the registry is on the site.', display: true },
    dressCode: { guidance: 'Cocktail, barefoot welcome.', weatherNote: 'March is warm; bring a layer for the evening.', display: true },
    lateArrival: { policy: '', display: false },
    other: { text: '', display: false },
    stylingQuestionnaire: { enabled: true },
  },
  guestExperience: { backgroundMusic: { enabled: false, source: '', url: '', trackId: '', trackName: '' }, showAttending: true, showCircle: false },
  guestSuiteAccommodation: { places: [
    { id: 'pa1', place_id: 'demo-beach-hotel', name: 'Beach Hotel', address: '1 Bay St, Byron Bay NSW 2481', rating: 4.4, price_level: 2, photo_url: imageUrl('placeStay1'), maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-beach-hotel', website_url: 'https://example.com/beach-hotel', note: 'Where most of us are staying', badge: 'Where most guests are staying' },
    { id: 'pa2', place_id: 'demo-elements', name: 'Elements of Byron', address: '144 Bayshore Dr, Byron Bay NSW 2481', rating: 4.6, price_level: 4, photo_url: imageUrl('placeStay2'), maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-elements', website_url: 'https://example.com/elements', note: 'Quieter, with a pool', badge: 'Luxury pick' },
  ] },
  guestSuiteTransport: {
    places: [{ id: 'pt1', place_id: 'demo-airport', name: 'Ballina Byron Gateway Airport', address: 'Southern Cross Dr, Ballina NSW 2478', type: 'airport', photo_url: imageUrl('placeAirport'), maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-airport', note: '30 minutes from the venue' }],
    notes: [{ id: 'tn1', title: 'Rideshare', text: 'Uber and DiDi both run in Byron, but book ahead after 11pm.' }, { id: 'tn2', title: 'The shuttle', text: 'Leaves the Beach Hotel at 2.15pm sharp.' }],
  },
  experienceGuide: {
    published: true, heroPhotoUrl: '', editorialIntro: 'Byron Bay is where the morning starts on the sand and ends with a long lunch nobody planned.', vibes: ['Relaxed beach culture', 'Late-night food scene'],
    categories: {
      coffee: { places: [{ place_id: 'demo-bayleaf', name: 'Bayleaf Cafe', address: '2 Marvell St, Byron Bay NSW 2481', rating: 4.6, price_level: 2, photo_ref: 'demo:placePick1', maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-bayleaf', website_url: 'https://example.com/bayleaf', note: 'Our Saturday breakfast', is_couple_pick: true }] },
      nature: { places: [{ place_id: 'demo-lighthouse', name: 'Cape Byron Lighthouse', address: 'Lighthouse Rd, Byron Bay NSW 2481', rating: 4.8, price_level: null, photo_ref: 'demo:placePick2', maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-lighthouse', website_url: '', note: 'Go early, before the heat', is_couple_pick: true }] },
    },
    couplePicks: [
      { place_id: 'demo-bayleaf', name: 'Bayleaf Cafe', address: '2 Marvell St, Byron Bay NSW 2481', rating: 4.6, price_level: 2, photo_ref: 'demo:placePick1', maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-bayleaf', website_url: 'https://example.com/bayleaf', note: 'Our Saturday breakfast', is_couple_pick: true, category: 'Coffee' },
      { place_id: 'demo-lighthouse', name: 'Cape Byron Lighthouse', address: 'Lighthouse Rd, Byron Bay NSW 2481', rating: 4.8, price_level: null, photo_ref: 'demo:placePick2', maps_url: 'https://www.google.com/maps/place/?q=place_id:demo-lighthouse', website_url: '', note: 'Go early, before the heat', is_couple_pick: true, category: 'Outdoors' },
    ],
    itinerary: { days: 3, schedule: [
      { day: 1, title: 'Arrive and settle', summary: 'Check in, then drinks on the beach.', blocks: { morning: [], afternoon: [{ id: 'it1', type: 'custom', place_name: 'Check in to your hotel', note: '' }], evening: [{ id: 'it2', type: 'custom', place_name: 'Welcome drinks at the Beach Hotel', note: 'From 6.30' }] } },
      { day: 2, title: 'The wedding', summary: 'The big one.', blocks: { morning: [{ id: 'it3', type: 'place', place_id: 'demo-bayleaf', place_name: 'Bayleaf Cafe', category: 'Coffee', note: 'Breakfast, then rest' }], afternoon: [{ id: 'it4', type: 'custom', place_name: 'Shuttle from the Beach Hotel at 2.15', note: '' }], evening: [] } },
      { day: 3, title: 'Recover', summary: 'A slow morning.', blocks: { morning: [{ id: 'it5', type: 'place', place_id: 'demo-lighthouse', place_name: 'Cape Byron Lighthouse', category: 'Outdoors', note: 'If you are up for it' }], afternoon: [], evening: [] } },
    ] },
  },
  polls: FIXTURE_POLLS,
  music: { playlists: [{ id: 'primary', name: 'Wedding playlist', enabled: true, playlistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC' }], guestRequestsEnabled: true, requestsRequireApproval: true, limitOnePerGuest: false, requestMessage: '', notes: 'No Ed Sheeran. Tom is firm on this.' },
  websiteEnabled: true,
};

Object.assign(FIXTURE_WEDDING, FIXTURE_DETAILS_EXTRA);
