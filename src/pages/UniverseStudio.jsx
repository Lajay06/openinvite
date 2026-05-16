import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import UniverseSelector from '@/components/universe-studio/UniverseSelector';
import AssetGrid from '@/components/universe-studio/AssetGrid';
import AssetEditorModal from '@/components/universe-studio/AssetEditorModal';

export default function UniverseStudio() {
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUniverse, setSelectedUniverse] = useState('aman');
  const [editingAsset, setEditingAsset] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [details, guestList] = await Promise.all([
          base44.entities.WeddingDetails.list(),
          base44.entities.Guest.list()
        ]);
        const d = details[0] || {};
        setWeddingDetails(d);
        setSelectedUniverse(d.activeUniverse || 'aman');
        setGuests(guestList);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (updates) => {
    if (!weddingDetails?.id) return;
    const updated = { ...weddingDetails, ...updates };
    await base44.entities.WeddingDetails.update(weddingDetails.id, updates);
    setWeddingDetails(updated);
  };

  const handleUniverseChange = async (universeId) => {
    setSelectedUniverse(universeId);
    await handleSave({ activeUniverse: universeId });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[#E0E0DC] border-t-[#E03553] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#888] uppercase tracking-widest">Loading Studio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[#EEEEEE]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#888888] mb-1">Openinvite</p>
        <h1 className="text-3xl font-bold text-[#0A0A0A] tracking-tight">Design Studio</h1>
        <p className="text-sm text-[#888888] mt-1">Your complete wedding design system.</p>
      </div>

      {/* Universe Selector */}
      <div className="px-8 pt-6 pb-4 border-b border-[#EEEEEE]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#AAAAAA] mb-4">Choose Your Universe</p>
        <UniverseSelector
          selectedUniverse={selectedUniverse}
          onSelect={handleUniverseChange}
        />
      </div>

      {/* Asset Grid */}
      <div className="px-8 py-8">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#AAAAAA] mb-6">Your Design Assets</p>
        <AssetGrid
          universe={selectedUniverse}
          weddingDetails={weddingDetails}
          guests={guests}
          onEdit={(assetType) => setEditingAsset(assetType)}
        />
      </div>

      {/* Asset Editor Modal */}
      {editingAsset && (
        <AssetEditorModal
          assetType={editingAsset}
          weddingDetails={weddingDetails}
          onSave={handleSave}
          onClose={() => setEditingAsset(null)}
        />
      )}
    </div>
  );
}