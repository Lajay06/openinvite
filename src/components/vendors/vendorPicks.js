/**
 * src/components/vendors/vendorPicks.js
 *
 * THE TWO RULES EVERY VENDOR SURFACE SHARES, in a file a guard can run.
 *
 * Item 1 of goals/2026-10-11-dashboard-fixes-batch-1.md. The components around
 * this one are .jsx and cannot be imported by a node guard, so the parts that
 * can be wrong invisibly live here: which vendors belong to a category, and
 * what gets copied when the On the day list picks one.
 *
 * THE CATEGORY MATCH IS ONE RULE, NOT FIVE. VendorContactSection and
 * VendorRosterSection each filtered `v.category === category` inline, which is
 * the same rule written twice and the reason a vendor added on the Vendors
 * page could appear on one surface and not another the moment either copy
 * drifted. One function, and the guard drives it.
 */

/** The label every add control leads with, on every surface. */
export const ADD_VENDOR_LABEL = 'Add vendor';

/** The On the day list's second action, for a contact who is not a vendor. */
export const ADD_CONTACT_LABEL = 'Add contact';

/**
 * The vendors in one category.
 *
 * CASE AND SPACE ARE NORMALIZED, because a category reaches a Vendor row from
 * three places: the Vendors page form, the marketplace's "Add to my vendors",
 * and Ava's create_vendor action. A row stored as "Beauty" is a beauty vendor,
 * and a surface that hid it would be the exact failure this item exists to
 * close.
 *
 * @param {Array<object>} vendors
 * @param {string} category
 * @returns {Array<object>} the matching rows, input order preserved
 */
export function vendorsInCategory(vendors, category) {
  const want = String(category ?? '').trim().toLowerCase();
  if (!want) return [];
  return (vendors || []).filter((v) => String(v?.category ?? '').trim().toLowerCase() === want);
}

/**
 * The On the day contact built from a Vendor row.
 *
 * NAME AND PHONE, AND THE CATEGORY AS THE ROLE. dayVendorContacts is a free
 * array on WeddingDetails and stays that way: the owner's ruling is that those
 * contacts include people who are not vendors, so this COPIES rather than
 * links. A copy can go stale, which is the price of keeping one list that
 * holds both; the alternative was excluding the florist's own number from the
 * list a couple reads at 6am.
 *
 * Role is prefilled from the category because that is the field's own
 * question, and it is left editable like every other field in the row.
 *
 * @param {object} vendor
 * @returns {{name: string, phone: string, role: string}}
 */
export function contactFromVendor(vendor) {
  return {
    name: String(vendor?.name ?? '').trim(),
    phone: String(vendor?.phone ?? '').trim(),
    role: String(vendor?.category ?? '').trim(),
  };
}

/** A blank row, for the free-text action. */
export function blankContact() {
  return { name: '', phone: '', role: '' };
}
