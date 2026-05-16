import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Filter, Sparkles } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

import VendorCard from "../components/marketplace/VendorCard";
import VendorProfileModal from "../components/marketplace/VendorProfileModal";
import QuoteRequestModal from "../components/marketplace/QuoteRequestModal";

export default function VendorMarketplace() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [location, setLocation] = useState("");

  const categories = [
    "all", "photography", "videography", "catering", "flowers", 
    "music", "venue", "planning", "beauty", "transportation", "decorations"
  ];

  useEffect(() => {
    loadMarketplaceVendors();
  }, []);

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
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || vendor.category === selectedCategory;
    const matchesLocation = !location || vendor.address?.toLowerCase().includes(location.toLowerCase());
    
    return matchesSearch && matchesCategory && matchesLocation;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-800 rounded-lg w-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster />
      
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Badge className="inline-flex items-center gap-2 mb-4 bg-pink-500/10 text-pink-400 border-pink-500/20 backdrop-blur-sm px-4 py-2">
            <Sparkles className="w-4 h-4" />
            Discover Top Vendors
          </Badge>
          <h1 className="text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Vendor Marketplace
            </span>
          </h1>
          <p className="text-gray-400 text-base">
            Find and book the perfect vendors for your special day
          </p>
        </motion.div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search vendors by name or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="relative w-full md:w-64">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`capitalize ${
                  selectedCategory === category 
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0" 
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                {category === 'all' ? 'All Vendors' : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="text-3xl font-bold text-white mb-1">{filteredVendors.length}</div>
            <div className="text-sm text-gray-400">Available Vendors</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="text-3xl font-bold text-pink-400 mb-1">
              {filteredVendors.filter(v => v.google_rating >= 4.5).length}
            </div>
            <div className="text-sm text-gray-400">Top Rated</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="text-3xl font-bold text-purple-400 mb-1">
              {new Set(filteredVendors.map(v => v.category)).size}
            </div>
            <div className="text-sm text-gray-400">Categories</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="text-3xl font-bold text-blue-400 mb-1">24/7</div>
            <div className="text-sm text-gray-400">Support</div>
          </div>
        </div>

        {/* Vendor Grid */}
        {filteredVendors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No vendors found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor, index) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VendorCard
                  vendor={vendor}
                  onViewProfile={handleViewProfile}
                  onRequestQuote={handleRequestQuote}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfileModal && selectedVendor && (
        <VendorProfileModal
          vendor={selectedVendor}
          onClose={() => setShowProfileModal(false)}
          onRequestQuote={() => {
            setShowProfileModal(false);
            setShowQuoteModal(true);
          }}
        />
      )}

      {showQuoteModal && selectedVendor && (
        <QuoteRequestModal
          vendor={selectedVendor}
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => {
            setShowQuoteModal(false);
            toast.success("Quote request sent!");
          }}
        />
      )}
    </div>
  );
}