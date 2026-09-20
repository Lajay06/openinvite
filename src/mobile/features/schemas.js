/**
 * Field schemas for the generic screens.
 *
 * DETAILS (a form over WeddingDetails sub-objects). Each section names the
 * sub-object key it edits (`key`), or null for top-level fields, and whether
 * that key is AES-encrypted at rest (then it saves through
 * putMyWeddingDetails, as CeremonyDetails.jsx and EmergencyContact.jsx do;
 * plaintext keys save through WeddingDetails.update, as the rest do).
 *
 * ENTITY (a list of records). `entity` is the base44 entity name, `fields`
 * drive the add / edit sheet, `title`/`sub`/`badge` render a row. Field
 * names are the ones the desktop forms write.
 *
 * Field types: text, textarea, date, time, number, email, tel, url, select,
 * toggle, list (an array of objects with `fields` of its own).
 */
import { BUDGET_CATEGORIES } from '@/lib/budgetCategories';
import { VENDOR_STATUS_LABEL } from '../lib/format';
import { Calendar, Store, FileText, Gift, Music2, Phone } from 'lucide-react';
import { openExternal } from '../native';
import { imageUrl } from '../images';

const t = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
const ta = (name, label, extra = {}) => ({ name, label, type: 'textarea', ...extra });
const opt = (arr) => arr.map(([value, label]) => ({ value, label }));

