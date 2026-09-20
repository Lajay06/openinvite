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
  coverPhoto: '',
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
  { id: 'b2', category: 'catering', item_name: 'Three course dinner, 82 guests', budgeted_amount: 12300, actual_amount: 12300, vendor: 'The Fig Tree', paid: false },
  { id: 'b3', category: 'catering', item_name: 'Canapes and welcome drinks', budgeted_amount: 1700, actual_amount: 0, vendor: 'The Fig Tree', paid: false },
  { id: 'b4', category: 'photography', item_name: 'Full day coverage', budgeted_amount: 5500, actual_amount: 5200, vendor: 'Ilford Studio', paid: false },
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
