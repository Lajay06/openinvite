/**
 * tests/persistence/todo-list-schema.mjs
 *
 * Covers the AUDIT_2026-07.md / schema-drift-guard triage: `Note.status`
 * and `Note.view_type` were written by TodoList.jsx's kanban board (create
 * on line 51/79, update on line 89) but absent from the live Note schema —
 * a real dropped-field bug (written AND read: TodoList.jsx:40 filters on
 * view_type, :104 filters on status), not a stale test. Restored via
 * update_entity_schema; this is the real write/read round-trip proving it.
 *
 * Note has no is_test field (confirmed via list_entity_schemas) — cleanup
 * relies on a distinctive title prefix + explicit delete in `finally`,
 * same convention as onboarding.mjs's draft-record test.
 */
import { APP_ID, api, pass, fail, cleanupEntity } from './_shared.mjs';

export async function runTodoListSchema(token) {
  const results = [];

  console.log('\n  To-do board — Note.status/view_type persist (live round-trip):\n');

  let noteId = null;
  try {
    const created = await api('POST', `/apps/${APP_ID}/entities/Note`, {
      title: '__PERSISTENCE_TEST_TODO_NOTE__',
      priority: 'Medium',
      status: 'Ideas',
      view_type: 'todo',
    }, token);
    noteId = created.id;

    const back = await api('GET', `/apps/${APP_ID}/entities/Note/${noteId}`, undefined, token);
    results.push(back.status === 'Ideas'
      ? pass('Note.status persists on create', back.status)
      : fail('Note.status persists on create', 'Ideas', back.status));
    results.push(back.view_type === 'todo'
      ? pass('Note.view_type persists on create', back.view_type)
      : fail('Note.view_type persists on create', 'todo', back.view_type));

    // Column drag — exactly what handleDragEnd (TodoList.jsx:89) writes.
    const updated = await api('PUT', `/apps/${APP_ID}/entities/Note/${noteId}`, { status: 'In progress' }, token);
    results.push(updated.status === 'In progress'
      ? pass('Note.status survives a column-move update', updated.status)
      : fail('Note.status survives a column-move update', 'In progress', updated.status));
  } catch (err) {
    console.log(`  ❌ FAIL  Note.status/view_type round-trip — error: ${err.message}`);
    results.push(false, false, false);
  } finally {
    if (noteId) await cleanupEntity(token, 'Note', noteId);
  }

  return results;
}
