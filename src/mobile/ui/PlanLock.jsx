import React from 'react';
import { Lock } from 'lucide-react';
import PanelCard from './PanelCard';

/**
 * A feature the couple's plan does not include. App Store rule 3.1.1
 * (goals/2026-10-15-app-store-launch.md, ruling 1): a neutral lock with no
 * button, no link, no price, no plan name and no mention of the website.
 * `about` may say what the feature is, never how to get it.
 */
export default function PlanLock({ about }) {
  return (
    <div data-plan-lock="">
      <PanelCard tone="neutral" title="Not included in your plan" body={about}>
        <Lock size={18} style={{ opacity: 0.6 }} aria-hidden="true" />
      </PanelCard>
    </div>
  );
}
