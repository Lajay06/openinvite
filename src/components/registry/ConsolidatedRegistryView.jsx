import React from 'react';
import { Gift, ShoppingCart, DollarSign, ExternalLink, CheckCircle, Package, ArrowRight } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function ConsolidatedRegistryView({ storeItems, products, customGifts, loading, onProductPurchase }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#444444', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</div>;

  const totalPurchased = products.reduce((s, p) => s + (p.quantity_purchased || 0), 0);
  const totalRequested = products.reduce((s, p) => s + (p.quantity_requested || 1), 0);
  const completionRate = totalRequested > 0 ? Math.round((totalPurchased / totalRequested) * 100) : 0;

  if (storeItems.length === 0 && products.length === 0 && customGifts.length === 0) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(10,10,10,0.08)' }}>
        <Gift size={40} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>No registry items yet</p>
        <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add platforms, products, or cash funds to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Summary bar */}
      <div style={{ background: '#F5F4F0', border: '1px solid #E5E5E5', padding: '24px 32px', display: 'flex', alignItems: 'flex-end', gap: 32 }}>
        {[
          { label: 'Platforms', value: storeItems.length },
          { label: 'Products', value: products.length },
          { label: 'Completion', value: `${completionRate}%` },
        ].map((s, i, arr) => (
          <div key={i} style={{ paddingRight: i < arr.length - 1 ? 32 : 0, borderRight: i < arr.length - 1 ? '1px solid #E5E5E5' : 'none' }}>
            <p style={{ ...labelStyle, color: 'rgba(10,10,10,0.6)', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
          </div>
        ))}
        <div style={{ flex: 1, paddingBottom: 6 }}>
          <div style={{ height: 3, background: '#E5E5E5' }}>
            <div style={{ height: '100%', width: `${completionRate}%`, background: '#E03553', transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Registry Platforms */}
      {storeItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Gift size={13} style={{ color: 'rgba(10,10,10,0.35)' }} />
            <span style={labelStyle}>Registry platforms</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
            {storeItems.map(store => (
              <div key={store.id} style={{ background: '#FFFFFF', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, border: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {store.image_url
                      ? <img src={store.image_url} alt={store.store_name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                      : <Gift size={18} style={{ color: 'rgba(10,10,10,0.2)' }} />
                    }
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{store.store_name}</p>
                    {store.description && <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{store.description}</p>}
                  </div>
                </div>
                <a href={store.url} target="_blank" rel="noopener noreferrer" className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, width: '100%', textDecoration: 'none' }}>
                  Visit registry <ArrowRight size={11} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Products */}
      {products.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={13} style={{ color: 'rgba(10,10,10,0.35)' }} />
              <span style={labelStyle}>Featured products</span>
            </div>
            <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{totalPurchased}/{totalRequested} purchased</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
            {products.slice(0, 6).map(product => {
              const progress = Math.min(((product.quantity_purchased || 0) / (product.quantity_requested || 1)) * 100, 100);
              const fullyPurchased = (product.quantity_purchased || 0) >= (product.quantity_requested || 1);
              return (
                <div key={product.id} style={{ background: '#FFFFFF', padding: 16, opacity: fullyPurchased ? 0.65 : 1 }}>
                  {product.image_url && (
                    <div style={{ height: 120, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                      <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {fullyPurchased && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={24} style={{ color: '#DDF762' }} />
                        </div>
                      )}
                    </div>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>{product.name}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#E03553', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>${product.price?.toLocaleString()}</p>
                  <div style={{ height: 3, background: 'rgba(10,10,10,0.08)', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #E03553, #803D81)' }} />
                  </div>
                  <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {product.quantity_purchased || 0}/{product.quantity_requested || 1} purchased
                  </p>
                  {product.product_url && (
                    <a href={product.product_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 8, textDecoration: 'none' }}>
                      <ExternalLink size={10} />View product
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {products.length > 6 && (
            <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 12, textAlign: 'center' }}>
              Showing 6 of {products.length} products — switch to the Products tab to see all.
            </p>
          )}
        </div>
      )}

      {/* Cash Funds */}
      {customGifts.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <DollarSign size={13} style={{ color: 'rgba(10,10,10,0.35)' }} />
            <span style={labelStyle}>Cash funds</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1, background: 'rgba(10,10,10,0.06)' }}>
            {customGifts.map(fund => (
              <div key={fund.id} style={{ background: '#FFFFFF', padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>{fund.title}</p>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {fund.category?.replace('_', ' ')}
                </span>
                {fund.description && <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0' }}>{fund.description}</p>}
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginTop: 12 }}>${fund.requested_amount?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
