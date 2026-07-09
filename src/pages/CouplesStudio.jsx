import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { PlusCircle, Loader2, ArrowRight, Calendar, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const EventCard = ({ event }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full"
    >
        <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
            <CardHeader className="p-0">
                 <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${event.image_url || 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800'})` }}></div>
            </CardHeader>
            <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{event.couple_names}</h3>
                <div className="text-gray-500 space-y-2 text-sm">
                    {event.wedding_date && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(event.wedding_date), 'MMMM d, yyyy')}</span>
                        </div>
                    )}
                    {event.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="bg-gray-50 p-4">
                <Link to={createPageUrl(`Dashboard?eventId=${event.id}`)} className="w-full">
                     <Button className="w-full bg-sage-500 hover:bg-sage-600 text-white group-hover:bg-pink-500 transition-colors">
                        Open Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    </motion.div>
);

const AddEventCard = () => (
     <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
    >
        <Link to={createPageUrl('PlanSelection')}>
            <Card className="border-2 border-dashed border-gray-300 hover:border-pink-500 hover:text-pink-500 transition-all duration-300 flex items-center justify-center h-full min-h-[350px]">
                <div className="text-center text-gray-500">
                    <PlusCircle className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">Start a New Event</h3>
                </div>
            </Card>
        </Link>
    </motion.div>
);


export default function CouplesStudioPage() {
    const [user, setUser] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                const userEvents = await getMyRecords('Event', '-created_date');
                setEvents(userEvents);
            } catch (error) {
                // Not logged in, redirect to home to start login flow
                window.location.href = createPageUrl('Home');
            }
            setLoading(false);
        };
        fetchUserData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 animate-spin text-sage-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-champagne-50 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-5xl font-bold text-gray-800 mb-2">Couple's Studio</h1>
                    <p className="text-xl text-gray-600">Welcome back, {user?.full_name?.split(' ')[0]}! Manage your events here.</p>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    <AnimatePresence>
                        {events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </AnimatePresence>
                    <AddEventCard />
                </div>
            </div>
        </div>
    );
}