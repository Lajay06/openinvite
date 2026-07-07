import React from "react";
import ApplePillButton from "@/components/motion/ApplePillButton";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollProgress from "@/components/motion/ScrollProgress";
import HeroCollage from "@/components/home/HeroCollage";
import Block from "@/components/home/blocks/Block";
import BulletList from "@/components/home/blocks/BulletList";
import FeatureRows from "@/components/home/blocks/FeatureRows";
import { cloudinaryUrl } from "@/lib/cloudinaryUrl";

// ── Cloudinary images — one unique image per photo block, none reused ──────
const IMG_VALUE_PROP  = cloudinaryUrl("https://res.cloudinary.com/dsr84xknv/image/upload/v1779185602/DTS_Remote_Studio_Tino_Renato_Photos_ID3726_vgcgmv.jpg");
const IMG_GUESTS       = cloudinaryUrl("https://res.cloudinary.com/dsr84xknv/image/upload/v1779185626/DTS_MOTHERLY_Shauna_Summers_Photos_ID10728_vz25fa.jpg");
const IMG_TIMELINE     = cloudinaryUrl("https://res.cloudinary.com/dsr84xknv/image/upload/v1779185631/DTS_Early_Honey_Moon_Tino_Renato_Photos_ID3576_v8vxs0.jpg");
const IMG_UNIVERSES    = cloudinaryUrl("https://res.cloudinary.com/dsr84xknv/image/upload/v1779218329/DTS_Misc_1__Nick_Fancher__Nick_Fancher_Photos_ID3470_knfncz.jpg");
const IMG_FINAL_CTA    = cloudinaryUrl("https://res.cloudinary.com/dsr84xknv/image/upload/v1779233659/DTS_Grand_Design_Daniel_Far%C3%B2_Photos_ID4152_auimyj.jpg");

const UNIVERSE_FEATURES = [
  { heading: 'Entire wedding identities', description: 'Not just invitations, complete visual ecosystems. Every Universe includes matching save the dates, seating charts, menus, guest experiences, thank you cards, and more.' },
  { heading: 'Designed as one seamless system', description: 'Every detail works together beautifully. Fonts, colours, layouts, motion, and styling are carried across every touchpoint for a fully cohesive wedding experience.' },
  { heading: 'Built for modern weddings', description: 'Digital-first designs made to feel immersive on any device. Elegant mobile invitations, animated interactions, live updates, and guest experiences designed for the way people celebrate today.' },
  { heading: 'A universe for every style', description: 'From modern minimal to culturally inspired celebrations. Choose from curated Universes influenced by aesthetics, destinations, traditions, and luxury design worlds from around the globe.' },
];

const AVA_ROWS = [
  { heading: 'Smart suggestions', description: 'Personalised recommendations based on your style and budget' },
  { heading: 'Budget intelligence', description: 'Real-time tips to keep spending on track without compromise' },
  { heading: 'Guest insights', description: 'Dietary, seating, and RSVP patterns analysed automatically' },
  { heading: 'Timeline optimisation', description: 'Day-of schedule refined to perfection' },
];

// ── See Pricing ghost button ─────────────────────────────────────
function SeePricingButton() {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => { window.location.href = '/Pricing'; }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "12px 24px", borderRadius: 999,
        border: "1px solid #FFFFFF",
        background: hovered ? "#FFFFFF" : "transparent",
        color: hovered ? "#0A0A0A" : "#FFFFFF",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "clamp(13px, 1.2vw, 15px)", fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      See pricing
    </button>
  );
}

