/**
 * src/lib/collaboratorContext.jsx
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
 * The set of pages a collaborator can ever see is COLLABORATOR_PAGE_MAP
 * (collaboratorPageMap.js) — every permission key CollaborateModal.jsx
 * offers, so nothing here can drift out of sync with what the invite form
 * promises.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COLLABORATOR_PAGE_MAP, COLLABORATOR_PERMISSION_KEYS } from './collaboratorPageMap';

export { COLLABORATOR_PAGE_MAP, COLLABORATOR_PERMISSION_KEYS };

/** React Router currentPageName -> the permission key that gates it (they differ for "Event Details" / "EventDetails"). */
const PAGE_NAME_TO_PERMISSION_KEY = Object.fromEntries(
  COLLABORATOR_PERMISSION_KEYS.map(key => [COLLABORATOR_PAGE_MAP[key].pageName, key])
);

export function permissionKeyForPageName(pageName) {
  return PAGE_NAME_TO_PERMISSION_KEY[pageName] || null;
}

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
function useCollaboratorContextFetch() {
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

// AUDIT_2026-07.md S5: every dashboard page called useCollaboratorContext()
// independently, so each one fired its own /api/collaborator-context
// request on mount — Layout.jsx plus whichever page was current meant 2
// identical requests per navigation. CollaboratorProvider fetches once
// (mounted here, in Layout.jsx) and every consumer reads the same value
// from context instead of re-fetching.
const CollaboratorContext = createContext(null);

export function CollaboratorProvider({ children }) {
  const value = useCollaboratorContextFetch();
  return <CollaboratorContext.Provider value={value}>{children}</CollaboratorContext.Provider>;
}

export function useCollaboratorContext() {
  const ctx = useContext(CollaboratorContext);
  if (ctx) return ctx;
  // Defensive fallback for any caller rendered outside CollaboratorProvider
  // (none currently — every consumer is a dashboard page mounted inside
  // Layout.jsx's provider).
  return { ownerUserId: null, loading: false, ok: false, ...EMPTY };
}
