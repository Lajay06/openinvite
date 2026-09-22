import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import Screen from '../shell/Screen';
import { Row, RowGroup, PillButton, ErrorState, Skeleton, EmptyState, SmartImage, PanelCard } from '../ui';
import Segments, { useSegment } from '../ui/Segments';
import { SchemaField, coerce, fieldVisible } from './FieldRenderer';
import FormSheet from './FormSheet';
import { canAccessUltra } from '@/lib/trialStatus';
import { useEntity } from '../data/plan';
import { VENDOR_STATUS_LABEL, VENDOR_STATUS_TONE } from '../lib/format';
import { StatusPill } from '../ui';
import { useConsiderations } from './ConsiderationsSheet';

/**
 * A form over WeddingDetails sub-objects, from a DETAILS schema. Fields
 * auto-save 900ms after the last change, as the desktop detail pages do.
 * `onSave(sectionKey, value, encrypted)` is supplied by the container so
 * the preview can swap in a no-op.
 *
 * A schema names `segments` (the desktop page's tabs) and each section
 * names its `segment`. A section is either `fields` (a card of inputs) or
 * a `list` (rows with an add and edit sheet). Where the values live:
 *   key null            top-level fields, or a top-level list (list.name)
 *   key                 details[key], the sub-object the desktop page saves whole
 *   key + sub           details[key][sub]
 *   key + list.self     details[key] IS the list (dayVendorContacts)
 * `encrypted` keys save through the encrypted PUT. `ultra: true` on a
 * section shows the desktop's gate card unless the plan allows it.
 *
 * props: schema, details, onSave, loading, error, onRetry, back, user
 */
