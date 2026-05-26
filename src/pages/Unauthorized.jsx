import React from 'react';
import { Link } from 'react-router-dom';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function Unauthorized() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        fontFamily: PJS,
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', marginBottom: 56 }}>
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 22, width: 'auto', filter: 'brightness(0)' }}
        />
      </Link>

      {/* Error code */}
      <p
        style={{
          fontSize: 'clamp(72px, 15vw, 120px)',
          fontWeight: 800,
          color: '#E03553',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          margin: '0 0 24px',
        }}
      >
        401
      </p>

      {/* Heading */}
      <h1
        style={{
          fontSize: 'clamp(22px, 4vw, 30px)',
          fontWeight: 700,
          color: '#0A0A0A',
          letterSpacing: '-0.02em',
          margin: '0 0 12px',
          textAlign: 'center',
        }}
      >
        You need to sign in
      </h1>

      {/* Subtext */}
      <p
        style={{
          fontSize: 15,
          color: 'rgba(10,10,10,0.45)',
          lineHeight: 1.6,
          margin: '0 0 40px',
          textAlign: 'center',
          maxWidth: 380,
        }}
      >
        Please sign in to access this page.
      </p>

      {/* Button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 24px', borderRadius: 999,
            background: '#E03553', color: '#FFFFFF',
            fontSize: 13, fontWeight: 700, fontFamily: PJS,
            textDecoration: 'none', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Sign in
        </Link>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '10px 24px', borderRadius: 999,
            background: 'rgba(10,10,10,0.06)',
            border: '1px solid rgba(10,10,10,0.12)',
            color: '#0A0A0A',
            fontSize: 13, fontWeight: 700, fontFamily: PJS,
            textDecoration: 'none', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
