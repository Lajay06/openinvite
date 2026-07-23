import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VendorForm from './VendorForm';

/**
 * THE shared add/edit-vendor modal — every page that lets someone add or
 * edit a Vendor record renders this, not a local hand-rolled overlay.
 * (Dashboard round 6, item 4/5 — this file existing at all is the fix for
 * "the vendor pattern keeps drifting because each section hand-rolls its
 * own modal shell.")
 */
export default function VendorFormModal({ open, vendor, defaultCategory, onSubmit, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor?.id ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
        </DialogHeader>
        <VendorForm
          vendor={vendor}
          defaultCategory={defaultCategory}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
