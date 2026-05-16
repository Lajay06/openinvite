import React from 'react';

export const InspirationPreview = ({ invitation, globalStyles }) => {
  const inspirationImages = [
    'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    'https://images.unsplash.com/photo-1525258854630-bd5d91f59943?w=400',
    'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=400',
    'https://images.unsplash.com/photo-1546193429-285a73e481b2?w=400',
    'https://images.unsplash.com/photo-1543277339-44473b963167?w=400'
  ];

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-full" style={{ fontFamily: globalStyles?.fontFamily }}>
        <h2 className="text-3xl font-bold text-center mb-8" style={{fontFamily: 'Playfair Display, serif'}}>Our Inspiration</h2>
        <div className="columns-2 md:columns-3 gap-4">
            {inspirationImages.map((src, index) => (
                <img key={index} className="w-full h-auto mb-4 rounded-lg shadow-sm break-inside-avoid" src={src} alt={`Inspiration ${index + 1}`} />
            ))}
        </div>
    </div>
  );
};

export default InspirationPreview;