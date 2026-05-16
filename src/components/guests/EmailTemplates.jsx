import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Mail, Send, Sparkles, ChevronDown, ChevronUp, Edit2,
  CheckCircle2, Clock, XCircle, Users, Loader2, Eye, X, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_TEMPLATES = [
  {
    id: 'rsvp_reminder',
    name: 'RSVP reminder',
    type: 'rsvp_reminder',
    icon: Clock,
    iconBg: 'rgba(221,247,98,0.25)',
    iconColor: '#6b7700',
    targetStatus: ['pending'],
    targetCategories: [],
    subject: "We'd love to hear from you!",
    body: `Hi {{guest_name}},\n\nWe hope this message finds you well! We're reaching out because we haven't yet received your RSVP for our special day.\n\nWe'd be so grateful if you could let us know whether you'll be joining us — it helps us plan everything perfectly for our guests.\n\nPlease RSVP by {{rsvp_deadline}}.\n\nWith love,\n{{couple_names}}`,
  },
  {
    id: 'thank_you_attending',
    name: 'Thank you (attending)',
    type: 'thank_you',
    icon: CheckCircle2,
    iconBg: 'rgba(221,247,98,0.25)',
    iconColor: '#6b7700',
    targetStatus: ['attending'],
    targetCategories: [],
    subject: "We can't wait to celebrate with you!",
    body: `Dear {{guest_name}},\n\nThank you so much for confirming your attendance at our wedding! We are absolutely thrilled that you'll be celebrating this special day with us.\n\nYour presence means the world to us, and we can't wait to make beautiful memories together.\n\nThe wedding is on {{wedding_date}}. Please don't hesitate to reach out if you have any questions.\n\nWith all our love,\n{{couple_names}}`,
  },
  {
    id: 'thank_you_declined',
    name: 'Thank you (declined)',
    type: 'thank_you',
    icon: XCircle,
    iconBg: 'rgba(10,10,10,0.06)',
    iconColor: '#444444',
    targetStatus: ['declined'],
    targetCategories: [],
    subject: "We'll miss you on our special day",
    body: `Dear {{guest_name}},\n\nThank you for letting us know that you won't be able to join us on our wedding day. We completely understand and appreciate you taking the time to respond.\n\nYou will certainly be missed, and we hope to celebrate with you another time soon.\n\nWith love and gratitude,\n{{couple_names}}`,
  },
  {
    id: 'event_update',
    name: 'Event update',
    type: 'event_update',
    icon: Mail,
    iconBg: 'rgba(128,61,129,0.12)',
    iconColor: '#803D81',
    targetStatus: ['attending'],
    targetCategories: [],
    subject: 'Important update about our wedding',
    body: `Dear {{guest_name}},\n\nWe wanted to share an important update regarding our upcoming wedding celebration.\n\n[Add your update here — venue change, time adjustment, dress code reminder, etc.]\n\nPlease don't hesitate to reach out if you have any questions.\n\nWith love,\n{{couple_names}}`,
  },
  {
    id: 'family_special',
    name: 'Family welcome',
    type: 'custom',
    icon: Users,
    iconBg: 'rgba(224,53,83,0.1)',
    iconColor: '#E03553',
    targetStatus: [],
    targetCategories: ['family', 'partners_family'],
    subject: 'A special note for our beloved family',
    body: `Dear {{guest_name}},\n\nAs family, you hold a truly special place in our hearts and in our upcoming celebration. We wanted to take a moment to personally reach out to you.\n\nYour love and support over the years has meant everything to us, and we cannot imagine our wedding day without you by our side.\n\nWe look forward to celebrating with you on {{wedding_date}}.\n\nWith all our love,\n{{couple_names}}`,
  },
];

const VARIABLES = ['{{guest_name}}', '{{couple_names}}', '{{wedding_date}}', '{{rsvp_deadline}}'];

const STATUS_FILTERS = [
  { val: 'pending',   label: 'Pending',   activeStyle: { background: 'rgba(10,10,10,0.08)', color: '#444444', borderColor: 'rgba(10,10,10,0.2)' } },
  { val: 'attending', label: 'Attending', activeStyle: { background: '#DDF762', color: '#0A1930', borderColor: '#DDF762' } },
  { val: 'declined',  label: 'Declined',  activeStyle: { background: '#E03553', color: '#FFFFFF', borderColor: '#E03553' } },
  { val: 'maybe',     label: 'Maybe',     activeStyle: { background: '#803D81', color: '#FFFFFF', borderColor: '#803D81' } },
];

const CATEGORY_LABELS = {
  family: 'Family', friends: 'Friends', colleagues: 'Colleagues',
  partners_family: "Partner's family", partners_friends: "Partner's friends",
};

