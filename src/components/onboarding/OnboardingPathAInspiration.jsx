import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function OnboardingPathAInspiration({ onNext, data }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 6) {
      alert('Maximum 6 images');
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        setImages(prev => [...prev, result.file_url]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploading(false);
  };

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
        {images.length < 6 && (
          <label className="block mb-6">
            <div className="border-2 border-dashed border-[#333] rounded-2xl p-12 cursor-pointer hover:border-[#E03553] transition-colors">
              <Upload className="w-8 h-8 text-[#888888] mx-auto mb-3" />
              <p className="text-white font-medium">Upload images</p>
              <p className="text-[#666666] text-sm mt-1">
                {images.length}/6 images
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading || images.length >= 6}
              className="hidden"
            />
          </label>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {images.map((url, i) => (
              <motion.div
                key={i}
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
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-gradient-to-r from-[#E03553] to-[#803D81] hover:brightness-110 transition-all disabled:opacity-50"
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