import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, MapPin, Clock, ExternalLink, Star, Hotel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { interactiveDivProps } from '@/lib/a11y';

export default function InvitationPreviewWithNav({ invitation, weddingDetails, onElementSelect, currentPage, onPageChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const design = invitation?.design || { sections: [], globalStyles: {} };

  const renderModernCard = (component) => {
    const { content, styles } = component;
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-all duration-300">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-gray-900">{content.title}</h3>
          {content.time && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{content.time}</span>
            </div>
          )}
          {content.venue && (
            <div className="space-y-1">
              <div className="font-medium text-gray-900">{content.venue}</div>
              {content.address && (
                <div className="flex items-start gap-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{content.address}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHotelCard = (component) => {
    const { content } = component;
    const handleHotelClick = () => {
      if (content.website) {
        window.open(content.website, '_blank', 'noopener,noreferrer');
      }
    };

    return (
      <div
        className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all duration-300 cursor-pointer group"
        onClick={handleHotelClick}
        {...interactiveDivProps(handleHotelClick)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Hotel className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {content.name}
              </h3>
            </div>
            
            {content.address && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{content.address}</span>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              {content.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900">{content.rating}</span>
                </div>
              )}
              {content.priceRange && (
                <Badge variant="secondary" className="text-xs">
                  {content.priceRange}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  };

  const renderModernForm = (component) => {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md mx-auto">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <input
              type="text"
              placeholder="Your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div>
            <input
              type="email"
              placeholder="Your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white">
              <option value="">Will you be attending?</option>
              <option value="yes">Yes, I'll be there</option>
              <option value="no">Sorry, can't make it</option>
            </select>
          </div>
          <div>
            <textarea
              placeholder="Dietary restrictions or special requests"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Send RSVP
          </Button>
        </form>
      </div>
    );
  };

  const renderComponent = (component) => {
    const baseStyles = {
      padding: component.styles?.padding || '1rem',
      margin: component.styles?.margin || '0',
      textAlign: component.styles?.textAlign || 'left',
      color: component.styles?.color || '#000000',
      fontSize: component.styles?.fontSize || '1rem',
      fontWeight: component.styles?.fontWeight || 'normal',
      fontFamily: component.styles?.fontFamily || design.globalStyles?.fontFamily || 'system-ui',
      lineHeight: component.styles?.lineHeight || '1.5',
      maxWidth: component.styles?.maxWidth || 'none',
      backgroundColor: component.styles?.backgroundColor,
      borderRadius: component.styles?.borderRadius,
      border: component.styles?.border,
      boxShadow: component.styles?.boxShadow,
      ...component.styles
    };

    switch (component.type) {
      case 'text':
        return (
          <div
            style={baseStyles}
            className="transition-all duration-200"
            onClick={() => onElementSelect?.(component.id)}
            {...interactiveDivProps(() => onElementSelect?.(component.id))}
          >
            {component.content.text}
          </div>
        );

      case 'modern-card':
        return renderModernCard(component);

      case 'hotel-card':
        return renderHotelCard(component);

      case 'modern-form':
        return renderModernForm(component);

      case 'container':
        return (
          <div style={baseStyles} className="container-component">
            {component.children?.map(child => renderComponent(child))}
          </div>
        );

      default:
        return (
          <div
            style={baseStyles}
            className="border border-dashed border-gray-300 p-4 rounded-lg text-center text-gray-500"
            onClick={() => onElementSelect?.(component.id)}
            {...interactiveDivProps(() => onElementSelect?.(component.id))}
          >
            {component.type} component
          </div>
        );
    }
  };

  const renderSection = (section) => {
    const sectionStyle = {
      background: section.background?.type === 'gradient' 
        ? section.background.value 
        : section.background?.value || '#ffffff',
      minHeight: section.type === 'hero' ? '100vh' : 'auto',
      padding: '4rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: section.type === 'hero' ? 'center' : 'flex-start'
    };

    return (
      <section 
        key={section.id} 
        style={sectionStyle}
        className="transition-all duration-500"
      >
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {section.components?.map((component, index) => (
            <div key={component.id || index}>
              {renderComponent(component)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // Modern burger menu navigation
  const MenuItems = () => (
    <>
      {design.sections?.map((section, index) => (
        <a
          key={section.id}
          href={`#section-${index}`}
          className="block px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(false)}
        >
          {section.name}
        </a>
      ))}
    </>
  );

  return (
    <div className="h-full bg-white relative">
      {/* Modern Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex-shrink-0">
              <span className="text-lg font-semibold text-gray-900">
                {invitation?.couple_names || 'Wedding Website'}
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {design.sections?.slice(0, 5).map((section, index) => (
                <a
                  key={section.id}
                  href={`#section-${index}`}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {section.name}
                </a>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="p-2"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-4 space-y-2">
              <MenuItems />
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <div className="pt-16">
        {design.sections?.map((section, index) => (
          <div key={section.id} id={`section-${index}`}>
            {renderSection(section)}
          </div>
        ))}
      </div>
    </div>
  );
}