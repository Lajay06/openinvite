/**
 * tests/motion/harness.jsx — MOTION CAPTURE HARNESS. Test-only, ships nothing.
 *
 * Mounts the REAL MultiPageWeddingWebsite inside a router, so what is captured
 * is the shipped assembly rather than a reimplementation of its transition.
 * The wedding record arrives over the network exactly as in production; the
 * capture script intercepts /api/wedding-by-slug to choose the universe.
 *
 * The universe is selected by ?u=<id> so one bundle serves all twenty.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MultiPageWeddingWebsite from '@/components/guest-website/MultiPageWeddingWebsite';

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/w/capture/home']}>
    <Routes>
      <Route path="/w/:weddingSlug" element={<MultiPageWeddingWebsite />} />
      <Route path="/w/:weddingSlug/:page" element={<MultiPageWeddingWebsite />} />
    </Routes>
  </MemoryRouter>
);
