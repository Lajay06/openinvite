import React, { useState, useEffect, useRef } from 'react';
import { RegistryItem } from '@/entities/RegistryItem';
import { CustomGift } from '@/entities/CustomGift';
import { RegistryProduct } from '@/entities/RegistryProduct';
import { Plus, Share2, Sparkles, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import toast from 'react-hot-toast';

import RegistryForm from '../components/registry/RegistryForm';
import RegistryList from '../components/registry/RegistryList';
import CustomGiftForm from '../components/registry/CustomGiftForm';
import CustomGiftList from '../components/registry/CustomGiftList';
import RegistryProductForm from '../components/registry/RegistryProductForm';
import RegistryProductList from '../components/registry/RegistryProductList';
import ConsolidatedRegistryView from '../components/registry/ConsolidatedRegistryView';
import ShareRegistryModal from '../components/registry/ShareRegistryModal';
import ReceivedGifts from '../components/registry/ReceivedGifts';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
};

function CountUp({ to, duration = 1200, prefix = '', suffix = '' }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{prefix}{value}{suffix}</>;
}

export default function RegistryPage() {
  const [storeItems, setStoreItems] = useState([]);
  const [customGifts, setCustomGifts] = useState([]);
  const [products, setProducts] = useState([]);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingStoreItem, setEditingStoreItem] = useState(null);
  const [editingCustomGift, setEditingCustomGift] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.all([RegistryItem.list(), CustomGift.list(), RegistryProduct.list()]);
      setStoreItems(s); setCustomGifts(c); setProducts(p);
    } catch { toast.error('Failed to load registry data'); }
    setLoading(false);
  };

  const handleStoreSubmit = async (data) => {
    try {
      if (editingStoreItem) { await RegistryItem.update(editingStoreItem.id, data); toast.success('Registry link updated'); }
      else { await RegistryItem.create(data); toast.success('Registry link added'); }
      setShowStoreForm(false); setEditingStoreItem(null); loadData();
    } catch { toast.error('Failed to save registry link'); }
  };

  const handleCustomSubmit = async (data) => {
    try {
      if (editingCustomGift) { await CustomGift.update(editingCustomGift.id, data); toast.success('Cash fund updated'); }
      else { await CustomGift.create(data); toast.success('Cash fund created'); }
      setShowCustomForm(false); setEditingCustomGift(null); loadData();
    } catch { toast.error('Failed to save cash fund'); }
  };

  const handleProductSubmit = async (data) => {
    try {
      if (editingProduct) { await RegistryProduct.update(editingProduct.id, data); toast.success('Product updated'); }
      else { await RegistryProduct.create(data); toast.success('Product added'); }
      setShowProductForm(false); setEditingProduct(null); loadData();
    } catch { toast.error('Failed to save product'); }
  };

  const handleStoreEdit = (item) => { setEditingStoreItem(item); setShowStoreForm(true); };
  const handleCustomEdit = (item) => { setEditingCustomGift(item); setShowCustomForm(true); };
  const handleProductEdit = (item) => { setEditingProduct(item); setShowProductForm(true); };

  const handleStoreDelete = async (id) => {
    if (!window.confirm('Delete this registry link?')) return;
    try { await RegistryItem.delete(id); toast.success('Deleted'); loadData(); } catch { toast.error('Failed to delete'); }
  };
  const handleCustomDelete = async (id) => {
    if (!window.confirm('Delete this cash fund?')) return;
    try { await CustomGift.delete(id); toast.success('Deleted'); loadData(); } catch { toast.error('Failed to delete'); }
  };
  const handleProductDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await RegistryProduct.delete(id); toast.success('Deleted'); loadData(); } catch { toast.error('Failed to delete'); }
  };

  const handleProductPurchase = async (productId, purchaseData) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      await RegistryProduct.update(productId, {
        purchased_by: [...(product.purchased_by || []), purchaseData],
        quantity_purchased: (product.quantity_purchased || 0) + purchaseData.quantity,
      });
      toast.success('Purchase recorded'); loadData();
    } catch { toast.error('Failed to record purchase'); }
  };

  const stats = React.useMemo(() => {
    const totalRequested = products.reduce((s, p) => s + (p.quantity_requested || 0), 0);
    const totalPurchased = products.reduce((s, p) => s + (p.quantity_purchased || 0), 0);
    const totalValue = products.reduce((s, p) => s + (p.price * (p.quantity_requested || 1)), 0);
    const completionRate = totalRequested > 0 ? Math.round((totalPurchased / totalRequested) * 100) : 0;
    return { totalRequested, totalPurchased, completionRate, totalValue: Math.round(totalValue) };
  }, [products]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Registry" subtitle="Manage your gift registry, products and cash funds" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total items', value: stats.totalRequested },
          { label: 'Purchased', value: stats.totalPurchased },
          { label: 'Complete', value: stats.completionRate, suffix: '%' },
          { label: 'Total value', value: stats.totalValue, prefix: '$', last: true },
        ].map((s, i) => (
          <div key={i} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: s.last ? 'none' : '1px solid rgba(10,10,10,0.08)' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} prefix={s.prefix || ''} suffix={s.suffix || ''} />
            </p>
          </div>
        ))}
      </div>

      {/* Guest Suite visibility banner */}
      <div style={{ padding: '8px 32px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          ✨ Your registry is visible to guests in your Guest Suite
        </span>
      </div>

      {/* Ava + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to suggest registry items" onClick={() => setAvaOpen(true)} />
        <div className="flex flex-wrap items-center gap-[10px]">
          <button onClick={() => setShowShareModal(true)} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Share2 size={12} />Share
          </button>
          <button onClick={() => { setEditingStoreItem(null); setShowStoreForm(true); }} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add platform
          </button>
          <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add product
          </button>
          <button onClick={() => { setEditingCustomGift(null); setShowCustomForm(true); }} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add cash fund
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '32px 32px 48px' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList style={{ marginBottom: 28 }}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="platforms">Platforms ({storeItems.length})</TabsTrigger>
            <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="cash-funds">Cash funds ({customGifts.length})</TabsTrigger>
            <TabsTrigger value="received">Received gifts</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <ConsolidatedRegistryView storeItems={storeItems} products={products} customGifts={customGifts} loading={loading} onProductPurchase={handleProductPurchase} />
          </TabsContent>
          <TabsContent value="platforms">
            <RegistryList items={storeItems} onEdit={handleStoreEdit} onDelete={handleStoreDelete} loading={loading} />
          </TabsContent>
          <TabsContent value="products">
            <RegistryProductList items={products} onEdit={handleProductEdit} onDelete={handleProductDelete} onPurchase={handleProductPurchase} loading={loading} />
          </TabsContent>
          <TabsContent value="cash-funds">
            <CustomGiftList items={customGifts} onEdit={handleCustomEdit} onDelete={handleCustomDelete} loading={loading} />
          </TabsContent>
          <TabsContent value="received">
            <ReceivedGifts />
          </TabsContent>
        </Tabs>
      </div>

      {showStoreForm && <RegistryForm item={editingStoreItem} onSubmit={handleStoreSubmit} onClose={() => { setShowStoreForm(false); setEditingStoreItem(null); }} />}
      {showCustomForm && <CustomGiftForm item={editingCustomGift} onSubmit={handleCustomSubmit} onClose={() => { setShowCustomForm(false); setEditingCustomGift(null); }} />}
      {showProductForm && <RegistryProductForm item={editingProduct} onSubmit={handleProductSubmit} onClose={() => { setShowProductForm(false); setEditingProduct(null); }} />}
      {showShareModal && <ShareRegistryModal onClose={() => setShowShareModal(false)} registryData={{ storeItems, products, customGifts }} />}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Registry advisor"
        systemPrompt="You are Ava, a wedding registry advisor. Help couples choose registry items and platforms."
        quickActions={["What should be on my registry?", "Cash fund ideas", "Best registry platforms?", "How much should items cost?"]}
      />
    </div>
  );
}
