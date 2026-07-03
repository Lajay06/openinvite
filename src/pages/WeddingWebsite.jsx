import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyInvitation } from '@/lib/resolveMyWedding';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MapPin, 
  Clock, 
  Calendar, 
  Gift, 
  MessageCircle,
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  UtensilsCrossed,
  Home,
  Info,
  Plane,
  Hotel,
  Car,
  Utensils,
  Sparkles,
  Star,
  DollarSign,
  Users,
  ArrowRight,
  Camera,
  Video,
  Send
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import toast from 'react-hot-toast';
import InteractiveMap from '../components/guest-experience/InteractiveMap';
import OurStoryTimeline from '../components/wedding-website/OurStoryTimeline';

export default function WeddingWebsite() {
  const [searchParams] = useSearchParams();
  const guestId = searchParams.get('guest');
  
  const [invitation, setInvitation] = useState(null);
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [guest, setGuest] = useState(null);
  const [registryItems, setRegistryItems] = useState([]);
  const [customGifts, setCustomGifts] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [storyMilestones, setStoryMilestones] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [streams, setStreams] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [guestChatName, setGuestChatName] = useState('');
  const [streamPassword, setStreamPassword] = useState('');
  const [authenticatedStreams, setAuthenticatedStreams] = useState([]);
  const [customPages, setCustomPages] = useState([]);
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [submitting, setSubmitting] = useState(false);
  
  const [rsvpForm, setRsvpForm] = useState({
    rsvp_status: 'pending',
    meal_choice: '',
    dietary_restrictions: '',
    plus_one_rsvp: 'pending',
    plus_one_name: '',
    plus_one_meal_choice: '',
    plus_one_dietary_restrictions: '',
    special_requests: ''
  });

  const [messageForm, setMessageForm] = useState({
    guest_name: '',
    guest_email: '',
    message: ''
  });

  const [preferences, setPreferences] = useState([]);
  const [showPreferences, setShowPreferences] = useState(false);

  // Define all activities and restaurants data
  const allActivities = React.useMemo(() => [
    {
      name: "Historic Downtown District",
      type: "Historic Site",
      description: "Charming downtown area with beautifully preserved Victorian architecture, boutique shops, art galleries, and cozy cafes.",
      rating: 4.7,
      cost: "Free",
      bestTime: "Morning or late afternoon",
      whyVisit: "Perfect for a leisurely stroll and discovering local culture",
      imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800",
      tags: ["culture", "history", "shopping"],
      localFavorite: true
    },
    {
      name: "Riverside Nature Reserve",
      type: "Outdoor",
      description: "Scenic nature trails along the river with stunning views, wildlife spotting, and peaceful picnic areas.",
      rating: 4.8,
      cost: "Free",
      bestTime: "Early morning or sunset",
      whyVisit: "Beautiful photography opportunities and peaceful escape",
      imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800",
      tags: ["outdoor", "nature", "family_friendly"],
      localFavorite: true
    },
    {
      name: "City Museum of Art",
      type: "Museum",
      description: "World-class collection featuring contemporary art, classical masters, and rotating exhibitions.",
      rating: 4.6,
      cost: "$15-20",
      bestTime: "Weekday afternoons",
      whyVisit: "Cultural enrichment in stunning architectural setting",
      imageUrl: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
      tags: ["culture", "history"]
    },
    {
      name: "Waterfront Park",
      type: "Park",
      description: "Expansive park along the waterfront with walking paths, sculptures, playgrounds, and event spaces.",
      rating: 4.7,
      cost: "Free",
      bestTime: "Anytime",
      whyVisit: "Great for families, joggers, or relaxing by the water",
      imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
      tags: ["outdoor", "family_friendly", "nature"]
    },
    {
      name: "Downtown Nightlife District",
      type: "Entertainment",
      description: "Vibrant area with trendy bars, live music venues, and cocktail lounges. The perfect spot for evening entertainment.",
      rating: 4.5,
      cost: "$$",
      bestTime: "Evening",
      whyVisit: "Experience the city's energetic nightlife scene",
      imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800",
      tags: ["nightlife"]
    },
    {
      name: "Mountain Trail Adventures",
      type: "Adventure",
      description: "Guided hiking and zip-lining experiences through stunning mountain terrain with breathtaking views.",
      rating: 4.9,
      cost: "$50-100",
      bestTime: "Morning",
      whyVisit: "Thrilling outdoor adventure with professional guides",
      imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
      tags: ["adventure", "outdoor", "nature"]
    }
  ], []);

  const allRestaurants = React.useMemo(() => [
    {
      name: "The Riverside Bistro",
      cuisine: "American Contemporary",
      rating: 4.6,
      priceRange: "$$-$$$",
      distance: "0.3 miles",
      description: "Farm-to-table dining featuring seasonal menus, craft cocktails, and an extensive wine list in an elegant setting.",
      specialties: ["Grilled Ribeye", "Pan-Seared Scallops", "Truffle Mac & Cheese"],
      whyGood: "Perfect for pre-wedding dinners with private dining options",
      imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
      tags: ["fine_dining"],
      localFavorite: true
    },
    {
      name: "Bella Italia Ristorante",
      cuisine: "Italian",
      rating: 4.4,
      priceRange: "$$",
      distance: "1 mile",
      description: "Authentic Italian cuisine with homemade pasta, wood-fired pizzas, and classic Italian desserts.",
      specialties: ["Osso Buco", "Handmade Ravioli", "Tiramisu"],
      whyGood: "Cozy atmosphere ideal for family gatherings",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
      tags: ["casual_dining", "family_friendly"]
    },
    {
      name: "Sushi Garden",
      cuisine: "Japanese",
      rating: 4.5,
      priceRange: "$$",
      distance: "1.5 miles",
      description: "Fresh sushi and sashimi with a modern twist, featuring daily specials and an extensive sake menu.",
      specialties: ["Omakase Tasting", "Dragon Roll", "Toro Sashimi"],
      whyGood: "Contemporary setting with impeccable service",
      imageUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800",
      tags: ["fine_dining"],
      localFavorite: true
    },
    {
      name: "The Corner Cafe",
      cuisine: "American",
      rating: 4.3,
      priceRange: "$",
      distance: "0.5 miles",
      description: "Casual neighborhood spot serving hearty breakfasts, comfort food lunches, and the best coffee in town.",
      specialties: ["Pancakes", "Burgers", "Fresh Pastries"],
      whyGood: "Relaxed atmosphere, great for families and quick bites",
      imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
      tags: ["casual_dining", "family_friendly"]
    }
  ], []);

  // Filtered activities based on preferences
  const activities = React.useMemo(() => {
    if (!preferences || preferences.length === 0) return allActivities;
    
    const filtered = allActivities.filter(activity => 
      activity.tags.some(tag => preferences.includes(tag))
    );
    
    return filtered.length > 0 ? filtered : allActivities;
  }, [preferences, allActivities]);

  // Filtered restaurants based on preferences
  const restaurantList = React.useMemo(() => {
    if (restaurants.length > 0) return restaurants;
    if (!preferences || preferences.length === 0) return allRestaurants;
    
    const filtered = allRestaurants.filter(restaurant => 
      restaurant.tags.some(tag => preferences.includes(tag))
    );
    
    return filtered.length > 0 ? filtered : allRestaurants;
  }, [restaurants, preferences, allRestaurants]);

  // Local favorites
  const localFavorites = React.useMemo(() => {
    return {
      activities: allActivities.filter(a => a.localFavorite),
      restaurants: allRestaurants.filter(r => r.localFavorite)
    };
  }, [allActivities, allRestaurants]);

  const [localTips] = useState([
    {
      title: "Getting Around",
      icon: Car,
      tips: [
        "Ride-sharing apps like Uber and Lyft are widely available",
        "Downtown parking available - hotel parking recommended",
        "Peak traffic hours are typically 7-9 AM and 4-7 PM weekdays"
      ]
    },
    {
      title: "Dining Etiquette",
      icon: Utensils,
      tips: [
        "Standard tip is 15-20% for table service",
        "Many restaurants accept reservations through OpenTable",
        "Happy hour deals common between 3-6 PM"
      ]
    },
    {
      title: "Local Customs",
      icon: Users,
      tips: [
        "Wait to be seated at restaurants",
        "Keep conversations at moderate volume in public spaces",
        "Politeness is appreciated - say please and thank you"
      ]
    }
  ]);

  useEffect(() => {
    loadWeddingData();
  }, [guestId]);

  const loadWeddingData = async () => {
    try {
      const [invitation, details, registry, gifts, hotelData, restaurantData, storyData, photoData, streamData, customPagesData, themeData] = await Promise.all([
        getMyInvitation(),
        getMyWeddingDetails(),
        base44.entities.RegistryItem.list(),
        base44.entities.CustomGift.list(),
        base44.entities.Hotel.list().catch(() => []),
        base44.entities.Restaurant.list().catch(() => []),
        base44.entities.StoryMilestone.list().catch(() => []),
        base44.entities.Photo.list().catch(() => []),
        base44.entities.LiveStream.list().catch(() => []),
        base44.entities.CustomEventPage.list('order').catch(() => []),
        base44.entities.WebsiteTheme.list().catch(() => [])
      ]);

      setInvitation(invitation || null);
      setWeddingDetails(details || null);
      setRegistryItems(registry);
      setCustomGifts(gifts);
      setHotels(hotelData);
      setRestaurants(restaurantData);
      setStoryMilestones(storyData);
      setPhotos(photoData.filter(p => p.visible_to_guests !== false));
      setStreams(streamData);
      setCustomPages(customPagesData.filter(p => p.visible_to_guests !== false));
      if (themeData.length > 0) {
        setTheme(themeData[0]);
      }

      if (guestId) {
        const guests = await base44.entities.Guest.list();
        const guestData = guests.find(g => g.id === guestId);
        if (guestData) {
          setGuest(guestData);
          setRsvpForm({
            rsvp_status: guestData.rsvp_status || 'pending',
            meal_choice: guestData.meal_choice || '',
            dietary_restrictions: guestData.dietary_restrictions || '',
            plus_one_rsvp: guestData.plus_one_rsvp || 'pending',
            plus_one_name: guestData.plus_one_name || '',
            plus_one_meal_choice: guestData.plus_one_meal_choice || '',
            plus_one_dietary_restrictions: guestData.plus_one_dietary_restrictions || '',
            special_requests: guestData.special_requests || ''
          });
          setMessageForm({
            guest_name: guestData.name || '',
            guest_email: guestData.email || '',
            message: ''
          });
          setPreferences(guestData.interests || []);
        }
      }
    } catch (error) {
      console.error('Error loading wedding data:', error);
      toast.error('Failed to load wedding details');
    }
    setLoading(false);
  };

  const handleRSVPSubmit = async (e) => {
    e.preventDefault();
    if (!guest) {
      toast.error('Guest information not found');
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Guest.update(guest.id, {
        ...rsvpForm,
        rsvp_date: new Date().toISOString()
      });
      toast.success('RSVP submitted successfully!');
      setGuest({ ...guest, ...rsvpForm });
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      toast.error('Failed to submit RSVP');
    }
    setSubmitting(false);
  };

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await base44.entities.GuestMessage.create(messageForm);
      toast.success('Message sent!');
      setMessageForm({ ...messageForm, message: '' });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  const NavButton = ({ icon: Icon, label, section }) => (
    <button
      onClick={() => setActiveSection(section)}
      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
        activeSection === section
          ? 'text-gray-900'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
      {activeSection === section && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
      )}
    </button>
  );

  const showOurStory = storyMilestones.length > 0;
  const showPhotos = photos.length > 0;
  const showLiveStream = streams.length > 0;
  const liveStreams = streams.filter(s => s.is_live);

  const loadChatMessages = async (streamId) => {
    try {
      const messages = await base44.entities.StreamChat.filter({ stream_id: streamId }, '-created_date', 100);
      setChatMessages(messages.filter(m => m.is_visible !== false));
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const handleSendMessage = async (streamId) => {
    if (!newMessage.trim() || !guestChatName.trim()) {
      toast.error('Please enter your name and a message');
      return;
    }

    try {
      await base44.entities.StreamChat.create({
        stream_id: streamId,
        guest_name: guestChatName,
        message: newMessage
      });
      setNewMessage('');
      loadChatMessages(streamId);
      toast.success('Message sent!');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error('Failed to send message');
    }
  };

  const handleStreamAuth = (streamId, password) => {
    const stream = streams.find(s => s.id === streamId);
    if (stream && stream.password === password) {
      setAuthenticatedStreams([...authenticatedStreams, streamId]);
      setStreamPassword('');
      toast.success('Access granted!');
    } else {
      toast.error('Incorrect password');
    }
  };

  const getVideoEmbedUrl = (stream) => {
    if (stream.stream_type === 'youtube') {
      const videoId = stream.stream_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    } else if (stream.stream_type === 'vimeo') {
      const videoId = stream.stream_url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : null;
    } else if (stream.stream_type === 'zoom') {
      return stream.stream_url;
    }
    return null;
  };

  const renderCustomEventPage = (page) => (
    <div className="space-y-12">
      <div className="text-center mb-16">
        <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
        <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">{page.title}</h2>
        {page.date && (
          <p className="text-gray-500">
            {new Date(page.date).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {page.description && (
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{page.description}</p>
          </div>
        )}

        <div className="grid gap-6">
          {page.venue_name && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{page.venue_name}</p>
                {page.venue_address && (
                  <p className="text-sm text-gray-600">{page.venue_address}</p>
                )}
              </div>
            </div>
          )}

          {page.dress_code && (
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Dress Code</p>
                <p className="text-sm text-gray-600">{page.dress_code}</p>
              </div>
            </div>
          )}
        </div>

        {page.rsvp_required && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-900 font-medium mb-2">RSVP Required</p>
            <p className="text-sm text-blue-700">Please let us know if you'll be joining us</p>
          </div>
        )}
      </div>
    </div>
  );

  const handleSavePreferences = async () => {
    if (!guest) return;
    
    try {
      await base44.entities.Guest.update(guest.id, { interests: preferences });
      toast.success('Preferences saved!');
      setShowPreferences(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const hotelList = hotels.length > 0 ? hotels : [
    {
      name: "Riverside Resort & Spa",
      rating: 4.5,
      priceRange: "$$$",
      distance: "0.5 miles from venue",
      description: "Elegant resort offering luxurious amenities, spa services, and stunning views. Perfect for wedding guests seeking comfort and convenience.",
      amenities: ["Free WiFi", "Pool", "Spa", "Restaurant", "Valet Parking"],
      whyGood: "Closest to venue with shuttle service available",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"
    },
    {
      name: "Garden Inn Downtown",
      rating: 4.2,
      priceRange: "$$",
      distance: "2 miles from venue",
      description: "Modern hotel in the heart of downtown with complimentary breakfast and free parking. Great value for wedding guests.",
      amenities: ["Free Breakfast", "Free Parking", "Gym", "Business Center"],
      whyGood: "Budget-friendly with excellent downtown location",
      imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"
    }
  ];



  const transportOptions = [
    {
      name: "Uber / Lyft",
      type: "Ride Share",
      description: "Most convenient option for getting around. Available 24/7 with typical wait times under 5 minutes.",
      cost: "$15-30 from airport",
      tips: "Download apps before arrival for quickest service",
      whyGood: "No parking hassles, affordable, reliable"
    },
    {
      name: "Enterprise Rent-A-Car",
      type: "Car Rental",
      description: "Full-size and luxury vehicles available at the airport. Perfect if you want flexibility to explore.",
      cost: "$50-100/day",
      tips: "Book in advance for best rates",
      whyGood: "Freedom to explore at your own pace"
    },
    {
      name: "Airport Shuttle Service",
      type: "Shared Shuttle",
      description: "Affordable shared shuttle service running every 30 minutes between airport and major hotels.",
      cost: "$20 per person",
      tips: "Book online for 10% discount",
      whyGood: "Budget-friendly with hotel drop-off"
    },
    {
      name: "Premium Car Service",
      type: "Private Car",
      description: "Luxury sedan or SUV service with professional drivers. Perfect for groups or those seeking comfort.",
      cost: "$80-150 from airport",
      tips: "Book 24 hours in advance",
      whyGood: "Comfortable, professional, stress-free"
    }
  ];



  const themeStyles = theme ? {
    '--primary-color': theme.primary_color,
    '--secondary-color': theme.secondary_color,
    '--background-color': theme.background_color,
    '--text-color': theme.text_color,
    '--accent-color': theme.accent_color,
    fontFamily: theme.font_family
  } : {};

  const heroImage = theme?.hero_image_url || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&h=900&fit=crop';

  return (
    <div className="min-h-screen bg-white" style={themeStyles}>

      
      {/* Elegant Hero */}
      <div 
        className="relative bg-gray-900 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '70vh'
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-24 text-center relative z-10 flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
          <div className="mb-8 w-px h-24 bg-white/30" />
          <h1 
            className="text-6xl lg:text-8xl font-light mb-6 tracking-wide"
            style={{ fontFamily: theme?.heading_font || 'inherit' }}
          >
            {invitation?.couple_names || 'Our Wedding'}
          </h1>
          {invitation?.wedding_date && (
            <p className="text-lg lg:text-xl text-gray-200 font-light tracking-widest uppercase mb-8">
              {new Date(invitation.wedding_date).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          )}
          
          {/* Personalized Welcome Message */}
          {guest && invitation?.personalized_messages && (
            (() => {
              const messages = invitation.personalized_messages;
              let message = null;
              
              // Check for guest-specific message first
              if (messages[guest.id]) {
                message = messages[guest.id];
              }
              // Then check for category-based message
              else if (guest.category && messages[guest.category]) {
                message = messages[guest.category];
              }
              // Then check for RSVP status message
              else if (guest.rsvp_status && messages[guest.rsvp_status]) {
                message = messages[guest.rsvp_status];
              }
              // Default message
              else if (messages.default) {
                message = messages.default;
              }
              
              if (message) {
                return (
                  <div className="mt-8 max-w-2xl mx-auto">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                      <p className="text-base lg:text-lg text-white/90 font-light leading-relaxed">
                        {message}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}
          
          <div className="w-px h-24 bg-white/30 mt-8" />
        </div>
      </div>

      {/* Minimal Navigation */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex justify-center items-center overflow-x-auto">
            {showOurStory && <NavButton icon={Heart} label="Our Story" section="story" />}
            <NavButton icon={Home} label="Details" section="home" />
            <NavButton icon={Calendar} label="RSVP" section="rsvp" />
            {customPages.map(page => (
              <NavButton key={page.id} icon={Calendar} label={page.title} section={`event-${page.slug}`} />
            ))}
            {showPhotos && <NavButton icon={Camera} label="Photos" section="photos" />}
            {showLiveStream && <NavButton icon={Video} label="Live Stream" section="stream" />}
            <NavButton icon={Sparkles} label="Experience" section="travel" />
            <NavButton icon={Gift} label="Registry" section="registry" />
            <NavButton icon={MessageCircle} label="Contact" section="contact" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Our Story Section */}
        {activeSection === 'story' && (
          <div className="space-y-12">
            <div className="text-center mb-16">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Our Story</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                The journey that brought us here
              </p>
            </div>

            <OurStoryTimeline milestones={storyMilestones} />
          </div>
        )}

        {/* Wedding Details */}
        {activeSection === 'home' && (
          <div className="space-y-12">
            <div className="text-center mb-16">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Wedding Details</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Join us for a celebration of love and commitment
              </p>
            </div>
            
            <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
              {/* Ceremony */}
              <AccordionItem value="ceremony" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Heart className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Ceremony</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    <p className="font-medium text-gray-900">
                      {weddingDetails?.mainCeremony?.venueName || 'Garden Chapel at Riverside Estate'}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                      {weddingDetails?.mainCeremony?.address || '123 Garden Lane, Riverside, CA 92501'}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {weddingDetails?.mainCeremony?.startTime || '4:00 PM'}
                    </p>
                    <p className="text-sm text-gray-500 italic pt-2 border-t border-gray-100">
                      Please arrive 15 minutes early. The ceremony begins promptly.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Reception */}
              <AccordionItem value="reception" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Reception</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    <p className="font-medium text-gray-900">
                      {weddingDetails?.reception?.venueName || 'Grand Ballroom at Riverside Estate'}
                    </p>
                    <p className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                      {weddingDetails?.reception?.address || '123 Garden Lane, Riverside, CA 92501'}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {weddingDetails?.reception?.startTime || '5:30 PM'} - {weddingDetails?.reception?.endTime || '11:00 PM'}
                    </p>
                    <p className="text-sm text-gray-500 italic pt-2 border-t border-gray-100">
                      Cocktail hour, dinner, and dancing to follow the ceremony.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Food & Beverage */}
              <AccordionItem value="dining" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Dining</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Service</p>
                      <p className="text-gray-700">Plated Dinner Service</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Menu</p>
                      <div className="space-y-2">
                        <div className="pl-3 border-l border-gray-200">
                          <p className="font-medium text-gray-900">Herb-Crusted Filet Mignon</p>
                          <p className="text-sm text-gray-600">Roasted vegetables, garlic mashed potatoes</p>
                        </div>
                        <div className="pl-3 border-l border-gray-200">
                          <p className="font-medium text-gray-900">Pan-Seared Salmon</p>
                          <p className="text-sm text-gray-600">Lemon butter sauce, seasonal vegetables</p>
                        </div>
                        <div className="pl-3 border-l border-gray-200">
                          <p className="font-medium text-gray-900">Vegetarian Risotto</p>
                          <p className="text-sm text-gray-600">Mushroom and truffle oil with asparagus</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Bar</p>
                      <p className="text-gray-700">Open Bar - Beer, Wine & Signature Cocktails</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Pre-Wedding Events */}
              <AccordionItem value="pre-events" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Pre-Wedding Events</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    {weddingDetails?.preWeddingEvents && weddingDetails.preWeddingEvents.length > 0 ? (
                      weddingDetails.preWeddingEvents.map((event, idx) => (
                        <div key={event.id || idx} className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">{event.name}</p>
                          {event.date && <p className="text-sm text-gray-600">{event.date} {event.time && `at ${event.time}`}</p>}
                          {event.venue && <p className="text-sm text-gray-600">{event.venue}</p>}
                          {event.notes && <p className="text-sm text-gray-500 mt-1 italic">{event.notes}</p>}
                        </div>
                      ))
                    ) : (
                      <div className="pl-3 border-l-2 border-gray-200 py-2">
                        <p className="font-medium text-gray-900 mb-1">Welcome Dinner</p>
                        <p className="text-sm text-gray-600">Friday, 7:00 PM</p>
                        <p className="text-sm text-gray-600">Riverside Restaurant, 456 Main Street</p>
                        <p className="text-sm text-gray-500 mt-1 italic">Join us for a casual dinner the night before the wedding. Optional but encouraged!</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Post-Wedding Events */}
              <AccordionItem value="post-events" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Post-Wedding Events</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    {weddingDetails?.postWeddingEvents && weddingDetails.postWeddingEvents.length > 0 ? (
                      weddingDetails.postWeddingEvents.map((event, idx) => (
                        <div key={event.id || idx} className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">{event.name}</p>
                          {event.date && <p className="text-sm text-gray-600">{event.date} {event.time && `at ${event.time}`}</p>}
                          {event.venue && <p className="text-sm text-gray-600">{event.venue}</p>}
                          {event.notes && <p className="text-sm text-gray-500 mt-1 italic">{event.notes}</p>}
                        </div>
                      ))
                    ) : (
                      <div className="pl-3 border-l-2 border-gray-200 py-2">
                        <p className="font-medium text-gray-900 mb-1">Farewell Brunch</p>
                        <p className="text-sm text-gray-600">Sunday, 11:00 AM</p>
                        <p className="text-sm text-gray-600">Garden Terrace at Riverside Estate</p>
                        <p className="text-sm text-gray-500 mt-1 italic">Join us for a relaxed brunch before heading home. A wonderful way to say goodbye!</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* FAQs */}
              <AccordionItem value="faqs" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Info className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Frequently Asked Questions</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    {weddingDetails?.qna && weddingDetails.qna.length > 0 ? (
                      weddingDetails.qna.map((item, index) => (
                        <div key={index} className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">{item.question}</p>
                          <p className="text-sm text-gray-600">{item.answer}</p>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">What should I wear?</p>
                          <p className="text-sm text-gray-600">Semi-formal attire. Ladies, cocktail dresses or dressy separates. Gentlemen, suits or dress slacks with a button-down shirt.</p>
                        </div>
                        <div className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">Can I bring a plus one?</p>
                          <p className="text-sm text-gray-600">Due to venue capacity, we can only accommodate guests listed on your invitation. Please check your RSVP for plus-one details.</p>
                        </div>
                        <div className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">Are children welcome?</p>
                          <p className="text-sm text-gray-600">While we love your little ones, this will be an adults-only celebration. We hope this gives you a chance to enjoy an evening out!</p>
                        </div>
                        <div className="pl-3 border-l-2 border-gray-200 py-2">
                          <p className="font-medium text-gray-900 mb-1">Will there be parking?</p>
                          <p className="text-sm text-gray-600">Yes! Free parking is available at the venue. Valet service will also be provided.</p>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Custom Event Pages */}
        {customPages.map(page => {
          if (activeSection === `event-${page.slug}`) {
            return <div key={page.id}>{renderCustomEventPage(page)}</div>;
          }
          return null;
        })}

        {/* Live Stream Section */}
        {activeSection === 'stream' && (
          <div className="space-y-12">
            <div className="text-center mb-16">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Live Stream</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Join us virtually as we celebrate
              </p>
            </div>

            {liveStreams.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 justify-center mb-6">
                  <span className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg animate-pulse">
                    <Video className="w-4 h-4" />
                    <span className="font-medium">LIVE NOW</span>
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-8">
              {streams.map((stream) => {
                const isAuthenticated = !stream.password || authenticatedStreams.includes(stream.id);
                const embedUrl = getVideoEmbedUrl(stream);

                return (
                  <Card key={stream.id} className="border-0 shadow-sm">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <div>
                          <h3 className="text-xl font-medium text-gray-900">{stream.title}</h3>
                          {stream.scheduled_start && (
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(stream.scheduled_start).toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        {stream.is_live && (
                          <span className="flex items-center gap-2 bg-red-500 text-white text-sm px-3 py-1 rounded">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </div>

                      {!isAuthenticated ? (
                        <div className="p-12 text-center">
                          <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-600 mb-4">This stream is password protected</p>
                          <div className="max-w-sm mx-auto flex gap-2">
                            <Input
                              type="password"
                              placeholder="Enter password"
                              value={streamPassword}
                              onChange={(e) => setStreamPassword(e.target.value)}
                            />
                            <Button onClick={() => handleStreamAuth(stream.id, streamPassword)}>
                              Access
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-3 gap-0">
                          {/* Video Player */}
                          <div className="md:col-span-2 bg-black aspect-video">
                            {stream.stream_type === 'zoom' ? (
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="camera; microphone; fullscreen"
                                allowFullScreen
                              />
                            ) : stream.stream_type === 'custom' && stream.embed_code ? (
                              <div dangerouslySetInnerHTML={{ __html: stream.embed_code }} />
                            ) : embedUrl ? (
                              <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white">
                                <div className="text-center">
                                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                  <p>Stream will begin shortly</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Chat */}
                          {stream.chat_enabled !== false && (
                            <div className="bg-gray-50 flex flex-col h-[400px] md:h-auto">
                              <div className="p-4 border-b border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900">Live Chat</h4>
                              </div>

                              <div 
                                className="flex-1 overflow-y-auto p-4 space-y-3"
                                onFocus={() => loadChatMessages(stream.id)}
                              >
                                {chatMessages.map((msg) => (
                                  <div key={msg.id} className="text-sm">
                                    <span className="font-medium text-gray-900">{msg.guest_name}: </span>
                                    <span className="text-gray-600">{msg.message}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="p-4 border-t border-gray-200 space-y-2">
                                {!guestChatName && (
                                  <Input
                                    placeholder="Your name"
                                    value={guestChatName}
                                    onChange={(e) => setGuestChatName(e.target.value)}
                                    className="text-sm"
                                  />
                                )}
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Send a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(stream.id)}
                                    className="text-sm"
                                  />
                                  <Button 
                                    size="icon"
                                    onClick={() => handleSendMessage(stream.id)}
                                    className="flex-shrink-0"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {streams.length === 0 && (
              <div className="text-center py-16">
                <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No streams available at this time</p>
              </div>
            )}
          </div>
        )}

        {/* Photos Section */}
        {activeSection === 'photos' && (
          <div className="space-y-12">
            <div className="text-center mb-16">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Photo Gallery</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Cherished moments from our journey
              </p>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['all', 'engagement', 'pre_wedding', 'ceremony', 'reception', 'portraits', 'party'].map(cat => {
                const categoryPhotos = cat === 'all' ? photos : photos.filter(p => p.category === cat);
                if (categoryPhotos.length === 0 && cat !== 'all') return null;

                return (
                  <Button
                    key={cat}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filtered = cat === 'all' ? photos : photos.filter(p => p.category === cat);
                      setPhotos(filtered);
                    }}
                    className="text-xs capitalize"
                  >
                    {cat === 'all' ? 'All' : cat.replace('_', ' ')} ({categoryPhotos.length})
                  </Button>
                );
              })}
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo, index) => (
                <div key={photo.id || index} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={photo.image_url}
                      alt={photo.title || 'Wedding photo'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-4 text-center">
                    {photo.title && (
                      <h3 className="text-white text-sm font-medium mb-2">{photo.title}</h3>
                    )}
                    {photo.description && (
                      <p className="text-white/80 text-xs mb-4">{photo.description}</p>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(photo.image_url, '_blank')}
                      className="bg-white hover:bg-gray-100"
                    >
                      <Camera className="w-3 h-3 mr-2" />
                      View Full Size
                    </Button>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-gray-700 capitalize">
                    {photo.category.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-16">
                <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No photos available yet</p>
              </div>
            )}
          </div>
        )}

        {/* RSVP Section */}
        {activeSection === 'rsvp' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">RSVP</h2>
              {invitation?.rsvp_deadline && (
                <p className="text-gray-500">
                  Kindly respond by {new Date(invitation.rsvp_deadline).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              )}
            </div>

            {!guest ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center space-y-6">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300" />
                  <div>
                    <h3 className="text-xl font-light text-gray-900 mb-3">Please use your personalized link</h3>
                    <p className="text-gray-600 text-sm">
                      Check your email for your unique RSVP link.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : guest.rsvp_status && guest.rsvp_status !== 'pending' ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center space-y-6">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
                  <div>
                    <h3 className="text-xl font-light text-gray-900 mb-3">Thank you for your response</h3>
                    <p className="text-gray-600 mb-6">
                      {guest.rsvp_status === 'attending' ? 'We look forward to celebrating with you!' : 'You will be missed.'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6 text-left space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Status</p>
                      <p className="text-gray-900">{guest.rsvp_status === 'attending' ? 'Attending' : 'Unable to attend'}</p>
                    </div>
                    {guest.rsvp_status === 'attending' && guest.meal_choice && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Meal Selection</p>
                        <p className="text-gray-900 capitalize">{guest.meal_choice}</p>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={() => {
                      setRsvpForm({
                        rsvp_status: guest.rsvp_status || 'pending',
                        meal_choice: guest.meal_choice || '',
                        dietary_restrictions: guest.dietary_restrictions || '',
                        plus_one_rsvp: guest.plus_one_rsvp || 'pending',
                        plus_one_name: guest.plus_one_name || '',
                        plus_one_meal_choice: guest.plus_one_meal_choice || '',
                        plus_one_dietary_restrictions: guest.plus_one_dietary_restrictions || '',
                        special_requests: guest.special_requests || ''
                      });
                      setGuest({...guest, rsvp_status: 'pending'});
                    }}
                    variant="outline"
                    className="mt-4"
                  >
                    Update RSVP
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8">
                  <form onSubmit={handleRSVPSubmit} className="space-y-8">
                    <div>
                      <Label className="text-sm font-medium mb-4 block">Will you be attending?</Label>
                      <RadioGroup 
                        value={rsvpForm.rsvp_status} 
                        onValueChange={(value) => setRsvpForm({...rsvpForm, rsvp_status: value})}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="attending" id="attending" />
                          <Label htmlFor="attending" className="flex-1 cursor-pointer">
                            Joyfully accept
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="declined" id="declined" />
                          <Label htmlFor="declined" className="flex-1 cursor-pointer">
                            Regretfully decline
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {rsvpForm.rsvp_status === 'attending' && (
                      <>
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Meal Selection</Label>
                          <Select value={rsvpForm.meal_choice} onValueChange={(value) => setRsvpForm({...rsvpForm, meal_choice: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your preference" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beef">Filet Mignon</SelectItem>
                              <SelectItem value="fish">Pan-Seared Salmon</SelectItem>
                              <SelectItem value="vegetarian">Vegetarian Risotto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">Dietary Restrictions</Label>
                          <Input
                            value={rsvpForm.dietary_restrictions}
                            onChange={(e) => setRsvpForm({...rsvpForm, dietary_restrictions: e.target.value})}
                            placeholder="Any allergies or restrictions"
                          />
                        </div>

                        {guest.plus_one && (
                          <div className="border-t border-gray-100 pt-8">
                            <h4 className="text-sm font-medium mb-4">Plus One</h4>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm mb-2 block">Guest Name</Label>
                                <Input
                                  value={rsvpForm.plus_one_name}
                                  onChange={(e) => setRsvpForm({...rsvpForm, plus_one_name: e.target.value})}
                                  placeholder="Full name"
                                />
                              </div>
                              <div>
                                <Label className="text-sm mb-2 block">Will they attend?</Label>
                                <RadioGroup 
                                  value={rsvpForm.plus_one_rsvp} 
                                  onValueChange={(value) => setRsvpForm({...rsvpForm, plus_one_rsvp: value})}
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="attending" id="plus-attending" />
                                    <Label htmlFor="plus-attending">Yes</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="declined" id="plus-declined" />
                                    <Label htmlFor="plus-declined">No</Label>
                                  </div>
                                </RadioGroup>
                              </div>
                              {rsvpForm.plus_one_rsvp === 'attending' && (
                                <div>
                                  <Label className="text-sm mb-2 block">Meal Selection</Label>
                                  <Select value={rsvpForm.plus_one_meal_choice} onValueChange={(value) => setRsvpForm({...rsvpForm, plus_one_meal_choice: value})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select preference" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="beef">Filet Mignon</SelectItem>
                                      <SelectItem value="fish">Pan-Seared Salmon</SelectItem>
                                      <SelectItem value="vegetarian">Vegetarian Risotto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit RSVP'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Guest Experience Section */}
        {activeSection === 'travel' && (
          <div className="space-y-12">
            <div className="text-center mb-16">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Guest Experience</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Everything you need for a wonderful visit
              </p>
            </div>

            {/* Personalize Button */}
            {guest && (
              <div className="mb-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="border-gray-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {preferences.length > 0 ? 'Update Preferences' : 'Personalize Recommendations'}
                </Button>
              </div>
            )}

            {/* Preferences Panel */}
            {showPreferences && guest && (
              <Card className="mb-6 border-0 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">What interests you?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Select your interests to get personalized recommendations for activities and dining.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['nightlife', 'outdoor', 'culture', 'family_friendly', 'fine_dining', 'casual_dining', 'shopping', 'history', 'nature', 'adventure'].map((interest) => (
                      <Button
                        key={interest}
                        variant={preferences.includes(interest) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setPreferences(prev =>
                            prev.includes(interest)
                              ? prev.filter(p => p !== interest)
                              : [...prev, interest]
                          );
                        }}
                        className={preferences.includes(interest) ? 'bg-gray-900' : 'border-gray-300'}
                      >
                        {interest.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleSavePreferences} className="bg-gray-900">
                      Save Preferences
                    </Button>
                    <Button variant="outline" onClick={() => setShowPreferences(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active Filters Badge */}
            {preferences.length > 0 && (
              <div className="mb-6 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Personalized for you
                </Badge>
                <span className="text-xs text-gray-500">
                  Showing recommendations based on: {preferences.map(p => p.replace(/_/g, ' ')).join(', ')}
                </span>
              </div>
            )}

            <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
              {/* Interactive Map */}
              <AccordionItem value="map" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Interactive Map</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="pt-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Explore all wedding-related locations on the map. Click markers for details and directions.
                    </p>
                    <InteractiveMap
                      weddingDetails={weddingDetails}
                      hotels={hotelList}
                      restaurants={restaurantList}
                      activities={activities}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Local Favorites */}
              <AccordionItem value="local-favorites" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-400 fill-current" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Local Favorites</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-6 pt-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Our hand-picked recommendations for the best experiences in town.
                    </p>
                    
                    {/* Favorite Activities */}
                    {localFavorites.activities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Top Activities</h4>
                        <div className="space-y-4">
                          {localFavorites.activities.map((activity, idx) => (
                            <div key={idx} className="overflow-hidden rounded-lg border border-gray-100">
                              <div className="flex flex-col md:flex-row">
                                <div className="md:w-48 h-40 md:h-auto relative">
                                  <img 
                                    src={activity.imageUrl} 
                                    alt={activity.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    Local Favorite
                                  </Badge>
                                </div>
                                <div className="flex-1 p-4">
                                  <h4 className="font-medium text-gray-900 mb-1">{activity.name}</h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                    <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-current text-amber-400" />
                                      <span>{activity.rating}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{activity.cost}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{activity.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Favorite Restaurants */}
                    {localFavorites.restaurants.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Top Dining Spots</h4>
                        <div className="space-y-4">
                          {localFavorites.restaurants.map((restaurant, idx) => (
                            <div key={idx} className="overflow-hidden rounded-lg border border-gray-100">
                              <div className="flex flex-col md:flex-row">
                                <div className="md:w-48 h-40 md:h-auto relative">
                                  <img 
                                    src={restaurant.imageUrl} 
                                    alt={restaurant.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    Local Favorite
                                  </Badge>
                                </div>
                                <div className="flex-1 p-4">
                                  <h4 className="font-medium text-gray-900 mb-1">{restaurant.name}</h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                    <Badge variant="outline" className="text-xs">{restaurant.cuisine}</Badge>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-current text-amber-400" />
                                      <span>{restaurant.rating}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{restaurant.priceRange}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{restaurant.description}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Itinerary Planner */}
              <AccordionItem value="itinerary" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Weekend Itinerary</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-6 pt-2">
                    {/* Friday */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">Friday</p>
                      <div className="space-y-4">
                        {weddingDetails?.preWeddingEvents && weddingDetails.preWeddingEvents.length > 0 ? (
                          weddingDetails.preWeddingEvents.map((event, idx) => (
                            <div key={event.id || idx} className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{event.time || '7:00 PM'}</p>
                                </div>
                                <p className="font-medium text-gray-900 mb-1">{event.name}</p>
                                <p className="text-sm text-gray-600 flex items-start gap-2">
                                  <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                  {event.venue || 'TBD'}
                                </p>
                                {event.notes && <p className="text-sm text-gray-500 mt-2">{event.notes}</p>}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const eventDate = invitation?.wedding_date ? new Date(invitation.wedding_date) : new Date();
                                  eventDate.setDate(eventDate.getDate() - 1);
                                  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.notes || '')}&location=${encodeURIComponent(event.venue || '')}`;
                                  window.open(googleCalUrl, '_blank');
                                }}
                              >
                                Add to Calendar
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <p className="text-sm font-medium text-gray-900">7:00 PM</p>
                              </div>
                              <p className="font-medium text-gray-900 mb-1">Welcome Dinner</p>
                              <p className="text-sm text-gray-600 flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                Riverside Restaurant
                              </p>
                              <p className="text-sm text-gray-500 mt-2">Casual gathering the night before</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const eventDate = invitation?.wedding_date ? new Date(invitation.wedding_date) : new Date();
                                eventDate.setDate(eventDate.getDate() - 1);
                                eventDate.setHours(19, 0, 0);
                                const endDate = new Date(eventDate);
                                endDate.setHours(21, 0, 0);
                                const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Welcome Dinner')}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent('Casual gathering the night before the wedding')}&location=${encodeURIComponent('Riverside Restaurant')}`;
                                window.open(googleCalUrl, '_blank');
                              }}
                            >
                              Add to Calendar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Saturday - Wedding Day */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">Saturday - Wedding Day</p>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{weddingDetails?.mainCeremony?.startTime || '4:00 PM'}</p>
                            </div>
                            <p className="font-medium text-gray-900 mb-1">Ceremony</p>
                            <p className="text-sm text-gray-600 flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                              {weddingDetails?.mainCeremony?.venueName || 'Garden Chapel at Riverside Estate'}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const eventDate = invitation?.wedding_date ? new Date(invitation.wedding_date) : new Date();
                              const startTime = weddingDetails?.mainCeremony?.startTime || '4:00 PM';
                              const [hours, minutes] = startTime.match(/(\d+):(\d+)/).slice(1);
                              const isPM = startTime.includes('PM');
                              eventDate.setHours(isPM && hours !== '12' ? parseInt(hours) + 12 : parseInt(hours), parseInt(minutes), 0);
                              const endDate = new Date(eventDate);
                              endDate.setMinutes(endDate.getMinutes() + 30);
                              const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Wedding Ceremony')}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`${invitation?.couple_names || 'Wedding'} Ceremony`)}&location=${encodeURIComponent(weddingDetails?.mainCeremony?.address || '123 Garden Lane, Riverside, CA 92501')}`;
                              window.open(googleCalUrl, '_blank');
                            }}
                          >
                            Add to Calendar
                          </Button>
                        </div>

                        <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{weddingDetails?.reception?.startTime || '5:30 PM'}</p>
                            </div>
                            <p className="font-medium text-gray-900 mb-1">Reception</p>
                            <p className="text-sm text-gray-600 flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                              {weddingDetails?.reception?.venueName || 'Grand Ballroom at Riverside Estate'}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">Cocktails, dinner, and dancing</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const eventDate = invitation?.wedding_date ? new Date(invitation.wedding_date) : new Date();
                              const startTime = weddingDetails?.reception?.startTime || '5:30 PM';
                              const [hours, minutes] = startTime.match(/(\d+):(\d+)/).slice(1);
                              const isPM = startTime.includes('PM');
                              eventDate.setHours(isPM && hours !== '12' ? parseInt(hours) + 12 : parseInt(hours), parseInt(minutes), 0);
                              const endTime = weddingDetails?.reception?.endTime || '11:00 PM';
                              const [endHours, endMinutes] = endTime.match(/(\d+):(\d+)/).slice(1);
                              const endIsPM = endTime.includes('PM');
                              const endDate = new Date(eventDate);
                              endDate.setHours(endIsPM && endHours !== '12' ? parseInt(endHours) + 12 : parseInt(endHours), parseInt(endMinutes), 0);
                              const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Wedding Reception')}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`${invitation?.couple_names || 'Wedding'} Reception - Cocktails, dinner, and dancing`)}&location=${encodeURIComponent(weddingDetails?.reception?.address || '123 Garden Lane, Riverside, CA 92501')}`;
                              window.open(googleCalUrl, '_blank');
                            }}
                          >
                            Add to Calendar
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Sunday */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">Sunday</p>
                      <div className="space-y-4">
                        {weddingDetails?.postWeddingEvents && weddingDetails.postWeddingEvents.length > 0 ? (
                          weddingDetails.postWeddingEvents.map((event, idx) => (
                            <div key={event.id || idx} className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <p className="text-sm font-medium text-gray-900">{event.time || '11:00 AM'}</p>
                                </div>
                                <p className="font-medium text-gray-900 mb-1">{event.name}</p>
                                <p className="text-sm text-gray-600 flex items-start gap-2">
                                  <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                  {event.venue || 'TBD'}
                                </p>
                                {event.notes && <p className="text-sm text-gray-500 mt-2">{event.notes}</p>}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const eventDate = invitation?.wedding_date ? new Date(invitation.wedding_date) : new Date();
                                  eventDate.setDate(eventDate.getDate() + 1);
                                  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.notes || '')}&location=${encodeURIComponent(event.venue || '')}`;
                                  window.open(googleCalUrl, '_blank');
                                }}
                              >
                                Add to Calendar
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <p className="text-sm font-medium text-gray-900">11:00 AM</p>
                              </div>
                              <p className="font-medium text-gray-900 mb-1">Farewell Brunch</p>
                              <p className="text-sm text-gray-600 flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                Garden Terrace at Riverside Estate
                              </p>
                              <p className="text-sm text-gray-500 mt-2">Relaxed brunch before heading home</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const eventDate = invitation?.wedding_date ? new Date(invitation.wedding_date) : new Date();
                                eventDate.setDate(eventDate.getDate() + 1);
                                eventDate.setHours(11, 0, 0);
                                const endDate = new Date(eventDate);
                                endDate.setHours(13, 0, 0);
                                const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Farewell Brunch')}&dates=${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent('Relaxed brunch before heading home')}&location=${encodeURIComponent('Garden Terrace at Riverside Estate')}`;
                                window.open(googleCalUrl, '_blank');
                              }}
                            >
                              Add to Calendar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Transportation */}
              <AccordionItem value="transportation" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Car className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Transportation</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-4 pt-2">
                    {transportOptions.map((option, idx) => (
                      <div key={idx} className="pl-3 border-l-2 border-gray-200 py-2">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-gray-900">{option.name}</p>
                          <Badge variant="outline" className="text-xs">{option.type}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-gray-900">{option.cost}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 text-xs italic">{option.tips}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Hotels */}
              <AccordionItem value="hotels" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Hotel className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Accommodations</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-6 pt-2">
                    {hotelList.map((hotel, idx) => (
                      <div key={idx} className="overflow-hidden rounded-lg border border-gray-100">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-48 h-40 md:h-auto">
                            <img 
                              src={hotel.imageUrl} 
                              alt={hotel.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">{hotel.name}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current text-amber-400" />
                                    <span>{hotel.rating}</span>
                                  </div>
                                  <span>•</span>
                                  <span>{hotel.priceRange}</span>
                                  <span>•</span>
                                  <span>{hotel.distance}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{hotel.description}</p>
                            {hotel.amenities && (
                              <div className="flex flex-wrap gap-1.5">
                                {hotel.amenities.slice(0, 4).map((amenity, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{amenity}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Dining */}
              <AccordionItem value="dining" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Dining Recommendations</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-6 pt-2">
                    {restaurantList.map((restaurant, idx) => (
                      <div key={idx} className="overflow-hidden rounded-lg border border-gray-100">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-48 h-40 md:h-auto">
                            <img 
                              src={restaurant.imageUrl} 
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">{restaurant.name}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  <Badge variant="outline" className="text-xs">{restaurant.cuisine}</Badge>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current text-amber-400" />
                                    <span>{restaurant.rating}</span>
                                  </div>
                                  <span>•</span>
                                  <span>{restaurant.priceRange}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{restaurant.description}</p>
                            {restaurant.specialties && (
                              <div className="flex flex-wrap gap-1.5">
                                {restaurant.specialties.slice(0, 3).map((dish, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{dish}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Things to Do */}
              <AccordionItem value="activities" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Camera className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Things to Do</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-6 pt-2">
                    {activities.map((activity, idx) => (
                      <div key={idx} className="overflow-hidden rounded-lg border border-gray-100">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-48 h-40 md:h-auto">
                            <img 
                              src={activity.imageUrl} 
                              alt={activity.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">{activity.name}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  <Badge variant="outline" className="text-xs">{activity.type}</Badge>
                                  {activity.rating && (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current text-amber-400" />
                                        <span>{activity.rating}</span>
                                      </div>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span>{activity.cost}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                            <p className="text-xs text-gray-500">Best time: {activity.bestTime}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Local Tips */}
              <AccordionItem value="tips" className="border-0 shadow-sm rounded-lg overflow-hidden">
                <AccordionTrigger className="px-8 py-6 hover:bg-gray-50 hover:no-underline data-[state=open]:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Info className="w-5 h-5 text-gray-700" />
                    </div>
                    <span className="text-xl font-light text-gray-900">Local Tips & Information</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6">
                  <div className="space-y-6 pt-2">
                    {localTips.map((category, idx) => (
                      <div key={idx}>
                        <div className="flex items-center gap-2 mb-3">
                          <category.icon className="w-4 h-4 text-gray-400" />
                          <h4 className="font-medium text-gray-900 text-sm">{category.title}</h4>
                        </div>
                        <ul className="space-y-2 pl-6">
                          {category.tips.map((tip, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-gray-300 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* Registry Section */}
        {activeSection === 'registry' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Gift Registry</h2>
              <p className="text-gray-500">
                Your presence is the greatest gift
              </p>
            </div>

            {(registryItems.length > 0 || customGifts.length > 0) ? (
              <div className="space-y-6">
                {registryItems.map(item => (
                  <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-8 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">{item.store_name}</h4>
                        {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                      </div>
                      <Button asChild variant="outline">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          View Registry
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">Registry details coming soon</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Contact Section */}
        {activeSection === 'contact' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
              <h2 className="text-4xl font-light text-gray-900 mb-4 tracking-wide">Get in Touch</h2>
              <p className="text-gray-500">
                We'd love to hear from you
              </p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-8">
                <form onSubmit={handleMessageSubmit} className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Name</Label>
                    <Input
                      value={messageForm.guest_name}
                      onChange={(e) => setMessageForm({...messageForm, guest_name: e.target.value})}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Email</Label>
                    <Input
                      type="email"
                      value={messageForm.guest_email}
                      onChange={(e) => setMessageForm({...messageForm, guest_email: e.target.value})}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Message</Label>
                    <Textarea
                      value={messageForm.message}
                      onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                      placeholder="Your message..."
                      rows={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Minimal Footer */}
      <div className="border-t border-gray-100 py-12 mt-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-px h-12 bg-gray-200 mx-auto mb-6" />
          <p className="text-sm text-gray-400 tracking-wider uppercase">
            {invitation?.couple_names || 'Wedding'} • {invitation?.wedding_date ? new Date(invitation.wedding_date).getFullYear() : ''}
          </p>
        </div>
      </div>
    </div>
  );
}