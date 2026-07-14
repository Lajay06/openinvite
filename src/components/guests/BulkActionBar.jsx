import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, Trash2, ChevronDown, X } from "lucide-react";
import { CATEGORY_OPTIONS } from './GuestList';
import { COMMON_TAGS, DIETARY_OPTIONS } from './GuestForm';

const PJS = "'Plus Jakarta Sans', sans-serif";

const barBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999,
  padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#0A0A0A',
  cursor: 'pointer', fontFamily: PJS,
};

/* Bulk category/dietary set — same value applied to every selected guest
   ("100 guests to friends in 3 clicks": select all, click this, pick
   Friends). Tags are additive/subtractive instead (add/remove a single tag
   across the selection), since different guests may already carry
   different tags — a bulk "set" would blow away everyone else's tags. */
export default function BulkActionBar({ count, selectedGuests, onSetCategory, onSetDietary, onAddTag, onRemoveTag, onDelete }) {
  const [tagInput, setTagInput] = useState('');

  const tagsInSelection = [...new Set(selectedGuests.flatMap(g => Array.isArray(g.tags) ? g.tags : []))].sort();

  const addTag = (tag) => {
    const t = tag.trim();
    if (!t) return;
    onAddTag(t);
    setTagInput('');
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button style={barBtn}>Category <ChevronDown size={12} /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CATEGORY_OPTIONS.filter(o => o.value).map(opt => (
            <DropdownMenuItem key={opt.value} onClick={() => onSetCategory(opt.value)}>
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button style={barBtn}>Dietary <ChevronDown size={12} /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {DIETARY_OPTIONS.map(opt => (
            <DropdownMenuItem key={opt} onClick={() => onSetDietary(opt === 'None' ? '' : opt)}>
              {opt}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <button style={barBtn}><Tag size={12} /> Tags <ChevronDown size={12} /></button>
        </PopoverTrigger>
        <PopoverContent align="start" style={{ width: 260 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px' }}>
            Add a tag to {count} guest{count !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              autoFocus
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Type a tag…"
              style={{ flex: 1, border: '1px solid rgba(10,10,10,0.15)', borderRadius: 4, padding: '5px 8px', fontSize: 12, fontFamily: PJS, outline: 'none' }}
            />
            <button
              onClick={() => addTag(tagInput)}
              style={{ background: '#E03553', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: PJS }}
            >
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: tagsInSelection.length ? 10 : 0 }}>
            {COMMON_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                style={{ background: 'none', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 999, padding: '3px 9px', fontSize: 11, color: '#444444', cursor: 'pointer', fontFamily: PJS }}
              >
                + {tag}
              </button>
            ))}
          </div>
          {tagsInSelection.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px' }}>
                Remove a tag from the selection
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {tagsInSelection.map(tag => (
                  <button
                    key={tag}
                    onClick={() => onRemoveTag(tag)}
                    title={`Remove "${tag}" from every selected guest that has it`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(128,61,129,0.08)', border: '1px solid rgba(128,61,129,0.25)', borderRadius: 999, padding: '3px 8px', fontSize: 11, color: '#803D81', cursor: 'pointer', fontFamily: PJS }}
                  >
                    {tag} <X size={10} />
                  </button>
                ))}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      <button
        onClick={onDelete}
        style={{ ...barBtn, borderColor: 'rgba(224,53,83,0.35)', color: '#E03553' }}
      >
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
