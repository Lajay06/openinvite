import React, { useState } from 'react';
import { Sparkles, CheckCircle, X } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const labelStyle = {
  color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function Spinner() {
  return (
    <>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF', borderRadius: '50%', animation: '_spin 0.7s linear infinite', flexShrink: 0 }} />
    </>
  );
}

export default function AISeatingGenerator({ attendees, hostsById, tables, onApplySeating, onClose }) {
  const [loading, setLoading] = useState(false);
  const [seatingPlan, setSeatingPlan] = useState(null);
  const [step, setStep] = useState('generate');

  const handleGenerate = async () => {
    setLoading(true);
    const tid = toast.loading('Ava is analyzing guest relationships…');
    try {
      // ONE ROW PER PERSON TO SEAT, not one per Guest record with a `+1`
      // attribute. Previously a plus-one was `plus_one: true` on their host, so
      // the model had no id it could return for them and never allocated them a
      // seat — while being told to "keep plus-ones together". The capacity
      // arithmetic was wrong by exactly the number of plus-ones at each table.
      //
      // A plus-one carries ONLY what is theirs: their name and their dietary
      // requirements. category, tags, seating_preferences and seating_avoid are
      // deliberately NOT inherited from the host — "sit with the host" is
      // already stated once by plusOneOf plus instruction 3, and copying the
      // host's preferences would restate the same constraint in a weaker form
      // while inventing ones that are not true (a host's "avoid Table 3" is not
      // the plus-one's avoidance). One statement of a constraint, in the place
      // that owns it.
      const guestData = attendees.map(a => (a.isPlusOne
        ? {
            id: a.id,
            name: a.name,
            isPlusOne: true,
            plusOneOf: a.hostGuestId,
            dietary_restrictions: a.dietary_restrictions,
          }
        : {
            id: a.id,
            name: a.name,
            isPlusOne: false,
            plusOneOf: null,
            category: hostsById.get(a.id)?.category,
            tags: hostsById.get(a.id)?.tags || [],
            seating_preferences: hostsById.get(a.id)?.seating_preferences || [],
            seating_avoid: hostsById.get(a.id)?.seating_avoid || [],
            dietary_restrictions: a.dietary_restrictions,
            special_requests: hostsById.get(a.id)?.special_requests,
          }));
      const tableData = tables.map(t => ({
        id: t.id, name: t.name, capacity: t.capacity, shape: t.shape,
        currentlyAssigned: (t.assigned_guests || []).length,
      }));

      const response = await InvokeLLM({
        prompt: `You are an expert wedding planner specialising in optimal seating arrangements.

Analyze these ${guestData.length} wedding attendees and ${tableData.length} tables to create the perfect seating chart.

GUESTS: ${JSON.stringify(guestData)}

TABLES: ${JSON.stringify(tableData)}

INSTRUCTIONS:
1. PRIORITISE TAGS: group guests with matching tags together (e.g. all "College Friends" at one table)
2. Secondary grouping by relationship category (family, friends, colleagues)
3. Every person listed needs their own seat, including plus-ones. A plus-one has isPlusOne: true and plusOneOf giving their host's id — seat them at the same table as their host. Respect seating preferences.
4. Balance table sizes evenly; consider dietary restrictions

Return assignments[], unassigned[], and summary.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            assignments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tableId: { type: 'string' },
                  tableName: { type: 'string' },
                  guests: { type: 'array', items: { type: 'string' } },
                  reasoning: { type: 'string' },
                },
              },
            },
            unassigned: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
        },
      });

      setSeatingPlan(response);
      setStep('review');
      toast.success('Seating plan ready', { id: tid });
    } catch {
      toast.error('Failed to generate plan', { id: tid });
    }
    setLoading(false);
  };

  const handleApply = async () => {
    try {
      await onApplySeating(seatingPlan);
      onClose();
    } catch { /* parent handles error */ }
  };

  const getGuestName = (id) => attendees.find(a => a.id === id)?.name || 'Unknown';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="Ask Ava — allocate seats" className="max-w-[680px] max-h-[90vh] overflow-y-auto p-0 gap-0">

        {/* Header */}
        <div style={{ background: '#0A1930', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={15} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Ask Ava — allocate seats
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── Generate step ── */}
          {step === 'generate' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'People to seat', value: attendees.length, color: '#E03553' },
                  { label: 'Tables available', value: tables.length, color: '#803D81' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, border: '1px solid rgba(10,10,10,0.08)', padding: '20px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: 36, fontWeight: 700, color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ ...labelStyle, margin: '8px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* What Ava considers */}
              <div style={{ borderLeft: '3px solid #803D81', padding: '12px 16px', background: 'rgba(128,61,129,0.04)', marginBottom: 24 }}>
                <p style={{ ...labelStyle, color: '#803D81', margin: '0 0 10px' }}>What Ava considers</p>
                {[
                  'Guest tags (primary grouping — e.g. College Friends, Work Team)',
                  'Relationship categories (family, friends, colleagues)',
                  'Seating preferences and plus-one pairings',
                  'Table capacity constraints',
                  'Dietary restrictions and special needs',
                ].map((item, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.05)' : 'none' }}>
                    <span style={{ color: '#803D81', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>—</span>
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || attendees.length === 0 || tables.length === 0}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', fontSize: 14, opacity: loading || attendees.length === 0 || tables.length === 0 ? 0.6 : 1 }}
              >
                {loading ? <Spinner /> : <Sparkles size={14} />}
                {loading ? 'Asking Ava…' : 'Ask Ava for a seating plan'}
              </button>
            </div>
          )}

          {/* ── Review step ── */}
          {step === 'review' && seatingPlan && (
            <div>
              {/* Summary */}
              {seatingPlan.summary && (
                <div style={{ borderLeft: '3px solid #DDF762', padding: '12px 16px', background: 'rgba(221,247,98,0.08)', marginBottom: 20 }}>
                  <p style={{ ...labelStyle, color: '#6b7700', margin: '0 0 6px' }}>Ava's strategy</p>
                  <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, lineHeight: 1.55 }}>{seatingPlan.summary}</p>
                </div>
              )}

              <p style={{ ...labelStyle, margin: '0 0 12px' }}>Table assignments</p>

              {seatingPlan.assignments?.map((a, i) => {
                const tbl = tables.find(t => t.id === a.tableId);
                const assignedGuests = (a.guests || []).map(id => attendees.find(x => x.id === id)).filter(Boolean);
                return (
                  <div key={i} style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 12 }}>
                    <div style={{ padding: '10px 16px', background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.tableName}</span>
                      <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {assignedGuests.length}/{tbl?.capacity ?? '?'} seats
                      </span>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: a.reasoning ? 10 : 0 }}>
                        {assignedGuests.map(g => (
                          <span key={g.id} style={{
                            fontSize: 11, fontWeight: 600, color: '#0A0A0A',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            padding: '3px 10px', borderRadius: 999,
                            background: 'rgba(10,10,10,0.06)',
                          }}>
                            {g.name}
                          </span>
                        ))}
                      </div>
                      {a.reasoning && (
                        <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, paddingTop: 10, borderTop: '1px solid rgba(10,10,10,0.06)', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700, color: '#0A0A0A' }}>Reasoning: </span>{a.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned */}
              {seatingPlan.unassigned?.length > 0 && (
                <div style={{ borderLeft: '3px solid #E03553', padding: '12px 16px', background: 'rgba(224,53,83,0.04)', marginBottom: 20 }}>
                  <p style={{ ...labelStyle, color: '#E03553', margin: '0 0 8px' }}>Unassigned guests</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {seatingPlan.unassigned.map(id => (
                      <span key={id} style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 999,
                        border: '1px solid rgba(224,53,83,0.3)', color: '#E03553',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        {getGuestName(id)}
                      </span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0 0' }}>
                    These guests couldn't be automatically placed — assign them manually or adjust table capacities.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                <button className="btn-editorial-secondary" style={{ flex: 1 }} onClick={() => setStep('generate')}>
                  Ask Ava for a new plan
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={handleApply}
                >
                  <CheckCircle size={13} />Apply seating plan
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
