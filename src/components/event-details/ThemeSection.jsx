import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Save } from 'lucide-react';

const vibeOptions = ["Romantic", "Modern", "Classic", "Rustic", "Boho", "Glamorous", "Vintage", "Minimalist", "Garden", "Beach"];
const religiousOptions = ["Christian", "Jewish", "Muslim", "Hindu", "Buddhist", "Sikh", "Interfaith", "Other"];
const culturalOptions = ["Indian", "Chinese", "Mexican", "Italian", "African", "Irish", "Greek", "Korean", "Japanese", "Latin American", "Middle Eastern", "Other"];

export default function ThemeSection({ theme, onThemeChange, onSave }) {
    if (!theme) return null;

    const handleVibeChange = (vibe) => {
        const newVibes = theme.vibes.includes(vibe)
            ? theme.vibes.filter(v => v !== vibe)
            : [...(theme.vibes || []), vibe];
        onThemeChange('vibes', newVibes);
    };

    return (
        <div className="space-y-8">
            {/* Vibe Selection */}
            <div>
                <h3 className="text-lg font-medium mb-4 text-gray-800">What's the vibe?</h3>
                <div className="flex flex-wrap gap-3">
                    {vibeOptions.map(vibe => (
                        <Button
                            key={vibe}
                            variant={(theme.vibes || []).includes(vibe) ? "default" : "outline"}
                            onClick={() => handleVibeChange(vibe)}
                            className={(theme.vibes || []).includes(vibe) ? "bg-gray-900 hover:bg-gray-800" : ""}
                        >
                            {(theme.vibes || []).includes(vibe) && <Check className="w-4 h-4 mr-2" />}
                            {vibe}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Season & Setting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-lg font-medium mb-2 block text-gray-800">Season</label>
                    <Select value={theme.season} onValueChange={(value) => onThemeChange('season', value)}>
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
                    <label className="text-lg font-medium mb-2 block text-gray-800">Setting</label>
                    <Select value={theme.setting} onValueChange={(value) => onThemeChange('setting', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Indoor">Indoor</SelectItem>
                            <SelectItem value="Outdoor">Outdoor</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Religious & Cultural Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Checkbox id="is_religious" checked={theme.is_religious} onCheckedChange={(checked) => onThemeChange('is_religious', checked)} />
                        <label htmlFor="is_religious" className="text-lg font-medium">Any religious elements?</label>
                    </div>
                    <Select
                        value={theme.religious_details}
                        onValueChange={(value) => onThemeChange('religious_details', value)}
                        disabled={!theme.is_religious}
                    >
                        <SelectTrigger><SelectValue placeholder="Select religious tradition" /></SelectTrigger>
                        <SelectContent>
                            {religiousOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Checkbox id="is_cultural" checked={theme.is_cultural} onCheckedChange={(checked) => onThemeChange('is_cultural', checked)} />
                        <label htmlFor="is_cultural" className="text-lg font-medium">Any cultural traditions?</label>
                    </div>
                    <Select
                        value={theme.cultural_details}
                        onValueChange={(value) => onThemeChange('cultural_details', value)}
                        disabled={!theme.is_cultural}
                    >
                        <SelectTrigger><SelectValue placeholder="Select cultural tradition" /></SelectTrigger>
                        <SelectContent>
                            {culturalOptions.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button 
                    onClick={onSave}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Theme
                </Button>
            </div>
        </div>
    );
}