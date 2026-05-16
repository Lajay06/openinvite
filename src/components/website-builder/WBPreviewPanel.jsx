import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, WEDDING_PAGES } from '@/lib/websiteThemes';
import WBWebsitePreview from './WBWebsitePreview';
import SectionTemplatePicker from './SectionTemplatePicker';

export default function WBPreviewPanel({
  details, currentPage, onPageChange, previewDevice, onDeviceChange,
  onSectionClick, selectedSection, onAddSection, onDeleteSection, onMoveSection,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [insertIndex, setInsertIndex] = useState(null);
  const [hoverSection, setHoverSection] = useState(null);
  const theme = WEBSITE_THEMES.find(t => t.id === (details.activeTheme || 'still')) || WEBSITE_THEMES[0];

  const allPageLabels = {
    ...Object.fromEntries(WEDDING_PAGES.map(p => [p.slug, p.label])),
    ...Object.fromEntries((details.customPages || []).map(p => [p.slug, p.name])),
  };
  const pageLabel = allPageLabels[currentPage] || 'Home';

  const DEVICES = [
    { id: 'desktop', icon: Monitor, label: 'Desktop' },
    { id: 'tablet', icon: Tablet, label: 'Tablet' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  const frameWidth = previewDevice === 'mobile' ? 390 : previewDevice === 'tablet' ? 768 : '100%';

  const pageSections = (details.pageSections || {})[currentPage] || [];

  const handleAddSection = (newSection, idx) => {
    onAddSection(currentPage, newSection, idx);
  };

  const openPicker = (idx) => {
    setInsertIndex(idx);
    setShowPicker(true);
  };

  return (
    <div style={{
      flex: 1, background: '#EBEBEB',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
    }}>
      {/* Preview top bar */}
      <div style={{
        height: 44, background: '#fff', borderBottom: '1px solid #EEEEEE',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, flexShrink: 0,
      }}>
        {/* Device toggles */}
        <div style={{ display: 'flex', gap: 2 }}>
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => onDeviceChange(id)} title={label} style={{
              width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid ' + (previewDevice === id ? '#0A0A0A' : '#DDDDDD'),
              background: previewDevice === id ? '#0A0A0A' : 'transparent',
              cursor: 'pointer', borderRadius: 4,
            }}>
              <Icon size={13} color={previewDevice === id ? '#fff' : '#888'} />
            </button>
          ))}
        </div>

        {/* Fake URL bar */}
        <div style={{
          flex: 1, height: 28, background: '#F5F5F5', border: '1px solid #E5E5E5',
          borderRadius: 100, display: 'flex', alignItems: 'center', padding: '0 12px',
          overflow: 'hidden', maxWidth: 440,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', marginRight: 6, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            openinvite.com/w/{details.slug || 'your-wedding'}/{currentPage !== 'home' ? currentPage : ''}
          </span>
        </div>

        <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>Previewing: <b style={{ color: '#0A0A0A' }}>{pageLabel}</b></span>
      </div>

      {/* Preview frame */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 16, position: 'relative' }}>
        <div style={{
          width: frameWidth,
          background: '#fff',
          boxShadow: previewDevice === 'mobile' ? '0 8px 40px rgba(0,0,0,0.2)' : previewDevice === 'tablet' ? '0 4px 24px rgba(0,0,0,0.15)' : '0 2px 20px rgba(0,0,0,0.12)',
          borderRadius: previewDevice === 'mobile' ? 36 : previewDevice === 'tablet' ? 8 : 0,
          border: previewDevice === 'mobile' ? '6px solid #1D1D1F' : previewDevice === 'tablet' ? '1px solid #DDD' : 'none',
          overflow: previewDevice === 'desktop' ? 'visible' : 'hidden',
          maxHeight: previewDevice !== 'desktop' ? '90vh' : undefined,
          display: 'flex', flexDirection: 'column',
          minHeight: previewDevice === 'desktop' ? '100%' : undefined,
        }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Section hover toolbar wrapper */}
            <SectionHoverWrapper
              pageSections={pageSections}
              selectedSection={selectedSection}
              onSectionClick={onSectionClick}
              onEdit={onSectionClick}
              onDelete={(secId) => onDeleteSection(currentPage, secId)}
              onMove={(secId, dir) => onMoveSection(currentPage, secId, dir)}
              onAddBelow={(idx) => openPicker(idx)}
              hoverSection={hoverSection}
              setHoverSection={setHoverSection}
            >
              <WBWebsitePreview
                details={details}
                currentPage={currentPage}
                onSectionClick={onSectionClick}
                selectedSection={selectedSection}
              />
            </SectionHoverWrapper>
          </div>

          {/* + Add Section button at bottom */}
          <div style={{ padding: '12px 0', borderTop: '1px solid #F0F0F0', flexShrink: 0, background: '#fff' }}>
            <button
              onClick={() => openPicker(null)}
              style={{
                width: '90%', margin: '0 auto', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, border: '1px dashed #CCC', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#888', borderRadius: 4, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#CCC'; e.currentTarget.style.color = '#888'; }}
            >
              <Plus size={15} /> Add Section
            </button>
          </div>
        </div>
      </div>

      {showPicker && (
        <SectionTemplatePicker
          theme={theme}
          insertIndex={insertIndex}
          onSelect={handleAddSection}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// Hover toolbar that appears over sections
function SectionHoverWrapper({ children, pageSections, selectedSection, onEdit, onDelete, onMove, onAddBelow, hoverSection, setHoverSection }) {
  // We render the preview then overlay floating action bars via a transparent overlay approach
  // Since we can't easily intercept the inner sections, we use the pageSections list for action buttons
  // and attach to the WBWebsitePreview's data-section elements via mouse events on a wrapper
  return (
    <div
      style={{ position: 'relative' }}
      onMouseOver={e => {
        const sec = e.target.closest?.('[data-section]');
        if (sec) setHoverSection(sec.dataset.section);
      }}
      onMouseLeave={() => setHoverSection(null)}
    >
      {children}

      {/* Floating action bar for hovered section */}
      {hoverSection && (
        <SectionActionBar
          sectionId={hoverSection}
          pageSections={pageSections}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          onAddBelow={onAddBelow}
        />
      )}
    </div>
  );
}

function SectionActionBar({ sectionId, pageSections, onEdit, onDelete, onMove, onAddBelow }) {
  const idx = pageSections.findIndex(s => s.id === sectionId);
  return (
    <div style={{
      position: 'fixed',
      // We'll use top-center positioning since we can't easily get element bounds
      // This is a simplified floating bar in top-right of preview
      bottom: 80, right: 24,
      zIndex: 1000,
      background: '#0A0A0A', color: '#fff',
      borderRadius: 100, padding: '0 4px',
      display: 'flex', alignItems: 'center', gap: 2,
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      pointerEvents: 'auto',
      fontSize: 11,
    }}>
      <ActionBtn title="Move Up" onClick={() => onMove(sectionId, 'up')} disabled={idx <= 0}>
        <ArrowUp size={12} />
      </ActionBtn>
      <ActionBtn title="Move Down" onClick={() => onMove(sectionId, 'down')} disabled={idx === -1 || idx >= pageSections.length - 1}>
        <ArrowDown size={12} />
      </ActionBtn>
      <ActionBtn title="Edit" onClick={() => onEdit(sectionId)}>
        <Pencil size={12} />
      </ActionBtn>
      <ActionBtn title="Add Below" onClick={() => onAddBelow(idx + 1)}>
        <Plus size={12} />
      </ActionBtn>
      <div style={{ width: 1, height: 16, background: '#333', margin: '0 2px' }} />
      <ActionBtn title="Delete" onClick={() => onDelete(sectionId)} danger>
        <Trash2 size={12} />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({ children, onClick, title, disabled, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? (danger ? '#E03553' : '#333') : 'transparent',
        border: 'none', borderRadius: 100, cursor: disabled ? 'default' : 'pointer',
        color: disabled ? '#444' : '#fff', transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}