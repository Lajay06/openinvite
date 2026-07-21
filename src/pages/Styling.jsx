import React, { useState, useEffect } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Flower, Sparkles, User, Camera } from "lucide-react";
import toast from 'react-hot-toast';

import SectionInput from "../components/event-details/SectionInput";
import DetailsSection from "../components/event-details/DetailsSection";
import VendorContactSection from "../components/vendors/VendorContactSection";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import AttirePanel from '../components/styling/AttirePanel';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
const WeddingDetails = base44.entities.WeddingDetails;

// Dress code is now managed per-event in Event Details → Venue tab.

const initialDetailsState = {
    flowers: {},
    decorations: {},
    attire: {}
};

export default function StylingPage() {
  const [details, setDetails] = useState(initialDetailsState);
  const [detailsId, setDetailsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
const [activeTab, setActiveTab] = useState("attire");

  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const myDetails = await getMyWeddingDetails();

      if (myDetails) {
        setDetails(myDetails);
        setDetailsId(myDetails.id);
      }
    } catch (error) {
      console.error("Error loading styling details:", error);
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        <div style={{ height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)' }} />
        <div style={{ background: '#F5F5F5', height: 44 }} />
        <div style={{ padding: '32px 32px 48px' }}>
          {[120, 80, 80, 60].map((w, i) => (
            <div key={i} style={{ height: 16, width: `${w}%`, background: 'rgba(10,10,10,0.06)', marginBottom: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Styling" subtitle="Attire, flowers and decorations for your big day" />

      {/* Ava button */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to help with your wedding style" onClick={() => setAvaOpen(true)} />
      </div>

      <div style={{ padding: '32px 32px 48px' }}>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-[rgba(10,10,10,0.08)] h-12 rounded-none px-0 w-full justify-start">
            <TabsTrigger
              value="attire"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-3 px-4"
            >
              Attire
            </TabsTrigger>
            <TabsTrigger
              value="flowers"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-3 px-4"
            >
              Flowers
            </TabsTrigger>
            <TabsTrigger
              value="decorations"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-3 px-4"
            >
              Decorations
            </TabsTrigger>
          </TabsList>

          {/* Attire Tab */}
          <TabsContent value="attire" className="mt-8">
            <AttirePanel />
          </TabsContent>

          {/* Flowers Tab */}
          <TabsContent value="flowers" className="mt-8">
            <Accordion type="multiple" className="w-full space-y-4">
              <DetailsSection title="Florist" icon={User} sectionKey="florist" onSave={() => handleSectionSave('flowers')} isSaving={isSaving}>
                <VendorContactSection
                  category="flowers"
                  vendorId={details.flowers?.vendorId}
                  onVendorIdChange={id => handleUpdate('flowers', 'vendorId', id)}
                />
              </DetailsSection>

              <DetailsSection title="Bouquets & Personal Flowers" icon={Flower} sectionKey="bouquets" onSave={() => handleSectionSave('flowers')} isSaving={isSaving}>
                <SectionInput 
                  label="Bridal Bouquet" 
                  isTextarea 
                  value={details.flowers?.bouquet} 
                  onChange={e => handleUpdate('flowers', 'bouquet', e.target.value)} 
                  placeholder="Describe the bridal bouquet style, flowers, colors" 
                />
                
                <SectionInput 
                  label="Bridesmaids Bouquets" 
                  isTextarea 
                  value={details.flowers?.bridesmaidBouquets} 
                  onChange={e => handleUpdate('flowers', 'bridesmaidBouquets', e.target.value)} 
                  placeholder="Bridesmaid bouquet details" 
                />
                
                <SectionInput 
                  label="Boutonnieres" 
                  value={details.flowers?.boutonnieres} 
                  onChange={e => handleUpdate('flowers', 'boutonnieres', e.target.value)} 
                  placeholder="Groom and groomsmen boutonniere details" 
                />
              </DetailsSection>

              <DetailsSection title="Ceremony Flowers" icon={Flower} sectionKey="ceremony-flowers" onSave={() => handleSectionSave('flowers')} isSaving={isSaving}>
                <SectionInput 
                  label="Ceremony Flowers" 
                  isTextarea 
                  value={details.flowers?.ceremony} 
                  onChange={e => handleUpdate('flowers', 'ceremony', e.target.value)} 
                  placeholder="Altar arrangements, aisle petals, arch decorations" 
                />
              </DetailsSection>

              <DetailsSection title="Reception Flowers" icon={Flower} sectionKey="reception-flowers" onSave={() => handleSectionSave('flowers')} isSaving={isSaving}>
                <SectionInput 
                  label="Reception Centerpieces" 
                  isTextarea 
                  value={details.flowers?.centerpieces} 
                  onChange={e => handleUpdate('flowers', 'centerpieces', e.target.value)} 
                  placeholder="Centerpiece design, height, style" 
                />
                
                <SectionInput 
                  label="Additional Floral Elements" 
                  isTextarea 
                  value={details.flowers?.additional} 
                  onChange={e => handleUpdate('flowers', 'additional', e.target.value)} 
                  placeholder="Corsages, flower girls, additional arrangements" 
                />
                
                <SectionInput 
                  label="Notes" 
                  isTextarea 
                  value={details.flowers?.notes} 
                  onChange={e => handleUpdate('flowers', 'notes', e.target.value)} 
                  placeholder="Special requests, allergies, delivery instructions" 
                />
              </DetailsSection>
            </Accordion>
          </TabsContent>

          {/* Decorations Tab */}
          <TabsContent value="decorations" className="mt-8">
            <Accordion type="multiple" className="w-full space-y-4">
              <DetailsSection title="Decorator / Designer" icon={User} sectionKey="decorator" onSave={() => handleSectionSave('decorations')} isSaving={isSaving}>
                <VendorContactSection
                  category="decorations"
                  vendorId={details.decorations?.vendorId}
                  onVendorIdChange={id => handleUpdate('decorations', 'vendorId', id)}
                />
              </DetailsSection>

              <DetailsSection title="Theme & Colors" icon={Palette} sectionKey="theme-colors" onSave={() => handleSectionSave('decorations')} isSaving={isSaving}>
                <SectionInput 
                  label="Overall Theme" 
                  value={details.decorations?.theme} 
                  onChange={e => handleUpdate('decorations', 'theme', e.target.value)} 
                  placeholder="e.g., Rustic Garden, Modern Minimalist, Vintage Romance" 
                />
                
                <SectionInput 
                  label="Color Scheme" 
                  value={details.decorations?.colorScheme} 
                  onChange={e => handleUpdate('decorations', 'colorScheme', e.target.value)} 
                  placeholder="Primary and accent colors" 
                />
                
                <SectionInput 
                  label="Lighting" 
                  isTextarea 
                  value={details.decorations?.lighting} 
                  onChange={e => handleUpdate('decorations', 'lighting', e.target.value)} 
                  placeholder="String lights, candles, uplighting, chandeliers" 
                />
                
                <SectionInput 
                  label="Linens & Textiles" 
                  isTextarea 
                  value={details.decorations?.linens} 
                  onChange={e => handleUpdate('decorations', 'linens', e.target.value)} 
                  placeholder="Tablecloth colors, napkins, chair covers, runners" 
                />
              </DetailsSection>

              <DetailsSection title="Ceremony Decorations" icon={Camera} sectionKey="ceremony-decor" onSave={() => handleSectionSave('decorations')} isSaving={isSaving}>
                <SectionInput 
                  label="Ceremony Decorations" 
                  isTextarea 
                  value={details.decorations?.ceremonyDecorations} 
                  onChange={e => handleUpdate('decorations', 'ceremonyDecorations', e.target.value)} 
                  placeholder="Arch, aisle runners, signage, seating decorations" 
                />
              </DetailsSection>

              <DetailsSection title="Reception Decorations" icon={Sparkles} sectionKey="reception-decor" onSave={() => handleSectionSave('decorations')} isSaving={isSaving}>
                <SectionInput 
                  label="Reception Decorations" 
                  isTextarea 
                  value={details.decorations?.receptionDecorations} 
                  onChange={e => handleUpdate('decorations', 'receptionDecorations', e.target.value)} 
                  placeholder="Table settings, lounge areas, photo backdrops" 
                />
                
                <SectionInput 
                  label="Special Elements" 
                  isTextarea 
                  value={details.decorations?.specialElements} 
                  onChange={e => handleUpdate('decorations', 'specialElements', e.target.value)} 
                  placeholder="Photo booth props, welcome signs, unity candles, etc." 
                />
                
                <SectionInput 
                  label="Notes" 
                  isTextarea 
                  value={details.decorations?.notes} 
                  onChange={e => handleUpdate('decorations', 'notes', e.target.value)} 
                  placeholder="Setup instructions, vendor coordination notes" 
                />
              </DetailsSection>
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Style and fashion advisor"
        systemPrompt="You are Ava, a wedding style and fashion advisor. Help with attire, flowers, colour palettes and decorations."
        quickActions={["Suggest a colour palette", "What flowers are in season?", "Help me describe my wedding style", "Bridal party outfit ideas"]}
      />
    </div>
  );
}