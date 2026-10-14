/**
 * src/pages/professional/TasksPage.jsx
 *
 * TASKS ACROSS EVERY EVENT, opening on "My tasks this week".
 */
import React, { useState } from 'react';
import { useProStore, CURRENT } from '@/lib/professionalStore';
import { can, visibleEvents } from '@/lib/professionalAccess';
import { filterTasks, TASK_FILTERS } from '@/lib/professionalTasks';
import { FilterPill } from '@/components/shared/TableToolbar';
import { ProPage, ProEmpty } from '@/components/professional/ProPage';
import { TaskRow, AddTask } from '@/components/professional/TaskList';
import { downloadCsv } from '@/components/professional/proExport';
import { s } from '@/components/professional/proTheme';

export default function TasksPage() {
  const store = useProStore();
  const me = store.ProMember.find((m) => m.id === CURRENT.memberId);
  const events = visibleEvents(me, store.ProEvent).filter((e) => can(me, 'tasks.view', e));
  const ids = new Set(events.map((e) => e.id));
  const tasks = store.ProTask.filter((t) => (t.event_id ? ids.has(t.event_id) : t.owner_id === me?.id || me?.role === 'owner'));
  const [who, setWho] = useState('me');
  const [filter, setFilter] = useState('week');
  const [adding, setAdding] = useState(false);
  const list = filterTasks(tasks, filter, { ownerId: who === 'me' ? me?.id : null });
  const editableFor = (t) => (t.event_id ? can(me, 'tasks.edit', events.find((e) => e.id === t.event_id)) : true);
  const members = store.ProMember.filter((m) => m.role !== 'dayof');
  const nameOf = (id) => store.ProMember.find((m) => m.id === id)?.name || '';
  const csv = () => downloadCsv('tasks.csv', ['Task', 'Event', 'Owner', 'Due', 'Done'], list.map((t) => [t.title, events.find((e) => e.id === t.event_id)?.couple_names || '', nameOf(t.owner_id), t.due_date || '', t.done ? 'Yes' : 'No']));

  return (
    <ProPage
      title={who === 'me' && filter === 'week' ? 'My tasks this week' : 'Tasks'}
      subtitle={`${list.length} shown`}
      actions={(
        <>
          <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
          <button type="button" style={s.btnPrimary} onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : 'Add a task'}</button>
        </>
      )}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <FilterPill label="Mine" active={who === 'me'} onClick={() => setWho('me')} />
        <FilterPill label="Everyone" active={who === 'all'} onClick={() => setWho('all')} />
        <span style={{ width: 12 }} />
        {TASK_FILTERS.map((f) => <FilterPill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />)}
      </div>
      {adding && <div style={{ marginBottom: 12 }}><AddTask events={events.filter((e) => can(me, 'tasks.edit', e))} members={members} /></div>}
      {list.length === 0 ? (
        <ProEmpty title={filter === 'week' ? 'Nothing due this week' : 'No tasks here'} line="Tasks from every event you run land here with their owners and dates." />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid rgba(10,10,10,0.08)' }}>
          {list.map((t) => <TaskRow key={t.id} task={t} showEvent editable={editableFor(t)} canTick={editableFor(t)} />)}
        </ul>
      )}
    </ProPage>
  );
}
