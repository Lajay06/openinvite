import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, DollarSign, CheckCircle } from "lucide-react";

export default function VendorCard({ vendor, onViewProfile, onRequestQuote }) {
  const priceRangeColors = {
    "$": "text-green-400",
    "$$": "text-yellow-400",
    "$$$": "text-orange-400",
    "$$$$": "text-red-400"
  };

  return (
    <Card className="group bg-white/5 backdrop-blur-sm border-white/10 hover:border-pink-500/50 transition-all duration-300 overflow-hidden">
      <div className="relative h-48 overflow-hidden">
        {vendor.image_url ? (
          <img 
            src={vendor.image_url} 
            alt={vendor.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <span className="text-4xl">📸</span>
          </div>
        )}
        {vendor.status === 'booked' && (
          <Badge className="absolute top-3 right-3 bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Booked
          </Badge>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{vendor.name}</h3>
            <p className="text-sm text-pink-400 capitalize">{vendor.category}</p>
          </div>
          {vendor.price_range && (
            <span className={`text-lg font-bold ${priceRangeColors[vendor.price_range]}`}>
              {vendor.price_range}
            </span>
          )}
        </div>

        {(vendor.google_rating || vendor.rating) && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-white font-semibold">
                {vendor.google_rating || vendor.rating}
              </span>
            </div>
            {vendor.google_reviews_count && (
              <span className="text-sm text-gray-400">
                ({vendor.google_reviews_count} reviews)
              </span>
            )}
          </div>
        )}

        {vendor.address && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{vendor.address}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProfile(vendor)}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            View Profile
          </Button>
          <Button
            size="sm"
            onClick={() => onRequestQuote(vendor)}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0"
          >
            Get Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}