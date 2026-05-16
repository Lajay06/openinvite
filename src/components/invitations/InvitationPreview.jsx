import React from 'react';

export default function InvitationPreview({ invitation, onElementSelect }) {
  const design = invitation?.design || { sections: [], globalStyles: {} };
  const { sections, globalStyles } = design;

  const renderComponent = (component) => {
    const styles = {
      ...component.styles,
      fontFamily: globalStyles.fontFamily || 'Inter'
    };

    switch (component.type) {
      case 'text':
        return (
          <div
            key={component.id}
            style={styles}
            onClick={() => onElementSelect && onElementSelect(component.id)}
            className="cursor-pointer hover:outline hover:outline-2 hover:outline-blue-400"
          >
            {component.content.text}
          </div>
        );
      case 'image':
        return (
          <img
            key={component.id}
            src={component.content.url}
            alt={component.content.alt || 'Image'}
            style={styles}
            onClick={() => onElementSelect && onElementSelect(component.id)}
            className="cursor-pointer hover:outline hover:outline-2 hover:outline-blue-400"
          />
        );
      default:
        return null;
    }
  };

  const renderSection = (section) => {
    const sectionStyle = {};
    
    if (section.background) {
      if (section.background.type === 'color') {
        sectionStyle.backgroundColor = section.background.value;
      } else if (section.background.type === 'gradient') {
        sectionStyle.background = section.background.value;
      } else if (section.background.type === 'image') {
        sectionStyle.backgroundImage = `url(${section.background.value})`;
        sectionStyle.backgroundSize = 'cover';
        sectionStyle.backgroundPosition = 'center';
      }
    }

    return (
      <div
        key={section.id}
        style={sectionStyle}
        className="min-h-screen p-8 flex flex-col justify-center"
      >
        {section.components?.map(renderComponent)}
      </div>
    );
  };

  if (sections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-500">Add sections to start building your invitation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ fontFamily: globalStyles.fontFamily }}>
      {sections.map(renderSection)}
    </div>
  );
}