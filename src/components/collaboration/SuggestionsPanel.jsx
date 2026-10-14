import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { suggestionsRequest } from '@/lib/collaboratorContext';

/**
 * THE COUPLE'S SUGGESTIONS PANEL (owner ruling 2026-10-14, suggest and approve).
 *
 * Shows the pending suggestions collaborators made for this page, each with
 * Approve and Decline. Approve creates the item with the couple's own token
 * (the page's `createItem`, which returns the new item's id), and only then
 * tells the server, which checks the item exists and is the couple's before it
 * records the approval. Decline records the couple's decision and nothing
 * else. Renders nothing while there are none, and nothing in a collaborator
 * session (the page decides that by not mounting it).
 */

const PJS = "'Plus Jakarta Sans', sans-serif";
export const SUGGESTIONS_HEADING = 'Suggestions from your collaborators';
export const SAVE_FAILED = 'That did not save. Try again.';

export default function SuggestionsPanel({ page, createItem, renderSummary, onApproved }) {
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const { suggestions: list } = await suggestionsRequest({ page });
      setSuggestions(Array.isArray(list) ? list : []);
    } catch {
      setSuggestions([]);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const decide = async (s, decision) => {
    setBusy(s.id);
    try {
      let itemId;
      if (decision === 'approve') itemId = await createItem(s.data);
      await suggestionsRequest({ method: 'POST', page, body: { action: 'decide', suggestionId: s.id, decision, ...(itemId ? { itemId } : {}) } });
      toast.success(decision === 'approve' ? 'Added.' : 'Declined.');
      if (decision === 'approve' && onApproved) onApproved();
      await load();
    } catch {
      toast.error(SAVE_FAILED);
    }
    setBusy(null);
  };

  if (!suggestions.length) return null;

  return (
    <section data-suggestions-panel style={{ border: '1px solid rgba(10,10,10,0.12)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#FFFFFF' }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
        {SUGGESTIONS_HEADING} <span style={{ color: 'rgba(10,10,10,0.6)', fontWeight: 600 }}>({suggestions.length})</span>
      </h2>
      {suggestions.map(s => (
        <div key={s.id} data-suggestion style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' }}>
            {renderSummary(s.data)}
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, flexShrink: 0 }}>From {s.from}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-editorial-secondary" style={{ fontSize: 12 }} disabled={busy === s.id} onClick={() => decide(s, 'decline')}>Decline</button>
            <button type="button" className="btn-primary" style={{ fontSize: 12 }} disabled={busy === s.id} onClick={() => decide(s, 'approve')}>Approve</button>
          </div>
        </div>
      ))}
    </section>
  );
}
