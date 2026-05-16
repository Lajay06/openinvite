import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function QuoteRequestModal({ vendor, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_date: "",
    guest_count: "",
    budget_range: "",
    message: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.QuoteRequest.create({
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        ...formData,
        guest_count: parseInt(formData.guest_count) || 0,
        status: "pending"
      });

      onSuccess();
    } catch (error) {
      console.error("Error sending quote request:", error);
      toast.error("Failed to send quote request");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-xl w-full max-w-2xl border border-white/10"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Request Quote</h2>
            <p className="text-gray-400 text-sm mt-1">from {vendor.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-white">Event Date *</Label>
              <Input
                type="date"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Number of Guests</Label>
              <Input
                type="number"
                placeholder="e.g. 150"
                value={formData.guest_count}
                onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-white">Budget Range</Label>
            <Input
              placeholder="e.g. $2,000 - $3,000"
              value={formData.budget_range}
              onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
              className="mt-1 bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-white">Message to Vendor *</Label>
            <Textarea
              required
              rows={6}
              placeholder="Tell the vendor about your event, requirements, and any specific questions..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="mt-1 bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Quote Request"
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}