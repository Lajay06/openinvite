import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import InvitationPreviewWithNav from '@/components/invitations/InvitationPreviewWithNav';
import { BottomSheet } from '../../ui';

/**
 * The invitation preview on the phone (goal 8, item 5): the desktop
 * studio's own preview panel, InvitationPreviewWithNav, imported directly
 * and rendered off the same Invitation record, so the sections, type and
 * backgrounds are the desktop's to the pixel. View only: `onElementSelect`
 * is not passed, so tapping a block selects nothing.
 *
 * The same two surfaces as the guest suite (SitePreview.jsx): a 4:5 tile
 * laid out at 390px and scaled, inert, and a full-height sheet where the
 * invitation scrolls inside a frame that contains its fixed menu.
 */
const PHONE_W = 390;

export function InvitationPreviewFrame({ invitation, details, width = 342, onOpen }) {
  const scale = width / PHONE_W;
  const height = Math.round(width * 1.25);
  if (!invitation) return null;
  return (
    <button type="button" className="oi-m-sitepreview oi-m-press" style={{ width, height }} onClick={onOpen} aria-label="Open the invitation preview">
      <div className="oi-m-sitepreview__scale" style={{ width: PHONE_W, height: Math.round(height / scale), transform: `scale(${scale})` }} aria-hidden="true" inert="">
        <InvitationPreviewWithNav invitation={invitation} weddingDetails={details} currentPage="main" onPageChange={() => {}} />
      </div>
      <span className="oi-m-sitepreview__hint"><Maximize2 size={14} strokeWidth={2} /> Preview</span>
    </button>
  );
}

export function InvitationPreviewSheet({ invitation, details, open, onClose }) {
  const [page, setPage] = useState('main');
  return (
    <BottomSheet open={open} onClose={onClose} title="Invitation preview" full flush>
      {open && invitation && (
        <div className="oi-m-sitepreview-sheet">
          <div className="oi-m-sitepreview-sheet__frame" data-preview-frame="mobile">
            <InvitationPreviewWithNav invitation={invitation} weddingDetails={details} currentPage={page} onPageChange={setPage} />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
