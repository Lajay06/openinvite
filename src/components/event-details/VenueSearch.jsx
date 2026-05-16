import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search, Edit, Loader2, Navigation, Globe } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function VenueSearch({ 
  label, 
  venueName, 
  address, 
  onVenueSelect,
  placeholder = "Search for a venue..."
}) {
  const [isManual, setIsManual] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("worldwide");

  useEffect(() => {
    if (venueName && address) {
      setIsManual(true);
    }
  }, []);

  const getUserLocation = () => {
    setLocationLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationLoading(false);
          toast.success("Location detected!");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your location");
          setLocationLoading(false);
        }
      );
    } else {
      toast.error("Geolocation not supported");
      setLocationLoading(false);
    }
  };

  const searchVenues = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let locationContext = "";
      
      if (userLocation) {
        locationContext = ` near coordinates ${userLocation.lat}, ${userLocation.lng}`;
      } else if (selectedRegion !== "worldwide") {
        locationContext = ` in ${selectedRegion}`;
      }

      const response = await InvokeLLM({
        prompt: `Search for wedding venues or event locations matching: "${query}"${locationContext}. Return up to 5 real venues with their full details. Format as JSON array with fields: name, address, city, phone (if available), website (if available).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            venues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                  phone: { type: "string" },
                  website: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSearchResults(response?.venues || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching venues:", error);
      toast.error("Failed to search venues");
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  useEffect(() => {
    if (!isManual && searchTerm) {
      const timer = setTimeout(() => {
        searchVenues(searchTerm);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, isManual, userLocation, selectedRegion]);

  const handleSelectVenue = (venue) => {
    onVenueSelect({
      venueName: venue.name,
      address: venue.address,
      city: venue.city,
      phone: venue.phone,
      website: venue.website
    });
    setSearchTerm("");
    setShowResults(false);
    setIsManual(true);
  };

  const handleManualEntry = () => {
    setIsManual(true);
    setShowResults(false);
    setSearchTerm("");
  };

  const handleClearAndSearch = () => {
    setIsManual(false);
    onVenueSelect({ venueName: "", address: "", city: "", phone: "", website: "" });
  };

  if (isManual && venueName) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
          <span>{label}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAndSearch}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <Search className="w-3 h-3 mr-1" />
            Search Again
          </Button>
        </label>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{venueName}</p>
              {address && <p className="text-sm text-gray-600">{address}</p>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAndSearch}
              className="text-gray-400 hover:text-gray-600"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
        <span>{label}</span>
        {!isManual && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleManualEntry}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <Edit className="w-3 h-3 mr-1" />
            Add Manually
          </Button>
        )}
      </label>
      
      {isManual ? (
        <div className="space-y-3">
          <Input
            placeholder="Venue name"
            value={venueName || ""}
            onChange={(e) => onVenueSelect({ venueName: e.target.value, address })}
            className="border-gray-300"
          />
          <Input
            placeholder="Full address"
            value={address || ""}
            onChange={(e) => onVenueSelect({ venueName, address: e.target.value })}
            className="border-gray-300"
          />
        </div>
      ) : (
        <>
          {/* Location and Region Controls */}
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getUserLocation}
              disabled={locationLoading}
              className="flex-1 border-gray-300"
            >
              {locationLoading ? (
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3 mr-2" />
              )}
              {userLocation ? "Using My Location" : "Use My Location"}
            </Button>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="flex-1 h-9 text-sm border-gray-300">
                <Globe className="w-3 h-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worldwide">Worldwide</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Asia">Asia</SelectItem>
                <SelectItem value="Caribbean">Caribbean</SelectItem>
                <SelectItem value="Mexico">Mexico</SelectItem>
                <SelectItem value="South America">South America</SelectItem>
                <SelectItem value="Africa">Africa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setShowResults(true)}
              className="pl-10 border-gray-300"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {searchResults.map((venue, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectVenue(venue)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{venue.name}</p>
                      <p className="text-sm text-gray-600">{venue.address}</p>
                      <div className="flex gap-2 mt-1">
                        {venue.city && (
                          <Badge variant="outline" className="text-xs">
                            {venue.city}
                          </Badge>
                        )}
                        {venue.website && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Website
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchTerm && searchResults.length === 0 && !isSearching && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-4 text-center">
              <p className="text-sm text-gray-500 mb-2">No venues found</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualEntry}
                className="text-xs"
              >
                Add Manually Instead
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}