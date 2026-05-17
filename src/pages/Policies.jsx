import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Shield, Baby, Users, Loader2, Camera, Wifi, Gift, Sparkles, Phone, Clock } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";
import { InvokeLLM } from "@/integrations/Core";
import { base44 } from "@/api/base44Client";
const WeddingDetails = base44.entities.WeddingDetails;

export default function PoliciesPage() {
  const [details, setDetails] = useState({
    childrenPolicy: {},
    plusOnePolicy: {},
    photographyPolicy: {},
    socialMediaPolicy: {},
    giftPolicy: {},
    dresscodePolicy: {},
    unpluggedPolicy: {}
  });
  const [detailsId, setDetailsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const existingDetails = await WeddingDetails.list();
      if (existingDetails.length > 0) {
        setDetails(existingDetails[0]);
        setDetailsId(existingDetails[0].id);
      }
    } catch (error) {
      console.error("Error loading policy details:", error);
      toast.error("Failed to load details.");
    }
    setLoading(false);
  };

  const handleUpdate = (section, field, value) => {
    setDetails(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSectionSave = async (sectionKey) => {
    setIsSaving(true);
    const toastId = toast.loading(`Saving ${sectionKey}...`);
    
    try {
        let currentDetailsId = detailsId;
        if (!currentDetailsId) {
            const newDetails = await WeddingDetails.create(details);
            setDetailsId(newDetails.id);
            currentDetailsId = newDetails.id;
        } else {
            await WeddingDetails.update(currentDetailsId, { [sectionKey]: details[sectionKey] });
        }
        toast.success(`${sectionKey} saved successfully!`, { id: toastId });
    } catch (error) {
        console.error(`Error saving ${sectionKey}:`, error);
        toast.error(`Failed to save ${sectionKey}.`, { id: toastId });
    }
    setIsSaving(false);
  };

  const generateAISuggestion = async (policyType) => {
    setGeneratingAI(true);
    const toastId = toast.loading('Generating AI suggestion...');
    
    try {
      const policyDescriptions = {
        childrenPolicy: "children at the wedding (whether they're welcome, adults-only, etc.)",
        plusOnePolicy: "plus ones/guest bringing a date to the wedding",
        photographyPolicy: "photography and camera usage during the ceremony",
        socialMediaPolicy: "social media and photo sharing at the wedding",
        giftPolicy: "wedding gifts and registry preferences",
        unpluggedPolicy: "unplugged ceremony (asking guests to put away phones/cameras)"
      };

      const response = await InvokeLLM({
        prompt: `Generate a polite, warm, and clear wedding policy note about ${policyDescriptions[policyType]}. Make it friendly but clear. Keep it to 2-3 sentences. Don't include a title, just the policy text.`,
      });

      handleUpdate(policyType, 'notes', response);
      toast.success('AI suggestion generated!', { id: toastId });
    } catch (error) {
      console.error("Error generating AI suggestion:", error);
      toast.error('Failed to generate suggestion', { id: toastId });
    }
    setGeneratingAI(false);
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-white flex items-center justify-center">
              <div className="animate-pulse flex items-center gap-4 text-lg text-gray-600">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
                  Loading policies...
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <div className="p-6 lg:p-8 space-y-8">
        {/* Actions */}
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Shield className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
            {/* Children Policy */}
            <DetailsSection title="Children Policy" icon={Baby} sectionKey="childrenPolicy" onSave={handleSectionSave} isSaving={isSaving}>
                 <div>
                    <Label className="font-medium text-gray-700">Policy</Label>
                    <Select value={details.childrenPolicy?.policy} onValueChange={value => handleUpdate('childrenPolicy', 'policy', value)}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="welcome">Children Are Welcome</SelectItem>
                            <SelectItem value="adults_only">Adults-Only Celebration</SelectItem>
                            <SelectItem value="family_only">Family Children Only</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Notes" isTextarea value={details.childrenPolicy?.notes} onChange={e => handleUpdate('childrenPolicy', 'notes', e.target.value)} placeholder="e.g., 'We have arranged for a babysitter in a separate room for your convenience.' " />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generateAISuggestion('childrenPolicy')}
                    disabled={generatingAI}
                    className="mt-6 border-gray-300"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
            </DetailsSection>
            
            {/* Plus One Policy */}
            <DetailsSection title="Plus One Policy" icon={Users} sectionKey="plusOnePolicy" onSave={handleSectionSave} isSaving={isSaving}>
                 <div>
                    <Label className="font-medium text-gray-700">Policy</Label>
                    <Select value={details.plusOnePolicy?.policy} onValueChange={value => handleUpdate('plusOnePolicy', 'policy', value)}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">All Guests Welcome a +1</SelectItem>
                            <SelectItem value="named_only">+1s for Named Guests Only</SelectItem>
                            <SelectItem value="no_plus_ones">No Plus Ones</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Notes" isTextarea value={details.plusOnePolicy?.notes} onChange={e => handleUpdate('plusOnePolicy', 'notes', e.target.value)} placeholder="e.g., 'Please ensure you provide your guest's name when you RSVP.' " />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generateAISuggestion('plusOnePolicy')}
                    disabled={generatingAI}
                    className="mt-6 border-gray-300"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
            </DetailsSection>

            {/* Photography Policy */}
            <DetailsSection title="Photography Policy" icon={Camera} sectionKey="photographyPolicy" onSave={handleSectionSave} isSaving={isSaving}>
                 <div>
                    <Label className="font-medium text-gray-700">Policy</Label>
                    <Select value={details.photographyPolicy?.policy} onValueChange={value => handleUpdate('photographyPolicy', 'policy', value)}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="welcome">Photography Welcome</SelectItem>
                            <SelectItem value="ceremony_only">No Photography During Ceremony</SelectItem>
                            <SelectItem value="unplugged">Unplugged Ceremony</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Notes" isTextarea value={details.photographyPolicy?.notes} onChange={e => handleUpdate('photographyPolicy', 'notes', e.target.value)} placeholder="e.g., 'We have hired a professional photographer. Please enjoy the moment with us!'" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generateAISuggestion('photographyPolicy')}
                    disabled={generatingAI}
                    className="mt-6 border-gray-300"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
            </DetailsSection>

            {/* Social Media Policy */}
            <DetailsSection title="Social Media Policy" icon={Wifi} sectionKey="socialMediaPolicy" onSave={handleSectionSave} isSaving={isSaving}>
                 <div>
                    <Label className="font-medium text-gray-700">Policy</Label>
                    <Select value={details.socialMediaPolicy?.policy} onValueChange={value => handleUpdate('socialMediaPolicy', 'policy', value)}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="encouraged">Share Away!</SelectItem>
                            <SelectItem value="with_hashtag">Share with Our Hashtag</SelectItem>
                            <SelectItem value="after_ceremony">Share After Ceremony</SelectItem>
                            <SelectItem value="no_social">Please Don't Share</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Wedding Hashtag" value={details.socialMediaPolicy?.hashtag} onChange={e => handleUpdate('socialMediaPolicy', 'hashtag', e.target.value)} placeholder="e.g., #SmithWedding2024" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Notes" isTextarea value={details.socialMediaPolicy?.notes} onChange={e => handleUpdate('socialMediaPolicy', 'notes', e.target.value)} placeholder="e.g., 'We'd love for you to share your photos using our hashtag!'" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generateAISuggestion('socialMediaPolicy')}
                    disabled={generatingAI}
                    className="mt-6 border-gray-300"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
            </DetailsSection>

            {/* Gift Policy */}
            <DetailsSection title="Gift Policy" icon={Gift} sectionKey="giftPolicy" onSave={handleSectionSave} isSaving={isSaving}>
                 <div>
                    <Label className="font-medium text-gray-700">Policy</Label>
                    <Select value={details.giftPolicy?.policy} onValueChange={value => handleUpdate('giftPolicy', 'policy', value)}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="registry">Registry Available</SelectItem>
                            <SelectItem value="cash_preferred">Cash/Monetary Gifts Preferred</SelectItem>
                            <SelectItem value="no_gifts">No Gifts Please</SelectItem>
                            <SelectItem value="charity">Charity Donations</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Notes" isTextarea value={details.giftPolicy?.notes} onChange={e => handleUpdate('giftPolicy', 'notes', e.target.value)} placeholder="e.g., 'Your presence is the best present, but if you wish to give, our registry is available online.'" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generateAISuggestion('giftPolicy')}
                    disabled={generatingAI}
                    className="mt-6 border-gray-300"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
            </DetailsSection>

            {/* Unplugged Ceremony */}
            <DetailsSection title="Unplugged Ceremony" icon={Phone} sectionKey="unpluggedPolicy" onSave={handleSectionSave} isSaving={isSaving}>
                 <div>
                    <Label className="font-medium text-gray-700">Policy</Label>
                    <Select value={details.unpluggedPolicy?.policy} onValueChange={value => handleUpdate('unpluggedPolicy', 'policy', value)}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a policy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unplugged">Unplugged Ceremony (No Devices)</SelectItem>
                            <SelectItem value="partial">Phones Away During Ceremony</SelectItem>
                            <SelectItem value="devices_ok">Devices Welcome</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SectionInput label="Notes" isTextarea value={details.unpluggedPolicy?.notes} onChange={e => handleUpdate('unpluggedPolicy', 'notes', e.target.value)} placeholder="e.g., 'We kindly ask you to put away your phones and cameras during the ceremony so you can be fully present.'" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => generateAISuggestion('unpluggedPolicy')}
                    disabled={generatingAI}
                    className="mt-6 border-gray-300"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
            </DetailsSection>

            {/* Arrival Time Policy */}
            <DetailsSection title="Arrival & Timing" icon={Clock} sectionKey="dresscodePolicy" onSave={handleSectionSave} isSaving={isSaving}>
                <SectionInput label="Recommended Arrival Time" value={details.dresscodePolicy?.arrival} onChange={e => handleUpdate('dresscodePolicy', 'arrival', e.target.value)} placeholder="e.g., '30 minutes before ceremony start'" />
                <SectionInput label="Notes" isTextarea value={details.dresscodePolicy?.notes} onChange={e => handleUpdate('dresscodePolicy', 'notes', e.target.value)} placeholder="e.g., 'Please arrive early to allow time for parking and seating.'" />
            </DetailsSection>
        </Accordion>

      </div>
      
      <AIWeddingAssistant />
    </div>
  );
}