export const DETAILS = {
  'event-details': {
    title: 'Event details',
    sections: [
      { title: 'The two of you', key: null, fields: [t('couple1Name', 'Your name'), t('couple2Name', "Your partner's name"), t('weddingDate', 'Wedding date', { type: 'date' }), t('guestCount', 'Expected guests', { type: 'number' })] },
      { title: 'Ceremony', key: 'mainCeremony', fields: [t('venueName', 'Venue'), t('address', 'Address'), t('startTime', 'Start time', { type: 'time' }), t('dressCode', 'Dress code')] },
      { title: 'Reception', key: 'reception', fields: [t('venueName', 'Venue'), t('address', 'Address'), t('startTime', 'Start time', { type: 'time' }), t('dressCode', 'Dress code')] },
    ],
  },
  styling: {
    title: 'Styling',
    sections: [
      { title: 'Flowers', key: 'flowers', fields: [ta('bouquet', 'Bouquet'), ta('bridesmaidBouquets', 'Bridesmaid bouquets'), ta('boutonnieres', 'Boutonnieres'), ta('ceremony', 'Ceremony flowers'), ta('centerpieces', 'Centrepieces'), ta('additional', 'Anything else'), ta('notes', 'Notes')] },
      { title: 'Decorations', key: 'decorations', fields: [t('theme', 'Theme'), t('colorScheme', 'Colour scheme'), ta('ceremonyDecorations', 'Ceremony decorations'), ta('receptionDecorations', 'Reception decorations'), ta('lighting', 'Lighting'), ta('linens', 'Linens'), ta('specialElements', 'Special elements'), ta('notes', 'Notes')] },
    ],
  },
  beauty: {
    title: 'Beauty',
    sections: [
      { title: 'Hair and makeup', key: 'beauty', fields: [ta('styleNotes', 'The look you want'), ta('hairInspo', 'Inspiration and references')] },
    ],
  },
  food: {
    title: 'Food & beverage',
    sections: [
      { title: 'Catering', key: 'foodBeverage', fields: [t('serviceStyle', 'Service style', { type: 'select', options: opt([['plated', 'Plated'], ['buffet', 'Buffet'], ['family_style', 'Family style'], ['cocktail', 'Cocktail'], ['food_stations', 'Food stations']]) }), ta('dietaryRequirements', 'Dietary requirements to cover'), ta('weddingCakeDetails', 'Cake')] },
      { title: 'Bar', key: 'foodBeverage', fields: [t('barType', 'Bar', { type: 'select', options: opt([['open', 'Open bar'], ['limited', 'Limited open bar'], ['cash', 'Cash bar'], ['byo', 'BYO']]) }), t('signatureCocktail', 'Signature drink'), ta('barNotes', 'Bar notes'), ta('additionalNotes', 'Anything else')] },
    ],
  },
  photography: {
    title: 'Photography',
    sections: [
      { title: 'Photography', key: 'photography', fields: [t('photographyStyle', 'Style you love'), t('photographyPackage', 'Package'), t('photographyHours', 'Hours of coverage', { type: 'number' }), t('editingStyle', 'Editing style'), t('editedPhotosCount', 'Edited photos', { type: 'number' }), t('photoDeliveryTimeline', 'Photos delivered'), t('deliveryFormat', 'Delivery format')] },
      { title: 'Shots', key: 'photography', fields: [ta('gettingReadyShots', 'Getting ready'), ta('ceremonyShots', 'Ceremony'), ta('familyPortraits', 'Family portraits'), ta('receptionShots', 'Reception'), ta('mustHaveShots', 'Must-have shots')] },
      { title: 'Video', key: 'photography', fields: [t('videographyPackage', 'Package'), t('videoStyle', 'Style'), t('videoLength', 'Length'), t('videoDeliveryTimeline', 'Video delivered')] },
    ],
  },
  favours: {
    title: 'Guest gifts',
    sections: [
      { title: 'The gift', key: 'weddingFavours', fields: [t('concept', 'What you are giving'), t('supplierName', 'Supplier'), t('totalBudget', 'Budget', { type: 'number' }), t('orderedStatus', 'Status', { type: 'select', options: opt([['not_ordered', 'Not ordered'], ['ordered', 'Ordered'], ['received', 'Received']]) })] },
      { title: 'Packaging and tags', key: 'weddingFavours', fields: [t('packagingType', 'Packaging'), t('packagingSupplier', 'Packaging supplier'), t('personalised', 'Personalised', { type: 'toggle' }), ta('personalisationDetails', 'Personalisation'), ta('tagsNotes', 'Tags'), ta('displayNotes', 'How they are displayed'), ta('additionalNotes', 'Notes')] },
    ],
  },
  ceremony: {
    title: 'Ceremony details',
    sections: [
      { title: 'Celebrant', key: 'celebrant', encrypted: true, fields: [t('name', 'Name'), t('title', 'Title'), t('type', 'Type', { type: 'select', options: opt([['celebrant', 'Professional celebrant'], ['religious', 'Religious officiant'], ['friend', 'Friend or family'], ['registry', 'Registry office']]) }), t('phone', 'Phone', { type: 'tel' }), t('email', 'Email', { type: 'email' }), ta('notes', 'Notes')] },
      { title: 'The ceremony', key: null, fields: [t('ceremonyType', 'Type of ceremony'), ta('ceremonyMusic', 'Music'), ta('ceremonyReadings', 'Readings'), ta('vowsNotes', 'Vows'), ta('orderOfServiceNotes', 'Order of service'), ta('ringBearerDetails', 'Ring bearer'), ta('flowerGirlDetails', 'Flower girl'), ta('additionalNotes', 'Anything else')] },
      { title: 'Licence', key: 'license', encrypted: true, fields: [t('issuingOffice', 'Issuing office'), t('applicationDate', 'Applied', { type: 'date' }), t('issueDate', 'Issued', { type: 'date' }), t('expiryDate', 'Expires', { type: 'date' }), t('licenseNumber', 'Licence number'), t('witnessesRequired', 'Witnesses required', { type: 'number' }), ta('notes', 'Notes')] },
    ],
  },
  transport: {
    title: 'Transport',
    sections: [
      { title: 'Getting there', key: 'transport', fields: [t('recommendedMode', 'What you recommend'), ta('coupleNote', 'A note for guests'), ta('freeTextNotes', 'Your own notes')] },
      { title: 'Parking', key: 'transport', sub: 'parking', fields: [t('venueParking', 'Parking at the venue', { type: 'toggle' }), ta('venueParkingNotes', 'Parking notes'), ta('nearbyCarParks', 'Nearby car parks'), ta('streetParking', 'Street parking'), ta('accessibilityNotes', 'Accessibility')] },
      { title: 'Shuttles', key: 'transport', field: { name: 'shuttles', type: 'list', label: 'Shuttle', fields: [t('name', 'Name'), t('type', 'Type'), t('pickupLocation', 'Picks up from'), t('pickupTime', 'Pick-up time', { type: 'time' }), t('dropoffLocation', 'Drops off at'), t('returnTime', 'Return time', { type: 'time' }), t('capacity', 'Seats', { type: 'number' }), t('contact', 'Contact'), ta('notes', 'Notes')] } },
    ],
  },
  accommodation: {
    title: 'Accommodation',
    sections: [
      { title: 'Stay', key: 'accommodation', fields: [t('checkInDate', 'Check in', { type: 'date' }), t('checkOutDate', 'Check out', { type: 'date' }), ta('coupleNote', 'A note for guests'), ta('additionalNotes', 'Your own notes')] },
      { title: 'Places to stay', key: 'accommodation', field: { name: 'manualProperties', type: 'list', label: 'Place', fields: [t('name', 'Name'), t('address', 'Address'), t('url', 'Website', { type: 'url' }), t('phone', 'Phone', { type: 'tel' }), t('priceRange', 'Price range'), ta('notes', 'Notes')] } },
    ],
  },
  emergency: {
    title: 'Emergency contact',
    sections: [
      { title: 'On the day, call', key: 'emergencyContacts', encrypted: true, sub: 'primary', fields: [t('name', 'Name'), t('role', 'Role'), t('phone', 'Phone', { type: 'tel' })] },
      { title: 'Backup', key: 'emergencyContacts', encrypted: true, sub: 'backup', fields: [t('name', 'Name'), t('role', 'Role'), t('phone', 'Phone', { type: 'tel' })] },
      { title: 'Venue', key: 'emergencyContacts', encrypted: true, sub: 'venue', fields: [t('name', 'Contact name'), t('phone', 'Phone', { type: 'tel' })] },
      { title: 'Notes', key: 'emergencyContacts', encrypted: true, fields: [ta('otherNotes', 'Anything the wedding party should know')] },
    ],
  },
  honeymoon: {
    title: 'Honeymoon',
    sections: [
      { title: 'Where', key: 'honeymoonDetails', fields: [t('destination', 'Destination'), t('departureDate', 'Leaving', { type: 'date' }), t('returnDate', 'Back', { type: 'date' }), t('budget', 'Budget', { type: 'number' })] },
      { title: 'Bookings', key: 'honeymoonDetails', fields: [t('hotelName', 'Hotel'), t('checkInDate', 'Check in', { type: 'date' }), t('checkOutDate', 'Check out', { type: 'date' }), t('bookingReference', 'Booking reference'), t('departureAirport', 'Flying from'), t('flightReference', 'Flight reference'), t('travelInsurance', 'Travel insurance', { type: 'toggle' }), ta('travelInsuranceDetails', 'Insurance details')] },
      { title: 'Plans', key: 'honeymoonDetails', fields: [ta('activitiesPlanned', 'Things you want to do'), ta('packingNotes', 'Packing'), ta('notes', 'Notes')] },
    ],
  },
};

