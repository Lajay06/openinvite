import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Palette,
  Image,
  Sparkles,
  X,
  Loader2,
  Copy,
  CheckCircle,
  Flower,
  Lightbulb,
  Heart
} from 'lucide-react';
import { InvokeLLM, GenerateImage } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function AIStylingAssistant({ isOpen, onClose, weddingDetails, theme = {} }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('colors');
  
  // Color Palettes
  const [colorParams, setColorParams] = useState({
    theme: '',
    mood: '',
    season: '',
    venue: ''
  });
  const [colorPalettes, setColorPalettes] = useState(null);
  const [copiedColor, setCopiedColor] = useState('');
  
  // Mood Boards
  const [moodBoardParams, setMoodBoardParams] = useState({
    style: '',
    colors: '',
    inspiration: ''
  });
  const [moodBoards, setMoodBoards] = useState(null);
  const [generatingImages, setGeneratingImages] = useState(false);
  
  // Decor Recommendations
  const [decorParams, setDecorParams] = useState({
    theme: '',
    budget: '',
    venue: '',
    guestCount: ''
  });
  const [decorRecommendations, setDecorRecommendations] = useState(null);
  
  // Floral & Centerpieces
  const [floralParams, setFloralParams] = useState({
    season: '',
    colors: '',
    style: '',
    budget: ''
  });
  const [floralAdvice, setFloralAdvice] = useState(null);

  const generateColorPalettes = async () => {
    setLoading(true);
    try {
      const prompt = `You are a professional wedding color palette designer. Generate 5 beautiful and harmonious color palettes for a wedding with these details:

Theme: ${colorParams.theme || 'Not specified'}
Mood/Vibe: ${colorParams.mood || 'Not specified'}
Season: ${colorParams.season || 'Not specified'}
Venue Type: ${colorParams.venue || 'Not specified'}
${theme.aesthetic?.length ? `Aesthetic: ${theme.aesthetic.join(', ')}` : ''}
${theme.season ? `Wedding Season: ${theme.season}` : ''}

For each palette, provide:
1. A creative palette name
2. 5 colors (primary, secondary, accent 1, accent 2, neutral) with hex codes
3. Description of the palette and its emotional impact
4. Where to use each color (e.g., bridesmaids dresses, flowers, decor)
5. Complementary colors or patterns that work well
6. Season/time suitability

Make the palettes diverse, creative, and wedding-appropriate.`;

      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            palettes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  colors: {
                    type: 'object',
                    properties: {
                      primary: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' } } },
                      secondary: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' } } },
                      accent1: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' } } },
                      accent2: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' } } },
                      neutral: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' } } }
                    }
                  },
                  usage: {
                    type: 'object',
                    properties: {
                      primary: { type: 'string' },
                      secondary: { type: 'string' },
                      accent1: { type: 'string' },
                      accent2: { type: 'string' },
                      neutral: { type: 'string' }
                    }
                  },
                  complementaryElements: { type: 'array', items: { type: 'string' } },
                  bestFor: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setColorPalettes(response);
      toast.success('Color palettes generated!');
    } catch (error) {
      console.error('Error generating color palettes:', error);
      toast.error('Failed to generate color palettes');
    }
    setLoading(false);
  };

  const generateMoodBoards = async () => {
    setLoading(true);
    setGeneratingImages(true);
    try {
      // First get text recommendations
      const textResponse = await InvokeLLM({
        prompt: `You are a wedding mood board expert. Create a detailed mood board concept for a wedding with these preferences:

Style: ${moodBoardParams.style || 'Not specified'}
Color Palette: ${moodBoardParams.colors || 'Not specified'}
Inspiration: ${moodBoardParams.inspiration || 'Not specified'}
${theme.aesthetic?.length ? `Aesthetic: ${theme.aesthetic.join(', ')}` : ''}

Create a comprehensive mood board including:
1. Overall aesthetic description
2. Key visual elements to include
3. Textures and materials (fabrics, florals, etc.)
4. Lighting and atmosphere suggestions
5. Color story breakdown
6. Specific decor items or details
7. 3-4 specific image prompts that would capture this aesthetic

Be detailed and specific with visual descriptions.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            overallAesthetic: { type: 'string' },
            keyElements: { type: 'array', items: { type: 'string' } },
            textures: { type: 'array', items: { type: 'string' } },
            lighting: { type: 'string' },
            colorStory: { type: 'string' },
            decorDetails: { type: 'array', items: { type: 'string' } },
            imagePrompts: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      // Generate images for mood board
      const imagePromises = textResponse.imagePrompts?.slice(0, 3).map(prompt =>
        GenerateImage({
          prompt: `Professional wedding photography, ${prompt}, elegant, high quality, beautiful lighting, wedding aesthetic, pinterest style`
        }).catch(err => {
          console.error('Image generation error:', err);
          return { url: null };
        })
      );

      const images = await Promise.all(imagePromises || []);

      setMoodBoards({
        ...textResponse,
        images: images.map(img => img.url).filter(Boolean)
      });

      toast.success('Mood board generated!');
    } catch (error) {
      console.error('Error generating mood board:', error);
      toast.error('Failed to generate mood board');
    }
    setLoading(false);
    setGeneratingImages(false);
  };

  const generateDecorRecommendations = async () => {
    setLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: `You are a wedding decor specialist. Provide comprehensive decor recommendations for a wedding with these details:

Theme/Style: ${decorParams.theme || 'Not specified'}
Budget: ${decorParams.budget || 'Flexible'}
Venue: ${decorParams.venue || 'Not specified'}
Guest Count: ${decorParams.guestCount || 'Not specified'}
${theme.aesthetic?.length ? `Aesthetic: ${theme.aesthetic.join(', ')}` : ''}
${theme.setting ? `Setting: ${theme.setting}` : ''}

Provide detailed recommendations for:
1. Ceremony decor (arch, aisle, seating)
2. Reception decor (tables, centerpieces, backdrop)
3. Lighting suggestions
4. Linens and textiles (tablecloths, napkins, runners)
5. Special touches and personal details
6. DIY opportunities to save money
7. Where to splurge vs. save
8. Specific item recommendations with estimated costs

Be practical and budget-conscious while maintaining style.`,
        response_json_schema: {
          type: 'object',
          properties: {
            ceremonyDecor: {
              type: 'object',
              properties: {
                overview: { type: 'string' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      item: { type: 'string' },
                      description: { type: 'string' },
                      estimatedCost: { type: 'string' },
                      priority: { type: 'string' }
                    }
                  }
                }
              }
            },
            receptionDecor: {
              type: 'object',
              properties: {
                overview: { type: 'string' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      item: { type: 'string' },
                      description: { type: 'string' },
                      estimatedCost: { type: 'string' },
                      priority: { type: 'string' }
                    }
                  }
                }
              }
            },
            lighting: {
              type: 'object',
              properties: {
                suggestions: { type: 'array', items: { type: 'string' } },
                costBreakdown: { type: 'string' }
              }
            },
            linensTextiles: {
              type: 'object',
              properties: {
                recommendations: { type: 'array', items: { type: 'string' } },
                colorSuggestions: { type: 'string' }
              }
            },
            specialTouches: { type: 'array', items: { type: 'string' } },
            diyOpportunities: { type: 'array', items: { type: 'string' } },
            budgetTips: {
              type: 'object',
              properties: {
                splurge: { type: 'array', items: { type: 'string' } },
                save: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      });

      setDecorRecommendations(response);
      toast.success('Decor recommendations generated!');
    } catch (error) {
      console.error('Error generating decor recommendations:', error);
      toast.error('Failed to generate recommendations');
    }
    setLoading(false);
  };

  const generateFloralAdvice = async () => {
    setLoading(true);
    try {
      const response = await InvokeLLM({
        prompt: `You are a wedding floral designer expert. Provide comprehensive floral and centerpiece advice for a wedding with these details:

Season: ${floralParams.season || theme.season || 'Not specified'}
Color Palette: ${floralParams.colors || 'Not specified'}
Style: ${floralParams.style || 'Not specified'}
Budget: ${floralParams.budget || 'Flexible'}
${theme.aesthetic?.length ? `Aesthetic: ${theme.aesthetic.join(', ')}` : ''}

Provide detailed advice on:
1. Best flowers for this season and style
2. Bridal bouquet suggestions (3 different styles)
3. Bridesmaid bouquet ideas
4. Boutonniere recommendations
5. Centerpiece concepts (3 different price points)
6. Ceremony flowers (arch, aisle, etc.)
7. Floral budget breakdown
8. DIY floral tips
9. Flowers to avoid (allergies, toxicity, cost)
10. Alternative options (dried, silk, greenery-only)

Be specific with flower names, quantities, and visual descriptions.`,
        response_json_schema: {
          type: 'object',
          properties: {
            seasonalFlowers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  priceRange: { type: 'string' },
                  availability: { type: 'string' }
                }
              }
            },
            bridalBouquets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  style: { type: 'string' },
                  description: { type: 'string' },
                  flowers: { type: 'array', items: { type: 'string' } },
                  estimatedCost: { type: 'string' },
                  bestFor: { type: 'string' }
                }
              }
            },
            bridesmaidBouquets: {
              type: 'object',
              properties: {
                suggestions: { type: 'array', items: { type: 'string' } },
                tips: { type: 'string' }
              }
            },
            boutonnieres: {
              type: 'object',
              properties: {
                suggestions: { type: 'array', items: { type: 'string' } },
                cost: { type: 'string' }
              }
            },
            centerpieces: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  pricePoint: { type: 'string' },
                  description: { type: 'string' },
                  flowers: { type: 'array', items: { type: 'string' } },
                  height: { type: 'string' },
                  estimatedCost: { type: 'string' }
                }
              }
            },
            ceremonyFlowers: { type: 'array', items: { type: 'string' } },
            budgetBreakdown: {
              type: 'object',
              properties: {
                bridal: { type: 'string' },
                bridesmaids: { type: 'string' },
                boutonnieres: { type: 'string' },
                centerpieces: { type: 'string' },
                ceremony: { type: 'string' },
                total: { type: 'string' }
              }
            },
            diyTips: { type: 'array', items: { type: 'string' } },
            flowersToAvoid: { type: 'array', items: { type: 'string' } },
            alternatives: {
              type: 'object',
              properties: {
                dried: { type: 'string' },
                silk: { type: 'string' },
                greenery: { type: 'string' }
              }
            }
          }
        }
      });

      setFloralAdvice(response);
      toast.success('Floral advice generated!');
    } catch (error) {
      console.error('Error generating floral advice:', error);
      toast.error('Failed to generate floral advice');
    }
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(text);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedColor(''), 2000);
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'must-have':
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'recommended':
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'optional':
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold">AI Styling Designer</span>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-600">
            Get AI-powered color palettes, mood boards, decor ideas, and floral recommendations
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">
              <Palette className="w-4 h-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="moodboard">
              <Image className="w-4 h-4 mr-2" />
              Mood Board
            </TabsTrigger>
            <TabsTrigger value="decor">
              <Sparkles className="w-4 h-4 mr-2" />
              Decor
            </TabsTrigger>
            <TabsTrigger value="florals">
              <Flower className="w-4 h-4 mr-2" />
              Florals
            </TabsTrigger>
          </TabsList>

          {/* Color Palettes Tab */}
          <TabsContent value="colors" className="space-y-6 mt-6">
            <Card className="border-2 border-dashed border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  Generate Color Palettes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Wedding Theme</label>
                    <Input
                      placeholder="e.g., Rustic, Modern, Vintage..."
                      value={colorParams.theme}
                      onChange={(e) => setColorParams({...colorParams, theme: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Mood/Vibe</label>
                    <Input
                      placeholder="e.g., Romantic, Elegant, Whimsical..."
                      value={colorParams.mood}
                      onChange={(e) => setColorParams({...colorParams, mood: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Season</label>
                    <Select value={colorParams.season} onValueChange={(val) => setColorParams({...colorParams, season: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select season..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="autumn">Autumn</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Venue Type</label>
                    <Input
                      placeholder="e.g., Garden, Barn, Beach, Ballroom..."
                      value={colorParams.venue}
                      onChange={(e) => setColorParams({...colorParams, venue: e.target.value})}
                    />
                  </div>
                </div>
                <Button
                  onClick={generateColorPalettes}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Palettes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Color Palettes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {colorPalettes && (
              <div className="space-y-6">
                {colorPalettes.palettes?.map((palette, idx) => (
                  <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-24 flex">
                      {Object.entries(palette.colors).map(([key, color]) => (
                        <div
                          key={key}
                          className="flex-1 cursor-pointer group relative transition-all hover:flex-[1.2]"
                          style={{ backgroundColor: color.hex }}
                          onClick={() => copyToClipboard(color.hex)}
                        >
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center">
                              <Copy className="w-5 h-5 mx-auto mb-1" />
                              <p className="text-xs font-medium">{color.hex}</p>
                            </div>
                          </div>
                          {copiedColor === color.hex && (
                            <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{palette.name}</span>
                        <Badge variant="outline">{palette.bestFor}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-700">{palette.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(palette.colors).map(([key, color]) => (
                          <div key={key} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-8 h-8 rounded-full border-2 border-gray-300"
                                style={{ backgroundColor: color.hex }}
                              />
                              <div>
                                <p className="font-semibold text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                                <p className="text-xs text-gray-600">{color.name} - {color.hex}</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 mt-2">
                              <strong>Use for:</strong> {palette.usage?.[key]}
                            </p>
                          </div>
                        ))}
                      </div>

                      {palette.complementaryElements?.length > 0 && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm font-medium text-purple-700 mb-2">Complementary Elements:</p>
                          <div className="flex flex-wrap gap-2">
                            {palette.complementaryElements.map((element, i) => (
                              <Badge key={i} variant="outline" className="bg-white">
                                {element}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Mood Board Tab */}
          <TabsContent value="moodboard" className="space-y-6 mt-6">
            <Card className="border-2 border-dashed border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-blue-500" />
                  Create Mood Board
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Wedding Style</label>
                    <Input
                      placeholder="e.g., Bohemian Garden, Modern Minimalist, Vintage Glamour..."
                      value={moodBoardParams.style}
                      onChange={(e) => setMoodBoardParams({...moodBoardParams, style: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Color Palette</label>
                    <Input
                      placeholder="e.g., Blush pink, sage green, ivory..."
                      value={moodBoardParams.colors}
                      onChange={(e) => setMoodBoardParams({...moodBoardParams, colors: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Inspiration Keywords</label>
                    <Textarea
                      placeholder="Describe what inspires you... (e.g., forest, ethereal, golden hour, wildflowers, natural textures)"
                      value={moodBoardParams.inspiration}
                      onChange={(e) => setMoodBoardParams({...moodBoardParams, inspiration: e.target.value})}
                      className="h-24"
                    />
                  </div>
                </div>
                <Button
                  onClick={generateMoodBoards}
                  disabled={loading || generatingImages}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {loading || generatingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {generatingImages ? 'Generating Images...' : 'Creating Mood Board...'}
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4 mr-2" />
                      Generate Mood Board
                    </>
                  )}
                </Button>
                {generatingImages && (
                  <p className="text-xs text-center text-gray-500">
                    This may take 30-60 seconds as we generate custom images for your mood board...
                  </p>
                )}
              </CardContent>
            </Card>

            {moodBoards && (
              <div className="space-y-6">
                <Card className="border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-2xl">{moodBoards.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Generated Images */}
                    {moodBoards.images?.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {moodBoards.images.map((img, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden shadow-lg">
                            <img src={img} alt={`Mood board inspiration ${idx + 1}`} className="w-full h-64 object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Overall Aesthetic</h4>
                      <p className="text-sm text-blue-800">{moodBoards.overallAesthetic}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Key Elements
                        </h4>
                        <ul className="space-y-1">
                          {moodBoards.keyElements?.map((element, idx) => (
                            <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                              <span className="text-purple-500 mt-0.5">•</span>
                              <span>{element}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-pink-50 rounded-lg">
                        <h4 className="font-semibold text-pink-900 mb-2">Textures & Materials</h4>
                        <ul className="space-y-1">
                          {moodBoards.textures?.map((texture, idx) => (
                            <li key={idx} className="text-sm text-pink-800 flex items-start gap-2">
                              <span className="text-pink-500 mt-0.5">•</span>
                              <span>{texture}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg">
                      <h4 className="font-semibold text-amber-900 mb-2">Lighting & Atmosphere</h4>
                      <p className="text-sm text-amber-800">{moodBoards.lighting}</p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Color Story</h4>
                      <p className="text-sm text-green-800">{moodBoards.colorStory}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Decor Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {moodBoards.decorDetails?.map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Decor Recommendations Tab */}
          <TabsContent value="decor" className="space-y-6 mt-6">
            <Card className="border-2 border-dashed border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Get Decor Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Theme/Style</label>
                    <Input
                      placeholder="e.g., Rustic Barn, Beach Boho..."
                      value={decorParams.theme}
                      onChange={(e) => setDecorParams({...decorParams, theme: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Budget Range</label>
                    <Select value={decorParams.budget} onValueChange={(val) => setDecorParams({...decorParams, budget: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-2000">Under $2,000</SelectItem>
                        <SelectItem value="2000-5000">$2,000 - $5,000</SelectItem>
                        <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                        <SelectItem value="over-10000">Over $10,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Venue Type</label>
                    <Input
                      placeholder="e.g., Outdoor garden, Indoor ballroom..."
                      value={decorParams.venue}
                      onChange={(e) => setDecorParams({...decorParams, venue: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Guest Count</label>
                    <Input
                      type="number"
                      placeholder="Number of guests..."
                      value={decorParams.guestCount}
                      onChange={(e) => setDecorParams({...decorParams, guestCount: e.target.value})}
                    />
                  </div>
                </div>
                <Button
                  onClick={generateDecorRecommendations}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Recommendations...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Get Decor Ideas
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {decorRecommendations && (
              <div className="space-y-6">
                {/* Ceremony Decor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-pink-700">
                      <Heart className="w-5 h-5" />
                      Ceremony Decor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{decorRecommendations.ceremonyDecor?.overview}</p>
                    <div className="space-y-3">
                      {decorRecommendations.ceremonyDecor?.items?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-pink-900">{item.item}</h5>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">{item.estimatedCost}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Reception Decor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                      <Sparkles className="w-5 h-5" />
                      Reception Decor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{decorRecommendations.receptionDecor?.overview}</p>
                    <div className="space-y-3">
                      {decorRecommendations.receptionDecor?.items?.map((item, idx) => (
                        <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-purple-900">{item.item}</h5>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">{item.estimatedCost}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lighting</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="space-y-2">
                        {decorRecommendations.lighting?.suggestions?.map((suggestion, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">💡</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-600 mt-3 pt-3 border-t">
                        <strong>Cost:</strong> {decorRecommendations.lighting?.costBreakdown}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Linens & Textiles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <ul className="space-y-2">
                        {decorRecommendations.linensTextiles?.recommendations?.map((rec, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-600 mt-3 pt-3 border-t">
                        <strong>Colors:</strong> {decorRecommendations.linensTextiles?.colorSuggestions}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Budget Tips */}
                <Card className="border-2 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-700">Budget Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-semibold text-green-700 mb-2">Where to Splurge</h5>
                        <ul className="space-y-1">
                          {decorRecommendations.budgetTips?.splurge?.map((item, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-green-500">💎</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-green-700 mb-2">Where to Save</h5>
                        <ul className="space-y-1">
                          {decorRecommendations.budgetTips?.save?.map((item, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span className="text-green-500">💰</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Floral & Centerpieces Tab */}
          <TabsContent value="florals" className="space-y-6 mt-6">
            <Card className="border-2 border-dashed border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flower className="w-5 h-5 text-green-500" />
                  Get Floral Advice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Season</label>
                    <Select value={floralParams.season} onValueChange={(val) => setFloralParams({...floralParams, season: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select season..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                        <SelectItem value="autumn">Autumn</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Color Palette</label>
                    <Input
                      placeholder="e.g., Blush, white, greenery..."
                      value={floralParams.colors}
                      onChange={(e) => setFloralParams({...floralParams, colors: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Style</label>
                    <Input
                      placeholder="e.g., Romantic, Wild, Structured..."
                      value={floralParams.style}
                      onChange={(e) => setFloralParams({...floralParams, style: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Budget Range</label>
                    <Select value={floralParams.budget} onValueChange={(val) => setFloralParams({...floralParams, budget: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-1000">Under $1,000</SelectItem>
                        <SelectItem value="1000-3000">$1,000 - $3,000</SelectItem>
                        <SelectItem value="3000-5000">$3,000 - $5,000</SelectItem>
                        <SelectItem value="over-5000">Over $5,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={generateFloralAdvice}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Floral Advice...
                    </>
                  ) : (
                    <>
                      <Flower className="w-4 h-4 mr-2" />
                      Get Floral Recommendations
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {floralAdvice && (
              <div className="space-y-6">
                {/* Seasonal Flowers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Flower className="w-5 h-5" />
                      Best Seasonal Flowers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {floralAdvice.seasonalFlowers?.map((flower, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <h5 className="font-semibold text-green-900">{flower.name}</h5>
                          <p className="text-sm text-gray-700 my-2">{flower.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant="outline">{flower.priceRange}</Badge>
                            <span className="text-gray-600">{flower.availability}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bridal Bouquets */}
                <Card>
                  <CardHeader>
                    <CardTitle>Bridal Bouquet Ideas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {floralAdvice.bridalBouquets?.map((bouquet, idx) => (
                        <div key={idx} className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-pink-900">{bouquet.style}</h5>
                            <Badge className="bg-pink-500">{bouquet.estimatedCost}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{bouquet.description}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {bouquet.flowers?.map((flower, i) => (
                              <Badge key={i} variant="outline" className="bg-white">
                                {flower}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-pink-700">
                            <strong>Best for:</strong> {bouquet.bestFor}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Centerpieces */}
                <Card>
                  <CardHeader>
                    <CardTitle>Centerpiece Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {floralAdvice.centerpieces?.map((centerpiece, idx) => (
                        <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-semibold text-purple-900">{centerpiece.name}</h5>
                              <Badge className="mt-1" variant="outline">{centerpiece.pricePoint}</Badge>
                            </div>
                            <Badge className="bg-purple-500">{centerpiece.estimatedCost}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{centerpiece.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <strong>Flowers:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {centerpiece.flowers?.map((flower, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {flower}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <strong>Height:</strong> {centerpiece.height}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Budget Breakdown */}
                <Card className="border-2 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-700">Floral Budget Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(floralAdvice.budgetBreakdown || {}).map(([key, value]) => (
                        <div key={key} className="p-3 bg-blue-50 rounded-lg text-center">
                          <p className="text-xs text-blue-600 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="font-bold text-blue-900">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* DIY Tips & Alternatives */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <CardTitle className="text-yellow-700 text-lg">DIY Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {floralAdvice.diyTips?.map((tip, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-700 text-lg">Flowers to Avoid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {floralAdvice.flowersToAvoid?.map((flower, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">⚠️</span>
                            <span>{flower}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}