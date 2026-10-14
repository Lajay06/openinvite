/**
 * src/pages/professional/ProfessionalMarketing.jsx
 *
 * /professional, THE PAGE FOR PLANNERS. goals/2026-10-14-professional.md,
 * Marketing page. In the site's own grammar: full-bleed sections about 900px
 * tall, a photo or a solid ground edge to edge, the big headline, one red
 * pill call to action, and the product as live HTML cards (not screenshots)
 * over the ground. Photography from the owned Higgsfield set only.
 *
 * Behind the flag with everything else: ProfessionalRoot sends /professional
 * home while PROFESSIONAL is off.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { responsivePhoto } from '@/lib/marketingImage';
import { PLANS, PLAN_ORDER, usd, TALK_TO_US } from '@/lib/professionalPlans';
import { ROUTES } from '@/lib/professionalBrand';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProLogo } from '@/components/professional/ProShell';
import { PRO, PJS } from '@/components/professional/proTheme';

/** A partner code is a code, not shouting: rendered from a value, not written as text. */
const SAMPLE_CODE = 'HOLLY10';

const GUESTS_PHOTO = responsivePhoto('hf_20260903_230645_48b55428-c800-49a3-98eb-01afc61a473e_hnoru8', 2048);

export const COPY = {
  hero: 'Run every wedding from one place.',
  heroSub: 'A real run sheet, every vendor and every payment across all your events, and live guest numbers straight from your couples’ Openinvite.',
  cta: 'Start free for 14 days',
  ctaLine: '14 days, 2 events, every feature. No card to start.',
  runsheet: 'A run sheet that keeps up with the day.',
  runsheetSub: 'Every sheet from load-in to pack-down, in 15-minute rows. Shift everything after a speech that ran long. Clash and gap warnings before they cost you. Each vendor gets their own sheet by private link.',
  guests: 'Your couples send the invitations. You see who’s coming.',
  guestsSub: 'When a couple links their Openinvite, their replies, meals, dietary needs and tables arrive in your Guests panel, live. Never their guests’ emails, phones or addresses. One click makes the caterer sheet.',
  events: 'Every event, one screen.',
  eventsSub: 'Days to go, who’s coming, overdue tasks and the next payment, for every wedding you’re running. Filter by planner and month. Spot the double booking before it happens.',
  codes: 'Your couples save 10%. You earn credit.',
  codesSub: 'Every workspace gets a partner code. A couple who buys Openinvite with it saves 10% on Pro or Ultra, and you earn US$20 or US$50 off your Professional bill.',
  pricing: 'Pricing for planners who book a year ahead.',
  end: 'Your next wedding, sorted from one place.',
};

function Section({ ground = '#0A0A0A', photo = null, children, minHeight }) {
  const mobile = useIsMobile();
  return (
    <section style={{ position: 'relative', minHeight: minHeight ?? (mobile ? 'auto' : 900), background: ground, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      {photo && (
        <>
          <img src={photo.src} srcSet={photo.srcSet} sizes="100vw" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.35) 60%, rgba(10,10,10,0.2) 100%)' }} />
        </>
      )}
      <div style={{ position: 'relative', width: '100%', maxWidth: 1240, margin: '0 auto', padding: mobile ? '72px 16px' : '96px 32px' }}>{children}</div>
    </section>
  );
}

function Headline({ children, dark = true, sub }) {
  const mobile = useIsMobile();
  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={{ fontSize: mobile ? 36 : 60, lineHeight: 1.05, fontWeight: 700, margin: 0, color: dark ? '#FFFFFF' : PRO.text }}>{children}</h2>
      {sub && <p style={{ fontSize: mobile ? 16 : 19, lineHeight: 1.5, margin: '20px 0 0', color: dark ? 'rgba(255,255,255,0.82)' : 'rgba(10,10,10,0.7)' }}>{sub}</p>}
    </div>
  );
}

