import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Gift, Shirt } from 'lucide-react';

export const DetailsPreview = ({ invitation, weddingDetails, globalStyles }) => {
    const detailItems = [
        {
            icon: Calendar,
            title: 'Main Ceremony',
            time: weddingDetails?.mainCeremony?.startTime || '4:00 PM',
            location: weddingDetails?.mainCeremony?.venueName || 'St. Mary\'s Chapel',
            address: weddingDetails?.mainCeremony?.address || '123 Church Lane, Happytown, USA'
        },
        {
            icon: Clock,
            title: 'Reception',
            time: weddingDetails?.reception?.startTime || '6:00 PM',
            location: weddingDetails?.reception?.venueName || 'The Grand Ballroom',
            address: weddingDetails?.reception?.address || '456 Celebration Ave, Happytown, USA'
        },
        {
            icon: Shirt,
            title: 'Attire',
            time: 'Dress Code',
            location: weddingDetails?.attire?.dressCode || 'Formal Attire',
            address: 'Please dress to impress!'
        },
        {
            icon: Gift,
            title: 'Gifts',
            time: 'Registry',
            location: 'Your presence is the only gift we need!',
            address: 'However, if you wish to give a gift, we are registered at...'
        },
    ];

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-full" style={{ fontFamily: globalStyles?.fontFamily }}>
        <h2 className="text-3xl font-bold text-center mb-8" style={{fontFamily: 'Playfair Display, serif'}}>Event Details</h2>
        <div className="space-y-6">
            {detailItems.map((item, index) => (
                <Card key={index} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center gap-4 bg-gray-100 p-4">
                        <div className="p-3 bg-pink-100 rounded-lg">
                            <item.icon className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <p className="text-sm text-gray-500">{item.time}</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <p className="font-semibold">{item.location}</p>
                        <p className="text-sm text-gray-600">{item.address}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
};

export default DetailsPreview;