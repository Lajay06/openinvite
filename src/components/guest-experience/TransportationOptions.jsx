import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';
import { color } from '@/styles/tokens';

export default function TransportationOptions({ weddingLocation, weddingCity }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (weddingCity && !hasLoaded) {
      loadTransportation();
    }
  }, [weddingCity]);

  const loadTransportation = async () => {
    setLoading(true);
    const toastId = toast.loading('Finding transportation options...');

    try {
      const response = await InvokeLLM({
        prompt: `Find the top 6 real transportation options for wedding guests traveling to ${weddingCity}, ${weddingLocation}.
        
        Include specific services like:
        - Airport shuttle services (with company names)
        - Ride-sharing (Uber/Lyft availability)
        - Local taxi companies
        - Rental car companies
        - Public transportation options
        - Private car services
        
        For each option, provide:
        - Service name (actual company/service name)
        - Type (Ride Share, Rental Car, Taxi, Shuttle, etc.)
        - Description
        - Estimated cost range
        - Booking URL (if available)
        - Tips for using this service
        - A real photo URL of the service (vehicles, airport, etc.)
        - Why it's good for wedding guests
        
        Provide real, accurate information specific to ${weddingCity}.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  description: { type: "string" },
                  cost: { type: "string" },
                  bookingUrl: { type: "string" },
                  tips: { type: "string" },
                  imageUrl: { type: "string" },
                  whyGood: { type: "string" }
                }
              }
            }
          }
        }
      });

      setOptions(response.options || []);
      setHasLoaded(true);
      toast.success('Transportation options loaded!', { id: toastId });
    } catch (error) {
      console.error('Error loading transportation:', error);
      setOptions([]);
      setHasLoaded(true);
      toast.error('Could not load transportation', { id: toastId });
    }

    setLoading(false);
  };

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
        <p className="text-gray-600">Finding transportation in {weddingCity}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transportation Options</h2>
          <p className="text-sm mt-1" style={{ color: color.textMuted }}>Getting around {weddingCity}</p>
        </div>
      </div>

      <div className="border-t border-gray-200">
        {options.map((option, index) => (
          <div key={index} className="py-5 border-b border-gray-200 last:border-b-0">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-48 h-32 md:h-32 relative flex-shrink-0">
                <img 
                  src={option.imageUrl || 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800'} 
                  alt={option.name}
                  className="w-full h-full object-cover rounded"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800';
                  }}
                />
              </div>
              
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-base font-medium text-gray-900 leading-tight">
                      {option.name}
                    </h3>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{option.type}</Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {option.description}
                  </p>

                  {option.whyGood && (
                    <div className="p-2 bg-green-50 rounded border border-green-200 mb-2">
                      <p className="text-xs text-green-800">
                        <span className="font-semibold">Perfect for:</span> {option.whyGood}
                      </p>
                    </div>
                  )}

                  {option.tips && (
                    <div className="p-2 bg-blue-50 rounded border border-blue-200 mb-2">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">💡 Tip:</span> {option.tips}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-bold text-gray-900">{option.cost}</span>
                  {option.bookingUrl && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-gray-700 hover:text-gray-900"
                      asChild
                    >
                      <a href={option.bookingUrl} target="_blank" rel="noopener noreferrer">
                        View Details <ArrowRight className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}