const Cta = ({ label = COPY.cta }) => (
  <Link to={ROUTES.start} style={{ display: 'inline-block', marginTop: 32, background: PRO.red, color: '#FFFFFF', borderRadius: 999, padding: '14px 28px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>{label}</Link>
);

/** A product card in HTML, the way the rest of the site shows the product. */
const Card = ({ children, width = 520, style }) => (
  <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.08)', width: '100%', maxWidth: width, color: PRO.text, fontSize: 13, ...style }}>{children}</div>
);
const Row = ({ cells, head = false }) => (
  <div style={{ display: 'grid', gridTemplateColumns: cells.map((c) => c[1] || '1fr').join(' '), gap: 8, padding: '0 14px', minHeight: head ? 30 : 38, alignItems: 'center', borderBottom: '1px solid rgba(10,10,10,0.06)', background: head ? '#FAFAFA' : '#FFFFFF', fontSize: head ? 11 : 13, fontWeight: head ? 600 : 400, color: head ? 'rgba(10,10,10,0.6)' : PRO.text }}>
    {cells.map((c, i) => <span key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c[0]}</span>)}
  </div>
);
const Tag = ({ tone, children }) => {
  const t = { good: ['#dcfce7', '#166534'], wait: ['#fef9c3', '#854d0e'], bad: ['#fee2e2', '#991b1b'] }[tone] || ['rgba(10,10,10,0.06)', PRO.text];
  return <span style={{ background: t[0], color: t[1], borderRadius: 999, fontSize: 10, fontWeight: 600, padding: '2px 7px' }}>{children}</span>;
};

