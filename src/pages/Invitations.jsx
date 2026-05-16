import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

import InvitationStudio from "../components/invitations/InvitationStudio";
import InvitationBuilder from "../components/invitations/InvitationBuilder";
import { base44 } from "@/api/base44Client";
const Invitation = base44.entities.Invitation;
const WeddingDetails = base44.entities.WeddingDetails;

export default function InvitationsPage() {
  const [invitation, setInvitation] = useState(null);
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('loading'); // loading, builder, studio

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setView('loading');
    try {
      const [invitationsData, detailsData] = await Promise.all([
        Invitation.list('-created_date', 1), // Only ever fetch the most recent one
        WeddingDetails.list()
      ]);

      if (detailsData.length > 0) {
        setWeddingDetails(detailsData[0]);
      }

      if (invitationsData.length > 0) {
        setInvitation(invitationsData[0]);
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
        <Toaster />
        <InvitationStudio 
          invitation={invitation}
          weddingDetails={weddingDetails}
          onSave={handleSave}
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