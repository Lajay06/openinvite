import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * EmptyState — the one empty state every dashboard page uses.
 *
 * SHARED COMPONENT, FLAGGED DELIBERATELY. The calm pass says to flag a new
 * shared component rather than introduce one quietly, because a component
 * imported by many pages becomes a decision nobody revisits.
 *
 * THE SPEC IS THE SHAPE, AND THE SHAPE IS THE POINT:
 *
 *   line 1  what this page is for
 *   line 2  what to do first, specific to this wedding where data allows
 *   one primary action
 *
 * No secondary buttons, no illustration, no tips carousel. An empty page that
 * offers three things to do is a page that has not decided which one matters,
 * and a couple opening it for the first time is exactly the person least able
 * to choose between them.
 *
 * Chrome rules apply here in full: sentence case, no box-shadow, no
 * border-radius on the container, 999px only on the button, Plus Jakarta Sans,
 * #E03553 flat. It carries no percentage and no progress language — the calm
 * pass forbids both, and an empty page has no progress to describe.
 */
export default function EmptyState({ what, next, actionLabel, onAction, actionHref }) {
  const Action = actionHref ? 'a' : 'button';
  const actionProps = actionHref ? { href: actionHref } : { type: 'button', onClick: onAction };

  return (
    <div style={{
      padding: '64px 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
      maxWidth: 560,
    }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>
        {what}
      </p>
      {next && (
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, lineHeight: 1.6 }}>
          {next}
        </p>
      )}
      {actionLabel && (
        <Action
          {...actionProps}
          style={{
            marginTop: 16,
            display: 'inline-flex',
            alignItems: 'center',
            background: '#E03553',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 999,
            padding: '10px 22px',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: PJS,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          {actionLabel}
        </Action>
      )}
    </div>
  );
}
