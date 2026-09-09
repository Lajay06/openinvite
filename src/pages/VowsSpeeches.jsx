import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { interactiveDivProps } from '@/lib/a11y';
import { Plus, Edit, Trash2, Mic, Heart, Printer, Loader2, User, Lock, LockOpen } from 'lucide-react';
import toast from 'react-hot-toast';

import { isHidden, isItemLocked, setPin, unlock, clearPin } from '@/lib/vowPinLock';

const VowSpeech = base44.entities.VowSpeech;

const PJS_F = "'Plus Jakarta Sans', sans-serif";

/** The four-to-six digit field, shared by the set and unlock screens. */
function PinInput({ value, onChange, onSubmit, autoFocus, label }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      aria-label={label}
      value={value}
      maxLength={6}
      // Digits only, enforced on the way in as well as on the server: a
      // field that accepts letters and then refuses them is a field that
      // wastes the couple's time.
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
      placeholder="••••"
      style={{
        // No letter-spacing here — the design-system sweep bars it across the
        // dashboard, and the guard caught this field. A password input already
        // renders dots with room around them.
        width: 120, padding: '8px 12px', fontSize: 14,
        textAlign: 'center', fontFamily: PJS_F, color: '#0A0A0A',
        border: '1px solid rgba(10,10,10,0.18)', outline: 'none', background: '#FFFFFF',
      }}
    />
  );
}

/**
 * What stands in for a locked item's text.
 *
 * IT SAYS WHAT THE LOCK IS. Only this account can load the record — VowSpeech
 * RLS scopes read to its owner — so this lock is for the person beside you,
 * not for anyone on the internet. Saying so is the difference between a
 * couple who understands the feature and one who over-trusts it.
 *
 * The copy never says "private", "secure", "encrypted" or "vault" (owner
 * ruling 2026-09-08). The words are stored as ordinary text; every one of
 * those four would promise something else.
 */
function LockedPane({ pin, busy, error, onPin, onSubmit }) {
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Lock size={16} style={{ color: '#E03553' }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS_F, margin: 0 }}>
          This one is locked
        </p>
      </div>
      <p style={{ fontSize: 13, color: '#444444', fontFamily: PJS_F, margin: 0, lineHeight: 1.6 }}>
        Enter its PIN to read it. It stays open until you close this tab.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PinInput value={pin} onChange={onPin} onSubmit={onSubmit} autoFocus label="PIN" />
        <button onClick={onSubmit} disabled={busy || pin.length < 4} className="btn-primary" style={{ fontSize: 12 }}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS_F, margin: 0 }}>{error}</p>
      )}
      <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', fontFamily: PJS_F, margin: '4px 0 0', lineHeight: 1.6 }}>
        Forgotten it? Use “Remove lock” above — there is no way to recover a PIN.
        {/* WHAT IT DOES, NOT WHAT IT SOUNDS LIKE. Owner ruling 2026-09-08:
            never "private", "secure", "encrypted" or "vault". The words are
            stored as ordinary text and this keeps them off a screen someone
            else is looking at — saying anything stronger would invite the
            couple to trust it with something it does not protect. */}
        {' '}This keeps your words off the screen when someone else is looking.
      </p>
    </div>
  );
}

import VowSpeechEditor from '../components/vows/VowSpeechEditor';
import AIVowsSpeechesAssistant from '../components/vows/AIVowsSpeechesAssistant';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import CountUp from "@/components/shared/CountUp";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
};


