import React, { useState } from 'react';
import { FileText, Plus, Lock, LockOpen, Share2, Pencil, Sparkles, Heart, Mic, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { ItemCard, ItemList, EmptyState, ErrorState, SkeletonRows, BottomSheet, PillButton, TextField, TextAreaField, SelectField, Switch, RowGroup, Row } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import FormSheet from '../../features/FormSheet';
import { ENTITIES } from '../../features/schemas';
import { exportText } from '../../native';
import { isItemLocked, isHidden as libHidden } from '@/lib/vowPinLock';

const SEGMENTS = [{ key: 'vows', label: 'Vows' }, { key: 'speeches', label: 'Speeches' }];
const STYLE = [['romantic', 'Romantic and poetic'], ['traditional', 'Traditional and classic'], ['modern', 'Modern and contemporary'], ['heartfelt', 'Heartfelt and sincere'], ['lighthearted', 'Lighthearted and fun']].map(([value, label]) => ({ value, label }));
const LENGTH = [['short', 'Short, 1 to 2 minutes'], ['medium', 'Medium, 2 to 3 minutes'], ['long', 'Long, 3 to 5 minutes']].map(([value, label]) => ({ value, label }));
const TONE = [['heartfelt', 'Heartfelt and emotional'], ['joyful', 'Joyful and celebratory'], ['solemn', 'Solemn and reverent'], ['intimate', 'Intimate and personal']].map(([value, label]) => ({ value, label }));
const IMPROVE = [['enhance', 'Enhance overall'], ['shorten', 'Make it shorter'], ['lengthen', 'Make it longer and more detailed'], ['humor', 'Add light humor'], ['formal', 'Make it more formal'], ['casual', 'Make it more casual']].map(([value, label]) => ({ value, label }));
const INSTRUCTIONS = { enhance: 'Make it more emotional, heartfelt, and impactful.', shorten: 'Make it more concise while keeping emotional impact.', lengthen: 'Expand with more depth and personal detail.', humor: 'Add light, tasteful humor while staying heartfelt.', formal: 'Make it more formal and elegant.', casual: 'Make it more relaxed and conversational.' };

/**
 * Vows & speeches, as VowsSpeechesPage: the list by type, a reader with
 * Lock (a 4 to 6 digit PIN through /api/vow-pin, the words hidden until
 * unlocked), Remove lock, Share (the desktop prints), Edit and Delete, the
 * editor with every field, and Ava's writing assistant (generate from the
 * same inputs, or improve a draft) that applies into the editor.
 */
export default function VowsScreen({ items = [], revealed = new Set(), onCreate, onUpdate, onDelete, onSetPin, onUnlock, onClearPin, onAsk, revealTick, loading, error, onRetry, back, onRefresh }) {
  const isHidden = (it) => libHidden(it) && !revealed.has(it.id);
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [reader, setReader] = useState(null); // item
  const [sheet, setSheet] = useState(null); // { item } | { item: null, draft }
  const [lock, setLock] = useState(null); // { mode: 'set'|'unlock', item }
  const [ava, setAva] = useState(null); // { type }
  const [confirm, confirmEl] = useConfirm();
  const schema = ENTITIES.vows;
  const type = segment === 'vows' ? 'vow' : 'speech';
  const list = items.filter((i) => (i.type || 'vow') === type);
  const current = reader ? items.find((i) => i.id === reader.id) || reader : null;
  const remove = async (it) => { if (!(await confirm({ title: 'Delete this draft', body: it.title, action: 'Delete' }))) return; await onDelete(it.id); setSheet(null); setReader(null); };
  const share = async (it) => { const r = await exportText(`${it.title || 'Vows'}.txt`, 'text/plain', `${it.title}\nBy ${it.author || ''}\n\n${it.content || ''}`); if (r === 'failed') toast.error('Could not share.'); };
  const words = (it) => (it.content ? it.content.trim().split(/\s+/).filter(Boolean).length : 0);

  return (
    <Screen title="Vows & speeches" subtitle={loading ? '' : `${items.filter((i) => (i.type || 'vow') === 'vow').length} vow${items.filter((i) => (i.type || 'vow') === 'vow').length === 1 ? '' : 's'}, ${items.filter((i) => i.type === 'speech').length} speech${items.filter((i) => i.type === 'speech').length === 1 ? '' : 'es'}`} back={back} actions={[{ icon: Sparkles, label: 'Ask Ava to write', onClick: () => setAva({ type }) }, { icon: Plus, label: type === 'vow' ? 'New vows' : 'New speech', onClick: () => setSheet({ item: null }) }]} onRefresh={onRefresh}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : list.length === 0 ? (
          <EmptyState icon={type === 'vow' ? Heart : Mic} text={type === 'vow' ? 'Ready to write your vows? Start a draft, or ask Ava for a first version.' : 'No speeches yet. Start a draft, or ask Ava for a first version.'} actionLabel="Start writing" onAction={() => setSheet({ item: null })} />
        ) : (
          <ItemList>
            {list.map((it) => <ItemCard key={it.id} icon={isItemLocked(it) ? Lock : FileText} tile={isItemLocked(it) ? 'ink' : 'neutral'} title={it.title || (type === 'vow' ? 'Vows' : 'Speech')} meta={[it.author ? `By ${it.author}` : '', isItemLocked(it) ? 'Locked' : ''].filter(Boolean).join(', ')} value={isHidden(it) ? 'Locked' : words(it) ? `${words(it)} words` : 'Not written yet'} onClick={() => setReader(it)} />)}
          </ItemList>
        )}
      </div>

      {current && (
        <BottomSheet open onClose={() => setReader(null)} title={current.title || 'Untitled'} full footer={(
          <>
            <PillButton variant="ghost" onClick={() => remove(current)} style={{ color: 'var(--m-primary)' }} aria-label="Delete"><Trash2 size={18} /></PillButton>
            {!isHidden(current) && <PillButton variant="secondary" icon={Share2} onClick={() => share(current)}>Share</PillButton>}
            {!isHidden(current) && <PillButton variant="primary" icon={Pencil} style={{ flex: 1 }} onClick={() => { setSheet({ item: current }); setReader(null); }}>Edit</PillButton>}
          </>
        )}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} key={revealTick}>
            <div className="oi-m-meta">{[current.author ? `By ${current.author}` : '', words(current) && !isHidden(current) ? `${words(current)} words` : ''].filter(Boolean).join(', ')}</div>
            {isHidden(current) ? (
              <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p className="oi-m-body">These words are locked. Enter the PIN to read them.</p>
                <PillButton variant="primary" icon={LockOpen} onClick={() => setLock({ mode: 'unlock', item: current })} style={{ alignSelf: 'flex-start' }}>Unlock</PillButton>
              </div>
            ) : (
              <>
                <p className="oi-m-body" style={{ whiteSpace: 'pre-wrap' }}>{current.content || 'Nothing written yet.'}</p>
                {current.notes && <div className="oi-m-card"><div className="oi-m-meta">Private notes</div><p className="oi-m-body" style={{ whiteSpace: 'pre-wrap' }}>{current.notes}</p></div>}
              </>
            )}
            <RowGroup>
              {isItemLocked(current)
                ? <Row icon={LockOpen} tile="neutral" label="Remove the lock" sub="Anyone with the app open can read it again" onClick={async () => { const r = await onClearPin(current); if (r?.ok) toast.success('Lock removed'); else toast.error(r?.error || 'Could not remove the lock'); }} chevron={false} />
                : <Row icon={Lock} tile="neutral" label="Lock with a PIN" sub="Keeps your words off the screen when someone else is looking" onClick={() => setLock({ mode: 'set', item: current })} chevron={false} />}
            </RowGroup>
          </div>
        </BottomSheet>
      )}

      {lock && <PinSheet mode={lock.mode} item={lock.item} onClose={() => setLock(null)} onSubmit={async (pin) => { const r = lock.mode === 'set' ? await onSetPin(lock.item, pin) : await onUnlock(lock.item, pin); if (r?.ok) { toast.success(lock.mode === 'set' ? 'Locked' : 'Unlocked'); setLock(null); } return r; }} />}

      {sheet && (
        <FormSheet open full title={sheet.item ? 'Edit' : type === 'vow' ? 'New vows' : 'New speech'} fields={schema.fields} initial={sheet.item || { type, ...(sheet.draft ? { content: sheet.draft, title: type === 'vow' ? 'My wedding vows' : 'Wedding speech' } : {}) }} required={['title', 'author']} onClose={() => setSheet(null)}
          onSave={async (v) => { if (sheet.item) await onUpdate(sheet.item.id, v); else await onCreate(v); }}
          onDelete={sheet.item ? () => remove(sheet.item) : undefined} deleteLabel="Delete" saveLabel={sheet.item ? 'Save' : 'Save draft'} />
      )}

      {ava && <AvaWriterSheet type={ava.type} onClose={() => setAva(null)} onAsk={onAsk} onUse={(text) => { setAva(null); setSheet({ item: null, draft: text }); }} />}
      {confirmEl}
    </Screen>
  );
}

