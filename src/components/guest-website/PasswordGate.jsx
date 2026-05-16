import React, { useState, useRef } from 'react';

const shake = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }
  .password-shake { animation: shake 0.4s cubic-bezier(0.36, 0, 0.66, -0.56); }
`;

export default function PasswordGate({ wedding, onAuthenticate }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password === wedding.websitePassword) {
      onAuthenticate();
    } else {
      setError(true);
      setPassword('');
      inputRef.current?.shake();
      
      setTimeout(() => setError(false), 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <>
      <style>{shake}</style>
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 300,
            color: '#FFFFFF',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            {wedding.coupleNames || 'The Celebration'}
          </h1>
          
          <p style={{
            fontSize: '13px',
            color: '#888888',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '48px',
          }}>
            This celebration is private.
          </p>

          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="enter password"
              className={error ? 'password-shake' : ''}
              style={{
                width: '200px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${error ? '#E03553' : '#555555'}`,
                padding: '8px 0',
                fontSize: '16px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: error ? '#E03553' : '#FFFFFF',
                textAlign: 'center',
                outline: 'none',
                transition: 'border-color 0.2s ease, color 0.2s ease',
                '::placeholder': {
                  color: '#666666',
                },
              }}
            />
          </form>

          {error && (
            <p style={{ color: '#E03553', fontSize: '12px', letterSpacing: '0.05em' }}>
              Incorrect password
            </p>
          )}
        </div>
      </div>
    </>
  );
}