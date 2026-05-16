import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Star, Hotel as HotelIcon, Utensils, Camera } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color, iconHtml) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 16px;">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const ceremonyIcon = createCustomIcon('#ec4899', '💒');
const receptionIcon = createCustomIcon('#8b5cf6', '🎉');
const hotelIcon = createCustomIcon('#3b82f6', '🏨');
const restaurantIcon = createCustomIcon('#10b981', '🍽️');
const activityIcon = createCustomIcon('#f59e0b', '📸');

export default function InteractiveMap({ 
  weddingDetails, 
  hotels = [], 
  restaurants = [], 
  activities = [] 
}) {
  const locations = React.useMemo(() => {
    const items = [];

    // Add ceremony location
    if (weddingDetails?.mainCeremony) {
      items.push({
        type: 'ceremony',
        name: weddingDetails.mainCeremony.venueName || 'Wedding Ceremony',
        address: weddingDetails.mainCeremony.address,
        lat: weddingDetails.mainCeremony.latitude || 34.0522,
        lng: weddingDetails.mainCeremony.longitude || -118.2437,
        icon: ceremonyIcon,
        color: 'pink',
        time: weddingDetails.mainCeremony.startTime
      });
    }

    // Add reception location
    if (weddingDetails?.reception) {
      items.push({
        type: 'reception',
        name: weddingDetails.reception.venueName || 'Wedding Reception',
        address: weddingDetails.reception.address,
        lat: weddingDetails.reception.latitude || 34.0522,
        lng: weddingDetails.reception.longitude || -118.2437,
        icon: receptionIcon,
        color: 'purple',
        time: weddingDetails.reception.startTime
      });
    }

    // Add hotels
    hotels.forEach(hotel => {
      if (hotel.latitude && hotel.longitude) {
        items.push({
          type: 'hotel',
          name: hotel.name,
          address: hotel.address,
          lat: hotel.latitude,
          lng: hotel.longitude,
          icon: hotelIcon,
          color: 'blue',
          rating: hotel.rating || hotel.google_rating,
          priceRange: hotel.price_range,
          amenities: hotel.amenities
        });
      }
    });

    // Add restaurants
    restaurants.forEach(restaurant => {
      if (restaurant.latitude && restaurant.longitude) {
        items.push({
          type: 'restaurant',
          name: restaurant.name,
          address: restaurant.address,
          lat: restaurant.latitude,
          lng: restaurant.longitude,
          icon: restaurantIcon,
          color: 'green',
          rating: restaurant.rating || restaurant.google_rating,
          cuisine: restaurant.cuisine,
          priceRange: restaurant.price_range
        });
      }
    });

    // Add activities
    activities.forEach(activity => {
      if (activity.latitude && activity.longitude) {
        items.push({
          type: 'activity',
          name: activity.name,
          address: activity.address,
          lat: activity.latitude,
          lng: activity.longitude,
          icon: activityIcon,
          color: 'amber',
          rating: activity.rating,
          cost: activity.cost,
          activityType: activity.type
        });
      }
    });

    return items;
  }, [weddingDetails, hotels, restaurants, activities]);

  // Calculate center of all locations
  const center = React.useMemo(() => {
    if (locations.length === 0) return [34.0522, -118.2437]; // Default to LA
    
    const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
    
    return [avgLat, avgLng];
  }, [locations]);

  const getDirections = (lat, lng, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  if (locations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600">No location data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span className="text-gray-600">Ceremony</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-gray-600">Reception</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-600">Hotels</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Restaurants</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-gray-600">Activities</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ height: '500px' }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {locations.map((location, idx) => (
            <Marker
              key={idx}
              position={[location.lat, location.lng]}
              icon={location.icon}
            >
              <Popup maxWidth={300}>
                <div className="p-2 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{location.name}</h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs bg-${location.color}-100 text-${location.color}-700`}
                      >
                        {location.type}
                      </Badge>
                    </div>
                    
                    {location.address && (
                      <p className="text-xs text-gray-600 flex items-start gap-1 mb-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {location.address}
                      </p>
                    )}

                    {location.time && (
                      <p className="text-xs text-gray-700 font-medium mb-2">
                        Time: {location.time}
                      </p>
                    )}

                    {location.rating && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-amber-400" />
                          <span>{location.rating}</span>
                        </div>
                        {location.priceRange && (
                          <>
                            <span>•</span>
                            <span>{location.priceRange}</span>
                          </>
                        )}
                      </div>
                    )}

                    {location.cuisine && (
                      <p className="text-xs text-gray-600 mb-2">
                        <Badge variant="outline" className="text-xs">{location.cuisine}</Badge>
                      </p>
                    )}

                    {location.activityType && (
                      <p className="text-xs text-gray-600 mb-2">
                        <Badge variant="outline" className="text-xs">{location.activityType}</Badge>
                      </p>
                    )}

                    {location.amenities && location.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {location.amenities.slice(0, 3).map((amenity, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-gray-900 hover:bg-gray-800"
                    onClick={() => getDirections(location.lat, location.lng, location.name)}
                  >
                    <Navigation className="w-3 h-3 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}