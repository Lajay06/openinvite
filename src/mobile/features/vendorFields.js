/**
 * The desktop VendorForm (src/components/vendors/VendorForm.jsx), field for
 * field: the base fields for every category, and the photography and
 * videography fields that appear for those two. Values are written to the
 * Vendor entity exactly as the desktop writes them (numbers as numbers,
 * services_offered as an array, sample_work one URL per line).
 */
const t = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
const ta = (name, label, extra = {}) => ({ name, label, type: 'textarea', ...extra });
const opt = (arr) => arr.map(([value, label]) => ({ value, label }));

export const VENDOR_CATEGORIES = opt([['venue', 'Venue'], ['catering', 'Catering'], ['photography', 'Photography'], ['videography', 'Videography'], ['flowers', 'Flowers & florist'], ['music', 'Music & DJ'], ['bakery', 'Bakery & cake'], ['transportation', 'Transportation'], ['beauty', 'Beauty & hair'], ['attire', 'Attire & fashion'], ['planning', 'Wedding planning'], ['decorations', 'Decorations'], ['entertainment', 'Entertainment'], ['other', 'Other']]);
export const VENDOR_STATUSES = opt([['researching', 'Researching'], ['contacted', 'Contacted'], ['meeting_scheduled', 'Meeting scheduled'], ['quoted', 'Quoted'], ['booked', 'Booked'], ['rejected', 'Rejected']]);
export const PRICE_RANGES = opt([['$', '$ Budget friendly'], ['$$', '$$ Moderate'], ['$$$', '$$$ Premium'], ['$$$$', '$$$$ Luxury']]);
export const PHOTO_STYLES = opt([['candid', 'Candid'], ['traditional', 'Traditional'], ['artistic', 'Artistic'], ['documentary', 'Documentary'], ['cinematic', 'Cinematic'], ['vintage', 'Vintage'], ['modern', 'Modern'], ['natural', 'Natural']]);

const isPhotoOrVideo = (v) => v.category === 'photography' || v.category === 'videography';

export function vendorFields() {
  return [
    t('name', 'Name', { placeholder: 'Vendor or business name' }),
    t('category', 'Category', { type: 'select', options: VENDOR_CATEGORIES }),
    t('status', 'Status', { type: 'select', options: VENDOR_STATUSES }),
    t('contact_person', 'Contact', { placeholder: 'Primary contact name' }),
    t('phone', 'Phone', { type: 'tel' }),
    t('email', 'Email', { type: 'email' }),
    t('website', 'Website', { type: 'url' }),
    t('address', 'Address', { placeholder: 'Street address or city' }),
    t('price_range', 'Price range', { type: 'select', options: PRICE_RANGES }),
    t('rating', 'Rating', { type: 'number', placeholder: '4.8' }),
    t('quoted_price', 'Quote', { type: 'number' }),
    t('deposit_amount', 'Deposit', { type: 'number' }),
    t('deposit_paid', 'Deposit paid', { type: 'toggle' }),
    t('contract_signed', 'Contract signed', { type: 'toggle' }),
    t('contract_date', 'Contract date', { type: 'date' }),
    t('payment_schedule', 'Payment schedule', { placeholder: '50% deposit, 50% on the day' }),
    ta('notes', 'Notes'),
    { type: 'heading', label: 'Photo and video', showIf: isPhotoOrVideo },
    t('instagram', 'Instagram', { placeholder: '@handle', showIf: isPhotoOrVideo }),
    t('reviews_count', 'Reviews', { type: 'number', showIf: isPhotoOrVideo }),
    t('starting_price', 'Starting price', { type: 'number', showIf: isPhotoOrVideo }),
    t('package_selected', 'Package', { showIf: isPhotoOrVideo }),
    t('hours_booked', 'Hours booked', { type: 'number', showIf: isPhotoOrVideo }),
    t('booking_date', 'Booking date', { type: 'date', showIf: isPhotoOrVideo }),
    t('start_time', 'Start time', { type: 'time', showIf: isPhotoOrVideo }),
    t('end_time', 'End time', { type: 'time', showIf: isPhotoOrVideo }),
    t('meeting_date', 'Meeting date', { type: 'date', showIf: isPhotoOrVideo }),
    t('travel_fee', 'Travel fee', { type: 'number', showIf: isPhotoOrVideo }),
    { name: 'style', label: 'Style', type: 'pills', multi: true, options: PHOTO_STYLES, showIf: isPhotoOrVideo },
    t('portfolio_url', 'Portfolio', { type: 'url', showIf: isPhotoOrVideo }),
    ta('equipment', 'Equipment', { showIf: isPhotoOrVideo }),
    t('services_offered', 'Services offered', { placeholder: 'Comma separated: engagement shoot, albums, prints', showIf: isPhotoOrVideo }),
    ta('sample_work', 'Sample work', { placeholder: 'One image link per line', showIf: isPhotoOrVideo }),
    t('delivery_timeline', 'Delivery timeline', { placeholder: '4 to 6 weeks', showIf: isPhotoOrVideo }),
    t('image_count', 'Number of images', { type: 'number', showIf: isPhotoOrVideo }),
    t('video_length', 'Video length', { placeholder: '3 to 5 minute highlight film', showIf: isPhotoOrVideo }),
    t('editing_style', 'Editing style', { placeholder: 'Bright and airy', showIf: isPhotoOrVideo }),
    ta('cancellation_policy', 'Cancellation policy', { showIf: isPhotoOrVideo }),
    ta('special_requests', 'Special requests', { placeholder: 'Must-have shots', showIf: isPhotoOrVideo }),
    t('backup_equipment', 'Backup equipment', { type: 'toggle', showIf: isPhotoOrVideo }),
    t('second_shooter', 'Second shooter', { type: 'toggle', showIf: isPhotoOrVideo }),
  ];
}

/** VendorForm's handleSubmit: numbers to numbers, the two lists to arrays. */
export function vendorPayload(values) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const out = { ...values, rating: num(values.rating), quoted_price: num(values.quoted_price) };
  if (isPhotoOrVideo(values)) {
    Object.assign(out, {
      reviews_count: num(values.reviews_count), starting_price: num(values.starting_price), hours_booked: num(values.hours_booked), deposit_amount: num(values.deposit_amount), image_count: num(values.image_count), travel_fee: num(values.travel_fee),
      services_offered: typeof values.services_offered === 'string' ? values.services_offered.split(',').map((s) => s.trim()).filter(Boolean) : (values.services_offered || []),
      sample_work: typeof values.sample_work === 'string' ? values.sample_work.split('\n').map((s) => s.trim()).filter(Boolean) : (values.sample_work || []),
    });
  } else {
    out.deposit_amount = num(values.deposit_amount);
  }
  return out;
}

/** The record as the form wants it: arrays back to text, as toFormData does. */
export function vendorInitial(vendor) {
  if (!vendor) return null;
  return {
    ...vendor,
    services_offered: Array.isArray(vendor.services_offered) ? vendor.services_offered.join(', ') : (vendor.services_offered || ''),
    sample_work: Array.isArray(vendor.sample_work) ? vendor.sample_work.join('\n') : (vendor.sample_work || ''),
    style: Array.isArray(vendor.style) ? vendor.style : [],
  };
}
