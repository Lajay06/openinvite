import React from 'react';

const SECTIONS = [
  { id: 'welcome', name: 'Welcome Message', canToggle: true },
  { id: 'ceremony', name: 'Ceremony & Reception', canToggle: true },
  { id: 'story', name: 'Our Story', canToggle: true },
  { id: 'rsvp', name: 'RSVP', canToggle: true },
  { id: 'travel', name: 'Travel & Stay', canToggle: true },
  { id: 'music', name: 'Music / Song Requests', canToggle: true },
  { id: 'footer', name: 'Footer', canToggle: false },
];

export default function SectionsTab({ wedding, onChange }) {
  const toggleSection = (sectionId) => {
    const newVisible = { ...wedding.sectionsVisible, [sectionId]: !wedding.sectionsVisible[sectionId] };
    onChange('sectionsVisible', newVisible);
  };

  const moveSection = (index, direction) => {
    const newOrder = [...wedding.sectionsOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(index + direction, 0, moved);
    onChange('sectionsOrder', newOrder);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '11px', color: '#888888', margin: '0 0 16px' }}>
        Drag to reorder. Toggle to show/hide.
      </p>

      {wedding.sectionsOrder.map((sectionId, idx) => {
        const section = SECTIONS.find(s => s.id === sectionId);
        if (!section) return null;

        return (
          <div
            key={sectionId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#FAFAFA',
              border: '1px solid #EEEEEE',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '14px', color: '#CCCCCC', cursor: 'grab' }}>⠿</div>

            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A', margin: 0 }}>
                {section.name}
              </p>
            </div>

            {section.canToggle ? (
              <button
                onClick={() => toggleSection(sectionId)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: wedding.sectionsVisible[sectionId] ? '#E03553' : '#DDDDDD',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: '20px',
                    height: '20px',
                    background: '#FFFFFF',
                    borderRadius: '50%',
                    top: '2px',
                    left: wedding.sectionsVisible[sectionId] ? '22px' : '2px',
                    transition: 'left 0.2s ease',
                  }}
                />
              </button>
            ) : (
              <p style={{ fontSize: '11px', color: '#888888', margin: 0 }}>Always on</p>
            )}
          </div>
        );
      })}
    </div>
  );
}