import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { validateUploadFile } from '@/lib/uploadValidation';
import UploadStatus from '@/components/shared/UploadStatus';

let inspirationQueueId = 0;

export default function OnboardingPathAInspiration({ onNext, data }) {
  const [images, setImages] = useState([]);
  const [queue, setQueue] = useState([]); // [{ id, file, status: 'uploading'|'error', error }]
  const [formError, setFormError] = useState(null);
  const uploading = queue.some(q => q.status === 'uploading');

  const uploadOne = useCallback(async (item) => {
    setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading', error: null } : i));
    try {
      const result = await base44.integrations.Core.UploadFile({ file: item.file });
      setImages(prev => [...prev, result.file_url]);
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

  const removeImage = (url) => {
    setImages(prev => prev.filter(img => img !== url));
  };

  const handleSubmit = () => {
    onNext({ inspirationPhotos: images });
  };

  return (
    <div className="w-full max-w-2xl text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-white mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Any inspiration to share?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[#666666] text-sm mb-12"
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
            <div className="border-2 border-dashed border-[#333] rounded-2xl p-12 cursor-pointer hover:border-[#E03553] transition-colors">
              <Upload className="w-8 h-8 text-[rgba(255,255,255,0.4)] mx-auto mb-3" />
              <p className="text-white font-medium">Upload images</p>
              <p className="text-[#666666] text-sm mt-1">
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
            {images.map((url, i) => (
              <motion.div
                key={url + i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img
                  src={url}
                  alt="Inspiration"
                  className="w-full h-full object-cover"
                />
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => removeImage(url)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-6 h-6 text-white" />
                </motion.button>
              </motion.div>
            ))}
            {queue.map(item => (
              <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden">
                <UploadStatus
                  status={item.status}
                  error={item.error}
                  onRetry={() => retryUpload(item.id)}
                  dark
                  height="100%"
                  style={{ height: '100%', minHeight: 0, borderRadius: 8 }}
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
          onClick={() => onNext({ inspirationPhotos: [] })}
          className="block mx-auto text-[#666666] hover:text-white text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}