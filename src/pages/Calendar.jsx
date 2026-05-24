import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import toast from 'react-hot-toast';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { base44 } from "@/api/base44Client";
const Vendor = base44.entities.Vendor;
const Schedule = base44.entities.Schedule;
const WeddingDetails = base44.entities.WeddingDetails;
const Invitation = base44.entities.Invitation;
const Photographer = base44.entities.Photographer;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  margin: 0, marginBottom: 10,
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

const EVENT_STYLES = {
  wedding:     { background: 'rgba(224,53,83,0.12)',  color: '#E03553',  dot: '#E03553' },
  vendor:      { background: 'rgba(58,122,150,0.12)', color: '#3a7a96',  dot: '#3a7a96' },
  schedule:    { background: 'rgba(107,119,0,0.12)',  color: '#6b7700',  dot: '#6b7700' },
  photography: { background: 'rgba(128,61,129,0.12)', color: '#803D81',  dot: '#803D81' },
  custom:      { background: 'rgba(10,10,10,0.06)',   color: '#444444',  dot: '#444444' },
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', description: '', type: 'custom' });
  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => { loadAllEvents(); }, []);

  const loadAllEvents = async () => {
    setLoading(true);
    try {
      const [vendors, scheduleItems, weddingDetails, invitations, photographers] = await Promise.all([
        Vendor.list().catch(() => []),
        Schedule.list().catch(() => []),
        WeddingDetails.list().catch(() => []),
        Invitation.list().catch(() => []),
        Photographer.list().catch(() => [])
      ]);

      const allEvents = [];

      if (invitations.length > 0 && invitations[0].wedding_date) {
        allEvents.push({
          id: 'wedding-day',
          title: `Wedding day: ${invitations[0].couple_names || 'Your wedding'}`,
          date: invitations[0].wedding_date, time: '',
          description: 'Your special day!', type: 'wedding'
        });
        if (invitations[0].rsvp_deadline) {
          allEvents.push({
            id: 'rsvp-deadline', title: 'RSVP deadline',
            date: invitations[0].rsvp_deadline, time: '',
            description: 'Last day for guest RSVPs', type: 'wedding'
          });
        }
      }

      scheduleItems.forEach(item => {
        if (item.event_date) {
          allEvents.push({
            id: `schedule-${item.id}`, title: item.event_name,
            date: item.event_date, time: item.start_time || '',
            description: item.description || '', type: 'schedule'
          });
        }
      });

      vendors.forEach(vendor => {
        if (vendor.contract_date) {
          allEvents.push({
            id: `vendor-${vendor.id}`, title: `${vendor.name} contract`,
            date: vendor.contract_date, time: '',
            description: `${vendor.category} vendor contract signed`, type: 'vendor'
          });
        }
      });

      photographers.forEach(photographer => {
        if (photographer.booking_date) {
          allEvents.push({
            id: `photographer-${photographer.id}`, title: `${photographer.name} booking`,
            date: photographer.booking_date, time: photographer.start_time || '',
            description: 'Photography session', type: 'photography'
          });
        }
        if (photographer.meeting_date) {
          allEvents.push({
            id: `photographer-meeting-${photographer.id}`, title: `Meeting: ${photographer.name}`,
            date: photographer.meeting_date.split('T')[0],
            time: photographer.meeting_date.split('T')[1]?.substring(0, 5) || '',
            description: 'Consultation meeting', type: 'photography'
          });
        }
      });

      setEvents([...allEvents, ...customEvents]);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Failed to load events");
    }
    setLoading(false);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return {
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      startingDayOfWeek: new Date(year, month, 1).getDay()
    };
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      toast.error('Enter event title and date');
      return;
    }
    const eventWithId = { ...newEvent, id: `custom-${Date.now()}` };
    setCustomEvents(prev => [...prev, eventWithId]);
    setEvents(prev => [...prev, eventWithId]);
    setNewEvent({ title: '', date: '', time: '', description: '', type: 'custom' });
    setShowEventForm(false);
    toast.success('Event added!');
  };

  const handleDeleteEvent = (event) => {
    if (event.type !== 'custom') {
      toast.error('Cannot delete auto-generated events');
      return;
    }
    setCustomEvents(prev => prev.filter(e => e.id !== event.id));
    setEvents(prev => prev.filter(e => e.id !== event.id));
    if (selectedDate) {
      const remaining = selectedDate.events.filter(e => e.id !== event.id);
      setSelectedDate(remaining.length > 0 ? { ...selectedDate, events: remaining } : null);
    }
    toast.success('Event deleted');
  };

  const exportToICalendar = () => {
    let icalContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Planner//EN', 'CALSCALE:GREGORIAN'];
    events.forEach(event => {
      const startDate = event.date.replace(/-/g, '');
      const startTime = event.time ? event.time.replace(/:/g, '') + '00' : '000000';
      icalContent.push('BEGIN:VEVENT');
      icalContent.push(`DTSTART:${startDate}T${startTime}`);
      icalContent.push(`SUMMARY:${event.title}`);
      if (event.description) icalContent.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
      icalContent.push(`UID:${event.id}@weddingplanner.com`);
      icalContent.push('END:VEVENT');
    });
    icalContent.push('END:VCALENDAR');
    const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding-events.ics';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar exported!');
  };

  const stats = React.useMemo(() => {
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).length;
    const pastEvents = totalEvents - upcomingEvents;
    const thisMonthEvents = events.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }).length;
    return { totalEvents, upcomingEvents, pastEvents, thisMonthEvents };
  }, [events, currentMonth]);

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingDayOfWeek }, (_, i) => i);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
        <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Calendar" subtitle="View and manage all your wedding dates and appointments" />

      {/* Stat strip */}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total events', value: stats.totalEvents },
          { label: 'Upcoming', value: stats.upcomingEvents },
          { label: 'This month', value: stats.thisMonthEvents },
          { label: 'Past events', value: stats.pastEvents },
        ].map((s, i, arr) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava button + toolbar row */}
      <div style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava to plan your wedding calendar" onClick={() => setAvaOpen(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={exportToICalendar} disabled={events.length === 0}
            className="btn-editorial-secondary"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: events.length === 0 ? 0.5 : 1 }}>
            <Download size={12} />Export
          </button>
          <button onClick={() => setShowEventForm(true)} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add event
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Add Event Form */}
        {showEventForm && (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add new event</span>
              <button onClick={() => setShowEventForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Event title</label>
                <input
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Dress fitting appointment"
                  style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Time</label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                  style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Add details…"
                  rows={2}
                  style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0', resize: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
              <button onClick={() => setShowEventForm(false)} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
              <button onClick={handleAddEvent} className="btn-primary" style={{ fontSize: 13 }}>Add event</button>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="btn-editorial-secondary"
            style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 220, textAlign: 'center' }}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="btn-editorial-secondary"
            style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ padding: '10px 0', textAlign: 'center', ...labelStyle }}>
                {day}
              </div>
            ))}
          </div>
          {/* Calendar Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {blanks.map(blank => (
              <div key={`blank-${blank}`} style={{ borderBottom: '1px solid rgba(10,10,10,0.04)', borderRight: '1px solid rgba(10,10,10,0.04)', padding: 10, height: 120, background: '#FAFAFA' }} />
            ))}
            {days.map(day => {
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={day}
                  style={{ borderBottom: '1px solid rgba(10,10,10,0.04)', borderRight: '1px solid rgba(10,10,10,0.04)', padding: 10, height: 120, background: isToday ? 'rgba(224,53,83,0.04)' : '#FFFFFF', cursor: dayEvents.length > 0 ? 'pointer' : 'default', overflow: 'hidden' }}
                  onClick={() => dayEvents.length > 0 && setSelectedDate({ date, events: dayEvents })}>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#E03553' : '#0A0A0A', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayEvents.slice(0, 3).map((event, idx) => {
                      const es = EVENT_STYLES[event.type] || EVENT_STYLES.custom;
                      return (
                        <div key={idx} style={{ fontSize: 11, padding: '2px 6px', background: es.background, color: es.color, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.time && <span style={{ opacity: 0.7 }}>{event.time} </span>}{event.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: 10, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Panel */}
        {selectedDate && selectedDate.events.length > 0 && (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {selectedDate.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4 }}><X size={14} /></button>
            </div>
            <div>
              {selectedDate.events.map((event, idx) => {
                const es = EVENT_STYLES[event.type] || EVENT_STYLES.custom;
                return (
                  <div key={idx} style={{ padding: '12px 0', borderBottom: idx < selectedDate.events.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{event.title}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', background: es.bg, color: es.color, borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{event.type}</span>
                      </div>
                      {event.time && <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 2px' }}>Time: {event.time}</p>}
                      {event.description && <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{event.description}</p>}
                    </div>
                    {event.type === 'custom' && (
                      <button onClick={() => handleDeleteEvent(event)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', display: 'flex', padding: 4 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ ...labelStyle, color: '#444444' }}>Event types:</span>
          {Object.entries({ wedding: 'Wedding', vendor: 'Vendor', schedule: 'Schedule', photography: 'Photography', custom: 'Custom' }).map(([type, label]) => {
            const es = EVENT_STYLES[type];
            return (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, background: es.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Wedding calendar planner"
        systemPrompt="You are Ava, a wedding planning AI. Help the couple plan their wedding calendar, schedule appointments, and stay on track with key dates and deadlines."
        quickActions={["What key dates should I add?", "When should I book vendors?", "Help me plan the month before", "Create a countdown plan"]}
      />
    </div>
  );
}
