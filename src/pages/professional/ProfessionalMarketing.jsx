import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/lib/professionalBrand';

/** The marketing page arrives with item 14; until then /professional opens the app. */
export default function ProfessionalMarketing() {
  return <Navigate to={ROUTES.app} replace />;
}
