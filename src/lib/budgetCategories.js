/**
 * src/lib/budgetCategories.js — THE THIRTEEN BUDGET CATEGORIES, ONCE.
 *
 * The list lived inside Budget.jsx, which is where it is used and would have
 * been the right home if it had one consumer. It now has two: the planner form
 * writes these keys, and Ava's validator has to refuse a write to any key that
 * is not one of them. A .jsx file cannot be imported by a guard running in
 * plain Node, so the list moved rather than being copied — a second copy of a
 * money schema is the shape that goes wrong quietly.
 *
 * ORDER IS THE FORM'S ORDER and is load-bearing: BudgetPlanner renders the
 * inputs in this sequence and its save writes all thirteen keys every time, so
 * an older plan stored with eight is upgraded on the couple's next save rather
 * than by a migration over live money.
 */
export const BUDGET_CATEGORIES = [
  { key: 'venue', label: 'Venue' },
  { key: 'catering', label: 'Catering' },
  { key: 'photography', label: 'Photography' },
  { key: 'flowers', label: 'Flowers' },
  { key: 'music', label: 'Music' },
  { key: 'attire', label: 'Attire' },
  { key: 'transportation', label: 'Transport' },
  { key: 'decorations', label: 'Decorations' },
  { key: 'rings', label: 'Rings' },
  { key: 'stationery', label: 'Stationery' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'honeymoon', label: 'Honeymoon' },
  { key: 'miscellaneous', label: 'Miscellaneous' },
];

/** The keys alone, for membership tests. */
export const BUDGET_CATEGORY_KEYS = BUDGET_CATEGORIES.map((c) => c.key);

/** The label the Budget page shows for a key, or the key itself. */
export const budgetCategoryLabel = (key) =>
  BUDGET_CATEGORIES.find((c) => c.key === key)?.label || key;
