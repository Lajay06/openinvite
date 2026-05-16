import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MessageCircle, Copy, Send, Loader2, RefreshCw, HelpCircle } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function AIGuestResponseAssistant({ isOpen, onClose, weddingDetails }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState('');
  
  const [customQuery, setCustomQuery] = useState({
    question: '',
    tone: 'friendly',
    includeDetails: true
  });

  const commonQuestions = [
    {
      category: 'Parking & Transportation',
      questions: [
        { q: 'Where can I park?', key: 'parking' },
        { q: 'Is there valet parking available?', key: 'valet' },
        { q: 'How do I get to the venue?', key: 'directions' },
        { q: 'Is there a shuttle service?', key: 'shuttle' }
      ]
    },
    {
      category: 'Dress Code & Attire',
      questions: [
        { q: 'What should I wear?', key: 'dress_code' },
        { q: 'Is it a formal wedding?', key: 'formality' },
        { q: 'Can I wear black to the wedding?', key: 'colors' },
        { q: 'What about shoes for outdoor ceremony?', key: 'outdoor_attire' }
      ]
    },
    {
      category: 'Accommodation',
      questions: [
        { q: 'Where should I stay?', key: 'hotels' },
        { q: 'Are there hotel blocks?', key: 'hotel_blocks' },
        { q: 'What hotels are near the venue?', key: 'nearby_hotels' },
        { q: 'Is there accommodation information?', key: 'accommodation_info' }
      ]
    },
    {
      category: 'Schedule & Timing',
      questions: [
        { q: 'What time should I arrive?', key: 'arrival_time' },
        { q: 'How long will the wedding last?', key: 'duration' },
        { q: 'Is there a reception after?', key: 'reception_timing' },
        { q: 'When does dancing start?', key: 'dancing_time' }
      ]
    },
    {
      category: 'Food & Dietary',
      questions: [
        { q: 'Will there be vegetarian options?', key: 'dietary' },
        { q: 'Is the bar open or cash?', key: 'bar' },
        { q: 'What kind of food will be served?', key: 'food_type' },
        { q: 'I have food allergies, what should I do?', key: 'allergies' }
      ]
    },
    {
      category: 'Plus Ones & Children',
      questions: [
        { q: 'Can I bring a plus one?', key: 'plus_one' },
        { q: 'Are children invited?', key: 'children' },
        { q: 'Is it adults only?', key: 'adults_only' },
        { q: 'Can I bring my kids?', key: 'kids_allowed' }
      ]
    }
  ];

  const handleGenerateTemplate = async (question, category) => {
    setLoading(true);
    const toastId = toast.loading('Generating response...');

    try {
      const contextInfo = `
Wedding Details Context:
${weddingDetails?.mainCeremony?.venueName ? `Ceremony Venue: ${weddingDetails.mainCeremony.venueName}` : ''}
${weddingDetails?.mainCeremony?.address ? `Ceremony Address: ${weddingDetails.mainCeremony.address}` : ''}
${weddingDetails?.mainCeremony?.startTime ? `Ceremony Time: ${weddingDetails.mainCeremony.startTime}` : ''}
${weddingDetails?.reception?.venueName ? `Reception Venue: ${weddingDetails.reception.venueName}` : ''}
${weddingDetails?.reception?.address ? `Reception Address: ${weddingDetails.reception.address}` : ''}
${weddingDetails?.contactPerson?.name ? `Contact Person: ${weddingDetails.contactPerson.name}` : ''}
${weddingDetails?.contactPerson?.phone ? `Contact Phone: ${weddingDetails.contactPerson.phone}` : ''}
      `.trim();

      const prompt = `You are a helpful wedding coordinator responding to a guest inquiry. 

Guest Question: "${question}"
Category: ${category}

${contextInfo ? `Available Information:\n${contextInfo}` : ''}

Write a friendly, informative response to the guest's question. The response should:
1. Be warm and welcoming
2. Directly answer their question
3. Include specific details from the wedding information if available
4. Offer to help with any additional questions
5. Keep it concise but complete (2-3 paragraphs max)

If specific information is not available, politely acknowledge this and provide general guidance or suggest they contact the wedding coordinator.

Write the response:`;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setGeneratedResponse(response);
      setActiveTab('preview');
      toast.success('Response generated!', { id: toastId });
    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate response. Please try again.', { id: toastId });
    }

    setLoading(false);
  };

  const handleGenerateCustom = async () => {
    if (!customQuery.question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Generating custom response...');

    try {
      const contextInfo = `
Wedding Details:
${weddingDetails?.mainCeremony?.venueName ? `Ceremony: ${weddingDetails.mainCeremony.venueName}` : ''}
${weddingDetails?.mainCeremony?.startTime ? `Time: ${weddingDetails.mainCeremony.startTime}` : ''}
${weddingDetails?.reception?.venueName ? `Reception: ${weddingDetails.reception.venueName}` : ''}
${weddingDetails?.contactPerson?.name ? `Contact: ${weddingDetails.contactPerson.name} - ${weddingDetails.contactPerson.phone}` : ''}
      `.trim();

      const toneInstructions = {
        friendly: 'warm, friendly, and conversational',
        formal: 'professional and formal',
        casual: 'relaxed and casual',
        enthusiastic: 'excited and enthusiastic'
      };

      const prompt = `You are responding to a guest inquiry about a wedding.

Guest Question: "${customQuery.question}"

Tone: Write in a ${toneInstructions[customQuery.tone]} tone.

${customQuery.includeDetails && contextInfo ? `Wedding Information:\n${contextInfo}\n` : ''}

Write a helpful response that:
1. Addresses their specific question
2. ${customQuery.includeDetails ? 'Includes relevant details from the wedding information' : 'Provides general guidance'}
3. Is ${toneInstructions[customQuery.tone]}
4. Offers additional assistance if needed
5. Is concise but thorough

Response:`;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setGeneratedResponse(response);
      setActiveTab('preview');
      toast.success('Custom response generated!', { id: toastId });
    } catch (error) {
      console.error('Error generating custom response:', error);
      toast.error('Failed to generate response. Please try again.', { id: toastId });
    }

    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResponse);
    toast.success('Response copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-purple-500" />
            AI Guest Response Assistant
          </DialogTitle>
          <p className="text-gray-600">Generate helpful responses to common guest questions</p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Common Questions
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Custom Question
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedResponse} className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Generated Response
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6 mt-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  💡 Click on any question below to generate a personalized response based on your wedding details.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {commonQuestions.map((category, catIndex) => (
                <Card key={catIndex}>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">{category.category}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.questions.map((item, qIndex) => (
                        <Button
                          key={qIndex}
                          variant="outline"
                          className="justify-start h-auto py-3 px-4 text-left hover:bg-purple-50 hover:border-purple-300"
                          onClick={() => handleGenerateTemplate(item.q, category.category)}
                          disabled={loading}
                        >
                          <div className="flex items-start gap-2 w-full">
                            <HelpCircle className="w-4 h-4 mt-1 flex-shrink-0 text-purple-500" />
                            <span className="text-sm">{item.q}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Custom Tab */}
          <TabsContent value="custom" className="space-y-6 mt-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Guest Question</Label>
                  <Textarea
                    value={customQuery.question}
                    onChange={(e) => setCustomQuery({ ...customQuery, question: e.target.value })}
                    placeholder="Enter the guest's question here..."
                    className="h-32"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Response Tone</Label>
                    <Select value={customQuery.tone} onValueChange={(value) => setCustomQuery({ ...customQuery, tone: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly & Warm</SelectItem>
                        <SelectItem value="formal">Professional & Formal</SelectItem>
                        <SelectItem value="casual">Casual & Relaxed</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic & Excited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-8">
                    <input
                      type="checkbox"
                      id="includeDetails"
                      checked={customQuery.includeDetails}
                      onChange={(e) => setCustomQuery({ ...customQuery, includeDetails: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="includeDetails" className="cursor-pointer">Include wedding details in response</Label>
                  </div>
                </div>

                <Button onClick={handleGenerateCustom} disabled={loading} className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Response...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Response
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6 mt-6">
            {generatedResponse && (
              <>
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-6">
                    <Label className="text-sm text-gray-600 mb-2 block">Generated Response:</Label>
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {generatedResponse}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button onClick={handleCopy} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Response
                  </Button>
                  <Button onClick={() => setActiveTab('templates')} variant="outline" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Another
                  </Button>
                  <Button onClick={onClose} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Send className="w-4 h-4 mr-2" />
                    Done
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}