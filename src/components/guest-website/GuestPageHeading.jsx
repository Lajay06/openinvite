import React from 'react';
import { sectionMarkFor } from './layouts/sectionMarks';

// The mark renders as an h1 here. Reading A makes the kicker the page's only
// title, so the kicker must BE the heading — replacing an <h1> with a styled
// <p> would have left every guest page with no document heading at all.
// SectionMarks still default to <p> for their in-page section openers.
export default function GuestPageHeading({ title, theme, typography, universeConfig, textColor }) {
  const Mark = sectionMarkFor(universeConfig);
  return (
    <Mark
      as="h1"
      kicker={title}
      theme={theme}
      typography={typography}
      accentColor={theme?.accent}
      textColor={textColor}
    />
  );
}
