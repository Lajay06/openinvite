import React from 'react';
import { MapPin, Utensils, Heart, Clock, DollarSign, Users, Sparkles, Phone, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function LocalTips({ weddingCity }) {
  const tipsCategories = [
    {
      title: "Getting Around",
      icon: MapPin,
      tips: [
        "Ride-sharing apps like Uber and Lyft are widely available",
        "Download local transit apps for real-time bus and train schedules",
        "Consider purchasing a multi-day transit pass if staying several days",
        "Peak traffic hours are typically 7-9 AM and 4-7 PM on weekdays",
        "Parking can be limited downtown - hotel parking or ride-shares recommended"
      ]
    },
    {
      title: "Dining & Tipping",
      icon: Utensils,
      tips: [
        "Standard tip is 15-20% for table service at restaurants",
        "Tip bartenders $1-2 per drink or 15-20% of the tab",
        "Many restaurants accept reservations through OpenTable or Resy",
        "Happy hour deals are common between 3-6 PM at bars and restaurants",
        "Food delivery apps are widely available if you prefer dining in"
      ]
    },
    {
      title: "Local Customs & Courtesy",
      icon: Heart,
      tips: [
        "Wait to be seated at restaurants - don't seat yourself unless instructed",
        "Keep conversations at moderate volume in public spaces",
        "Stand to the right on escalators, walk on the left",
        "Make eye contact and smile when greeting people",
        "Say 'please' and 'thank you' - politeness is appreciated everywhere"
      ]
    },
    {
      title: "Timing & Punctuality",
      icon: Clock,
      tips: [
        "Arrive 5-10 minutes early for restaurant reservations",
        "Most shops open around 10 AM and close between 6-9 PM",
        "Brunch is typically served 10 AM - 2 PM on weekends",
        "Last call at bars is usually around 1:30-2 AM",
        "Museums and attractions may have timed entry - book tickets ahead"
      ]
    },
    {
      title: "Money & Payments",
      icon: DollarSign,
      tips: [
        "Credit cards are accepted almost everywhere",
        "Carry some cash for small vendors, tips, and emergencies",
        "ATMs are readily available but may charge fees for non-local banks",
        "Sales tax is added at checkout - prices displayed don't include tax",
        "Mobile payment apps (Apple Pay, Google Pay) are widely accepted"
      ]
    },
    {
      title: "Social Etiquette",
      icon: Users,
      tips: [
        "Queue patiently in lines - cutting is considered very rude",
        "Keep your phone on silent in restaurants and public spaces",
        "Don't block sidewalks or doorways when in groups",
        "Remove sunglasses when speaking with someone indoors",
        "Ask before taking photos of people or inside private establishments"
      ]
    },
    {
      title: "Local Favorites & Hidden Gems",
      icon: Sparkles,
      tips: [
        "Ask locals for their favorite spots - they know the best places",
        "Explore neighborhoods beyond the tourist areas",
        "Check local event listings for festivals, markets, and live music",
        "Food trucks and farmers markets offer great local food experiences",
        "Local coffee shops often have the best atmosphere and wifi"
      ]
    },
    {
      title: "Emergency & Important Info",
      icon: Phone,
      tips: [
        "Emergency services: Dial 911 for police, fire, or medical emergencies",
        "Save the address of your hotel in your phone for easy reference",
        "Keep copies of important documents separate from originals",
        "Know the location of the nearest hospital or urgent care",
        "Hotel concierges can help with almost any issue or question"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Local Tips & Information</h2>
        <p className="text-sm text-gray-500 mt-1">
          Everything you need to know to make the most of your visit to {weddingCity}
        </p>
      </div>

      <div className="border-t border-gray-200">
        <Accordion type="multiple" className="w-full">
          {tipsCategories.map((category, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-b border-gray-200"
            >
              <AccordionTrigger className="hover:no-underline py-5 px-0">
                <div className="flex items-center gap-3">
                  <category.icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-normal text-gray-900">{category.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-5 px-0">
                <ul className="space-y-2 pl-7">
                  {category.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Questions or Need Help?</h3>
            <p className="text-xs text-gray-600 mb-2">
              Don't hesitate to reach out if you need any assistance during your visit. We want to make sure you have an amazing time!
            </p>
            <p className="text-xs text-gray-500">
              You can also ask hotel staff or locals - people in {weddingCity} are generally friendly and happy to help visitors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}