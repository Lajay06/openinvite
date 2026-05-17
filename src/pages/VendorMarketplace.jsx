import React, { useState, useMemo } from 'react';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import VendorCard from '@/components/marketplace/VendorCard';
import VendorProfileModal from '@/components/marketplace/VendorProfileModal';
import QuoteRequestModal from '@/components/marketplace/QuoteRequestModal';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORIES = [
  'All','Photography','Videography','Catering','Florals',
  'Styling','Hair & makeup','Music & DJ','Entertainment',
  'Venues','Transport','Celebrant','Stationery','Cake','Jewellery','Other',
];

const PRICE_LABELS = { '$': 'Budget', '$$': 'Mid-range', '$$$': 'Premium', '$$$$': 'Luxury' };
const SORT_OPTIONS = ['Relevance', 'Rating', 'Price low–high', 'Price high–low'];

const MOCK_VENDORS = [
  {
    id: 1, name: 'Golden Hour Photography', category: 'Photography', rating: 4.9, reviewCount: 124,
    location: 'Sydney, NSW', online: false, priceRange: '$$$',
    description: 'Award-winning wedding photographers specialising in natural light and candid moments. We tell your love story through images you will treasure forever.',
    tags: ['outdoor', 'destination', 'same-sex friendly'],
    yearsInBusiness: 8, website: 'https://example.com', phone: '+61 2 9000 1234', email: 'hello@goldenhour.com.au',
    serviceArea: ['Sydney', 'Blue Mountains', 'Hunter Valley', 'Australia-wide travel'],
    languages: ['English'],
    certifications: ['AIPP Master Photographer', 'WPJA Award 2023', 'Australian Wedding Industry Awards Finalist'],
    packages: [
      { name: 'Essential', price: 'From $3,200', includes: ['6 hours coverage', '2 photographers', 'Online gallery', '400+ edited images', 'USB drive'] },
      { name: 'Premium', price: 'From $4,800', includes: ['8 hours coverage', '2 photographers', 'Engagement shoot', 'Online gallery', '600+ edited images', 'Fine art album', 'USB drive'] },
      { name: 'All-day', price: 'From $6,500', includes: ['12 hours coverage', '3 photographers', 'Engagement + bridal shoot', 'Online gallery', '900+ edited images', 'Fine art album', 'Print wall set'] },
    ],
    depositTerms: '30% deposit to secure your date. Balance due 4 weeks before your wedding.',
    cancellationPolicy: 'Full refund up to 90 days before. 50% refund up to 30 days. No refund within 30 days.',
    reviews: [
      { name: 'Sarah & James', rating: 5, date: 'March 2024', comment: 'Absolutely breathtaking photos. They captured every emotion perfectly. We laughed, cried, and couldn\'t be happier with the result.' },
      { name: 'Emma L.', rating: 5, date: 'November 2023', comment: 'Golden Hour made us feel so comfortable and relaxed on the day. The final gallery was delivered in just 3 weeks — incredible!' },
      { name: 'Chris & Mia', rating: 5, date: 'September 2023', comment: 'We did a destination wedding in the Blue Mountains and they were just perfect. Worth every cent.' },
    ],
  },
  {
    id: 2, name: 'Bloom & Wild Florals', category: 'Florals', rating: 4.8, reviewCount: 89,
    location: 'Melbourne, VIC', online: false, priceRange: '$$',
    description: 'Romantic, seasonal floral designs for intimate gatherings and grand celebrations. We source locally and ethically, bringing nature\'s best to your wedding day.',
    tags: ['sustainable', 'seasonal', 'boho'],
    yearsInBusiness: 5, website: 'https://example.com', phone: '+61 3 9000 5678', email: 'info@bloomandwild.com.au',
    serviceArea: ['Melbourne', 'Mornington Peninsula', 'Yarra Valley', 'Geelong'],
    languages: ['English'],
    certifications: ['Certified Sustainable Florist', 'AIFD Member'],
    packages: [
      { name: 'Intimate', price: 'From $1,800', includes: ['Bridal bouquet', '2 bridesmaid bouquets', 'Buttonholes x4', 'Ceremony arch arrangement'] },
      { name: 'Classic', price: 'From $3,200', includes: ['Bridal bouquet', '4 bridesmaid bouquets', 'Buttonholes x8', 'Ceremony arch', '8 centrepieces', 'Flower girl petals'] },
      { name: 'Luxe', price: 'From $5,500', includes: ['Bridal bouquet', '6 bridesmaid bouquets', 'Buttonholes x10', 'Ceremony arch', '12 centrepieces', 'Greenery wall', 'Cake flowers'] },
    ],
    depositTerms: '25% deposit on booking. Final balance 6 weeks prior.',
    cancellationPolicy: '50% refund more than 60 days out. No refund within 60 days.',
    reviews: [
      { name: 'Jess & Tom', rating: 5, date: 'April 2024', comment: 'The most beautiful florals I have ever seen. They listened to our brief and exceeded every expectation.' },
      { name: 'Natalie W.', rating: 5, date: 'February 2024', comment: 'My bouquet was a dream. Still pressing flowers from it to keep forever.' },
    ],
  },
  {
    id: 3, name: 'The Film Couple', category: 'Videography', rating: 4.9, reviewCount: 67,
    location: 'Online', online: true, priceRange: '$$$',
    description: 'Cinematic wedding films that feel like movie trailers for your love story. We travel worldwide and blend seamlessly into your day to capture genuine, unscripted moments.',
    tags: ['cinematic', 'destination', 'same-sex friendly'],
    yearsInBusiness: 6, website: 'https://example.com', phone: null, email: 'hello@thefilmcouple.com',
    serviceArea: ['Worldwide travel', 'Australia', 'Europe', 'USA'],
    languages: ['English', 'French'],
    certifications: ['Vimeo Staff Pick', 'International Wedding Awards Best Film 2023'],
    packages: [
      { name: 'Short film', price: 'From $2,900', includes: ['4–6 minute highlight film', '8 hours coverage', '1 videographer', 'Online delivery'] },
      { name: 'Feature film', price: 'From $4,500', includes: ['10–15 minute feature film', 'Ceremony & speeches edit', '10 hours coverage', '2 videographers', 'Online + USB delivery'] },
    ],
    depositTerms: 'AUD 1,000 deposit to hold your date. Balance 30 days before.',
    cancellationPolicy: 'Deposit non-refundable. Full refund on balance up to 60 days prior.',
    reviews: [
      { name: 'Laura & Ben', rating: 5, date: 'May 2024', comment: 'We cried watching our film. It captures everything we wanted to remember. Absolutely recommend.' },
      { name: 'David K.', rating: 5, date: 'January 2024', comment: 'Outstanding quality and such an easy process. They were invisible on the day but captured everything.' },
    ],
  },
  {
    id: 4, name: 'Feast & Gather Catering', category: 'Catering', rating: 4.7, reviewCount: 156,
    location: 'New York, NY', online: false, priceRange: '$$$',
    description: 'Farm-to-table wedding catering for modern couples. Our menus celebrate seasonal ingredients with a relaxed, shared-style dining experience your guests will rave about.',
    tags: ['farm-to-table', 'dietary friendly', 'shared dining'],
    yearsInBusiness: 10, website: 'https://example.com', phone: '+1 212 555 0100', email: 'events@feastandgather.com',
    serviceArea: ['New York City', 'Hamptons', 'Hudson Valley', 'New Jersey'],
    languages: ['English', 'Spanish'],
    certifications: ['NYC Health Dept. Grade A', 'Green Restaurant Certified'],
    packages: [
      { name: 'Cocktail reception', price: 'From $95/head', includes: ['6 canapé varieties', '3 hour service', 'Staff included', 'Crockery & linen'] },
      { name: 'Seated dinner', price: 'From $145/head', includes: ['3-course plated menu', 'Entrée, main, dessert', 'Dietary alternatives', 'Full service staff'] },
      { name: 'Full day', price: 'From $195/head', includes: ['Pre-ceremony canapés', 'Cocktail hour', 'Formal dinner', 'Late night snack bar', 'All staff & equipment'] },
    ],
    depositTerms: '20% deposit to confirm booking. Progressive payments thereafter.',
    cancellationPolicy: 'As per catering contract — typically 50% loss within 90 days of event.',
    reviews: [
      { name: 'Rachel & Omar', rating: 5, date: 'June 2024', comment: 'Every single dish was incredible. Guests are still talking about the beef short rib.' },
      { name: 'Priya S.', rating: 4, date: 'March 2024', comment: 'Beautiful food and lovely staff. A small hiccup with timing but they handled it well.' },
    ],
  },
  {
    id: 5, name: 'Aria Events & Styling', category: 'Styling', rating: 4.8, reviewCount: 43,
    location: 'Sydney, NSW', online: false, priceRange: '$$$',
    description: 'Full-service wedding styling and planning studio. From concept to creation, we transform venues into immersive worlds that tell your unique love story.',
    tags: ['full-service', 'luxury', 'custom'],
    yearsInBusiness: 7, website: 'https://example.com', phone: '+61 2 9000 9999', email: 'hello@ariaevents.com.au',
    serviceArea: ['Sydney', 'NSW', 'Interstate travel available'],
    languages: ['English', 'Mandarin'],
    certifications: ['AIA Certified Wedding Planner', 'BWS Best Stylist Finalist 2023'],
    packages: [
      { name: 'Styling day-of', price: 'From $2,200', includes: ['Full venue set-up', 'Prop & decor delivery', 'Bump-out', 'Style board development'] },
      { name: 'Full planning', price: 'From $8,500', includes: ['End-to-end coordination', 'Vendor management', 'Budget tracking', 'Full styling & set-up', 'Day-of coordination'] },
    ],
    depositTerms: 'AUD 1,500 retainer to begin. Balance per payment schedule.',
    cancellationPolicy: 'Retainer non-refundable. All other payments refunded if cancelled 90+ days prior.',
    reviews: [
      { name: 'Chloe & Will', rating: 5, date: 'July 2024', comment: 'Aria transformed our venue into something absolutely magical. Best money we spent on our wedding.' },
    ],
  },
  {
    id: 6, name: 'DJ Max & The Band', category: 'Music & DJ', rating: 4.6, reviewCount: 201,
    location: 'Melbourne, VIC', online: false, priceRange: '$$',
    description: 'Melbourne\'s most booked wedding DJ and live band combo. We read the room and keep dance floors packed from first dance to last song.',
    tags: ['live band', 'DJ', 'high energy'],
    yearsInBusiness: 12, website: 'https://example.com', phone: '+61 3 9000 4444', email: 'book@djmax.com.au',
    serviceArea: ['Melbourne', 'Regional Victoria', 'South Australia'],
    languages: ['English'],
    certifications: ['ARIA Certified DJ', 'Three-time Melbourne Wedding Awards Music Winner'],
    packages: [
      { name: 'DJ only', price: 'From $1,400', includes: ['5 hours DJ set', 'Full PA system', 'Dance floor lighting', 'Unlimited song requests', 'MC duties'] },
      { name: 'DJ + band', price: 'From $3,800', includes: ['4-piece live band (3 sets)', 'DJ for remaining time', 'Full PA & lights', 'Ceremony sound system', 'MC duties'] },
    ],
    depositTerms: '30% deposit on booking. Full balance 14 days before.',
    cancellationPolicy: 'Deposit non-refundable. Full refund on remaining balance 45+ days out.',
    reviews: [
      { name: 'Zoe & Mike', rating: 5, date: 'February 2024', comment: 'Incredible! Everyone was on the dance floor all night. Max is an absolute legend.' },
      { name: 'Amy T.', rating: 4, date: 'October 2023', comment: 'Great energy, knew all the songs. Minor sound issue early on but sorted quickly.' },
    ],
  },
  {
    id: 7, name: 'Petal & Stem Studio', category: 'Florals', rating: 4.9, reviewCount: 78,
    location: 'Brisbane, QLD', online: false, priceRange: '$$$',
    description: 'Lavish, editorial florals for the couple who wants their wedding to look like a magazine spread. Known for oversized arrangements and unexpected colour combinations.',
    tags: ['editorial', 'oversized', 'colourful'],
    yearsInBusiness: 4, website: 'https://example.com', phone: '+61 7 3000 1111', email: 'studio@petalandstem.com.au',
    serviceArea: ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Byron Bay'],
    languages: ['English'],
    certifications: ['QLD Wedding Industry Awards Florist of the Year 2024'],
    packages: [
      { name: 'Starter', price: 'From $2,400', includes: ['Bridal bouquet', '2 bridesmaid posies', 'Buttonholes x5', 'Ceremony arch'] },
      { name: 'Statement', price: 'From $4,800', includes: ['Bridal bouquet', '5 bridesmaid bouquets', 'Buttonholes x10', 'Ceremony arch', '10 centrepieces', 'Entrance arrangement'] },
    ],
    depositTerms: 'AUD 800 non-refundable deposit to secure date.',
    cancellationPolicy: '60+ days: balance refunded. Inside 60 days: 50%. Inside 30 days: no refund.',
    reviews: [
      { name: 'Sophie & James', rating: 5, date: 'April 2024', comment: 'The florals were absolutely wild in the best way. Everyone thought a celebrity planned our wedding.' },
    ],
  },
  {
    id: 8, name: 'Forever Films Co.', category: 'Videography', rating: 4.7, reviewCount: 92,
    location: 'Online', online: true, priceRange: '$$',
    description: 'Accessible, beautiful wedding films for couples everywhere. We work remotely and travel to you, keeping our pricing honest without compromising on quality.',
    tags: ['affordable', 'travel', 'natural'],
    yearsInBusiness: 3, website: 'https://example.com', phone: null, email: 'info@foreverfilms.co',
    serviceArea: ['Australia-wide', 'New Zealand'],
    languages: ['English'],
    certifications: [],
    packages: [
      { name: 'Highlight reel', price: 'From $1,400', includes: ['3–4 minute highlight film', '6 hours coverage', '1 videographer'] },
      { name: 'Full film', price: 'From $2,200', includes: ['8–10 minute feature film', '8 hours coverage', '1 videographer', 'Ceremony edit', 'Speeches edit'] },
    ],
    depositTerms: 'AUD 500 deposit on booking.',
    cancellationPolicy: 'Deposit non-refundable. Balance fully refundable up to 30 days prior.',
    reviews: [
      { name: 'Megan & Paul', rating: 5, date: 'March 2024', comment: 'Super easy to work with and the film is gorgeous. Amazing value.' },
      { name: 'Carly H.', rating: 4, date: 'December 2023', comment: 'Great communication, lovely film. Delivery took a little longer than expected.' },
    ],
  },
  {
    id: 9, name: 'Brioche Catering', category: 'Catering', rating: 4.5, reviewCount: 134,
    location: 'London, UK', online: false, priceRange: '$$$',
    description: 'French-inspired fine dining for London weddings. Our head chef trained in Paris and brings that finesse to every wedding menu we create.',
    tags: ['French cuisine', 'fine dining', 'wine pairing'],
    yearsInBusiness: 9, website: 'https://example.com', phone: '+44 20 7000 1000', email: 'weddings@brioche.co.uk',
    serviceArea: ['London', 'Surrey', 'Kent', 'Cotswolds'],
    languages: ['English', 'French'],
    certifications: ['5-star Hygiene Rating', 'Sustainable Restaurant Association Member'],
    packages: [
      { name: 'Canapés & drinks', price: 'From £65/head', includes: ['6 canapé varieties', '2 hour service', 'Welcome prosecco', 'Staff included'] },
      { name: 'Seated dinner', price: 'From £120/head', includes: ['4-course menu', 'Amuse-bouche', 'Wine pairing available', 'Full service team'] },
    ],
    depositTerms: '25% deposit. Balance 4 weeks before event.',
    cancellationPolicy: 'Per contract. Generally 50% within 60 days of event.',
    reviews: [
      { name: 'Hannah & Oliver', rating: 5, date: 'May 2024', comment: 'The food was extraordinary. Our guests from France said it was better than Paris!' },
      { name: 'Tom W.', rating: 4, date: 'September 2023', comment: 'Incredible flavours, though service was slightly rushed during mains.' },
    ],
  },
  {
    id: 10, name: 'Radiant Beauty Bar', category: 'Hair & makeup', rating: 4.9, reviewCount: 318,
    location: 'Sydney, NSW', online: false, priceRange: '$$',
    description: 'Sydney\'s most-loved bridal beauty team. We specialise in longlasting, photogenic looks that feel like you — just elevated. Mobile service comes to your venue.',
    tags: ['mobile', 'all skin tones', 'trials included'],
    yearsInBusiness: 6, website: 'https://example.com', phone: '+61 2 9000 7777', email: 'bookings@radiantbeauty.com.au',
    serviceArea: ['Sydney metro', 'Central Coast', 'Wollongong'],
    languages: ['English', 'Cantonese'],
    certifications: ['Master of Bridal Hair & Makeup (TAFE)', 'AHIA Finalist 2024'],
    packages: [
      { name: 'Bride only', price: 'From $650', includes: ['Trial (1.5 hrs)', 'Wedding day hair + makeup', 'Touch-up kit', 'Travel to venue'] },
      { name: 'Bride + bridal party', price: 'From $1,100', includes: ['Bride trial', 'Wedding day — bride + 3 bridal party', 'Travel to venue'] },
    ],
    depositTerms: 'AUD 200 deposit on booking.',
    cancellationPolicy: 'Deposit refundable 60+ days out. No refund within 60 days.',
    reviews: [
      { name: 'Isabelle T.', rating: 5, date: 'June 2024', comment: 'Made me feel like the most beautiful version of myself. My makeup lasted all night!' },
      { name: 'Priya K.', rating: 5, date: 'March 2024', comment: 'Best decision I made for my wedding. Understood my skin tone perfectly and the photos are stunning.' },
    ],
  },
  {
    id: 11, name: 'Wanderlust Weddings', category: 'Celebrant', rating: 4.8, reviewCount: 245,
    location: 'Online', online: true, priceRange: '$',
    description: 'Legal wedding ceremonies conducted online and in-person across Australia. Specialising in intimate, personalised ceremonies that reflect who you truly are as a couple.',
    tags: ['online ceremony', 'intimate', 'same-sex friendly'],
    yearsInBusiness: 4, website: 'https://example.com', phone: null, email: 'hello@wanderustweddings.com.au',
    serviceArea: ['Nationwide (Australia)'],
    languages: ['English'],
    certifications: ['Registered Marriage Celebrant (AG)'],
    packages: [
      { name: 'Legal online ceremony', price: 'From $390', includes: ['30 min Zoom ceremony', 'Personalised vows', 'Legal paperwork', 'Certificate posted'] },
      { name: 'In-person ceremony', price: 'From $850', includes: ['Up to 60 min ceremony', 'Personalised script', 'Rehearsal', 'Legal paperwork', 'Travel within 50km'] },
    ],
    depositTerms: 'Full payment on booking for online ceremonies. 50% deposit for in-person.',
    cancellationPolicy: 'Full refund 60+ days. 50% refund 30–60 days. No refund within 30 days.',
    reviews: [
      { name: 'Alex & Jordan', rating: 5, date: 'January 2024', comment: 'Our ceremony was so personal and moving. Several guests said it was the best ceremony they\'d ever attended.' },
    ],
  },
  {
    id: 12, name: 'La Maison Venue', category: 'Venues', rating: 4.6, reviewCount: 57,
    location: 'Melbourne, VIC', online: false, priceRange: '$$$$',
    description: 'A stunning heritage estate in Melbourne\'s inner suburbs. La Maison offers an elegant, versatile space for intimate dinners to 250-guest celebrations.',
    tags: ['heritage', 'gardens', 'exclusive use'],
    yearsInBusiness: 15, website: 'https://example.com', phone: '+61 3 9000 2222', email: 'events@lamaisonvenue.com.au',
    serviceArea: ['Melbourne'],
    languages: ['English', 'French', 'Italian'],
    certifications: ['Victorian Heritage Register', 'Wedding Venue of the Year 2022'],
    packages: [
      { name: 'Intimate (up to 80)', price: 'From $8,500', includes: ['Exclusive venue hire', 'Garden & ballroom', 'Tables, chairs, linen', 'Bridal suite'] },
      { name: 'Grand (up to 250)', price: 'From $18,000', includes: ['Full estate exclusive hire', 'Indoor & outdoor spaces', 'Full furnishings', 'Bridal suite', 'Ceremony garden'] },
    ],
    depositTerms: '25% deposit to hold. Progressive payments to full 90 days prior.',
    cancellationPolicy: 'Per venue contract — typically 30% refund more than 180 days out.',
    reviews: [
      { name: 'Victoria & James', rating: 5, date: 'October 2023', comment: 'Absolutely stunning venue. The gardens are breathtaking and the staff are impeccable.' },
      { name: 'Lena M.', rating: 4, date: 'August 2023', comment: 'Beautiful space but parking was limited for guests. Worth flagging with your coordinator.' },
    ],
  },
  {
    id: 13, name: 'Officiant Online', category: 'Celebrant', rating: 4.9, reviewCount: 412,
    location: 'Online', online: true, priceRange: '$',
    description: 'Australia\'s most reviewed online wedding celebrant service. Fast, affordable, completely legal. Perfect for elopements, courthouse weddings, and intimate ceremonies.',
    tags: ['elopement', 'legal', 'same-sex friendly'],
    yearsInBusiness: 5, website: 'https://example.com', phone: '+61 400 000 111', email: 'info@officianton.com.au',
    serviceArea: ['Australia-wide (online)', 'Sydney in-person'],
    languages: ['English', 'Hindi'],
    certifications: ['Registered Marriage Celebrant'],
    packages: [
      { name: 'elopement', price: 'From $250', includes: ['30 min online ceremony', 'Personalised script', 'Legal lodge & certificate'] },
      { name: 'intimate plus', price: 'From $600', includes: ['60 min online or in-person', 'Rehearsal call', 'Custom vows', 'Witnesses provided if needed'] },
    ],
    depositTerms: 'Full payment upfront for online. 50% for in-person.',
    cancellationPolicy: 'Full refund 30+ days prior. Credit for rescheduling within 30 days.',
    reviews: [
      { name: 'Aiden & Sam', rating: 5, date: 'April 2024', comment: 'Quick, easy, and genuinely lovely. Our ceremony was perfect. 10/10.' },
    ],
  },
  {
    id: 14, name: 'Paper & Co. Studio', category: 'Stationery', rating: 4.8, reviewCount: 189,
    location: 'Online', online: true, priceRange: '$$',
    description: 'Beautiful wedding stationery designed with care and printed to perfection. From save-the-dates to menus and signage — cohesive suites for every aesthetic.',
    tags: ['custom design', 'digital + print', 'eco-friendly'],
    yearsInBusiness: 6, website: 'https://example.com', phone: null, email: 'hello@paperandco.studio',
    serviceArea: ['Online — worldwide shipping'],
    languages: ['English'],
    certifications: ['FSC Certified Printing'],
    packages: [
      { name: 'Digital only', price: 'From $350', includes: ['Invitation suite design', 'Digital files for self-print', 'Save-the-date + RSVP + details card'] },
      { name: 'Printed suite (50 sets)', price: 'From $880', includes: ['Full design', '50 printed invitation sets', 'Envelopes included', 'On-suite menu cards'] },
      { name: 'Full stationery', price: 'From $1,600', includes: ['All above', 'Seating chart', 'Table numbers', 'Order of service', 'Thank you cards'] },
    ],
    depositTerms: '50% deposit at proof approval.',
    cancellationPolicy: 'Full refund before proof. 50% after proof. No refund after print order placed.',
    reviews: [
      { name: 'Mia & Daniel', rating: 5, date: 'May 2024', comment: 'Absolute perfection. They nailed our aesthetic on the first proof. Guests were obsessed with our invitations.' },
    ],
  },
  {
    id: 15, name: 'Sweet Layers Bakery', category: 'Cake', rating: 4.9, reviewCount: 267,
    location: 'New York, NY', online: false, priceRange: '$$',
    description: 'Artisan wedding cakes baked from scratch with seasonal, locally sourced ingredients. Every cake is a one-of-a-kind edible work of art tailored to your wedding.',
    tags: ['custom', 'gluten-free available', 'kosher available'],
    yearsInBusiness: 8, website: 'https://example.com', phone: '+1 212 555 0200', email: 'orders@sweetlayers.com',
    serviceArea: ['NYC', 'Long Island', 'New Jersey', 'Connecticut'],
    languages: ['English'],
    certifications: ['NYC Health Dept. Grade A', 'Certified Pastry Chef'],
    packages: [
      { name: '3-tier cake (up to 80 guests)', price: 'From $1,200', includes: ['3-tier custom design', 'Choice of 3 flavours', 'Fondant or buttercream', 'Delivery + set-up', 'Cutting kit'] },
      { name: '5-tier cake (up to 200 guests)', price: 'From $2,400', includes: ['5-tier custom design', 'Up to 5 flavours', 'Sugar flowers', 'Delivery + set-up'] },
    ],
    depositTerms: '50% deposit on booking.',
    cancellationPolicy: 'Full refund 90+ days. 50% 30–90 days. No refund within 30 days.',
    reviews: [
      { name: 'Lily & Ben', rating: 5, date: 'June 2024', comment: 'The most delicious wedding cake I\'ve ever tasted. Three tiers, three flavours, all incredible.' },
    ],
  },
  {
    id: 16, name: 'Diamond & Pearl Jewellers', category: 'Jewellery', rating: 4.7, reviewCount: 103,
    location: 'London, UK', online: false, priceRange: '$$$$',
    description: 'Bespoke engagement rings and wedding bands handcrafted in our Hatton Garden studio. Ethically sourced stones, timeless designs, and a lifetime guarantee.',
    tags: ['bespoke', 'ethical', 'Hatton Garden'],
    yearsInBusiness: 22, website: 'https://example.com', phone: '+44 20 7000 2000', email: 'studio@diamondandpearl.co.uk',
    serviceArea: ['London (in-studio)', 'UK posting', 'International shipping'],
    languages: ['English'],
    certifications: ['Fairtrade Gold Certified', 'GIA Trained Gemologist', 'NAJ Member'],
    packages: [
      { name: 'Engagement ring', price: 'From £2,800', includes: ['Consultation + design', 'Bespoke manufacture', 'Ethically sourced stone', 'Certificate of authenticity', 'Lifetime guarantee'] },
      { name: 'Wedding band set', price: 'From £1,200', includes: ['His & hers band design', 'Bespoke manufacture', 'Gift boxes', 'Lifetime guarantee'] },
    ],
    depositTerms: '50% deposit to begin work. Balance on collection.',
    cancellationPolicy: 'No refund on bespoke items once manufacture has commenced.',
    reviews: [
      { name: 'Charlotte & Ed', rating: 5, date: 'February 2024', comment: 'They created the ring of my dreams. The process was so personal and the result is beyond beautiful.' },
    ],
  },
  {
    id: 17, name: 'Classic Car Hire', category: 'Transport', rating: 4.5, reviewCount: 76,
    location: 'Sydney, NSW', online: false, priceRange: '$$',
    description: 'Arrive in style with our fleet of immaculate vintage and classic cars. From Rolls-Royces to Jaguars, we make your wedding arrival unforgettable.',
    tags: ['vintage', 'Rolls-Royce', 'chauffeur driven'],
    yearsInBusiness: 18, website: 'https://example.com', phone: '+61 2 9000 6600', email: 'hire@classiccars.com.au',
    serviceArea: ['Sydney', 'Blue Mountains', 'Hunter Valley', 'Central Coast'],
    languages: ['English'],
    certifications: ['Passenger Transport Licence NSW'],
    packages: [
      { name: '3 hours', price: 'From $650', includes: ['Vintage car hire', 'Professional chauffeur', 'Ribbons & decorations', 'Bottled water'] },
      { name: 'Full day', price: 'From $1,100', includes: ['Up to 10 hours', 'Multiple pick-ups', 'Professional chauffeur', 'Decorations', 'Champagne'] },
    ],
    depositTerms: 'AUD 300 non-refundable deposit.',
    cancellationPolicy: 'Deposit non-refundable. Balance refunded 30+ days prior.',
    reviews: [
      { name: 'Kate & Dan', rating: 5, date: 'November 2023', comment: 'The car was immaculate and our driver was wonderful. Made for incredible photos.' },
      { name: 'Michelle O.', rating: 4, date: 'October 2023', comment: 'Beautiful car, punctual service. Great value.' },
    ],
  },
  {
    id: 18, name: 'The Magic Hour Studio', category: 'Photography', rating: 4.7, reviewCount: 88,
    location: 'Los Angeles, CA', online: false, priceRange: '$$$$',
    description: 'High-fashion editorial wedding photography for couples who want their wedding to feel like a Vogue shoot. We travel internationally and do not take many bookings per year.',
    tags: ['editorial', 'luxury', 'destination'],
    yearsInBusiness: 9, website: 'https://example.com', phone: '+1 310 555 0300', email: 'contact@magichourstudio.com',
    serviceArea: ['Los Angeles', 'Worldwide travel'],
    languages: ['English'],
    certifications: ['WPJA Award Winner', 'Green Wedding Shoes Featured Photographer'],
    packages: [
      { name: 'Elopement', price: 'From $6,000', includes: ['4 hours', '2 photographers', '300+ images', 'Online gallery'] },
      { name: 'Full wedding', price: 'From $12,000', includes: ['10 hours', '3 photographers', 'Engagement session', '800+ images', 'Fine art album', 'Same-day edit'] },
    ],
    depositTerms: '$3,000 retainer to hold date.',
    cancellationPolicy: 'Retainer non-refundable. Balance refunded 120+ days prior.',
    reviews: [
      { name: 'Alexa & Marco', rating: 5, date: 'March 2024', comment: 'These photos look like they belong in a magazine. We get stopped on Instagram constantly. Worth every dollar.' },
    ],
  },
  {
    id: 19, name: 'Glow Beauty Collective', category: 'Hair & makeup', rating: 4.6, reviewCount: 154,
    location: 'Melbourne, VIC', online: false, priceRange: '$$',
    description: 'A team of Melbourne\'s best bridal artists working together under one brand. We accommodate large bridal parties and match you with the right artist for your look.',
    tags: ['team of artists', 'large parties', 'all skin tones'],
    yearsInBusiness: 4, website: 'https://example.com', phone: '+61 3 9000 3333', email: 'bookings@glowcollective.com.au',
    serviceArea: ['Melbourne', 'Mornington Peninsula', 'Yarra Valley'],
    languages: ['English', 'Vietnamese'],
    certifications: ['AHIA Member'],
    packages: [
      { name: 'Bride only', price: 'From $580', includes: ['Hair + makeup trial', 'Wedding day hair + makeup', 'Travel to venue'] },
      { name: 'Party of 5', price: 'From $1,900', includes: ['Bride + 4 bridal party', 'Hair + makeup for all', 'Travel to venue'] },
    ],
    depositTerms: 'AUD 200 deposit on booking.',
    cancellationPolicy: 'Deposit non-refundable. Balance refunded 45+ days prior.',
    reviews: [
      { name: 'Tanya & Josh', rating: 5, date: 'August 2024', comment: 'Everyone in our bridal party looked incredible. So professional and fun on the day.' },
    ],
  },
  {
    id: 20, name: 'Encore Music Agency', category: 'Music & DJ', rating: 4.8, reviewCount: 93,
    location: 'London, UK', online: false, priceRange: '$$$',
    description: 'Live music specialists for London weddings. We represent over 40 artists including jazz trios, string quartets, soul bands, and DJ/live combos.',
    tags: ['live music', 'jazz', 'string quartet'],
    yearsInBusiness: 11, website: 'https://example.com', phone: '+44 20 7000 3000', email: 'bookings@encoreagency.co.uk',
    serviceArea: ['London', 'Home Counties', 'UK-wide travel'],
    languages: ['English'],
    certifications: ['ABTT Member', 'Featured in Vogue Weddings'],
    packages: [
      { name: 'Ceremony acoustic duo', price: 'From £850', includes: ['Up to 90 min live performance', 'Ceremony + drinks reception', 'PA included'] },
      { name: 'Evening band', price: 'From £3,200', includes: ['5-piece live band', '3 × 45 min sets', 'PA + lighting rig', 'DJ for set breaks'] },
    ],
    depositTerms: '25% deposit to confirm booking.',
    cancellationPolicy: 'Deposit non-refundable. Balance refunded 60+ days prior.',
    reviews: [
      { name: 'Pippa & Tom', rating: 5, date: 'May 2024', comment: 'The band was phenomenal. Our guests are still raving about them months later.' },
    ],
  },
  {
    id: 21, name: 'Willow & Vine Events', category: 'Styling', rating: 4.7, reviewCount: 62,
    location: 'Brisbane, QLD', online: false, priceRange: '$$',
    description: 'Relaxed, romantic styling with a focus on natural textures and botanical elements. Perfect for garden, barn, and winery weddings across QLD.',
    tags: ['bohemian', 'botanical', 'outdoor'],
    yearsInBusiness: 5, website: 'https://example.com', phone: '+61 7 3000 8888', email: 'hello@willowandvine.com.au',
    serviceArea: ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Byron Bay area'],
    languages: ['English'],
    certifications: [],
    packages: [
      { name: 'Styling hire', price: 'From $1,400', includes: ['Prop & furniture hire', 'Delivery + set-up + bump out', 'Style consult'] },
      { name: 'Full styling', price: 'From $3,200', includes: ['Concept + mood board', 'All props + florals', 'Full set-up', 'Day-of coordination'] },
    ],
    depositTerms: 'AUD 500 deposit to secure date.',
    cancellationPolicy: 'Deposit non-refundable. Balance refunded 90+ days prior.',
    reviews: [
      { name: 'Georgia & Sam', rating: 5, date: 'July 2024', comment: 'Our venue was transformed. Everything looked exactly as I imagined — actually better!' },
    ],
  },
  {
    id: 22, name: 'Circus & Wonder', category: 'Entertainment', rating: 4.9, reviewCount: 45,
    location: 'Sydney, NSW', online: false, priceRange: '$$$',
    description: 'Bespoke wedding entertainment: fire performers, aerialists, roving magicians, caricaturists, and more. We create unforgettable moments your guests will talk about for years.',
    tags: ['unique', 'performers', 'WOW factor'],
    yearsInBusiness: 7, website: 'https://example.com', phone: '+61 2 9000 8800', email: 'events@circusandwonder.com.au',
    serviceArea: ['Sydney', 'NSW', 'Interstate travel available'],
    languages: ['English'],
    certifications: ['Public Liability $20M', 'MEAA Member Artists'],
    packages: [
      { name: 'Cocktail entertainment', price: 'From $1,200', includes: ['2 roving performers (2 hrs)', 'Choice of act type', 'Costuming included'] },
      { name: 'Full evening show', price: 'From $4,500', includes: ['1 hour stage show', '2 hours roving', '6 performers', 'Custom soundtrack', 'Lighting requirements brief'] },
    ],
    depositTerms: '30% deposit on booking. Balance 7 days before event.',
    cancellationPolicy: 'Deposit non-refundable. Balance refunded 60+ days prior.',
    reviews: [
      { name: 'Nick & Fiona', rating: 5, date: 'June 2024', comment: 'Our guests were absolutely blown away. The fire performers at sunset were just spectacular.' },
    ],
  },
  {
    id: 23, name: 'Heartfelt Ceremonies', category: 'Celebrant', rating: 4.8, reviewCount: 178,
    location: 'Melbourne, VIC', online: false, priceRange: '$$',
    description: 'Warm, personal wedding ceremonies that actually reflect your love story. No scripts, no clichés — just an honest, beautiful ceremony created specifically for you.',
    tags: ['personalised', 'inclusive', 'modern'],
    yearsInBusiness: 8, website: 'https://example.com', phone: '+61 3 9000 7700', email: 'hello@heartfeltceremonies.com.au',
    serviceArea: ['Melbourne', 'Mornington Peninsula', 'Yarra Valley', 'Geelong', 'Ballarat'],
    languages: ['English'],
    certifications: ['Registered Marriage Celebrant', 'ACA Member'],
    packages: [
      { name: 'Simple ceremony', price: 'From $750', includes: ['Pre-ceremony meetings', 'Personalised script', 'Legal lodgement', 'Certificate of marriage'] },
      { name: 'Premium ceremony', price: 'From $1,200', includes: ['All above', 'Rehearsal', 'Vow writing guidance', 'Sound system hire', 'Day-of coordination'] },
    ],
    depositTerms: 'AUD 250 deposit on booking.',
    cancellationPolicy: 'Deposit refundable 90+ days. Partial refund 30–90 days.',
    reviews: [
      { name: 'Bec & Chris', rating: 5, date: 'September 2023', comment: 'Guests said it was the most personal ceremony they\'ve been to. We cried. Everyone cried. Perfect.' },
    ],
  },
  {
    id: 24, name: 'Garden State Venue', category: 'Venues', rating: 4.5, reviewCount: 71,
    location: 'New York, NY', online: false, priceRange: '$$$',
    description: 'A rooftop and garden venue in Brooklyn with stunning Manhattan skyline views. Accommodates 30–180 guests across our indoor and outdoor spaces.',
    tags: ['rooftop', 'city views', 'outdoor'],
    yearsInBusiness: 6, website: 'https://example.com', phone: '+1 718 555 0400', email: 'events@gardenstatevenue.com',
    serviceArea: ['Brooklyn, NYC'],
    languages: ['English', 'Spanish'],
    certifications: ['NYC DOB Certificate of Occupancy'],
    packages: [
      { name: 'Rooftop ceremony (up to 80)', price: 'From $4,500', includes: ['4 hour venue hire', 'Rooftop access', 'Tables + chairs', 'Basic AV'] },
      { name: 'Full celebration (up to 180)', price: 'From $12,000', includes: ['8 hour hire', 'Rooftop + garden + indoor', 'All furnishings', 'Full AV', 'Bridal suite'] },
    ],
    depositTerms: '$2,500 deposit to hold date.',
    cancellationPolicy: 'Per venue contract. Deposit non-refundable.',
    reviews: [
      { name: 'Dana & Eric', rating: 5, date: 'October 2023', comment: 'The skyline views at sunset are unreal. Everyone thought we spent a fortune — we didn\'t.' },
      { name: 'Nina L.', rating: 4, date: 'September 2023', comment: 'Beautiful venue. The staff were lovely. Parking can be tricky in Brooklyn — plan ahead.' },
    ],
  },
  {
    id: 25, name: 'Indigo Photography Co.', category: 'Photography', rating: 4.6, reviewCount: 132,
    location: 'London, UK', online: false, priceRange: '$$',
    description: 'Documentary-style wedding photography for couples who want authentic storytelling over posed portraits. Based in London, we travel throughout the UK and Europe.',
    tags: ['documentary', 'candid', 'film-inspired'],
    yearsInBusiness: 5, website: 'https://example.com', phone: '+44 7700 000 100', email: 'hello@indigophoto.co.uk',
    serviceArea: ['London', 'UK', 'Europe (travel surcharge applies)'],
    languages: ['English'],
    certifications: ['SWPP Member'],
    packages: [
      { name: 'Half day', price: 'From £1,400', includes: ['5 hours coverage', '1 photographer', '300+ images', 'Online gallery'] },
      { name: 'Full day', price: 'From £2,200', includes: ['10 hours coverage', '1 photographer', '600+ images', 'Online gallery', 'USB'] },
      { name: 'Full day + film', price: 'From £3,400', includes: ['10 hours photography', 'Photographer + videographer', '600+ images', '5 min highlight reel'] },
    ],
    depositTerms: '£500 deposit on booking. Balance 8 weeks before.',
    cancellationPolicy: 'Deposit non-refundable. Balance refunded 60+ days prior.',
    reviews: [
      { name: 'Jess & Leo', rating: 5, date: 'April 2024', comment: 'Our photos feel like a photo essay of our best day. Beautifully observed, completely natural.' },
      { name: 'Ruth W.', rating: 4, date: 'December 2023', comment: 'Lovely work and easy to deal with. A few shots were a bit dark but overall very happy.' },
    ],
  },
];

