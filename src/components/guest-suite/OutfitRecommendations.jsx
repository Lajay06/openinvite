import React from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
    Shirt, 
    Heart, 
    Sparkles,
    Crown,
    Footprints,
    Gem,
    Star,
    RefreshCw
} from 'lucide-react';

const OutfitRecommendations = ({ recommendations, theme, onRetake }) => {
    // Safely extract theme information with proper defaults
    const safeRecommendations = {
        theme: {
            vibes: Array.isArray(recommendations?.theme?.vibes) ? recommendations.theme.vibes : ['romantic', 'elegant'],
            season: recommendations?.theme?.season || 'Summer',
            setting: recommendations?.theme?.setting || 'Both'
        },
        style: recommendations?.style || 'classic',
        budget: recommendations?.budget || 'moderate',
        gender: recommendations?.gender || 'feminine',
        mainOutfit: Array.isArray(recommendations?.mainOutfit) ? recommendations.mainOutfit : ['Elegant dress', 'Comfortable shoes'],
        colors: Array.isArray(recommendations?.colors) ? recommendations.colors : ['Dusty Rose', 'Navy', 'Sage'],
        tips: Array.isArray(recommendations?.tips) ? recommendations.tips : ['Choose comfort', 'Bring layers']
    };

    const themeVibes = safeRecommendations.theme.vibes.join(', ');

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className={`w-8 h-8 ${theme.text}`} />
                    <Crown className={`w-6 h-6 ${theme.text}`} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Your Perfect Wedding Guest Look</h2>
                <p className="text-gray-600 mb-4">
                    Curated specifically for a {themeVibes} {safeRecommendations.theme.season.toLowerCase()} wedding
                </p>
                <Button
                    variant="outline"
                    onClick={onRetake}
                    className="text-sm"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake Survey
                </Button>
            </div>

            <Accordion type="multiple" defaultValue={["overview", "outfit"]} className="w-full">
                <AccordionItem value="overview">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                            <Star className={`w-5 h-5 ${theme.text}`} />
                            Style Overview
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold mb-2">Your Style Profile</h4>
                                <p className="text-gray-700">
                                    {safeRecommendations.style.charAt(0).toUpperCase() + safeRecommendations.style.slice(1)} style with {safeRecommendations.budget} budget range
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {safeRecommendations.colors.map((color, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                                        <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                                        <span className="text-sm font-medium">{color}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="outfit">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                            <Shirt className={`w-5 h-5 ${theme.text}`} />
                            Main Outfit
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-3">
                            {safeRecommendations.mainOutfit.map((item, index) => (
                                <div key={index} className="p-3 bg-white rounded border">
                                    <p className="font-medium">{item}</p>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="shoes">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                            <Footprints className={`w-5 h-5 ${theme.text}`} />
                            Footwear
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-3">
                            <div className="p-3 bg-white rounded border">
                                <p className="font-medium">Block Heels (2-3 inches)</p>
                                <p className="text-sm text-gray-600">Comfortable for dancing and walking</p>
                            </div>
                            <div className="p-3 bg-white rounded border">
                                <p className="font-medium">Elegant Flats</p>
                                <p className="text-sm text-gray-600">Stylish backup option</p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="accessories">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                            <Gem className={`w-5 h-5 ${theme.text}`} />
                            Accessories
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-3">
                            <div className="p-3 bg-white rounded border">
                                <p className="font-medium">Delicate Jewelry</p>
                                <p className="text-sm text-gray-600">Simple earrings and necklace</p>
                            </div>
                            <div className="p-3 bg-white rounded border">
                                <p className="font-medium">Small Clutch</p>
                                <p className="text-sm text-gray-600">For essentials during the ceremony</p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tips">
                    <AccordionTrigger className="text-lg font-semibold">
                        <div className="flex items-center gap-2">
                            <Heart className={`w-5 h-5 ${theme.text}`} />
                            Pro Tips
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-2">
                            {safeRecommendations.tips.map((tip, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <div className={`w-2 h-2 rounded-full ${theme.bg} mt-2 flex-shrink-0`}></div>
                                    <p className="text-gray-700">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

export default OutfitRecommendations;