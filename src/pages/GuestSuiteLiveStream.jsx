import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyLiveStream } from '@/lib/resolveMyWedding';
import { createPageUrl } from '@/utils';
import { Loader2, Video, ExternalLink, ArrowRight, Calendar, Clock, Lock, FileText, Radio } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?(?:[^&]*&)*v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/live\/([^?/]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1].split('&')[0]}?rel=0&modestbranding=1`;
  }
  return null;
}

function fmtDateTime(dt) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '';
    const datePart = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} at ${timePart}`;
  } catch { return dt; }
}

export default function GuestSuiteLiveStream() {
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyLiveStream()
      .then(s => setStream(s))
      .catch(e => console.error('GuestSuiteLiveStream load error', e))
      .finally(() => setLoading(false));
  }, []);

  const youtubeEmbedUrl = stream?.stream_url ? getYouTubeEmbedUrl(stream.stream_url) : null;
  const hasStream = stream?.stream_url;
  const dateTimeStr = fmtDateTime(stream?.scheduled_start);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Live stream"
        subtitle="Watch the wedding live from anywhere in the world"
      />

      {/* Connected banner */}
      <div style={{
        padding: '10px 32px', background: 'rgba(224,53,83,0.04)',
        borderBottom: '1px solid rgba(224,53,83,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ This is pulled from your Live stream planning page and is visible to guests
        </span>
        <button
          onClick={() => navigate(createPageUrl('LiveStreaming'))}
          style={{ fontSize: 12, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
        >
          Edit <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : !hasStream ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 48, height: 48, background: 'rgba(10,10,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Video size={22} style={{ color: 'rgba(10,10,10,0.25)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>
              Live stream details coming soon
            </p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>
              Check back closer to the wedding day.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Live indicator */}
            {stream.is_live && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E03553', color: '#FFFFFF', padding: '6px 14px', borderRadius: 999, fontFamily: PJS, fontSize: 12, fontWeight: 700, width: 'fit-content' }}>
                <Radio size={11} />
                LIVE NOW
              </div>
            )}

            {/* Title */}
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {stream.title || 'Watch live'}
              </h2>
              {dateTimeStr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
                  <Calendar size={14} strokeWidth={1.8} />
                  {dateTimeStr}
                </div>
              )}
            </div>

            {/* YouTube embed */}
            {youtubeEmbedUrl && (
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  src={youtubeEmbedUrl}
                  title={stream.title || 'Wedding live stream'}
                  frameBorder="0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            )}

            {/* Watch live button — always shown, even with embed */}
            <a
              href={stream.stream_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', background: '#E03553', color: '#FFFFFF',
                borderRadius: 999, textDecoration: 'none',
                fontSize: 16, fontWeight: 700, fontFamily: PJS,
                width: youtubeEmbedUrl ? 'fit-content' : '100%',
                justifyContent: 'center',
              }}
            >
              {stream.is_live ? <Radio size={16} /> : <ExternalLink size={16} />}
              {stream.is_live ? 'Watch now' : 'Watch live'}
            </a>

            {/* Password */}
            {stream.password && (
              <div style={{ padding: '14px 18px', border: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={14} strokeWidth={1.8} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, display: 'block', marginBottom: 2 }}>
                    Password required
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '0.05em' }}>
                    {stream.password}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            {stream.notes && (
              <div style={{ padding: '14px 18px', background: 'rgba(10,10,10,0.02)', border: '1px solid rgba(10,10,10,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <FileText size={13} strokeWidth={1.8} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
                    Instructions
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.7)', fontFamily: PJS, margin: 0, lineHeight: 1.7 }}>
                  {stream.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
