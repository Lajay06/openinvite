import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * /collaborate/guests?owner=<id> — the original, bespoke collaborator page.
 * Collaborators now land in the real dashboard shell (Layout.jsx, permission-
 * filtered sidebar, the actual Guests page rendered read-only) instead of
 * this standalone one, so this route just forwards any old link straight
 * into that experience — same owner id, new query param name.
 */
export default function CollaboratorGuestsRedirect() {
  const [searchParams] = useSearchParams();
  const ownerUserId = searchParams.get('owner');

  useEffect(() => {
    const target = ownerUserId
      ? `${createPageUrl('Guests')}?collabOwner=${encodeURIComponent(ownerUserId)}`
      : createPageUrl('Dashboard');
    window.location.replace(target);
  }, [ownerUserId]);

  return null;
}
