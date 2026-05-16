import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Clock, Calendar, Plus, Trash2, Copy, Send, Loader2, Download } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

export default function AITimelineGenerator({ isOpen, onClose, weddingDetails, onApply }) {
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  const [generatedTimeline, setGeneratedTimeline] = useState(null);
  
  const [timelineConfig, setTimelineConfig] = useState({
    weddingDate: weddingDetails?.mainCeremony?.startTime || '',
    ceremonyStart: '14:00',
    ceremonyDuration: 30,
    cocktailHourDuration: 60,
    receptionStart: '18:00',
    dinnerDuration: 90,
    firstDanceTiming: 'after_dinner',
    speechesTiming: 'during_dinner',
    cuttingCakeTiming: 'after_dinner',
    lastSongTime: '23:00',
    customEvents: [
      { name: 'Getting Ready', startTime: '10:00', duration: 180 },
      { name: 'First Look', startTime: '13:00', duration: 30 }
    ],
    includePhotography: true,
    includeVendorSetup: true,
    bufferTime: 15
  });

  const handleAddCustomEvent = () => {
    setTimelineConfig({
      ...timelineConfig,
      customEvents: [
        ...timelineConfig.customEvents,
        { name: '', startTime: '', duration: 30 }
      ]
    });
  };

  const handleRemoveCustomEvent = (index) => {
    setTimelineConfig({
      ...timelineConfig,
      customEvents: timelineConfig.customEvents.filter((_, i) => i !== index)
    });
  };

  const handleCustomEventChange = (index, field, value) => {
    const updatedEvents = [...timelineConfig.customEvents];
    updatedEvents[index][field] = value;
    setTimelineConfig({ ...timelineConfig, customEvents: updatedEvents });
  };

  const handleGenerate = async () => {
    setLoading(true);
    const toastId = toast.loading('AI is creating your perfect wedding timeline...');

    try {
      const prompt = `You are an expert wedding planner and timeline coordinator. Create a detailed, minute-by-minute wedding day timeline based on the following information:

CEREMONY & RECEPTION:
- Ceremony Start Time: ${timelineConfig.ceremonyStart}
- Ceremony Duration: ${timelineConfig.ceremonyDuration} minutes
- Cocktail Hour Duration: ${timelineConfig.cocktailHourDuration} minutes
- Reception Start Time: ${timelineConfig.receptionStart}
- Dinner Duration: ${timelineConfig.dinnerDuration} minutes
- Last Song/End Time: ${timelineConfig.lastSongTime}

KEY MOMENTS TIMING:
- First Dance: ${timelineConfig.firstDanceTiming === 'after_dinner' ? 'After dinner' : 'Before dinner'}
- Speeches: ${timelineConfig.speechesTiming === 'during_dinner' ? 'During dinner' : timelineConfig.speechesTiming === 'after_dinner' ? 'After dinner' : 'Before dinner'}
- Cake Cutting: ${timelineConfig.cuttingCakeTiming === 'after_dinner' ? 'After dinner' : 'During dinner'}

CUSTOM EVENTS:
${timelineConfig.customEvents.map(e => `- ${e.name}: ${e.startTime} (${e.duration} minutes)`).join('\n')}

ADDITIONAL CONSIDERATIONS:
- Include ${timelineConfig.bufferTime}-minute buffer times between major events
${timelineConfig.includePhotography ? '- Include time for photography sessions (family photos, couple portraits)' : ''}
${timelineConfig.includeVendorSetup ? '- Include vendor setup and breakdown times' : ''}

Create a comprehensive timeline that includes:
1. Pre-ceremony preparations and setup
2. Ceremony (processional, vows, recessional)
3. Post-ceremony activities (receiving line, cocktail hour)
4. Reception entrance and formalities
5. Dinner service and entertainment
6. Special moments (first dance, speeches, cake cutting, bouquet toss, etc.)
7. Dancing and celebration
8. Grand exit and cleanup

Format the response as a JSON object with this structure:
{
  "timeline": [
    {
      "time": "HH:MM",
      "event": "Event name",
      "duration": number (in minutes),
      "description": "Detailed description",
      "responsible": "Who manages this",
      "notes": "Important notes or tips"
    }
  ],
  "summary": "Brief overview of the day's flow",
  "tips": ["Helpful tip 1", "Helpful tip 2", ...]
}`;

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            timeline: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string" },
                  event: { type: "string" },
                  duration: { type: "number" },
                  description: { type: "string" },
                  responsible: { type: "string" },
                  notes: { type: "string" }
                }
              }
            },
            summary: { type: "string" },
            tips: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setGeneratedTimeline(response);
      setActiveTab('preview');
      toast.success('Your wedding timeline is ready!', { id: toastId });
    } catch (error) {
      console.error('Error generating timeline:', error);
      toast.error('Failed to generate timeline. Please try again.', { id: toastId });
    }

    setLoading(false);
  };

  const handleCopy = () => {
    if (!generatedTimeline) return;
    
    const timelineText = generatedTimeline.timeline.map(item => 
      `${item.time} - ${item.event} (${item.duration} min)\n${item.description}\nResponsible: ${item.responsible}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(timelineText);
    toast.success('Timeline copied to clipboard!');
  };

  const handleDownloadPDF = () => {
    if (!generatedTimeline) return;
    
    // Create a formatted text version for download
    const content = `WEDDING DAY TIMELINE\n\n${generatedTimeline.summary}\n\n` +
      generatedTimeline.timeline.map(item => 
        `${item.time} - ${item.event} (${item.duration} minutes)\n${item.description}\nResponsible: ${item.responsible}\n${item.notes ? `Notes: ${item.notes}\n` : ''}\n`
      ).join('\n') +
      `\n\nPLANNING TIPS:\n${generatedTimeline.tips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wedding-timeline.txt';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Timeline downloaded!');
  };

  const handleApply = () => {
    if (onApply && generatedTimeline) {
      onApply(generatedTimeline);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-purple-500" />
            AI Wedding Timeline Generator
          </DialogTitle>
          <p className="text-gray-600">Create a detailed minute-by-minute schedule for your wedding day</p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Configure Timeline
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedTimeline} className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Generated Timeline
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="space-y-6 mt-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Main Events</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ceremony Start Time</Label>
                      <Input
                        type="time"
                        value={timelineConfig.ceremonyStart}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, ceremonyStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ceremony Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={timelineConfig.ceremonyDuration}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, ceremonyDuration: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cocktail Hour Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={timelineConfig.cocktailHourDuration}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, cocktailHourDuration: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reception Start Time</Label>
                      <Input
                        type="time"
                        value={timelineConfig.receptionStart}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, receptionStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dinner Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={timelineConfig.dinnerDuration}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, dinnerDuration: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Song / End Time</Label>
                      <Input
                        type="time"
                        value={timelineConfig.lastSongTime}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, lastSongTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Key Moments Timing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>First Dance</Label>
                      <Select value={timelineConfig.firstDanceTiming} onValueChange={(value) => setTimelineConfig({ ...timelineConfig, firstDanceTiming: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before_dinner">Before Dinner</SelectItem>
                          <SelectItem value="after_dinner">After Dinner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Speeches</Label>
                      <Select value={timelineConfig.speechesTiming} onValueChange={(value) => setTimelineConfig({ ...timelineConfig, speechesTiming: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before_dinner">Before Dinner</SelectItem>
                          <SelectItem value="during_dinner">During Dinner</SelectItem>
                          <SelectItem value="after_dinner">After Dinner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cake Cutting</Label>
                      <Select value={timelineConfig.cuttingCakeTiming} onValueChange={(value) => setTimelineConfig({ ...timelineConfig, cuttingCakeTiming: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="during_dinner">During Dinner</SelectItem>
                          <SelectItem value="after_dinner">After Dinner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Custom Events</h3>
                    <Button onClick={handleAddCustomEvent} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {timelineConfig.customEvents.map((event, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5 space-y-2">
                          <Label className="text-xs">Event Name</Label>
                          <Input
                            value={event.name}
                            onChange={(e) => handleCustomEventChange(index, 'name', e.target.value)}
                            placeholder="e.g., Getting Ready"
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="time"
                            value={event.startTime}
                            onChange={(e) => handleCustomEventChange(index, 'startTime', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label className="text-xs">Duration (min)</Label>
                          <Input
                            type="number"
                            value={event.duration}
                            onChange={(e) => handleCustomEventChange(index, 'duration', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomEvent(index)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includePhotography"
                        checked={timelineConfig.includePhotography}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, includePhotography: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="includePhotography" className="cursor-pointer">Include photography sessions</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeVendorSetup"
                        checked={timelineConfig.includeVendorSetup}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, includeVendorSetup: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="includeVendorSetup" className="cursor-pointer">Include vendor setup and breakdown times</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Buffer Time Between Events (minutes)</Label>
                      <Input
                        type="number"
                        value={timelineConfig.bufferTime}
                        onChange={(e) => setTimelineConfig({ ...timelineConfig, bufferTime: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Timeline...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Wedding Timeline
                </>
              )}
            </Button>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6 mt-6">
            {generatedTimeline && (
              <>
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">Timeline Overview</h3>
                    <p className="text-gray-700">{generatedTimeline.summary}</p>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {generatedTimeline.timeline.map((item, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex flex-col items-center justify-center text-white">
                              <div className="text-lg font-bold">{item.time}</div>
                              <div className="text-xs">{item.duration}m</div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg mb-1">{item.event}</h4>
                            <p className="text-gray-700 text-sm mb-2">{item.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Responsible: {item.responsible}
                              </span>
                              {item.notes && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  💡 {item.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {generatedTimeline.tips && generatedTimeline.tips.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">Planning Tips</h3>
                      <ul className="space-y-2">
                        {generatedTimeline.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-blue-800">
                            <span className="text-blue-600 font-bold">{index + 1}.</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3">
                  <Button onClick={handleCopy} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Timeline
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button onClick={() => setActiveTab('input')} variant="outline" className="flex-1">
                    <Clock className="w-4 h-4 mr-2" />
                    Adjust Settings
                  </Button>
                  <Button onClick={handleApply} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Send className="w-4 h-4 mr-2" />
                    Use This Timeline
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