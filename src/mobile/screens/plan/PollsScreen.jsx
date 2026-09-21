import React, { useMemo, useState } from 'react';
import { BarChart2, Plus, Share2, Trash2, Pencil, MessageCircle, Dices, Link2, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { RowGroup, Row, EmptyState, ErrorState, SkeletonRows, ProgressBar, StatusPill, PillButton, BottomSheet, TextField, Switch, ItemCard, ItemList, SelectField } from '../../ui';
import Segments, { useSegment } from '../../ui/Segments';
import PillChoice from '../../ui/PillChoice';
import { useConfirm } from '../../ui/ConfirmSheet';
import { GuestPickerSheet } from '../../features/GuestPickerField';
import { aggregateVotes } from '@/lib/pollAggregation';
import { initials } from '../../lib/format';
import { exportText } from '../../native';

const SEGMENTS = [{ key: 'polls', label: 'Polls' }, { key: 'games', label: 'Games' }];

/** Polls.jsx's templates, without the emoji (the app never renders one). */
export const POLL_TEMPLATES = [
  { category: 'Cocktails', title: 'Which cocktail should make the menu?', defaultOptions: ['Espresso Martini', 'Aperol Spritz', 'Margarita', 'French 75', 'Negroni'] },
  { category: 'First dance', title: 'Help us choose our first dance song', defaultOptions: [] },
  { category: 'Dance floor', title: 'What should fill the dance floor?', defaultOptions: ['90s classics', '2000s pop', 'Latin / salsa', 'Current hits', 'Mixed'] },
  { category: 'Midnight snack', title: 'What should we serve at midnight?', defaultOptions: ['Mini burgers', 'Pizza slices', 'Loaded fries', 'Tacos', 'Cheese board'] },
  { category: 'Welcome drink', title: 'What should guests arrive to?', defaultOptions: ['Champagne', 'Prosecco', 'Aperol Spritz', 'Fresh juice bar'] },
  { category: 'Afterparty', title: "What's the afterparty vibe?", defaultOptions: ['Rooftop bar', 'Club night', 'Karaoke', 'Back to the venue', 'Home party'] },
  { category: 'Dessert', title: "What's for dessert?", defaultOptions: ['Wedding cake only', 'Dessert bar', 'Ice cream cart', 'Donut wall', 'All of it'] },
  { category: 'Recovery brunch', title: 'What are we doing the morning after?', defaultOptions: ['Hotel brunch', 'Local cafe', 'Pool day', 'Everyone recovers privately'] },
  { category: 'Photobooth', title: "What's the photobooth theme?", defaultOptions: ['Classic Hollywood', 'Tropical', 'Disco', 'Romance', 'Festival'] },
  { category: 'Hashtag', title: 'Suggest our wedding hashtag', defaultOptions: [] },
];

/**
 * Polls & games, the desktop page's two sections. Polls live on
 * WeddingDetails.polls as Polls.jsx keeps them; counts merge PollVote rows
 * (aggregateVotes) with the snapshot; comments come from PollComment.
 * Games are Questionnaire records with their responses from the owner
 * endpoint. Owner fix 5: create, edit, delete, options, settings and
 * results, all here.
 */
export default function PollsScreen({ polls = [], votes = [], comments = [], games = [], responses = [], guests = [], siteUrl, onCreate, onUpdate, onEnd, onReopen, onDelete, onShare, onCreateGame, onToggleGame, onDeleteGame, onCopyGameLinks, loading, error, onRetry, back, onRefresh }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [sheet, setSheet] = useState(null); // { poll } | { template } | { custom: true } | { pick: true }
  const [gameSheet, setGameSheet] = useState(null); // { game } | { create: true }
  const [confirm, confirmEl] = useConfirm();
  const counts = useMemo(() => aggregateVotes(votes), [votes]);
  const countFor = (poll, o) => (counts[o.id] || 0) + (o.votes || 0);
  const live = polls.filter((p) => p.isActive !== false);
  const ended = polls.filter((p) => p.isActive === false);
  const remove = async (p) => { if (!(await confirm({ title: 'Delete this poll', body: `${p.title} and its votes come off your site.`, action: 'Delete' }))) return; await onDelete(p); setSheet(null); };
  const actions = segment === 'polls' ? [{ icon: Plus, label: 'New poll', onClick: () => setSheet({ pick: true }) }] : [{ icon: Plus, label: 'New game', onClick: () => setGameSheet({ create: true }) }];
  const subtitle = loading ? '' : segment === 'polls' ? `${live.length} live` : `${games.filter((g) => g.is_active !== false).length} open`;

  return (
    <Screen title="Polls & games" subtitle={subtitle} back={back} actions={actions} onRefresh={onRefresh}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : segment === 'polls' ? (
          polls.length === 0 ? (
            <EmptyState icon={BarChart2} text="No polls yet. Ask your guests something and watch the answers come in." actionLabel="New poll" onAction={() => setSheet({ pick: true })} />
          ) : (
            <>
              {siteUrl && <p className="oi-m-meta">Guests vote on your site under Polls. Results show in the guest suite.</p>}
              {[...live, ...ended].map((p) => <PollCard key={p.id} poll={p} countFor={countFor} comments={comments.filter((c) => c.poll_id === p.id)} onEdit={() => setSheet({ poll: p })} onEnd={() => onEnd(p)} onReopen={() => onReopen(p)} onDelete={() => remove(p)} onShare={() => onShare(p)} />)}
            </>
          )
        ) : (
          games.length === 0 ? (
            <EmptyState icon={Dices} text="No games yet. A quiz about the two of you, or a page of advice, goes out to the guests you choose." actionLabel="New game" onAction={() => setGameSheet({ create: true })} />
          ) : (
            <ItemList>
              {games.map((g) => { const n = responses.filter((r) => r.questionnaire_id === g.id).length; return <ItemCard key={g.id} icon={Dices} tile={g.is_active === false ? 'neutral' : 'tint'} title={g.title} meta={`${(g.questions || []).length} question${(g.questions || []).length === 1 ? '' : 's'}, ${g.recipient_mode === 'all' ? 'everyone' : g.recipient_mode === 'tag' ? (g.recipient_tags || []).join(', ') : `${(g.recipient_guest_ids || []).length} guests`}`} value={`${n} answer${n === 1 ? '' : 's'}`} badge={g.is_active === false ? 'Closed' : 'Open'} badgeTone={g.is_active === false ? 'neutral' : 'ok'} onClick={() => setGameSheet({ game: g })} />; })}
            </ItemList>
          )
        )}
      </div>

      {sheet?.pick && (
        <BottomSheet open onClose={() => setSheet(null)} title="Start from a template" full>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PillButton variant="primary" block onClick={() => setSheet({ custom: true })}>Write my own</PillButton>
            <RowGroup>
              {POLL_TEMPLATES.map((t) => <Row key={t.category} icon={BarChart2} tile="neutral" label={t.category} sub={t.title} wrap onClick={() => setSheet({ template: t })} />)}
            </RowGroup>
          </div>
        </BottomSheet>
      )}
      {(sheet?.poll || sheet?.template || sheet?.custom) && (
        <PollEditorSheet
          poll={sheet.poll || null}
          template={sheet.template || null}
          onClose={() => setSheet(null)}
          onSave={async (data) => { if (sheet.poll) await onUpdate(sheet.poll, data); else await onCreate(data); setSheet(null); }}
          onDelete={sheet.poll ? () => remove(sheet.poll) : undefined}
        />
      )}
      {gameSheet?.create && <GameEditorSheet guests={guests} onClose={() => setGameSheet(null)} onSave={async (data) => { await onCreateGame(data); setGameSheet(null); }} />}
      {gameSheet?.game && <GameResultsSheet game={games.find((g) => g.id === gameSheet.game.id) || gameSheet.game} responses={responses.filter((r) => r.questionnaire_id === gameSheet.game.id)} onClose={() => setGameSheet(null)} onToggle={() => onToggleGame(gameSheet.game)} onCopyLinks={() => onCopyGameLinks(gameSheet.game)} onDelete={async () => { if (!(await confirm({ title: 'Delete this game', body: 'Its answers are removed too.', action: 'Delete' }))) return; await onDeleteGame(gameSheet.game); setGameSheet(null); }} />}
      {confirmEl}
    </Screen>
  );
}

