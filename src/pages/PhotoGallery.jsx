import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  Trash2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon,
  Loader2,
  X,
  Camera
} from "lucide-react";
import toast from 'react-hot-toast';
import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";

export default function PhotoGalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [editingPhoto, setEditingPhoto] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    category: "engagement",
    description: "",
    photographer_credit: "",
    date_taken: "",
    visible_to_guests: true
  });

  const categories = [
    { value: "all", label: "All Photos" },
    { value: "engagement", label: "Engagement" },
    { value: "pre_wedding", label: "Pre-Wedding Events" },
    { value: "ceremony", label: "Ceremony" },
    { value: "reception", label: "Reception" },
    { value: "portraits", label: "Portraits" },
    { value: "party", label: "Party" },
    { value: "other", label: "Other" }
  ];

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await base44.entities.Photo.list('-created_date');
      setPhotos(data);
    } catch (error) {
      console.error("Error loading photos:", error);
      toast.error("Failed to load photos");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading('Uploading photo...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      toast.success('Photo uploaded!', { id: toastId });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error('Failed to upload photo', { id: toastId });
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image_url) {
      toast.error('Please upload a photo first');
      return;
    }

    const toastId = toast.loading(editingPhoto ? 'Updating photo...' : 'Adding photo...');
    try {
      if (editingPhoto) {
        await base44.entities.Photo.update(editingPhoto.id, formData);
        toast.success('Photo updated!', { id: toastId });
      } else {
        await base44.entities.Photo.create(formData);
        toast.success('Photo added!', { id: toastId });
      }
      resetForm();
      loadPhotos();
    } catch (error) {
      console.error("Error saving photo:", error);
      toast.error('Failed to save photo', { id: toastId });
    }
  };

  const handleEdit = (photo) => {
    setEditingPhoto(photo);
    setFormData({
      title: photo.title || "",
      image_url: photo.image_url,
      category: photo.category,
      description: photo.description || "",
      photographer_credit: photo.photographer_credit || "",
      date_taken: photo.date_taken || "",
      visible_to_guests: photo.visible_to_guests !== false
    });
    setShowUploadForm(true);
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;

    const toastId = toast.loading('Deleting photo...');
    try {
      await base44.entities.Photo.delete(photoId);
      toast.success('Photo deleted', { id: toastId });
      loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error('Failed to delete photo', { id: toastId });
    }
  };

  const toggleVisibility = async (photo) => {
    const toastId = toast.loading('Updating visibility...');
    try {
      await base44.entities.Photo.update(photo.id, {
        visible_to_guests: !photo.visible_to_guests
      });
      toast.success('Visibility updated', { id: toastId });
      loadPhotos();
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error('Failed to update visibility', { id: toastId });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      image_url: "",
      category: "engagement",
      description: "",
      photographer_credit: "",
      date_taken: "",
      visible_to_guests: true
    });
    setShowUploadForm(false);
    setEditingPhoto(null);
  };

  const filteredPhotos = activeCategory === "all" 
    ? photos 
    : photos.filter(p => p.category === activeCategory);

  const stats = React.useMemo(() => {
    const totalPhotos = photos.length;
    const visiblePhotos = photos.filter(p => p.visible_to_guests !== false).length;
    const byCategory = {};
    photos.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    });
    return { totalPhotos, visiblePhotos, byCategory };
  }, [photos]);

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Photo Gallery</h1>
            <p className="text-sm text-gray-500">
              Upload and manage your wedding photos
            </p>
          </div>
          <Button 
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-gray-900 hover:bg-gray-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Photos
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Total Photos</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Visible to Guests</div>
            <div className="text-2xl font-bold text-green-600">{stats.visiblePhotos}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Engagement</div>
            <div className="text-2xl font-bold text-gray-900">{stats.byCategory.engagement || 0}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Ceremony</div>
            <div className="text-2xl font-bold text-gray-900">{stats.byCategory.ceremony || 0}</div>
          </div>
        </div>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingPhoto ? 'Edit Photo' : 'Upload Photo'}
                </h3>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Upload Photo</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {uploading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  </div>
                  {formData.image_url && (
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="mt-2 w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(c => c.value !== 'all').map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Date Taken</Label>
                    <Input
                      type="date"
                      value={formData.date_taken}
                      onChange={(e) => setFormData({...formData, date_taken: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Photo title or caption"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Add a description or story..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Photographer Credit</Label>
                  <Input
                    value={formData.photographer_credit}
                    onChange={(e) => setFormData({...formData, photographer_credit: e.target.value})}
                    placeholder="Photographer name"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="visible"
                    checked={formData.visible_to_guests}
                    onChange={(e) => setFormData({...formData, visible_to_guests: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="visible" className="text-sm">Visible to guests</Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="bg-gray-900">
                    {editingPhoto ? 'Update Photo' : 'Add Photo'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="bg-transparent border-b border-gray-200 h-10 rounded-none px-0 w-full justify-start overflow-x-auto">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.value}
                value={cat.value} 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-2 px-3 text-sm whitespace-nowrap"
              >
                {cat.label} {cat.value !== 'all' && `(${stats.byCategory[cat.value] || 0})`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Photo Grid */}
        {filteredPhotos.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="p-12 text-center">
              <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4">No photos in this category yet</p>
              <Button onClick={() => setShowUploadForm(true)} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map(photo => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.image_url}
                  alt={photo.title || 'Photo'}
                  className="w-full h-64 object-cover rounded-lg"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                  {photo.title && (
                    <p className="text-white text-sm font-medium px-2 text-center">{photo.title}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleEdit(photo)}
                      className="h-8 w-8"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => toggleVisibility(photo)}
                      className="h-8 w-8"
                    >
                      {photo.visible_to_guests !== false ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(photo.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Visibility Badge */}
                {photo.visible_to_guests === false && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Hidden
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AIWeddingAssistant />
    </div>
  );
}