import React from 'react';
import StillTemplate from '../guest-website/StillTemplate';

export default function WebsitePreview({ wedding }) {
  if (!wedding.slug) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          aspectRatio: '9/16',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 100%)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '28px', background: '#1a1a1a', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: '10px', color: '#666666' }}>openinvite.com/w/your-slug</p>
        </div>

        <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: 300, margin: 0, marginTop: '40px' }}>
          Set your URL slug in Settings to see live preview.
        </p>

        <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '10px', color: '#666666', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          PREVIEW
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '560px',
        aspectRatio: '9/16',
        background: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        position: 'relative',
      }}
    >
      {/* Browser Chrome */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '28px', background: '#F5F5F5', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <p style={{ fontSize: '10px', color: '#888888' }}>openinvite.com/w/{wedding.slug}</p>
      </div>

      {/* Preview Watermark */}
      <div style={{ position: 'absolute', top: '8px', right: '12px', fontSize: '10px', color: '#AAAAAA', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 11 }}>
        PREVIEW
      </div>

      {/* Actual Preview Content */}
      <div
        style={{
          marginTop: '28px',
          height: 'calc(100% - 28px)',
          overflow: 'hidden',
          transform: 'scale(0.75)',
          transformOrigin: 'top center',
          width: '133.333%',
          position: 'relative',
          left: '-16.666%',
        }}
      >
        <StillTemplate wedding={wedding} isPreview={true} />
      </div>
    </div>
  );
}