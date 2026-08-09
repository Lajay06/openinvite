import React from 'react';
import AuthLayout from '@/components/AuthLayout';

// Group A shell redesign — wraps the wizard's step content in the same
// left/right split-with-image treatment Contact.jsx/Sign-in already use
// (via AuthLayout.jsx's new showNav/images/bare/contentMaxWidth props),
// instead of the wizard's previous full-bleed centered-column look.
//
// Deliberately its own photo set, not AuthLayout's own CAROUSEL_IMAGES —
// a couple lands on /onboarding moments after seeing the login carousel
// (or not, if they came via a fresh signup), and reusing the exact same
// four photos back-to-back would read as repetition rather than a
// considered choice. Sourced from the same licensed wedding-photography
// library already used across the marketing site (no new assets needed),
// hand-reviewed for mood — warm/candid, distinctly wedding, not the more
// abstract/editorial shots in that library.
const ONBOARDING_IMAGES = [
  'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp.jpg',
  'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10282_hxzktx.jpg',
  'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_DECADENT_Debora_Spanhol_Photos_ID12475_viqbsz.jpg',
  'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_ISOLA_Daniel_Far%C3%B2_Photos_ID13172_fu4zfe.jpg',
];

export default function OnboardingShell({ children, contentMaxWidth = 600 }) {
  return (
    <AuthLayout showNav={false} images={ONBOARDING_IMAGES} bare contentMaxWidth={contentMaxWidth}>
      {children}
    </AuthLayout>
  );
}
