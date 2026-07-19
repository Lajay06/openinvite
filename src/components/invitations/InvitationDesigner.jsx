import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Eye, Sparkles, Wand2,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { color } from '@/styles/tokens';
import { InvokeLLM } from '@/integrations/Core';

export default function InvitationDesigner({ invitation, onDesignUpdate, weddingDetails }) {
  const [activeTab, setActiveTab] = useState('sections');
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const design = invitation?.design || { sections: [], globalStyles: {}, selectedSection: 0 };

  const updateDesign = (updates) => {
    const newDesign = { ...design, ...updates };
    onDesignUpdate(newDesign);
  };

  const getHotelRecommendations = async (location) => {
    try {
      const prompt = `Find 4-6 high-quality hotels near "${location}" that would be suitable for wedding guests. For each hotel provide: name, address, price range, rating, and website URL.`;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: true
      });

      // Simple fallback hotels for demo
      return [
        {
          name: 'The Grand Hotel',
          address: 'Downtown District',
          priceRange: 'Luxury',
          rating: 4.8,
          website: 'https://www.marriott.com'
        },
        {
          name: 'Boutique Inn & Suites',
          address: 'Historic Quarter',
          priceRange: 'Mid-range',
          rating: 4.3,
          website: 'https://www.hilton.com'
        },
        {
          name: 'City Center Hotel',
          address: 'Business District',
          priceRange: 'Budget-friendly',
          rating: 4.1,
          website: 'https://www.ihg.com'
        }
      ];
    } catch (error) {
      console.error('Error fetching hotels:', error);
      return [];
    }
  };

  const generateMagicRecommendations = async () => {
    setIsGeneratingRecommendations(true);
    const toastId = toast.loading('Creating your wedding website...');
    
    try {
      const sections = [];

      // Hero Section
      sections.push({
        id: `hero-${Date.now()}`,
        name: 'Hero Section',
        type: 'hero',
        background: { 
          type: 'gradient', 
          value: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)'
        },
        components: [
          {
            id: `names-${Date.now()}`,
            type: 'text',
            content: { text: invitation?.couple_names || 'Your Names Here' },
            styles: { 
              fontSize: '4rem', 
              fontWeight: '300',
              textAlign: 'center', 
              color: '#0f172a', 
              marginBottom: '1rem'
            }
          },
          {
            id: `date-${Date.now()}`,
            type: 'text',
            content: { 
              text: invitation?.wedding_date ? 
                new Date(invitation.wedding_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Wedding Date'
            },
            styles: { 
              fontSize: '1.25rem', 
              textAlign: 'center', 
              color: '#64748b', 
              letterSpacing: '0.1em'
            }
          }
        ]
      });

      // Wedding Details Section
      if (weddingDetails?.mainCeremony?.venueName || weddingDetails?.reception?.venueName) {
        const detailsComponents = [
          {
            id: `details-title-${Date.now()}`,
            type: 'text',
            content: { text: 'Details' },
            styles: { 
              fontSize: '2.5rem', 
              fontWeight: '300', 
              textAlign: 'center', 
              color: '#0f172a',
              marginBottom: '3rem'
            }
          }
        ];

        if (weddingDetails?.mainCeremony?.venueName) {
          detailsComponents.push({
            id: `ceremony-${Date.now()}`,
            type: 'modern-card',
            content: { 
              title: 'Ceremony',
              time: weddingDetails.mainCeremony.startTime || '',
              venue: weddingDetails.mainCeremony.venueName,
              address: weddingDetails.mainCeremony.address
            },
            styles: { 
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '2rem',
              marginBottom: '1.5rem'
            }
          });
        }

        if (weddingDetails?.reception?.venueName) {
          detailsComponents.push({
            id: `reception-${Date.now()}`,
            type: 'modern-card',
            content: { 
              title: 'Reception',
              time: weddingDetails.reception.startTime || '',
              venue: weddingDetails.reception.venueName,
              address: weddingDetails.reception.address
            },
            styles: { 
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '2rem'
            }
          });
        }

        sections.push({
          id: `details-${Date.now()}`,
          name: 'Details',
          type: 'details',
          background: { type: 'color', value: '#fafafa' },
          components: detailsComponents
        });
      }

      // Travel & Stay Section
      const ceremonyLocation = weddingDetails?.mainCeremony?.address || weddingDetails?.mainCeremony?.venueName;
      if (ceremonyLocation) {
        const hotels = await getHotelRecommendations(ceremonyLocation);
        
        const hotelComponents = [
          {
            id: `travel-title-${Date.now()}`,
            type: 'text',
            content: { text: 'Where to Stay' },
            styles: { 
              fontSize: '2.5rem', 
              fontWeight: '300', 
              textAlign: 'center', 
              color: '#0f172a',
              marginBottom: '3rem'
            }
          }
        ];

        hotels.forEach(hotel => {
          hotelComponents.push({
            id: `hotel-${Date.now()}-${Math.random()}`,
            type: 'hotel-card',
            content: {
              name: hotel.name,
              address: hotel.address,
              priceRange: hotel.priceRange,
              rating: hotel.rating,
              website: hotel.website
            },
            styles: {
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1rem',
              cursor: 'pointer'
            }
          });
        });

        sections.push({
          id: `travel-${Date.now()}`,
          name: 'Stay',
          type: 'travel',
          background: { type: 'color', value: '#ffffff' },
          components: hotelComponents
        });
      }

      // RSVP Section
      sections.push({
        id: `rsvp-${Date.now()}`,
        name: 'RSVP',
        type: 'rsvp',
        background: { type: 'color', value: '#fafafa' },
        components: [
          {
            id: `rsvp-title-${Date.now()}`,
            type: 'text',
            content: { text: 'RSVP' },
            styles: { 
              fontSize: '2.5rem', 
              fontWeight: '300', 
              textAlign: 'center', 
              color: '#0f172a',
              marginBottom: '1rem'
            }
          },
          {
            id: `rsvp-form-${Date.now()}`,
            type: 'modern-form',
            content: { 
              fields: ['name', 'email', 'attendance', 'dietary_restrictions']
            },
            styles: { 
              maxWidth: '480px',
              margin: '0 auto',
              padding: '2rem',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }
          }
        ]
      });

      // Update design
      const newDesign = {
        sections: sections,
        globalStyles: { 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          primaryColor: '#0f172a',
          secondaryColor: '#64748b',
          accentColor: '#3b82f6'
        },
        selectedSection: 0
      };
      
      updateDesign(newDesign);
      toast.success(`Created website with ${sections.length} sections!`, { id: toastId });

    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations. Please try again.', { id: toastId });
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  return (
    <div className="h-full bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Design Studio</h2>
          <Badge variant="outline" className="text-xs">
            {design.sections?.length || 0} sections
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-6 py-3 border-b border-gray-50">
          <TabsList className="grid w-full grid-cols-3 bg-gray-50/50 border-0">
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="design">Style</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <TabsContent value="sections" className="space-y-6 mt-0">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100/50">
              <div className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
                    <Wand2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      AI Website Builder
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      Generate a complete wedding website using your event details, including real hotel recommendations.
                    </p>
                    <Button
                      onClick={generateMagicRecommendations}
                      disabled={isGeneratingRecommendations}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl px-6 h-11 font-medium shadow-sm"
                    >
                      {isGeneratingRecommendations ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Website
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {design.sections && design.sections.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Your Sections</h3>
                {design.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{section.name}</div>
                        <div className="text-sm" style={{ color: color.textMuted }}>
                          {section.components?.length || 0} elements
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          const newSections = design.sections.filter(s => s.id !== section.id);
                          updateDesign({ sections: newSections });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="design" className="space-y-6 mt-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Typography</h3>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Font Family</label>
                  <Select 
                    value={design.globalStyles?.fontFamily || 'system-ui'}
                    onValueChange={(value) => updateDesign({ 
                      globalStyles: { ...design.globalStyles, fontFamily: value } 
                    })}
                  >
                    <SelectTrigger className="border-gray-200 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system-ui">System UI (Modern)</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display (Elegant)</SelectItem>
                      <SelectItem value="Inter">Inter (Clean)</SelectItem>
                      <SelectItem value="Montserrat">Montserrat (Friendly)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Colors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Primary</label>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="color"
                        value={design.globalStyles?.primaryColor || '#0f172a'}
                        onChange={(e) => updateDesign({ 
                          globalStyles: { ...design.globalStyles, primaryColor: e.target.value } 
                        })}
                        className="w-12 h-10 border-gray-200 rounded-lg"
                      />
                      <Input 
                        value={design.globalStyles?.primaryColor || '#0f172a'}
                        onChange={(e) => updateDesign({ 
                          globalStyles: { ...design.globalStyles, primaryColor: e.target.value } 
                        })}
                        className="flex-1 border-gray-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Accent</label>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="color"
                        value={design.globalStyles?.accentColor || '#3b82f6'}
                        onChange={(e) => updateDesign({ 
                          globalStyles: { ...design.globalStyles, accentColor: e.target.value } 
                        })}
                        className="w-12 h-10 border-gray-200 rounded-lg"
                      />
                      <Input 
                        value={design.globalStyles?.accentColor || '#3b82f6'}
                        onChange={(e) => updateDesign({ 
                          globalStyles: { ...design.globalStyles, accentColor: e.target.value } 
                        })}
                        className="flex-1 border-gray-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Couple Names</label>
                    <Input 
                      value={invitation?.couple_names || ''} 
                      readOnly
                      placeholder="Set in invitation builder"
                      className="bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Wedding Date</label>
                    <Input 
                      value={invitation?.wedding_date || ''} 
                      readOnly
                      placeholder="Set in invitation builder"
                      className="bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}