export default function Home() {
  const handleCTA = () => {
    window.location.href = '/signup';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans" style={{ scrollBehavior: "smooth" }}>
      <PublicNav />
      <ScrollProgress />

      {/* 1. HERO — untouched */}
      <div id="section-hero">
        <HeroCollage onCTA={handleCTA} />
      </div>

      {/* 2. PHOTO — value prop */}
      <Block
        type="photo"
        image={IMG_VALUE_PROP}
        imageAlt="Openinvite platform"
        headline="All the powerful tools, beautifully designed to make wedding planning smooth, stylish, and seriously organised."
        staggerIndex={0}
      />

      {/* 3. BLACK — "so, why us?" */}
      <Block
        type="black"
        kicker="So, why us?"
        headline="Every detail, beautifully handled."
        copy="Planning, invitations, guests, timelines and budgets, intelligently connected in one seamless experience."
        align="center"
        staggerIndex={1}
      />

      {/* 4. PHOTO — Advanced Guest Management */}
      <div id="section-features">
        <Block
          type="photo"
          image={IMG_GUESTS}
          imageAlt="Wedding guests celebrating"
          kicker="01"
          headline="Advanced Guest Management"
          copy="From RSVP tracking to seating charts, we handle the guest list chaos so you can stay cool, calm, and perfectly in control."
          staggerIndex={0}
        >
          <BulletList
            items={["Unlimited guest lists", "Real-time RSVP tracking", "Smart table assignments"]}
            textColor="#FFFFFF"
            hairline="rgba(255,255,255,0.2)"
          />
        </Block>
      </div>

      {/* 5. WHITE — Smart Budget Tracking */}
      <Block
        type="white"
        kicker="02"
        headline="Smart Budget Tracking"
        copy="Plan like a pro. Full visibility, clear control, and a few clever nudges to keep things beautifully on track."
        staggerIndex={1}
      >
        <BulletList
          items={["Budget vs. actual spend", "Vendor payment scheduling", "Visual expense analytics"]}
          textColor="#0A0A0A"
          hairline="rgba(10,10,10,0.1)"
        />
      </Block>

      {/* 6. PHOTO — Timeline & Schedule Planning */}
      <Block
        type="photo"
        image={IMG_TIMELINE}
        imageAlt="Wedding day timeline"
        kicker="03"
        headline="Timeline & Schedule Planning"
        copy="Run the day like a director — with an intuitive builder that keeps every moment smooth, stylish, and on time."
        staggerIndex={0}
      >
        <BulletList
          items={["Visual timeline builder", "Vendor coordination", "Seamless day-of rundown"]}
          textColor="#FFFFFF"
          hairline="rgba(255,255,255,0.2)"
        />
      </Block>

      {/* 7. WHITE — Collaborative Playlists */}
      <Block
        type="white"
        kicker="04"
        headline="Collaborative Playlists"
        copy="Curate the ultimate wedding soundtrack — and let your guests be part of the vibe."
        staggerIndex={1}
      >
        <BulletList
          items={["Spotify integration", "Guest song suggestions", "DJ collaboration tools"]}
          textColor="#0A0A0A"
          hairline="rgba(10,10,10,0.1)"
        />
      </Block>

      {/* 8. BLACK — "37 planning tools. One platform." */}
      <Block
        type="black"
        headline="37 planning tools."
        copy="One platform."
        align="center"
        staggerIndex={0}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ApplePillButton onClick={() => { window.location.href = '/Features'; }}>
            Explore all features
          </ApplePillButton>
        </div>
      </Block>

      {/* 9. PHOTO — Universes intro */}
      <Block
        type="photo"
        image={IMG_UNIVERSES}
        imageAlt="A wedding universe"
        headline="Universes"
        copy="Choose your aesthetic universe. Every invitation, asset and piece of design follows a single visual vision — from your Save the Date to your Thank You Notes. 9 universes, 10 pieces each."
        align="center"
        staggerIndex={1}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ApplePillButton onClick={handleCTA}>Get started</ApplePillButton>
        </div>
      </Block>

      {/* 10. WHITE — Universes feature grid */}
      <div id="section-invitations">
        <Block type="white" staggerIndex={0}>
          <FeatureRows rows={UNIVERSE_FEATURES} textColor="#0A0A0A" hairline="rgba(10,10,10,0.1)" />
        </Block>
      </div>

      {/* 11. RED — the one accent block on the page */}
      <Block
        type="red"
        headline="AI meets I Do. Say hello to Ava."
        align="center"
        staggerIndex={1}
      />

      {/* 12. WHITE — Ava detail */}
      <Block
        type="white"
        copy="Ava learns your style, your budget, and your vision — then helps you make smarter decisions at every step. From vendor suggestions to seating optimisation, she's always one step ahead."
        staggerIndex={0}
      >
        <FeatureRows rows={AVA_ROWS} textColor="#0A0A0A" hairline="rgba(10,10,10,0.1)" />
      </Block>

      {/* 13. BLACK — pricing */}
      <div id="section-pricing">
        <Block
          type="black"
          headline="Go All In – $79"
          copy="Unlock the full experience. One-time payment, lifetime access. Everything you need. Nothing you don't."
          staggerIndex={1}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <ApplePillButton onClick={handleCTA}>Get started</ApplePillButton>
            <SeePricingButton />
          </div>
        </Block>
      </div>

      {/* 14. PHOTO — final CTA */}
      <Block
        type="photo"
        image={IMG_FINAL_CTA}
        imageAlt="Wedding moment"
        headline="Your wedding deserves this."
        staggerIndex={0}
      />

      {/* FOOTER */}
      <PublicFooter />
    </div>
  );
}
