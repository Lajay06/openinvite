import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function ThingsToDo({ weddingLocation, weddingCity }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (weddingCity && !hasLoaded) {
      loadActivities();
    }
  }, [weddingCity]);

  const loadActivities = async () => {
    setLoading(true);
    const toastId = toast.loading('Finding things to do...');

    try {
      const response = await InvokeLLM({
        prompt: `Find the top 6 real attractions and activities in ${weddingCity}, ${weddingLocation} for wedding guests.
        
        Include a mix of:
        - Tourist attractions
        - Local experiences
        - Restaurants/dining
        - Entertainment venues
        - Outdoor activities
        - Cultural sites
        
        For each activity, provide:
        - Name (actual place name)
        - Type (Museum, Restaurant, Park, etc.)
        - Description
        - Rating (if available)
        - Estimated cost
        - Best time to visit
        - A real photo URL of the actual location
        - Why it's worth visiting
        
        These must be real, existing places in ${weddingCity}. Include real photos of each location.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  description: { type: "string" },
                  rating: { type: "number" },
                  cost: { type: "string" },
                  bestTime: { type: "string" },
                  imageUrl: { type: "string" },
                  whyVisit: { type: "string" },
                  website: { type: "string" }
                }
              }
            }
          }
        }
      });

      setActivities(response.activities || []);
      setHasLoaded(true);
      toast.success('Activities loaded!', { id: toastId });
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivities([]);
      setHasLoaded(true);
      toast.error('Could not load activities', { id: toastId });
    }

    setLoading(false);
  };

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
        <p className="text-gray-600">Finding activities in {weddingCity}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Things to Do</h2>
          <p className="text-sm text-gray-500 mt-1">Must-see attractions in {weddingCity}</p>
        </div>
      </div>

      <div className="border-t border-gray-200">
        {activities.map((activity, index) => (
          <div key={index} className="py-5 border-b border-gray-200 last:border-b-0">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-48 h-32 md:h-32 relative flex-shrink-0">
                <img 
                  src={activity.imageUrl || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800'} 
                  alt={activity.name}
                  className="w-full h-full object-cover rounded"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800';
                  }}
                />
              </div>
              
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-base font-medium text-gray-900 leading-tight">
                      {activity.name}
                    </h3>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{activity.type}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
                    {activity.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="font-medium">{activity.rating}</span>
                      </div>
                    )}
                    {activity.cost && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="font-medium text-gray-900">{activity.cost}</span>
                      </>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {activity.description}
                  </p>

                  {activity.whyVisit && (
                    <div className="p-2 bg-purple-50 rounded border border-purple-200 mb-2">
                      <p className="text-xs text-purple-800">
                        <span className="font-semibold">Why visit:</span> {activity.whyVisit}
                      </p>
                    </div>
                  )}

                  {activity.bestTime && (
                    <p className="text-xs text-gray-600 mb-2">
                      <span className="font-semibold">Best time:</span> {activity.bestTime}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activity.website && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-gray-700 hover:text-gray-900"
                      asChild
                    >
                      <a href={activity.website} target="_blank" rel="noopener noreferrer">
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