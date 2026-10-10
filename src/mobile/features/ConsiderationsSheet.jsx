import React from 'react';
import { Lightbulb } from 'lucide-react';
import { BottomSheet, Row, RowGroup } from '../ui';
import PageConsiderations from '@/components/shared/PageConsiderations';

/**
 * The desktop's Considerations tab (PageConsiderations: static advice per
 * page, plus the culture-specific items the couple's theme matches), in a
 * full sheet. The desktop component is reused as is; the sheet's wrapper
 * class puts its type on the app's scale (mobile.css).
 */
export function ConsiderationsSheet({ open, pageKey, onClose }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Considerations" full>
      <div className="oi-m-considerations">{open && <PageConsiderations pageKey={pageKey} />}</div>
    </BottomSheet>
  );
}

/** The row that opens it, placed at the foot of the screens that have the tab on desktop. */
export function ConsiderationsRow({ onClick }) {
  return <RowGroup><Row icon={Lightbulb} tile="tint" label="Considerations" sub="Things worth knowing before you decide" onClick={onClick} /></RowGroup>;
}

/** One state hook for a screen: [sheetEl, openRow]. */
export function useConsiderations(pageKey) {
  const [open, setOpen] = React.useState(false);
  const sheet = <ConsiderationsSheet open={open} pageKey={pageKey} onClose={() => setOpen(false)} />;
  const row = <ConsiderationsRow onClick={() => setOpen(true)} />;
  return { sheet, row };
}
