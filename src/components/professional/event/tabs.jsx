/**
 * src/components/professional/event/tabs.jsx
 *
 * The event's tabs, in order, each with the area a member needs to see it.
 */
import { lazyWithReload } from '@/lib/lazyWithReload.js';
import EventOverview from './EventOverview';

const lazy = (fn) => lazyWithReload(fn);

export const EVENT_TABS = [
  { key: 'overview', label: 'Overview', area: 'event.view', Component: EventOverview },
  { key: 'run-sheet', label: 'Run sheet', area: 'runsheet.view', Component: lazy(() => import('./RunSheetTab')) },
  { key: 'guests', label: 'Guests', area: 'guests.view', Component: lazy(() => import('./GuestsTab')) },
  { key: 'vendors', label: 'Vendors', area: 'vendors.view', Component: lazy(() => import('./VendorsTab')) },
  { key: 'payments', label: 'Payments', area: 'money.view', Component: lazy(() => import('./PaymentsTab')) },
  { key: 'budget', label: 'Budget', area: 'money.view', Component: lazy(() => import('./BudgetTab')) },
  { key: 'tasks', label: 'Tasks', area: 'tasks.view', Component: lazy(() => import('./TasksTab')) },
  { key: 'forms', label: 'Questionnaires', area: 'questionnaires.edit', Component: lazy(() => import('./QuestionnairesTab')) },
  { key: 'documents', label: 'Documents', area: 'documents.view', Component: lazy(() => import('./DocumentsTab')) },
  { key: 'notes', label: 'Notes', area: 'notes.view', Component: lazy(() => import('./NotesTab')) },
];
