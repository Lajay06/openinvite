import React from 'react';
import { useNavigate } from 'react-router-dom';
import { interactiveDivProps } from '@/lib/a11y';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function UniverseSelectedChoice({ universe, coupleName, onClose }) {
  const navigate = useNavigate();

  const handleChoice = (choice) => {
    if (choice === 'builder') navigate('/studio/website?from=universe');
    else navigate('/dashboard');
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogContent fullBleed hideClose title={`${universe.name} universe selected`} className="flex flex-col items-center justify-center" style={{
      background: '#0A0A0A',
      padding: 40,
      animation: 'fadeIn 0.4s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Confirmation */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 12 }}>
          {universe.name} Universe selected
        </p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(36px, 8vw, 72px)', color: '#FFFFFF', margin: '0 0 16px', lineHeight: 1 }}>
          {universe.name}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          Applied to all 10 assets in your Guest Suite
        </p>
      </div>

      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>
        Ready to build your wedding website?
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 320, width: '100%' }}>
        {/* Website Builder */}
        <div
          onClick={() => handleChoice('builder')}
          {...interactiveDivProps(() => handleChoice('builder'), { label: 'Website Builder' })}
          style={{ padding: '40px 32px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <div style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>Website Builder</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: '0 0 20px' }}>
            Full creative control. Edit every section, page, and asset yourself.
          </p>
        </div>
      </div>

      <button onClick={() => handleChoice('dashboard')} style={{ marginTop: 32, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Go to dashboard →
      </button>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </DialogContent>
    </Dialog>
  );
}