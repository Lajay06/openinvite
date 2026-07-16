import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import toast from 'react-hot-toast';

import InvitationStudio from "../components/invitations/InvitationStudio";
import InvitationBuilder from "../components/invitations/InvitationBuilder";
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyInvitation } from '@/lib/resolveMyWedding';
import { useCollaboratorContext } from '@/lib/collaboratorContext';
const Invitation = base44.entities.Invitation;

export default function InvitationsPage() {
  const [invitation, setInvitation] = useState(null);
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('loading'); // loading, builder, studio, empty

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Read-only regardless of 'edit' — Invitation's update RLS is owner-scoped
  // like every other entity here (see BASE44_PLATFORM_NOTES.md).
  const readOnly = isCollaborating;

  useEffect(() => {
    loadData();
  }, [isCollaborating]);

  const loadData = async () => {
    setLoading(true);
    setView('loading');
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Invitations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) throw new Error('Failed to load invitation');
        const { data } = await res.json();
        const invites = (data.Invitation || []).slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        if (invites.length > 0) {
          setInvitation(invites[0]);
          setView('studio');
        } else {
          // A collaborator is never shown the "create the first invitation"
          // builder — that's the owner's own starting flow, not something
          // a collaborator can do on their behalf (Invitation.create's admin-
          // key write would 403 the same as every other entity here anyway).
          setView('empty');
        }
        setLoading(false);
        return;
      }

      const [myInvitation, myDetails] = await Promise.all([
        getMyInvitation(),
        getMyWeddingDetails()
      ]);

      if (myDetails) {
        setWeddingDetails(myDetails);
      }

      if (myInvitation) {
        setInvitation(myInvitation);
        setView('studio');
      } else {
        // No invitation exists, go to the builder
        setView('builder');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load your wedding data.');
    }
    setLoading(false);
  };

  const handleInvitationCreated = async (createdInvitation) => {
    // This is called after the builder creates the first invitation
    setInvitation(createdInvitation);
    setView('studio');
    await loadData(); // Refresh all data
  };

  const handleSave = async (savedInvitation) => {
    await loadData();
    const updatedInvitation = await Invitation.get(savedInvitation.id);
    setInvitation(updatedInvitation);
    toast.success("Changes saved!");
  }

  if (view === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#E03553' }} />
      </div>
    );
  }

  if (view === 'empty') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'rgba(10,10,10,0.4)', fontSize: 14 }}>
          No invitation has been created yet.
        </p>
      </div>
    );
  }

  if (view === 'builder') {
    return (
      <InvitationBuilder
        onInvitationSaved={handleInvitationCreated}
        // No back button needed as this is the starting point
      />
    );
  }

  if (view === 'studio' && invitation) {
    return (
      <>

        <InvitationStudio
          invitation={invitation}
          weddingDetails={weddingDetails}
          onSave={handleSave}
          readOnly={readOnly}
          // No back button needed as this is the main view
        />
      </>
    );
  }
  
  // Fallback, should ideally not be reached
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Something went wrong. Please refresh the page.</p>
    </div>
  );
}