import React from 'react';
import { Calendar, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { color } from '@/styles/tokens';

export default function OurStoryTimeline({ milestones = [] }) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p style={{ color: color.textMuted }}>Our story is being written...</p>
      </div>
    );
  }

  const sortedMilestones = [...milestones].sort((a, b) => 
    (a.order || 0) - (b.order || 0) || new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200 hidden md:block" />
        
        <div className="space-y-12">
          {sortedMilestones.map((milestone, index) => (
            <motion.div
              key={milestone.id || index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Timeline dot */}
              <div className="absolute left-6 top-0 w-5 h-5 rounded-full bg-white border-4 border-pink-400 hidden md:block" />
              
              {/* Content */}
              <div className="md:ml-20 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  {/* Image */}
                  {milestone.image_url && (
                    <div className="md:w-1/2">
                      <img
                        src={milestone.image_url}
                        alt={milestone.title}
                        className="w-full h-64 object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Text content */}
                  <div className={`p-6 ${milestone.image_url ? 'md:w-1/2' : 'w-full'}`}>
                    <div className="flex items-center gap-2 text-xs mb-3" style={{ color: color.textMuted }}>
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(milestone.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-medium text-gray-900 mb-3">
                      {milestone.title}
                    </h3>
                    
                    {milestone.story && (
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {milestone.story}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}