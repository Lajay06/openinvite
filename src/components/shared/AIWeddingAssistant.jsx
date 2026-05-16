import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, X, User, Lightbulb, Calendar, DollarSign, Palette, Users, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";
import { Invitation } from "@/entities/Invitation";
import { Guest } from "@/entities/Guest";
import { WeddingDetails } from "@/entities/WeddingDetails";

export default function AIWeddingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hi! I'm Ava, your AI wedding planning expert. I can help you with timelines, budgets, themes, etiquette, and vendor recommendations. What would you like help with today?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(null);
  const [weddingContext, setWeddingContext] = useState(null);

  useEffect(() => {
    if (isOpen && !weddingContext) {
      loadWeddingContext();
    }
  }, [isOpen]);

  const loadWeddingContext = async () => {
    try {
      const [invitations, guests, details] = await Promise.all([
        Invitation.list(),
        Guest.list(),
        WeddingDetails.list()
      ]);

      const context = {
        weddingDate: invitations[0]?.wedding_date || null,
        guestCount: guests.length || 0,
        location: details[0]?.mainCeremony?.address || null,
        venue: details[0]?.mainCeremony?.venueName || null
      };

      setWeddingContext(context);
    } catch (error) {
      console.error('Error loading wedding context:', error);
    }
  };

  const assistantModes = [
    {
      id: 'timeline',
      title: 'Timeline & Checklist',
      icon: Calendar,
      color: 'blue',
      prompt: (ctx) => `Create a detailed wedding planning timeline and checklist for a wedding on ${ctx.weddingDate || 'TBD'} with ${ctx.guestCount} guests. Include month-by-month tasks, deadlines, and priorities from 12 months before to day-of.`
    },
    {
      id: 'budget',
      title: 'Budget Strategy',
      icon: DollarSign,
      color: 'green',
      prompt: (ctx) => `Suggest a smart budget allocation strategy for a wedding with ${ctx.guestCount} guests at ${ctx.venue || 'a venue'}. Break down percentages for venue, catering, photography, flowers, music, attire, decorations, and other categories. Include cost-saving tips.`
    },
    {
      id: 'theme',
      title: 'Themes & Colors',
      icon: Palette,
      color: 'purple',
      prompt: (ctx) => `Generate 3 creative wedding theme ideas with matching color palettes for a ${ctx.location ? `wedding in ${ctx.location}` : 'wedding'}. For each theme, provide: theme name, description, 3-5 color hex codes, decor ideas, and styling suggestions.`
    },
    {
      id: 'etiquette',
      title: 'Etiquette Advice',
      icon: Users,
      color: 'pink',
      prompt: (ctx) => `Provide comprehensive wedding etiquette guidance covering: invitation wording and timing, gift registry etiquette, seating arrangement protocols, thank-you note guidelines, plus-one policies, and RSVP management for a wedding with ${ctx.guestCount} guests.`
    },
    {
      id: 'vendors',
      title: 'Vendor Recommendations',
      icon: Briefcase,
      color: 'orange',
      prompt: (ctx) => `Recommend wedding vendors (photographers, florists, DJs, planners) for a wedding in ${ctx.location || 'the area'}. For each category, provide 2-3 suggestions with what to look for, typical pricing, questions to ask, and red flags to avoid.`
    }
  ];

  const handleModeSelect = async (mode) => {
    setActiveMode(mode.id);
    
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: `Help me with: ${mode.title}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const prompt = mode.prompt(weddingContext);
      const response = await InvokeLLM({
        prompt: `You are Ava, an expert wedding planner. ${prompt}. Provide detailed, actionable advice in a warm, professional tone. Format with clear headings and bullet points for readability.`,
        add_context_from_internet: true
      });

      const assistantMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: response || "I'd be happy to help with that! Could you provide more details about your specific needs?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try asking your question again, or feel free to explore the other planning features in your dashboard!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
    setActiveMode(null);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const contextInfo = weddingContext ? 
        `Wedding context: Date: ${weddingContext.weddingDate || 'TBD'}, Guests: ${weddingContext.guestCount}, Location: ${weddingContext.location || 'TBD'}.` : '';
      
      const response = await InvokeLLM({
        prompt: `You are Ava, an expert wedding planner assistant. ${contextInfo} The user is asking: "${inputMessage}". Provide helpful, specific, and actionable wedding planning advice. Be warm, encouraging, and professional. Keep responses well-structured with clear formatting.`,
        add_context_from_internet: true
      });

      const assistantMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: response || "I'm sorry, I couldn't process that request right now. Please try asking something else about your wedding planning!",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Here are some general wedding planning tips I can share: Start with your budget and guest count, book your venue early, and don't forget to enjoy the process!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      pink: 'bg-pink-50 text-pink-700 border-pink-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      {/* Floating Assistant Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50 ava-fab"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="px-6 py-3 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Ask Ava</span>
        </Button>
      </motion.div>

      {/* Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <Card className="bg-white border-gray-200 shadow-2xl rounded-2xl w-full">
                <CardHeader className="pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900">Ask Ava</CardTitle>
                        <p className="text-sm text-gray-500">Your personal wedding planning expert</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {/* Messages */}
                  <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.type === 'assistant' && (
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                          <div className={`rounded-2xl px-4 py-3 ${
                            message.type === 'user' 
                              ? 'bg-pink-500 text-white' 
                              : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 px-2">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                        
                        {message.type === 'user' && (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 order-1">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Modes */}
                  {messages.length <= 2 && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">I can help you with:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {assistantModes.map((mode) => (
                          <Button
                            key={mode.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleModeSelect(mode)}
                            className={`justify-start text-left h-auto py-2 border ${getColorClasses(mode.color)}`}
                            disabled={isLoading}
                          >
                            <mode.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="text-xs font-medium">{mode.title}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="border-t border-gray-100 p-4 bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask Ava anything about wedding planning..."
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isLoading}
                        className="border-gray-200 focus:border-pink-300"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="bg-pink-500 hover:bg-pink-600"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}