export default function ProfessionalMarketing() {
  const mobile = useIsMobile();
  const sideBySide = { display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 32 : 56, alignItems: mobile ? 'stretch' : 'center', justifyContent: 'space-between' };

  return (
    <div style={{ fontFamily: PJS, background: '#0A0A0A' }}>
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mobile ? '0 16px' : '0 32px' }}>
        <ProLogo size={20} />
        <Link to={`/login?next=${encodeURIComponent(ROUTES.app)}`} style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </header>

      <Section>
        <div style={sideBySide}>
          <div>
            <h1 style={{ fontSize: mobile ? 42 : 76, lineHeight: 1.02, fontWeight: 700, margin: 0, color: '#FFFFFF', maxWidth: 760 }}>{COPY.hero}</h1>
            <p style={{ fontSize: mobile ? 17 : 21, lineHeight: 1.5, margin: '24px 0 0', color: 'rgba(255,255,255,0.82)', maxWidth: 620 }}>{COPY.heroSub}</p>
            <Cta />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '14px 0 0' }}>{COPY.ctaLine}</p>
          </div>
        </div>
      </Section>

      <Section ground="#FFFFFF">
        <div style={sideBySide}>
          <Headline dark={false} sub={COPY.runsheetSub}>{COPY.runsheet}</Headline>
          <Card>
            <Row head cells={[['Time', '70px'], ['Item'], ['Who', '120px'], ['', '60px']]} />
            {[['4:00 pm', 'Ceremony', 'Sam', 'Done', 'good'], ['4:30 pm', 'Confetti and group photo', 'Lena Cho Photo', 'Next', 'wait'], ['5:00 pm', 'Canapes and cocktails', 'Fig and Salt', ''], ['6:00 pm', 'Guests seated', 'Jo', ''], ['6:30 pm', 'Couple entrance', 'North Bay Sound', ''], ['8:15 pm', 'Speeches', 'Sam', '']].map(([t, i, w, st, tone]) => (
              <Row key={t} cells={[[t, '70px'], [i], [w, '120px'], [st ? <Tag tone={tone}>{st}</Tag> : '', '60px']]} />
            ))}
            <div style={{ padding: '10px 14px', fontSize: 12, color: '#854d0e', background: '#fef9c3' }}>Gap: nothing runs from 7:00 pm to 8:15 pm on Reception.</div>
          </Card>
        </div>
      </Section>

      <Section photo={GUESTS_PHOTO}>
        <div style={sideBySide}>
          <Headline sub={COPY.guestsSub}>{COPY.guests}</Headline>
          <Card width={420}>
            <div style={{ padding: '14px 14px 6px', fontWeight: 600 }}>Live from Maya and Theo&apos;s Openinvite</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(10,10,10,0.06)', margin: '8px 0' }}>
              {[['Coming', '112'], ['Waiting', '21'], ['Not coming', '7']].map(([l, n]) => (
                <div key={l} style={{ background: '#FFFFFF', padding: '10px 14px' }}><div style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontWeight: 600 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div></div>
              ))}
            </div>
            <Row head cells={[['Guest'], ['Meal', '90px'], ['Table', '70px']]} />
            {[['Ava Chen', 'Salmon', 'Table 1'], ['Nina Patel, vegetarian', 'Risotto', 'Table 2'], ['Rosa Diaz, gluten free', 'Salmon', 'Table 3']].map(([g, m, t]) => <Row key={g} cells={[[g], [m, '90px'], [t, '70px']]} />)}
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>No emails, phones or addresses. Ever.</div>
          </Card>
        </div>
      </Section>

      <Section>
        <div style={sideBySide}>
          <Headline sub={COPY.eventsSub}>{COPY.events}</Headline>
          <Card width={560}>
            <Row head cells={[['Couple'], ['Date', '90px'], ['Guests', '80px'], ['Next payment', '110px']]} />
            {[['Maya and Theo', '7 Nov', '112 / 21', 'US$6,400'], ['Priya and Jordan', '7 Nov', '58 / 12', 'US$3,700'], ['Ana and Luis', '21 Dec', '140 / 40', 'US$2,500'], ['Grace and Owen', '18 Apr', 'Not linked', '']].map(([c, d, g, p]) => <Row key={c} cells={[[c], [d, '90px'], [g, '80px'], [p, '110px']]} />)}
            <div style={{ padding: '10px 14px', fontSize: 12, color: '#854d0e', background: '#fef9c3' }}>7 Nov: Maya and Theo and Priya and Jordan are on the same day.</div>
          </Card>
        </div>
      </Section>

      <Section ground="#FFFFFF">
        <div style={sideBySide}>
          <Headline dark={false} sub={COPY.codesSub}>{COPY.codes}</Headline>
          <Card width={380}>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)' }}>Your code</div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{SAMPLE_CODE}</div>
            </div>
            <Row head cells={[['Who'], ['Credit', '70px'], ['', '70px']]} />
            {[['a couple, Ultra, 3 Nov', 'US$50', 'Pending', 'wait'], ['a couple, Pro, 12 Oct', 'US$20', 'Earned', 'good']].map(([w, c, st, tone]) => <Row key={w} cells={[[w], [c, '70px'], [<Tag key="t" tone={tone}>{st}</Tag>, '70px']]} />)}
          </Card>
        </div>
      </Section>

      <Section minHeight={mobile ? 'auto' : 900}>
        <div style={{ width: '100%' }}>
          <Headline>{COPY.pricing}</Headline>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginTop: 40 }}>
            {PLAN_ORDER.map((k) => {
              const p = PLANS[k];
              return (
                <div key={k} style={{ background: '#FFFFFF', padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 34, fontWeight: 700 }}>{usd(p.monthly)}<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(10,10,10,0.6)' }}> a month</span></div>
                  <div style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)' }}>or {usd(p.yearly)} a year, 2 months free</div>
                  <div style={{ fontSize: 15, marginTop: 8 }}>{p.events} weddings at once</div>
                  <div style={{ fontSize: 15 }}>{p.seats === Infinity ? 'Unlimited team seats' : p.seats === 1 ? 'Just you' : `${p.seats} team seats`}</div>
                  {p.branding && <div style={{ fontSize: 15 }}>Your branding on vendor sheets and couple invites</div>}
                </div>
              );
            })}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 16 }}>{TALK_TO_US} Prices in US dollars.</p>
        </div>
      </Section>

      <Section minHeight={mobile ? 'auto' : 600}>
        <div style={{ textAlign: mobile ? 'left' : 'center', width: '100%' }}>
          <h2 style={{ fontSize: mobile ? 36 : 60, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{COPY.end}</h2>
          <Cta />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '14px 0 0' }}>{COPY.ctaLine}</p>
        </div>
      </Section>

      <footer style={{ padding: mobile ? '24px 16px' : '32px', borderTop: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>Openinvite Professional</span>
        <Link to="/privacy-policy" style={{ color: 'inherit' }}>Privacy</Link>
        <Link to="/terms-of-service" style={{ color: 'inherit' }}>Terms</Link>
        <a href="mailto:hello@openinvite.com.au" style={{ color: 'inherit' }}>hello@openinvite.com.au</a>
      </footer>
    </div>
  );
}
