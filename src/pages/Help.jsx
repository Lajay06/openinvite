import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Sparkles, Globe, Mail, Users, Wallet } from 'lucide-react';
import { interactiveDivProps } from '@/lib/a11y';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const ICON_MAP = { LayoutDashboard, Sparkles, Globe, Mail, Users, Wallet };

const S = {
  h3: { fontSize: 16, fontWeight: 700, color: '#0A0A0A', marginTop: 28, marginBottom: 10, fontFamily: 'Plus Jakarta Sans, sans-serif' },
  p: { fontSize: 15, color: '#333', lineHeight: 1.8, marginTop: 0, marginBottom: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' },
  li: { fontSize: 15, color: '#333', lineHeight: 1.8, marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' },
  ol: { paddingLeft: 20, marginTop: 0, marginBottom: 14 },
  ul: { paddingLeft: 20, marginTop: 0, marginBottom: 14 },
  tip: { background: '#FAFAFA', borderLeft: '3px solid #E03553', padding: 16, marginTop: 24, marginBottom: 8 },
  tipText: { fontSize: 13, color: '#555', margin: 0, lineHeight: 1.7, fontFamily: 'Plus Jakarta Sans, sans-serif' },
};

const ARTICLES = {
  'How to complete your onboarding': (
    <div>
      <p style={S.p}>Onboarding is a step-by-step conversational flow that collects your key wedding details and sets up your account. It takes about 3–5 minutes.</p>
      <h3 style={S.h3}>The steps</h3>
      <ol style={S.ol}>
        <li style={S.li}><strong>Enter your names</strong> — Partner 1 and Partner 2 first names. These appear across your guest suite, your invitation, your emails, and all personalized content.</li>
        <li style={S.li}><strong>Set your wedding date</strong> — Use the date picker to select your date. This drives your countdown timer, checklist deadlines, and Ava's timeline suggestions.</li>
        <li style={S.li}><strong>Add your venue</strong> — Search using Google Places to find your ceremony venue. Start typing and select from the dropdown. The address auto-fills.</li>
        <li style={S.li}><strong>Guest count</strong> — Choose Intimate (under 50), Celebration (50–150), or Grand (150+), then enter your specific number. This helps Ava calibrate your budget and checklist.</li>
        <li style={S.li}><strong>Wedding style</strong> — Select as many style tags as apply: Traditional, Modern, Bohemian, Luxury, and so on. These inform Ava's suggestions throughout.</li>
        <li style={S.li}><strong>What matters most</strong> — Choose the features most important to you: Guest Management, Budget, Invitations, Music, Vendors, or All of it. Openinvite prioritises these in your dashboard.</li>
        <li style={S.li}><strong>Meet Ava</strong> — Your AI wedding specialist is introduced. Ava uses everything you've shared to personalize your experience from this point on.</li>
        <li style={S.li}><strong>Choose your universe</strong> — Select the aesthetic for your entire Guest Suite from 10 fully designed universes. Tap any card to preview the full experience before selecting.</li>
        <li style={S.li}><strong>Path A or B</strong> — Choose "Tell us more" to add guests, budget, vendors, and inspiration now, or "Get started" to go straight to your dashboard.</li>
      </ol>
      <div style={S.tip}><p style={S.tipText}><strong>Tip from Ava:</strong> You can update any of these details at any time from Event Details in the sidebar.</p></div>
    </div>
  ),
  'Setting up your Event Details': (
    <div>
      <p style={S.p}>Event Details is the master source of truth for your wedding. Any detail you enter here flows automatically to your guest suite, your emails, your checklist, and Ava's responses.</p>
      <h3 style={S.h3}>What lives in Event Details</h3>
      <ul style={S.ul}>
        <li style={S.li}>Partner names (drives all personalized content)</li>
        <li style={S.li}>Wedding date (drives countdown, checklist deadlines, Ava suggestions)</li>
        <li style={S.li}>Ceremony venue — search with Google Places, auto-fills address</li>
        <li style={S.li}>Ceremony time and dress code</li>
        <li style={S.li}>Reception venue and time</li>
        <li style={S.li}>Guest count and type (Intimate / Celebration / Grand)</li>
        <li style={S.li}>Wedding style tags</li>
        <li style={S.li}>Feature priorities</li>
      </ul>
      <h3 style={S.h3}>The Miscellaneous section</h3>
      <p style={S.p}>Collapsed by default, this contains:</p>
      <ul style={S.ul}>
        <li style={S.li}>Photography & videography preferences</li>
        <li style={S.li}>Ceremony details (celebrant, readings, vows notes)</li>
        <li style={S.li}>Catering and food details</li>
        <li style={S.li}>Florals and décor notes</li>
        <li style={S.li}>Entertainment preferences</li>
        <li style={S.li}>Transport and logistics</li>
        <li style={S.li}>Additional events (rehearsal, welcome dinner)</li>
      </ul>
      <h3 style={S.h3}>How to save</h3>
      <p style={S.p}>Changes auto-save after 1.5 seconds. You'll see "Saving..." then "Saved ✓" in the top bar.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Important:</strong> Never enter venue details by typing them manually — always use the Google Places search so the address, coordinates, and place ID are saved correctly. This enables map embeds in your guest suite.</p></div>
    </div>
  ),
  'Understanding the dashboard': (
    <div>
      <p style={S.p}>The dashboard (Overall) gives you a live snapshot of your wedding planning status.</p>
      <h3 style={S.h3}>What you'll see</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Total guests / Attending</strong> — pulled live from your Guest List</li>
        <li style={S.li}><strong>Budget used</strong> — your spend as a percentage of your total budget</li>
        <li style={S.li}><strong>Events planned</strong> — calendar events count</li>
      </ul>
      <p style={S.p}>A row of quick links below the stats takes you straight to Guest List, Budget, Schedule, Vendors, Registry, or Seating.</p>
      <h3 style={S.h3}>Below that</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Left:</strong> your RSVP chart and budget summary</li>
        <li style={S.li}><strong>Right:</strong> upcoming tasks and recent activity</li>
      </ul>
      <h3 style={S.h3}>The sidebar organizes everything into groups</h3>
      <ul style={S.ul}>
        <li style={S.li}><strong>Design studio</strong> — a standalone link at the top: your website, Guest Suite, and Ava's Studio</li>
        <li style={S.li}><strong>Planning:</strong> Daily update, Overall, Schedule, To do</li>
        <li style={S.li}><strong>Guests:</strong> Guest list, Messages, Seating, Wedding party</li>
        <li style={S.li}><strong>Style & experience:</strong> Moodboard, Styling, Beauty, Food & beverage, Music, Photography, Vows & speeches, Guest gifts, Polls & games</li>
        <li style={S.li}><strong>Vendors:</strong> My vendors, Marketplace</li>
        <li style={S.li}><strong>On the day:</strong> Ceremony details, Getting here, Stay, Emergency contact</li>
        <li style={S.li}><strong>Finances:</strong> Budget, Registry</li>
        <li style={S.li}><strong>Guest Suite:</strong> Schedule, Q&A, Registry, Stay, Getting here, Experience guide, Good to know, Guest polls</li>
        <li style={S.li}><strong>Extras:</strong> Honeymoon, Considerations</li>
      </ul>
      <p style={S.p}>At the bottom of the sidebar: Account settings, Collaborate, Studio tour, Help center, Leave dashboard.</p>
    </div>
  ),
  'Inviting a collaborator': (
    <div>
      <p style={S.p}>Collaborate lets you show your wedding plans to someone else, such as your partner, a wedding planner or a family member. They sign in with their own account and can view the pages you choose. They cannot change anything.</p>
      <h3 style={S.h3}>How to add a collaborator</h3>
      <ol style={S.ol}>
        <li style={S.li}>Click "Collaborate" in the sidebar</li>
        <li style={S.li}>Enter their name and email address</li>
        <li style={S.li}>Under "Pages they can view", tick "View only" for each page you want them to see</li>
        <li style={S.li}>Click "Send Invite". They get an email with a link to join</li>
      </ol>
      <h3 style={S.h3}>What collaborators can do</h3>
      <ul style={S.ul}>
        <li style={S.li}>View the pages you chose, showing your current plans</li>
        <li style={S.li}>Nothing more: they cannot add, edit or delete anything, and Ava is not available to them</li>
        <li style={S.li}>Their own Help and Account pages stay their own</li>
      </ul>
      <h3 style={S.h3}>Notes</h3>
      <ul style={S.ul}>
        <li style={S.li}>Collaborators sign in with their own account. They never share your password</li>
        <li style={S.li}>An invite link works for 7 days. Sending the invite again replaces the old link</li>
        <li style={S.li}>To remove someone, click the bin next to their name in Collaborate. They lose access straight away</li>
        <li style={S.li}>To change which pages they can view, click the pencil next to their name</li>
        <li style={S.li}>Billing and plan settings stay with your account</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> If you're working with a wedding planner, choose the pages they need to see, such as My vendors, Schedule and Guest list.</p></div>
    </div>
  ),
  'Managing notification preferences': (
    <div>
      <p style={S.p}>Control what Openinvite emails you and what just shows up in the bell, from Account → Notifications.</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Instant email on RSVP</strong> — get emailed as soon as a guest responds</li>
        <li style={S.li}><strong>Instant email on collaborator activity</strong> — get emailed when a collaborator joins or makes changes</li>
        <li style={S.li}><strong>Weekly digest</strong> — a weekly summary of RSVPs, tasks and activity</li>
        <li style={S.li}><strong>In-app only</strong> — turn off every email above; you'll still see it all in the bell</li>
      </ul>
      <div style={S.tip}><p style={S.tipText}>Turning on "In-app only" doesn't turn off notifications — it just keeps them out of your inbox.</p></div>
    </div>
  ),
  'Your weekly digest email': (
    <div>
      <p style={S.p}>If Weekly digest is on (Account → Notifications), you'll get one email a week summarising new RSVPs, upcoming tasks, and recent activity — a quick way to stay on top of planning without checking the dashboard every day.</p>
      <p style={S.p}>Every digest links straight back to the relevant page, so you can go from "3 new RSVPs" in your inbox to the guest list in one click.</p>
      <div style={S.tip}><p style={S.tipText}><strong>Tip:</strong> Turn this off from Account → Notifications, or from the "Manage this" link at the bottom of any digest email.</p></div>
    </div>
  ),
};

const helpCategories = [
  {
    icon: 'LayoutDashboard',
    title: 'Getting Started',
    description: 'Your first steps with Openinvite',
    articles: [
      { title: 'How to complete your onboarding', time: '2 min read' },
      { title: 'Setting up your Event Details', time: '3 min read' },
      { title: 'Understanding the dashboard', time: '2 min read' },
      { title: 'Inviting a collaborator', time: '1 min read' },
      { title: 'Managing notification preferences', time: '1 min read' },
      { title: 'Your weekly digest email', time: '1 min read' },
    ]
  },
  {
    icon: 'Sparkles',
    title: 'Ava & AI Features',
    description: 'Get the most from your AI specialist',
    articles: [
      { title: 'What is Ava and what can Ava do?', time: '3 min read' },
      { title: "Using Ava's Studio step-by-step", time: '5 min read' },
      { title: 'Auto-filling your website with Ava', time: '2 min read' },
      { title: "Ava's vow writing assistant", time: '3 min read' },
    ]
  },
  {
    icon: 'Globe',
    title: 'Website builder',
    description: 'Build and publish your guest suite',
    articles: [
      { title: 'Adding sections to your website', time: '3 min read' },
      { title: 'Choosing a theme and typography', time: '2 min read' },
      { title: 'Setting up your RSVP page', time: '4 min read' },
      { title: 'Publishing and sharing your site', time: '2 min read' },
    ]
  },
  {
    icon: 'Mail',
    title: 'Guest Suite',
    description: 'Everything your guests see',
    articles: [
      { title: 'What is the Guest Suite?', time: '2 min read' },
      { title: 'Choosing and switching universes', time: '3 min read' },
    ]
  },
  {
    icon: 'Users',
    title: 'Guest Management',
    description: 'Managing your RSVPs and seating',
    articles: [
      { title: 'Importing guests from a spreadsheet', time: '3 min read' },
      { title: 'Tracking RSVPs and responses', time: '2 min read' },
      { title: 'Setting up your seating chart', time: '4 min read' },
      { title: 'Sending emails to your guest list', time: '3 min read' },
      { title: 'Secret questionnaires and games', time: '2 min read' },
      { title: 'Building your run sheet', time: '2 min read' },
    ]
  },
  {
    icon: 'Wallet',
    title: 'Budget & Vendors',
    description: 'Keeping your finances on track',
    articles: [
      { title: 'Setting up your wedding budget', time: '2 min read' },
      { title: 'Adding and tracking vendors', time: '3 min read' },
      { title: 'Recording payments and deposits', time: '2 min read' },
      { title: 'Using the budget breakdown view', time: '2 min read' },
      { title: 'Forecasting your budget', time: '1 min read' },
    ]
  },
];

function ArticlePanel({ article, onClose }) {
  const content = ARTICLES[article.title];
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" title={article.title} aria-label={article.title} className="p-0" style={{ width: 520, maxWidth: '100vw' }}>
        <div style={{ padding: '32px 36px', overflowY: 'auto', boxSizing: 'border-box', height: '100%' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(10,10,10,0.6)', marginBottom: 24, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'block', padding: 0 }}>← Back to Help Center</button>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', marginBottom: 4, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>{article.title}</h2>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', marginBottom: 32, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 4 }}>{article.time}</p>
          <div style={{ fontSize: 15, color: '#333', lineHeight: 1.8, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {content || (
              <p style={S.p}>Content for this article is coming soon.</p>
            )}
          </div>
          <div style={{ borderTop: '1px solid #EEEEEE', marginTop: 40, paddingTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Was this helpful?</p>
            <button style={{ padding: '6px 16px', border: '1px solid #EEEEEE', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Yes</button>
            <button style={{ padding: '6px 16px', border: '1px solid #EEEEEE', background: 'transparent', color: '#444', fontSize: 13, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No</button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;
    const q = searchQuery.toLowerCase();
    return helpCategories.map(cat => ({
      ...cat,
      articles: cat.articles.filter(a => a.title.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)),
    })).filter(cat => cat.articles.length > 0);
  }, [searchQuery]);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{
        width: '100%', height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingLeft: 32, paddingRight: 32, boxSizing: 'border-box', position: 'relative',
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          Help center
        </span>
      </div>
      <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Guides, tutorials, and FAQs</span>
      </div>

      <div style={{ padding: '40px 40px 80px', maxWidth: 1100, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 600, margin: '0 auto 48px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', marginBottom: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>How can we help?</h2>
          <p style={{ fontSize: 15, color: 'rgba(10,10,10,0.6)', marginBottom: 24 }}>Search our guides, tutorials, and FAQs</p>
          <div style={{ position: 'relative' }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              style={{ width: '100%', border: '1px solid #EEEEEE', padding: '14px 20px 14px 44px', fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#FAFAFA', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            />
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(10,10,10,0.45)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
          {filteredCategories.map((cat, ci) => {
            const Icon = ICON_MAP[cat.icon];
            return (
              <div
                key={ci}
                style={{ border: '1px solid #EEEEEE', padding: 24, background: '#FFFFFF', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0A0A0A'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#EEEEEE'}
              >
                <div style={{ marginBottom: 12, color: '#E03553' }}>
                  {Icon && <Icon size={20} strokeWidth={1.5} />}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 4, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>{cat.title}</p>
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', marginBottom: 20, fontFamily: 'Plus Jakarta Sans, sans-serif', marginTop: 0 }}>{cat.description}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {cat.articles.map((article, ai) => (
                    <div
                      key={ai}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #F5F5F5', cursor: 'pointer' }}
                      onClick={() => setSelectedArticle({ ...article, category: cat.title })}
                      {...interactiveDivProps(() => setSelectedArticle({ ...article, category: cat.title }))}
                    >
                      <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }}>{article.title}</span>
                      <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', whiteSpace: 'nowrap', marginLeft: 8 }}>{article.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {selectedArticle && (
        <ArticlePanel article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </div>
  );
}