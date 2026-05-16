import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";
import { motion } from "framer-motion";
import VenueSearch from "../event-details/VenueSearch";

const PRICE_RANGES = [
  { value: "$", label: "$ - Budget Friendly" },
  { value: "$$", label: "$$ - Moderate" },
  { value: "$$$", label: "$$$ - Premium" },
  { value: "$$$$", label: "$$$$ - Luxury" }
];

export default function HotelForm({ hotel, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(hotel || {
    name: "",
    address: "",
    phone: "",
    website: "",
    rating: "",
    priceRange: "$$",
    distance: "",
    description: "",
    amenities: [],
    whyGood: "",
    imageUrl: "",
    reviewCount: "",
    isRecommended: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      reviewCount: formData.reviewCount ? parseInt(formData.reviewCount) : null,
      amenities: formData.amenities.length > 0 ? formData.amenities : []
    };
    onSubmit(dataToSubmit);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVenueSelect = (venueData) => {
    setFormData(prev => ({
      ...prev,
      name: venueData.venueName || prev.name,
      address: venueData.address || prev.address,
      phone: venueData.phone || prev.phone,
      website: venueData.website || prev.website
    }));
  };

  const handleAmenitiesChange = (e) => {
    const amenitiesList = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
    handleInputChange('amenities', amenitiesList);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900">
              {hotel ? 'Edit Hotel' : 'Add Hotel Recommendation'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <VenueSearch
                  label="Hotel Name *"
                  venueName={formData.name}
                  address={formData.address}
                  onVenueSelect={handleVenueSelect}
                  placeholder="Search for hotels or add manually..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Contact number"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Booking Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://..."
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => handleInputChange('rating', e.target.value)}
                  placeholder="4.5"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceRange">Price Range</Label>
                <Select
                  value={formData.priceRange}
                  onValueChange={(value) => handleInputChange('priceRange', value)}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distance">Distance from Venue</Label>
                <Input
                  id="distance"
                  value={formData.distance}
                  onChange={(e) => handleInputChange('distance', e.target.value)}
                  placeholder="e.g., 0.5 mi from destination"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="border-gray-300"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the hotel..."
                  className="border-gray-300 h-20"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="whyGood">Why We Recommend It</Label>
                <Textarea
                  id="whyGood"
                  value={formData.whyGood}
                  onChange={(e) => handleInputChange('whyGood', e.target.value)}
                  placeholder="What makes this hotel special for your guests..."
                  className="border-gray-300 h-20"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                <Input
                  id="amenities"
                  value={formData.amenities.join(', ')}
                  onChange={handleAmenitiesChange}
                  placeholder="Free WiFi, Pool, Parking, Breakfast"
                  className="border-gray-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {hotel ? 'Update Hotel' : 'Add Hotel'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}