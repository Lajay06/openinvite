import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Ava Studio's "take me there" routing lands a couple on a dashboard page
 * with `?ava_focus=<key>` in the URL. This hook finds the matching
 * `data-ava-focus="<key>"` element already on the page, scrolls it into
 * view, and pulses its border for a few seconds so the couple's eye goes
 * straight to the next action Ava recommended — instead of landing on a
 * page and having to hunt for what to do.
 *
 * Call once per page, after any tab/section state that gates which
 * data-ava-focus elements are actually mounted has settled.
 */
export function useAvaFocus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusKey = searchParams.get('ava_focus');

  useEffect(() => {
    if (!focusKey) return;

    let pulseTimer;
    let cancelled = false;

    const clear = (el) => {
      clearTimeout(pulseTimer);
      el.classList.remove('ava-focus-pulse');
      const next = new URLSearchParams(searchParams);
      next.delete('ava_focus');
      setSearchParams(next, { replace: true });
    };

    // Several target pages fetch their data after mount (a loading spinner
    // replaces the whole tree until then), so the data-ava-focus element
    // often doesn't exist yet on the render this effect fires for. Poll
    // briefly with a MutationObserver instead of a single one-shot query.
    const tryFocus = () => {
      const el = document.querySelector(`[data-ava-focus="${focusKey}"]`);
      if (!el) return false;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ava-focus-pulse');
      pulseTimer = setTimeout(() => clear(el), 3000);
      return true;
    };

    if (tryFocus()) return () => clearTimeout(pulseTimer);

    const observer = new MutationObserver(() => {
      if (cancelled) return;
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const giveUp = setTimeout(() => observer.disconnect(), 5000);

    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(giveUp);
      clearTimeout(pulseTimer);
    };
  }, [focusKey]);

  return focusKey;
}
