import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * The row above every dashboard table — R37.
 *
 * Search left, pill filters with counts, an optional "▾" select for one more
 * dimension, actions right. Lifted from Guests.jsx so the schedule's toolbar
 * is the same control rather than one that resembles it: the same 13px search
 * icon at left:0, the same `filter-pill` class, and the same rounded
 * SelectTrigger classes.
 */
const SELECT_TRIGGER =
  'w-auto flex-none gap-1 rounded-full border border-[rgba(10,10,10,0.15)] px-2 py-[3px] ' +
  'text-[11px] font-semibold text-[rgba(10,10,10,0.6)] data-[placeholder]:text-[rgba(10,10,10,0.6)] ' +
  'data-[placeholder]:font-semibold hover:border-[rgba(10,10,10,0.45)] hover:text-[#0A0A0A] ' +
  'focus:border focus:border-[rgba(10,10,10,0.15)] focus:outline-none';

export function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`filter-pill${active ? ' active' : ''}`}>
      {label}
    </button>
  );
}

export default function TableToolbar({
  search, onSearch, searchPlaceholder = 'Search…',
  filters, activeFilter, onFilter,
  select, actions,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      {onSearch && (
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.45)', pointerEvents: 'none' }} />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            style={{ paddingLeft: 20 }}
          />
        </div>
      )}

      {filters?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <FilterPill key={f.val} label={f.label} active={activeFilter === f.val} onClick={() => onFilter(f.val)} />
          ))}
        </div>
      )}

      {select?.options?.length > 0 && (
        <Select value={select.value} onValueChange={select.onChange}>
          <SelectTrigger style={{ flexShrink: 0 }} className={SELECT_TRIGGER}>
            <SelectValue placeholder={select.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {select.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {actions && <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
