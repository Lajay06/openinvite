import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Utensils, Star, MapPin, ArrowRight, Loader2, Heart, RefreshCw } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { getMyRecords } from '@/lib/resolveMyWedding';
import toast from 'react-hot-toast';
import { color } from '@/styles/tokens';

export default function RestaurantRecommendations({ weddingLocation, weddingCity }) {
  const [aiRestaurants, setAiRestaurants] = useState([]);
  const [customRestaurants, setCustomRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    loadCustomRestaurants();
    if (weddingCity && !hasLoaded) {
      loadAIRestaurants();
    }
  }, [weddingCity]);

  const loadCustomRestaurants = async () => {
    try {
      const data = await getMyRecords('Restaurant', '-created_date');
      setCustomRestaurants(data);
    } catch (error) {
      console.error('Error loading custom restaurants:', error);
    }
  };

  const loadAIRestaurants = async () => {
    setLoading(true);
    const toastId = toast.loading('Finding the best restaurants...');

    try {
      const response = await InvokeLLM({
        prompt: `Find 5 real restaurants in ${weddingCity} for wedding guests. Include diverse options (fine dining, casual, local). For each: name, cuisine, rating (1-5), price range ($-$$$$), distance from ${weddingLocation}, description, 2-3 signature dishes, website, why good for guests, photo URL, review count. Must be real places.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            restaurants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  cuisine: { type: "string" },
                  rating: { type: "number" },
                  priceRange: { type: "string" },
                  distance: { type: "string" },
                  description: { type: "string" },
                  specialties: { type: "array", items: { type: "string" } },
                  website: { type: "string" },
                  whyGood: { type: "string" },
                  imageUrl: { type: "string" },
                  reviewCount: { type: "number" }
                }
              }
            }
          }
        }
      });

      setAiRestaurants(response.restaurants || []);
      setHasLoaded(true);
      toast.success(`Restaurants in ${weddingCity} loaded!`, { id: toastId });
    } catch (error) {
      console.error('Error loading restaurants:', error);
      setAiRestaurants([]);
      setHasLoaded(true);
      toast.error('Could not load restaurants. Try refreshing.', { id: toastId });
    }

    setLoading(false);
  };

  const renderRestaurantRow = (restaurant, isCustom = false) => (
    <div key={restaurant.id || restaurant.name} className="py-5 border-b border-gray-200 last:border-b-0">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-48 h-32 md:h-32 relative flex-shrink-0">
          <img 
            src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'} 
            alt={restaurant.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';
            }}
          />
          {isCustom && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-pink-500 text-white flex items-center gap-1 text-xs px-2 py-0.5">
                <Heart className="w-2.5 h-2.5" />
                Recommended
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-medium text-gray-900 leading-tight">
                {restaurant.name}
              </h3>
              <Badge variant="outline" className="text-xs flex-shrink-0">{restaurant.cuisine}</Badge>
            </div>
            
            <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="font-medium">{restaurant.rating || 'N/A'}</span>
                {restaurant.reviewCount && (
                  <span style={{ color: color.textMuted }}>({restaurant.reviewCount})</span>
                )}
              </div>
              {restaurant.distance && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{restaurant.distance}</span>
                  </div>
                </>
              )}
              {restaurant.priceRange && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium text-gray-900">{restaurant.priceRange}</span>
                </>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {restaurant.description}
            </p>

            {restaurant.whyGood && (
              <div className="p-2 bg-orange-50 rounded border border-orange-200 mb-2">
                <p className="text-xs text-orange-800">
                  <span className="font-semibold">Why we recommend it:</span> {restaurant.whyGood}
                </p>
              </div>
            )}

            {restaurant.specialties && restaurant.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {restaurant.specialties.slice(0, 3).map((dish, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-700">
                    {dish}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {restaurant.website && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs text-gray-700 hover:text-gray-900"
                asChild
              >
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                  View Details <ArrowRight className="w-3 h-3 ml-1" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !hasLoaded && customRestaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
        <p className="text-gray-600">Finding restaurants in {weddingCity}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Recommendations</h2>
          <p className="text-sm mt-1" style={{ color: color.textMuted }}>Best dining experiences in {weddingCity}</p>
        </div>
        {aiRestaurants.length === 0 && hasLoaded && (
          <Button
            onClick={loadAIRestaurants}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>

      {customRestaurants.length > 0 && (
        <div className="space-y-0">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-pink-500" />
            <h3 className="text-base font-semibold text-gray-900">Our Favorites</h3>
          </div>
          <div className="border-t border-gray-200">
            {customRestaurants.map((restaurant) => renderRestaurantRow(restaurant, true))}
          </div>
        </div>
      )}

      {aiRestaurants.length > 0 && (
        <div className="space-y-0">
          <h3 className="text-base font-semibold text-gray-900 mb-4">More Great Options</h3>
          <div className="border-t border-gray-200">
            {aiRestaurants.map((restaurant) => renderRestaurantRow(restaurant, false))}
          </div>
        </div>
      )}

      {aiRestaurants.length === 0 && hasLoaded && customRestaurants.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Utensils className="w-12 h-12 mx-auto mb-3" style={{ color: color.textDisabled }} />
          <p className="text-gray-600 mb-2">Unable to load restaurant recommendations</p>
          <p className="text-sm mb-4" style={{ color: color.textMuted }}>Network error occurred. Please try again.</p>
          <Button onClick={loadAIRestaurants} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 Dining Tips</h3>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Make reservations in advance for popular spots</li>
          <li>• Ask your hotel concierge for insider recommendations</li>
          <li>• Don't miss the local specialties and regional cuisine</li>
          <li>• Many restaurants offer happy hour deals and early bird specials</li>
        </ul>
      </div>
    </div>
  );
}