export const ENTITIES = {
  schedule: {
    title: 'Schedule',
    entity: 'Schedule',
    sort: 'start_time',
    itemLabel: 'event',
    pattern: 'cards',
    row: (r) => ({ title: r.event_name, sub: [r.location, r.responsible_person].filter(Boolean).join(' · '), value: r.start_time ? `${r.start_time}${r.end_time ? ` to ${r.end_time}` : ''}` : '', icon: Calendar }),
    fields: [t('event_name', 'Event'), t('event_date', 'Date', { type: 'date' }), t('start_time', 'Starts', { type: 'time' }), t('end_time', 'Ends', { type: 'time' }), t('location', 'Where'), t('category', 'Part of the day', { type: 'select', options: opt([['ceremony', 'Ceremony'], ['reception', 'Reception'], ['planning', 'Planning'], ['after', 'After the day']]) }), t('responsible_person', 'Who is looking after it'), ta('description', 'Details'), ta('notes', 'Notes')],
    required: ['event_name'],
    groupBy: (r) => String(r.event_date || '').slice(0, 10) || 'No date',
  },
  moodboard: {
    title: 'Moodboard',
    entity: 'MoodboardItem',
    sort: '-created_date',
    itemLabel: 'pin',
    pattern: 'cards',
    gridToggle: true,
    row: (r) => ({ title: r.title || 'Untitled', sub: [r.category, (r.tags || []).join(', ')].filter(Boolean).join(' · '), image: r.image_url }),
    fields: [t('title', 'Title'), t('image_url', 'Image link', { type: 'url' }), t('url', 'Source link', { type: 'url' }), t('category', 'Category', { type: 'select', options: opt([['venue', 'Venue'], ['dress', 'Dress'], ['flowers', 'Flowers'], ['decor', 'Decor'], ['food', 'Food'], ['other', 'Other']]) }), ta('notes', 'Notes')],
    required: ['title'],
  },
  vows: {
    title: 'Vows & speeches',
    entity: 'VowSpeech',
    sort: '-created_date',
    itemLabel: 'draft',
    pattern: 'cards',
    row: (r) => ({ title: r.title || (r.type === 'vow' ? 'Vows' : 'Speech'), sub: [r.type === 'vow' ? 'Vows' : 'Speech', r.author].filter(Boolean).join(' · '), value: r.content ? `${r.content.trim().split(/\s+/).length} words` : 'Not written yet', icon: FileText }),
    fields: [t('title', 'Title'), t('type', 'What is it', { type: 'select', options: opt([['vow', 'Vows'], ['speech', 'Speech']]) }), t('author', 'Written by'), ta('content', 'The words', { rows: 10 }), ta('notes', 'Notes')],
    required: ['title'],
    defaults: { type: 'vow' },
  },
  vendors: {
    title: 'My vendors',
    entity: 'Vendor',
    sort: '-created_date',
    itemLabel: 'vendor',
    pattern: 'cards',
    gridToggle: true,
    emptyImage: imageUrl('emptyVendors'),
    row: (r) => ({ title: r.name, sub: [r.category, r.contact_person].filter(Boolean).join(' · '), value: r.quoted_price ? `$${Number(r.quoted_price).toLocaleString('en-US')}` : '', badge: VENDOR_STATUS_LABEL[r.status] || r.status, badgeTone: r.status === 'booked' ? 'ok' : r.status === 'rejected' ? 'no' : r.status === 'researching' ? 'neutral' : 'warn', icon: Store, action: r.phone ? { icon: Phone, label: `Call ${r.name}`, onClick: () => openExternal(`tel:${r.phone}`) } : undefined }),
    fields: [t('name', 'Name'), t('category', 'Category', { type: 'select', options: opt([['venue', 'Venue'], ['catering', 'Catering'], ['photography', 'Photography'], ['videography', 'Videography'], ['flowers', 'Flowers & florist'], ['music', 'Music & DJ'], ['bakery', 'Bakery & cake'], ['transportation', 'Transportation'], ['beauty', 'Beauty & hair'], ['attire', 'Attire & fashion'], ['planning', 'Wedding planning'], ['decorations', 'Decorations'], ['entertainment', 'Entertainment'], ['other', 'Other']]) }), t('status', 'Status', { type: 'select', options: opt([['researching', 'Researching'], ['contacted', 'Contacted'], ['meeting_scheduled', 'Meeting scheduled'], ['quoted', 'Quoted'], ['booked', 'Booked'], ['rejected', 'Rejected']]) }), t('contact_person', 'Contact'), t('phone', 'Phone', { type: 'tel' }), t('email', 'Email', { type: 'email' }), t('website', 'Website', { type: 'url' }), t('quoted_price', 'Quote', { type: 'number' }), t('deposit_amount', 'Deposit', { type: 'number' }), t('deposit_paid', 'Deposit paid', { type: 'toggle' }), t('contract_signed', 'Contract signed', { type: 'toggle' }), ta('notes', 'Notes')],
    required: ['name', 'category'],
    defaults: { status: 'researching' },
    filters: [{ key: 'all', label: 'All' }, { key: 'booked', label: 'Booked', test: (r) => r.status === 'booked' }, { key: 'quoted', label: 'Quoted', test: (r) => r.status === 'quoted' }, { key: 'researching', label: 'Researching', test: (r) => r.status === 'researching' || r.status === 'contacted' }],
  },
  'registry-links': {
    title: 'Registry links',
    entity: 'RegistryItem',
    sort: '-created_date',
    itemLabel: 'registry',
    pattern: 'cards',
    gridToggle: true,
    row: (r) => ({ title: r.store_name || 'Registry', sub: (r.url || '').replace(/^https?:\/\//, ''), image: r.image_url, icon: Gift }),
    fields: [t('store_name', 'Store'), t('url', 'Registry link', { type: 'url' }), ta('description', 'A line for guests'), t('image_url', 'Image link', { type: 'url' })],
    required: ['store_name', 'url'],
  },
  'registry-products': {
    title: 'Products',
    entity: 'RegistryProduct',
    sort: '-created_date',
    itemLabel: 'product',
    pattern: 'cards',
    gridToggle: true,
    row: (r) => ({ title: r.name, sub: [r.registry_platform, r.quantity_purchased ? `${r.quantity_purchased} of ${r.quantity_requested || 1} bought` : ''].filter(Boolean).join(' · '), value: r.price ? `$${Number(r.price).toLocaleString('en-US')}` : '', image: r.image_url, icon: Gift, badge: r.quantity_purchased >= (r.quantity_requested || 1) ? 'Bought' : undefined, badgeTone: 'ok' }),
    fields: [t('name', 'Product'), t('price', 'Price', { type: 'number' }), t('product_url', 'Link', { type: 'url' }), t('registry_platform', 'Store'), t('quantity_requested', 'How many', { type: 'number' }), t('priority', 'Priority', { type: 'select', options: opt([['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]) }), t('image_url', 'Image link', { type: 'url' }), ta('description', 'Why you love it'), ta('notes', 'Notes')],
    required: ['name'],
  },
  'registry-funds': {
    title: 'Cash funds',
    entity: 'CustomGift',
    sort: '-created_date',
    itemLabel: 'fund',
    pattern: 'cards',
    gridToggle: true,
    row: (r) => ({ title: r.title, sub: r.description, value: r.requested_amount ? `Goal $${Number(r.requested_amount).toLocaleString('en-US')}` : '', image: r.image_url, icon: Gift }),
    fields: [t('title', 'Fund'), ta('description', 'What it is for'), t('requested_amount', 'Goal', { type: 'number' }), t('payment_link_url', 'Payment link', { type: 'url' }), t('category', 'Category', { type: 'select', options: opt([['honeymoon', 'Honeymoon'], ['home', 'Home'], ['experience', 'Experience'], ['charity', 'Charity'], ['other', 'Other']]) }), t('image_url', 'Image link', { type: 'url' })],
    required: ['title'],
  },
  'registry-received': {
    title: 'Received gifts',
    entity: 'ReceivedGift',
    sort: '-created_date',
    itemLabel: 'gift',
    pattern: 'cards',
    row: (r) => ({ title: r.item_name || 'Gift', sub: r.giver_name ? `From ${r.giver_name}` : '', value: r.estimated_value ? `$${Number(r.estimated_value).toLocaleString('en-US')}` : '', badge: r.thank_you_sent ? 'Thanked' : 'Thank you to send', badgeTone: r.thank_you_sent ? 'ok' : 'warn', icon: Gift }),
    fields: [t('item_name', 'Gift'), t('giver_name', 'From'), t('giver_email', 'Their email', { type: 'email' }), t('estimated_value', 'Value', { type: 'number' }), t('received_date', 'Received', { type: 'date' }), t('delivery_status', 'Delivery', { type: 'select', options: opt([['received', 'Received'], ['shipping', 'On its way'], ['pending', 'Not yet']]) }), t('thank_you_sent', 'Thank you sent', { type: 'toggle' }), ta('thank_you_note', 'Thank you note'), ta('notes', 'Notes')],
    required: ['item_name'],
  },
  music: {
    title: 'Playlist',
    entity: 'Music',
    sort: '-created_date',
    itemLabel: 'track',
    pattern: 'rows',
    row: (r) => ({ title: r.song_title || 'Track', sub: [r.artist, r.category].filter(Boolean).join(' · '), image: r.image_url, icon: Music2 }),
    fields: [t('song_title', 'Song'), t('artist', 'Artist'), t('category', 'Moment', { type: 'select', options: opt([['ceremony', 'Ceremony'], ['cocktail', 'Drinks'], ['dinner', 'Dinner'], ['first_dance', 'First dance'], ['party', 'Party'], ['last_song', 'Last song']]) }), t('embed_url', 'Spotify link', { type: 'url' }), ta('notes', 'Notes')],
    required: ['song_title'],
    defaults: { source: 'manual', approved: true, guest_suggestion: false },
  },
};

export const BUDGET_CATEGORY_OPTIONS = BUDGET_CATEGORIES.map((c) => ({ value: c.key, label: c.label }));
