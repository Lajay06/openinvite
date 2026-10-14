/**
 * src/pages/professional/ProfessionalRoot.jsx
 *
 * EVERY /professional ROUTE, BEHIND THE FLAG. src/App.jsx mounts this once at
 * /professional/* (a held PR); every page below it is lane E's. With the flag
 * off, every path here goes home, so production never sees any of it.
 */
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isProfessionalOn } from '@/lib/professionalBrand';
import { lazyWithReload } from '@/lib/lazyWithReload.js';

const ProfessionalApp = lazyWithReload(() => import('./ProfessionalApp'));
const ProfessionalStart = lazyWithReload(() => import('./ProfessionalStart'));
const ProfessionalMarketing = lazyWithReload(() => import('./ProfessionalMarketing'));
const VendorSheetPage = lazyWithReload(() => import('./VendorSheetPage'));
const QuestionnairePage = lazyWithReload(() => import('./QuestionnairePage'));

export default function ProfessionalRoot() {
  if (!isProfessionalOn()) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5F5F5' }} />}>
      <Routes>
        <Route index element={<ProfessionalMarketing />} />
        <Route path="start" element={<ProfessionalStart />} />
        <Route path="app/*" element={<ProfessionalApp />} />
        <Route path="vendor/:token" element={<VendorSheetPage />} />
        <Route path="form/:token" element={<QuestionnairePage />} />
        <Route path="*" element={<Navigate to="/professional" replace />} />
      </Routes>
    </Suspense>
  );
}
