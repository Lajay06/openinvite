/**
 * Section 8 — questions people actually ask.
 *
 * SIX ONLY. The copy source is explicit: "Any longer and it reads defensive."
 * A seventh question is not an addition, it is a change of tone.
 *
 * Rendered open, not as an accordion. Every accordion in this codebase ships
 * collapsed (CLAUDE.md), which would hide all six answers behind clicks on the
 * one section whose whole job is answering the objection before it is asked.
 *
 * The gift answer is an AUDITED claim and its wording is exact: "we do not take
 * a percentage of your gifts. We add nothing and take nothing." Do not
 * paraphrase it.
 */
import React from "react";
import { PJS, INK, MUTED_ON_LIGHT, RULE_ON_LIGHT, SECTION_PAD, MEASURE, MEASURE_WIDE, H2, BODY } from "./_shared";

const QUESTIONS = [
  {
    q: "Pay once? What is the catch.",
    a: "There isn't one, and the honest answer is the window: one payment, 24 months of access. Nothing inside is metered. No premium tier of a feature you already have, no charge to publish, no add-on that appears the moment the tool becomes useful.",
  },
  {
    q: "Why would I pay when the big platforms are free?",
    a: "They are genuinely free, and we are not going to pretend otherwise. They are free because the couple is what is being sold. That is a fair trade if you know you are making it. Ours is the other deal: you pay us once and we answer to you.",
  },
  {
    q: "Will my grandmother be able to use it?",
    a: "Your guests never make an account. They tap a link and reply. Couples call this the grandma test, and it is a fair one.",
  },
  {
    q: "I already have a registry somewhere else.",
    a: "Link it. We do not push our own shop, because we do not have one. And on gifts: we do not take a percentage of your gifts. We add nothing and take nothing.",
  },
  {
    q: "Can I trust a new company with my guest list?",
    a: "That is the right question to ask, and it is why we publish exactly what we collect and what we do with it, in plain words, before you sign up.",
  },
  {
    q: "Can I get my data out?",
    a: "All of it, whenever you want, including after the wedding. Reading your wedding back stays free too. There is no archive fee.",
  },
];

export default function QuestionsSection() {
  return (
    <section style={{ background: "#FFFFFF", padding: SECTION_PAD }}>
      <div style={{ maxWidth: MEASURE_WIDE }}>
        <h2 style={{ ...H2, color: INK, marginBottom: "clamp(32px, 3.6vw, 52px)" }}>
          Questions people actually ask.
        </h2>

        <div style={{ maxWidth: MEASURE, borderTop: `1px solid ${RULE_ON_LIGHT}` }}>
          {QUESTIONS.map(({ q, a }) => (
            <div key={q} style={{ padding: "clamp(24px, 2.8vw, 34px) 0", borderBottom: `1px solid ${RULE_ON_LIGHT}` }}>
              <p
                style={{
                  fontFamily: PJS,
                  fontSize: "clamp(17px, 1.5vw, 21px)",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.45,
                  color: INK,
                  margin: "0 0 10px",
                }}
              >
                {q}
              </p>
              <p style={{ ...BODY, color: MUTED_ON_LIGHT, margin: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
