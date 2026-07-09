import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
const GuestbookEntry = base44.entities.GuestbookEntry;
import { getMyWeddingDetails } from "@/lib/resolveMyWedding";
import { Heart, Trash2 } from "lucide-react";
import toast from 'react-hot-toast';
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";

const PJS = "'Plus Jakarta Sans', sans-serif";

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Guestbook() {
  const [weddingId, setWeddingId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWeddingAndEntries(); }, []);

  const loadWeddingAndEntries = async () => {
    try {
      const wd = await getMyWeddingDetails();
      setWeddingId(wd?.id || null);
      if (wd?.id) {
        const rawEntries = await GuestbookEntry.filter({ wedding_id: wd.id }, '-created_date');
        setEntries(rawEntries.filter(e => !e.is_test));
      }
    } catch {
      toast.error('Failed to load guestbook');
    }
    setLoading(false);
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this guestbook message?')) return;
    const prev = entries;
    setEntries(prev.filter(e => e.id !== entryId)); // optimistic
    try {
      await GuestbookEntry.delete(entryId);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete');
      setEntries(prev); // rollback
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Guestbook" subtitle="Messages your guests have left on your wedding website" />

      <div style={{ padding: '32px 32px 48px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-row" style={{ height: 72 }} />
            ))}
          </div>
        ) : !weddingId ? (
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
            Set up your wedding details first to start collecting guestbook messages.
          </p>
        ) : entries.length === 0 ? (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '64px 32px', textAlign: 'center' }}>
            <Heart size={28} style={{ color: '#803D81', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#444444', fontFamily: PJS, margin: 0 }}>
              No messages yet — they'll appear here once guests sign your guestbook.
            </p>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                  padding: '18px 20px',
                  borderBottom: i < entries.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
                      {entry.guest_name}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
                      {formatDate(entry.created_date)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#444444', lineHeight: 1.6, margin: 0, fontFamily: PJS, whiteSpace: 'pre-wrap' }}>
                    {entry.message}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  title="Delete message"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 4, flexShrink: 0 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
