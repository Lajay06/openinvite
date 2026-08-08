import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { UploadFile } from '@/integrations/Core';
import { validateUploadFile } from '@/lib/uploadValidation';
import UploadStatus from '@/components/shared/UploadStatus';

const MoodboardItem = base44.entities.MoodboardItem;

let inspirationQueueId = 0;

// Was structurally close to Moodboard.jsx's own upload pattern already
// (same UploadFile call, same UploadStatus queue component), but stopped
// short of it: images collected here as raw URLs, then Onboarding.jsx's
// saveOnboarding created MoodboardItem records later with hardcoded
// generic values (title: 'Inspiration' for every photo, category: 'other',
// no board_name, no tags). Now calls MoodboardItem.create() immediately
// per upload, same as Moodboard.jsx's own uploadOne — a filename-derived
// title, board_name: 'Main board' (Moodboard.jsx's own default board), and
// tags: [] — so photos uploaded during onboarding show up in the real
// Moodboard page properly titled and boarded, not as generic placeholders.
export default function OnboardingPathAInspiration({ onNext, data }) {
  const [images, setImages] = useState([]); // [{ id, image_url }]
  const [queue, setQueue] = useState([]); // [{ id, file, status: 'uploading'|'error', error }]
  const [formError, setFormError] = useState(null);
  const uploading = queue.some(q => q.status === 'uploading');

  const uploadOne = useCallback(async (item) => {
    setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading', error: null } : i));
    try {
      const { file_url } = await UploadFile({ file: item.file });
      const created = await MoodboardItem.create({
        title: item.file.name.split('.')[0],
        image_url: file_url,
        category: 'other',
        board_name: 'Main board',
        tags: [],
      });
      setImages(prev => [...prev, { id: created.id, image_url: file_url }]);
      setQueue(q => q.filter(i => i.id !== item.id));
    } catch (err) {
      console.error('Upload error:', err);
      setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Upload failed. Please try again.' } : i));
    }
  }, []);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setFormError(null);

    if (images.length + queue.length + files.length > 6) {
      setFormError('Maximum 6 images');
      return;
    }

    // Validate every file before uploading any
    for (const file of files) {
      const err = validateUploadFile(file, 'image');
      if (err) { setFormError(err); return; }
    }

    const items = files.map(file => ({ id: ++inspirationQueueId, file, status: 'uploading', error: null }));
    setQueue(q => [...q, ...items]);
    items.forEach(uploadOne);
  };

  const retryUpload = useCallback((id) => {
    setQueue(q => {
      const item = q.find(i => i.id === id);
      if (item) uploadOne(item);
      return q;
    });
  }, [uploadOne]);

  const removeImage = async (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    try {
      await MoodboardItem.delete(id);
    } catch (err) {
      console.error('Failed to remove moodboard item:', err);
    }
  };

  const handleSubmit = () => onNext();

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-[#0A0A0A] mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any inspiration to share?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[rgba(10,10,10,0.6)] text-sm mb-12"
      >
        Ava learns your style from images.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        {images.length + queue.length < 6 && (
          <label className="block mb-6">
            <div className="border-2 border-dashed border-[rgba(10,10,10,0.18)] rounded-none p-12 cursor-pointer hover:border-[#E03553] transition-colors">
              <Upload className="w-8 h-8 text-[rgba(10,10,10,0.45)] mx-auto mb-3" />
              <p className="text-[#0A0A0A] font-medium">Upload images</p>
              <p className="text-[rgba(10,10,10,0.6)] text-sm mt-1">
                {images.length + queue.length}/6 images
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              disabled={images.length + queue.length >= 6}
              className="hidden"
            />
          </label>
        )}

        {formError && (
          <p className="text-[#E03553] text-sm mb-6">{formError}</p>
        )}

        {(images.length > 0 || queue.length > 0) && (
          <div className="grid grid-cols-3 gap-4">
            {images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square overflow-hidden group"
              >
                <img
                  src={img.image_url}
                  alt="Inspiration"
                  className="w-full h-full object-cover"
                />
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => removeImage(img.id)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-6 h-6 text-white" />
                </motion.button>
              </motion.div>
            ))}
            {queue.map(item => (
              <div key={item.id} className="relative aspect-square overflow-hidden">
                <UploadStatus
                  status={item.status}
                  error={item.error}
                  onRetry={() => retryUpload(item.id)}
                  height="100%"
                  style={{ height: '100%', minHeight: 0 }}
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Continue →'}
        </button>

        <button
          onClick={handleSubmit}
          className="block mx-auto text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}
