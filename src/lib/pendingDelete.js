/**
 * src/lib/pendingDelete.js
 *
 * DELETE NOW, SEND LATER, UNDO IN BETWEEN.
 *
 * C5 from the essentials sweep. Deleting a guest went through
 * window.confirm("Delete this guest?") and then straight to the server, so the
 * only protection was a modal nobody reads and the only recovery was typing
 * the person back in: name, email, table, dietary notes, every per-event chip.
 *
 * ── WHY THE CONFIRM GOES AND AN UNDO ARRIVES ───────────────────────────────
 *
 * A confirm asks before anything happens, which is the wrong moment: the
 * couple is sure, they click, and the dialog is noise they dismiss by reflex
 * on the one occasion they were wrong. An undo asks nothing and is there
 * afterwards, when they can see what they did. The row leaves the list at once
 * so the page tells the truth, and the WRITE waits.
 *
 * ── THE WRITE IS SENT WHEN THE WINDOW CLOSES, NOT WHEN THE CLICK HAPPENS ───
 *
 * Thirty seconds, then the delete goes. Leaving the page commits early rather
 * than cancelling, because a row the couple deleted and walked away from is
 * deleted; the undo was offered and declined by inaction.
 *
 * NOTHING IS WRITTEN BY AN UNDO. That is the point of waiting: the row never
 * left the database, so restoring it is a local matter and cannot fail
 * halfway. A design that deleted immediately and re-created on undo would have
 * given the guest a new id, and every Table.assigned_guests entry, every
 * RsvpResponse guest_id_hash and every per-event row still pointing at the old
 * one would have been orphaned by the recovery.
 *
 * ── THE LIMIT, STATED ──────────────────────────────────────────────────────
 *
 * A commit triggered by the page unloading is best-effort: a browser may kill
 * an in-flight request on pagehide, and there is no way to make a fetch
 * reliable at that moment without a Beacon endpoint, which this product does
 * not have. The failure mode is the kind one wants: the delete does not
 * happen, the guest is still there, and the couple deletes again. Nothing is
 * lost and nothing is half-done.
 *
 * Pure and injectable so a guard can drive the clock instead of waiting on it.
 */

/** Thirty seconds, as the goal specifies. */
export const UNDO_WINDOW_MS = 30000;

/**
 * A controller holding the deletes that have happened on screen and not yet on
 * the server.
 *
 * @param {object} deps
 * @param {(id:string)=>Promise<any>} deps.commit    the real delete
 * @param {(fn:Function,ms:number)=>any} [deps.setTimer]
 * @param {(h:any)=>void} [deps.clearTimer]
 * @param {number} [deps.windowMs]
 */
export function createPendingDeletes({ commit, setTimer = setTimeout, clearTimer = clearTimeout,
                                       windowMs = UNDO_WINDOW_MS } = {}) {
  /** id -> { guest, handle } */
  const pending = new Map();

  /**
   * Take a guest off the list and start their clock.
   * @returns {string} the id, so a caller can label its toast
   */
  function schedule(guest, onCommitted) {
    const id = guest?.id;
    if (!id || pending.has(id)) return id;
    const handle = setTimer(() => { void commitOne(id, onCommitted); }, windowMs);
    pending.set(id, { guest, handle });
    return id;
  }

  /** The clock ran out, or the window is closing. */
  async function commitOne(id, onCommitted) {
    const entry = pending.get(id);
    if (!entry) return false;
    clearTimer(entry.handle);
    pending.delete(id);
    try {
      await commit(id);
      if (onCommitted) onCommitted(id, null);
      return true;
    } catch (err) {
      // THE ROW COMES BACK ON A FAILED COMMIT. The alternative is a list that
      // says the guest is gone and a database that says they are not, which the
      // couple discovers on the next reload.
      if (onCommitted) onCommitted(id, err);
      return false;
    }
  }

  /** Put the guest back. Writes nothing. */
  function undo(id) {
    const entry = pending.get(id);
    if (!entry) return null;
    clearTimer(entry.handle);
    pending.delete(id);
    return entry.guest;
  }

  /** Everything still waiting, oldest first. Used when the page is leaving. */
  function flush(onCommitted) {
    return Promise.all([...pending.keys()].map((id) => commitOne(id, onCommitted)));
  }

  const has = (id) => pending.has(id);
  const size = () => pending.size;
  const ids = () => [...pending.keys()];
  const guestFor = (id) => pending.get(id)?.guest ?? null;

  return { schedule, undo, flush, commitOne, has, size, ids, guestFor };
}
