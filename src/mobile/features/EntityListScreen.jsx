import React, { useMemo, useState } from 'react';
import { Plus, Inbox } from 'lucide-react';
import Screen from '../shell/Screen';
import { Row, RowGroup, FilterPills, EmptyState, ErrorState, SkeletonRows, StatusPill, SmartImage } from '../ui';
import FormSheet from './FormSheet';

/**
 * A list of records with add / edit / delete, from an ENTITIES schema.
 * Presentational: `items`, `onCreate`, `onUpdate`, `onDelete` come from the
 * container (or the preview). Optional filters, grouping and a photo grid.
 */
export default function EntityListScreen({ schema, items = [], onCreate, onUpdate, onDelete, loading, error, onRetry, back, subtitle, extraActions = [], header = null }) {
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState({ open: false, item: null });
  const visible = useMemo(() => {
    const f = schema.filters?.find((x) => x.key === filter);
    return f?.test ? items.filter(f.test) : items;
  }, [items, filter, schema.filters]);
  const groups = useMemo(() => {
    if (!schema.groupBy) return [{ key: 'all', title: null, items: visible }];
    const m = new Map();
    for (const it of visible) { const k = schema.groupBy(it); if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
    return [...m.entries()].map(([k, list]) => ({ key: k, title: k === 'No date' ? k : new Date(`${k}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }), items: list }));
  }, [visible, schema]);

  const save = async (values) => {
    if (sheet.item) await onUpdate(sheet.item.id, values);
    else await onCreate({ ...(schema.defaults || {}), ...values });
  };
  const remove = async () => {
    if (!sheet.item) return;
    if (!window.confirm(`Remove this ${schema.itemLabel}?`)) return;
    await onDelete(sheet.item.id);
    setSheet({ open: false, item: null });
  };

  return (
    <Screen
      title={schema.title}
      subtitle={subtitle ?? (loading ? '' : `${items.length} ${items.length === 1 ? schema.itemLabel : `${schema.itemLabel}s`}`)}
      back={back}
      actions={[...extraActions, { icon: Plus, label: `Add ${schema.itemLabel}`, onClick: () => setSheet({ open: true, item: null }) }]}
    >
      {header}
      {schema.filters && <FilterPills options={schema.filters} value={filter} onChange={setFilter} />}
      <div className="oi-m-stack oi-m-stack--24" style={{ marginTop: schema.filters ? 12 : 0 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : items.length === 0 ? (
          <EmptyState icon={Inbox} text={`No ${schema.itemLabel}s yet. Add the first one.`} actionLabel={`Add a ${schema.itemLabel}`} onAction={() => setSheet({ open: true, item: null })} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Inbox} text="Nothing matches this filter." />
        ) : schema.grid ? (
          <div className="oi-m-grid2">
            {visible.map((it) => {
              const r = schema.row(it);
              return (
                <button key={it.id} type="button" className="oi-m-imgcard oi-m-press" onClick={() => setSheet({ open: true, item: it })}>
                  <SmartImage src={r.image} alt={r.title} width={170} ratio="1/1" />
                  <div className="oi-m-imgcard__body">
                    <div className="oi-m-imgcard__title">{r.title}</div>
                    {r.sub && <div className="oi-m-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key}>
              {g.title && <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{g.title}</h2>}
              <RowGroup>
                {g.items.map((it) => {
                  const r = schema.row(it);
                  return (
                    <Row
                      key={it.id}
                      label={r.title}
                      sub={r.sub}
                      value={r.badge ? undefined : r.value}
                      initials={r.image ? undefined : (r.title || '?').slice(0, 1).toUpperCase()}
                      icon={undefined}
                      onClick={() => setSheet({ open: true, item: it })}
                      trailing={r.badge ? <StatusPill tone={r.badgeTone || 'neutral'}>{r.badge}</StatusPill> : undefined}
                    >
                      {r.image ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <SmartImage src={r.image} alt="" width={48} height={48} style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 12 }} />
                          <div style={{ minWidth: 0 }}>
                            <div className="oi-m-row__label">{r.title}</div>
                            {r.sub && <div className="oi-m-row__sub">{r.sub}</div>}
                          </div>
                        </div>
                      ) : null}
                    </Row>
                  );
                })}
              </RowGroup>
            </section>
          ))
        )}
      </div>
      <FormSheet
        open={sheet.open}
        title={sheet.item ? `Edit ${schema.itemLabel}` : `Add ${schema.itemLabel}`}
        fields={schema.fields}
        initial={sheet.item}
        required={schema.required || []}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={save}
        onDelete={sheet.item ? remove : undefined}
        saveLabel={sheet.item ? 'Save changes' : `Add ${schema.itemLabel}`}
      />
    </Screen>
  );
}
