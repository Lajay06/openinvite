import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hotel as HotelIcon, Star, MapPin, Loader2, ArrowRight, Plus, Heart, RefreshCw } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import toast from 'react-hot-toast';

const Hotel = base44.entities.Hotel;
import HotelForm from './HotelForm';

export default function HotelRecommendations({ weddingLocation, weddingCity }) {
  const [aiHotels, setAiHotels] = useState([]);
  const [customHotels, setCustomHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);

  useEffect(() => {
    loadCustomHotels();
    if (weddingCity && !hasLoaded) {
      loadAIHotels();
    }
  }, [weddingCity]);

  const loadCustomHotels = async () => {
    try {
      const data = await getMyRecords('Hotel', '-created_date');
      setCustomHotels(data);
    } catch (error) {
      console.error('Error loading custom hotels:', error);
    }
  };

  const loadAIHotels = async () => {
    setLoading(true);
    const toastId = toast.loading('Finding hotels in your area...');

    try {
      const response = await InvokeLLM({
        prompt: `Find 4 real hotels in ${weddingCity}. For each: exact name, star rating (1-5), price range ($-$$$$), distance from ${weddingLocation}, description, amenities list, booking URL, why good for wedding guests, hotel photo URL, review count. Mix luxury and mid-range. Must be real hotels.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            hotels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  rating: { type: "number" },
                  priceRange: { type: "string" },
                  distance: { type: "string" },
                  description: { type: "string" },
                  amenities: { type: "array", items: { type: "string" } },
                  bookingUrl: { type: "string" },
                  whyGood: { type: "string" },
                  imageUrl: { type: "string" },
                  reviewCount: { type: "number" }
                }
              }
            }
          }
        }
      });

      setAiHotels(response.hotels || []);
      setHasLoaded(true);
      toast.success(`Hotels near ${weddingCity} loaded!`, { id: toastId });
    } catch (error) {
      console.error('Error loading hotels:', error);
      setAiHotels([]);
      setHasLoaded(true);
      toast.error('Could not load hotels. Try refreshing.', { id: toastId });
    }

    setLoading(false);
  };

  const handleSubmit = async (hotelData) => {
    const toastId = toast.loading(editingHotel ? 'Updating hotel...' : 'Adding hotel...');
    try {
      if (editingHotel) {
        await Hotel.update(editingHotel.id, hotelData);
        toast.success('Hotel updated!', { id: toastId });
      } else {
        await Hotel.create(hotelData);
        toast.success('Hotel added!', { id: toastId });
      }
      setShowForm(false);
      setEditingHotel(null);
      loadCustomHotels();
    } catch (error) {
      console.error('Error saving hotel:', error);
      toast.error('Failed to save hotel', { id: toastId });
    }
  };

  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setShowForm(true);
  };

  const handleDelete = async (hotelId) => {
    if (!window.confirm('Remove this hotel recommendation?')) return;
    
    const toastId = toast.loading('Removing hotel...');
    try {
      await Hotel.delete(hotelId);
      toast.success('Hotel removed', { id: toastId });
      loadCustomHotels();
    } catch (error) {
      console.error('Error deleting hotel:', error);
      toast.error('Failed to remove hotel', { id: toastId });
    }
  };

  const renderHotelRow = (hotel, isCustom = false) => (
    <div key={hotel.id || hotel.name} className="py-5 border-b border-gray-200 last:border-b-0">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-48 h-32 md:h-32 relative flex-shrink-0">
          <img 
            src={hotel.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'} 
            alt={hotel.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';
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
                {hotel.name}
              </h3>
              {hotel.priceRange && (
                <Badge variant="outline" className="text-xs flex-shrink-0">{hotel.priceRange}</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="font-medium">{hotel.rating || 'N/A'}</span>
                {hotel.reviewCount && (
                  <span className="text-gray-400">({hotel.reviewCount})</span>
                )}
              </div>
              {hotel.distance && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{hotel.distance}</span>
                  </div>
                </>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {hotel.description || 'A great accommodation option for wedding guests.'}
            </p>

            {hotel.whyGood && (
              <div className="p-2 bg-green-50 rounded border border-green-200 mb-2">
                <p className="text-xs text-green-800">
                  <span className="font-semibold">Why we recommend it:</span> {hotel.whyGood}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {hotel.bookingUrl && (
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs text-gray-700 hover:text-gray-900"
                  asChild
                >
                  <a href={hotel.bookingUrl || hotel.website} target="_blank" rel="noopener noreferrer">
                    View Details <ArrowRight className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
            {isCustom && (
              <div className="flex gap-1">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(hotel)}
                  className="h-7 px-2 text-xs"
                >
                  Edit
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(hotel.id)}
                  className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !hasLoaded && customHotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
        <p className="text-gray-600">Finding hotels near {weddingCity}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hotel Recommendations</h2>
          <p className="text-sm text-gray-500 mt-1">Handpicked accommodations near {weddingCity}</p>
        </div>
        <div className="flex gap-2">
          {aiHotels.length === 0 && hasLoaded && (
            <Button
              onClick={loadAIHotels}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hotel
          </Button>
        </div>
      </div>

      {showForm && (
        <HotelForm
          hotel={editingHotel}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingHotel(null);
          }}
        />
      )}

      {customHotels.length > 0 && (
        <div className="space-y-0">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-pink-500" />
            <h3 className="text-base font-semibold text-gray-900">Our Top Picks</h3>
          </div>
          <div className="border-t border-gray-200">
            {customHotels.map((hotel) => renderHotelRow(hotel, true))}
          </div>
        </div>
      )}

      {aiHotels.length > 0 && (
        <div className="space-y-0">
          <h3 className="text-base font-semibold text-gray-900 mb-4">More Options</h3>
          <div className="border-t border-gray-200">
            {aiHotels.map((hotel) => renderHotelRow(hotel, false))}
          </div>
        </div>
      )}

      {aiHotels.length === 0 && hasLoaded && customHotels.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <HotelIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Unable to load hotel recommendations</p>
          <p className="text-sm text-gray-500 mb-4">Network error occurred. Please try again.</p>
          <Button onClick={loadAIHotels} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 Booking Tips</h3>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>• Book early to get the best rates and availability</li>
          <li>• Mention you're attending our wedding - some hotels offer group discounts</li>
          <li>• Check cancellation policies before booking</li>
          <li>• Consider hotels offering shuttle service to the venue</li>
        </ul>
      </div>
    </div>
  );
}