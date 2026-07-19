import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { createPageUrl } from '@/utils';
import { Loader2, Gift, ExternalLink, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORY_LABELS = {
  kitchen:     'Kitchen',
  home_decor:  'Home decor',
  bedding:     'Bedding',
  bathroom:    'Bathroom',
  outdoor:     'Outdoor',
  electronics: 'Electronics',
  honeymoon:   'Honeymoon',
  home_fund:   'Home fund',
  charity:     'Charity',
  experience:  'Experience',
  custom:      'Custom',
  other:       'Other',
};

function fmtPrice(price) {
  if (!price && price !== 0) return '';
  return `$${Number(price).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Platform registry card ────────────────────────────────────────────────────
function PlatformCard({ item }) {
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.store_name}
          style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 2px' }}>
          {item.store_name}
        </p>
        {item.description && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0, lineHeight: 1.5 }}>
            {item.description}
          </p>
        )}
      </div>
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#FFFFFF', background: '#0A0A0A', borderRadius: 999, padding: '7px 16px', textDecoration: 'none', fontFamily: PJS, flexShrink: 0 }}
        >
          View registry <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// ── Product gift card ─────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const remaining = (product.quantity_requested || 1) - (product.quantity_purchased || 0);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {product.image_url && (
        <div style={{ height: 160, overflow: 'hidden', background: 'rgba(10,10,10,0.03)' }}>
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.parentElement.style.display = 'none'; }}
          />
        </div>
      )}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {product.category && product.category !== 'other' && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
        )}
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1.3 }}>
          {product.name}
        </p>
        {product.registry_platform && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: 0 }}>
            {product.registry_platform}
          </p>
        )}
        {product.description && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, margin: 0, lineHeight: 1.5 }}>
            {product.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, gap: 8 }}>
          <div>
            {product.price > 0 && (
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
                {fmtPrice(product.price)}
              </span>
            )}
            {remaining > 1 && (
              <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginLeft: 6 }}>
                × {remaining} needed
              </span>
            )}
          </div>
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#E03553', background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999, padding: '5px 12px', textDecoration: 'none', fontFamily: PJS, flexShrink: 0 }}
            >
              View gift <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cash fund card ────────────────────────────────────────────────────────────
function CashFundCard({ fund }) {
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '16px 20px', display: 'flex', gap: 14 }}>
      {fund.image_url && (
        <img
          src={fund.image_url}
          alt={fund.title}
          style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>
            {fund.title}
          </p>
          {fund.requested_amount > 0 && (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, flexShrink: 0 }}>
              {fmtPrice(fund.requested_amount)}
            </span>
          )}
        </div>
        {fund.category && fund.category !== 'custom' && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
            {CATEGORY_LABELS[fund.category] || fund.category}
          </span>
        )}
        {fund.description && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, margin: '4px 0 0', lineHeight: 1.5 }}>
            {fund.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GuestSuiteRegistry() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashFunds, setCashFunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyRecords('RegistryItem'),
      getMyRecords('RegistryProduct'),
      getMyRecords('CustomGift'),
    ])
      .then(([p, pr, cf]) => { setPlatforms(p || []); setProducts(pr || []); setCashFunds(cf || []); })
      .catch(e => console.error('GuestSuiteRegistry load error', e))
      .finally(() => setLoading(false));
  }, []);

  // Only show items not yet fully purchased
  const availableProducts = products.filter(p => (p.quantity_purchased || 0) < (p.quantity_requested || 1));

  // Group products by category
  const productsByCategory = availableProducts.reduce((acc, p) => {
    const cat = p.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const hasAnyContent = platforms.length > 0 || availableProducts.length > 0 || cashFunds.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Registry"
        subtitle="Gift ideas and ways to celebrate with us"
      />

      {/* Connected banner */}
      <div style={{ padding: '10px 32px', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ This is pulled from your Registry planning page and is visible to guests
        </span>
        <button
          onClick={() => navigate(createPageUrl('Registry'))}
          style={{ fontSize: 12, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        >
          Edit in Registry <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : !hasAnyContent ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 48, height: 48, background: 'rgba(10,10,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Gift size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              No registry items added yet
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px', lineHeight: 1.6 }}>
              Add gifts, platforms, and cash funds in Finances → Registry and they'll appear here for guests.
            </p>
            <button
              onClick={() => navigate(createPageUrl('Registry'))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#E03553', background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999, padding: '8px 18px', cursor: 'pointer', fontFamily: PJS }}
            >
              Add gifts in Registry <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

            {/* Registry platforms */}
            {platforms.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 14px' }}>
                  REGISTRY PLATFORMS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {platforms.map(p => <PlatformCard key={p.id} item={p} />)}
                </div>
              </div>
            )}

            {/* Gift items grouped by category */}
            {availableProducts.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 14px' }}>
                  GIFT IDEAS · {availableProducts.length} item{availableProducts.length !== 1 ? 's' : ''}
                  {products.length > availableProducts.length && (
                    <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.6)' }}>
                      {' '}({products.length - availableProducts.length} already purchased — hidden from guests)
                    </span>
                  )}
                </p>
                {Object.entries(productsByCategory).map(([cat, catProducts]) => (
                  <div key={cat} style={{ marginBottom: 28 }}>
                    {Object.keys(productsByCategory).length > 1 && (
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '0 0 12px' }}>
                        {(CATEGORY_LABELS[cat] || cat).toUpperCase()}
                      </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                      {catProducts.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cash funds */}
            {cashFunds.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 14px' }}>
                  CASH FUNDS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cashFunds.map(f => <CashFundCard key={f.id} fund={f} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
