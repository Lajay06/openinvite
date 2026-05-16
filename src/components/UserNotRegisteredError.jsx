import React from "react";
import { base44 } from "@/api/base44Client";

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="mb-12">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: '#fff', fontSize: 24, letterSpacing: '-0.03em' }}>openinvite</h1>
        </div>

        {/* Icon */}
        <div className="mb-8">
          <div className="w-12 h-12 border border-[#E03553] flex items-center justify-center mb-6">
            <svg className="w-5 h-5 text-[#E03553]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-white text-3xl font-bold tracking-tight mb-3">Access restricted.</h2>
          <p className="text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
            Your account isn't registered for this app. Please contact the administrator to request access, or try a different account.
          </p>
        </div>

        <hr className="border-[#222222] mb-8" />

        <div className="space-y-3">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>What you can do</p>
          <ul className="space-y-2 text-[rgba(255,255,255,0.5)] text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 flex-shrink-0 bg-[#E03553]" />
              Verify you're signed in with the correct Google or email account
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 flex-shrink-0 bg-[#E03553]" />
              Contact the wedding planner or app owner to grant access
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 flex-shrink-0 bg-[#E03553]" />
              Sign out and try again with a different account
            </li>
          </ul>
        </div>

        <div className="mt-10 flex gap-3">
          <button
            onClick={() => base44.auth.logout("/")}
            className="btn-primary"
          >
            Sign out &amp; try again
          </button>
          <a
            href="/"
            className="btn-editorial-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}