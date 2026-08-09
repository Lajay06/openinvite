import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function OnboardingWelcome({ onNext }) {
  return (
    <div style={{ width: '100%' }}>

      {/* Headline */}
      <h1 style={{
        fontSize: 52, fontWeight: 800,
        letterSpacing: '-0.03em', lineHeight: 1.1,
        color: '#0A0A0A',
        fontFamily: PJS, margin: '0 0 24px',
      }}>
        Weddings are complicated.<br />Openinvite isn't.
      </h1>

      {/* Subheadline */}
      <p style={{
        fontSize: 17, lineHeight: 1.65,
        color: 'rgba(10,10,10,0.6)',
        fontFamily: PJS, margin: 0,
      }}>
        Let's get you set up in a few minutes.
      </p>

      {/* CTA button */}
      <div style={{ marginTop: 40 }}>
        <button
          onClick={() => onNext({})}
          className="rounded-full text-white font-semibold bg-[#E03553] hover:bg-black hover:text-white active:bg-neutral-900 transition-colors duration-150 border-none cursor-pointer"
          style={{ padding: '14px 36px', fontSize: 15, fontFamily: PJS }}
        >
          Get started
        </button>
      </div>

      {/* Takes about text */}
      <p style={{
        fontSize: 11, marginTop: 16,
        color: 'rgba(10,10,10,0.6)',
        fontFamily: PJS,
      }}>
        Takes about 3 minutes
      </p>
    </div>
  );
}