export default function DetailsScreen({ schema, details, onSave, loading, error, onRetry, back, subtitle, user, onOpenVendors, notice }) {
  // The desktop's Considerations tab, on the pages that have one (schema.considerations names PageConsiderations' key).
  const considerations = useConsiderations(schema.considerations || 'none');
  const [data, setData] = useState(details || {});
  const [status, setStatus] = useState('idle');
  const timer = useRef(null);
  const pending = useRef({});
  const [listSheet, setListSheet] = useState(null); // { section, index }
  const segments = schema.segments || null;
  const [segment, setSegment] = useSegment(segments || [{ key: 'all', label: 'All' }]);
  const ultra = useMemo(() => (user ? canAccessUltra(user) : false), [user]);

  useEffect(() => { setData(details || {}); }, [details]);

  const listOf = (section, d) => {
    const l = section.list;
    if (section.key == null) return d[l.name] || [];
    const obj = d[section.key] || {};
    if (l.self) return Array.isArray(d[section.key]) ? d[section.key] : [];
    if (section.sub) return (obj[section.sub] || {})[l.name] || [];
    return obj[l.name] || [];
  };
  const withList = (section, d, list) => {
    const l = section.list;
    if (section.key == null) return { ...d, [l.name]: list };
    if (l.self) return { ...d, [section.key]: list };
    const obj = d[section.key] || {};
    if (section.sub) return { ...d, [section.key]: { ...obj, [section.sub]: { ...(obj[section.sub] || {}), [l.name]: list } } };
    return { ...d, [section.key]: { ...obj, [l.name]: list } };
  };
  const withPatch = (section, d, patch) => {
    if (section.key == null) return { ...d, ...patch };
    const obj = d[section.key] || {};
    if (section.sub) return { ...d, [section.key]: { ...obj, [section.sub]: { ...(obj[section.sub] || {}), ...patch } } };
    return { ...d, [section.key]: { ...obj, ...patch } };
  };

  // Edits collect per WeddingDetails key and flush together 900ms after the
  // last one: top-level fields as one patch, each sub-object whole.
  const queue = (section, next, topPatch) => {
    setStatus('saving');
    setData(next);
    if (section.key == null) pending.current.top = { ...(pending.current.top || {}), ...topPatch };
    else pending.current[section.key] = { whole: next[section.key], encrypted: !!section.encrypted };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };
  const flush = async () => {
    const jobs = pending.current;
    pending.current = {};
    try {
      if (jobs.top) await onSave(null, jobs.top, false);
      for (const [key, job] of Object.entries(jobs)) { if (key === 'top') continue; await onSave(key, job.whole, job.encrypted); }
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch { setStatus('failed'); }
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const valueOf = (section, f) => {
    if (section.key == null) return data[f.name];
    const obj = data[section.key] || {};
    return section.sub ? (obj[section.sub] || {})[f.name] : obj[f.name];
  };
  const valuesOf = (section) => (section.key == null ? data : section.sub ? ((data[section.key] || {})[section.sub] || {}) : (data[section.key] || {}));
  const sections = schema.sections.filter((s) => !segments || (s.segment || segments[0].key) === segment);

  return (
    <Screen notice={notice} title={schema.title} subtitle={status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'failed' ? 'Could not save. Check your connection.' : subtitle} back={back}>
      {segments && <Segments options={segments} value={segment} onChange={setSegment} />}
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} timedOut={error?.timedOut} /> : loading ? (<><Skeleton kind="block" /><Skeleton kind="block" /></>) : (
          sections.map((section) => (
            <section key={section.title}>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{section.title}</h2>
              {section.intro && <p className="oi-m-meta" style={{ marginBottom: 12 }}>{section.intro}</p>}
              {section.ultra && !ultra ? (
                <PanelCard tone="ink" label="Ultra" title={section.gateTitle || 'This is an Ultra feature'} body={section.gateBody || 'Upgrade on the website to switch it on.'}><Lock size={18} style={{ opacity: 0.7 }} /></PanelCard>
              ) : section.roster ? (
                <RosterSection category={section.roster} onOpen={onOpenVendors} />
              ) : section.list ? (
                <ListSection section={section} items={listOf(section, data)} onAdd={() => setListSheet({ section, index: -1 })} onEdit={(i) => setListSheet({ section, index: i })} />
              ) : (
                <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {section.fields.filter((f) => fieldVisible(f, valuesOf(section))).map((f, i) => (
                    <SchemaField key={f.name || `h${i}`} field={f} value={valueOf(section, f)} onChange={(val) => { const patch = { [f.name]: coerce(f, val) }; queue(section, withPatch(section, data, patch), patch); }} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
        {!loading && !error && schema.considerations && considerations.row}
      </div>
      {schema.considerations && considerations.sheet}
      {listSheet && (
        <FormSheet
          open
          full={listSheet.section.list.fields.length > 4}
          title={listSheet.index < 0 ? `Add ${listSheet.section.list.label.toLowerCase()}` : `Edit ${listSheet.section.list.label.toLowerCase()}`}
          fields={listSheet.section.list.fields}
          initial={listSheet.index < 0 ? (listSheet.section.list.defaults || null) : listOf(listSheet.section, data)[listSheet.index]}
          required={listSheet.section.list.required || [listSheet.section.list.fields.find((f) => f.name)?.name].filter(Boolean)}
          onClose={() => setListSheet(null)}
          onSave={async (values) => {
            const list = [...listOf(listSheet.section, data)];
            const withId = listSheet.section.list.id ? { id: listSheet.section.list.id(), ...values } : values;
            if (listSheet.index < 0) list.push(withId); else list[listSheet.index] = { ...list[listSheet.index], ...values };
            const next = withList(listSheet.section, data, list);
            queue(listSheet.section, next, listSheet.section.key == null ? { [listSheet.section.list.name]: list } : undefined);
          }}
          onDelete={listSheet.index < 0 ? undefined : () => {
            const list = listOf(listSheet.section, data).filter((_, i) => i !== listSheet.index);
            const next = withList(listSheet.section, data, list);
            queue(listSheet.section, next, listSheet.section.key == null ? { [listSheet.section.list.name]: list } : undefined);
            setListSheet(null);
          }}
        />
      )}
    </Screen>
  );
}

/** VendorRosterSection.jsx: the couple's vendors in one category, each opening My vendors. */
function RosterSection({ category, onOpen }) {
  const vendors = useEntity('Vendor', '-created_date');
  const list = (vendors.data || []).filter((v) => v.category === category);
  if (vendors.loading) return <Skeleton kind="block" />;
  if (list.length === 0) return <EmptyState text="No one in this category yet." actionLabel="Open My vendors" onAction={() => onOpen?.(category)} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <RowGroup>
        {list.map((v) => <Row key={v.id} label={v.name} sub={[v.contact_person, v.phone].filter(Boolean).join(', ')} trailing={<StatusPill tone={VENDOR_STATUS_TONE[v.status] || 'neutral'}>{VENDOR_STATUS_LABEL[v.status] || v.status}</StatusPill>} onClick={() => onOpen?.(category, v.id)} />)}
      </RowGroup>
      <PillButton variant="secondary" size="sm" onClick={() => onOpen?.(category)} style={{ alignSelf: 'flex-start' }}>Open My vendors</PillButton>
    </div>
  );
}

function ListSection({ section, items, onAdd, onEdit }) {
  const l = section.list;
  const named = l.fields.filter((f) => f.name);
  const first = named[0]?.name;
  const second = named[1]?.name;
  const rowOf = (it, i) => (l.row ? l.row(it, i) : { title: it[first] || `${l.label} ${i + 1}`, sub: second ? it[second] : '', image: l.image ? it[l.image] : undefined });
  const singular = l.label.toLowerCase();
  const plural = l.plural || `${singular}s`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length === 0 ? (
        <EmptyState text={l.empty || `No ${plural} yet.`} actionLabel={`Add ${/^[aeiou]/.test(singular) ? 'an' : 'a'} ${singular}`} onAction={onAdd} />
      ) : (
        <>
          <RowGroup>
            {items.map((it, i) => { const r = rowOf(it, i); return (
              <button key={it.id || i} type="button" className="oi-m-row oi-m-row--pressable" onClick={() => onEdit(i)}>
                {l.image && <SmartImage src={r.image || ''} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} tone={r.image ? 'neutral' : 'tint'} />}
                <div className="oi-m-row__body"><div className="oi-m-row__label oi-m-row__label--wrap">{r.title}</div>{r.sub && <div className="oi-m-row__sub">{r.sub}</div>}</div>
                {r.value != null && r.value !== '' && <span className="oi-m-row__value">{r.value}</span>}
              </button>
            ); })}
          </RowGroup>
          <PillButton variant="secondary" size="sm" icon={Plus} onClick={onAdd} style={{ alignSelf: 'flex-start' }}>Add {/^[aeiou]/.test(singular) ? 'an' : 'a'} {singular}</PillButton>
        </>
      )}
    </div>
  );
}

