/**
 * Goal 5 fixtures: what the parity work needs beyond fixtures/index.js.
 * Places in the shape /api/places-search returns (photo references are
 * `demo:<slot>` and resolve through the image manifest in the preview api
 * only), games, vendor logs and tasks, poll comments, the invitation.
 * Deterministic, no Math.random.
 */

const place = (id, name, address, types, rating, total, price, photo, keywords, extra = {}) => ({
  place_id: id, name, address, rating, user_ratings_total: total, price_level: price, types,
  photo_reference: photo ? `demo:${photo}` : null, maps_url: `https://www.google.com/maps/place/?q=place_id:${id}`, keywords, ...extra,
});

export const FIXTURE_PLACES = [
  place('demo-fig-tree', 'The Fig Tree', '4 Beach Rd, Byron Bay NSW 2481', ['restaurant', 'point_of_interest'], 4.8, 212, 3, 'placeCeremony', ['fig', 'venue', 'wedding', 'byron']),
  place('demo-barn', 'The Barn at Fig Tree', '4 Beach Rd, Byron Bay NSW 2481', ['event_venue'], 4.7, 88, 3, 'placeReception', ['barn', 'venue', 'reception', 'wedding']),
  place('demo-beach-hotel', 'Beach Hotel', '1 Bay St, Byron Bay NSW 2481', ['lodging', 'bar'], 4.4, 3120, 2, 'placeStay1', ['hotel', 'stay', 'beach', 'lodging', 'accommodation']),
  place('demo-elements', 'Elements of Byron', '144 Bayshore Dr, Byron Bay NSW 2481', ['lodging', 'spa'], 4.6, 1450, 4, 'placeStay2', ['hotel', 'stay', 'elements', 'resort', 'lodging', 'accommodation']),
  place('demo-airport', 'Ballina Byron Gateway Airport', 'Southern Cross Dr, Ballina NSW 2478', ['airport'], 4.1, 980, null, 'placeAirport', ['airport', 'ballina', 'transport', 'train', 'bus']),
  place('demo-bayleaf', 'Bayleaf Cafe', '2 Marvell St, Byron Bay NSW 2481', ['cafe', 'restaurant'], 4.6, 1120, 2, 'placePick1', ['cafe', 'coffee', 'breakfast', 'eat', 'brunch']),
  place('demo-lighthouse', 'Cape Byron Lighthouse', 'Lighthouse Rd, Byron Bay NSW 2481', ['tourist_attraction', 'point_of_interest'], 4.8, 6400, null, 'placePick2', ['lighthouse', 'walk', 'do', 'outdoors', 'nature', 'hike']),
  place('demo-ilford', 'Ilford Studio', '12 Fletcher St, Byron Bay NSW 2481', ['point_of_interest'], 4.9, 64, null, 'placeMarket1', ['photographer', 'photography', 'photo', 'video', 'videographer', 'vendor']),
  place('demo-bloom', 'Bloom & Vine Florals', '8 Jonson St, Byron Bay NSW 2481', ['florist', 'store'], 4.7, 91, 2, 'placeMarket2', ['florist', 'flowers', 'floral', 'styling', 'vendor']),
  place('demo-sable', 'Sable Beauty', '3 Lawson St, Byron Bay NSW 2481', ['beauty_salon', 'hair_care'], 4.8, 140, 2, 'placeMarket3', ['makeup', 'hair', 'beauty', 'bridal', 'vendor']),
];

export const FIXTURE_PLACE_DETAILS = Object.fromEntries(FIXTURE_PLACES.map(({ keywords, ...p }) => [p.place_id, {
  ...p,
  phone: p.place_id === 'demo-airport' ? '+61 2 6686 4111' : '+61 2 6685 0000',
  website: `https://example.com/${p.place_id.replace('demo-', '')}`,
  opening_hours: { open_now: true, weekday_text: ['Monday: 7:00 AM to 4:00 PM', 'Tuesday: 7:00 AM to 4:00 PM', 'Wednesday: 7:00 AM to 4:00 PM', 'Thursday: 7:00 AM to 4:00 PM', 'Friday: 7:00 AM to 4:00 PM', 'Saturday: 7:00 AM to 2:00 PM', 'Sunday: 7:00 AM to 2:00 PM'] },
  reviews: [
    { author_name: 'Hannah W', rating: 5, relative_time_description: '2 months ago', text: 'We had the best morning here. Staff could not have been kinder and the coffee is the real thing.' },
    { author_name: 'Marcus L', rating: 4, relative_time_description: '5 months ago', text: 'Busy on a Saturday, but worth the wait. Ask for a table on the verandah.' },
  ],
}]));

