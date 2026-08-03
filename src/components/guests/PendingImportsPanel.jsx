import React, { useState } from 'react';
import { X, UserPlus, Merge } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * Review panel for Contact Collector submissions (PR B3) — pending rows
 * from GuestContactSubmission, gathered via the public /w/:slug/collect
 * form. Approving a submission is the one moment it ever becomes a real
 * Guest record; nothing on the public form writes to Guest directly.
 * Merge only ever fills blanks on the existing guest, never overwrites a
 * field that already has a value — same convention rsvp-submit.js already
 * uses for Guest.email.
 *
 * fix/guest-contact-submission-rls (PR 1b): every action below now goes
 * through api/guest-contact-review.js instead of calling
 * base44.entities.GuestContactSubmission/.Guest directly — the entity's
 * contact fields are encrypted at rest, and its update RLS is open (see
 * that file's header for why), so ownership is verified server-side
 * before anything is written.
 */
async function reviewAction(body) {
  const res = await fetch('/api/guest-contact-review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`guest-contact-review failed (${res.status})`);
}

export default function PendingImportsPanel({ submissions, guests, onClose, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [mergeTargets, setMergeTargets] = useState({}); // submissionId -> guestId

  const approveAsNew = async (submission) => {
    setBusyId(submission.id);
    try {
      await reviewAction({ submissionId: submission.id, action: 'approve' });
      toast.success(`${submission.name} added to your guest list`);
      onChanged();
    } catch {
      toast.error('Could not add guest — please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const mergeIntoExisting = async (submission) => {
    const targetId = mergeTargets[submission.id];
    if (!targetId) return;
    const target = guests.find(g => g.id === targetId);
    if (!target) return;
    setBusyId(submission.id);
    try {
      await reviewAction({ submissionId: submission.id, action: 'merge', mergeGuestId: targetId });
      toast.success(`Merged into ${target.name}`);
      onChanged();
    } catch {
      toast.error('Could not merge — please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (submission) => {
    setBusyId(submission.id);
    try {
      await reviewAction({ submissionId: submission.id, action: 'dismiss' });
      onChanged();
    } catch {
      toast.error('Could not dismiss — please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: 640, padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>Pending imports</p>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '2px 0 0', fontFamily: PJS }}>
              {submissions.length} {submissions.length === 1 ? 'person has' : 'people have'} shared their details via your collect link
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {submissions.length === 0 ? (
            <p style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
              No pending submissions.
            </p>
          ) : submissions.map(s => (
            <div key={s.id} style={{ padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS }}>{s.name}</p>
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: '0 0 12px', fontFamily: PJS }}>
                {[s.email, s.phone, s.mailing_address].filter(Boolean).join(' · ') || 'No contact details given'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => approveAsNew(s)}
                  disabled={busyId === s.id}
                  className="btn-editorial-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <UserPlus size={13} /> Add as new
                </button>

                <Select value={mergeTargets[s.id] || ''} onValueChange={v => setMergeTargets(prev => ({ ...prev, [s.id]: v }))}>
                  <SelectTrigger style={{ width: 160, height: 32, fontSize: 12, fontFamily: PJS }}>
                    <SelectValue placeholder="Merge into…" />
                  </SelectTrigger>
                  <SelectContent>
                    {guests.map(g => (
                      <SelectItem key={g.id} value={g.id} style={{ fontSize: 12, fontFamily: PJS }}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => mergeIntoExisting(s)}
                  disabled={busyId === s.id || !mergeTargets[s.id]}
                  className="btn-editorial-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: mergeTargets[s.id] ? 1 : 0.4 }}
                >
                  <Merge size={13} /> Merge
                </button>

                <button
                  onClick={() => dismiss(s)}
                  disabled={busyId === s.id}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
