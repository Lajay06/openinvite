import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { UploadFile } from '@/integrations/Core';
import { validateUploadFile } from '@/lib/uploadValidation';
import { Plus, Search, Upload, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import MoodboardGrid from '../components/moodboard/MoodboardGrid';
import AddItemModal from '../components/moodboard/AddItemModal';
import PinterestConnect from '../components/moodboard/PinterestConnect';
import BoardSelector from '../components/moodboard/BoardSelector';
import toast from 'react-hot-toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import UploadStatus from '@/components/shared/UploadStatus';
import { useCollaboratorContext } from '@/lib/collaboratorContext';

let moodboardQueueId = 0;

const MoodboardItem = base44.entities.MoodboardItem;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

const CATEGORIES = [
  'all', 'venue', 'decor', 'flowers', 'dress', 'cake', 'colors',
  'invitations', 'photography', 'hairstyle', 'makeup', 'centerpieces', 'lighting', 'other',
];

export default function MoodboardPage() {
  const [items, setItems] = useState([]);
  const [boards, setBoards] = useState(['Main board', 'Venue ideas', 'Dress inspiration', 'Colour palette']);
  const [activeBoard, setActiveBoard] = useState('Main board');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState([]); // [{ id, file, status: 'uploading'|'error', error }]
  const [avaOpen, setAvaOpen] = useState(false);
  const uploading = uploadQueue.some(q => q.status === 'uploading');
  const fileInputRef = useRef(null);

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Always read-only while collaborating — same reasoning as every other
  // newly-wired page: the admin key 403s updating/deleting an owner-scoped
  // MoodboardItem regardless of the 'edit' bit, so there is no working
  // write path to gate on yet.
  const readOnly = isCollaborating;

  useEffect(() => { loadItems(); }, [isCollaborating]);

  const loadItems = async () => {
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Moodboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          setItems(data.MoodboardItem || []);
        }
        setLoading(false);
        return;
      }
      const data = await getMyRecords('MoodboardItem', '-created_date');
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddItem = async (itemData) => {
    try {
      await MoodboardItem.create({ ...itemData, board_name: activeBoard });
      setShowAddModal(false);
      toast.success('Added to moodboard');
      loadItems();
    } catch (e) {
      toast.error('Failed to add item');
    }
  };

  const uploadOne = useCallback(async (item) => {
    setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading', error: null } : i));
    try {
      const { file_url } = await UploadFile({ file: item.file });
      await MoodboardItem.create({
        title: item.file.name.split('.')[0], image_url: file_url,
        category: 'other', board_name: activeBoard, tags: [],
      });
      setUploadQueue(q => q.filter(i => i.id !== item.id));
      loadItems();
    } catch (e) {
      setUploadQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'error', error: `Failed to upload ${item.file.name}.` } : i));
    }
  }, [activeBoard]);

  const handleFileUpload = (files) => {
    const fileArray = Array.from(files);

    // Validate every file before uploading any
    for (const file of fileArray) {
      const err = validateUploadFile(file, 'image');
      if (err) { toast.error(`${file.name}: ${err}`); return; }
    }

    const items = fileArray.map(file => ({ id: ++moodboardQueueId, file, status: 'uploading', error: null }));
    setUploadQueue(q => [...q, ...items]);
    items.forEach(uploadOne);
  };

  const retryUpload = useCallback((id) => {
    setUploadQueue(q => {
      const item = q.find(i => i.id === id);
      if (item) uploadOne(item);
      return q;
    });
  }, [uploadOne]);

  const handleDeleteItem = async (itemId) => {
    try {
      await MoodboardItem.delete(itemId);
      loadItems();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      await MoodboardItem.update(itemId, updates);
      loadItems();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBoard = (name) => {
    if (!boards.includes(name)) {
      setBoards(prev => [...prev, name]);
      setActiveBoard(name);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesBoard = item.board_name === activeBoard;
    const matchesSearch = !searchTerm || item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || item.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesBoard && matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(items.map(i => i.category).filter(Boolean))].length;

  const stats = [
    { label: 'Total items', value: items.length },
    { label: 'Boards', value: boards.length },
    { label: 'Categories', value: uniqueCategories },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (!readOnly && !uploading && e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files); }}>

      <DashboardPageHeader title="Moodboard" subtitle="Collect and organise inspiration images for your wedding vision" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {stats.map((s, i) => (
          <div key={i} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < stats.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to find inspiration" onClick={() => setAvaOpen(true)} />
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-[10px]">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-editorial-secondary"
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} />Add inspiration
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) { handleFileUpload(e.target.files); e.target.value = ''; } }}
            />
          </div>
        )}
      </div>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Board selector */}
        <BoardSelector boards={boards} activeBoard={activeBoard} onBoardChange={setActiveBoard} onCreateBoard={handleCreateBoard} readOnly={readOnly} />

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)' }} />
          <input
            style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '8px 0 8px 22px', boxSizing: 'border-box' }}
            placeholder="Search by title or tags…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              style={{ padding: '5px 14px', borderRadius: 999, border: `1.5px solid ${categoryFilter === cat ? '#0A0A0A' : 'rgba(10,10,10,0.12)'}`, background: categoryFilter === cat ? '#0A0A0A' : 'transparent', color: categoryFilter === cat ? '#FFFFFF' : '#444444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* In-flight uploads */}
        {uploadQueue.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {uploadQueue.map(item => (
              <div key={item.id} style={{ width: 160 }}>
                <UploadStatus
                  status={item.status}
                  error={item.error}
                  onRetry={() => retryUpload(item.id)}
                  height={160}
                />
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ padding: '80px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
            <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
          </div>
        ) : (
          <MoodboardGrid items={filteredItems} onDeleteItem={readOnly ? undefined : handleDeleteItem} onUpdateItem={readOnly ? undefined : handleUpdateItem} readOnly={readOnly} />
        )}
      </div>

      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAddItem={handleAddItem} categories={CATEGORIES.filter(c => c !== 'all')} />}
      {showSearch && <PinterestConnect onClose={() => setShowSearch(false)} onAddItems={loadItems} activeBoard={activeBoard} />}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Inspiration curator"
        systemPrompt="You are Ava, a wedding inspiration curator. Help find and organise wedding aesthetic ideas."
        quickActions={["Describe my wedding aesthetic", "Find trending wedding styles", "Colour palette suggestions", "Theme ideas for my venue"]}
      />
    </div>
  );
}
