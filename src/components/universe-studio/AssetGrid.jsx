import React, { useState } from 'react';
import { Edit2, Eye, Share2, ExternalLink } from 'lucide-react';
import SaveTheDatePreview from './assets/SaveTheDatePreview';
import MenuCardPreview from './assets/MenuCardPreview';
import SeatingChartPreview from './assets/SeatingChartPreview';
import MotionGraphicPreview from './assets/MotionGraphicPreview';
import InstagramKitPreview from './assets/InstagramKitPreview';
import WelcomeSignagePreview from './assets/WelcomeSignagePreview';
import PlaceCardsPreview from './assets/PlaceCardsPreview';
import ThankYouPreview from './assets/ThankYouPreview';

const ASSET_TYPES = [
  { id: 'save-the-date', label: 'Save the Date', description: 'Digital announcement card', category: 'digital' },
  { id: 'invitation-website', label: 'Invitation Website', description: 'Your live wedding site', category: 'digital' },
  { id: 'rsvp-page', label: 'RSVP Page', description: 'Online RSVP experience', category: 'digital' },
  { id: 'menu-card', label: 'Menu Card', description: 'Dinner menu for tables', category: 'print' },
  { id: 'seating-chart', label: 'Seating Chart', description: 'Guest table assignments', category: 'display' },
  { id: 'motion-graphic', label: 'Motion Graphic', description: 'Animated social announcement', category: 'social' },
  { id: 'instagram-kit', label: 'Instagram Story Kit', description: '5 story frames', category: 'social' },
  { id: 'welcome-signage', label: 'Welcome Signage', description: 'Print-ready A1 sign', category: 'print' },
  { id: 'place-cards', label: 'Guest Place Cards', description: 'Individual name cards', category: 'print' },
  { id: 'thank-you', label: 'Thank You Notes', description: 'Personalised thank you cards', category: 'digital' },
];

const CATEGORY_COLORS = {
  digital: '#6366F1',
  print: '#059669',
  social: '#E03553',
  display: '#D97706',
};

function AssetPreviewWrapper({ assetId, universe, weddingDetails, guests }) {
  switch (assetId) {
    case 'save-the-date': return <SaveTheDatePreview universe={universe} weddingDetails={weddingDetails} />;
    case 'menu-card': return <MenuCardPreview universe={universe} weddingDetails={weddingDetails} />;
    case 'seating-chart': return <SeatingChartPreview universe={universe} weddingDetails={weddingDetails} guests={guests} />;
    case 'motion-graphic': return <MotionGraphicPreview universe={universe} weddingDetails={weddingDetails} />;
    case 'instagram-kit': return <InstagramKitPreview universe={universe} weddingDetails={weddingDetails} />;
    case 'welcome-signage': return <WelcomeSignagePreview universe={universe} weddingDetails={weddingDetails} />;
    case 'place-cards': return <PlaceCardsPreview universe={universe} weddingDetails={weddingDetails} guests={guests} />;
    case 'thank-you': return <ThankYouPreview universe={universe} weddingDetails={weddingDetails} />;
    case 'invitation-website':
    case 'rsvp-page':
      return <WebsiteLinkPreview assetId={assetId} weddingDetails={weddingDetails} />;
    default: return null;
  }
}

function WebsiteLinkPreview({ assetId, weddingDetails }) {
  const slug = weddingDetails?.slug || 'your-wedding';
  const url = assetId === 'rsvp-page'
    ? `${window.location.origin}/w/${slug}/rsvp`
    : `${window.location.origin}/w/${slug}`;
  const label = assetId === 'rsvp-page' ? 'RSVP Page' : 'Invitation Website';

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 16, gap: 8
    }}>
      <div style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ExternalLink size={14} color="rgba(255,255,255,0.6)" />
      </div>
      <p style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, textAlign: 'center', letterSpacing: '0.05em' }}>Live at openinvite</p>
    </div>
  );
}

function AssetCard({ asset, universe, weddingDetails, guests, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const catColor = CATEGORY_COLORS[asset.category] || '#888888';
  const isLink = asset.id === 'invitation-website' || asset.id === 'rsvp-page';
  const slug = weddingDetails?.slug || 'your-wedding';

  const handleAction = (action) => {
    if (action === 'preview' && isLink) {
      const url = asset.id === 'rsvp-page'
        ? `/w/${slug}/rsvp`
        : `/w/${slug}`;
      window.open(url, '_blank');
    } else if (action === 'edit') {
      onEdit(asset.id);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #EEEEEE',
        background: '#FAFAFA',
        transition: 'box-shadow 0.2s ease',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview area */}
      <div style={{ height: 200, overflow: 'hidden', background: '#0A0A0A', position: 'relative' }}>
        <AssetPreviewWrapper
          assetId={asset.id}
          universe={universe}
          weddingDetails={weddingDetails}
          guests={guests}
        />
        {/* Category badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: catColor, padding: '2px 8px',
        }}>
          <p style={{ color: '#fff', fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            {asset.category}
          </p>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 2 }}>{asset.label}</p>
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)' }}>{asset.description}</p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button
            onClick={() => handleAction('edit')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', border: '1px solid #E0E0DC',
              background: 'transparent', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, color: '#444444',
              letterSpacing: '0.1em', textTransform: 'uppercase'
            }}
          >
            <Edit2 size={10} /> Edit
          </button>
          <button
            onClick={() => handleAction('preview')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', border: '1px solid #E0E0DC',
              background: 'transparent', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, color: '#444444',
              letterSpacing: '0.1em', textTransform: 'uppercase'
            }}
          >
            <Eye size={10} /> Preview
          </button>
          <button
            onClick={() => {
              const url = isLink
                ? (asset.id === 'rsvp-page' ? `/w/${slug}/rsvp` : `/w/${slug}`)
                : '#';
              if (isLink) navigator.clipboard.writeText(window.location.origin + url);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', border: '1px solid #E0E0DC',
              background: 'transparent', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, color: '#444444',
              letterSpacing: '0.1em', textTransform: 'uppercase'
            }}
          >
            <Share2 size={10} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetGrid({ universe, weddingDetails, guests, onEdit }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 20
    }}>
      {ASSET_TYPES.map(asset => (
        <AssetCard
          key={asset.id}
          asset={asset}
          universe={universe}
          weddingDetails={weddingDetails}
          guests={guests}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}