export default function VowsSpeechesPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [aiType, setAiType] = useState('vow');
  const [activeTab, setActiveTab] = useState('vows');
  // The lock's own state. `lockPrompt` is which dialog is open ('set' |
  // 'unlock' | null) for the SELECTED item; `pinEntry` is what is typed;
  // `lockError` is what came back. `revealTick` exists only to re-render
  // after vowPinLock's module-level Set changes — the reveal deliberately
  // lives outside React so it survives a remount and dies with the page.
  const [lockPrompt, setLockPrompt] = useState(null);
  const [pinEntry, setPinEntry] = useState('');
  const [lockError, setLockError] = useState('');
  const [lockBusy, setLockBusy] = useState(false);
  const [, setRevealTick] = useState(0);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getMyRecords('VowSpeech', '-created_date');
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load items');
    }
    setLoading(false);
  };

  const handleSave = async (data) => {
    const id = toast.loading(data.id ? 'Updating…' : 'Saving…');
    try {
      if (data.id) await VowSpeech.update(data.id, data);
      else await VowSpeech.create(data);
      toast.success(data.id ? 'Updated' : 'Saved', { id });
      setIsEditing(false);
      setSelectedItem(null);
      loadItems();
    } catch (e) {
      toast.error('Failed to save', { id });
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    const id = toast.loading('Deleting…');
    try {
      await VowSpeech.delete(itemId);
      if (selectedItem?.id === itemId) setSelectedItem(null);
      toast.success('Deleted', { id });
      loadItems();
    } catch (e) {
      toast.error('Failed to delete', { id });
    }
  };

  const handleAIApply = (text) => {
    setSelectedItem({ title: aiType === 'vow' ? 'My wedding vows' : 'Wedding speech', type: aiType, author: '', content: text, notes: '' });
    setIsEditing(true);
  };

  // ── THE LOCK ─────────────────────────────────────────────────────────
  //
  // Every one of these goes through /api/vow-pin. The PIN is never written to
  // the entity from here and never kept in component state after the call —
  // the field is cleared on success and on failure alike.
  const handleSetPin = async () => {
    setLockBusy(true);
    const r = await setPin(selectedItem.id, pinEntry);
    setLockBusy(false);
    if (!r.ok) { setLockError(r.error); return; }
    setLockPrompt(null); setPinEntry(''); setLockError('');
    await loadItems();
    setRevealTick(t => t + 1);
    toast.success('Locked. Remember this PIN — it cannot be recovered.');
  };

  const handleUnlock = async () => {
    setLockBusy(true);
    const r = await unlock(selectedItem.id, pinEntry);
    setLockBusy(false);
    setPinEntry('');
    if (!r.ok) { setLockError(r.error); return; }
    setLockError('');
    setRevealTick(t => t + 1);
  };

  const handleClearLock = async () => {
    setLockBusy(true);
    const r = await clearPin(selectedItem.id);
    setLockBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    await loadItems();
    setRevealTick(t => t + 1);
    toast.success('Lock removed.');
  };

  const handlePrint = () => {
    if (!selectedItem) return;
    const w = window.open('', '', 'height=600,width=800');
    w.document.write(`<html><head><title>Print</title><style>body{font-family:sans-serif;padding:2rem;line-height:1.7;}h1{font-size:1.4rem;font-weight:700;margin-bottom:0.25rem;}h2{font-size:0.9rem;color:#555;margin-bottom:1.5rem;}p{white-space:pre-wrap;}</style></head><body><h1>${selectedItem.title}</h1><h2>By ${selectedItem.author}</h2><p>${selectedItem.content || ''}</p></body></html>`);
    w.document.close();
    w.print();
  };

  const vows = items.filter(i => i.type === 'vow');
  const speeches = items.filter(i => i.type === 'speech');
  const listItems = activeTab === 'vows' ? vows : speeches;

  const stats = [
    { label: 'Total items', value: items.length },
    { label: 'Vows', value: vows.length },
    { label: 'Speeches', value: speeches.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Vows & speeches" subtitle="Write, store and polish your vows and wedding-day speeches" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        {stats.map((s, i) => (
          <div key={i} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < stats.length - 1 ? '1px solid rgba(10,10,10,0.12)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 60, height: 36, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
                  <CountUp to={s.value} />
                </p>}
          </div>
        ))}
      </div>

      {/* Ava + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        {/* The page's single AI entry point. It used to open the generic
            AvaModal chat while three other buttons opened the purpose-built
            AIVowsSpeechesAssistant — four buttons, two destinations. This one
            now opens the assistant, and the other three are gone. Label and
            type both derive from the active tab, matching the assistant's own
            wording convention ("vows" plural, "a speech" singular). */}
        <AvaButton
          label={activeTab === 'vows' ? 'Ask Ava to help write your vows' : 'Ask Ava to help write your speech'}
          onClick={() => { setAiType(activeTab === 'vows' ? 'vow' : 'speech'); setShowAI(true); }}
        />
        <div className="flex flex-wrap items-center gap-[10px]">
          <button onClick={() => { setSelectedItem(null); setIsEditing(true); }} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Write new
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
          <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ display: 'flex', height: 'calc(100vh - 260px)', minHeight: 500 }}>
          {/* Left panel — list */}
          <div style={{ width: 280, borderRight: '1px solid rgba(10,10,10,0.12)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
              {[{ value: 'vows', label: 'Vows', icon: Heart }, { value: 'speeches', label: 'Speeches', icon: Mic }].map(t => (
                <button key={t.value} onClick={() => setActiveTab(t.value)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: activeTab === t.value ? '#E03553' : '#444444', borderBottom: `2px solid ${activeTab === t.value ? '#E03553' : 'transparent'}`, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: -1 }}>
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>

            {/* Item list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {listItems.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  {activeTab === 'vows' ? <Heart size={32} style={{ color: 'rgba(10,10,10,0.3)', margin: '0 auto 12px' }} /> : <Mic size={32} style={{ color: 'rgba(10,10,10,0.3)', margin: '0 auto 12px' }} />}
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>No {activeTab} yet</p>
                  {/* NO BUTTON HERE. The page had three ways to start writing —
                      this one, one in the middle, and the pair in the top bar —
                      and the top bar is on screen the whole time, so the other
                      two were repetition rather than reach. Owner ruling,
                      2026-09-10. The sentence now says where the controls are
                      rather than carrying its own copy of them: an empty state
                      still has to say what to do first. */}
                  <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Use the buttons above to write, or ask Ava</p>
                </div>
              ) : (
                listItems.map(item => (
                  <div key={item.id} onClick={() => { setSelectedItem(item); setIsEditing(false); }}
                    {...interactiveDivProps(() => { setSelectedItem(item); setIsEditing(false); })}
                    style={{ padding: '12px 16px', borderBottom: '1px solid rgba(10,10,10,0.06)', cursor: 'pointer', borderLeft: `3px solid ${selectedItem?.id === item.id ? '#E03553' : 'transparent'}`, background: selectedItem?.id === item.id ? 'rgba(224,53,83,0.04)' : 'transparent' }}
                    onMouseEnter={e => { if (selectedItem?.id !== item.id) e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
                    onMouseLeave={e => { if (selectedItem?.id !== item.id) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                        <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={10} />{item.author || 'No author'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        {/* THE LOCK IS VISIBLE FROM THE LIST. A locked item
                            that looks identical to an unlocked one until you
                            open it is a lock the couple cannot check. */}
                        {isItemLocked(item) && (
                          <span
                            title={isHidden(item) ? 'Locked' : 'Locked — open for this visit'}
                            style={{ display: 'flex', alignItems: 'center', color: isHidden(item) ? '#E03553' : 'rgba(10,10,10,0.45)', padding: 4 }}
                          >
                            {isHidden(item) ? <Lock size={12} /> : <LockOpen size={12} />}
                          </span>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelectedItem(item); setIsEditing(true); }} aria-label="Edit"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', padding: 4, display: 'flex' }}>
                          <Edit size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }} aria-label="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 4, display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel — viewer / editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {isEditing ? (
              <VowSpeechEditor
                initialData={selectedItem}
                onSave={handleSave}
                onCancel={() => { setIsEditing(false); setSelectedItem(null); }}
              />
            ) : selectedItem ? (
              <>
                {/* Viewer header */}
                <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{selectedItem.title}</p>
                    <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} />By {selectedItem.author}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isItemLocked(selectedItem) ? (
                      <button
                        onClick={handleClearLock}
                        disabled={lockBusy}
                        className="btn-editorial-secondary"
                        style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <LockOpen size={12} />Remove lock
                      </button>
                    ) : (
                      <button
                        onClick={() => { setLockPrompt('set'); setPinEntry(''); setLockError(''); }}
                        className="btn-editorial-secondary"
                        style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <Lock size={12} />Lock
                      </button>
                    )}
                    <button onClick={handlePrint} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Printer size={12} />Print
                    </button>
                    <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Edit size={12} />Edit
                    </button>
                  </div>
                </div>
                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                  {isHidden(selectedItem) ? (
                    <LockedPane
                      pin={pinEntry}
                      busy={lockBusy}
                      error={lockError}
                      onPin={v => { setPinEntry(v); setLockError(''); }}
                      onSubmit={handleUnlock}
                    />
                  ) : (
                  <>
                  <div style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.8, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap' }}>
                    {selectedItem.content || <span style={{ color: '#444444', fontStyle: 'italic' }}>No content yet.</span>}
                  </div>
                  {selectedItem.notes && (
                    <div style={{ maxWidth: 680, marginTop: 32, padding: 16, border: '1px solid rgba(10,10,10,0.12)', background: '#F5F5F5' }}>
                      <p style={{ ...labelStyle, marginBottom: 8 }}>Private notes</p>
                      <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap', margin: 0 }}>{selectedItem.notes}</p>
                    </div>
                  )}
                  </>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <Mic size={48} style={{ color: 'rgba(10,10,10,0.3)', marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Ready to write your perfect words?</p>
                <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>Select an item from the list, or start a new one from the buttons above</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAI && (
        <AIVowsSpeechesAssistant isOpen={showAI} onClose={() => setShowAI(false)} onApply={handleAIApply} type={aiType} />
      )}

      {lockPrompt === 'set' && selectedItem && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => { setLockPrompt(null); setPinEntry(''); setLockError(''); }}
        >
          <div
            role="dialog"
            aria-label="Set a PIN"
            onClick={e => e.stopPropagation()}
            style={{ background: '#FFFFFF', padding: 24, maxWidth: 420, width: '90%', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS_F, margin: 0 }}>
              Lock “{selectedItem.title}”
            </p>
            <p style={{ fontSize: 13, color: '#444444', fontFamily: PJS_F, margin: 0, lineHeight: 1.6 }}>
              Choose 4 to 6 digits. You will need it to read this one again, and
              it keeps this one off the screen when someone else is looking.
              {/* Said before they commit, not after they forget. */}
              {' '}There is no way to recover it — only to remove the lock.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PinInput
                value={pinEntry}
                onChange={v => { setPinEntry(v); setLockError(''); }}
                onSubmit={handleSetPin}
                autoFocus
                label="New PIN"
              />
              <button onClick={handleSetPin} disabled={lockBusy || pinEntry.length < 4} className="btn-primary" style={{ fontSize: 12 }}>
                {lockBusy ? 'Locking…' : 'Lock it'}
              </button>
              <button
                onClick={() => { setLockPrompt(null); setPinEntry(''); setLockError(''); }}
                className="btn-editorial-secondary"
                style={{ fontSize: 12 }}
              >Cancel</button>
            </div>
            {lockError && <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS_F, margin: 0 }}>{lockError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
