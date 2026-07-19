
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { COLLABORATOR_PERMISSION_KEYS } from '@/lib/collaboratorPageMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Added this import
import { X, Users, Send, Edit, Trash2, Eye, PenSquare, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { color } from '@/styles/tokens';

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
    body: JSON.stringify({ collaboratorId, name, email, permissions, origin: window.location.origin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send invite');
  return data.collaborator;
}

// Driven from collaboratorPageMap.js — the same list AnimatedSidebar.jsx
// builds the collaborator's nav from, so a permission offered here can
// never silently have no corresponding sidebar entry (or vice versa).
const pages = COLLABORATOR_PERMISSION_KEYS;

const initialPermissions = pages.reduce((acc, page) => {
  acc[page] = { view: false, edit: false };
  return acc;
}, {});

export default function CollaborateModal({ onClose }) {
  const [collaborators, setCollaborators] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [editingCollaborator, setEditingCollaborator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const data = await getMyRecords('Collaborator', '-created_date');
      setCollaborators(data);
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
    setLoading(false);
  };

  const handlePermissionChange = (page, type) => {
    setPermissions(prev => {
      const newPermissions = { ...prev };
      newPermissions[page][type] = !newPermissions[page][type];
      // If edit is enabled, view must also be enabled
      if (type === 'edit' && newPermissions[page][type]) {
        newPermissions[page]['view'] = true;
      }
      // If view is disabled, edit must also be disabled
      if (type === 'view' && !newPermissions[page][type]) {
        newPermissions[page]['edit'] = false;
      }
      return newPermissions;
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
        // Editing an already-invited collaborator's permissions doesn't need
        // a new email/token — only Resend (below) does that. A plain
        // permissions update goes through the couple's own token directly,
        // same RLS-safe path this always used.
        await Collaborator.update(editingCollaborator.id, { name, email, permissions });
        toast.success('Collaborator updated');
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
    // Ensure all pages are represented in the permissions object
    const mergedPermissions = { ...initialPermissions, ...collaborator.permissions };
    setPermissions(mergedPermissions);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this collaborator?")) {
      try {
        await Collaborator.delete(id);
        fetchCollaborators();
      } catch (error) {
        console.error("Failed to delete collaborator:", error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="bg-white rounded-2xl p-2 w-full max-w-4xl max-h-[90vh] flex flex-col">
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
                <h4 className="font-medium">Page Permissions</h4>
                {pages.map((page) => (
                  <div key={page} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                    <span className="text-sm font-medium">{page}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${page}-view`}
                          checked={permissions[page]?.view}
                          onCheckedChange={() => handlePermissionChange(page, 'view')}
                        />
                        <label htmlFor={`${page}-view`} className="text-sm">View</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${page}-edit`}
                          checked={permissions[page]?.edit}
                          onCheckedChange={() => handlePermissionChange(page, 'edit')}
                        />
                        <label htmlFor={`${page}-edit`} className="text-sm">Edit</label>
                      </div>
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
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(collab.id)} className="text-red-500 hover:text-red-600" title="Revoke access"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-gray-600 space-y-1">
                      <p className="font-medium">Permissions:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(collab.permissions || {}).map(([page, perms]) => {
                          if (perms.view || perms.edit) {
                            return (
                              <Badge key={page} variant="secondary" className="font-normal">
                                {page}
                                {perms.edit ? <PenSquare className="w-3 h-3 ml-1.5" /> : <Eye className="w-3 h-3 ml-1.5" />}
                              </Badge>
                            )
                          }
                          return null;
                        })}
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
    </div>
  );
}