function PollCard({ poll: p, countFor, comments, onEdit, onEnd, onReopen, onDelete, onShare }) {
  const [showComments, setShowComments] = useState(false);
  const total = (p.options || []).reduce((s, o) => s + countFor(p, o), 0);
  const allComments = [...(comments || []).map((c) => c.text), ...(p.comments || []).map((c) => (typeof c === 'string' ? c : c?.text)).filter(Boolean)];
  return (
    <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {p.category && <div className="oi-m-meta">{p.category}</div>}
          <div className="oi-m-body oi-m-strong" style={{ overflowWrap: 'anywhere' }}>{p.title}</div>
        </div>
        <StatusPill tone={p.isActive === false ? 'neutral' : 'ok'}>{p.isActive === false ? 'Ended' : 'Live'}</StatusPill>
      </div>
      {(p.options || []).map((o) => (
        <div key={o.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{o.label}</span>
            <span className="oi-m-meta">{countFor(p, o)}</span>
          </div>
          <ProgressBar value={countFor(p, o)} max={total || 1} />
        </div>
      ))}
      {p.avaInsight && <div className="oi-m-panel oi-m-panel--tint" style={{ minHeight: 0, padding: '12px 16px', gap: 4 }}><span className="oi-m-meta"><span aria-hidden="true">✦</span> From Ava</span><span className="oi-m-body">{p.avaInsight}</span></div>}
      {p.allowComments && allComments.length > 0 && (
        <div>
          <button type="button" className="oi-m-block__link" style={{ margin: 0, minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setShowComments((v) => !v)}><MessageCircle size={14} /> {showComments ? 'Hide comments' : `${allComments.length} comment${allComments.length === 1 ? '' : 's'}`}</button>
          {showComments && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>{allComments.slice(-5).map((c, i) => <p key={i} className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{c}</p>)}</div>}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="oi-m-meta">{total} vote{total === 1 ? '' : 's'}{p.allowComments ? '' : ', comments off'}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Edit poll" onClick={onEdit}><Pencil size={18} strokeWidth={1.75} /></button>
          <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Share poll" onClick={onShare}><Share2 size={18} strokeWidth={1.75} /></button>
          <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Delete poll" onClick={onDelete}><Trash2 size={18} strokeWidth={1.75} /></button>
          {p.isActive !== false ? <PillButton variant="secondary" size="sm" onClick={onEnd}>End poll</PillButton> : <PillButton variant="secondary" size="sm" onClick={onReopen}>Reopen</PillButton>}
        </div>
      </div>
    </div>
  );
}

/** Polls.jsx's PollEditor: title, options (at least two), allow comments. Editing keeps option ids so votes stay attached. */
function PollEditorSheet({ poll, template, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(poll?.title || template?.title || '');
  const [options, setOptions] = useState(() => (poll ? poll.options.map((o) => ({ ...o })) : (template?.defaultOptions?.length ? template.defaultOptions : ['', '']).map((label, i) => ({ id: `new-${i}`, label }))));
  const [allowComments, setAllowComments] = useState(poll ? poll.allowComments !== false : true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const clean = options.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label);
    if (!title.trim()) { setErr('Give the poll a question.'); return; }
    if (clean.length < 2) { setErr('Add at least two options.'); return; }
    setSaving(true); setErr('');
    try { await onSave({ title: title.trim(), options: clean, allowComments, category: poll?.category || template?.category || 'Custom' }); } catch (e) { setErr(e?.message || 'Could not save the poll.'); } finally { setSaving(false); }
  };
  return (
    <BottomSheet open onClose={onClose} title={poll ? 'Edit poll' : template ? template.category : 'New poll'} full footer={(
      <>
        {onDelete && <PillButton variant="ghost" onClick={onDelete} disabled={saving} style={{ color: 'var(--m-primary)' }}>Delete</PillButton>}
        <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : poll ? 'Save' : 'Create poll'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Question" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Which cocktail should make the menu?" error={err} />
        <div className="oi-m-field">
          <span className="oi-m-field__label">Options</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="oi-m-input" value={o.label} onChange={(e) => setOptions((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={`Option ${i + 1}`} />
                {options.length > 2 && <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Remove option" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))}><X size={18} /></button>}
              </div>
            ))}
          </div>
          <PillButton variant="secondary" size="sm" icon={Plus} onClick={() => setOptions((l) => [...l, { id: `new-${Date.now()}`, label: '' }])} style={{ alignSelf: 'flex-start', marginTop: 8 }}>Add an option</PillButton>
        </div>
        <div className="oi-m-row" style={{ padding: '8px 4px', background: 'transparent' }}>
          <div className="oi-m-row__body"><div className="oi-m-row__label">Allow guest comments</div></div>
          <Switch on={allowComments} onChange={setAllowComments} label="Allow guest comments" />
        </div>
      </div>
    </BottomSheet>
  );
}

/** GamesManager's create form: title, intro, questions (short text or multiple choice), recipients. */
function GameEditorSheet({ guests, onClose, onSave }) {
  const genId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [questions, setQuestions] = useState([{ id: genId(), text: '', type: 'short_text', options: [] }]);
  const [mode, setMode] = useState('all');
  const [tags, setTags] = useState([]);
  const [ids, setIds] = useState([]);
  const [pick, setPick] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const allTags = useMemo(() => [...new Set(guests.flatMap((g) => (Array.isArray(g.tags) ? g.tags : [])))].sort(), [guests]);
  const setQ = (id, patch) => setQuestions((l) => l.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const valid = questions.filter((q) => q.text.trim());
  const canSave = title.trim() && valid.length > 0 && (mode !== 'tag' || tags.length) && (mode !== 'individual' || ids.length);
  const save = async () => {
    if (!canSave) { setErr(!title.trim() ? 'Give the game a title.' : !valid.length ? 'Add at least one question.' : mode === 'tag' ? 'Choose at least one tag.' : 'Choose at least one guest.'); return; }
    setSaving(true); setErr('');
    try { await onSave({ title: title.trim(), intro: intro.trim(), questions: valid.map((q) => ({ id: q.id, text: q.text.trim(), type: q.type, options: q.type === 'multiple_choice' ? q.options.filter((o) => o.trim()) : [] })), recipient_mode: mode, recipient_tags: mode === 'tag' ? tags : [], recipient_guest_ids: mode === 'individual' ? ids : [], is_active: true }); } catch (e) { setErr(e?.message || 'Could not create the game.'); } finally { setSaving(false); }
  };
  return (
    <>
      <BottomSheet open onClose={onClose} title="New game" full footer={(
        <>
          <PillButton variant="secondary" onClick={onClose} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? 'Creating' : 'Create game'}</PillButton>
        </>
      )}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How well do you know the couple?" />
          <TextField label="Intro" value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Shown to guests before they start" />
          <h3 className="oi-m-section">Questions</h3>
          {questions.map((q, i) => (
            <div key={q.id} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><TextField label={`Question ${i + 1}`} value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} /></div>
                {questions.length > 1 && <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Remove question" onClick={() => setQuestions((l) => l.filter((x) => x.id !== q.id))}><X size={18} /></button>}
              </div>
              <SelectField label="Answer type" value={q.type} onChange={(e) => setQ(q.id, { type: e.target.value, options: e.target.value === 'multiple_choice' ? (q.options.length ? q.options : ['', '']) : [] })} options={[{ value: 'short_text', label: 'Short answer' }, { value: 'multiple_choice', label: 'Multiple choice' }]} />
              {q.type === 'multiple_choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((o, oi) => <input key={oi} className="oi-m-input" value={o} onChange={(e) => setQ(q.id, { options: q.options.map((x, j) => (j === oi ? e.target.value : x)) })} placeholder={`Option ${oi + 1}`} />)}
                  <PillButton variant="secondary" size="sm" icon={Plus} onClick={() => setQ(q.id, { options: [...q.options, ''] })} style={{ alignSelf: 'flex-start' }}>Add an option</PillButton>
                </div>
              )}
            </div>
          ))}
          <PillButton variant="secondary" icon={Plus} onClick={() => setQuestions((l) => [...l, { id: genId(), text: '', type: 'short_text', options: [] }])} style={{ alignSelf: 'flex-start' }}>Add a question</PillButton>
          <PillChoice label="Who is this for" options={[{ value: 'all', label: 'All guests' }, { value: 'tag', label: 'By tag' }, { value: 'individual', label: 'Chosen guests' }]} value={mode} onChange={(v) => v && setMode(v)} />
          {mode === 'tag' && (allTags.length ? <PillChoice label="Tags" options={allTags} value={tags} onChange={setTags} multi /> : <p className="oi-m-meta">No tags on your guest list yet.</p>)}
          {mode === 'individual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PillButton variant="secondary" onClick={() => setPick(true)} style={{ alignSelf: 'flex-start' }}>Choose guests ({ids.length})</PillButton>
              {ids.length > 0 && <RowGroup>{guests.filter((g) => ids.includes(g.id)).map((g) => <Row key={g.id} initials={initials(g.name)} label={g.name} trailing={<button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label={`Remove ${g.name}`} onClick={() => setIds((l) => l.filter((x) => x !== g.id))}><X size={16} /></button>} chevron={false} />)}</RowGroup>}
            </div>
          )}
          {err && <p className="oi-m-field__error" role="alert">{err}</p>}
        </div>
      </BottomSheet>
      <GuestPickerSheet open={pick} onClose={() => setPick(false)} multi selected={ids} title="Choose guests" onPick={(v) => { if (v.guestId) setIds((l) => (l.includes(v.guestId) ? l.filter((x) => x !== v.guestId) : [...l, v.guestId])); }} />
    </>
  );
}

/** GameResponses: answers per question, copy links, close or reopen, share the answers (the desktop prints), delete. */
function GameResultsSheet({ game, responses, onClose, onToggle, onCopyLinks, onDelete }) {
  const answers = (qid) => responses.map((r) => ({ name: r.guest_name, a: (r.answers || []).find((x) => x.question_id === qid)?.answer })).filter((x) => x.a);
  const shareAnswers = async () => {
    const text = [game.title, '', ...(game.questions || []).flatMap((q, i) => [`${i + 1}. ${q.text}`, ...answers(q.id).map((x) => `  ${x.name}: ${x.a}`), ''])].join('\n');
    const r = await exportText(`${game.title}.txt`, 'text/plain', text);
    if (r === 'failed') toast.error('Could not share the answers.');
  };
  return (
    <BottomSheet open onClose={onClose} title={game.title} full footer={(
      <>
        <PillButton variant="secondary" onClick={onToggle}>{game.is_active === false ? 'Reopen' : 'Close game'}</PillButton>
        <PillButton variant="primary" icon={Link2} onClick={onCopyLinks} style={{ flex: 1 }}>Copy links</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {game.intro && <p className="oi-m-meta">{game.intro}</p>}
        <p className="oi-m-body">{responses.length} answer{responses.length === 1 ? '' : 's'} so far{game.is_active === false ? ', now closed' : ''}.</p>
        {(game.questions || []).map((q, i) => {
          const list = answers(q.id);
          return (
            <div key={q.id} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="oi-m-body oi-m-strong">{i + 1}. {q.text}</div>
              {list.length === 0 ? <p className="oi-m-meta">No answers yet</p> : list.map((x, j) => <div key={j} className="oi-m-meta" style={{ color: 'var(--m-text)' }}><span style={{ color: 'var(--m-text-2)' }}>{x.name}: </span>{x.a}</div>)}
            </div>
          );
        })}
        <RowGroup>
          <Row icon={Printer} tile="neutral" label="Share the answers" sub="As text, to print or send on" onClick={shareAnswers} chevron={false} />
          <Row icon={Trash2} tile="warn" label="Delete this game" sub="Its answers go too" onClick={onDelete} chevron={false} />
        </RowGroup>
      </div>
    </BottomSheet>
  );
}
