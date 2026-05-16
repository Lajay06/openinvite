import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Utensils, Users, Copy, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';
import toast from 'react-hot-toast';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 8,
};

const valueStyle = {
  fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
};

const MEAL_LABELS = {
  beef: 'Beef', chicken: 'Chicken', fish: 'Fish',
  vegetarian: 'Vegetarian', vegan: 'Vegan', kids_meal: 'Kids meal',
};

export default function RSVPManagement({ guests }) {
  const [copiedLink, setCopiedLink] = useState(false);

  const stats = React.useMemo(() => {
    const total = guests.length;
    const responded = guests.filter(g => g.rsvp_status && g.rsvp_status !== 'pending').length;
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined = guests.filter(g => g.rsvp_status === 'declined').length;
    const pending = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const plusOnesAttending = guests.filter(g => g.plus_one && g.plus_one_rsvp === 'attending').length;
    const totalAttendees = attending + plusOnesAttending;
    const mealCounts = {};
    guests.forEach(g => {
      if (g.rsvp_status === 'attending' && g.meal_choice)
        mealCounts[g.meal_choice] = (mealCounts[g.meal_choice] || 0) + 1;
      if (g.plus_one_rsvp === 'attending' && g.plus_one_meal_choice)
        mealCounts[g.plus_one_meal_choice] = (mealCounts[g.plus_one_meal_choice] || 0) + 1;
    });
    return { total, responded, attending, declined, pending, responseRate, plusOnesAttending, totalAttendees, mealCounts };
  }, [guests]);

  const handleCopy = () => {
    const url = `${window.location.origin}${createPageUrl('GuestRSVP')}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('RSVP link copied');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const STAT_ITEMS = [
    { label: 'Response rate', display: `${stats.responseRate}%`, sub: `${stats.responded} of ${stats.total} guests` },
    { label: 'Total attending', display: stats.totalAttendees, sub: `${stats.attending} guests + ${stats.plusOnesAttending} plus-ones` },
    { label: 'Pending', display: stats.pending, sub: 'Awaiting response' },
    { label: 'Declined', display: stats.declined, sub: 'Unable to attend' },
  ];

  const dietaryGuests = guests.filter(g => g.dietary_restrictions || g.plus_one_dietary_restrictions);
  const specialGuests = guests.filter(g => g.special_requests);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* RSVP link */}
      <div style={{ background: '#0A0A0A', padding: '24px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Guest RSVP portal
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Share this link with your guests so they can RSVP online
          </p>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 14px', fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' }}>
            {window.location.origin}{createPageUrl('GuestRSVP')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button onClick={handleCopy} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Copy size={13} />
            {copiedLink ? 'Copied!' : 'Copy link'}
          </button>
          <a
            href={createPageUrl('GuestRSVP')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-editorial-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', textDecoration: 'none', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <ExternalLink size={13} />
            Preview
          </a>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', border: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_ITEMS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '20px 24px', borderRight: i < STAT_ITEMS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={valueStyle}>{s.display}</p>
            <p style={{ fontSize: 11, color: '#444444', margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="meals">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="meals">
            <Utensils size={13} style={{ marginRight: 6 }} />
            Meal selections
          </TabsTrigger>
          <TabsTrigger value="special">Special requests</TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-6 space-y-6">
          {/* Meal counts */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Meal counts
            </p>
            {Object.keys(MEAL_LABELS).map(key => {
              const count = stats.mealCounts[key] || 0;
              const pct = stats.totalAttendees > 0 ? ((count / stats.totalAttendees) * 100).toFixed(1) : 0;
              return (
                <div key={key} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', padding: '14px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{MEAL_LABELS[key]}</span>
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{count} guests ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 2, background: 'rgba(10,10,10,0.08)', borderRadius: 0 }}>
                    <div style={{ width: `${pct}%`, height: 2, background: 'linear-gradient(90deg, #E03553 0%, #803D81 100%)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.mealCounts).length === 0 && (
              <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '32px 0', textAlign: 'center' }}>
                No meal selections yet
              </p>
            )}
          </div>

          {/* Dietary restrictions */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Dietary restrictions
            </p>
            {dietaryGuests.length === 0 ? (
              <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px 0', textAlign: 'center' }}>
                No dietary restrictions reported
              </p>
            ) : dietaryGuests.map(guest => (
              <div key={guest.id} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', padding: '12px 0' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.name}</p>
                {guest.dietary_restrictions && (
                  <p style={{ fontSize: 12, color: '#444444', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.dietary_restrictions}</p>
                )}
                {guest.plus_one_dietary_restrictions && (
                  <p style={{ fontSize: 12, color: '#444444', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {guest.plus_one_name || 'Plus one'}: {guest.plus_one_dietary_restrictions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="special" className="mt-6">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Special requests & notes
          </p>
          {specialGuests.length === 0 ? (
            <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '32px 0', textAlign: 'center' }}>
              No special requests
            </p>
          ) : specialGuests.map(guest => (
            <div key={guest.id} style={{ borderBottom: '1px solid rgba(10,10,10,0.06)', padding: '12px 0' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.name}</p>
              <p style={{ fontSize: 12, color: '#444444', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{guest.special_requests}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
