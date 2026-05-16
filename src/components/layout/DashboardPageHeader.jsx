import React, { useState, useEffect } from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

function useCoupleInfo() {
  const coupleName = localStorage.getItem('oi_couple_name') || 'Sarah & James';
  const dateStr = localStorage.getItem('oi_wedding_date') || '2026-06-14';
  const city = localStorage.getItem('oi_city') || 'Sydney';

  const weddingDate = new Date(dateStr);
  const today = new Date();
  const daysToGo = Math.ceil((weddingDate - today) / (1000 * 60 * 60 * 24));

  const formattedDate = weddingDate.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return { coupleName, daysToGo, formattedDate, city };
}

function useWeather() {
  const [weather, setWeather] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('oi_weather') || 'null');
      if (cached && Date.now() - cached.ts < 30 * 60 * 1000) return cached.data;
    } catch {}
    return null;
  });

  useEffect(() => {
    if (weather) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
        );
        const d = await res.json();
        const w = { temp: Math.round(d.current_weather.temperature), code: d.current_weather.weathercode };
        setWeather(w);
        localStorage.setItem('oi_weather', JSON.stringify({ data: w, ts: Date.now() }));
      } catch {}
    }, () => {});
  }, []);

  return weather;
}

export default function DashboardPageHeader({ title, subtitle }) {
  const { coupleName, daysToGo, formattedDate } = useCoupleInfo();
  const weather = useWeather();

  const dotStyle = { width: 3, height: 3, borderRadius: '50%', background: 'rgba(10,10,10,0.2)', flexShrink: 0 };

  return (
    <div style={{
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(10,10,10,0.08)',
      padding: '14px 32px 12px',
    }}>
      {/* Top row — couple info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>
          {coupleName}
        </span>
        <div style={dotStyle} />
        <span style={{ fontSize: 13, color: '#444444', fontFamily: PJS }}>{formattedDate}</span>
        <div style={dotStyle} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E03553', fontFamily: PJS }}>
          {daysToGo > 0 ? `${daysToGo} days to go` : daysToGo === 0 ? 'Today!' : 'The big day has passed'}
        </span>
        {weather && (
          <>
            <div style={dotStyle} />
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              ☀ {weather.temp}°C
            </span>
          </>
        )}
      </div>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS, letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <span style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, flexShrink: 0 }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
