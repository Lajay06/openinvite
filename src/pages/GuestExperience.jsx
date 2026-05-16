import React, { useState, useEffect } from "react";
import { WeddingDetails } from "@/entities/WeddingDetails";
import { Invitation } from "@/entities/Invitation";
import { MapPin, Hotel, Car, Camera, Utensils, Loader2, Brain, ClipboardList, Info, ArrowRight, Calendar, Users } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

import AIGuestExperienceAssistant from "../components/guest-experience/AIGuestExperienceAssistant";
import HotelRecommendations from "../components/guest-experience/HotelRecommendations";
import TransportationOptions from "../components/guest-experience/TransportationOptions";
import ThingsToDo from "../components/guest-experience/ThingsToDo";
import RestaurantRecommendations from "../components/guest-experience/RestaurantRecommendations";
import ItineraryPlanner from "../components/guest-experience/ItineraryPlanner";
import LocalTips from "../components/guest-experience/LocalTips";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const TABS = [
  { id: 'hotels', label: 'Hotels', icon: Hotel },
  { id: 'restaurants', label: 'Restaurants', icon: Utensils },
  { id: 'transportation', label: 'Transportation', icon: Car },
  { id: 'things-to-do', label: 'Things to do', icon: Camera },
  { id: 'itinerary', label: 'Itinerary', icon: ClipboardList },
  { id: 'local-tips', label: 'Local tips', icon: Info },
];

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function GuestExperiencePage() {
  const [weddingLocation, setWeddingLocation] = useState("");
  const [weddingCity, setWeddingCity] = useState("");
  const [weddingDate, setWeddingDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hotels");
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    loadWeddingLocation();
  }, []);

  const loadWeddingLocation = async () => {
    setLoading(true);
    try {
      const weddingDetails = await WeddingDetails.list();
      const invitations = await Invitation.list();

      if (weddingDetails.length > 0 && weddingDetails[0].mainCeremony?.address) {
        const address = weddingDetails[0].mainCeremony.address;
        setWeddingLocation(address);
        const cityMatch = address.match(/([^,]+),\s*([A-Z]{2})/);
        if (cityMatch) {
          setWeddingCity(cityMatch[1].trim());
        } else {
          setWeddingCity(address.split(',')[0]);
        }
      } else if (invitations.length > 0) {
        setWeddingLocation("Wedding Venue Area");
        setWeddingCity("Wedding Venue Area");
      }

      if (invitations.length > 0 && invitations[0].wedding_date) {
        setWeddingDate(invitations[0].wedding_date);
      }
    } catch (error) {
      console.error("Error loading wedding location:", error);
      toast.error("Could not load wedding location");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, animation: 'spin 0.8s linear infinite', color: '#0A0A0A' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const getBookingComUrl = () => {
    if (!weddingCity || !weddingDate) return null;
    const checkIn = new Date(weddingDate);
    checkIn.setDate(checkIn.getDate() - 1);
    const checkOut = new Date(weddingDate);
    checkOut.setDate(checkOut.getDate() + 1);
    const fmt = (d) => d.toISOString().split('T')[0];
    const params = new URLSearchParams({
      ss: weddingCity, checkin: fmt(checkIn), checkout: fmt(checkOut),
      group_adults: 2, no_rooms: 1, group_children: 0, sb_travel_purpose: 'leisure'
    });
    return `https://www.booking.com/searchresults.html?${params.toString()}`;
  };

  const getHertzUrl = () => {
    if (!weddingCity || !weddingDate) return null;
    const pickUp = new Date(weddingDate);
    pickUp.setDate(pickUp.getDate() - 1);
    const dropOff = new Date(weddingDate);
    dropOff.setDate(dropOff.getDate() + 1);
    const fmt = (d) => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${m}/${day}/${d.getFullYear()}`;
    };
    const params = new URLSearchParams({
      targetPage: 'reservationOnHomepage', locationName: weddingCity, locationType: 'city',
      pickUpDate: fmt(pickUp), pickUpTime: '10:00', dropOffDate: fmt(dropOff), dropOffTime: '10:00'
    });
    return `https://www.hertz.com/rentacar/reservation/?${params.toString()}`;
  };

  const bookingComUrl = getBookingComUrl();
  const hertzUrl = getHertzUrl();

  const dateRangeText = weddingDate ? (() => {
    const d = new Date(weddingDate);
    const pre = new Date(d); pre.setDate(pre.getDate() - 1);
    const post = new Date(d); post.setDate(post.getDate() + 1);
    const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(pre)} – ${fmt(post)}`;
  })() : null;

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Toaster />

      <DashboardPageHeader title="Guest experience" subtitle="Curate an unforgettable experience for your guests" />

      {/* Content */}
      <div style={{ display: 'flex' }}>
        {/* Main */}
        <div style={{ flex: 1, padding: '32px 32px 48px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 24 }}>
            <button
              onClick={() => setShowAIAssistant(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#0A1930', color: '#fff', border: 'none',
                borderRadius: 999, padding: '10px 20px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <Brain size={15} /> AI recommendations
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 32 }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', background: 'none', border: 'none',
                    borderBottom: active ? '2px solid #E03553' : '2px solid transparent',
                    color: active ? '#E03553' : 'rgba(10,10,10,0.5)',
                    fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    marginBottom: -1, transition: 'color 0.15s',
                    textTransform: 'none',
                  }}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === 'hotels' && <HotelRecommendations weddingLocation={weddingLocation} weddingCity={weddingCity} />}
          {activeTab === 'restaurants' && <RestaurantRecommendations weddingLocation={weddingLocation} weddingCity={weddingCity} />}
          {activeTab === 'transportation' && <TransportationOptions weddingLocation={weddingLocation} weddingCity={weddingCity} />}
          {activeTab === 'things-to-do' && <ThingsToDo weddingLocation={weddingLocation} weddingCity={weddingCity} />}
          {activeTab === 'itinerary' && <ItineraryPlanner weddingLocation={weddingLocation} weddingCity={weddingCity} />}
          {activeTab === 'local-tips' && <LocalTips weddingCity={weddingCity} />}
        </div>

        {/* Quick Book sidebar */}
        <div style={{ display: 'none', width: 304, borderLeft: '1px solid rgba(10,10,10,0.08)', background: '#F5F5F5', padding: 24, position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto' }} className="lg:block">
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', marginBottom: 4 }}>Quick book</p>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)' }}>Pre-filled with wedding dates</p>
          </div>

          {/* Booking.com */}
          {bookingComUrl ? (
            <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff', marginBottom: 12 }}>
              <div style={{ background: '#003580', padding: '12px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Booking.com</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>Find your perfect hotel</p>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                    <span style={{ fontSize: 13, color: '#0A0A0A' }}>{weddingCity}</span>
                  </div>
                  {dateRangeText && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                      <span style={{ fontSize: 13, color: '#0A0A0A' }}>{dateRangeText}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                    <span style={{ fontSize: 13, color: '#0A0A0A' }}>2 adults, 1 room</span>
                  </div>
                </div>
                <a
                  href={bookingComUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px 0', background: '#E03553', color: '#fff',
                    borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Search hotels <ArrowRight size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff', padding: '16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Hotel size={16} style={{ color: 'rgba(10,10,10,0.4)' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>Booking.com</p>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0 }}>Add wedding date in Event details to enable quick booking</p>
            </div>
          )}

          {/* Hertz */}
          {hertzUrl ? (
            <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff', marginBottom: 12 }}>
              <div style={{ background: '#FFCC00', padding: '12px 16px' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Hertz car rental</p>
                <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: '2px 0 0' }}>Reserve your vehicle</p>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                    <span style={{ fontSize: 13, color: '#0A0A0A' }}>{weddingCity}</span>
                  </div>
                  {dateRangeText && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                      <span style={{ fontSize: 13, color: '#0A0A0A' }}>{dateRangeText}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Car size={13} style={{ color: 'rgba(10,10,10,0.4)' }} />
                    <span style={{ fontSize: 13, color: '#0A0A0A' }}>All vehicle types</span>
                  </div>
                </div>
                <a
                  href={hertzUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px 0', background: '#E03553', color: '#fff',
                    borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Find rental cars <ArrowRight size={13} />
                </a>
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff', padding: '16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Car size={16} style={{ color: 'rgba(10,10,10,0.4)' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>Hertz car rental</p>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0 }}>Add wedding date in Event details to enable quick booking</p>
            </div>
          )}

          {/* Tips */}
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#fff', padding: '16px' }}>
            <p style={{ ...labelStyle, marginBottom: 12 }}>Booking tips</p>
            {['Book 3–6 months ahead for best rates', 'Check free cancellation policies', 'Compare prices across platforms', 'Look for group / wedding discounts'].map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(10,10,10,0.05)' : 'none' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#E03553', flexShrink: 0, marginTop: 5 }} />
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAIAssistant && (
        <AIGuestExperienceAssistant
          weddingLocation={weddingLocation}
          weddingCity={weddingCity}
          onClose={() => setShowAIAssistant(false)}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
