/**
 * src/components/marketing/showcase/ShowcaseBudget.jsx
 *
 * SMART BUDGET, AS TEXT ON WHITE (goals/2026-10-15-consumer-launch-website.md,
 * item 1). The last of the long white block's three deep dives keeps its job
 * and its words but loses the photograph and the screenshot in a box: the
 * headline and body on the left, the six things it does on the right, in the
 * showcase panel's grammar, word for word. It takes over from src/components/home/
 * FeatureBudget.jsx, whose heading was title case and becomes sentence case.
 */
import React from "react";
import { ShowcasePanel, ShowcaseCopy } from "./ShowcasePanel";

export const BUDGET_HEADING = "Smart budget tracking";
export const BUDGET_BODY = "Plan like a pro. Our budgeting tools give you full visibility, clear control, and a few clever nudges to keep things beautifully on track.";
export const BUDGET_POINTS = [
  "Budget vs. actual spend tracking",
  "Vendor payment scheduling",
  "Category-based budgeting",
  "Visual expense analytics",
  "Friendly payment reminders",
  "Subtle cost-saving suggestions",
];

const CSS = `
  .sc-bud { display: grid; align-items: center; }
  .sc-bud__list { list-style: none; margin: 0; padding: 0; }
  .sc-bud__item { padding: 18px 0; border-bottom: 1px solid #E8E8E8; font-size: 20px; line-height: 28px; font-weight: 500; }
  .sc-bud__item:first-child { border-top: 1px solid #E8E8E8; }
  @media (min-width: 1024px) {
    .sc-bud { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8vw; padding: 0 5.56vw; }
  }
  @media (max-width: 1023px) {
    .sc-bud { gap: 40px; padding: 72px 20px; }
    .sc-bud__item { padding: 14px 0; font-size: 17px; line-height: 24px; }
  }
`;

export default function ShowcaseBudget() {
  return (
    <ShowcasePanel ground="white" name="budget" label="Smart budget tracking" className="sc-bud">
      <style>{CSS}</style>
      <ShowcaseCopy heading={BUDGET_HEADING} body={BUDGET_BODY} />
      <ul className="sc-bud__list">
        {BUDGET_POINTS.map((p) => <li key={p} className="sc-bud__item">{p}</li>)}
      </ul>
    </ShowcasePanel>
  );
}
