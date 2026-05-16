import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock,
  DollarSign,
  Sunrise,
  Sun,
  Sunset,
  Moon
} from 'lucide-react';

export default function ItineraryPlanner({ weddingLocation, weddingCity }) {
  const [activeItinerary, setActiveItinerary] = useState('1-day');

  const itineraries = {
    oneDay: [
      { time: '9:00 AM', name: 'The Breakfast Club', type: 'Café', description: 'Start your day with a hearty British breakfast in Soho', duration: '1 hour', cost: '$$' },
      { time: '11:00 AM', name: 'British Museum', type: 'Museum', description: 'Explore world history and culture with free admission', duration: '2 hours', cost: 'Free' },
      { time: '1:00 PM', name: 'Dishoom Covent Garden', type: 'Restaurant', description: 'Enjoy Bombay-inspired cuisine in a vibrant setting', duration: '1.5 hours', cost: '$$' },
      { time: '3:00 PM', name: 'Tower of London', type: 'Attraction', description: 'Discover 1000 years of history and the Crown Jewels', duration: '2.5 hours', cost: '$$$' },
      { time: '6:30 PM', name: 'Sketch', type: 'Restaurant', description: 'Fine dining in an artistic and whimsical atmosphere', duration: '2 hours', cost: '$$$$' },
      { time: '9:00 PM', name: 'The Shard Bar', type: 'Bar', description: 'Cocktails with panoramic views from the 52nd floor', duration: '2 hours', cost: '$$$' }
    ],
    threeDay: [
      { 
        day: 'Day 1 - Arrival',
        activities: [
          { time: '2:00 PM', name: 'Borough Market', type: 'Attraction', description: 'Browse artisan food stalls and local specialties', duration: '1.5 hours', cost: '$$' },
          { time: '4:00 PM', name: 'Tate Modern', type: 'Museum', description: 'Contemporary art gallery with Thames views', duration: '2 hours', cost: 'Free' },
          { time: '6:30 PM', name: 'Hawksmoor', type: 'Restaurant', description: 'Premium steakhouse near the cathedral', duration: '2 hours', cost: '$$$' },
          { time: '8:30 PM', name: 'Gordon\'s Wine Bar', type: 'Bar', description: 'Historic candlelit wine cellar from 1890', duration: '2 hours', cost: '$$' }
        ]
      },
      { 
        day: 'Day 2 - Wedding Day',
        activities: [
          { time: '9:00 AM', name: 'The Wolseley', type: 'Café', description: 'Grand European café for breakfast', duration: '1 hour', cost: '$$' },
          { time: '11:00 AM', name: 'Hyde Park', type: 'Park', description: 'Relaxing walk through royal parkland', duration: '1.5 hours', cost: 'Free' },
          { time: '1:00 PM', name: 'Fortnum & Mason', type: 'Restaurant', description: 'Elegant afternoon tea experience', duration: '1.5 hours', cost: '$$$' }
        ]
      },
      { 
        day: 'Day 3 - Departure',
        activities: [
          { time: '9:00 AM', name: 'Duck & Waffle', type: 'Restaurant', description: 'Brunch with 24/7 city views from the 40th floor', duration: '1.5 hours', cost: '$$' },
          { time: '11:00 AM', name: 'Covent Garden', type: 'Attraction', description: 'Shopping and street performers', duration: '2 hours', cost: '$$' },
          { time: '1:00 PM', name: 'Monmouth Coffee', type: 'Café', description: 'Final London coffee at a specialty roaster', duration: '30 min', cost: '$' }
        ]
      }
    ],
    fiveDay: [
      { day: 'Day 1 - Explore Central London', activities: [
        { time: '9:00 AM', name: 'Regency Café', type: 'Café', description: 'Traditional English breakfast greasy spoon', duration: '1 hour', cost: '$' },
        { time: '11:00 AM', name: 'Westminster Abbey', type: 'Attraction', description: 'Royal church with 1000 years of history', duration: '2 hours', cost: '$$' },
        { time: '1:30 PM', name: 'The Ivy', type: 'Restaurant', description: 'British classics in iconic West End setting', duration: '1.5 hours', cost: '$$$' },
        { time: '3:30 PM', name: 'National Gallery', type: 'Museum', description: 'World-class art collection at Trafalgar Square', duration: '2 hours', cost: 'Free' },
        { time: '6:00 PM', name: 'Clos Maggiore', type: 'Restaurant', description: 'Romantic French dining in Covent Garden', duration: '2 hours', cost: '$$$$' },
        { time: '8:30 PM', name: 'American Bar', type: 'Bar', description: 'Classic cocktails at The Savoy', duration: '2 hours', cost: '$$$' }
      ]},
      { day: 'Day 2 - Historic & Cultural', activities: [
        { time: '9:00 AM', name: 'St. John Bread & Wine', type: 'Café', description: 'Nose-to-tail breakfast near Spitalfields', duration: '1 hour', cost: '$$' },
        { time: '11:00 AM', name: 'Tower Bridge', type: 'Attraction', description: 'Walk across London\'s iconic bridge', duration: '1.5 hours', cost: '$' },
        { time: '1:00 PM', name: 'Padella', type: 'Restaurant', description: 'Fresh pasta in Borough Market', duration: '1 hour', cost: '$$' },
        { time: '3:00 PM', name: 'Shakespeare\'s Globe', type: 'Attraction', description: 'Tour the historic theatre', duration: '2 hours', cost: '$$' },
        { time: '6:00 PM', name: 'River Café', type: 'Restaurant', description: 'Italian fine dining by the Thames', duration: '2 hours', cost: '$$$$' },
        { time: '8:30 PM', name: 'Nightjar', type: 'Bar', description: 'Speakeasy with live jazz', duration: '2 hours', cost: '$$$' }
      ]},
      { day: 'Day 3 - Shoreditch & East End', activities: [
        { time: '9:00 AM', name: 'Dishoom Shoreditch', type: 'Café', description: 'Bombay breakfast in trendy east London', duration: '1 hour', cost: '$$' },
        { time: '11:00 AM', name: 'Brick Lane Market', type: 'Attraction', description: 'Vintage fashion and street art', duration: '2 hours', cost: 'Free' },
        { time: '1:00 PM', name: 'Smokestak', type: 'Restaurant', description: 'American BBQ near Shoreditch', duration: '1.5 hours', cost: '$$' },
        { time: '3:00 PM', name: 'Old Spitalfields Market', type: 'Attraction', description: 'Independent designers and vintage finds', duration: '2 hours', cost: '$$' },
        { time: '6:00 PM', name: 'Lyle\'s', type: 'Restaurant', description: 'Modern British tasting menu', duration: '2.5 hours', cost: '$$$$' },
        { time: '9:00 PM', name: 'Calloh Callay', type: 'Bar', description: 'Creative cocktails through a wardrobe door', duration: '2 hours', cost: '$$' }
      ]},
      { day: 'Day 4 - Royal & Upscale', activities: [
        { time: '9:00 AM', name: 'The Delaunay', type: 'Café', description: 'Viennese-style grand café', duration: '1 hour', cost: '$$' },
        { time: '11:00 AM', name: 'Buckingham Palace', type: 'Attraction', description: 'Watch the Changing of the Guard', duration: '2 hours', cost: 'Free' },
        { time: '1:00 PM', name: 'Roka', type: 'Restaurant', description: 'Contemporary Japanese robatayaki', duration: '1.5 hours', cost: '$$$' },
        { time: '3:00 PM', name: 'Harrods', type: 'Attraction', description: 'Luxury department store browsing', duration: '2 hours', cost: 'Varies' },
        { time: '6:00 PM', name: 'Dinner by Heston', type: 'Restaurant', description: 'Historic British cuisine reimagined', duration: '2.5 hours', cost: '$$$$' },
        { time: '9:00 PM', name: 'Connaught Bar', type: 'Bar', description: 'Award-winning cocktails in Mayfair', duration: '2 hours', cost: '$$$$' }
      ]},
      { day: 'Day 5 - Markets & Farewell', activities: [
        { time: '9:00 AM', name: 'Granger & Co', type: 'Restaurant', description: 'Australian-style brunch in Notting Hill', duration: '1.5 hours', cost: '$$' },
        { time: '11:00 AM', name: 'Portobello Road Market', type: 'Attraction', description: 'Antiques and colorful houses', duration: '2 hours', cost: 'Free' },
        { time: '1:00 PM', name: 'The Ledbury', type: 'Restaurant', description: 'Two Michelin star farewell lunch', duration: '3 hours', cost: '$$$$' },
        { time: '4:30 PM', name: 'Sky Garden', type: 'Attraction', description: 'Free panoramic views from the Walkie Talkie', duration: '1 hour', cost: 'Free' }
      ]}
    ]
  };

  const getTimeIcon = (time) => {
    const lower = time.toLowerCase();
    const hour = parseInt(time.match(/\d+/)?.[0] || '12');
    const isPM = lower.includes('pm');
    const actualHour = isPM && hour !== 12 ? hour + 12 : hour;
    
    if (actualHour >= 5 && actualHour < 12) return <Sunrise className="w-3 h-3 text-yellow-500" />;
    if (actualHour >= 12 && actualHour < 17) return <Sun className="w-3 h-3 text-orange-500" />;
    if (actualHour >= 17 && actualHour < 20) return <Sunset className="w-3 h-3 text-purple-500" />;
    return <Moon className="w-3 h-3 text-indigo-500" />;
  };

  const renderActivity = (activity, index) => (
    <div key={index} className="py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-600 w-20 flex-shrink-0 pt-0.5">
          {getTimeIcon(activity.time)}
          <span className="font-medium">{activity.time}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900">{activity.name}</h4>
            <Badge variant="outline" className="text-xs">{activity.type}</Badge>
          </div>
          <p className="text-xs text-gray-600 mb-2">{activity.description}</p>
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{activity.duration}</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{activity.cost}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Itinerary Planner</h2>
          <p className="text-sm text-gray-500 mt-1">Day-by-day guides for your visit to {weddingCity}</p>
        </div>
      </div>

      <Tabs value={activeItinerary} onValueChange={setActiveItinerary} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200 h-12 rounded-lg">
          <TabsTrigger value="1-day" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">1 Day</span>
          </TabsTrigger>
          <TabsTrigger value="3-day" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">3 Days</span>
          </TabsTrigger>
          <TabsTrigger value="5-day" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">5 Days</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="1-day" className="mt-6">
          <div className="border-t border-gray-200">
            {itineraries.oneDay.map((activity, index) => renderActivity(activity, index))}
          </div>
        </TabsContent>

        <TabsContent value="3-day" className="mt-6 space-y-6">
          {itineraries.threeDay.map((day, dayIndex) => (
            <div key={dayIndex}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">{day.day}</h3>
              <div className="border-t border-gray-200">
                {day.activities.map((activity, actIndex) => renderActivity(activity, actIndex))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="5-day" className="mt-6 space-y-6">
          {itineraries.fiveDay.map((day, dayIndex) => (
            <div key={dayIndex}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">{day.day}</h3>
              <div className="border-t border-gray-200">
                {day.activities.map((activity, actIndex) => renderActivity(activity, actIndex))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}