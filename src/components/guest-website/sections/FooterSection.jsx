import React from 'react';

export default function FooterSection({ wedding }) {
  return (
    <footer style={{
      background: '#0A0A0A',
      padding: '60px 80px',
      textAlign: 'center',
      borderTop: '1px solid #222222',
    }}>
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '24px',
        fontWeight: 300,
        color: '#FFFFFF',
        letterSpacing: '0.15em',
        margin: '0 0 16px',
        textTransform: 'uppercase',
      }}>
        {wedding.coupleNames || 'The Celebration'}
      </h3>

      <p style={{
        fontSize: '12px',
        color: '#888888',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        margin: '0 0 40px',
      }}>
        {new Date(wedding.weddingDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      <p style={{
        fontSize: '11px',
        color: '#444444',
        margin: 0,
      }}>
        Made with{' '}
        <span style={{ color: '#E03553' }}>♥</span>
        {' '}using Openinvite
      </p>
    </footer>
  );
}