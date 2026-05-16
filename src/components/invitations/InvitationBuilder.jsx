import React, { useState } from "react";
import { Invitation } from "@/entities/Invitation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

// This is now a simple, one-step builder to gather initial details.
export default function InvitationBuilder({ onInvitationSaved, onBack }) {
  const [coupleNames, setCoupleNames] = useState("");
  const [weddingDate, setWeddingDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndContinue = async () => {
    if (!coupleNames.trim()) {
      alert("Please enter the couple's names.");
      return;
    }

    setIsSaving(true);
    try {
      const initialDesign = {
        globalStyles: { fontFamily: 'Playfair Display', scrollDirection: 'vertical', transitionType: 'fade', parallax: true },
        sections: [
          {
            id: 'hero',
            name: 'Hero Section',
            background: { type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
            components: [
              {
                id: `text_${Date.now()}`,
                type: 'text',
                content: { text: coupleNames },
                styles: { padding: '40px', margin: '20px 0', textAlign: 'center', fontSize: '2rem', color: '#ffffff', fontWeight: 'bold' }
              },
               {
                id: `date_${Date.now()}`,
                type: 'text',
                content: { text: weddingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                styles: { padding: '10px', margin: '0', textAlign: 'center', fontSize: '1.25rem', color: '#ffffff' }
              }
            ]
          }
        ],
        selectedSection: 0,
        selectedElement: null
      };

      const newInvitationData = {
        couple_names: coupleNames,
        wedding_date: weddingDate.toISOString().split('T')[0],
        design: initialDesign
      };

      const newInvitation = await Invitation.create(newInvitationData);
      onInvitationSaved(newInvitation);
    } catch(error) {
      console.error("Failed to save invitation:", error);
      alert("Error saving invitation.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <Sparkles className="w-8 h-8 text-pink-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Your Wedding Website</h1>
                <p className="text-gray-500">Let's start with the basics. You can design everything else in the studio.</p>
              </div>
            </div>
            {/* The onBack button is removed as this is now the initial step if no invitation exists */}
          </div>

          <div className="space-y-6">
            <div>
              <label className="font-medium text-gray-700">Couple's Names</label>
              <Input
                placeholder="e.g., Alex & Jordan"
                value={coupleNames}
                onChange={(e) => setCoupleNames(e.target.value)}
                className="mt-2 h-12 text-lg"
              />
            </div>
            <div>
              <label className="font-medium text-gray-700">Wedding Date</label>
              <div className="mt-2 flex justify-center">
                 <Calendar
                    mode="single"
                    selected={weddingDate}
                    onSelect={setWeddingDate}
                    className="rounded-md border"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <Button 
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              size="lg"
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {isSaving ? "Saving..." : "Save & Open Studio"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}