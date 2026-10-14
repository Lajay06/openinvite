import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { suggestionsRequest } from '@/lib/collaboratorContext';

/**
 * A COLLABORATOR'S OWN SUGGESTIONS (owner ruling 2026-10-14, suggest and approve).
 *
 * The suggestions this collaborator made for this page, with where each stands.
 * While one is waiting, they can edit it (the page opens its form with
 * `onEdit`) or withdraw it. Once the couple decides, it is theirs and only
 * its status shows. Renders nothing until there is at least one.
 *
 * `reloadKey` lets the page refresh the list after a new suggestion is sent.
 */

const PJS = "'Plus Jakarta Sans', sans-serif";
export const MY_SUGGESTIONS_HEADING = 'Your suggestions';
export const STATUS_LABEL = { pending: (couple) => `Waiting for ${couple || 'the couple'}`, approved: () => 'Added', declined: () => 'Not added' };
export const SAVE_FAILED = 'That did not save. Try again.';

export default function MySuggestions({ ownerUserId, page, coupleNames, renderSummary, onEdit, reloadKey }) {
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const { suggestions: list } = await suggestionsRequest({ page, ownerUserId });
      setSuggestions(Array.isArray(list) ? list : []);
    } catch {
      setSuggestions([]);
    }
  }, [page, ownerUserId]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const withdraw = async (s) => {
    setBusy(s.id);
    try {
      await suggestionsRequest({ method: 'POST', page, ownerUserId, body: { action: 'withdraw', suggestionId: s.id } });
      toast.success('Withdrawn.');
      await load();
    } catch {
      toast.error(SAVE_FAILED);
    }
    setBusy(null);
  };

  if (!suggestions.length) return null;

  return (
    <section data-my-suggestions style={{ border: '1px solid rgba(10,10,10,0.12)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#FFFFFF' }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{MY_SUGGESTIONS_HEADING}</h2>
      {suggestions.map(s => (
        <div key={s.id} data-suggestion style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' }}>
            {renderSummary(s.data)}
            <p data-status={s.status} style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, flexShrink: 0 }}>{STATUS_LABEL[s.status]?.(coupleNames) || ''}</p>
          </div>
          {s.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-editorial-secondary" style={{ fontSize: 12 }} disabled={busy === s.id} onClick={() => withdraw(s)}>Withdraw</button>
              <button type="button" className="btn-editorial-secondary" style={{ fontSize: 12 }} disabled={busy === s.id} onClick={() => onEdit(s)}>Edit</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
