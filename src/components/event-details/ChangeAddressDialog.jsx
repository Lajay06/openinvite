import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { canonicalSlug } from '@/lib/weddingAddress';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * CHANGING THE ADDRESS IS A DELIBERATE ACT, NOT A FIELD EDIT.
 *
 * Owner ruling, Run 4 S8b. The address used to be frozen the moment an
 * invitation was shared (api/claim-slug.js:167) because a link in someone's
 * inbox could not survive it moving. The alias and the 301 replace that
 * protection, so the address CAN move now — which makes the ceremony around it
 * the only thing standing between a couple and a changed URL on a printed card.
 *
 * TYPED TWICE, on purpose. The same weight as a destructive action, because
 * that is what it is from the outside: every card, every forwarded message and
 * every screenshot of the old address now depends on a redirect rather than on
 * the address itself.
 *
 * The warning states the actual guarantee, not a reassurance: the old address
 * keeps working. If that ever stops being true this copy is a lie, which is
 * why it names the old address rather than saying "your old links".
 */
export default function ChangeAddressDialog({ weddingId, currentSlug, onClose, onChanged }) {
  const [wanted, setWanted] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const cleaned = canonicalSlug(wanted);
  const matches = cleaned && canonicalSlug(confirm) === cleaned;
  const sameAsNow = cleaned && cleaned === canonicalSlug(currentSlug);
  const ready = !!cleaned && matches && !sameAsNow && !saving;

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('base44_access_token');
      const res = await fetch('/api/change-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weddingId, newSlug: cleaned }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // EVERY REFUSAL SAYS WHICH ONE. "Something went wrong" on an address
        // change leaves a couple retyping the same taken address forever.
        const said = {
          taken: 'That address belongs to another wedding — or redirects to one. Try another.',
          reserved: 'That address is reserved. Try another.',
          'not-an-address': 'That is not an address. Letters, numbers and hyphens.',
          forbidden: 'That is not your wedding to rename.',
        }[body?.error] || 'The address could not be changed. Nothing was saved.';
        toast.error(said);
        setSaving(false);
        return;
      }
      if (body.unchanged) { toast('That is already your address.'); setSaving(false); return; }
      // THE CLIENT WRITES, with its own token, so the update meets the record's
      // owner-scoped RLS rather than riding the admin key. See the endpoint.
      await onChanged({ slug: body.slug, previousSlugs: body.previousSlugs });
      toast.success(`Your address is now openinvite.com.au/w/${body.slug}`);
      onClose();
    } catch {
      toast.error('The address could not be changed. Nothing was saved.');
      setSaving(false);
    }
  };

  const field = {
    width: '100%', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 6,
    padding: '9px 10px', fontSize: 13, fontFamily: PJS, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent title="Change your wedding address" className="max-w-[460px] p-7">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
          Change your wedding address?
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, lineHeight: 1.6, margin: '0 0 6px' }}>
          Guests who have the old link will be redirected automatically —{' '}
          <span style={{ color: '#0A0A0A', fontWeight: 600 }}>openinvite.com.au/w/{currentSlug}</span>{' '}
          will keep working.
        </p>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, lineHeight: 1.6, margin: '0 0 18px' }}>
          Invitation links you have already sent are unaffected either way — they do not use this address.
        </p>

        <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 6 }}>
          New address
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, whiteSpace: 'nowrap' }}>openinvite.com.au/w/</span>
          <input autoFocus value={wanted} onChange={e => setWanted(e.target.value)} placeholder="jay-ella" style={field} data-new-address />
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, display: 'block', marginBottom: 6 }}>
          Type it again to confirm
        </label>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="jay-ella" style={{ ...field, marginBottom: 6 }} data-confirm-address />

        {/* The three ways this is not ready, each said plainly rather than by a
            greyed-out button with no explanation. */}
        {cleaned && sameAsNow && (
          <p data-address-note style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 6px' }}>That is already your address.</p>
        )}
        {cleaned && !sameAsNow && confirm && !matches && (
          <p data-address-note style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: '0 0 6px' }}>The two do not match yet.</p>
        )}
        {wanted && !cleaned && (
          <p data-address-note style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: '0 0 6px' }}>Letters, numbers and hyphens.</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={submit} disabled={!ready} className="btn-primary"
            style={{ fontSize: 13, opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Changing…' : 'Change address'}
          </button>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
