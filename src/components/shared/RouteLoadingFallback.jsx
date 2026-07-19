import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Suspense fallback shown while a lazy-loaded route chunk downloads.
 * Deliberately minimal — a route transition is usually near-instant on a
 * warm connection, so this only becomes visible on a slow network. No
 * branding/copy, just a centered spinner so it never competes with the
 * page it's about to be replaced by.
 */
export default function RouteLoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFFFFF',
    }}>
      <Loader2 size={22} style={{ color: 'rgba(10,10,10,0.3)', animation: 'oi-route-spin 0.8s linear infinite' }} />
      <style>{'@keyframes oi-route-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