export const FIXTURE_GAMES = [
  { id: 'q1', title: 'How well do you know Priya and Tom', intro: 'Ten questions, no prizes, only glory.', is_active: true, recipient_mode: 'all', recipient_tags: [], recipient_guest_ids: [], created_date: '2026-09-02T00:00:00Z',
    questions: [
      { id: 'q1a', text: 'Where did they meet', type: 'multiple_choice', options: ['A car park', 'A wedding', 'Bumble', 'The library'] },
      { id: 'q1b', text: 'What is Tom terrible at', type: 'short_text', options: [] },
      { id: 'q1c', text: 'Who said I love you first', type: 'multiple_choice', options: ['Priya', 'Tom', 'The dog'] },
    ] },
  { id: 'q2', title: 'Advice for the newlyweds', intro: 'One line each, the funnier the better.', is_active: false, recipient_mode: 'tag', recipient_tags: ['Close friends'], recipient_guest_ids: [], created_date: '2026-08-12T00:00:00Z',
    questions: [{ id: 'q2a', text: 'Your one piece of advice', type: 'short_text', options: [] }] },
];

export const FIXTURE_GAME_RESPONSES = [
  { id: 'r1', questionnaire_id: 'q1', guest_name: 'Amelia Nguyen', answers: [{ question_id: 'q1a', answer: 'A car park' }, { question_id: 'q1b', answer: 'Parallel parking' }, { question_id: 'q1c', answer: 'Tom' }], created_date: '2026-09-10T00:00:00Z' },
  { id: 'r2', questionnaire_id: 'q1', guest_name: 'Oliver Singh', answers: [{ question_id: 'q1a', answer: 'Bumble' }, { question_id: 'q1b', answer: 'Karaoke' }, { question_id: 'q1c', answer: 'Priya' }], created_date: '2026-09-11T00:00:00Z' },
  { id: 'r3', questionnaire_id: 'q2', guest_name: 'Charlotte Walker', answers: [{ question_id: 'q2a', answer: 'Never go to bed angry. Stay up and fight.' }], created_date: '2026-08-20T00:00:00Z' },
];

export const FIXTURE_VENDOR_LOGS = [
  { id: 'vl1', vendor_id: 'v3', type: 'email', subject: 'Quote for full day coverage', body: 'Sent 5,200 for 10 hours plus a second shooter for the ceremony.', logged_at: '2026-09-02T03:00:00Z', created_date: '2026-09-02T03:00:00Z' },
  { id: 'vl2', vendor_id: 'v3', type: 'call', subject: 'Chat about the timeline', body: 'Wants to start at 1pm for getting ready shots.', logged_at: '2026-09-09T05:20:00Z', created_date: '2026-09-09T05:20:00Z' },
  { id: 'vl3', vendor_id: 'v1', type: 'document', subject: 'Signed venue contract', body: '', document_type: 'contract', document_url: 'https://example.com/fig-tree-contract.pdf', document_name: 'fig-tree-contract.pdf', logged_at: '2026-07-14T00:00:00Z', created_date: '2026-07-14T00:00:00Z' },
];

export const FIXTURE_VENDOR_TASKS = [
  { id: 'vt1', vendor_id: 'v3', title: 'Send the shot list', due_date: '2026-11-01', priority: 'medium', completed: false, created_date: '2026-09-09T05:30:00Z' },
  { id: 'vt2', vendor_id: 'v1', title: 'Confirm final numbers', due_date: '2027-03-06', priority: 'high', completed: false, created_date: '2026-07-14T00:00:00Z' },
  { id: 'vt3', vendor_id: 'v1', title: 'Pay the deposit', due_date: '2026-07-20', priority: 'high', completed: true, created_date: '2026-07-14T00:00:00Z' },
];

