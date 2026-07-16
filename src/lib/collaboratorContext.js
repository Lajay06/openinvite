/**
 * src/lib/collaboratorContext.js
 *
 * Client-side collaboration state for the real dashboard shell. A
 * collaborator session is identified by a `?collabOwner=<ownerUserId>`
 * query param (added to the URL once, at accept time or via the exit/re-
 * entry link) — every dashboard page and Layout.jsx itself read it from
 * here rather than each re-deriving it, so the "who am I collaborating
 * with, and with what permissions" question has exactly one source.
 *
 * This is UI convenience only. Server-side enforcement lives entirely in
 * api/collaborator-*.js (CollaboratorGrant, see api/_lib/collaboratorAuth.js)
 * — a page hidden here because permissions say "no" is still checked again,
 * for real, the moment any data actually gets fetched.
 *
 * COLLABORATOR_SUPPORTED_PAGES is deliberately small and must only ever
 * list pages that have a real, working api/collaborator-*.js endpoint
 * behind them. Listing a page here without one would let a collaborator
 * see it in the sidebar / land on it directly with nothing enforcing
 * access at all — worse than not building the feature.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const COLLABORATOR_SUPPORTED_PAGES = ['Guests', 'Budget'];

export function hasPagePermission(permissions, page, level) {
  const p = permissions?.[page];
  if (!p) return false;
  return level === 'edit' ? !!p.edit : !!(p.view || p.edit);
}

const EMPTY = { permissions: {}, coupleNames: '', collaboratorEmail: '' };

/**
 * @returns {{
 *   ownerUserId: string|null,     // null when not in a collaboration at all
 *   loading: boolean,
 *   ok: boolean,                  // true once resolved AND the caller is a real accepted collaborator
 *   permissions: object,
 *   coupleNames: string,
 *   collaboratorEmail: string,
 * }}
 */
export function useCollaboratorContext() {
  const [searchParams] = useSearchParams();
  const ownerUserId = searchParams.get('collabOwner');
  const [state, setState] = useState({ loading: !!ownerUserId, ok: false, ...EMPTY });

  useEffect(() => {
    if (!ownerUserId) {
      setState({ loading: false, ok: false, ...EMPTY });
      return;
    }
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));
    (async () => {
      try {
        const res = await fetch(`/api/collaborator-context?ownerUserId=${encodeURIComponent(ownerUserId)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (cancelled) return;
        if (!res.ok) { setState({ loading: false, ok: false, ...EMPTY }); return; }
        const data = await res.json();
        setState({
          loading: false, ok: true,
          permissions: data.permissions || {},
          coupleNames: data.coupleNames || '',
          collaboratorEmail: data.collaboratorEmail || '',
        });
      } catch {
        if (!cancelled) setState({ loading: false, ok: false, ...EMPTY });
      }
    })();
    return () => { cancelled = true; };
  }, [ownerUserId]);

  return { ownerUserId, ...state };
}