const PRICE_ORDER = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };

// Add VITE_GOOGLE_PLACES_KEY to your Vercel environment variables to enable real vendor search.
// Get a key from console.cloud.google.com and enable: Places API.

export default function VendorMarketplace() {
  const [search, setSearch] = useState('');
  const [locationQ, setLocationQ] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [category, setCategory] = useState('All');
  const [minRating, setMinRating] = useState(false);
  const [priceFilter, setPriceFilter] = useState('');
  const [sortBy, setSortBy] = useState('Relevance');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [placeVendors, setPlaceVendors] = useState(null);
  const [apiStatus, setApiStatus] = useState('');

  const handleSave = async (vendor) => {
    if (savedIds.has(vendor.id)) return;
    setSavingIds(prev => new Set([...prev, vendor.id]));
    try {
      await base44.entities.Vendor.create({
        name: vendor.name,
        category: vendor.category.toLowerCase(),
        website: vendor.website || '',
        notes: vendor.description,
        status: 'researching',
      });
      setSavedIds(prev => new Set([...prev, vendor.id]));
      toast.success('Saved to My vendors');
    } catch {
      toast.error('Failed to save vendor');
    }
    setSavingIds(prev => { const s = new Set(prev); s.delete(vendor.id); return s; });
  };

  const handleViewProfile = (vendor) => { setSelectedVendor(vendor); setProfileOpen(true); };
  const handleGetQuote = (vendor) => { setSelectedVendor(vendor); setQuoteOpen(true); };

  const handleSearch = async () => {
    const key = import.meta.env.VITE_GOOGLE_PLACES_KEY;
    if (!key) { setApiStatus('no_key'); setPlaceVendors(null); return; }
    setApiStatus('searching');
    const queryParts = [category !== 'All' ? category : 'wedding vendor', locationQ || ''].filter(Boolean);
    const query = `${queryParts.join(' ')} wedding`;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`
      );
      const data = await res.json();
      if (data.results?.length) {
        const priceMap = ['$', '$$', '$$$', '$$$$'];
        const mapped = data.results.map((r, i) => ({
          id: `places_${r.place_id || i}`,
          name: r.name,
          category: category !== 'All' ? category : 'Other',
          rating: r.rating || 4.0,
          reviewCount: r.user_ratings_total || 0,
          location: r.formatted_address || locationQ,
          online: false,
          priceRange: r.price_level ? priceMap[Math.min(r.price_level - 1, 3)] : '$$',
          description: (r.types || []).map(t => t.replace(/_/g, ' ')).join(', '),
          tags: [],
          website: null, phone: null, email: null,
          serviceArea: [], languages: [], certifications: [],
          packages: [], reviews: [], depositTerms: '', cancellationPolicy: '',
        }));
        setPlaceVendors(mapped);
      } else {
        setPlaceVendors([]);
      }
      setApiStatus('done');
    } catch {
      setApiStatus('error');
      setPlaceVendors(null);
    }
  };

  const filtered = useMemo(() => {
    const source = placeVendors !== null ? placeVendors : MOCK_VENDORS;
    let list = source.filter(v => {
      if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.category.toLowerCase().includes(search.toLowerCase()) && !(v.description || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (locationQ && placeVendors === null && !v.location.toLowerCase().includes(locationQ.toLowerCase())) return false;
      if (onlineOnly && !v.online) return false;
      if (category !== 'All' && v.category !== category) return false;
      if (minRating && v.rating < 4) return false;
      if (priceFilter && v.priceRange !== priceFilter) return false;
      return true;
    });
    if (sortBy === 'Rating') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'Price low–high') list = [...list].sort((a, b) => PRICE_ORDER[a.priceRange] - PRICE_ORDER[b.priceRange]);
    else if (sortBy === 'Price high–low') list = [...list].sort((a, b) => PRICE_ORDER[b.priceRange] - PRICE_ORDER[a.priceRange]);
    return list;
  }, [search, locationQ, onlineOnly, category, minRating, priceFilter, sortBy, placeVendors]);

  const underlineInput = (extraStyle = {}) => ({
    border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
    background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
    outline: 'none', padding: '8px 0', boxSizing: 'border-box',
    ...extraStyle,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Marketplace" subtitle="Find and connect with wedding vendors" />

      {/* Ava button */}
      <div style={{ padding: '16px 32px 0' }}>
        <AvaButton label="Ask Ava to find the perfect vendors" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Filter bar */}
      <div style={{ padding: '20px 32px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Row 1: search + location + online toggle + search button */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search vendors, categories…"
              style={{ ...underlineInput({ paddingLeft: 20, width: '100%' }) }}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'}
              onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'}
            />
          </div>
          <div style={{ position: 'relative', width: 200 }}>
            <MapPin size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
            <input
              value={locationQ} onChange={e => setLocationQ(e.target.value)}
              placeholder="City, region or postcode"
              style={{ ...underlineInput({ paddingLeft: 20, width: '100%' }) }}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'}
              onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'pointer', paddingBottom: 8, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={onlineOnly} onChange={e => setOnlineOnly(e.target.checked)}
              style={{ accentColor: '#E03553', width: 14, height: 14 }} />
            Online businesses
          </label>
          <button onClick={handleSearch} disabled={apiStatus === 'searching'}
            style={{ padding: '8px 18px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: apiStatus === 'searching' ? 'not-allowed' : 'pointer', border: 'none', background: '#E03553', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: apiStatus === 'searching' ? 0.7 : 1 }}>
            {apiStatus === 'searching' ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Search
          </button>
        </div>

        {/* Row 2: category pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.12s',
                background: category === cat ? '#0A0A0A' : 'rgba(10,10,10,0.06)',
                color: category === cat ? '#FFFFFF' : '#444444' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Row 3: rating toggle + price pills + sort */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 4, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <button onClick={() => setMinRating(v => !v)}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
              borderColor: minRating ? '#F59E0B' : 'rgba(10,10,10,0.15)',
              background: minRating ? 'rgba(245,158,11,0.08)' : 'none',
              color: minRating ? '#92400e' : 'rgba(10,10,10,0.5)' }}>
            4★ and above
          </button>

          {Object.entries(PRICE_LABELS).map(([sym, label]) => (
            <button key={sym} onClick={() => setPriceFilter(f => f === sym ? '' : sym)}
              style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
                borderColor: priceFilter === sym ? '#0A0A0A' : 'rgba(10,10,10,0.15)',
                background: priceFilter === sym ? '#0A0A0A' : 'none',
                color: priceFilter === sym ? '#FFFFFF' : 'rgba(10,10,10,0.5)' }}>
              {sym} · {label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ appearance: 'none', border: 'none', background: 'none', fontSize: 12, fontWeight: 600, fontFamily: PJS, color: 'rgba(10,10,10,0.5)', cursor: 'pointer', paddingRight: 18, outline: 'none' }}>
              {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '8px 32px 48px' }}>
        {apiStatus === 'no_key' && (
          <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 12, fontSize: 12, color: '#92400e', fontFamily: PJS }}>
            Add a <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.06)', padding: '1px 4px' }}>VITE_GOOGLE_PLACES_KEY</code> environment variable to enable real vendor search. Showing sample data for now.
          </div>
        )}
        {apiStatus === 'error' && (
          <div style={{ padding: '10px 14px', background: 'rgba(224,53,83,0.06)', border: '1px solid rgba(224,53,83,0.2)', marginBottom: 12, fontSize: 12, color: '#c42d47', fontFamily: PJS }}>
            Could not connect to Google Places (CORS or network error). Showing sample data. Consider setting up a server-side proxy.
          </div>
        )}
        {apiStatus === 'done' && placeVendors !== null && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 12, fontSize: 12, color: '#065f46', fontFamily: PJS, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Showing real results from Google Places.</span>
            <button onClick={() => { setPlaceVendors(null); setApiStatus(''); }} style={{ fontSize: 11, fontWeight: 700, color: '#065f46', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: PJS }}>Back to sample data</button>
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, padding: '12px 0', marginBottom: 4 }}>
          {filtered.length} vendor{filtered.length !== 1 ? 's' : ''} found{placeVendors !== null ? ' (Google Places)' : ''}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No vendors match your filters. Try adjusting your search.</p>
          </div>
        ) : (
          filtered.map(vendor => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onViewProfile={handleViewProfile}
              onGetQuote={handleGetQuote}
              onSave={handleSave}
              isSaved={savedIds.has(vendor.id)}
              isSaving={savingIds.has(vendor.id)}
            />
          ))
        )}
      </div>

      {profileOpen && selectedVendor && (
        <VendorProfileModal
          vendor={selectedVendor}
          onClose={() => setProfileOpen(false)}
          onGetQuote={(v) => { setProfileOpen(false); setSelectedVendor(v); setQuoteOpen(true); }}
          onSave={handleSave}
          isSaved={savedIds.has(selectedVendor.id)}
        />
      )}

      {quoteOpen && selectedVendor && (
        <QuoteRequestModal
          vendor={selectedVendor}
          onClose={() => setQuoteOpen(false)}
        />
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Vendor advisor"
        systemPrompt="You are Ava, a wedding vendor expert for Openinvite. Help couples find, evaluate, and manage wedding vendors. Suggest vendors by category, help them understand pricing, prepare questions to ask vendors, and draft enquiry emails."
        quickActions={['What vendors do I still need?', 'What questions should I ask vendors?', 'Help me compare vendor quotes', 'Draft a vendor enquiry email']}
      />
    </div>
  );
}
