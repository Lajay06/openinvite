import { useEffect, useRef } from 'react';

/**
 * Open one item's sheet when the screen is reached with its id in the URL
 * (global search's "a task opens the task detail sheet", goal 7). The
 * list loads after the screen mounts, so this waits for the item to be in
 * `items` and opens it once; closing the sheet does not reopen it.
 */
export function useOpenById(items, id, open) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !id || !items?.length) return;
    const it = items.find((x) => x.id === id);
    if (it) { done.current = true; open(it); }
  }, [items, id, open]);
}
