import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Sparkles, 
  Globe, 
  Mail, 
  CheckSquare, 
  Printer, 
  Eye, 
  Settings,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIWeddingAssistant from '../components/shared/AIWeddingAssistant';
import { WeddingDetails } from '@/entities/WeddingDetails';
import { Invitation } from '@/entities/Invitation';

const FeatureCard = ({ title, description, icon: Icon, href, actionText, comingSoon }) => (
  <Card className="flex flex-col bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-pink-100 rounded-lg">
          <Icon className="w-6 h-6 text-pink-600" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-grow flex items-end justify-between">
      {comingSoon ? (
        <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Coming Soon</span>
      ) : (
        <Link to={href}>
          <Button variant="outline" className="border-gray-200">
            {actionText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
            <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
            <Settings className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default function GuestSuite() {
  const [venueLocation, setVenueLocation] = useState(null);
  const [weddingDate, setWeddingDate] = useState(null);

  useEffect(() => {
    loadVenueData();
  }, []);

  const loadVenueData = async () => {
    try {
      const weddingDetails = await WeddingDetails.list();
      const invitations = await Invitation.list();

      if (weddingDetails.length > 0 && weddingDetails[0].mainCeremony?.address) {
        setVenueLocation(weddingDetails[0].mainCeremony.address);
      }
      
      if (invitations.length > 0 && invitations[0].wedding_date) {
        setWeddingDate(invitations[0].wedding_date);
      }
    } catch (error) {
      console.error('Error loading venue data:', error);
    }
  };

  const getGoogleMapsUrl = () => {
    if (!venueLocation) return null;
    const encodedAddress = encodeURIComponent(venueLocation);
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddress}&zoom=15`;
  };

  const getDirectionsUrl = () => {
    if (!venueLocation) return null;
    const encodedAddress = encodeURIComponent(venueLocation);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-8 h-8 text-pink-500" />
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                Guest Suite
              </h1>
              <p className="text-xl text-gray-600">
                Your all-in-one space to create your wedding website, manage invites, and delight your guests.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Your Live Site
              </Button>
            </div>
          </div>
        </div>

        {/* Venue Location Map */}
        {venueLocation && (
          <Card className="bg-white border-gray-100 shadow-sm overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Wedding Venue Location</CardTitle>
                    <CardDescription className="text-sm">{venueLocation}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={getDirectionsUrl()} target="_blank" rel="noopener noreferrer">
                    Get Directions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <iframe
                src={getGoogleMapsUrl()}
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full"
              />
            </CardContent>
          </Card>
        )}

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            title="Wedding Website"
            description="Build a public-facing site with your story, travel details, and more."
            icon={Globe}
            actionText="View Website"
            href={createPageUrl("WeddingWebsite")}
            comingSoon={false}
          />
          <FeatureCard
            title="Digital Invitations"
            description="Design and send stunning digital invites that link to your website."
            icon={Mail}
            actionText="Manage Invites"
            href={createPageUrl("Invitations")}
            comingSoon={false}
          />
          <FeatureCard
            title="RSVP Management"
            description="Collect guest responses, meal choices, and personal messages in one place."
            icon={CheckSquare}
            actionText="View RSVPs"
            href={createPageUrl("Guests")}
            comingSoon={false}
          />
          <FeatureCard
            title="Print-Ready Designs"
            description="Generate printable versions of your invitation designs."
            icon={Printer}
            actionText="Create Printable"
            href={createPageUrl("PrintDesigner")}
            comingSoon={true}
          />
        </div>
      </div>
      <AIWeddingAssistant />
    </div>
  );
}