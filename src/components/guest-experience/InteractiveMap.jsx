import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Star } from 'lucide-react';
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

// LUCIDE'S OWN PATHS, INLINED — not emoji, and not a new dependency.
//
// The pins were a wedding chapel, a party popper, a hotel, cutlery and a
// camera, drawn by whatever emoji font the guest's device happens to ship. A
// map is the one surface where the marks ARE the information, so five glyphs
// from five different platform fonts is the worst place to leave it.
//
// They cannot be <Church /> components: `createCustomIcon` builds a Leaflet
// divIcon from an HTML STRING, so React never renders here. Rendering to
// markup would mean pulling react-dom/server into a map's bundle. The paths
// below are copied verbatim from node_modules/lucide-react — church,
// party-popper, hotel, utensils, camera — so the map uses the same drawing as
// every other icon in the product, at a size and colour we choose.
const lucide = (paths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const PIN = {
  church: '<path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22"/><path d="m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7"/>',
  party: '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
  hotel: '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
};

const ceremonyIcon = createCustomIcon('#ec4899', lucide(PIN.church));
const receptionIcon = createCustomIcon('#8b5cf6', lucide(PIN.party));
const hotelIcon = createCustomIcon('#3b82f6', lucide(PIN.hotel));
const restaurantIcon = createCustomIcon('#10b981', lucide(PIN.utensils));
const activityIcon = createCustomIcon('#f59e0b', lucide(PIN.camera));

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
        <MapPin className="w-12 h-12 mx-auto mb-4 text-[rgba(10,10,10,0.3)]" />
        <p className="text-[rgba(10,10,10,0.6)]">No location data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span className="text-[rgba(10,10,10,0.6)]">Ceremony</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-[rgba(10,10,10,0.6)]">Reception</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-[rgba(10,10,10,0.6)]">Hotels</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-[rgba(10,10,10,0.6)]">Restaurants</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-[rgba(10,10,10,0.6)]">Activities</span>
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
                      <h4 className="font-medium text-[#0A0A0A] text-sm">{location.name}</h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs bg-${location.color}-100 text-${location.color}-700`}
                      >
                        {location.type}
                      </Badge>
                    </div>
                    
                    {location.address && (
                      <p className="text-xs text-[rgba(10,10,10,0.6)] flex items-start gap-1 mb-2">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {location.address}
                      </p>
                    )}

                    {location.time && (
                      <p className="text-xs text-[rgba(10,10,10,0.6)] font-medium mb-2">
                        Time: {location.time}
                      </p>
                    )}

                    {location.rating && (
                      <div className="flex items-center gap-2 text-xs text-[rgba(10,10,10,0.6)] mb-2">
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
                      <p className="text-xs text-[rgba(10,10,10,0.6)] mb-2">
                        <Badge variant="outline" className="text-xs">{location.cuisine}</Badge>
                      </p>
                    )}

                    {location.activityType && (
                      <p className="text-xs text-[rgba(10,10,10,0.6)] mb-2">
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