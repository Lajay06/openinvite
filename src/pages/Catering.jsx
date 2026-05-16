import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion } from "@/components/ui/accordion";
import { UtensilsCrossed, Plus, ChefHat, Coffee, Wine, Cake } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast';

import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";
import VendorSearch from "../components/vendors/VendorSearch";
import SectionInput from "../components/event-details/SectionInput";
import DetailsSection from "../components/event-details/DetailsSection";
import { base44 } from "@/api/base44Client";
const Vendor = base44.entities.Vendor;
const WeddingDetails = base44.entities.WeddingDetails;

export default function CateringPage() {
  const [caterers, setCaterers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCaterer, setEditingCaterer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("planning");
  const [searchTerm, setSearchTerm] = useState("");

  // State for WeddingDetails
  const [details, setDetails] = useState({ foodAndBeverage: {} });
  const [detailsId, setDetailsId] = useState(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allVendors, detailsData] = await Promise.all([
        Vendor.list('-created_date'),
        WeddingDetails.list().catch(() => [])
      ]);
      
      const cateringVendors = allVendors.filter(v => v.category === 'catering');
      setCaterers(cateringVendors);
      
      if (detailsData.length > 0) {
        setDetails(detailsData[0]);
        setDetailsId(detailsData[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  const handleDetailsUpdate = (field, value) => {
    setDetails(prev => ({
      ...prev,
      foodAndBeverage: {
        ...prev.foodAndBeverage,
        [field]: value,
      },
    }));
  };

  const handleVendorSelect = (vendorId) => {
    const vendor = caterers.find(v => v.id === vendorId);
    if (vendor) {
      handleDetailsUpdate('vendorId', vendorId);
      handleDetailsUpdate('caterer', vendor.name);
      handleDetailsUpdate('cateringContact', vendor.contact_person);
      handleDetailsUpdate('cateringPhone', vendor.phone);
      handleDetailsUpdate('cateringEmail', vendor.email);
    }
  };

  const handleDetailsSave = async () => {
    setIsSavingDetails(true);
    const toastId = toast.loading('Saving catering details...');
    try {
        if (!detailsId) {
            const newDetails = await WeddingDetails.create({ foodAndBeverage: details.foodAndBeverage });
            setDetailsId(newDetails.id);
        } else {
            await WeddingDetails.update(detailsId, { foodAndBeverage: details.foodAndBeverage });
        }
        toast.success('Catering details saved!', { id: toastId });
    } catch (error) {
        console.error('Error saving catering details:', error);
        toast.error('Failed to save catering details.', { id: toastId });
    }
    setIsSavingDetails(false);
  };

  const handleSubmit = async (vendorData) => {
    const toastId = toast.loading(editingCaterer ? 'Updating...' : 'Adding...');
    try {
      const cateringData = { ...vendorData, category: 'catering' };
      if (editingCaterer) {
        await Vendor.update(editingCaterer.id, cateringData);
        toast.success('Caterer updated!', { id: toastId });
      } else {
        await Vendor.create(cateringData);
        toast.success('Caterer added!', { id: toastId });
      }
      setShowForm(false);
      setEditingCaterer(null);
      loadData();
    } catch (error) {
      console.error("Error saving caterer:", error);
      toast.error('Failed to save caterer', { id: toastId });
    }
  };

  const handleEdit = (caterer) => {
    setEditingCaterer(caterer);
    setShowForm(true);
  };

  const handleDelete = async (catererId) => {
    if (!window.confirm("Are you sure you want to delete this caterer?")) return;
    
    const toastId = toast.loading('Deleting...');
    try {
      await Vendor.delete(catererId);
      toast.success('Caterer deleted', { id: toastId });
      loadData();
    } catch (error) {
      console.error("Error deleting caterer:", error);
      toast.error('Failed to delete caterer', { id: toastId });
    }
  };

  const handleAddFromSearch = async (searchResult) => {
    const toastId = toast.loading('Adding caterer...');
    try {
      const vendorData = {
        name: searchResult.name,
        category: 'catering',
        address: searchResult.address,
        phone: searchResult.phone,
        website: searchResult.website,
        latitude: searchResult.latitude,
        longitude: searchResult.longitude,
        google_place_id: searchResult.place_id,
        rating: searchResult.rating,
        google_reviews_count: searchResult.user_ratings_total,
        image_url: searchResult.photo_url,
        price_range: searchResult.price_level ? '$'.repeat(searchResult.price_level) : '$$',
        status: "researching"
      };
      
      await Vendor.create(vendorData);
      toast.success('Caterer added!', { id: toastId });
      loadData();
      setActiveTab("planning");
    } catch (error) {
      console.error("Error adding caterer from search:", error);
      toast.error('Failed to add caterer', { id: toastId });
    }
  };

  const filteredCaterers = caterers.filter(caterer => {
    const matchesSearch = caterer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caterer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = React.useMemo(() => {
    const total = caterers.length;
    const bookedCount = caterers.filter(c => c.status === 'booked').length;
    const quotedCount = caterers.filter(c => c.status === 'quoted').length;
    const totalSpent = caterers
      .filter(c => c.status === 'booked' && c.quoted_price)
      .reduce((sum, c) => sum + (c.quoted_price || 0), 0);

    return { total, bookedCount, quotedCount, totalSpent };
  }, [caterers]);

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
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header - Clean Spotify Style */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              Food & Beverage
            </h1>
            <p className="text-gray-500 text-base">
              Plan your catering, menu, and beverage services
            </p>
          </div>
          <Button 
            onClick={() => {
              setEditingCaterer(null);
              setShowForm(true);
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Caterer
          </Button>
        </div>

        {/* Stats - Minimal Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Total Caterers</div>
            <div className="text-4xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Booked</div>
            <div className="text-4xl font-bold text-green-600">{stats.bookedCount}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Quoted</div>
            <div className="text-4xl font-bold text-yellow-600">{stats.quotedCount}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Total Spent</div>
            <div className="text-4xl font-bold text-gray-900">
              {stats.totalSpent > 0 ? `$${(stats.totalSpent / 1000).toFixed(0)}k` : '$0'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-gray-200 h-12 rounded-none px-0 w-full justify-start">
            <TabsTrigger 
              value="planning" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4"
            >
              Catering Planning
            </TabsTrigger>
            <TabsTrigger 
              value="find-caterers" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4"
            >
              Find Caterers
            </TabsTrigger>
          </TabsList>

          {/* Planning Tab */}
          <TabsContent value="planning" className="mt-8">
            <Accordion type="multiple" defaultValue={["caterer"]} className="w-full space-y-4">
              {/* Caterer Section */}
              <DetailsSection title="Caterer / Venue" icon={ChefHat} sectionKey="caterer" onSave={handleDetailsSave} isSaving={isSavingDetails}>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block">Select Caterer</Label>
                  {caterers.length > 0 ? (
                    <div className="flex gap-2">
                      <Select
                        value={details.foodAndBeverage?.vendorId || ''}
                        onValueChange={handleVendorSelect}
                      >
                        <SelectTrigger className="border-gray-300 flex-1 h-9 text-sm">
                          <SelectValue placeholder="Select from your caterers" />
                        </SelectTrigger>
                        <SelectContent>
                          {caterers.map(vendor => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Link to={createPageUrl('Vendors')}>
                        <Button variant="outline" size="icon" className="border-gray-300 h-9 w-9">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={details.foodAndBeverage?.caterer || ''}
                        onChange={e => handleDetailsUpdate('caterer', e.target.value)}
                        placeholder="Caterer name"
                        className="border-gray-300 flex-1 h-9 text-sm"
                      />
                      <Link to={createPageUrl('Vendors')}>
                        <Button variant="outline" size="icon" className="border-gray-300 h-9 w-9">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                  {caterers.length === 0 && (
                    <p className="text-xs text-gray-500 mt-2">No catering vendors added yet. Click + to add one.</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <SectionInput 
                    label="Contact Person" 
                    value={details.foodAndBeverage?.cateringContact} 
                    onChange={e => handleDetailsUpdate('cateringContact', e.target.value)} 
                    placeholder="Contact name" 
                  />
                  <SectionInput 
                    label="Phone" 
                    value={details.foodAndBeverage?.cateringPhone} 
                    onChange={e => handleDetailsUpdate('cateringPhone', e.target.value)} 
                    placeholder="Phone number" 
                  />
                </div>
                <SectionInput 
                  label="Email" 
                  type="email"
                  value={details.foodAndBeverage?.cateringEmail} 
                  onChange={e => handleDetailsUpdate('cateringEmail', e.target.value)} 
                  placeholder="Email address" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-2 block">Service Style</Label>
                    <Select 
                      value={details.foodAndBeverage?.serviceStyle || ''} 
                      onValueChange={value => handleDetailsUpdate('serviceStyle', value)}
                    >
                      <SelectTrigger className="h-9 text-sm border-gray-300">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buffet">Buffet</SelectItem>
                        <SelectItem value="plated">Plated</SelectItem>
                        <SelectItem value="family_style">Family Style</SelectItem>
                        <SelectItem value="stations">Food Stations</SelectItem>
                        <SelectItem value="cocktail">Cocktail Reception</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <SectionInput 
                    label="Guest Count" 
                    type="number"
                    value={details.foodAndBeverage?.guestCount} 
                    onChange={e => handleDetailsUpdate('guestCount', e.target.value)} 
                    placeholder="Number of guests" 
                  />
                </div>
              </DetailsSection>

              {/* Menu Section */}
              <DetailsSection title="Menu & Dishes" icon={UtensilsCrossed} sectionKey="menu" onSave={handleDetailsSave} isSaving={isSavingDetails}>
                <SectionInput 
                  label="Menu Items" 
                  isTextarea 
                  value={details.foodAndBeverage?.menuItems?.map(item => `${item.name}: ${item.description}`).join('\n') || ''} 
                  onChange={e => {
                    const items = e.target.value.split('\n').map(line => {
                      const [name, description] = line.split(':').map(s => s.trim());
                      return { name: name || '', description: description || '' };
                    }).filter(item => item.name);
                    handleDetailsUpdate('menuItems', items);
                  }}
                  placeholder="Enter menu items, one per line. Format: Dish Name: Description"
                />
                <SectionInput 
                  label="Dietary Options" 
                  isTextarea 
                  value={details.foodAndBeverage?.dietaryOptions?.join(', ') || ''} 
                  onChange={e => handleDetailsUpdate('dietaryOptions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                  placeholder="Vegetarian, Vegan, Gluten-Free, etc. (comma separated)" 
                />
              </DetailsSection>

              {/* Bar & Beverages */}
              <DetailsSection title="Bar & Beverages" icon={Wine} sectionKey="bar" onSave={handleDetailsSave} isSaving={isSavingDetails}>
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block">Bar Type</Label>
                  <Select 
                    value={details.foodAndBeverage?.barType || ''} 
                    onValueChange={value => handleDetailsUpdate('barType', value)}
                  >
                    <SelectTrigger className="h-9 text-sm border-gray-300">
                      <SelectValue placeholder="Select bar type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open_bar">Open Bar</SelectItem>
                      <SelectItem value="cash_bar">Cash Bar</SelectItem>
                      <SelectItem value="limited_bar">Limited Bar</SelectItem>
                      <SelectItem value="beer_wine_only">Beer & Wine Only</SelectItem>
                      <SelectItem value="signature_cocktails">Signature Cocktails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SectionInput 
                  label="Cocktail Menu" 
                  isTextarea 
                  value={details.foodAndBeverage?.cocktailItems?.map(item => `${item.name}: ${item.description}`).join('\n') || ''} 
                  onChange={e => {
                    const items = e.target.value.split('\n').map(line => {
                      const [name, description] = line.split(':').map(s => s.trim());
                      return { name: name || '', description: description || '' };
                    }).filter(item => item.name);
                    handleDetailsUpdate('cocktailItems', items);
                  }}
                  placeholder="Signature cocktails, one per line. Format: Cocktail Name: Description"
                />
                <SectionInput 
                  label="Bar Notes" 
                  isTextarea 
                  value={details.foodAndBeverage?.barNotes} 
                  onChange={e => handleDetailsUpdate('barNotes', e.target.value)} 
                  placeholder="Bar preferences, restrictions, special requests" 
                />
              </DetailsSection>

              {/* Dessert & Cake */}
              <DetailsSection title="Dessert & Cake" icon={Cake} sectionKey="dessert" onSave={handleDetailsSave} isSaving={isSavingDetails}>
                <SectionInput 
                  label="Wedding Cake" 
                  isTextarea 
                  value={details.foodAndBeverage?.cake} 
                  onChange={e => handleDetailsUpdate('cake', e.target.value)} 
                  placeholder="Cake flavors, tiers, design details" 
                />
                <SectionInput 
                  label="Additional Desserts" 
                  isTextarea 
                  value={details.foodAndBeverage?.desserts} 
                  onChange={e => handleDetailsUpdate('desserts', e.target.value)} 
                  placeholder="Other dessert options (cookies, pastries, dessert bar, etc.)" 
                />
              </DetailsSection>

              {/* Coffee & Late Night */}
              <DetailsSection title="Coffee & Late Night" icon={Coffee} sectionKey="latenight" onSave={handleDetailsSave} isSaving={isSavingDetails}>
                <SectionInput 
                  label="Coffee Service" 
                  isTextarea 
                  value={details.foodAndBeverage?.coffee} 
                  onChange={e => handleDetailsUpdate('coffee', e.target.value)} 
                  placeholder="Coffee bar, espresso, specialty drinks" 
                />
                <SectionInput 
                  label="Late Night Snacks" 
                  isTextarea 
                  value={details.foodAndBeverage?.lateNightSnacks} 
                  onChange={e => handleDetailsUpdate('lateNightSnacks', e.target.value)} 
                  placeholder="Pizza, sliders, donuts, or other late-night food" 
                />
              </DetailsSection>
            </Accordion>
          </TabsContent>

          {/* Find Caterers Tab */}
          <TabsContent value="find-caterers" className="mt-8">
            <VendorSearch 
              onAddVendor={handleAddFromSearch}
              category="catering"
              searchPrompt="caterers, restaurants, food service providers"
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <AIWeddingAssistant />
    </div>
  );
}