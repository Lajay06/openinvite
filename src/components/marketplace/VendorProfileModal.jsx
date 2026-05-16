import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Star, MapPin, Phone, Mail, Globe, MessageSquare, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function VendorProfileModal({ vendor, onClose, onRequestQuote }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [vendor.id]);

  const loadReviews = async () => {
    try {
      const vendorReviews = await base44.entities.VendorReview.filter({ vendor_id: vendor.id }, '-created_date', 10);
      setReviews(vendorReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
    setLoading(false);
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : vendor.google_rating || vendor.rating || 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {vendor.image_url && (
              <img src={vendor.image_url} alt={vendor.name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{vendor.name}</h2>
              <p className="text-pink-400 capitalize">{vendor.category}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-2xl font-bold text-white">{averageRating}</span>
                </div>
                <p className="text-sm text-gray-400">{reviews.length || vendor.google_reviews_count || 0} reviews</p>
              </CardContent>
            </Card>
            
            {vendor.price_range && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-pink-400 mb-2">{vendor.price_range}</div>
                  <p className="text-sm text-gray-400">Price Range</p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <Badge className="bg-green-500/20 text-green-400 border-0 mb-2">
                  {vendor.status || 'Available'}
                </Badge>
                <p className="text-sm text-gray-400">Status</p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            {vendor.address && (
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin className="w-5 h-5 text-pink-400" />
                <span>{vendor.address}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="w-5 h-5 text-pink-400" />
                <a href={`tel:${vendor.phone}`} className="hover:text-pink-400">{vendor.phone}</a>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-5 h-5 text-pink-400" />
                <a href={`mailto:${vendor.email}`} className="hover:text-pink-400">{vendor.email}</a>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-3 text-gray-300">
                <Globe className="w-5 h-5 text-pink-400" />
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400">
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="bg-white/5 border-white/10">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-4">
              {vendor.notes && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                  <p className="text-gray-300 leading-relaxed">{vendor.notes}</p>
                </div>
              )}
              
              {vendor.payment_schedule && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Payment Terms</h3>
                  <p className="text-gray-300">{vendor.payment_schedule}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No reviews yet</p>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-white">{review.reviewer_name}</p>
                          {review.event_date && (
                            <p className="text-sm text-gray-400">Event: {new Date(review.event_date).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300">{review.review_text}</p>
                      {review.verified && (
                        <Badge className="mt-3 bg-blue-500/20 text-blue-400 border-0">Verified</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="portfolio">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {vendor.image_url && (
                  <img src={vendor.image_url} alt="Portfolio" className="w-full h-48 object-cover rounded-lg" />
                )}
                <div className="text-center py-12 text-gray-400 col-span-2 md:col-span-3">
                  Portfolio coming soon
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              onClick={onRequestQuote}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Request Quote
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Check Availability
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}