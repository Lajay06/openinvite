import React from 'react';
import AuthLayout from '@/components/AuthLayout';

// Group A shell redesign — wraps the wizard's step content in the same
// left/right split-with-image treatment Contact.jsx/Sign-in already use
// (via AuthLayout.jsx's showNav/image/bare/contentMaxWidth props), instead
// of the wizard's previous full-bleed centered-column look.
//
// One fixed photo per step, not a rotating carousel — each step names its
// own `image` (a Cloudinary URL, hand-picked per step in Onboarding.jsx) so
// the photo actually matches what that step is about, rather than cycling
// through an unrelated 4-photo set behind static text.
// `aside` passes content for the photo side through to AuthLayout (gifting v2:
// the live email preview on steps 2 to 6). Without it, nothing changes.
export default function OnboardingShell({ children, image, aside, contentMaxWidth = 600 }) {
  return (
    <AuthLayout showNav={false} image={image} aside={aside} bare contentMaxWidth={contentMaxWidth}>
      {children}
    </AuthLayout>
  );
}
