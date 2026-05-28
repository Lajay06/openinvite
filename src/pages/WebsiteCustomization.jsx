import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Upload, Loader2, Eye, Plus, Trash2, X } from "lucide-react";
import toast from 'react-hot-toast';
import { validateUploadFile } from '@/lib/uploadValidation';
import { Textarea } from "@/components/ui/textarea";

export default function WebsiteCustomizationPage() {
  const [theme, setTheme] = useState(null);
  const [customPages, setCustomPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPageForm, setShowPageForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  const [themeData, setThemeData] = useState({
    primary_color: "#ec4899",
    secondary_color: "#8b5cf6",
    background_color: "#ffffff",
    text_color: "#111827",
    accent_color: "#f3f4f6",
    font_family: "Inter",
    heading_font: "Playfair Display",
    hero_image_url: ""
  });

  const [pageData, setPageData] = useState({
    title: "",
    slug: "",
    event_type: "custom",
    date: "",
    venue_name: "",
    venue_address: "",
    description: "",
    dress_code: "",
    rsvp_required: false,
    visible_to_guests: true,
    order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [themes, pages] = await Promise.all([
        base44.entities.WebsiteTheme.list(),
        base44.entities.CustomEventPage.list('order')
      ]);

      if (themes.length > 0) {
        setTheme(themes[0]);
        setThemeData(themes[0]);
      }
      setCustomPages(pages);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving theme...');
    try {
      if (theme) {
        await base44.entities.WebsiteTheme.update(theme.id, themeData);
      } else {
        await base44.entities.WebsiteTheme.create(themeData);
      }
      toast.success('Theme saved!', { id: toastId });
      loadData();
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error('Failed to save theme', { id: toastId });
    }
    setSaving(false);
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type and size before uploading
    const validationError = validateUploadFile(file, 'image');
    if (validationError) {
      toast.error(validationError);
      e.target.value = '';
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading image...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setThemeData({ ...themeData, hero_image_url: file_url });
      toast.success('Image uploaded!', { id: toastId });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error('Failed to upload image', { id: toastId });
    }
    setUploading(false);
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(editingPage ? 'Updating page...' : 'Creating page...');
    try {
      if (editingPage) {
        await base44.entities.CustomEventPage.update(editingPage.id, pageData);
        toast.success('Page updated!', { id: toastId });
      } else {
        await base44.entities.CustomEventPage.create(pageData);
        toast.success('Page created!', { id: toastId });
      }
      resetPageForm();
      loadData();
    } catch (error) {
      console.error("Error saving page:", error);
      toast.error('Failed to save page', { id: toastId });
    }
  };

  const handleEditPage = (page) => {
    setEditingPage(page);
    setPageData(page);
    setShowPageForm(true);
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;
    
    const toastId = toast.loading('Deleting page...');
    try {
      await base44.entities.CustomEventPage.delete(pageId);
      toast.success('Page deleted', { id: toastId });
      loadData();
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error('Failed to delete page', { id: toastId });
    }
  };

  const resetPageForm = () => {
    setPageData({
      title: "",
      slug: "",
      event_type: "custom",
      date: "",
      venue_name: "",
      venue_address: "",
      description: "",
      dress_code: "",
      rsvp_required: false,
      visible_to_guests: true,
      order: customPages.length
    });
    setShowPageForm(false);
    setEditingPage(null);
  };

  const fonts = ["Inter", "Playfair Display", "Montserrat", "Lora", "Raleway", "Crimson Text"];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Website Customization</h1>
            <p className="text-sm text-gray-500">
              Personalize your wedding website's look and feel
            </p>
          </div>
          <Button
            onClick={() => window.open('/wedding', '_blank')}
            variant="outline"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Website
          </Button>
        </div>

        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="bg-transparent border-b border-gray-200 h-10 rounded-none px-0 w-full justify-start">
            <TabsTrigger value="theme" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-2 px-3">
              Theme & Colors
            </TabsTrigger>
            <TabsTrigger value="pages" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#E03553] data-[state=active]:text-[#E03553] rounded-none pb-2 px-3">
              Custom Event Pages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="mt-6 space-y-6">
            <Card className="border-gray-200">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Colors</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: 'primary_color', label: 'Primary Color' },
                      { key: 'secondary_color', label: 'Secondary Color' },
                      { key: 'background_color', label: 'Background' },
                      { key: 'text_color', label: 'Text Color' },
                      { key: 'accent_color', label: 'Accent Color' }
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-sm font-medium mb-2 block">{label}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={themeData[key]}
                            onChange={(e) => setThemeData({ ...themeData, [key]: e.target.value })}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={themeData[key]}
                            onChange={(e) => setThemeData({ ...themeData, [key]: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Typography</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Body Font</Label>
                      <Select value={themeData.font_family} onValueChange={(value) => setThemeData({ ...themeData, font_family: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fonts.map(font => (
                            <SelectItem key={font} value={font}>{font}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Heading Font</Label>
                      <Select value={themeData.heading_font} onValueChange={(value) => setThemeData({ ...themeData, heading_font: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fonts.map(font => (
                            <SelectItem key={font} value={font}>{font}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Hero Image</h3>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleHeroUpload}
                    disabled={uploading}
                  />
                  {themeData.hero_image_url && (
                    <img src={themeData.hero_image_url} alt="Hero" className="mt-4 w-full h-48 object-cover rounded-lg" />
                  )}
                </div>

                <Button onClick={handleSaveTheme} disabled={saving} className="bg-gray-900">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Theme'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages" className="mt-6 space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setShowPageForm(!showPageForm)} className="bg-gray-900">
                <Plus className="w-4 h-4 mr-2" />
                Create Event Page
              </Button>
            </div>

            {showPageForm && (
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingPage ? 'Edit Event Page' : 'Create Event Page'}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={resetPageForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <form onSubmit={handleSavePage} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Page Title</Label>
                        <Input
                          value={pageData.title}
                          onChange={(e) => {
                            const title = e.target.value;
                            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            setPageData({ ...pageData, title, slug });
                          }}
                          placeholder="Rehearsal Dinner"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">URL Slug</Label>
                        <Input
                          value={pageData.slug}
                          onChange={(e) => setPageData({ ...pageData, slug: e.target.value })}
                          placeholder="rehearsal-dinner"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Event Type</Label>
                        <Select value={pageData.event_type} onValueChange={(value) => setPageData({ ...pageData, event_type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rehearsal_dinner">Rehearsal Dinner</SelectItem>
                            <SelectItem value="bridal_shower">Bridal Shower</SelectItem>
                            <SelectItem value="bachelor_party">Bachelor Party</SelectItem>
                            <SelectItem value="bachelorette_party">Bachelorette Party</SelectItem>
                            <SelectItem value="welcome_party">Welcome Party</SelectItem>
                            <SelectItem value="farewell_brunch">Farewell Brunch</SelectItem>
                            <SelectItem value="custom">Custom Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Date & Time</Label>
                        <Input
                          type="datetime-local"
                          value={pageData.date}
                          onChange={(e) => setPageData({ ...pageData, date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Venue Name</Label>
                      <Input
                        value={pageData.venue_name}
                        onChange={(e) => setPageData({ ...pageData, venue_name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Venue Address</Label>
                      <Input
                        value={pageData.venue_address}
                        onChange={(e) => setPageData({ ...pageData, venue_address: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Description</Label>
                      <Textarea
                        value={pageData.description}
                        onChange={(e) => setPageData({ ...pageData, description: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Dress Code</Label>
                      <Input
                        value={pageData.dress_code}
                        onChange={(e) => setPageData({ ...pageData, dress_code: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="visible"
                          checked={pageData.visible_to_guests}
                          onChange={(e) => setPageData({ ...pageData, visible_to_guests: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="visible" className="text-sm">Visible to guests</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="rsvp"
                          checked={pageData.rsvp_required}
                          onChange={(e) => setPageData({ ...pageData, rsvp_required: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="rsvp" className="text-sm">RSVP required</Label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" className="bg-gray-900">
                        {editingPage ? 'Update Page' : 'Create Page'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetPageForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {customPages.map(page => (
                <Card key={page.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{page.title}</h4>
                        <p className="text-sm text-gray-500 capitalize">
                          {page.event_type.replace('_', ' ')} • /{page.slug}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!page.visible_to_guests && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">Hidden</span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleEditPage(page)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeletePage(page.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}