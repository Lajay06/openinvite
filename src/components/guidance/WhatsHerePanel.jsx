import React from 'react';
import StudioTour from './StudioTour';

/**
 * THE "?" PANEL, RE-POINTED AT THE TOUR.
 *
 * Goal 2026-09-28: 'WhatsHereControl and WhatsHerePanel stay, re-pointed to
 * open the tour on the page's chapter.' So this file keeps its name and its
 * job, which is "what the question mark opens", and what it opens has changed.
 *
 * ── WHAT IT USED TO BE, AND WHY THAT IS GONE ───────────────────────────────
 *
 * A per-page card: purpose, three actions, and on four pages a reason to come
 * back, read out of src/lib/pageGuidance.js. It was good, and it was a second
 * help system beside Quick tips and the first-run tour. The goal retires the
 * other two and makes this the same tour, opened at the chapter for the page a
 * couple pressed the question mark on.
 *
 * pageGuidance.js IS NOW UNREAD. It is left in place rather than deleted: the
 * goal's Retire list names TipsModal, QuickTipsTour and the Quick tips label,
 * and does not name it. Reported in the PR for the owner to strike.
 *
 * ── IT IS A WRAPPER, NOT A SECOND TOUR ─────────────────────────────────────
 *
 * One component renders the chapters, in two modes. A panel with its own copy
 * of the rail and the keyboard handling would drift from the takeover, and the
 * chapter a couple reads from the question mark would slowly stop matching the
 * one they read on first run.
 */
export default function WhatsHerePanel({ startChapterKey, context, dismissed, onClose, onChapterComplete, onOpenAva }) {
  return (
    <StudioTour
      mode="panel"
      startChapterKey={startChapterKey}
      context={context}
      dismissed={dismissed}
      onClose={onClose}
      onChapterComplete={onChapterComplete}
      onOpenAva={onOpenAva}
    />
  );
}
