import React from 'react';
import md5 from 'blueimp-md5';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const PJS = "'Plus Jakarta Sans', sans-serif";

const AVATAR_COLOURS = ['#E8B4B8', '#B4C8E8', '#B4E8C8', '#D4B4E8', '#E8D4B4', '#B4E8E8', '#E8C8B4', '#C8E8B4'];

function nameColour(name) {
  const str = name || '';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function gravatarUrl(email) {
  if (!email) return null;
  const hash = md5(email.trim().toLowerCase());
  // d=404 makes Gravatar itself 404 when it has no image for this hash,
  // rather than serving a generic default icon — that 404 is what lets
  // AvatarImage's own load-error detection fall through to AvatarFallback.
  return `https://www.gravatar.com/avatar/${hash}?d=404`;
}

/**
 * GuestAvatar — the one shared avatar for every place a guest's initials
 * render (GuestList, SendInvitesModal, seating's GuestAssignment/
 * VisualTable/AssignGuestModal). Priority: an explicit profilePictureUrl
 * (pre-existing manual/social field on Guest, kept as the top priority
 * exactly where it already rendered) → Gravatar, when the guest has an
 * email → the initials circle, deterministically coloured per name.
 *
 * Built on the existing Radix-backed Avatar/AvatarImage/AvatarFallback
 * (src/components/ui/avatar.jsx), not a new image tag: Radix's own
 * loading-status tracking is what gives this "no layout shift, no
 * flicker" for free — AvatarFallback renders immediately and stays
 * until AvatarImage reports 'loaded', with both occupying the exact
 * same fixed-size circle throughout, and swaps back to the fallback on
 * a load error (a Gravatar ?d=404 miss looks identical to any other
 * broken image URL to the browser).
 */
export default function GuestAvatar({ name, email, profilePictureUrl, size = 32, className }) {
  const src = profilePictureUrl || gravatarUrl(email) || undefined;
  return (
    <Avatar className={className} style={{ width: size, height: size }}>
      {src && <AvatarImage src={src} alt={name || ''} loading="lazy" />}
      <AvatarFallback style={{ background: nameColour(name) }}>
        <span style={{ fontSize: Math.round(size * 0.36), fontWeight: 700, color: '#FFFFFF', fontFamily: PJS, lineHeight: 1 }}>
          {getInitials(name)}
        </span>
      </AvatarFallback>
    </Avatar>
  );
}
