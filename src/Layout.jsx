import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Loader2, Menu } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AnimatedSidebar, MobileSidebarContent } from "./components/layout/AnimatedSidebar";
import TipsModal from "./components/dashboard/TipsModal";
import CollaborateModal from "./components/layout/CollaborateModal";
import AvaChatPod from "./components/layout/AvaChatPod";
import Header from "./components/layout/Header";
import { base44 } from '@/api/base44Client';
import { Invitation } from '@/entities/Invitation';
import { GuestMessage } from '@/entities/GuestMessage';
import toast, { Toaster } from 'react-hot-toast';

const SIDEBAR_WIDTH = 200;

const noLayoutPages = [
  "Home", "Features", "Pricing", "CouplesStudio", "PlanSelection",
  "Onboarding", "PaymentWall", "GuestWebsite", "WeddingWebsiteEditor",
];

const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' }, { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' }, { code: 'hi', name: 'हिन्दी' }, { code: 'ru', name: 'Русский' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }, { code: 'JPY', symbol: '¥', name: 'Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }, { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' }, { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showAccountSettings, setShowAccountSettings] = React.useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = React.useState(false);
  const [showTipsModal, setShowTipsModal] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState(0);
  const [weddingName, setWeddingName] = React.useState('');
  const [userSettings, setUserSettings] = React.useState({ full_name: '', language: 'en', currency: 'USD' });
  const [savingSettings, setSavingSettings] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setUserSettings({
          full_name: currentUser.full_name || '',
          language: currentUser.language || 'en',
          currency: currentUser.currency || 'USD',
        });
        try {
          const messages = await GuestMessage.list();
          setUnreadMessagesCount(messages.filter(m => !m.read).length);
        } catch {}
        const invitations = await Invitation.list();
        if (invitations.length > 0) setWeddingName(invitations[0].couple_names);
      } catch {}
    };
    fetchData();
  }, [location.pathname]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const tid = toast.loading('Saving…');
    try {
      await base44.auth.updateMe({
        full_name: userSettings.full_name,
        language: userSettings.language,
        currency: userSettings.currency,
      });
      setUser(prev => ({ ...prev, ...userSettings }));
      toast.success('Saved.', { id: tid });
      setShowAccountSettings(false);
    } catch {
      toast.error('Failed to save.', { id: tid });
    }
    setSavingSettings(false);
  };

  if (noLayoutPages.includes(currentPageName)) return <>{children}</>;

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <Toaster
        toastOptions={{
          style: {
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '13px',
            borderRadius: '0',
            background: '#111',
            color: '#fff',
            border: '1px solid #222',
          },
        }}
      />

      {/* ── Desktop: fixed sidebar ───────────────────────── */}
      <div className="hidden lg:block">
        <AnimatedSidebar
          weddingName={weddingName}
          onAccountSettings={() => setShowAccountSettings(true)}
          onCollaborate={() => setShowCollaborateModal(true)}
          onOpenTips={() => setShowTipsModal(true)}
        />
      </div>

      {/* ── Desktop: fixed header bar (right of sidebar) ── */}
      <div
        className="hidden lg:block"
        style={{
          position: 'fixed',
          top: 0,
          left: SIDEBAR_WIDTH,
          right: 0,
          zIndex: 30,
        }}
      >
        <Header
          weddingName={weddingName}
          onAccountSettings={() => setShowAccountSettings(true)}
          unreadCount={unreadMessagesCount}
        />
      </div>

      {/* ── Mobile: fixed top bar ───────────────────────── */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          height: 64,
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(10,10,10,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 20, width: 'auto', objectFit: 'contain' }}
        />
        <button
          onClick={() => setMobileMenuOpen(true)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#0A0A0A', padding: 8, borderRadius: 999,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Mobile: nav sheet (controlled, no trigger needed) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0" style={{ borderRight: '1px solid #E4E4E4' }}>
          <MobileSidebarContent
            weddingName={weddingName}
            onClose={() => setMobileMenuOpen(false)}
            onAccountSettings={() => { setMobileMenuOpen(false); setShowAccountSettings(true); }}
            onCollaborate={() => { setMobileMenuOpen(false); setShowCollaborateModal(true); }}
          />
        </SheetContent>
      </Sheet>

      {/* ── Account settings modal ───────────────────────── */}
      {showAccountSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-6">
          <div
            style={{ background: '#FFFFFF', border: '1px solid #EEEEEE' }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#E8E8E8]">
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
                Account
              </h2>
              <button
                onClick={() => setShowAccountSettings(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', padding: 4, borderRadius: 999 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-8 py-6 space-y-6">
              <div>
                <label className="form-label">Full name</label>
                <input
                  type="text"
                  className="input-editorial"
                  placeholder="Your name"
                  value={userSettings.full_name || ''}
                  onChange={e => setUserSettings(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  className="input-editorial"
                  value={user?.email || ''}
                  disabled
                  style={{ color: '#AAAAAA', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: 12 }}>Language</label>
                <Select
                  value={userSettings.language}
                  onValueChange={v => setUserSettings(p => ({ ...p, language: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: 12 }}>Currency</label>
                <Select
                  value={userSettings.currency}
                  onValueChange={v => setUserSettings(p => ({ ...p, currency: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="btn-primary flex items-center justify-center gap-2 flex-1"
                >
                  {savingSettings && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save changes
                </button>
                <button
                  onClick={() => setShowAccountSettings(false)}
                  className="btn-editorial-secondary flex-1 justify-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCollaborateModal && <CollaborateModal onClose={() => setShowCollaborateModal(false)} />}
      {showTipsModal && <TipsModal onClose={() => setShowTipsModal(false)} />}

      {/* ── Floating Ava button ──────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 8000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
        {chatOpen && <AvaChatPod onClose={() => setChatOpen(false)} />}
        <button
          onClick={() => setChatOpen(prev => !prev)}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: chatOpen ? '#0A0A0A' : 'linear-gradient(135deg, #ec4899, #9333ea)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(147,51,234,0.35)',
            transition: 'transform 0.2s ease, background 0.2s ease',
            color: '#FFFFFF',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05) rotate(5deg)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        >
          {chatOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="white" />
              <circle cx="19" cy="10" r="1.5" fill="white" />
              <circle cx="5" cy="10" r="1.5" fill="white" />
              <circle cx="16" cy="18" r="1.5" fill="white" />
              <circle cx="8" cy="18" r="1.5" fill="white" />
              <line x1="12" y1="5" x2="19" y2="10" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" />
              <line x1="12" y1="5" x2="5" y2="10" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" />
              <line x1="5" y1="10" x2="8" y2="18" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" />
              <line x1="19" y1="10" x2="16" y2="18" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" />
              <line x1="8" y1="18" x2="16" y2="18" stroke="white" strokeWidth="0.75" strokeOpacity="0.6" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      {/* Desktop: offset right of sidebar, below fixed header */}
      <div
        className="hidden lg:block page-content"
        style={{ marginLeft: SIDEBAR_WIDTH, paddingTop: 64 }}
      >
        {children}
      </div>

      {/* Mobile: full width, below fixed top bar */}
      <div
        className="lg:hidden page-content"
        style={{ paddingTop: 64 }}
      >
        {children}
      </div>
    </div>
  );
}
