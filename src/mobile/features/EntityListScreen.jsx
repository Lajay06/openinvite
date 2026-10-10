import React, { useCallback, useMemo, useState } from 'react';
import { useOpenById } from '../lib/openById';
import { Plus, Inbox, LayoutGrid, List as ListIcon } from 'lucide-react';
import Screen from '../shell/Screen';
import { FilterPills, EmptyState, ErrorState, SkeletonRows, ItemCard, ItemList, GroupedList, Row, SmartImage, StatusPill, useListView } from '../ui';
import FormSheet from './FormSheet';
import { useConfirm } from '../ui/ConfirmSheet';

/**
 * A list of records with add / edit / delete, from an ENTITIES schema.
 *
 * Which pattern (DESIGN_MOBILE.md, "Lists"): `schema.pattern` is 'cards' or
 * 'rows'. Cards for browsable lists where each item matters on its own
 * (vendors, registry, timeline moments); rows for long, text-led lists.
 * `schema.gridToggle` adds the circular view toggle that swaps cards for a
 * two-column image grid, remembered locally.
 */
export default function EntityListScreen({ schema, items = [], onCreate, onUpdate, onDelete, loading, error, onRetry, back, subtitle, extraActions = [], header = null, onRefresh, openId = null }) {
  const [filter, setFilter] = useState('all');
  const [sheet, setSheet] = useState({ open: false, item: null });
  const [view, setView] = useListView(schema.entity, 'cards');
  const [q, setQ] = useState('');
  const [confirm, confirmEl] = useConfirm();
  const pattern = schema.pattern || 'rows';
  const visible = useMemo(() => {
    const f = schema.filters?.find((x) => x.key === filter);
    let list = f?.test ? items.filter(f.test) : items;
    const t = q.trim().toLowerCase();
    if (schema.search && t) list = list.filter((it) => schema.search(it, t));
    return list;
  }, [items, filter, schema, q]);
  const groups = useMemo(() => {
    if (!schema.groupBy) return [{ key: 'all', title: null, items: visible }];
    const m = new Map();
    for (const it of visible) { const k = schema.groupBy(it); if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
    return [...m.entries()].map(([k, list]) => ({ key: k, title: k === 'No date' ? k : new Date(`${k}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }), items: list }));
  }, [visible, schema]);

  const save = async (values) => {
    const out = schema.fromForm ? schema.fromForm(values, sheet.item) : values;
    if (sheet.item) await onUpdate(sheet.item.id, out);
    else await onCreate({ ...(schema.defaults || {}), ...out });
  };
  const remove = async () => {
    if (!sheet.item) return;
    if (!(await confirm({ title: `Remove this ${schema.itemLabel}`, body: schema.row(sheet.item).title, action: 'Remove' }))) return;
    await onDelete(sheet.item.id);
    setSheet({ open: false, item: null });
  };
  const openItem = useCallback((it) => setSheet({ open: true, item: it }), []);
  // Reached from global search with an item id (registry products, links and funds): its sheet opens once the list is in.
  useOpenById(items, openId, openItem);
  const actions = [
    ...extraActions,
    ...(schema.gridToggle ? [{ icon: view === 'grid' ? ListIcon : LayoutGrid, label: view === 'grid' ? 'Show as list' : 'Show as grid', onClick: () => setView(view === 'grid' ? 'cards' : 'grid') }] : []),
    { icon: Plus, label: `Add ${schema.itemLabel}`, onClick: () => setSheet({ open: true, item: null }) },
  ].slice(-2);

  const renderCards = (list) => (
    <ItemList>
      {list.map((it) => {
        const r = schema.row(it);
        return <ItemCard key={it.id} image={r.image} alt={r.title} icon={r.icon} initials={r.image || r.icon ? undefined : (r.title || '?').slice(0, 1).toUpperCase()} title={r.title} meta={r.sub} value={r.value} badge={r.badge} badgeTone={r.badgeTone} action={r.action} onClick={() => openItem(it)} />;
      })}
    </ItemList>
  );
  const renderGrid = (list) => (
    <div className="oi-m-imggrid">
      {list.map((it) => {
        const r = schema.row(it);
        return (
          <button key={it.id} type="button" className="oi-m-imgcard oi-m-press" onClick={() => openItem(it)}>
            {r.badge && <span className="oi-m-imgcard__badge"><StatusPill tone={r.badgeTone === 'ok' ? 'ok' : 'light'}>{r.badge}</StatusPill></span>}
            <SmartImage src={r.image} alt={r.title} width={170} ratio="1/1" tone={r.image ? 'neutral' : 'tint'} />
            <div className="oi-m-imgcard__body">
              <div className="oi-m-imgcard__title">{r.title}</div>
              {r.sub && <div className="oi-m-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
  const renderRows = () => (
    <GroupedList groups={groups.map((g) => ({
      key: g.key,
      title: g.title,
      rows: g.items.map((it) => {
        const r = schema.row(it);
        return <Row key={it.id} label={r.title} sub={r.sub} value={r.badge ? undefined : r.value} initials={r.image ? undefined : (r.title || '?').slice(0, 1).toUpperCase()} onClick={() => openItem(it)} trailing={r.badge ? <StatusPill tone={r.badgeTone || 'neutral'}>{r.badge}</StatusPill> : undefined} />;
      }),
    }))} />
  );

  return (
    <Screen
      title={schema.title}
      subtitle={subtitle ?? (loading ? '' : `${items.length} ${items.length === 1 ? schema.itemLabel : `${schema.itemLabel}s`}`)}
      back={back}
      actions={actions}
      onRefresh={onRefresh}
    >
      {header}
      {schema.filters && <FilterPills options={schema.filters} value={filter} onChange={setFilter} />}
      {schema.search && items.length > 0 && <div className="oi-m-stack" style={{ marginBottom: 12 }}><input className="oi-m-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={schema.searchPlaceholder || 'Search'} aria-label={schema.searchPlaceholder || 'Search'} /></div>}
      <div className="oi-m-stack oi-m-stack--24" style={{ marginTop: schema.filters ? 12 : 0 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} timedOut={error?.timedOut} /> : loading ? <SkeletonRows count={6} /> : items.length === 0 ? (
          <EmptyState icon={Inbox} image={schema.emptyImage} text={schema.emptyText || `No ${schema.itemLabel}s yet. Add the first one.`} actionLabel={`Add a ${schema.itemLabel}`} onAction={() => setSheet({ open: true, item: null })} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Inbox} text="Nothing matches this filter." />
        ) : pattern === 'cards' ? (
          schema.gridToggle && view === 'grid' ? renderGrid(visible) : groups.length > 1 || groups[0].title ? (
            <div className="oi-m-grouped">{groups.map((g) => <section key={g.key}><h2 className="oi-m-grouped__title">{g.title}</h2>{renderCards(g.items)}</section>)}</div>
          ) : renderCards(visible)
        ) : renderRows()}
      </div>
      <FormSheet
        open={sheet.open}
        full={!!schema.full}
        title={sheet.item ? `Edit ${schema.itemLabel}` : `Add ${schema.itemLabel}`}
        fields={schema.fields}
        initial={sheet.item ? (schema.toForm ? schema.toForm(sheet.item) : sheet.item) : (schema.defaults || null)}
        required={schema.required || []}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSave={save}
        onDelete={sheet.item ? remove : undefined}
        saveLabel={sheet.item ? 'Save changes' : `Add ${schema.itemLabel}`}
      >
        {schema.sheetChildren}
      </FormSheet>
      {confirmEl}
    </Screen>
  );
}