const bodyFont = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function EmailTemplates({ guests }) {
  const [selectedTemplate, setSelectedTemplate] = useState(PRESET_TEMPLATES[0]);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [previewGuest, setPreviewGuest] = useState(null);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  const targetGuests = useMemo(() => {
    const statuses = filterStatus.length > 0 ? filterStatus : selectedTemplate.targetStatus;
    const categories = filterCategories.length > 0 ? filterCategories : selectedTemplate.targetCategories;
    return guests.filter(g => {
      const hasEmail = !!g.email;
      const statusMatch = statuses.length === 0 || statuses.includes(g.rsvp_status || 'pending');
      const categoryMatch = categories.length === 0 || categories.includes(g.category);
      return hasEmail && statusMatch && categoryMatch;
    });
  }, [guests, filterStatus, filterCategories, selectedTemplate]);

  const activeSubject = editing ? editSubject : selectedTemplate.subject;
  const activeBody = editing ? editBody : selectedTemplate.body;

  const applyVars = (text, guest) => text
    .replace(/{{guest_name}}/g, guest?.name || 'Guest')
    .replace(/{{couple_names}}/g, 'The Happy Couple')
    .replace(/{{wedding_date}}/g, 'our wedding day')
    .replace(/{{rsvp_deadline}}/g, 'as soon as possible');

  const selectTemplate = (t) => { setSelectedTemplate(t); setEditing(false); setFilterStatus([]); setFilterCategories([]); };
  const startEdit = () => { setEditSubject(selectedTemplate.subject); setEditBody(selectedTemplate.body); setEditing(true); };
  const toggleArr = (arr, setArr, val) => setArr(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a warm, heartfelt wedding guest email for the following request: "${aiPrompt}". Use these placeholder variables where appropriate: {{guest_name}}, {{couple_names}}, {{wedding_date}}, {{rsvp_deadline}}. Return ONLY a JSON object with "subject" (short, engaging email subject line) and "body" (the full email body, plain text, no HTML).`,
      response_json_schema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } } },
    });
    if (result?.subject && result?.body) { setEditSubject(result.subject); setEditBody(result.body); setEditing(true); }
    setAiGenerating(false); setShowAiInput(false); setAiPrompt('');
    toast.success('AI email generated!');
  };

  const sendEmails = async () => {
    if (targetGuests.length === 0) return toast.error('No guests match the current filters');
    setSending(true); setSentCount(0);
    let sent = 0;
    for (const guest of targetGuests) {
      await base44.integrations.Core.SendEmail({ to: guest.email, subject: applyVars(activeSubject, guest), body: applyVars(activeBody, guest) });
      sent++; setSentCount(sent);
    }
    setSending(false);
    toast.success(`Sent to ${sent} guest${sent !== 1 ? 's' : ''}!`);
  };


  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>

      {/* ── Left: template picker ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={sectionLabel}>Templates</p>
        {PRESET_TEMPLATES.map(t => {
          const Icon = t.icon;
          const isActive = selectedTemplate.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 12px',
                border: '1px solid',
                borderColor: isActive ? 'rgba(10,10,10,0.15)' : 'rgba(10,10,10,0.08)',
                borderLeft: isActive ? '2px solid #E03553' : '2px solid transparent',
                background: isActive ? 'rgba(224,53,83,0.04)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.iconBg, flexShrink: 0 }}>
                  <Icon size={13} style={{ color: t.iconColor }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', margin: 0, ...bodyFont }}>{t.name}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {t.targetStatus.map(s => <span key={s} style={{ fontSize: 10, color: 'rgba(10,10,10,0.4)', ...bodyFont, textTransform: 'capitalize' }}>{s}</span>)}
                    {t.targetCategories.map(c => <span key={c} style={{ fontSize: 10, color: 'rgba(10,10,10,0.4)', ...bodyFont, textTransform: 'capitalize' }}>{CATEGORY_LABELS[c] || c}</span>)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* AI generator */}
        <div style={{ border: '1px dashed rgba(10,10,10,0.18)', padding: 10, marginTop: 4 }}>
          <button
            onClick={() => setShowAiInput(!showAiInput)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#803D81', background: 'none', border: 'none', cursor: 'pointer', width: '100%', ...bodyFont }}
          >
            <Sparkles size={13} />
            Generate with AI
            {showAiInput ? <ChevronUp size={11} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={11} style={{ marginLeft: 'auto' }} />}
          </button>
          {showAiInput && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                style={{ width: '100%', fontSize: 11, border: '1px solid rgba(10,10,10,0.15)', padding: '6px 8px', height: 64, resize: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", borderRadius: 0, outline: 'none', boxSizing: 'border-box' }}
                placeholder="e.g. A warm reminder for friends who haven't RSVPed yet…"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button
                onClick={generateWithAI}
                disabled={aiGenerating}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11 }}
              >
                {aiGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {aiGenerating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: editor + filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Filters */}
        <div style={{ background: '#F5F5F5', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#444444', margin: 0, ...bodyFont }}>Send to guests matching:</p>
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUS_FILTERS.map(({ val, label, activeStyle }) => {
                const isActive = filterStatus.includes(val);
                return (
                  <button
                    key={val}
                    onClick={() => toggleArr(filterStatus, setFilterStatus, val)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 12px',
                      borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s',
                      border: '1px solid',
                      ...(isActive ? activeStyle : { background: '#FFFFFF', color: '#444444', borderColor: 'rgba(10,10,10,0.18)' }),
                      ...bodyFont,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => {
                const isActive = filterCategories.includes(val);
                return (
                  <button
                    key={val}
                    onClick={() => toggleArr(filterCategories, setFilterCategories, val)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 12px',
                      borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s',
                      border: '1px solid',
                      background: isActive ? '#0A0A0A' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#444444',
                      borderColor: isActive ? '#0A0A0A' : 'rgba(10,10,10,0.18)',
                      ...bodyFont,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={{ fontSize: 12, color: '#444444', margin: 0, ...bodyFont }}>
              <span style={{ fontWeight: 700, color: '#0A0A0A' }}>{targetGuests.length}</span> guest{targetGuests.length !== 1 ? 's' : ''} will receive this email
              {targetGuests.length < guests.filter(g => g.email).length && (
                <span style={{ color: 'rgba(10,10,10,0.4)' }}> (of {guests.filter(g => g.email).length} with email)</span>
              )}
            </p>
            {targetGuests.length > 0 && (
              <button
                onClick={() => setPreviewGuest(targetGuests[0])}
                style={{ fontSize: 11, color: '#803D81', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, ...bodyFont, fontWeight: 600 }}
              >
                <Eye size={12} />Preview
              </button>
            )}
          </div>
        </div>

        {/* Email editor */}
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: 0, ...bodyFont }}>Email content</p>
            {!editing && (
              <button
                onClick={startEdit}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#444444', background: 'none', border: 'none', cursor: 'pointer', ...bodyFont, fontWeight: 600 }}
              >
                <Edit2 size={11} />Edit
              </button>
            )}
          </div>
          <div>
            {editing ? (
              <input
                style={{ width: '100%', fontSize: 13, fontWeight: 500, border: '0', borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '6px 0', outline: 'none', background: 'transparent', ...bodyFont, boxSizing: 'border-box' }}
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
              />
            ) : (
              <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', margin: 0, padding: '8px 12px', background: '#F5F5F5', ...bodyFont }}>{activeSubject}</p>
            )}
          </div>
          <div>
            {editing ? (
              <textarea
                style={{ width: '100%', fontSize: 12, border: '1px solid rgba(10,10,10,0.15)', padding: '8px 12px', height: 200, resize: 'none', fontFamily: 'monospace', lineHeight: 1.6, outline: 'none', borderRadius: 0, boxSizing: 'border-box' }}
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
              />
            ) : (
              <pre style={{ fontSize: 12, color: '#444444', background: '#F5F5F5', padding: '8px 12px', whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6, height: 200, overflowY: 'auto', margin: 0 }}>{activeBody}</pre>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, ...bodyFont }}>
            Variables:{' '}
            {VARIABLES.map(v => (
              <code key={v} style={{ background: 'rgba(10,10,10,0.06)', color: '#444444', padding: '1px 5px', fontFamily: 'monospace', fontSize: 10, margin: '0 2px' }}>{v}</code>
            ))}
          </p>
        </div>

        {/* Send button */}
        <button
          onClick={sendEmails}
          disabled={sending || targetGuests.length === 0}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', opacity: targetGuests.length === 0 ? 0.4 : 1 }}
        >
          {sending ? (
            <><Loader2 size={14} className="animate-spin" />Sending… ({sentCount}/{targetGuests.length})</>
          ) : (
            <><Send size={14} />Send to {targetGuests.length} guest{targetGuests.length !== 1 ? 's' : ''}</>
          )}
        </button>
      </div>

      {/* Preview modal */}
      {previewGuest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 24 }}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0, ...bodyFont }}>Preview — {previewGuest.name}</p>
              <button onClick={() => setPreviewGuest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#F5F5F5', padding: '10px 14px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', margin: 0, ...bodyFont }}>{applyVars(activeSubject, previewGuest)}</p>
              </div>
              <div style={{ background: '#F5F5F5', padding: '10px 14px', maxHeight: 280, overflowY: 'auto' }}>
                <pre style={{ fontSize: 12, color: '#444444', whiteSpace: 'pre-wrap', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6, margin: 0 }}>{applyVars(activeBody, previewGuest)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
