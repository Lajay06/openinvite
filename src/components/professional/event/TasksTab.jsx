/**
 * src/components/professional/event/TasksTab.jsx
 *
 * This event's tasks, in months-to-go stages (12, 9, 6, 3, 1, the week of,
 * the day of), with owners. The months-out checklist can be added in one go.
 */
import React from 'react';
import { useProStore, bulk } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import { byStage } from '@/lib/professionalTasks';
import { BUILT_IN, applyTemplate } from '@/lib/professionalTemplates';
import { ProEmpty } from '../ProPage';
import { TaskRow, AddTask } from '../TaskList';
import { s } from '../proTheme';

export default function TasksTab({ event, me, readOnly }) {
  const store = useProStore();
  const tasks = store.ProTask.filter((t) => t.event_id === event.id);
  const editable = !readOnly && can(me, 'tasks.edit', event);
  const members = store.ProMember.filter((m) => m.role !== 'dayof');
  const hasChecklist = tasks.some((t) => t.months_out);
  const addChecklist = () => {
    const rows = applyTemplate(BUILT_IN.find((t) => t.id === 'builtin_checklist'), event).ProTask;
    bulk(({ create: c }) => rows.forEach((r) => c('ProTask', { ...r, is_test: true })));
  };
  const groups = byStage(tasks.slice().sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'))));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {editable && <AddTask events={[event]} defaultEventId={event.id} members={members} />}
      {editable && !hasChecklist && event.event_date && (
        <div style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={s.body}>Add the planning checklist, dated back from {event.couple_names}&apos;s day.</span>
          <button type="button" style={s.btnSecondary} onClick={addChecklist}>Add the checklist</button>
        </div>
      )}
      {groups.length === 0 ? <ProEmpty title="No tasks yet" line="Add a task, or the months-out checklist." /> : groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 style={{ ...s.label, margin: '0 0 6px' }}>{g.label}</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid rgba(10,10,10,0.08)' }}>
            {g.tasks.map((t) => <TaskRow key={t.id} task={t} editable={editable} canTick={!readOnly && can(me, 'tasks.edit', event)} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
