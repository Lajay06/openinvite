import { useMemo } from 'react';
import { useApi } from './api';
import useLoad from './useLoad';

/* ── Readers: the same calls the desktop pages make, through the api seam ── */

export function useWedding() {
  const api = useApi();
  return useLoad(() => api.wedding.get(), []);
}

/** Guests with the per-event RSVP overlay, as Guests.jsx loads them. */
export function useGuests() {
  const api = useApi();
  return useLoad(() => api.guests.list(), []);
}

/** To-do tasks are Note records with view_type 'todo', as TodoList.jsx filters them. */
export function useTasks() {
  const api = useApi();
  return useLoad(async () => (await api.list('Note', '-created_date')).filter((n) => n.view_type === 'todo'), []);
}

/** Itemised Budget records plus the saved plan on WeddingDetails, as Budget.jsx loads them. */
export function useBudget() {
  const api = useApi();
  return useLoad(async () => {
    const [items, details] = await Promise.all([api.list('Budget', '-created_date'), api.wedding.get().catch(() => null)]);
    return { items, plan: details?.budget || null };
  }, []);
}

export function useSchedule() {
  const api = useApi();
  return useLoad(() => api.list('Schedule', 'start_time'), []);
}

export function useVendors() {
  const api = useApi();
  return useLoad(() => api.list('Vendor', '-created_date'), []);
}

/* ── Writers: the desktop's own write paths, bound to the api ─────────── */

export function useGuestWrites() {
  const api = useApi();
  return useMemo(() => ({
    create: (fields, details) => api.guests.create(fields, details),
    update: (id, fields) => api.guests.update(id, fields),
    remove: (id) => api.guests.remove(id),
  }), [api]);
}

export function useTaskWrites() {
  const api = useApi();
  return useMemo(() => ({
    /** TodoList.jsx's quick add: title, priority (lowercase), status Ideas, due date. */
    create: ({ title, description, priority = 'medium', due_date, status = 'Ideas' }) =>
      api.create('Note', { title, description: description || undefined, completed: status === 'Done', priority, status, view_type: 'todo', due_date: due_date || undefined }),
    /** TodoList.jsx's list view flips `completed` only; the kanban owns `status`. */
    toggle: (task) => api.update('Note', task.id, { completed: !task.completed }),
    update: (id, fields) => api.update('Note', id, fields),
    /** The kanban's move: status plus completed when it lands in Done. */
    move: (task, status) => api.update('Note', task.id, { status, completed: status === 'Done' }),
    remove: (id) => api.remove('Note', id),
  }), [api]);
}

export function useBudgetWrites() {
  const api = useApi();
  return useMemo(() => ({
    create: (fields) => api.create('Budget', fields),
    update: (id, fields) => api.update('Budget', id, fields),
    remove: (id) => api.remove('Budget', id),
    /** The plan (total and per-category amounts) is AES-encrypted on WeddingDetails.budget, saved as Budget.jsx's planner does. */
    savePlan: (plan) => api.json('/api/my-wedding-details', { method: 'PUT', body: JSON.stringify({ field: 'budget', value: plan }) }),
  }), [api]);
}
