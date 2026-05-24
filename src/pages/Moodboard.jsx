import React, { useState, useEffect, useRef } from 'react';
import { MoodboardItem } from '@/entities/MoodboardItem';
import { UploadFile } from '@/integrations/Core';
import { Plus, Search, Upload, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import MoodboardGrid from '../components/moodboard/MoodboardGrid';
import AddItemModal from '../components/moodboard/AddItemModal';
import PinterestConnect from '../components/moodboard/PinterestConnect';
import BoardSelector from '../components/moodboard/BoardSelector';
import toast from 'react-hot-toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';

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
  const [avaOpen, setAvaOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await MoodboardItem.list('-created_date');
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

  const handleFileUpload = async (files) => {
    const toastId = toast.loading(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`);
    try {
      const uploads = await Promise.all(Array.from(files).map(async (file) => {
        const { file_url } = await UploadFile({ file });
        return { title: file.name.split('.')[0], image_url: file_url, category: 'other', board_name: activeBoard, tags: [] };
      }));
      await Promise.all(uploads.map(item => MoodboardItem.create(item)));
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added`, { id: toastId });
      loadItems();
    } catch (e) {
      toast.error('Upload failed', { id: toastId });
    }
  };

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
      onDrop={e => { e.preventDefault(); e.dataTransfer.files.length && handleFileUpload(e.dataTransfer.files); }}>

      <DashboardPageHeader title="Moodboard" subtitle="Collect and organise inspiration images for your wedding vision" />

      {/* Stat strip */}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < stats.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava + actions bar */}
      <div style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to find inspiration" onClick={() => setAvaOpen(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => fileInputRef.current?.click()} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={12} />Upload
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add inspiration
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files && handleFileUpload(e.target.files)} />
        </div>
      </div>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Board selector */}
        <BoardSelector boards={boards} activeBoard={activeBoard} onBoardChange={setActiveBoard} onCreateBoard={handleCreateBoard} />

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

        {/* Grid */}
        {loading ? (
          <div style={{ padding: '80px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
            <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
          </div>
        ) : (
          <MoodboardGrid items={filteredItems} onDeleteItem={handleDeleteItem} onUpdateItem={handleUpdateItem} />
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
