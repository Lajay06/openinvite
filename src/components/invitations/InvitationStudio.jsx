import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Share2,
  Save, Loader2, Smartphone, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';

const Invitation = base44.entities.Invitation;

import InvitationDesigner from './InvitationDesigner';
import InvitationPreviewWithNav from './InvitationPreviewWithNav';

export default function InvitationStudio({ invitation, weddingDetails, onBack, onSave, readOnly = false }) {
  const [previewMode, setPreviewMode] = useState(false);
  const [devicePreview, setDevicePreview] = useState('mobile');
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentInvitation, setCurrentInvitation] = useState(invitation);
  const [activeEditorPage, setActiveEditorPage] = useState('invitation');

  useEffect(() => {
    setCurrentInvitation(invitation);
  }, [invitation]);

  useEffect(() => {
    setCurrentInvitation(prevInvitation => {
      let updatedInvitation = { ...prevInvitation };
      if (!updatedInvitation.design) {
        updatedInvitation.design = {};
      }
      if (!updatedInvitation.design.globalStyles) {
        updatedInvitation.design.globalStyles = { fontFamily: 'Inter', scrollDirection: 'vertical', transitionType: 'fade' };
      }
      if (!updatedInvitation.design.sections || updatedInvitation.design.sections.length === 0) {
        updatedInvitation.design.sections = [{ id: 'hero', name: 'Hero Section', background: { type: 'color', value: '#fce7f3' }, components: [] }];
      }
      if (typeof updatedInvitation.design.selectedSection === 'undefined') {
        updatedInvitation.design.selectedSection = 0;
      }
      return updatedInvitation;
    });
  }, [currentInvitation.id]);

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading('Saving invitation...');
    try {
      const designToSave = { ...currentInvitation.design };
      if (designToSave) {
        delete designToSave.selectedElement;
        delete designToSave.selectedSection;
      }
      const saveData = { ...currentInvitation, design: designToSave };
      
      const updatedInvitation = await Invitation.update(currentInvitation.id, saveData);
      toast.success('Invitation saved successfully!', { id: toastId });
      if (onSave) onSave(updatedInvitation);
    } catch (error) {
      console.error('Error saving invitation:', error);
      toast.error('Failed to save invitation', { id: toastId });
    }
    setIsSaving(false);
  };
  
  const handleDesignUpdate = (newDesign) => {
    setCurrentInvitation(prev => ({
        ...prev,
        design: newDesign,
    }));
  };

  const copyInvitationUrl = () => {
    const url = `${window.location.origin}/guest-invitation/${currentInvitation.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Invitation link copied to clipboard!');
  };

  const handleElementSelect = (elementId) => {
    setCurrentInvitation(prev => ({
      ...prev,
      design: {
        ...prev.design,
        selectedElement: elementId
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toaster is now in the parent component */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* The onBack button is removed as this is now the main view */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentInvitation.couple_names || 'Wedding Invitation'}
              </h1>
              <p className="text-sm text-gray-500">Guest Suite Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={devicePreview === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button
                variant={devicePreview === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevicePreview('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="border-gray-200"
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={copyInvitationUrl}
                  className="border-gray-200"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Editor Panel — not rendered at all when read-only, not just
            visually hidden, since it's the entire editing surface */}
        {!readOnly && (
          <div className="w-[400px] bg-white border-r border-gray-200 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <InvitationDesigner
                invitation={currentInvitation}
                onDesignUpdate={handleDesignUpdate}
                weddingDetails={weddingDetails}
              />
            </div>
          </div>
        )}

        {/* Preview Panel */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 p-6">
          <div className={`bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300 ${
            devicePreview === 'mobile' ? 'w-full max-w-sm' : 'w-full max-w-4xl'
          } h-full max-h-[800px]`}>
            <InvitationPreviewWithNav
              invitation={currentInvitation}
              weddingDetails={weddingDetails}
              onElementSelect={handleElementSelect}
              currentPage={activeEditorPage}
              onPageChange={setActiveEditorPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}