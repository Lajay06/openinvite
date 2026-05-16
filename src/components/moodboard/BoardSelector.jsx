import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus, Folder } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function BoardSelector({ boards, activeBoard, onBoardChange, onCreateBoard }) {
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
          <Folder size={13} style={{ color: 'rgba(10,10,10,0.35)' }} />
          <span style={labelStyle}>Boards</span>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-editorial-secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} />New board
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {boards.map(board => (
          <button key={board} onClick={() => onBoardChange(board)}
            style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${activeBoard === board ? '#E03553' : 'rgba(10,10,10,0.12)'}`, background: activeBoard === board ? '#E03553' : 'transparent', color: activeBoard === board ? '#FFFFFF' : '#444444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
            <Folder size={11} />{board}
          </button>
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