export const FIXTURE_POLL_COMMENTS = [
  { id: 'pc1', poll_id: 'p1', wedding_id: 'preview-wedding', text: 'September, and I will be first on the floor.', guest_name: 'Grace Robinson', created_date: '2026-09-14T00:00:00Z' },
  { id: 'pc2', poll_id: 'p1', wedding_id: 'preview-wedding', text: 'Anything but Mr Brightside please.', guest_name: 'Leo Chen', created_date: '2026-09-15T00:00:00Z' },
];

export const FIXTURE_INVITATION = { id: 'inv1', couple_names: 'Priya & Tom', wedding_date: '2027-03-20', created_date: '2026-08-01T00:00:00Z', updated_date: '2026-09-12T00:00:00Z', template: 'tulum',
  // InvitationBuilder.jsx's starter design, so the demo's preview (InvitationPreview.jsx) draws what a new invitation draws.
  design: { globalStyles: { fontFamily: 'Playfair Display', scrollDirection: 'vertical', transitionType: 'fade', parallax: true }, sections: [{ id: 'hero', name: 'Hero Section', background: { type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }, components: [
    { id: 'text_1', type: 'text', content: { text: 'Priya & Tom' }, styles: { padding: '40px', margin: '20px 0', textAlign: 'center', fontSize: '2rem', color: '#ffffff', fontWeight: 'bold' } },
    { id: 'date_1', type: 'text', content: { text: 'March 20, 2027' }, styles: { padding: '10px', margin: '0', textAlign: 'center', fontSize: '1.25rem', color: '#ffffff' } },
  ] }], selectedSection: 0, selectedElement: null } };

/**
 * The demo's phone contacts (goal 8): what "From contacts" lists in a demo
 * build. Three are already on the guest list (by email, by phone, by name)
 * so the duplicate marks show; the rest are new.
 */
export const FIXTURE_CONTACTS = [
  { id: 'c1', name: 'Amelia Nguyen', email: 'amelia.nguyen@example.com', phone: '+61412000001', address: '12 Lawson St, Byron Bay NSW 2481' },
  { id: 'c2', name: 'Ben Okafor', email: 'ben.okafor@example.com', phone: '+61412000101', address: '' },
  { id: 'c3', name: 'Chloe Martin', email: '', phone: '+61412000102', address: '4/18 Marine Pde, Byron Bay NSW 2481' },
  { id: 'c4', name: 'Dev Patel', email: 'dev.patel@example.com', phone: '', address: '' },
  { id: 'c5', name: 'Elena Rossi', email: 'elena.rossi@example.com', phone: '+61412000104', address: '77 Bangalow Rd, Byron Bay NSW 2481' },
  { id: 'c6', name: 'Farah Haddad', email: 'farah.haddad@example.com', phone: '+61412000105', address: '' },
  { id: 'c7', name: 'George Lin', email: '', phone: '+61412000106', address: '' },
  { id: 'c8', name: 'Harper Robinson', email: 'harper.r@example.com', phone: '+61412000002', address: '' },
  { id: 'c9', name: 'Isla Fraser', email: 'isla.fraser@example.com', phone: '+61412000108', address: '3 Kingsley St, Byron Bay NSW 2481' },
  { id: 'c10', name: 'Jonah Weiss', email: 'jonah.weiss@example.com', phone: '+61412000109', address: '' },
  { id: 'c11', name: 'Ruby Thompson', email: 'ruby.t.work@example.com', phone: '', address: '' },
  { id: 'c12', name: 'Mum', email: 'lakshmi.nair@example.com', phone: '+61412000111', address: '9 Vista Ct, Chatswood NSW 2067' },
  { id: 'c13', name: 'Sam Byrne (plumber)', email: '', phone: '+61412000112', address: '' },
  { id: 'c14', name: 'Tessa Moore', email: 'tessa.moore@example.com', phone: '+61412000113', address: '' },
];
