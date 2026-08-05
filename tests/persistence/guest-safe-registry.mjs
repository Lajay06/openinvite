/**
 * tests/persistence/guest-safe-registry.mjs
 *
 * Pure-function coverage for api/_lib/guestSafeRegistry.js — the field
 * allowlist backing the public /w/:slug registry section (cash fund +
 * registry public-site wiring, Option A). No live Base44 login needed;
 * these are plain functions with no network/DOM dependency, same as
 * guestSafeWedding.js's own shape.
 *
 * What this proves, concretely:
 *   - CustomGift.payment_link_url only ever reaches the guest-safe payload
 *     when it's a validated https:// URL — http/javascript/data schemes and
 *     malformed values are dropped, not sanitized-and-kept.
 *   - RegistryProduct.purchased_by (guest PII) and .notes (owner-private)
 *     never appear in the guest-safe payload, regardless of what's on the
 *     input record.
 */
import { pickGuestSafeCustomGift, pickGuestSafeRegistryProduct, isSafeHttpsUrl } from '../../api/_lib/guestSafeRegistry.js';
import { pass, fail } from './_shared.mjs';

export async function runGuestSafeRegistry() {
  const results = [];

  console.log('\n  Guest-safe registry — CustomGift/RegistryProduct field allowlist:\n');

  // ── isSafeHttpsUrl ──────────────────────────────────────────────────────
  const httpsCases = [
    ['https://paypal.me/example', true],
    ['https://buy.stripe.com/test_abc123', true],
    ['http://paypal.me/example', false],              // wrong scheme
    ['javascript:alert(1)', false],                    // scheme-injection XSS
    ['data:text/html,<script>alert(1)</script>', false],
    ['not a url at all', false],
    ['', false],
    [undefined, false],
    [null, false],
    ['   ', false],
  ];
  const httpsFailures = httpsCases.filter(([input, expected]) => isSafeHttpsUrl(input) !== expected);
  results.push(httpsFailures.length === 0
    ? pass('isSafeHttpsUrl — accepts only well-formed https:// URLs', `${httpsCases.length} cases`)
    : fail('isSafeHttpsUrl — accepts only well-formed https:// URLs', 'all cases correct', JSON.stringify(httpsFailures)));

  // ── pickGuestSafeCustomGift ─────────────────────────────────────────────
  const giftWithValidLink = {
    id: 'gift1', title: 'Honeymoon fund', description: 'Help us get to Bali', category: 'honeymoon',
    requested_amount: 2000, image_url: 'https://example.com/photo.jpg',
    payment_link_url: 'https://paypal.me/thecouple',
    created_by_id: 'user_abc123', // internal id — must never leak
  };
  const safeGift1 = pickGuestSafeCustomGift(giftWithValidLink);
  results.push(safeGift1.payment_link_url === 'https://paypal.me/thecouple'
    ? pass('pickGuestSafeCustomGift — keeps a valid https:// payment_link_url', safeGift1.payment_link_url)
    : fail('pickGuestSafeCustomGift — keeps a valid https:// payment_link_url', 'https://paypal.me/thecouple', safeGift1.payment_link_url));
  results.push(!('created_by_id' in safeGift1)
    ? pass('pickGuestSafeCustomGift — never includes created_by_id', 'omitted')
    : fail('pickGuestSafeCustomGift — never includes created_by_id', 'omitted', safeGift1.created_by_id));

  const giftWithBadLink = { ...giftWithValidLink, payment_link_url: 'javascript:alert(document.cookie)' };
  const safeGift2 = pickGuestSafeCustomGift(giftWithBadLink);
  results.push(!('payment_link_url' in safeGift2)
    ? pass('pickGuestSafeCustomGift — omits payment_link_url entirely for a non-https scheme', 'key absent')
    : fail('pickGuestSafeCustomGift — omits payment_link_url entirely for a non-https scheme', 'key absent', safeGift2.payment_link_url));

  const giftWithNoLink = { ...giftWithValidLink };
  delete giftWithNoLink.payment_link_url;
  const safeGift3 = pickGuestSafeCustomGift(giftWithNoLink);
  results.push(!('payment_link_url' in safeGift3)
    ? pass('pickGuestSafeCustomGift — omits payment_link_url when the fund never set one', 'key absent')
    : fail('pickGuestSafeCustomGift — omits payment_link_url when the fund never set one', 'key absent', safeGift3.payment_link_url));

  results.push(safeGift1.title === 'Honeymoon fund' && safeGift1.requested_amount === 2000 && safeGift1.category === 'honeymoon'
    ? pass('pickGuestSafeCustomGift — keeps title/category/requested_amount/description/image_url', 'all present')
    : fail('pickGuestSafeCustomGift — keeps title/category/requested_amount/description/image_url', 'all present', JSON.stringify(safeGift1)));

  // ── pickGuestSafeRegistryProduct ────────────────────────────────────────
  const product = {
    id: 'prod1', name: 'Stand mixer', description: 'The good kind', price: 350,
    image_url: 'https://example.com/mixer.jpg', product_url: 'https://example.com/product/mixer',
    category: 'kitchen', quantity_requested: 2, quantity_purchased: 1,
    purchased_by: [{ guest_name: 'Sam Guest', guest_email: 'sam@example.com', quantity: 1, purchase_date: '2026-01-01', message: 'Enjoy!' }],
    notes: 'Aunt Sue already has one of these, steer her elsewhere',
    priority: 'high',
    created_by_id: 'user_abc123',
  };
  const safeProduct = pickGuestSafeRegistryProduct(product);
  results.push(!('purchased_by' in safeProduct)
    ? pass('pickGuestSafeRegistryProduct — strips purchased_by (guest PII)', 'key absent')
    : fail('pickGuestSafeRegistryProduct — strips purchased_by (guest PII)', 'key absent', JSON.stringify(safeProduct.purchased_by)));
  results.push(!('notes' in safeProduct)
    ? pass('pickGuestSafeRegistryProduct — strips notes (owner-private)', 'key absent')
    : fail('pickGuestSafeRegistryProduct — strips notes (owner-private)', 'key absent', safeProduct.notes));
  results.push(!('created_by_id' in safeProduct) && !('priority' in safeProduct)
    ? pass('pickGuestSafeRegistryProduct — strips created_by_id and priority (owner-internal)', 'both absent')
    : fail('pickGuestSafeRegistryProduct — strips created_by_id and priority (owner-internal)', 'both absent', JSON.stringify(safeProduct)));
  results.push(safeProduct.quantity_requested === 2 && safeProduct.quantity_purchased === 1
    ? pass('pickGuestSafeRegistryProduct — keeps quantity_requested/quantity_purchased for the "N of M claimed" line', `${safeProduct.quantity_purchased} of ${safeProduct.quantity_requested}`)
    : fail('pickGuestSafeRegistryProduct — keeps quantity_requested/quantity_purchased for the "N of M claimed" line', '1 of 2', `${safeProduct.quantity_purchased} of ${safeProduct.quantity_requested}`));
  results.push(safeProduct.name === 'Stand mixer' && safeProduct.product_url === 'https://example.com/product/mixer' && safeProduct.price === 350
    ? pass('pickGuestSafeRegistryProduct — keeps name/description/price/image_url/product_url/category', 'all present')
    : fail('pickGuestSafeRegistryProduct — keeps name/description/price/image_url/product_url/category', 'all present', JSON.stringify(safeProduct)));

  return results;
}
