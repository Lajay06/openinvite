
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Heart, 
    MapPin, 
    Utensils, 
    Shirt, 
    Gift, 
    Baby, 
    Car, 
    Hotel, 
    Phone, 
    MessageCircle, 
    Check,
    Users,
    Home,
    Info,
    PartyPopper,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// Import the new detailed components
import OutfitSurvey from './OutfitSurvey';
import OutfitRecommendations from './OutfitRecommendations';


const themeColors = {
    pink: {
        gradient: 'from-pink-500 to-rose-500',
        text: 'text-pink-500',
        bg: 'bg-pink-500',
        ring: 'ring-pink-500',
    },
    purple: {
        gradient: 'from-purple-500 to-indigo-500',
        text: 'text-purple-500',
        bg: 'bg-purple-500',
        ring: 'ring-purple-500',
    },
    blue: {
        gradient: 'from-blue-500 to-cyan-500',
        text: 'text-blue-500',
        bg: 'bg-blue-500',
        ring: 'ring-blue-500',
    },
    green: {
        gradient: 'from-green-500 to-emerald-500',
        text: 'text-green-500',
        bg: 'bg-green-500',
        ring: 'ring-green-500',
    },
    gold: {
        gradient: 'from-yellow-500 to-orange-500',
        text: 'text-yellow-500',
        bg: 'bg-yellow-500',
        ring: 'ring-yellow-500',
    },
    sage: {
        gradient: 'from-green-400 to-teal-500',
        text: 'text-teal-500',
        bg: 'bg-teal-500',
        ring: 'ring-teal-500',
    }
};

const getSectionIcon = (section) => {
    const icons = {
        ceremony: MapPin,
        reception: Utensils,
        attire: Shirt,
        transportation: Car,
        accommodation: Hotel,
        gifts: Gift,
        childrenPolicy: Baby,
        plusOnePolicy: Users,
        contact: Phone,
        preWeddingEvents: PartyPopper,
        postWeddingEvents: PartyPopper
    };
    return icons[section] || MapPin;
};

const getSectionTitle = (section) => {
    const titles = {
        ceremony: 'Ceremony',
        reception: 'Reception',
        attire: 'Attire',
        transportation: 'Transportation',
        accommodation: 'Accommodation',
        gifts: 'Gifts & Registry',
        childrenPolicy: 'Children',
        plusOnePolicy: 'Plus Ones',
        contact: 'Contact',
        preWeddingEvents: 'Pre-Wedding Events',
        postWeddingEvents: 'Post-Wedding Events'
    };
    return titles[section] || section;
};


const HomeView = ({ settings, invitation, setActiveView, theme }) => (
    <div className="text-center p-6 space-y-8">
        <div>
            <Heart className={`w-10 h-10 mx-auto mb-4 ${theme.text}`} />
            <h1 className="text-3xl font-bold mb-1">
                {invitation?.couple_names || 'Sarah & Michael'}
            </h1>
            <p className="text-lg text-gray-500">
                {invitation?.wedding_date ? format(new Date(invitation.wedding_date), 'MMMM d, yyyy') : 'June 15, 2024'}
            </p>
        </div>
        <p className="text-gray-600 leading-relaxed text-lg">
            {settings.welcome_message}
        </p>
        <div className="space-y-4">
             <Button
                onClick={() => setActiveView('rsvp')}
                className={`w-full bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white shadow-lg`}
            >
                <Check className="w-5 h-5 mr-2" />
                RSVP Now
            </Button>
            <p className="text-sm text-gray-500">
                Please respond by {invitation?.rsvp_deadline ? format(new Date(invitation.rsvp_deadline), 'MMMM d, yyyy') : 'May 15, 2024'}
            </p>
        </div>
    </div>
);

