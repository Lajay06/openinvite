import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { createPageUrl } from '@/utils';
import { Loader2, ChevronDown, ChevronUp, HelpCircle, ArrowRight } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';


const PJS = "'Plus Jakarta Sans', sans-serif";

function QnaItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.07)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 0', textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1.4 }}>
          {item.question}
        </span>
        <span style={{ flexShrink: 0, color: 'rgba(10,10,10,0.35)', display: 'flex' }}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 20, paddingRight: 24 }}>
          {item.answer ? (
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, margin: 0 }}>
              {item.answer}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, fontStyle: 'italic' }}>
              No answer added yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuestSuiteQandA() {
  const navigate = useNavigate();
  const [qna, setQna] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWeddingDetails()
      .then(details => { setQna(details?.qna || []); })
      .catch(e => console.error('GuestSuiteQandA load error', e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Q&A"
        subtitle="Frequently asked questions your guests will see"
      />

      {/* Connected banner */}
      <div style={{
        padding: '10px 32px',
        background: 'rgba(224,53,83,0.04)',
        borderBottom: '1px solid rgba(224,53,83,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ This Q&A is pulled from your planning page and is visible to guests
        </span>
        <button
          onClick={() => navigate(createPageUrl('QandA'))}
          style={{
            fontSize: 12, fontWeight: 700, color: '#E03553',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS,
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          }}
        >
          Edit in Q&A planning page <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : qna.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{
              width: 48, height: 48, background: 'rgba(10,10,10,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <HelpCircle size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              No questions added yet
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>
              Questions added in the Q&A planning page will appear here automatically.
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 4px' }}>
              {qna.length} {qna.length === 1 ? 'question' : 'questions'}
            </p>
            {qna.map((item, i) => (
              <QnaItem key={item.id ?? i} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
