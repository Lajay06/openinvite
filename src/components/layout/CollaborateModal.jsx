
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { COLLABORATOR_PERMISSION_KEYS, COLLABORATOR_PAGE_MAP, COLLABORATOR_SUGGEST_PAGES, COLLABORATOR_PICKER_LABEL, collaboratorCan, collaboratorPageSuffix } from '@/lib/collaboratorPageMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Added this import
import { X, Users, Send, Edit, Trash2, Eye, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { color } from '@/styles/tokens';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const Collaborator = base44.entities.Collaborator;

/** Real invite send/resend — creates or updates the Collaborator record AND
 *  sends the on-brand email with a fresh accept token, via
 *  /api/send-collaborator-invite (Resend, server-side). */
async function sendInvite({ collaboratorId, name, email, permissions }) {
  const res = await fetch('/api/send-collaborator-invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
    },
    body: JSON.stringify({ collaboratorId, name, email, permissions }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send invite');
  return data.collaborator;
}

/** Writes the CollaboratorGrant event that actually changes access
 *  (/api/collaborator-revoke). Called BEFORE the Collaborator record is
 *  touched: if this fails, the record is left alone, so the list never shows
 *  someone as removed who can still get in. */
async function changeAccess(body) {
  const res = await fetch('/api/collaborator-revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'That did not save. Try again.');
  return data;
}

const SAVE_FAILED = 'That did not save. Try again.';

// Driven from collaboratorPageMap.js — the same list AnimatedSidebar.jsx
// builds the collaborator's nav from, so a permission offered here can
// never silently have no corresponding sidebar entry (or vice versa).
const pages = COLLABORATOR_PERMISSION_KEYS;

// Item 5 (owner ruling 2026-10-12): every page is view only. One toggle per
// page, no edit control, and a saved grant carries view and nothing else.
// A page on COLLABORATOR_SUGGEST_PAGES (Schedule and Moodboard, owner ruling
// 2026-10-14) also offers its own option: change details and suggest on
// Schedule, suggest additions on Moodboard. View only and that option are a
// choice, never both.
const viewOnly = (perms) => Object.fromEntries(pages.map(page => [page, {
  view: collaboratorCan(perms, page, 'view'),
  ...(COLLABORATOR_SUGGEST_PAGES.includes(page) ? { edit: collaboratorCan(perms, page, 'suggest') } : {}),
}]));
const initialPermissions = viewOnly({});

export default function CollaborateModal({ onClose }) {
  const [collaborators, setCollaborators] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [editingCollaborator, setEditingCollaborator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmingRemove, setConfirmingRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await fetchCollaborators();
      // Reconcile on open: revoke any grant whose collaborator no longer has
      // a record here, which catches people removed before removal revoked
      // anything. Only after a successful load: an empty list from a failed
      // read would otherwise revoke everyone.
      if (data) {
        changeAccess({ action: 'reconcile', emails: data.map(c => c.email).filter(Boolean) })
          .catch(err => console.error('Failed to reconcile collaborator access:', err));
      }
    })();
  }, []);

  const fetchCollaborators = async () => {
    setLoading(true);
    let data = null;
    try {
      data = await getMyRecords('Collaborator', '-created_date');
      setCollaborators(data);
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
    setLoading(false);
    return data;
  };

  const handlePermissionChange = (page, choice = 'view') => {
    setPermissions(prev => {
      const cur = prev[page] || {};
      if (choice === 'edit') return { ...prev, [page]: { view: true, edit: !cur.edit } };
      // "View only" is on only while edit is off: picking it turns edit off.
      const viewOnlyNow = !!cur.view && !cur.edit;
      return { ...prev, [page]: { view: !viewOnlyNow, ...(COLLABORATOR_SUGGEST_PAGES.includes(page) ? { edit: false } : {}) } };
    });
  };
  
  const resetForm = () => {
    setName("");
    setEmail("");
    setPermissions(initialPermissions);
    setEditingCollaborator(null);
  };

  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      alert("Email is required.");
      return;
    }

    setSending(true);
    try {
      if (editingCollaborator) {
        // The grant event goes first, because it is what the server reads.
        // An accepted collaborator gets a new grant with these permissions;
        // a pending invite has no grant yet, so it is resent instead, and the
        // new link carries the new permissions.
        let result;
        try {
          result = await changeAccess({ action: 'permissions', email: editingCollaborator.email, permissions });
        } catch {
          throw new Error(SAVE_FAILED);
        }
        if (result.pending) {
          await sendInvite({ collaboratorId: editingCollaborator.id, name, email: editingCollaborator.email, permissions });
          toast.success(`Invite resent to ${editingCollaborator.email}`);
        } else {
          await Collaborator.update(editingCollaborator.id, { name, email, permissions });
          toast.success('Collaborator updated');
        }
      } else {
        await sendInvite({ name, email, permissions });
        toast.success(`Invite sent to ${email}`);
      }
      resetForm();
      fetchCollaborators();
    } catch (error) {
      console.error("Failed to save collaborator:", error);
      toast.error(error.message || 'Error saving collaborator');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (collab) => {
    setSending(true);
    try {
      await sendInvite({ collaboratorId: collab.id, name: collab.name, email: collab.email, permissions: collab.permissions });
      toast.success(`Invite resent to ${collab.email}`);
      fetchCollaborators();
    } catch (error) {
      toast.error(error.message || 'Failed to resend invite');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (collaborator) => {
    setEditingCollaborator(collaborator);
    setName(collaborator.name);
    setEmail(collaborator.email);
    // Every page represented, and a stale edit read as view.
    setPermissions(viewOnly(collaborator.permissions));
  };

  // Revoke first, then delete the record. If the revoke fails the record
  // stays, so the owner can see the person still has access and try again.
  const handleRemove = async (collab) => {
    setRemoving(true);
    try {
      await changeAccess({ action: 'revoke', email: collab.email });
      await Collaborator.delete(collab.id);
      setConfirmingRemove(null);
      if (editingCollaborator?.id === collab.id) resetForm();
      fetchCollaborators();
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
      toast.error(SAVE_FAILED);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent hideClose title="Manage collaborators" className="max-w-4xl p-0 gap-0">
      <Card className="bg-white rounded-2xl p-2 w-full max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Users className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <CardTitle>Manage Collaborators</CardTitle>
              <CardDescription>Invite people to help you plan your wedding.</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Invite Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{editingCollaborator ? 'Edit Collaborator' : 'Invite New Collaborator'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Collaborator's Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Collaborator's Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!editingCollaborator}
              />
              
              <div className="space-y-3 pt-2">
                <h4 className="font-medium">Pages they can view</h4>
                {pages.map((page) => (
                  <div key={page} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                    <span className="text-sm font-medium">{COLLABORATOR_PAGE_MAP[page].navLabel}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${page}-view`}
                          checked={!!permissions[page]?.view && !permissions[page]?.edit}
                          onCheckedChange={() => handlePermissionChange(page, 'view')}
                        />
                        <label htmlFor={`${page}-view`} className="text-sm">View only</label>
                      </div>
                      {COLLABORATOR_SUGGEST_PAGES.includes(page) && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${page}-edit`}
                            checked={!!permissions[page]?.edit}
                            onCheckedChange={() => handlePermissionChange(page, 'edit')}
                          />
                          <label htmlFor={`${page}-edit`} className="text-sm">{COLLABORATOR_PICKER_LABEL[page]}</label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" disabled={sending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending…' : editingCollaborator ? 'Update Collaborator' : 'Send Invite'}
                </Button>
                {editingCollaborator && (
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel Edit</Button>
                )}
              </div>
            </form>
          </div>

          {/* Existing Collaborators */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Current Collaborators</h3>
            {loading ? (
              <p>Loading collaborators...</p>
            ) : collaborators.length > 0 ? (
              <div className="space-y-3">
                {collaborators.map(collab => (
                  <div key={collab.id} className="p-3 border rounded-lg bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{collab.name}</p>
                          {collab.status === 'accepted' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 font-normal">Accepted</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 font-normal">Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: color.textMuted }}>{collab.email}</p>
                      </div>
                      <div className="flex gap-1">
                        {collab.status !== 'accepted' && (
                          <Button size="icon" variant="ghost" onClick={() => handleResend(collab)} disabled={sending} title="Resend invite">
                            <RotateCw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(collab)} title="Edit permissions"><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmingRemove(collab.id)} className="text-red-500 hover:text-red-600" title="Revoke access"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    {confirmingRemove === collab.id && (
                      <div className="mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm">Remove {collab.name || collab.email}? They lose access straight away.</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setConfirmingRemove(null)} disabled={removing}>Keep</Button>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => handleRemove(collab)} disabled={removing}>Remove</Button>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t text-xs text-[rgba(10,10,10,0.6)] space-y-1">
                      <p className="font-medium">Permissions:</p>
                      <div className="flex flex-wrap gap-2">
                        {pages.filter(page => collaboratorCan(collab.permissions, page, 'view')).map(page => (
                          <Badge key={page} variant="secondary" className="font-normal">
                            {COLLABORATOR_PAGE_MAP[page].navLabel}
                            {collaboratorPageSuffix(collab.permissions, page)}
                            <Eye className="w-3 h-3 ml-1.5" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-xl">
                <Users className="mx-auto w-10 h-10 mb-2" style={{ color: color.textDisabled }} />
                <p style={{ color: color.textMuted }}>You haven't invited any collaborators yet.</p>
              </div>
            )}
          </div>
        </div>
      </Card>
      </DialogContent>
    </Dialog>
  );
}
