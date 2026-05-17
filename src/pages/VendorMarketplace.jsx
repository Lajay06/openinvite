import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, MapPin, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import VendorCard from "../components/marketplace/VendorCard";
import VendorProfileModal from "../components/marketplace/VendorProfileModal";
import QuoteRequestModal from "../components/marketplace/QuoteRequestModal";

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORIES = [
  "all", "photography", "videography", "catering", "flowers",
  "music", "venue", "planning", "beauty", "transportation", "decorations"
];

export default function VendorMarketplace() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [location, setLocation] = useState("");

  useEffect(() => { loadMarketplaceVendors(); }, []);

  const loadMarketplaceVendors = async () => {
    setLoading(true);
    try {
      const allVendors = await base44.entities.Vendor.list('-google_rating');
      setVendors(allVendors);
    } catch (error) {
      console.error("Error loading vendors:", error);
      toast.error("Failed to load vendors");
    }
    setLoading(false);
  };

  const handleViewProfile = (vendor) => {
    setSelectedVendor(vendor);
    setShowProfileModal(true);
  };

  const handleRequestQuote = (vendor) => {
    setSelectedVendor(vendor);
    setShowQuoteModal(true);
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = !searchTerm ||
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || vendor.category === selectedCategory;
    const matchesLocation = !location || vendor.address?.toLowerCase().includes(location.toLowerCase());
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const stats = [
    { label: "Available vendors", value: filteredVendors.length },
    { label: "Top rated", value: filteredVendors.filter(v => v.google_rating >= 4.5).length },
    { label: "Categories", value: new Set(filteredVendors.map(v => v.category)).size },
    { label: "Support", value: "24/7" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Loading vendors…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Vendor marketplace"
        subtitle="Discover and book the perfect vendors for your day"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: '#0A0A0A' }}>
            <Sparkles size={12} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', fontFamily: PJS }}>Top vendors</span>
          </div>
        }
      />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {stats.map((s, i, arr) => (
          <div key={s.label} style={{ flex: 1, padding: '20px 32px', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : undefined }}>
            <div style={{ fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px 32px 48px' }}>

        {/* Search row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.3)' }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search vendors by name or service…"
              style={{
                width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
                background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
                outline: 'none', padding: '8px 0 8px 22px', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
              onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'; e.target.style.borderBottomWidth = '1px'; }}
            />
          </div>
          <div style={{ position: 'relative', width: 220 }}>
            <MapPin size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.3)' }} />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Location"
              style={{
                width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
                background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
                outline: 'none', padding: '8px 0 8px 22px', boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
              onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'; e.target.style.borderBottomWidth = '1px'; }}
            />
          </div>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                fontFamily: PJS, cursor: 'pointer', border: 'none', transition: 'all 0.12s',
                background: selectedCategory === cat ? '#0A0A0A' : 'rgba(10,10,10,0.06)',
                color: selectedCategory === cat ? '#FFFFFF' : '#444444',
              }}
            >
              {cat === 'all' ? 'All vendors' : cat}
            </button>
          ))}
        </div>

        {/* Vendor grid */}
        {filteredVendors.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>No vendors found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filteredVendors.map(vendor => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onViewProfile={handleViewProfile}
                onRequestQuote={handleRequestQuote}
              />
            ))}
          </div>
        )}
      </div>

      {showProfileModal && selectedVendor && (
        <VendorProfileModal
          vendor={selectedVendor}
          onClose={() => setShowProfileModal(false)}
          onRequestQuote={() => { setShowProfileModal(false); setShowQuoteModal(true); }}
        />
      )}

      {showQuoteModal && selectedVendor && (
        <QuoteRequestModal
          vendor={selectedVendor}
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => { setShowQuoteModal(false); toast.success("Quote request sent!"); }}
        />
      )}
    </div>
  );
}
