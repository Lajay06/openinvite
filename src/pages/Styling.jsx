import React, { useState, useEffect } from "react";
import { WeddingDetails } from "@/entities/WeddingDetails";
import { ThemeDetails } from "@/entities/ThemeDetails";
import { Vendor } from "@/entities/Vendor";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Plus, Palette, Flower, Sparkles, User, Camera } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

import SectionInput from "../components/event-details/SectionInput";
import DetailsSection from "../components/event-details/DetailsSection";
import AIStylingAssistant from "../components/styling/AIStylingAssistant";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const DRESS_CODES = ['Black Tie', 'Formal', 'Cocktail', 'Semi-Formal', 'Casual', 'Beach', 'Garden Party', 'Themed'];

const initialDetailsState = {
    flowers: {},
    decorations: {},
    attire: {}
};

export default function StylingPage() {
  const [details, setDetails] = useState(initialDetailsState);
  const [detailsId, setDetailsId] = useState(null);
  const [themeDetails, setThemeDetails] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAIStylingAssistant, setShowAIStylingAssistant] = useState(false);
  const [activeTab, setActiveTab] = useState("attire");
  
  const [isCustomDressCode, setIsCustomDressCode] = useState(false);
  
  useEffect(() => {
    if (details.attire?.dressCode && !DRESS_CODES.includes(details.attire.dressCode)) {
      setIsCustomDressCode(true);
    } else {
      setIsCustomDressCode(false);
    }
  }, [details.attire?.dressCode]);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [existingDetails, themeData, vendorData] = await Promise.all([
        WeddingDetails.list(),
        ThemeDetails.list(),
        Vendor.list()
      ]);

      if (existingDetails.length > 0) {
        setDetails(existingDetails[0]);
        setDetailsId(existingDetails[0].id);
      }

      if (themeData.length > 0) {
        setThemeDetails(themeData[0]);
      }

      setVendors(vendorData);
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
  
  const handleDressCodeSelect = (value) => {
      if (value === 'Other') {
          setIsCustomDressCode(true);
          handleUpdate('attire', 'dressCode', '');
      } else {
          setIsCustomDressCode(false);
          handleUpdate('attire', 'dressCode', value);
      }
  };

  const handleVendorSelect = (section, vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      // Store vendor ID and name for reference
      handleUpdate(section, 'vendorId', vendorId);
      handleUpdate(section, 'vendorName', vendor.name);
    }
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

  // Filter vendors by category
  const floristVendors = vendors.filter(v => v.category === 'flowers');
  const decorationVendors = vendors.filter(v => v.category === 'decorations');

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-lg w-96"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster />
      <DashboardPageHeader title="Styling" subtitle="Attire, flowers and decorations for your big day" />

      <div style={{ padding: '32px 32px 48px' }}>
        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <button
            onClick={() => setShowAIStylingAssistant(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#0A1930', color: '#fff', border: 'none',
              borderRadius: 999, padding: '10px 20px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <Brain className="w-4 h-4" /> AI designer
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-[rgba(10,10,10,0.08)] h-12 rounded-none px-0 w-full justify-start">
            <TabsTrigger
              value="attire"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-3 px-4 text-[rgba(10,10,10,0.5)]"
            >
              Attire
            </TabsTrigger>
            <TabsTrigger
              value="flowers"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-3 px-4 text-[rgba(10,10,10,0.5)]"
            >
              Flowers
            </TabsTrigger>
            <TabsTrigger
              value="decorations"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-3 px-4 text-[rgba(10,10,10,0.5)]"
            >
              Decorations
            </TabsTrigger>
          </TabsList>

          {/* Attire Tab */}
          <TabsContent value="attire" className="mt-8">
            <Accordion type="multiple" defaultValue={["dress-code"]} className="w-full space-y-4">
              <DetailsSection title="Dress Code" icon={Palette} sectionKey="dress-code" onSave={() => handleSectionSave('attire')} isSaving={isSaving}>
                <div>
                  <Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', marginBottom: 6, display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Dress Code</Label>
                  <Select
                    value={isCustomDressCode ? 'Other' : details.attire?.dressCode}
                    onValueChange={handleDressCodeSelect}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select a dress code" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRESS_CODES.map(code => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                      <SelectItem value="Other">Other (Please specify)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isCustomDressCode && (
                  <div>
                    <Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', marginBottom: 6, display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Custom Dress Code</Label>
                    <Input
                      value={details.attire?.dressCode}
                      onChange={(e) => handleUpdate('attire', 'dressCode', e.target.value)}
                      placeholder="e.g., Tropical Formal, Whimsical Garden"
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                <SectionInput 
                  label="Attire Notes" 
                  isTextarea 
                  value={details.attire?.notes} 
                  onChange={e => handleUpdate('attire', 'notes', e.target.value)} 
                  placeholder="e.g., 'The ceremony is on grass, so consider footwear.'" 
                />
              </DetailsSection>
            </Accordion>
          </TabsContent>

          {/* Flowers Tab */}
          <TabsContent value="flowers" className="mt-8">
            <Accordion type="multiple" defaultValue={["florist"]} className="w-full space-y-4">
              <DetailsSection title="Florist" icon={User} sectionKey="florist" onSave={() => handleSectionSave('flowers')} isSaving={isSaving}>
                <div>
                  <Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', marginBottom: 6, display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Florist</Label>
                  {floristVendors.length > 0 ? (
                    <div className="flex gap-2">
                      <Select
                        value={details.flowers?.vendorId || ''}
                        onValueChange={(value) => handleVendorSelect('flowers', value)}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="Select a florist from your vendors" />
                        </SelectTrigger>
                        <SelectContent>
                          {floristVendors.map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Link to={createPageUrl('Vendors')}>
                        <Button variant="outline" size="icon" className="border-[rgba(10,10,10,0.15)] h-9 w-9">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={details.flowers?.florist || ''}
                        onChange={e => handleUpdate('flowers', 'florist', e.target.value)}
                        placeholder="Florist name and contact"
                        className="flex-1 h-9 text-sm"
                      />
                      <Link to={createPageUrl('Vendors')}>
                        <Button variant="outline" size="icon" className="border-[rgba(10,10,10,0.15)] h-9 w-9">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                  {floristVendors.length === 0 && (
                    <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No florist vendors added yet. Click + to add one.</p>
                  )}
                </div>
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
            <Accordion type="multiple" defaultValue={["decorator"]} className="w-full space-y-4">
              <DetailsSection title="Decorator / Designer" icon={User} sectionKey="decorator" onSave={() => handleSectionSave('decorations')} isSaving={isSaving}>
                <div>
                  <Label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', marginBottom: 6, display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Decorator / Designer</Label>
                  {decorationVendors.length > 0 ? (
                    <div className="flex gap-2">
                      <Select
                        value={details.decorations?.vendorId || ''}
                        onValueChange={(value) => handleVendorSelect('decorations', value)}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="Select a decorator from your vendors" />
                        </SelectTrigger>
                        <SelectContent>
                          {decorationVendors.map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Link to={createPageUrl('Vendors')}>
                        <Button variant="outline" size="icon" className="border-[rgba(10,10,10,0.15)] h-9 w-9">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={details.decorations?.decorator || ''}
                        onChange={e => handleUpdate('decorations', 'decorator', e.target.value)}
                        placeholder="Decorator name and contact"
                        className="flex-1 h-9 text-sm"
                      />
                      <Link to={createPageUrl('Vendors')}>
                        <Button variant="outline" size="icon" className="border-[rgba(10,10,10,0.15)] h-9 w-9">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                  {decorationVendors.length === 0 && (
                    <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No decoration vendors added yet. Click + to add one.</p>
                  )}
                </div>
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

      {/* AI Styling Assistant Modal */}
      <AIStylingAssistant 
        isOpen={showAIStylingAssistant}
        onClose={() => setShowAIStylingAssistant(false)}
        weddingDetails={details}
        themeDetails={themeDetails}
      />

    </div>
  );
}