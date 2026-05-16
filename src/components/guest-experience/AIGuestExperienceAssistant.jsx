import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function AIGuestExperienceAssistant({ weddingLocation, weddingCity }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    interests: '',
    budget: 'moderate',
    travelStyle: 'balanced',
    dietaryRestrictions: '',
    groupSize: '2'
  });
  const [recommendations, setRecommendations] = useState(null);

  const handleGetRecommendations = async () => {
    setLoading(true);
    const toastId = toast.loading('Getting personalized recommendations...');

    try {
      const response = await InvokeLLM({
        prompt: `I'm visiting ${weddingCity || weddingLocation} for a wedding. Please provide personalized recommendations based on these preferences:
        
- Interests: ${preferences.interests || 'General sightseeing and dining'}
- Budget: ${preferences.budget}
- Travel style: ${preferences.travelStyle}
- Dietary restrictions: ${preferences.dietaryRestrictions || 'None'}
- Group size: ${preferences.groupSize} people

Please provide:
1. Top 3 restaurant recommendations with cuisine types and why they're great
2. Top 3 activities or attractions to visit
3. Local tips and insider knowledge
4. Best neighborhoods to explore

Format as a friendly, helpful guide.`,
        add_context_from_internet: true
      });

      setRecommendations(response);
      toast.success('Recommendations ready!', { id: toastId });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast.error('Failed to get recommendations', { id: toastId });
    }

    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-lg"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Get AI Recommendations
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Your Personalized Travel Guide
            </DialogTitle>
          </DialogHeader>

          {!recommendations ? (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="interests">What are you interested in?</Label>
                <Textarea
                  id="interests"
                  value={preferences.interests}
                  onChange={(e) => setPreferences({ ...preferences, interests: e.target.value })}
                  placeholder="e.g., art museums, outdoor activities, foodie experiences, nightlife..."
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget Level</Label>
                  <Select value={preferences.budget} onValueChange={(value) => setPreferences({ ...preferences, budget: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget-Friendly ($)</SelectItem>
                      <SelectItem value="moderate">Moderate ($$)</SelectItem>
                      <SelectItem value="upscale">Upscale ($$$)</SelectItem>
                      <SelectItem value="luxury">Luxury ($$$$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travelStyle">Travel Style</Label>
                  <Select value={preferences.travelStyle} onValueChange={(value) => setPreferences({ ...preferences, travelStyle: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relaxed">Relaxed & Leisurely</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="active">Active & Adventure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="groupSize">Group Size</Label>
                  <Input
                    id="groupSize"
                    type="number"
                    min="1"
                    value={preferences.groupSize}
                    onChange={(e) => setPreferences({ ...preferences, groupSize: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dietary">Dietary Restrictions</Label>
                  <Input
                    id="dietary"
                    value={preferences.dietaryRestrictions}
                    onChange={(e) => setPreferences({ ...preferences, dietaryRestrictions: e.target.value })}
                    placeholder="e.g., vegetarian, gluten-free"
                  />
                </div>
              </div>

              <Button
                onClick={handleGetRecommendations}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Your Guide...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Recommendations
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="prose max-w-none">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg whitespace-pre-wrap text-gray-800">
                  {recommendations}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setRecommendations(null);
                    setPreferences({
                      interests: '',
                      budget: 'moderate',
                      travelStyle: 'balanced',
                      dietaryRestrictions: '',
                      groupSize: '2'
                    });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Start Over
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(recommendations);
                    toast.success('Copied to clipboard!');
                  }}
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                >
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}