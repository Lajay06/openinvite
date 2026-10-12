/**
 * tests/persistence/gift-schema-mirror.mjs
 *
 * THE REPO'S PlanGift AND GiftDraft ARE THE ONES THE OWNER ADDED IN BASE44.
 * goals/2026-10-11-gifting-v2.md, item 5 (HELD): the mirror of the schema
 * the owner pastes into Base44 chat. Base44 silently drops a field it does
 * not know, so the code that writes these (items 4, 6, 7, 8) is only as good
 * as this list.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const entity = (name) => JSON.parse(readFileSync(resolve(ROOT, `base44/entities/${name}.jsonc`), 'utf8'));

const PLAN_GIFT_V2 = {
  recipient_names_enc: { type: 'string' },
  headline_key: { type: 'string', enum: ['nice_start', 'for_you', 'enjoy_this', 'spreadsheet', 'sorted'] },
  photo_key: { type: 'string' },
  note_style: { type: 'string', enum: ['plain', 'serif', 'hand'] },
  send_at: { type: 'string', format: 'date-time' },
  sent_at: { type: 'string', format: 'date-time' },
  claim_token_hash: { type: 'string' },
  claimed_at: { type: 'string', format: 'date-time' },
  claimed_user_id_hash: { type: 'string' },
  edit_token_hash: { type: 'string' },
  version: { type: 'integer' },
};

export function runGiftSchemaMirror() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Gifting v2 item 5, the schema mirror:\n');

  const pg = entity('PlanGift');
  for (const [field, want] of Object.entries(PLAN_GIFT_V2)) {
    const got = pg.properties[field];
    check(`PlanGift.${field}: ${want.type}${want.format ? ` (${want.format})` : ''}${want.enum ? `, ${want.enum.join('/')}` : ''}`,
      !!got && got.type === want.type && got.format === want.format && JSON.stringify(got.enum) === JSON.stringify(want.enum));
  }
  check('PlanGift: none of the v2 fields is required', Object.keys(PLAN_GIFT_V2).every((f) => !pg.required.includes(f)));
  check('PlanGift: the promotion code fields are optional, since v2 mints none',
    ['promotion_code_id', 'promotion_code_display', 'coupon_id'].every((f) => pg.properties[f] && !pg.required.includes(f)));
  check('PlanGift: still requires the session, the plan and the recipient',
    JSON.stringify(pg.required) === JSON.stringify(['stripe_session_id', 'plan', 'recipient_email_enc']), JSON.stringify(pg.required));
  check('PlanGift: RLS unchanged, all open (the server reads and writes it through the admin key)',
    ['create', 'read', 'update', 'delete'].every((op) => pg.rls[op] === null));

  const gd = entity('GiftDraft');
  check('GiftDraft: the draft as ciphertext, its expiry, an optional buyer hash, is_test',
    gd.properties.draft_enc?.type === 'string' && gd.properties.expires_at?.format === 'date-time'
      && gd.properties.buyer_user_id_hash?.type === 'string' && gd.properties.is_test?.type === 'boolean'
      && Object.keys(gd.properties).length === 4);
  check('GiftDraft: requires the draft and its expiry, nothing else', JSON.stringify(gd.required) === JSON.stringify(['draft_enc', 'expires_at']));
  check('GiftDraft: create and read open, update and delete creator only (item 0 ruling)',
    gd.rls.create === null && gd.rls.read === null
      && gd.rls.update?.created_by_id === '{{user.id}}' && gd.rls.delete?.created_by_id === '{{user.id}}');
  check('GiftDraft: hashes and ciphertext only, no plain personal field',
    !Object.keys(gd.properties).some((f) => /email|name|note/.test(f) && !/_enc$|_hash$/.test(f)));
  return r;
}