/** The PIN field, 4 to 6 digits, for set and unlock. */
function PinSheet({ mode, item, onClose, onSubmit }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = /^\d{4,6}$/.test(pin);
  const go = async () => { if (!ok) return; setBusy(true); setErr(''); const r = await onSubmit(pin); if (r && !r.ok) setErr(r.error || 'That did not work.'); setBusy(false); };
  return (
    <BottomSheet open onClose={onClose} title={mode === 'set' ? `Lock ${item.title || 'this'}` : 'Enter the PIN'} footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" onClick={go} disabled={!ok || busy} style={{ flex: 1 }}>{busy ? (mode === 'set' ? 'Locking' : 'Checking') : mode === 'set' ? 'Lock it' : 'Unlock'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'set' && <p className="oi-m-meta">Choose 4 to 6 digits. You will need it to read this again, and there is no way to recover it, only to remove the lock.</p>}
        <TextField label="PIN" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} error={err} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') go(); }} />
      </div>
    </BottomSheet>
  );
}

/** AIVowsSpeechesAssistant: generate from the same inputs, or improve a draft; the result applies into the editor. */
function AvaWriterSheet({ type, onClose, onAsk, onUse }) {
  const [mode, setMode] = useState('generate');
  const [gf, setGf] = useState({ style: 'romantic', length: 'medium', tone: 'heartfelt', includeHumor: false, partnerName: '', relationshipYears: '', personalStory: '', favoriteMemory: '', futureHopes: '' });
  const [imf, setImf] = useState({ originalText: '', improvementType: 'enhance', specificInstructions: '' });
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const setG = (k, v) => setGf((p) => ({ ...p, [k]: v }));
  const setIm = (k, v) => setImf((p) => ({ ...p, [k]: v }));
  const generate = async () => {
    if (!gf.partnerName.trim()) { toast.error("Enter your partner's name"); return; }
    setBusy(true);
    const tid = toast.loading('Ava is writing');
    try {
      const prompt = `You are an expert wedding writer. Create ${type === 'vow' ? 'wedding vows' : 'a wedding speech'}.\nStyle: ${gf.style}. Length: ${gf.length} (short=1-2min, medium=2-3min, long=3-5min). Tone: ${gf.tone}.\n${gf.includeHumor ? 'Include light humor.' : 'Keep it sincere and emotional.'}\nPartner's name: ${gf.partnerName}${gf.relationshipYears ? `. Years together: ${gf.relationshipYears}` : ''}.\n${gf.personalStory ? `Personal story: ${gf.personalStory}` : ''}\n${gf.favoriteMemory ? `Favorite memory: ${gf.favoriteMemory}` : ''}\n${gf.futureHopes ? `Future hopes: ${gf.futureHopes}` : ''}\nMake it emotional, authentic, and memorable. Return plain text only, no markdown.`;
      const res = await onAsk(prompt);
      setResult(typeof res === 'string' ? res : String(res || ''));
      setMode('result');
      toast.success('Your words are ready', { id: tid });
    } catch { toast.error('Ava could not write that. Try again.', { id: tid }); } finally { setBusy(false); }
  };
  const improve = async () => {
    if (!imf.originalText.trim()) { toast.error('Paste your text first'); return; }
    setBusy(true);
    const tid = toast.loading('Ava is editing');
    try {
      const prompt = `You are an expert wedding writer. ${INSTRUCTIONS[imf.improvementType]}\nOriginal text:\n"""\n${imf.originalText}\n"""\n${imf.specificInstructions ? `Additional instructions: ${imf.specificInstructions}` : ''}\nReturn the improved version as plain text only, no markdown.`;
      const res = await onAsk(prompt);
      setResult(typeof res === 'string' ? res : String(res || ''));
      setMode('result');
      toast.success('Text improved', { id: tid });
    } catch { toast.error('Ava could not edit that. Try again.', { id: tid }); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open onClose={onClose} title={type === 'vow' ? 'Ask Ava to write your vows' : 'Ask Ava to write your speech'} full footer={mode === 'result' ? (
      <>
        <PillButton variant="secondary" onClick={() => setMode('generate')}>Try again</PillButton>
        <PillButton variant="primary" style={{ flex: 1 }} onClick={() => onUse(result)}>Use these words</PillButton>
      </>
    ) : (
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" style={{ flex: 1 }} disabled={busy} onClick={mode === 'generate' ? generate : improve}>{busy ? 'Writing' : mode === 'generate' ? 'Write a first version' : 'Improve it'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode !== 'result' && <Segments options={[{ key: 'generate', label: 'Ask Ava' }, { key: 'improve', label: 'Improve a draft' }]} value={mode} onChange={setMode} />}
        {mode === 'generate' && (
          <>
            <TextField label="Your partner's name" value={gf.partnerName} onChange={(e) => setG('partnerName', e.target.value)} autoCapitalize="words" />
            <SelectField label="Style" value={gf.style} onChange={(e) => setG('style', e.target.value)} options={STYLE} />
            <SelectField label="Length" value={gf.length} onChange={(e) => setG('length', e.target.value)} options={LENGTH} />
            <SelectField label="Tone" value={gf.tone} onChange={(e) => setG('tone', e.target.value)} options={TONE} />
            <div className="oi-m-row" style={{ padding: '8px 4px', background: 'transparent' }}><div className="oi-m-row__body"><div className="oi-m-row__label">Include light humor</div></div><Switch on={gf.includeHumor} onChange={(v) => setG('includeHumor', v)} label="Include light humor" /></div>
            <TextField label="Years together" value={gf.relationshipYears} onChange={(e) => setG('relationshipYears', e.target.value)} placeholder="5" inputMode="numeric" />
            <TextAreaField label="A story about the two of you" value={gf.personalStory} onChange={(e) => setG('personalStory', e.target.value)} rows={3} />
            <TextAreaField label="Your favorite memory together" value={gf.favoriteMemory} onChange={(e) => setG('favoriteMemory', e.target.value)} rows={2} />
            <TextAreaField label="What you are looking forward to" value={gf.futureHopes} onChange={(e) => setG('futureHopes', e.target.value)} rows={2} />
          </>
        )}
        {mode === 'improve' && (
          <>
            <TextAreaField label="Your draft" value={imf.originalText} onChange={(e) => setIm('originalText', e.target.value)} rows={8} placeholder="Paste your vows or speech" />
            <SelectField label="What should change" value={imf.improvementType} onChange={(e) => setIm('improvementType', e.target.value)} options={IMPROVE} />
            <TextAreaField label="Anything specific" value={imf.specificInstructions} onChange={(e) => setIm('specificInstructions', e.target.value)} rows={2} />
          </>
        )}
        {mode === 'result' && <div className="oi-m-card"><p className="oi-m-body" style={{ whiteSpace: 'pre-wrap' }}>{result}</p></div>}
      </div>
    </BottomSheet>
  );
}
