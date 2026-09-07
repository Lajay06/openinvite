import React, { useState } from 'react';
import { FilterPill } from '@/components/shared/TableToolbar';
import { Input } from '@/components/ui/input';
import { Plus, Folder } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function BoardSelector({ boards, activeBoard, onBoardChange, onCreateBoard, readOnly = false }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateBoard(newName.trim());
      setNewName('');
      setShowCreate(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Folder size={13} style={{ color: 'rgba(10,10,10,0.45)' }} />
          <span style={labelStyle}>Boards</span>
        </div>
        {!readOnly && !showCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-editorial-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} />New board
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {/* SELECTED IS BLACK, not strawberry. This row picked its own accent
            and was the only selection set on the dashboard that did — the
            primary color is for actions, and a chosen filter is not one. */}
        {boards.map(board => (
          <FilterPill key={board} label={board} active={activeBoard === board} onClick={() => onBoardChange(board)} />
        ))}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Board name (e.g. Vintage vibes)" autoFocus style={{ maxWidth: 280 }} />
          <button type="submit" className="btn-primary" style={{ fontSize: 12 }}>Create</button>
          <button type="button" onClick={() => { setShowCreate(false); setNewName(''); }} className="btn-editorial-secondary" style={{ fontSize: 12 }}>Cancel</button>
        </form>
      )}
    </div>
  );
}
