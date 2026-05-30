import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const MEAL_OPTIONS = [
  { value: 'chicken', label: 'Chicken' },
  { value: 'beef', label: 'Beef' },
  { value: 'fish', label: 'Fish' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

export default function RSVPPage() {
  const { token } = useParams();
  const [guest, setGuest] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    rsvp_status: '',
    meal_choice: '',
    dietary_restrictions: '',
    song_request: '',
    rsvp_note: '',
    plus_one_meal_choice: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [guests, weddings] = await Promise.all([
          base44.entities.Guest.filter({ rsvp_link_id: token }),
          base44.entities.WeddingDetails.list(),
        ]);
        if (guests.length === 0) { setNotFound(true); setLoading(false); return; }
        const g = guests[0];
        setGuest(g);
        setWedding(weddings[0] || null);
        setForm(f => ({
          ...f,
          rsvp_status: g.rsvp_status || '',
          meal_choice: g.meal_choice || '',
          dietary_restrictions: g.dietary_restrictions || '',
          song_request: g.song_request || '',
          rsvp_note: g.rsvp_note || '',
          plus_one_meal_choice: g.plus_one_meal_choice || '',
        }));
        if (g.rsvp_status && g.rsvp_status !== 'pending') setSubmitted(true);
      } catch (e) {
        console.error('RSVP load error', e);
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rsvp_status) return;
    setSubmitting(true);
    try {
      await base44.entities.Guest.update(guest.id, {
        ...form,
        rsvp_date: new Date().toISOString().split('T')[0],
      });
      setSubmitted(true);
    } catch (err) {
      console.error('RSVP submit error', err);
      alert('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const c1 = wedding?.couple1Name || '';
  const c2 = wedding?.couple2Name || '';
  const coupleName = c1 && c2 ? `${c1} & ${c2}` : c1 || c2 || '';
  const weddingDate = wedding?.weddingDate || '';
  const venue = wedding?.mainCeremony?.venueName || '';

  const dateStr = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const firstName = guest?.name ? guest.name.split(' ')[0] : '';

  const attending = form.rsvp_status === 'attending';
  const hasMealOptions = wedding?.mealOptions && wedding.mealOptions.length > 0;
  const mealChoices = hasMealOptions ? wedding.mealOptions : MEAL_OPTIONS;

  const fontStyle = { fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif" };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', ...fontStyle }}>
        <div style={{ width: 28, height: 28, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: '24px', ...fontStyle }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 12 }}>INVITATION NOT FOUND</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', marginBottom: 12, letterSpacing: '-0.02em' }}>This link has expired or is invalid</h1>
          <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6 }}>Please contact the couple directly for a new invitation link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', padding: '24px', ...fontStyle }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ width: 56, height: 56, background: attending ? '#F0FDF4' : '#F5F5F5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>
            {attending ? '✓' : '♥'}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E03553', letterSpacing: '0.1em', marginBottom: 12 }}>
            {attending ? 'SEE YOU THERE' : 'RESPONSE RECEIVED'}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A0A0A', marginBottom: 16, letterSpacing: '-0.02em' }}>
            {attending ? `We can't wait to celebrate with you!` : 'Thank you for letting us know'}
          </h1>
          {attending && dateStr && (
            <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6 }}>
              Mark your calendar — {dateStr}.{venue ? ` We'll see you at ${venue}.` : ''}
            </p>
          )}
          {!attending && (
            <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6 }}>
              You'll be missed. Thank you for taking the time to respond.
            </p>
          )}
          <button
            onClick={() => setSubmitted(false)}
            style={{ marginTop: 24, background: 'none', border: 'none', fontSize: 13, color: 'rgba(10,10,10,0.4)', cursor: 'pointer', ...fontStyle, textDecoration: 'underline' }}
          >
            Change my response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', ...fontStyle }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Logo */}
        <p style={{ fontSize: 13, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', marginBottom: 48 }}>openinvite</p>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', letterSpacing: '0.12em', marginBottom: 10 }}>YOU'RE INVITED</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12 }}>
            {coupleName || 'A Wedding'}
          </h1>
          {dateStr && <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)', marginBottom: 4 }}>{dateStr}</p>}
          {venue && <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.55)' }}>{venue}</p>}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', marginBottom: 40 }} />

        {/* Greeting */}
        {firstName && (
          <p style={{ fontSize: 16, color: '#0A0A0A', marginBottom: 8 }}>Hi {firstName},</p>
        )}
        <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.65)', lineHeight: 1.7, marginBottom: 36 }}>
          {coupleName || 'We'} would love to know if you can join {coupleName ? 'them' : 'us'} to celebrate. Please take a moment to respond below.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Attending / Not attending */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 12, letterSpacing: '-0.01em' }}>Will you be attending?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { value: 'attending', label: 'Attending' },
                { value: 'declined', label: 'Unable to attend' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rsvp_status: opt.value }))}
                  style={{
                    flex: 1, padding: '12px 16px', border: '1px solid',
                    borderColor: form.rsvp_status === opt.value ? '#E03553' : 'rgba(10,10,10,0.12)',
                    background: form.rsvp_status === opt.value ? '#FFF0F3' : '#FFFFFF',
                    color: form.rsvp_status === opt.value ? '#E03553' : '#0A0A0A',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 8,
                    transition: 'all 0.15s ease',
                    fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields shown only when attending */}
          {attending && (
            <>
              {/* Meal choice */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
                  Meal preference
                </label>
                <select
                  value={form.meal_choice}
                  onChange={e => setForm(f => ({ ...f, meal_choice: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                    borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                    fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif", outline: 'none',
                  }}
                >
                  <option value="">Select a meal</option>
                  {mealChoices.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Dietary restrictions */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
                  Dietary restrictions
                  <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.4)', marginLeft: 6 }}>optional</span>
                </label>
                <input
                  type="text"
                  value={form.dietary_restrictions}
                  onChange={e => setForm(f => ({ ...f, dietary_restrictions: e.target.value }))}
                  placeholder="e.g. gluten free, nut allergy"
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                    borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                    fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif", outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Plus one meal if applicable */}
              {guest?.plus_one && guest?.plus_one_name && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
                    Meal preference for {guest.plus_one_name}
                  </label>
                  <select
                    value={form.plus_one_meal_choice}
                    onChange={e => setForm(f => ({ ...f, plus_one_meal_choice: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                      borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                      fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif", outline: 'none',
                    }}
                  >
                    <option value="">Select a meal</option>
                    {mealChoices.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Song request */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
                  Song request
                  <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.4)', marginLeft: 6 }}>optional</span>
                </label>
                <input
                  type="text"
                  value={form.song_request}
                  onChange={e => setForm(f => ({ ...f, song_request: e.target.value }))}
                  placeholder="What song will get you on the dance floor?"
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                    borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                    fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif", outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          {/* Note for couple */}
          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0A0A0A', marginBottom: 8 }}>
              {attending ? 'Message for the couple' : 'Leave a note'}
              <span style={{ fontWeight: 400, color: 'rgba(10,10,10,0.4)', marginLeft: 6 }}>optional</span>
            </label>
            <textarea
              value={form.rsvp_note}
              onChange={e => setForm(f => ({ ...f, rsvp_note: e.target.value }))}
              placeholder={attending ? "We're so excited to celebrate with you!" : "Sorry we can't make it — wishing you a wonderful day!"}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.15)',
                borderRadius: 8, fontSize: 14, color: '#0A0A0A', background: '#FFFFFF',
                fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif", outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.rsvp_status || submitting}
            style={{
              width: '100%', padding: '14px 24px', background: '#E03553', color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif", letterSpacing: '0.01em',
              opacity: (!form.rsvp_status || submitting) ? 0.5 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {submitting ? 'Sending…' : 'Submit RSVP'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(10,10,10,0.3)', marginTop: 48 }}>
          Powered by openinvite.com.au
        </p>
      </div>
    </div>
  );
}
