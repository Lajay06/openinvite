
import React, { useState, useEffect } from 'react';
import { ThemeDetails } from '@/entities/ThemeDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
// Although not used directly after changes, keeping as it might be used elsewhere or for future features
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Save, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";

const vibeOptions = ["Romantic", "Modern", "Classic", "Rustic", "Boho", "Glamorous", "Vintage", "Minimalist", "Garden", "Beach"];

const religiousOptions = ["Christian", "Jewish", "Muslim", "Hindu", "Buddhist", "Sikh", "Interfaith", "Other"];

const culturalOptions = ["Indian", "Chinese", "Mexican", "Italian", "African", "Irish", "Greek", "Korean", "Japanese", "Latin American", "Middle Eastern", "Other"];

export default function ThemePage() {
    const [theme, setTheme] = useState({
        vibes: [],
        is_religious: false,
        religious_details: "",
        is_cultural: false,
        cultural_details: "",
        season: "Summer",
        setting: "Both",
        vision_description: "", // New field for general vision
    });
    const [existingTheme, setExistingTheme] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const themes = await ThemeDetails.list();
                if (themes.length > 0) {
                    // Ensure new fields are initialized if not present in existing theme
                    setTheme({
                        ...themes[0],
                        vision_description: themes[0].vision_description || "",
                    });
                    setExistingTheme(themes[0]);
                }
            } catch (error) {
                console.error("Error loading theme:", error);
            }
            setLoading(false);
        };
        loadTheme();
    }, []);

    const handleVibeChange = (vibe) => {
        setTheme(prev => {
            const newVibes = prev.vibes.includes(vibe)
                ? prev.vibes.filter(v => v !== vibe)
                : [...prev.vibes, vibe];
            return { ...prev, vibes: newVibes };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (existingTheme) {
                await ThemeDetails.update(existingTheme.id, theme);
            } else {
                const newTheme = await ThemeDetails.create(theme);
                setExistingTheme(newTheme);
            }
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
        setTimeout(() => setIsSaving(false), 1000); // Give feedback to user
    };

    if (loading) {
        return <div className="p-8">Loading your theme...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <Palette className="w-8 h-8 text-pink-500" />
                                <Sparkles className="w-6 h-6 text-purple-500" />
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
                                Wedding Theme & Vibe
                            </h1>
                            <p className="text-xl text-gray-600">
                                Define your wedding's style to get personalized AI suggestions.
                            </p>
                        </div>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-pink-500 hover:bg-pink-600 w-32">
                            {isSaving ? <Check className="w-5 h-5" /> : <><Save className="w-4 h-4 mr-2" /> Save Theme</>}
                        </Button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1 */}
                    <div className="space-y-8">
                        {/* Card: Describe Your Overall Vision */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Describe Your Overall Vision</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        placeholder="E.g., 'A whimsical garden party with rustic charm and elegant touches' or 'A sleek, modern city wedding with minimalist decor. We envision a night full of dancing and joy!'"
                                        value={theme.vision_description}
                                        onChange={(e) => setTheme({...theme, vision_description: e.target.value})}
                                        rows={5}
                                        className="min-h-[120px]"
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Card: What's the Vibe? */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>What's the Vibe?</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-3">
                                        {vibeOptions.map(vibe => (
                                            <Button
                                                key={vibe}
                                                variant={theme.vibes.includes(vibe) ? "default" : "outline"}
                                                onClick={() => handleVibeChange(vibe)}
                                                className={theme.vibes.includes(vibe) ? "bg-pink-500 hover:bg-pink-600" : ""}
                                            >
                                                {theme.vibes.includes(vibe) && <Check className="w-4 h-4 mr-2" />}
                                                {vibe}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-8">
                        {/* Card: When and Where? */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>When and Where?</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-lg font-medium mb-2 block">Season</label>
                                        <Select value={theme.season} onValueChange={(value) => setTheme({...theme, season: value})}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Spring">Spring</SelectItem>
                                                <SelectItem value="Summer">Summer</SelectItem>
                                                <SelectItem value="Autumn">Autumn</SelectItem>
                                                <SelectItem value="Winter">Winter</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-lg font-medium mb-2 block">Setting</label>
                                        <Select value={theme.setting} onValueChange={(value) => setTheme({...theme, setting: value})}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Indoor">Indoor</SelectItem>
                                                <SelectItem value="Outdoor">Outdoor</SelectItem>
                                                <SelectItem value="Both">Both</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Card: Religious & Cultural Elements */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Religious & Cultural Elements</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="is_religious" checked={theme.is_religious} onCheckedChange={(checked) => setTheme({...theme, is_religious: checked})} />
                                            <label htmlFor="is_religious" className="text-lg font-medium">Any religious elements?</label>
                                        </div>
                                        <Select
                                            value={theme.religious_details}
                                            onValueChange={(value) => setTheme({...theme, religious_details: value})}
                                            disabled={!theme.is_religious}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select religious tradition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {religiousOptions.map(option => (
                                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Checkbox id="is_cultural" checked={theme.is_cultural} onCheckedChange={(checked) => setTheme({...theme, is_cultural: checked})} />
                                            <label htmlFor="is_cultural" className="text-lg font-medium">Any cultural traditions?</label>
                                        </div>
                                        <Select
                                            value={theme.cultural_details}
                                            onValueChange={(value) => setTheme({...theme, cultural_details: value})}
                                            disabled={!theme.is_cultural}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select cultural tradition" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {culturalOptions.map(option => (
                                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>

            <AIWeddingAssistant />
        </div>
    );
}
