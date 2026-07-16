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
 * The set of pages a collaborator can ever see is COLLABORATOR_PAGE_MAP
 * (collaboratorPageMap.js) — every permission key CollaborateModal.jsx
 * offers, so nothing here can drift out of sync with what the invite form
 * promises.
 */

import { useEffect, useState } from 'react';
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
