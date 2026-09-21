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

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sel = (name, label, pairs, extra = {}) => t(name, label, { type: 'select', options: opt(pairs), ...extra });

export const DETAILS = {
  styling: {
    title: 'Styling',
    segments: [{ key: 'attire', label: 'Attire' }, { key: 'flowers', label: 'Flowers' }, { key: 'decorations', label: 'Decorations' }],
    sections: [
      /* AttirePanel.jsx: WeddingDetails.attire */
      { title: 'Outfits', segment: 'attire', key: 'attire', list: { name: 'outfits', label: 'Outfit', id: uid, image: 'photoUrl', defaults: { status: 'Not started' }, row: (o) => ({ title: o.name ? `${o.name}, ${o.role === 'Other' ? (o.roleCustom || 'Other') : (o.role || 'Outfit')}` : (o.role === 'Other' ? (o.roleCustom || 'Other') : (o.role || 'Outfit')), sub: [o.status, o.source].filter(Boolean).join(', '), image: o.photoUrl }), fields: [
        sel('role', 'Role', ['Bride', 'Groom', 'Partner 1', 'Partner 2', 'Bridesmaid', 'Groomsman', 'Maid of honor', 'Best man', 'Flower girl', 'Page boy', 'Mother of the bride', 'Mother of the groom', 'Father of the bride', 'Father of the groom', 'Other'].map((r) => [r, r])),
        t('roleCustom', 'Describe the role', { showIf: (v) => v.role === 'Other' }),
        t('name', "Person's name"),
        t('description', 'The outfit', { placeholder: 'Fabric, color, style, silhouette' }),
        t('source', 'Where from', { placeholder: 'Jenny Yoo, ASOS, hired' }),
        sel('status', 'Status', ['Not started', 'Researching', 'Ordered', 'In alterations', 'Ready', 'Collected'].map((r) => [r, r])),
        t('measurements', 'Measurements', { placeholder: 'Size 10, hip 38, chest 42' }),
        t('cost', 'Cost', { placeholder: '$1,200' }),
        t('photoUrl', 'Photo', { type: 'image' }),
      ] } },
      { title: 'Tailor and fittings', segment: 'attire', key: 'attire', fields: [{ name: 'tailorVendorId', label: 'Tailor', type: 'vendor', category: 'attire' }] },
      { title: 'Tailor notes', segment: 'attire', key: 'attire', sub: 'tailor', fields: [ta('notes', 'Notes', { placeholder: 'Deposit, deadlines, special instructions' })] },
      { title: 'Fittings', segment: 'attire', key: 'attire', list: { name: 'fittings', label: 'Fitting', id: uid, required: ['date'], row: (f) => ({ title: f.who || 'Fitting', sub: [f.date, f.notes].filter(Boolean).join(', ') }), fields: [t('date', 'Date', { type: 'date' }), t('who', 'Who', { placeholder: 'Bride' }), ta('notes', 'Notes', { placeholder: 'What to bring, alterations needed' })] } },
      { title: 'Accessories', segment: 'attire', key: 'attire', list: { name: 'accessories', label: 'Accessory', plural: 'accessories', id: uid, required: ['item'], row: (a) => ({ title: a.item || 'Accessory', sub: [a.forWhom, a.done ? 'Done' : ''].filter(Boolean).join(', ') }), fields: [t('item', 'Item', { placeholder: 'Veil, cufflinks, garter' }), t('forWhom', 'For whom'), t('done', 'Done', { type: 'toggle' })], defaults: { done: false } } },
      { title: 'Attire notes', segment: 'attire', key: 'attire', fields: [ta('notes', 'Notes', { placeholder: 'Ceremony is on grass, so heel-friendly footwear' })] },
      /* Styling.jsx: flowers and decorations */
      { title: 'Florist', segment: 'flowers', key: 'flowers', fields: [{ name: 'vendorId', label: 'Florist', type: 'vendor', category: 'flowers' }] },
      { title: 'Bouquets and personal flowers', segment: 'flowers', key: 'flowers', fields: [ta('bouquet', 'Bridal bouquet'), ta('bridesmaidBouquets', 'Bridesmaids bouquets'), ta('boutonnieres', 'Boutonnieres'), ta('additional', 'Additional floral elements')] },
      { title: 'Ceremony flowers', segment: 'flowers', key: 'flowers', fields: [ta('ceremony', 'Ceremony flowers')] },
      { title: 'Reception flowers', segment: 'flowers', key: 'flowers', fields: [ta('centerpieces', 'Reception centerpieces'), ta('notes', 'Notes')] },
      { title: 'Decorator or designer', segment: 'decorations', key: 'decorations', fields: [{ name: 'vendorId', label: 'Decorator', type: 'vendor', category: 'decorations' }] },
      { title: 'Theme and colors', segment: 'decorations', key: 'decorations', fields: [t('theme', 'Overall theme'), t('colorScheme', 'Color scheme')] },
      { title: 'Ceremony decorations', segment: 'decorations', key: 'decorations', fields: [ta('ceremonyDecorations', 'Ceremony decorations')] },
      { title: 'Reception decorations', segment: 'decorations', key: 'decorations', fields: [ta('receptionDecorations', 'Reception decorations'), ta('lighting', 'Lighting'), ta('linens', 'Linens and textiles'), ta('specialElements', 'Special elements'), ta('notes', 'Notes')] },
    ],
  },
  beauty: {
    title: 'Beauty',
    segments: [{ key: 'look', label: 'Hair & makeup' }, { key: 'ready', label: 'Getting ready' }, { key: 'skincare', label: 'Skincare' }, { key: 'trials', label: 'Trials' }],
    sections: [
      { title: 'Your artists', segment: 'look', key: 'beauty', fields: [{ name: 'hairArtistVendorId', label: 'Hair artist', type: 'vendor', category: 'beauty' }, { name: 'makeupArtistVendorId', label: 'Makeup artist', type: 'vendor', category: 'beauty' }] },
      { title: 'The look', segment: 'look', key: 'beauty', fields: [ta('styleNotes', 'The look you want', { placeholder: 'Describe your desired look, references, inspiration' }), ta('hairInspo', 'Inspiration and references', { placeholder: 'Paste links, describe styles, or note references' })] },
      { title: 'People in the chair', segment: 'ready', key: 'beauty', list: { name: 'gettingReadyPeople', label: 'Person', plural: 'people', id: () => Date.now(), row: (p) => ({ title: p.name || 'Someone', sub: [p.role, p.service === 'both' ? 'Hair and makeup' : p.service === 'hair' ? 'Hair' : 'Makeup'].filter(Boolean).join(', ') }), fields: [t('name', 'Name'), t('role', 'Role', { placeholder: 'Bridesmaid, mum' }), sel('service', 'Service', [['both', 'Hair and makeup'], ['hair', 'Hair only'], ['makeup', 'Makeup only']])], defaults: { service: 'both' } } },
      { title: 'Skincare timeline', segment: 'skincare', key: 'beauty', list: { name: 'skincareTimeline', label: 'Milestone', id: () => `m${Date.now()}`, required: ['treatment'], row: (m) => ({ title: m.treatment || 'Milestone', sub: [m.timeframe, m.notes].filter(Boolean).join(', '), value: m.done ? 'Done' : '' }), fields: [t('timeframe', 'When', { placeholder: '6 months before' }), t('treatment', 'Treatment or task'), ta('notes', 'Notes'), t('done', 'Done', { type: 'toggle' })] } },
      { title: 'Beauty team', segment: 'look', roster: 'beauty', intro: 'Every beauty vendor on your list. Add or edit them under My vendors.' },
      { title: 'Trials', segment: 'trials', key: 'beauty', list: { name: 'trials', label: 'Trial', id: () => Date.now(), required: ['date'], row: (tr) => ({ title: tr.artist || 'Trial', sub: [tr.date, tr.lookDescription].filter(Boolean).join(', '), value: tr.rating ? `${tr.rating} of 5` : '' }), fields: [t('date', 'Date', { type: 'date' }), t('artist', 'Artist'), ta('lookDescription', 'The look', { placeholder: 'Describe the look discussed' }), ta('notes', 'Notes', { placeholder: 'Products used, feedback, things to change' }), sel('rating', 'Rating', [['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']], { numeric: true })] } },
    ],
  },
  food: {
    title: 'Food & beverage',
    segments: [{ key: 'catering', label: 'Catering' }, { key: 'menu', label: 'Menu' }, { key: 'bar', label: 'Bar & drinks' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'Caterer', segment: 'catering', key: 'foodBeverage', fields: [{ name: 'vendorId', label: 'Caterer', type: 'vendor', category: 'catering' }] },
      { title: 'Catering', segment: 'catering', key: 'foodBeverage', fields: [sel('serviceStyle', 'Service style', [['plated', 'Plated'], ['buffet', 'Buffet'], ['cocktail', 'Cocktail'], ['stations', 'Food stations'], ['family_style', 'Family style']]), ta('dietaryRequirements', 'Dietary requirements overview', { placeholder: 'Overall dietary needs for the guest list' })] },
      { title: 'Menu', segment: 'menu', key: null, list: { name: 'menuItems', label: 'Menu item', row: (m) => ({ title: m.name || 'Item', sub: m.description }), fields: [t('name', 'Item'), t('description', 'Description')] } },
      { title: 'Cake', segment: 'menu', key: 'foodBeverage', fields: [ta('weddingCakeDetails', 'Wedding cake details', { placeholder: 'Flavor, design, tiers, baker' })] },
      { title: 'Guest meal options', segment: 'menu', key: null, ultra: true, gateTitle: 'Guest meal options is an Ultra feature', gateBody: 'Your own menu on the RSVP form, so guests choose a meal when they reply. Upgrade on the website to switch it on.', intro: 'The meals guests choose from when they reply.', list: { name: 'mealOptions', label: 'Meal option', id: uid, row: (m) => ({ title: m.label || 'Meal' }), fields: [t('label', 'Meal', { placeholder: 'Herb-roasted chicken' })] } },
      { title: 'Bar and drinks', segment: 'bar', key: 'foodBeverage', fields: [sel('barType', 'Bar', [['full_bar', 'Full bar'], ['beer_wine', 'Beer and wine only'], ['dry', 'Dry, no alcohol'], ['byo', 'BYO']]), t('signatureCocktail', 'Signature cocktail', { placeholder: 'Name and description of your signature drink' }), ta('barNotes', 'Drinks and bar notes')] },
      { title: 'Notes', segment: 'notes', key: 'foodBeverage', fields: [ta('additionalNotes', 'Additional catering notes')] },
    ],
  },
  photography: {
    title: 'Photography',
    segments: [{ key: 'photo', label: 'Photographers' }, { key: 'video', label: 'Videographers' }, { key: 'shots', label: 'Shot list' }],
    sections: [
      { title: 'Photographer', segment: 'photo', key: 'photography', fields: [{ name: 'photographerVendorId', label: 'Photographer', type: 'vendor', category: 'photography' }, t('photographyStyle', 'Photography style'), t('photographyPackage', 'Package selected'), t('photographyHours', 'Hours booked', { type: 'number' })] },
      { title: 'Photographers on your list', segment: 'photo', roster: 'photography' },
      { title: 'Delivery and editing', segment: 'photo', key: 'photography', fields: [t('editingStyle', 'Editing style'), t('editedPhotosCount', 'Number of edited photos', { type: 'number' }), t('photoDeliveryTimeline', 'Photo delivery timeline'), t('deliveryFormat', 'Delivery format')] },
      { title: 'Videographer', segment: 'video', key: 'photography', fields: [{ name: 'videographerVendorId', label: 'Videographer', type: 'vendor', category: 'videography' }, t('videographyPackage', 'Package'), t('videoStyle', 'Video style'), t('videoLength', 'Video length'), t('videoDeliveryTimeline', 'Video delivery timeline')] },
      { title: 'Videographers on your list', segment: 'video', roster: 'videography' },
      { title: 'Shot list', segment: 'shots', key: 'photography', fields: [ta('gettingReadyShots', 'Getting ready'), ta('ceremonyShots', 'Ceremony shots'), ta('familyPortraits', 'Family portraits'), ta('receptionShots', 'Reception shots'), ta('mustHaveShots', 'Must-have shots')] },
    ],
  },
  favours: {
    title: 'Guest gifts',
    segments: [{ key: 'overview', label: 'Overview' }, { key: 'items', label: 'Items' }, { key: 'packaging', label: 'Packaging' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'The gift', segment: 'overview', key: 'weddingFavours', fields: [t('concept', 'What you are giving', { type: 'search', placeholder: 'Local honey, a candle, a seedling' }), t('supplierName', 'Supplier or maker', { type: 'search' }), t('totalBudget', 'Total budget', { placeholder: '$3.50 a head, $400 all up' }), sel('orderedStatus', 'Status', [['not_started', 'Not started'], ['researching', 'Researching'], ['ordered', 'Ordered'], ['received', 'Received'], ['assembled', 'Assembled and ready']])] },
      { title: 'Favour items', segment: 'items', key: null, list: { name: 'favourItems', label: 'Item', row: (i) => ({ title: i.name || 'Item', sub: [i.quantity ? `${i.quantity} of them` : '', i.notes].filter(Boolean).join(', '), value: i.costPerUnit ? `${i.costPerUnit} each` : '' }), fields: [t('name', 'Item'), t('quantity', 'Quantity', { placeholder: '120' }), t('costPerUnit', 'Cost per unit', { placeholder: '$3.50' }), ta('notes', 'Notes')] } },
      { title: 'Packaging and display', segment: 'packaging', key: 'weddingFavours', fields: [t('packagingType', 'Packaging type'), t('packagingSupplier', 'Packaging supplier', { type: 'search' }), t('personalised', 'Personalized', { type: 'toggle' }), ta('personalisationDetails', 'Personalization details', { showIf: (v) => !!v.personalised }), ta('tagsNotes', 'Tags and labels'), ta('displayNotes', 'Display and placement notes')] },
      { title: 'Notes', segment: 'notes', key: 'weddingFavours', fields: [ta('additionalNotes', 'Additional notes')] },
    ],
  },
  ceremony: {
    title: 'Ceremony details',
    segments: [{ key: 'celebrant', label: 'Celebrant' }, { key: 'ceremony', label: 'Ceremony' }, { key: 'legal', label: 'Legal' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'Celebrant', segment: 'celebrant', key: 'celebrant', encrypted: true, fields: [t('name', 'Celebrant name', { type: 'search' }), t('title', 'Title'), sel('type', 'Type', [['religious', 'Religious'], ['civil', 'Civil'], ['humanist', 'Humanist'], ['celebrant', 'Professional celebrant']]), t('phone', 'Phone', { type: 'tel' }), t('email', 'Email', { type: 'email' }), ta('notes', 'Celebrant notes')] },
      { title: 'The ceremony', segment: 'ceremony', key: null, fields: [t('ceremonyType', 'Ceremony type'), ta('ceremonyMusic', 'Ceremony music'), ta('ceremonyReadings', 'Ceremony readings'), ta('vowsNotes', 'Vows notes'), ta('orderOfServiceNotes', 'Order of service notes'), ta('ringBearerDetails', 'Ring bearer details'), ta('flowerGirlDetails', 'Flower girl details')] },
      { title: 'Legal', segment: 'legal', key: 'license', encrypted: true, fields: [t('issuingOffice', 'Marriage license issuing office'), t('applicationDate', 'Applied', { type: 'date' }), t('issueDate', 'Issued', { type: 'date' }), t('expiryDate', 'Expires', { type: 'date' }), t('licenseNumber', 'License number'), t('witnessesRequired', 'Witnesses required', { type: 'number' }), ta('notes', 'Legal notes')] },
      { title: 'Notes', segment: 'notes', key: null, fields: [ta('additionalNotes', 'Additional ceremony notes')] },
    ],
  },
  transport: {
    title: 'Transport',
    segments: [{ key: 'overview', label: 'Overview' }, { key: 'shuttles', label: 'Shuttles' }, { key: 'parking', label: 'Parking' }, { key: 'public', label: 'Public transport' }, { key: 'rideshare', label: 'Rideshare' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'Getting there', segment: 'overview', key: 'transport', fields: [sel('recommendedMode', 'Recommended transport mode', [['rideshare', 'Rideshare or taxi'], ['drive', 'Drive and park'], ['public', 'Public transport'], ['shuttle', "Couple's shuttle"], ['walk', 'Walk'], ['hire', 'Car hire']]), ta('coupleNote', 'Note for your wedding party')] },
      { title: 'Couple-arranged transport', segment: 'shuttles', key: 'transport', list: { name: 'shuttles', label: 'Shuttle', id: () => `s_${Date.now()}`, required: ['name'], row: (s) => ({ title: s.name || 'Shuttle', sub: [s.pickupLocation && s.pickupTime ? `${s.pickupLocation} at ${s.pickupTime}` : s.pickupLocation, s.dropoffLocation].filter(Boolean).join(' to '), value: s.capacity || '' }), fields: [t('name', 'Service name', { type: 'search', placeholder: 'Coach company name' }), sel('type', 'Type', [['coach', 'Coach'], ['shuttle', 'Shuttle bus'], ['minibus', 'Minibus'], ['transfer', 'Transfer'], ['limo', 'Limousine']]), t('pickupLocation', 'Picks up from'), t('pickupTime', 'Pick-up time', { placeholder: '2:45 PM' }), t('dropoffLocation', 'Drops off at'), t('returnTime', 'Return time', { placeholder: '11:30 PM' }), t('capacity', 'Capacity', { placeholder: '48 seats' }), t('contact', 'Contact'), ta('notes', 'Notes')], defaults: { type: 'coach' } } },
      { title: 'Transport vendors on your list', segment: 'shuttles', roster: 'transportation' },
      { title: 'Parking', segment: 'parking', key: 'transport', sub: 'parking', fields: [t('venueParking', 'Parking available at the venue', { type: 'toggle' }), ta('venueParkingNotes', 'Venue parking notes'), t('streetParking', 'Street parking'), t('accessibilityNotes', 'Accessibility parking')] },
      { title: 'Nearby car parks', segment: 'parking', key: 'transport', sub: 'parking', list: { name: 'nearbyCarParks', label: 'Car park', row: (c) => ({ title: c.name || 'Car park', sub: [c.address, c.distance].filter(Boolean).join(', '), value: c.cost || '' }), fields: [t('name', 'Car park name'), t('address', 'Address'), t('distance', 'Distance'), t('cost', 'Cost')] } },
      { title: 'Public transport', segment: 'public', key: 'transport', sub: 'publicTransport', fields: [ta('generalNotes', 'General notes')] },
      { title: 'Routes', segment: 'public', key: 'transport', sub: 'publicTransport', list: { name: 'routes', label: 'Route', row: (r) => ({ title: r.notes || 'Route', sub: [{ train: 'Train', bus: 'Bus', tram: 'Tram', metro: 'Metro', ferry: 'Ferry' }[r.type] || r.type, r.totalTime].filter(Boolean).join(', ') }), fields: [sel('type', 'Type', [['train', 'Train'], ['bus', 'Bus'], ['tram', 'Tram'], ['metro', 'Metro'], ['ferry', 'Ferry']]), t('notes', 'Route summary'), t('totalTime', 'Travel time')], defaults: { type: 'train' }, required: ['notes'] } },
      { title: 'Rideshare and taxi', segment: 'rideshare', key: 'transport', sub: 'rideshare', fields: [t('pickupLocation', 'Suggested pickup location'), t('dropoffLocation', 'Suggested drop-off location'), ta('lateNightNote', 'Late-night note')] },
      { title: 'Notes', segment: 'notes', key: 'transport', fields: [ta('freeTextNotes', 'Additional transport notes')] },
    ],
  },
  accommodation: {
    title: 'Accommodation',
    segments: [{ key: 'overview', label: 'Overview' }, { key: 'properties', label: 'Properties' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'The weekend', segment: 'overview', key: 'accommodation', fields: [t('checkInDate', 'Check in', { type: 'date' }), t('checkOutDate', 'Check out', { type: 'date' }), ta('coupleNote', 'Note to guests', { placeholder: 'We have gathered a few nearby places to stay for the wedding weekend' })] },
      { title: 'Accommodation options', segment: 'properties', key: 'accommodation', list: { name: 'manualProperties', label: 'Property', plural: 'properties', id: uid, image: 'photoUrl', row: (p) => ({ title: p.name || 'Property', sub: [p.isPinned ? 'Pinned' : '', p.isMainGuestHotel ? 'Main guest hotel' : '', p.isClosestToVenue ? 'Closest to venue' : '', p.isBestValue ? 'Best value' : '', ...(p.tags || [])].filter(Boolean).join(', ') || p.address, image: p.photoUrl }), fields: [t('photoUrl', 'Photo', { type: 'image' }), t('name', 'Property name', { type: 'search' }), t('address', 'Address'), ta('description', 'Description'), t('website', 'Website', { type: 'url' }), t('phone', 'Phone', { type: 'tel' }), t('bookingCode', 'Booking code', { placeholder: 'SMITHWEDDING2026' }), ta('coupleNote', 'Note to guests'), { name: 'tags', label: 'Tags', type: 'pills', multi: true, options: ['Great for families', 'Closest to venue', 'Budget-friendly', 'Where most guests are staying', 'Premium option', 'Great for groups', 'Near the city', 'Near the airport', 'Parking available', 'Walk to venue'] }, t('isMainGuestHotel', 'Main guest hotel', { type: 'toggle' }), t('isClosestToVenue', 'Closest to venue', { type: 'toggle' }), t('isBestValue', 'Best value', { type: 'toggle' }), t('isPinned', 'Pin to top', { type: 'toggle' })] } },
      { title: 'Notes', segment: 'notes', key: 'accommodation', fields: [ta('additionalNotes', 'Additional accommodation notes')] },
    ],
  },
  emergency: {
    title: 'Emergency contact',
    segments: [{ key: 'contacts', label: 'Contacts' }, { key: 'vendors', label: 'Vendors' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'On the day, call', segment: 'contacts', key: 'emergencyContacts', encrypted: true, sub: 'primary', fields: [t('name', 'Name'), t('role', 'Role or relationship'), t('phone', 'Phone', { type: 'tel' })] },
      { title: 'Backup contact', segment: 'contacts', key: 'emergencyContacts', encrypted: true, sub: 'backup', fields: [t('name', 'Name'), t('role', 'Role or relationship'), t('phone', 'Phone', { type: 'tel' })] },
      { title: 'Venue contact', segment: 'contacts', key: 'emergencyContacts', encrypted: true, sub: 'venue', fields: [t('name', 'Venue coordinator name'), t('phone', 'Phone', { type: 'tel' })] },
      { title: 'Key vendors on the day', segment: 'vendors', key: 'dayVendorContacts', encrypted: true, list: { self: true, label: 'Vendor contact', row: (v) => ({ title: v.name || 'Vendor', sub: v.role, value: v.phone }), fields: [t('name', 'Name'), t('role', 'Role'), t('phone', 'Phone', { type: 'tel' })] } },
      { title: 'Notes', segment: 'notes', key: 'emergencyContacts', encrypted: true, fields: [ta('otherNotes', 'Other emergency notes', { placeholder: 'Anything the wedding party should know' })] },
    ],
  },
  honeymoon: {
    title: 'Honeymoon',
    segments: [{ key: 'planning', label: 'Planning' }, { key: 'travel', label: 'Travel' }, { key: 'stay', label: 'Accommodation' }, { key: 'notes', label: 'Notes' }],
    sections: [
      { title: 'Where', segment: 'planning', key: 'honeymoonDetails', fields: [t('destination', 'Destination', { type: 'search' }), t('departureDate', 'Leaving', { type: 'date' }), t('returnDate', 'Back', { type: 'date' }), t('budget', 'Budget', { type: 'number' })] },
      { title: 'Travel', segment: 'travel', key: 'honeymoonDetails', fields: [t('departureAirport', 'Departure airport'), t('flightReference', 'Flight or booking reference'), t('travelInsurance', 'Travel insurance', { type: 'toggle' }), ta('travelInsuranceDetails', 'Insurance details', { showIf: (v) => !!v.travelInsurance })] },
      { title: 'Accommodation', segment: 'stay', key: 'honeymoonDetails', fields: [t('hotelName', 'Hotel or resort name', { type: 'search' }), t('checkInDate', 'Check in', { type: 'date' }), t('checkOutDate', 'Check out', { type: 'date' }), t('bookingReference', 'Booking reference'), t('confirmationNumber', 'Confirmation number')] },
      { title: 'Notes', segment: 'notes', key: 'honeymoonDetails', fields: [ta('activitiesPlanned', 'Activities planned'), ta('packingNotes', 'Packing notes'), ta('notes', 'Additional notes')] },
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
    fields: [t('title', 'Title'), t('image_url', 'Photo', { type: 'image' }), t('url', 'Source link', { type: 'url' }), t('category', 'Category', { type: 'select', options: opt([['venue', 'Venue'], ['dress', 'Dress'], ['flowers', 'Flowers'], ['decor', 'Decor'], ['food', 'Food'], ['other', 'Other']]) }), ta('notes', 'Notes')],
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
    fields: [t('store_name', 'Store name', { placeholder: 'Crate & Barrel' }), t('url', 'Registry link', { type: 'url', placeholder: 'https://store.com/registry/your-name' }), t('image_url', 'Store logo', { type: 'image' }), ta('description', 'Note for guests', { placeholder: 'A short note for your guests' })],
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
    fields: [t('name', 'Product name', { placeholder: 'KitchenAid stand mixer' }), t('price', 'Price', { type: 'number', placeholder: '299.99' }), sel('category', 'Category', [['kitchen', 'Kitchen'], ['home_decor', 'Home decor'], ['bedding', 'Bedding'], ['bathroom', 'Bathroom'], ['outdoor', 'Outdoor'], ['electronics', 'Electronics'], ['other', 'Other']]), sel('registry_platform', 'Platform', ['Zola', 'MyRegistry', 'The Knot', 'Amazon', 'Target', 'Williams Sonoma', 'Crate & Barrel', 'Other'].map((p) => [p, p])), t('quantity_requested', 'Quantity needed', { type: 'number' }), sel('priority', 'Priority', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]), t('product_url', 'Product link', { type: 'url' }), t('image_url', 'Product photo', { type: 'image' }), ta('description', 'Description', { placeholder: 'Product details' }), ta('notes', 'Private notes', { placeholder: 'Not visible to guests' })],
    required: ['name', 'price'],
    defaults: { quantity_requested: 1, priority: 'medium', quantity_purchased: 0, purchased_by: [] },
    fromForm: (v) => ({ ...v, price: Number(v.price) || 0, quantity_requested: Number(v.quantity_requested) || 1 }),
  },
  'registry-funds': {
    title: 'Cash funds',
    entity: 'CustomGift',
    sort: '-created_date',
    itemLabel: 'fund',
    pattern: 'cards',
    gridToggle: true,
    row: (r) => ({ title: r.title, sub: r.description, value: r.requested_amount ? `Goal $${Number(r.requested_amount).toLocaleString('en-US')}` : '', image: r.image_url, icon: Gift }),
    fields: [t('title', 'Fund name', { placeholder: 'Honeymoon airfare' }), sel('category', 'Category', [['honeymoon', 'Honeymoon'], ['home_fund', 'Home fund'], ['charity', 'Charity'], ['experience', 'Experience'], ['custom', 'Custom']]), t('requested_amount', 'Goal amount', { type: 'number', placeholder: '500' }), t('image_url', 'Photo', { type: 'image' }), t('payment_link_url', 'Payment link', { type: 'url', placeholder: 'https://paypal.me/yourname', validate: (v) => (v && !/^https:\/\//i.test(String(v).trim()) ? 'Payment links must start with https:// so guests can use them.' : '') }), ta('description', 'Description', { placeholder: 'Tell guests about this fund' })],
    required: ['title', 'requested_amount'],
    defaults: { category: 'honeymoon' },
    fromForm: (v) => ({ ...v, requested_amount: Number(v.requested_amount) || 0 }),
  },
  'registry-received': {
    title: 'Received gifts',
    entity: 'ReceivedGift',
    sort: '-created_date',
    itemLabel: 'gift',
    pattern: 'cards',
    filters: [{ key: 'all', label: 'All' }, { key: 'received', label: 'Received', test: (g) => g.delivery_status === 'received' }, { key: 'expected', label: 'Expected', test: (g) => g.delivery_status === 'expected' }, { key: 'not_received', label: 'Not received', test: (g) => g.delivery_status === 'not_received' }, { key: 'to_thank', label: 'Thank you to send', test: (g) => !g.thank_you_sent }, { key: 'thanked', label: 'Thanked', test: (g) => !!g.thank_you_sent }],
    row: (r) => ({ title: r.item_name || 'Gift', sub: [r.giver_name ? `From ${r.giver_name}` : '', { expected: 'Expected', received: 'Received', not_received: 'Not received' }[r.delivery_status] || ''].filter(Boolean).join(', '), value: r.estimated_value ? `$${Number(r.estimated_value).toLocaleString('en-US')}` : '', badge: r.thank_you_sent ? 'Thanked' : 'Thank you to send', badgeTone: r.thank_you_sent ? 'ok' : 'warn', icon: Gift }),
    fields: [t('item_name', 'Gift', { placeholder: 'KitchenAid stand mixer' }), { name: 'giver', label: 'From', type: 'guest', placeholder: 'Search your guest list' }, t('giver_email', 'Their email', { type: 'email', placeholder: 'giver@email.com' }), sel('delivery_status', 'Delivery', [['expected', 'Expected'], ['received', 'Received'], ['not_received', 'Not received']]), t('received_date', 'Received on', { type: 'date' }), sel('category', 'Category', [['physical', 'Physical'], ['cash', 'Cash'], ['experience', 'Experience'], ['digital', 'Digital'], ['other', 'Other']]), t('estimated_value', 'Estimated value', { type: 'number' }), t('thank_you_sent', 'Thank you sent', { type: 'toggle' }), t('thank_you_date', 'Thanked on', { type: 'date', showIf: (v) => !!v.thank_you_sent }), ta('thank_you_note', 'Thank you note', { placeholder: 'Write one, or ask Ava below' }), t('notes', 'Notes')],
    required: ['item_name'],
    defaults: { delivery_status: 'expected', category: 'physical' },
  },
  music: {
    title: 'Playlist',
    entity: 'Music',
    sort: '-created_date',
    itemLabel: 'track',
    pattern: 'rows',
    row: (r) => ({ title: r.song_title || 'Track', sub: [r.artist, r.category].filter(Boolean).join(', '), image: r.image_url, icon: Music2 }),
    fields: [t('song_title', 'Song'), t('artist', 'Artist'), t('category', 'Moment', { type: 'select', options: opt([['ceremony', 'Ceremony'], ['cocktail_hour', 'Cocktail hour'], ['dinner', 'Dinner'], ['dancing', 'Dancing'], ['special_moments', 'Special moments'], ['general', 'General']]) }), t('embed_url', 'Spotify link', { type: 'url' }), ta('notes', 'Notes')],
    required: ['song_title'],
    defaults: { source: 'spotify', approved: true, guest_suggestion: false }, // Music.jsx's create defaults; the entity's source enum is spotify / apple / youtube
  },
};

export const BUDGET_CATEGORY_OPTIONS = BUDGET_CATEGORIES.map((c) => ({ value: c.key, label: c.label }));
