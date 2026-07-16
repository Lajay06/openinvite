import React, { useState } from 'react';
import { ShoppingCart, Edit, Trash2, ExternalLink, CheckCircle, Package, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const PRIORITY_STYLES = {
  high:   { color: '#E03553', bg: 'rgba(224,53,83,0.08)', label: 'High' },
  medium: { color: '#803D81', bg: 'rgba(128,61,129,0.08)', label: 'Medium' },
  low:    { color: 'rgba(10,10,10,0.5)', bg: 'rgba(10,10,10,0.06)', label: 'Low' },
};

export default function RegistryProductList({ items, onEdit, onDelete, onPurchase, loading, readOnly = false }) {
  const [purchaseProduct, setPurchaseProduct] = useState(null);
  const [purchaseData, setPurchaseData] = useState({ guest_name: '', guest_email: '', quantity: 1, message: '' });

  const openPurchase = (product) => {
    setPurchaseProduct(product);
    setPurchaseData({ guest_name: '', guest_email: '', quantity: 1, message: '' });
  };

  const handlePurchaseSubmit = () => {
    if (!purchaseProduct) return;
    const remaining = (purchaseProduct.quantity_requested || 1) - (purchaseProduct.quantity_purchased || 0);
    if (purchaseData.quantity > remaining) { alert(`Only ${remaining} remaining`); return; }
    onPurchase(purchaseProduct.id, { ...purchaseData, quantity: parseInt(purchaseData.quantity), purchase_date: new Date().toISOString() });
    setPurchaseProduct(null);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#444444', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</div>;

  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)' }}>
        <ShoppingCart size={32} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>No products added yet</p>
        <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add individual products to track purchases.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
        {items.map(item => {
          const purchased = item.quantity_purchased || 0;
          const requested = item.quantity_requested || 1;
          const progress = Math.min((purchased / requested) * 100, 100);
          const fullyPurchased = purchased >= requested;
          const pri = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low;

          return (
            <div key={item.id} style={{ background: '#FFFFFF', display: 'flex', flexDirection: 'column', opacity: fullyPurchased ? 0.7 : 1 }}>
              {item.image_url && (
                <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {fullyPurchased && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <CheckCircle size={28} style={{ color: '#DDF762' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Fully purchased</span>
                    </div>
                  )}
                </div>
              )}
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", flex: 1, marginRight: 8 }}>{item.name}</p>
                </div>
                {item.description && <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 10, lineHeight: 1.5 }}>{item.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>${item.price?.toLocaleString()}</span>
                  {item.registry_platform && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", border: '1px solid rgba(10,10,10,0.12)', borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Package size={10} />{item.registry_platform}
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={labelStyle}>Purchased</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{purchased}/{requested}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(10,10,10,0.08)' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #E03553, #803D81)', transition: 'width 0.3s' }} />
                  </div>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {!readOnly && !fullyPurchased && (
                    <button onClick={() => openPurchase(item)} className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}>
                      <ShoppingCart size={12} />Mark as purchased
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {item.product_url && (
                      <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="btn-editorial-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, textDecoration: 'none' }}>
                        <ExternalLink size={11} />View
                      </a>
                    )}
                    {!readOnly && (
                      <>
                        <button onClick={() => onEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 6, display: 'flex' }}><Edit size={14} /></button>
                        <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 6, display: 'flex' }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {purchaseProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Mark as purchased</span>
                <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '2px 0 0' }}>{purchaseProduct.name}</p>
              </div>
              <button onClick={() => setPurchaseProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Your name</Label>
                <Input value={purchaseData.guest_name} onChange={e => setPurchaseData({ ...purchaseData, guest_name: e.target.value })} placeholder="Enter your name" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Email</Label>
                <Input type="email" value={purchaseData.guest_email} onChange={e => setPurchaseData({ ...purchaseData, guest_email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Quantity</Label>
                <Input type="number" min="1" max={(purchaseProduct.quantity_requested || 1) - (purchaseProduct.quantity_purchased || 0)} value={purchaseData.quantity} onChange={e => setPurchaseData({ ...purchaseData, quantity: e.target.value })} />
                <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {(purchaseProduct.quantity_requested || 1) - (purchaseProduct.quantity_purchased || 0)} remaining
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label>Message (optional)</Label>
                <Textarea value={purchaseData.message} onChange={e => setPurchaseData({ ...purchaseData, message: e.target.value })} placeholder="Add a personal message…" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
              <button onClick={() => setPurchaseProduct(null)} className="btn-editorial-secondary">Cancel</button>
              <button onClick={handlePurchaseSubmit} disabled={!purchaseData.guest_name || !purchaseData.guest_email} className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: !purchaseData.guest_name || !purchaseData.guest_email ? 0.5 : 1 }}>
                <CheckCircle size={13} />Confirm purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
