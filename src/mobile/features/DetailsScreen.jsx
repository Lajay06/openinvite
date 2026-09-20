import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import Screen from '../shell/Screen';
import { Row, RowGroup, PillButton, ErrorState, Skeleton, EmptyState } from '../ui';
import { SchemaField, coerce } from './FieldRenderer';
import FormSheet from './FormSheet';

/**
 * A form over WeddingDetails sub-objects, from a DETAILS schema. Fields
 * auto-save 900ms after the last change, as the desktop detail pages do.
 * `onSave(sectionKey, value, encrypted)` is supplied by the container so
 * the preview can swap in a no-op.
 *
 * props: schema, details (the WeddingDetails record), onSave, loading,
 * error, onRetry, back, image (optional hero still)
 */
export default function DetailsScreen({ schema, details, onSave, loading, error, onRetry, back, subtitle }) {
  const [data, setData] = useState(details || {});
  const [status, setStatus] = useState('idle');
  const timer = useRef(null);
  const pending = useRef({});
  const [listSheet, setListSheet] = useState(null); // { section, index }

  useEffect(() => { setData(details || {}); }, [details]);

  // Edits collect per WeddingDetails key and flush together 900ms after the
  // last one: top-level fields as one patch, each sub-object whole.
  const queue = (section, patchOrValue) => {
    const key = section.key;
    setStatus('saving');
    setData((d) => {
      let next;
      if (key == null) next = { ...d, ...patchOrValue };
      else if (section.sub) next = { ...d, [key]: { ...(d[key] || {}), [section.sub]: { ...((d[key] || {})[section.sub] || {}), ...patchOrValue } } };
      else if (section.field) next = { ...d, [key]: { ...(d[key] || {}), [section.field.name]: patchOrValue } };
      else next = { ...d, [key]: { ...(d[key] || {}), ...patchOrValue } };
      if (key == null) pending.current.top = { ...(pending.current.top || {}), ...patchOrValue };
      else pending.current[key] = { whole: next[key], encrypted: !!section.encrypted };
      return next;
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };

  const flush = async () => {
    const jobs = pending.current;
    pending.current = {};
    try {
      if (jobs.top) await onSave(null, jobs.top, false);
      for (const [key, job] of Object.entries(jobs)) {
        if (key === 'top') continue;
        await onSave(key, job.whole, job.encrypted);
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('failed');
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const valueOf = (section, f) => {
    if (section.key == null) return data[f.name];
    const obj = data[section.key] || {};
    return section.sub ? (obj[section.sub] || {})[f.name] : obj[f.name];
  };

  return (
    <Screen title={schema.title} subtitle={status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'failed' ? 'Could not save. Check your connection.' : subtitle} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? (
          <>
            <Skeleton kind="block" />
            <Skeleton kind="block" />
          </>
        ) : (
          schema.sections.map((section) => (
            <section key={section.title}>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{section.title}</h2>
              {section.field ? (
                <ListSection section={section} items={(data[section.key] || {})[section.field.name] || []} onAdd={() => setListSheet({ section, index: -1 })} onEdit={(i) => setListSheet({ section, index: i })} />
              ) : (
                <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {section.fields.map((f) => (
                    <SchemaField key={f.name} field={f} value={valueOf(section, f)} onChange={(val) => queue(section, { [f.name]: coerce(f, val) })} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>
      {listSheet && (
        <FormSheet
          open
          title={listSheet.index < 0 ? `Add ${listSheet.section.field.label.toLowerCase()}` : `Edit ${listSheet.section.field.label.toLowerCase()}`}
          fields={listSheet.section.field.fields}
          initial={listSheet.index < 0 ? null : ((data[listSheet.section.key] || {})[listSheet.section.field.name] || [])[listSheet.index]}
          required={[listSheet.section.field.fields[0].name]}
          onClose={() => setListSheet(null)}
          onSave={async (values) => {
            const list = [...(((data[listSheet.section.key] || {})[listSheet.section.field.name]) || [])];
            if (listSheet.index < 0) list.push(values); else list[listSheet.index] = { ...list[listSheet.index], ...values };
            queue(listSheet.section, list);
          }}
          onDelete={listSheet.index < 0 ? undefined : () => {
            const list = (((data[listSheet.section.key] || {})[listSheet.section.field.name]) || []).filter((_, i) => i !== listSheet.index);
            queue(listSheet.section, list);
            setListSheet(null);
          }}
        />
      )}
    </Screen>
  );
}

function ListSection({ section, items, onAdd, onEdit }) {
  const f = section.field;
  const first = f.fields[0].name;
  const second = f.fields[1]?.name;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length === 0 ? (
        <EmptyState text={`No ${f.label.toLowerCase()}s yet.`} actionLabel={`Add a ${f.label.toLowerCase()}`} onAction={onAdd} />
      ) : (
        <>
          <RowGroup>
            {items.map((it, i) => <Row key={i} label={it[first] || `${f.label} ${i + 1}`} sub={second ? it[second] : ''} onClick={() => onEdit(i)} />)}
          </RowGroup>
          <PillButton variant="secondary" size="sm" icon={Plus} onClick={onAdd} style={{ alignSelf: 'flex-start' }}>Add a {f.label.toLowerCase()}</PillButton>
        </>
      )}
    </div>
  );
}
