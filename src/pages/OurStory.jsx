import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Image as ImageIcon, Sparkles, Loader2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import AIWeddingAssistant from '../components/shared/AIWeddingAssistant';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useFileUpload } from '@/hooks/useFileUpload';
import UploadStatus from '@/components/shared/UploadStatus';
import { color } from '@/styles/tokens';

export default function OurStoryPage() {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    story: '',
    image_url: '',
    order: 0
  });
  const imageUpload = useFileUpload('image');
  const [generatingStory, setGeneratingStory] = useState(false);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    try {
      const data = await getMyRecords('StoryMilestone');
      setMilestones(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error('Failed to load story milestones');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(editingId ? 'Updating milestone...' : 'Adding milestone...');
    
    try {
      if (editingId) {
        await base44.entities.StoryMilestone.update(editingId, formData);
        toast.success('Milestone updated!', { id: toastId });
      } else {
        await base44.entities.StoryMilestone.create({
          ...formData,
          order: milestones.length
        });
        toast.success('Milestone added!', { id: toastId });
      }
      
      resetForm();
      loadMilestones();
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast.error('Failed to save milestone', { id: toastId });
    }
  };

  const handleEdit = (milestone) => {
    setFormData({
      title: milestone.title || '',
      date: milestone.date || '',
      story: milestone.story || '',
      image_url: milestone.image_url || '',
      order: milestone.order || 0
    });
    setEditingId(milestone.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) return;
    
    const toastId = toast.loading('Deleting milestone...');
    try {
      await base44.entities.StoryMilestone.delete(id);
      toast.success('Milestone deleted', { id: toastId });
      loadMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone', { id: toastId });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', date: '', story: '', image_url: '', order: 0 });
    setEditingId(null);
  };

  const generateStory = async () => {
    if (!formData.title || !formData.date) {
      toast.error('Please enter a title and date first');
      return;
    }

    setGeneratingStory(true);
    const toastId = toast.loading('AI is crafting your story...');
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a heartfelt, romantic, and personal narrative (2-3 paragraphs) about a couple's relationship milestone titled "${formData.title}" that happened on ${new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Make it emotional, specific, and memorable. Write in first person plural (we/our) as if the couple is telling the story together. Keep it warm, genuine, and celebration-worthy.`,
      });
      
      setFormData(prev => ({ ...prev, story: response }));
      toast.success('Story generated!', { id: toastId });
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Failed to generate story', { id: toastId });
    }
    
    setGeneratingStory(false);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after a retry
    if (!file) return;
    const result = await imageUpload.upload(file);
    if (result) setFormData(prev => ({ ...prev, image_url: result.file_url }));
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(milestones);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setMilestones(updatedItems);

    // Save new order to database
    try {
      await Promise.all(
        updatedItems.map(item =>
          base44.entities.StoryMilestone.update(item.id, { order: item.order })
        )
      );
      toast.success('Order updated!');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
      loadMilestones(); // Reload on error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-lg w-96"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Our Story</h1>
          <p className="text-base" style={{ color: color.textMuted }}>
            Create a beautiful timeline of your relationship journey
          </p>
        </div>

        {/* Add/Edit Form */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Milestone Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., First Date, The Proposal"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Story</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateStory}
                    disabled={generatingStory || !formData.title || !formData.date}
                  >
                    {generatingStory ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  placeholder="Share the story behind this milestone..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Photo</Label>
                <div className="mt-1 space-y-3">
                  {(imageUpload.status === 'uploading' || imageUpload.status === 'error') && (
                    <UploadStatus status={imageUpload.status} error={imageUpload.error} onRetry={imageUpload.retry} height={128} />
                  )}
                  {formData.image_url && imageUpload.status !== 'uploading' ? (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => { setFormData({ ...formData, image_url: '' }); imageUpload.reset(); }}
                        className="absolute top-2 right-2"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : imageUpload.status === 'uploading' || imageUpload.status === 'error' ? null : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-8 h-8 mb-2" style={{ color: color.iconMuted }} />
                        <p className="text-sm" style={{ color: color.textMuted }}>Click to upload photo</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleUploadImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-gray-900">
                  {editingId ? 'Update Milestone' : 'Add Milestone'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Milestones List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Timeline ({milestones.length})
          </h2>
          
          {milestones.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <p style={{ color: color.textMuted }}>
                  No milestones yet. Add your first milestone above!
                </p>
              </CardContent>
            </Card>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="milestones">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {milestones.map((milestone, index) => (
                      <Draggable
                        key={milestone.id}
                        draggableId={milestone.id}
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="border-0 shadow-sm"
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-2 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="w-5 h-5" style={{ color: color.iconMuted }} />
                                </div>
                                
                                {milestone.image_url && (
                                  <img
                                    src={milestone.image_url}
                                    alt={milestone.title}
                                    className="w-24 h-24 object-cover rounded-lg"
                                  />
                                )}
                                
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-1">
                                    {milestone.title}
                                  </h3>
                                  <p className="text-sm mb-2" style={{ color: color.textMuted }}>
                                    {new Date(milestone.date).toLocaleDateString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                  {milestone.story && (
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                      {milestone.story}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(milestone)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(milestone.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>
      
      <AIWeddingAssistant />
    </div>
  );
}