const DetailsView = ({ settings, weddingDetails, theme }) => {
    const [activeInfoTab, setActiveInfoTab] = useState('mainEvents');

    const renderSectionList = (sectionKeys) => {
        if (!sectionKeys || sectionKeys.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>No details have been added for this section yet.</p>
                </div>
            );
        }
        
        const visibleSections = sectionKeys.filter(section => {
            // Map the key from settings to the key in weddingDetails
            const detailKey = section === 'contact' ? 'contactPerson' : section;
            return settings.enabled_sections[section] && weddingDetails?.[detailKey] && Object.values(weddingDetails[detailKey]).some(val => val);
        });

        if (visibleSections.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <p>No details have been added for this section yet.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {visibleSections.map(section => {
                    const IconComponent = getSectionIcon(section);
                    // Map the key from settings to the key in weddingDetails
                    const detailKey = section === 'contact' ? 'contactPerson' : section;
                    const sectionData = weddingDetails[detailKey];
                    return (
                        <div key={section} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <IconComponent className={`w-6 h-6 ${theme.text}`} />
                                <h4 className="font-semibold text-xl text-gray-900">
                                    {getSectionTitle(section)}
                                </h4>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600 pl-9">
                                {section === 'ceremony' && (
                                    <>
                                        {sectionData.venueName && (<p><strong>Venue:</strong> {sectionData.venueName}</p>)}
                                        {sectionData.address && (<p><strong>Address:</strong> {sectionData.address}</p>)}
                                        {sectionData.startTime && (<p><strong>Time:</strong> {sectionData.startTime}</p>)}
                                    </>
                                )}
                                {section === 'reception' && (
                                    <>
                                        {sectionData.venueName && (<p><strong>Venue:</strong> {sectionData.venueName}</p>)}
                                        {sectionData.address && (<p><strong>Address:</strong> {sectionData.address}</p>)}
                                        {sectionData.startTime && (<p><strong>Time:</strong> {sectionData.startTime}</p>)}
                                    </>
                                )}
                                {section === 'attire' && (
                                    <>
                                        {sectionData.dressCode && (<p><strong>Dress Code:</strong> {sectionData.dressCode}</p>)}
                                        {sectionData.notes && (<p>{sectionData.notes}</p>)}
                                    </>
                                )}
                                {section === 'transportation' && (
                                    <>
                                        {sectionData.guestTransportInfo && (<p>{sectionData.guestTransportInfo}</p>)}
                                        {sectionData.parkingInfo && (<p><strong>Parking:</strong> {sectionData.parkingInfo}</p>)}
                                    </>
                                )}
                                {section === 'accommodation' && (
                                    <>
                                        {sectionData.hotelBlocks && (<p>{sectionData.hotelBlocks}</p>)}
                                        {sectionData.bookingInfo && (<p><strong>Booking:</strong> {sectionData.bookingInfo}</p>)}
                                    </>
                                )}
                                {section === 'gifts' && (
                                    <>
                                        {sectionData.registryUrl && (<p><strong>Registry:</strong> <a href={sectionData.registryUrl} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">View Registry</a></p>)}
                                        {sectionData.notes && (<p>{sectionData.notes}</p>)}
                                    </>
                                )}
                                {section === 'contact' && (
                                    <>
                                        {sectionData.name && (<p><strong>Contact:</strong> {sectionData.name}</p>)}
                                        {sectionData.phone && (<p><strong>Phone:</strong> {sectionData.phone}</p>)}
                                        {sectionData.email && (<p><strong>Email:</strong> <a href={`mailto:${sectionData.email}`} className="text-blue-600 underline">{sectionData.email}</a></p>)}
                                    </>
                                )}
                                {(section === 'childrenPolicy' || section === 'plusOnePolicy') && sectionData.policy && (
                                    <>
                                        <p><strong>Policy:</strong> {sectionData.policy.replace(/_/g, ' ')}</p>
                                        {sectionData.notes && (<p className="mt-1 text-xs text-gray-500">{sectionData.notes}</p>)}
                                    </>
                                )}
                                {section === 'preWeddingEvents' && (
                                    <>
                                        {sectionData.engagementParty && (<p><strong>Engagement Party:</strong> {sectionData.engagementParty}</p>)}
                                        {sectionData.welcomeParty && (<p><strong>Welcome Party:</strong> {sectionData.welcomeParty}</p>)}
                                        {sectionData.bachelorsParty && (<p><strong>Bachelor's Party:</strong> {sectionData.bachelorsParty}</p>)}
                                        {sectionData.bachelorettesParty && (<p><strong>Bachelorette's Party:</strong> {sectionData.bachelorettesParty}</p>)}
                                        {sectionData.bridalShower && (<p><strong>Bridal Shower:</strong> {sectionData.bridalShower}</p>)}
                                        {sectionData.notes && (<p className="mt-1 text-xs text-gray-500">{sectionData.notes}</p>)}
                                    </>
                                )}
                                {section === 'postWeddingEvents' && (
                                     <>
                                        {sectionData.afterParty && (<p><strong>After Party:</strong> {sectionData.afterParty}</p>)}
                                        {sectionData.brunch && (<p><strong>Next-Day Brunch:</strong> {sectionData.brunch}</p>)}
                                        {sectionData.farewell && (<p><strong>Farewell Event:</strong> {sectionData.farewell}</p>)}
                                        {sectionData.notes && (<p className="mt-1 text-xs text-gray-500">{sectionData.notes}</p>)}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold text-center">Event Information</h2>

            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                    onClick={() => setActiveInfoTab('mainEvents')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeInfoTab === 'mainEvents' ? `bg-white shadow ${theme.text}` : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Main Events
                </button>
                <button
                    onClick={() => setActiveInfoTab('additionalInfo')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeInfoTab === 'additionalInfo' ? `bg-white shadow ${theme.text}` : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Additional Details
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeInfoTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeInfoTab === 'mainEvents' && renderSectionList(settings.main_event_order)}
                    {activeInfoTab === 'additionalInfo' && renderSectionList(settings.additional_info_order)}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const RsvpView = ({ settings, rsvpData, setRsvpData, handleRsvpSubmit, theme }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        setIsSubmitting(true);
        handleRsvpSubmit(e);
        // In a real app, you'd wait for submission to finish. Here we simulate it.
        setTimeout(() => setIsSubmitting(false), 1500);
    }
    
    return (
    <div className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6">RSVP</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                <Input placeholder="Your full name" value={rsvpData.name} onChange={(e) => setRsvpData(prev => ({ ...prev, name: e.target.value }))} required />
                <Input type="email" placeholder="Email address" value={rsvpData.email} onChange={(e) => setRsvpData(prev => ({ ...prev, email: e.target.value }))} required />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2"> Will you be attending? </label>
                <Select value={rsvpData.rsvp_status} onValueChange={(value) => setRsvpData(prev => ({ ...prev, rsvp_status: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select your response" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="attending">✓ Joyfully Accept</SelectItem>
                        <SelectItem value="declined">✗ Regretfully Decline</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {rsvpData.rsvp_status === 'attending' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                    {settings.meal_options.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2"> Meal Preference </label>
                            <Select value={rsvpData.meal_choice} onValueChange={(value) => setRsvpData(prev => ({ ...prev, meal_choice: value }))}>
                                <SelectTrigger><SelectValue placeholder="Select your meal" /></SelectTrigger>
                                <SelectContent>
                                    {settings.meal_options.map((option, index) => (
                                        <SelectItem key={index} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {settings.dietary_restrictions_enabled && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2"> Dietary Restrictions </label>
                            <Input placeholder="Any dietary restrictions or allergies?" value={rsvpData.dietary_restrictions} onChange={(e) => setRsvpData(prev => ({ ...prev, dietary_restrictions: e.target.value }))} />
                        </div>
                    )}

                    {settings.plus_one_enabled && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="plus_one" checked={rsvpData.plus_one} onCheckedChange={(checked) => setRsvpData(prev => ({ ...prev, plus_one: checked }))} />
                                <label htmlFor="plus_one" className="text-sm font-medium"> I'll be bringing a plus one </label>
                            </div>

                            {rsvpData.plus_one && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pl-6">
                                    <Input placeholder="Plus one's name" value={rsvpData.plus_one_name} onChange={(e) => setRsvpData(prev => ({ ...prev, plus_one_name: e.target.value }))} />
                                    {settings.meal_options.length > 0 && (
                                        <Select value={rsvpData.plus_one_meal} onValueChange={(value) => setRsvpData(prev => ({ ...prev, plus_one_meal: value }))}>
                                            <SelectTrigger><SelectValue placeholder="Plus one's meal" /></SelectTrigger>
                                            <SelectContent>
                                                {settings.meal_options.map((option, index) => (
                                                    <SelectItem key={index} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}
                </motion.div>
            )}

            <Button type="submit" className={`w-full bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white shadow-lg`} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
            </Button>
        </form>
    </div>
)};

const MessageView = ({ rsvpData, setRsvpData, handleMessageSubmit, theme }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e) => {
        setIsSubmitting(true);
        handleMessageSubmit(e);
        setTimeout(() => setIsSubmitting(false), 1500);
    }

    return (
    <div className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Send a Message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
                placeholder="Share your excitement, ask a question, or send your well wishes..."
                value={rsvpData.message}
                onChange={(e) => setRsvpData(prev => ({ ...prev, message: e.target.value }))}
                className="h-32"
                required
            />
            <Button type="submit" className={`w-full bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white shadow-lg`} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
        </form>
    </div>
)};

const InspoView = ({ theme, weddingTheme }) => {
    const [showOutfitSurvey, setShowOutfitSurvey] = useState(false);
    const [outfitRecommendations, setOutfitRecommendations] = useState(null);

    const handleOutfitComplete = (recommendations) => {
        setOutfitRecommendations(recommendations);
        setShowOutfitSurvey(false);
    };

    const handleRetakeSurvey = () => {
        setOutfitRecommendations(null);
        setShowOutfitSurvey(true);
    };

    if (showOutfitSurvey) {
        return (
            <OutfitSurvey
                theme={theme}
                weddingTheme={weddingTheme}
                onComplete={handleOutfitComplete}
            />
        );
    }

    if (outfitRecommendations) {
        return (
            <OutfitRecommendations
                recommendations={outfitRecommendations}
                theme={theme}
                onRetake={handleRetakeSurvey}
            />
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <Sparkles className={`w-10 h-10 mx-auto mb-4 ${theme.text}`} />
                <h2 className="text-2xl font-bold mb-2">Wedding Inspiration</h2>
                <p className="text-gray-600 mb-6">
                    Get personalized recommendations for our special day
                </p>
            </div>

            <div className="space-y-4">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowOutfitSurvey(true)}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                                <Shirt className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">Complete Style Guide</h3>
                                <p className="text-gray-600 text-sm">Get detailed outfit recommendations including dresses, shoes, accessories, and styling tips based on our wedding theme</p>
                            </div>
                            <div className="text-pink-500">
                                <Sparkles className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gray-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                                <Heart className="w-6 h-6 text-gray-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1 text-gray-500">More Coming Soon!</h3>
                                <p className="text-gray-500 text-sm">We're adding more inspiration features</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};


export default function GuestPortalPreview({ settings, weddingDetails, invitation, weddingTheme }) {
    const [activeView, setActiveView] = useState('home');
    const [rsvpData, setRsvpData] = useState({
        name: '',
        email: '',
        rsvp_status: '',
        meal_choice: '',
        dietary_restrictions: '',
        plus_one: false,
        plus_one_name: '',
        plus_one_meal: '',
        message: ''
    });

    const handleRsvpSubmit = (e) => {
        e.preventDefault();
        alert('RSVP submitted successfully!');
        // In a real app, you might navigate away or show a success message
    };

    const handleMessageSubmit = (e) => {
        e.preventDefault();
        alert('Message sent successfully!');
        setRsvpData(prev => ({ ...prev, message: '' }));
    };

    const theme = themeColors[settings.theme_color] || themeColors.pink;

    const renderView = () => {
        switch (activeView) {
            case 'home':
                return <HomeView settings={settings} invitation={invitation} setActiveView={setActiveView} theme={theme} />;
            case 'details':
                return <DetailsView settings={settings} weddingDetails={weddingDetails} theme={theme} />;
            case 'rsvp':
                return <RsvpView settings={settings} rsvpData={rsvpData} setRsvpData={setRsvpData} handleRsvpSubmit={handleRsvpSubmit} theme={theme} />;
            case 'message':
                return <MessageView rsvpData={rsvpData} setRsvpData={setRsvpData} handleMessageSubmit={handleMessageSubmit} theme={theme} />;
            case 'inspo':
                return <InspoView theme={theme} weddingTheme={weddingTheme} />;
            default:
                return <HomeView settings={settings} invitation={invitation} setActiveView={setActiveView} theme={theme} />;
        }
    };

    const menuItems = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'details', icon: Info, label: 'Info' },
        { id: 'rsvp', icon: Check, label: 'RSVP' },
    ];
    if (settings.messaging_enabled) {
        menuItems.push({ id: 'message', icon: MessageCircle, label: 'Message' });
    }
    // Always add inspo for now
    menuItems.push({ id: 'inspo', icon: Sparkles, label: 'Inspo' });

    return (
        <div className="max-w-md mx-auto">
            <Card className="bg-white shadow-lg border-0 overflow-hidden flex flex-col h-[700px]">
                <div className="flex-grow overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderView()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom Navigation */}
                <div className={`border-t border-gray-200 bg-white grid grid-cols-${menuItems.length}`}>
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`flex flex-col items-center justify-center p-3 text-gray-500 transition-colors duration-200 ${activeView === item.id ? theme.text : 'hover:bg-gray-100'}`}
                        >
                            <item.icon className={`w-6 h-6 mb-1 ${activeView === item.id ? theme.text : ''}`} />
                            <span className={`text-xs font-medium ${activeView === item.id ? theme.text : ''}`}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}
