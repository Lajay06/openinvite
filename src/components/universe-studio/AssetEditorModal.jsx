import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const ASSET_LABELS = {
  'save-the-date': 'Save the Date',
  'invitation-website': 'Invitation Website',
  'rsvp-page': 'RSVP Page',
  'menu-card': 'Menu Card',
  'seating-chart': 'Seating Chart',
  'motion-graphic': 'Motion Graphic',
  'instagram-kit': 'Instagram Story Kit',
  'welcome-signage': 'Welcome Signage',
  'place-cards': 'Guest Place Cards',
  'thank-you': 'Thank You Notes',
};

export default function AssetEditorModal({ assetType, weddingDetails, onSave, onClose }) {
  const [menuItems, setMenuItems] = useState(weddingDetails?.menuItems || [
    { course: 'Entrée', dish: '', description: '' },
    { course: 'Main', dish: '', description: '' },
    { course: 'Dessert', dish: '', description: '' },
  ]);
  const [thankYouMessage, setThankYouMessage] = useState(
    weddingDetails?.thankYouMessage || 'Your presence on our wedding day meant the world to us. Thank you for celebrating this moment with us.'
  );
  const [welcomeText, setWelcomeText] = useState(weddingDetails?.welcomeSignageText || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates = {};
    if (assetType === 'menu-card') updates.menuItems = menuItems;
    if (assetType === 'thank-you') updates.thankYouMessage = thankYouMessage;
    if (assetType === 'welcome-signage') updates.welcomeSignageText = welcomeText;
    await onSave(updates);
    setSaving(false);
    onClose();
  };

  const renderEditor = () => {
    if (assetType === 'menu-card') {
      return (
        <div>
          <p className="text-xs text-[#888] uppercase tracking-[0.15em] mb-4">Menu Items</p>
          {menuItems.map((item, i) => (
            <div key={i} className="mb-4 p-4 border border-[#EEEEEE] bg-[#FAFAFA]">
              <div className="flex justify-between items-center mb-3">
                <input
                  value={item.course}
                  onChange={e => {
                    const updated = [...menuItems];
                    updated[i] = { ...updated[i], course: e.target.value };
                    setMenuItems(updated);
                  }}
                  placeholder="Course (e.g. Entrée)"
                  className="text-[10px] uppercase tracking-[0.15em] text-[#888] bg-transparent border-none outline-none font-semibold"
                />
                <button onClick={() => setMenuItems(menuItems.filter((_, j) => j !== i))}>
                  <Trash2 size={12} className="text-[#CCCCCC] hover:text-[#E03553]" />
                </button>
              </div>
              <input
                value={item.dish}
                onChange={e => {
                  const updated = [...menuItems];
                  updated[i] = { ...updated[i], dish: e.target.value };
                  setMenuItems(updated);
                }}
                placeholder="Dish name"
                className="w-full text-sm text-[#0A0A0A] bg-transparent border-b border-[#EEEEEE] outline-none pb-1 mb-2"
              />
              <input
                value={item.description}
                onChange={e => {
                  const updated = [...menuItems];
                  updated[i] = { ...updated[i], description: e.target.value };
                  setMenuItems(updated);
                }}
                placeholder="Description (optional)"
                className="w-full text-xs text-[#888] italic bg-transparent border-b border-[#EEEEEE] outline-none pb-1"
              />
            </div>
          ))}
          <button
            onClick={() => setMenuItems([...menuItems, { course: 'Course', dish: '', description: '' }])}
            className="flex items-center gap-2 text-xs text-[#888] hover:text-[#0A0A0A] uppercase tracking-[0.12em] mt-2"
          >
            <Plus size={12} /> Add Course
          </button>
        </div>
      );
    }

    if (assetType === 'thank-you') {
      return (
        <div>
          <p className="text-xs text-[#888] uppercase tracking-[0.15em] mb-3">Thank You Message Template</p>
          <p className="text-xs text-[#AAAAAA] mb-3">This message will appear in all thank you notes. Each note will be personalised with the guest's name.</p>
          <textarea
            value={thankYouMessage}
            onChange={e => setThankYouMessage(e.target.value)}
            rows={5}
            className="w-full text-sm text-[#0A0A0A] bg-[#FAFAFA] border border-[#EEEEEE] p-3 outline-none resize-none"
            placeholder="Your heartfelt message..."
          />
        </div>
      );
    }

    if (assetType === 'welcome-signage') {
      return (
        <div>
          <p className="text-xs text-[#888] uppercase tracking-[0.15em] mb-3">Custom Welcome Message</p>
          <textarea
            value={welcomeText}
            onChange={e => setWelcomeText(e.target.value)}
            rows={3}
            className="w-full text-sm text-[#0A0A0A] bg-[#FAFAFA] border border-[#EEEEEE] p-3 outline-none resize-none"
            placeholder="Leave blank to use default: 'Welcome to the Wedding of'"
          />
        </div>
      );
    }

    // Default: info panel
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#888]">This asset is automatically generated from your wedding details.</p>
        <p className="text-xs text-[#AAAAAA] mt-2">Update your event details, guest list, or seating to see changes reflected here.</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEEEEE]">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#888888]">Edit Asset</p>
            <h2 className="text-lg font-bold text-[#0A0A0A]">{ASSET_LABELS[assetType] || assetType}</h2>
          </div>
          <button onClick={onClose} className="text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderEditor()}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-editorial-primary flex-1 py-3"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="btn-editorial-secondary px-6 py-3">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}