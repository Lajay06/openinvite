import { getMyWeddingDetails, getMyRecords, getMyGuestsWithRsvp } from '@/lib/resolveMyWedding';
import { base44 } from '@/api/base44Client';
import { createGuest, updateGuest, deleteGuest } from '@/lib/guestWrites';
import { getWeddingEvents, defaultEventResponses } from '@/lib/weddingEvents';
import useLoad from './useLoad';

/* ── Readers: the same calls the desktop pages make ─────────────────── */

export function useWedding() {
  return useLoad(() => getMyWeddingDetails(), []);
}

/** Guests with the per-event RSVP overlay, as Guests.jsx loads them. */
export function useGuests() {
  return useLoad(() => getMyGuestsWithRsvp('created_date'), []);
}

/** To-do tasks are Note records with view_type 'todo', as TodoList.jsx filters them. */
export function useTasks() {
  return useLoad(async () => {
    const all = await getMyRecords('Note', '-created_date');
    return all.filter((n) => n.view_type === 'todo');
  }, []);
}

/** Itemised Budget records plus the saved plan on WeddingDetails, as Budget.jsx loads them. */
export function useBudget() {
  return useLoad(async () => {
    const [items, details] = await Promise.all([
      getMyRecords('Budget', '-created_date'),
      getMyWeddingDetails().catch(() => null),
    ]);
    return { items, plan: details?.budget || null };
  }, []);
}

export function useSchedule() {
  return useLoad(() => getMyRecords('Schedule', 'start_time'), []);
}

export function useVendors() {
  return useLoad(() => getMyRecords('Vendor', '-created_date'), []);
}

/* ── Writers: the desktop's own write paths, unchanged ──────────────── */

const Note = base44.entities.Note;
const Budget = base44.entities.Budget;

export const guestWrites = {
  /** New guests default to invited for the main events, as Guests.jsx's handleSubmit does. */
  create: (fields, weddingDetails) => {
    const events = getWeddingEvents(weddingDetails);
    return createGuest(fields.event_responses ? fields : { ...fields, event_responses: defaultEventResponses(events) });
  },
  update: (id, fields) => updateGuest(id, fields),
  remove: (id) => deleteGuest(id),
};

export const taskWrites = {
  create: ({ title, priority = 'Medium', due_date }) =>
    Note.create({ title, completed: false, priority, status: 'Ideas', view_type: 'todo', due_date: due_date || undefined }),
  /** TodoList.jsx's list view flips `completed` only; the kanban owns `status`. */
  toggle: (task) => Note.update(task.id, { completed: !task.completed }),
  remove: (id) => Note.delete(id),
};

export const budgetWrites = {
  create: (fields) => Budget.create(fields),
  update: (id, fields) => Budget.update(id, fields),
  remove: (id) => Budget.delete(id),
};
