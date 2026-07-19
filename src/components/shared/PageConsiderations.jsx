import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const CONSIDERATIONS = {
  beauty: [
    {
      id: 'b1',
      title: 'Booking your hair and makeup team',
      tag: 'Book early',
      body: [
        'Top hair and makeup artists book out 12–18 months in advance for peak wedding season. Unlike most vendors, beauty artists can only work one wedding per day — they cannot be shared. If you have a large bridal party, you may need multiple artists to keep your getting-ready schedule realistic.',
        'Always ask to see their wedding portfolio specifically — editorial and fashion work requires different skills than bridal.',
      ],
      tips: [
        'Book a trial before committing to any artist',
        'Ensure they have experience with your skin tone and hair type',
        'Ask specifically if they can do airbrush foundation and if they carry touch-up kits',
      ],
      why: 'Your face is in every photo from your wedding day. This is not the place to compromise on experience or chemistry.',
    },
    {
      id: 'b2',
      title: 'The getting ready timeline',
      tag: 'Day of',
      body: [
        'Getting ready almost always takes longer than planned. Calculate your getting ready time by counting every person who needs hair or makeup, then allocating: 60–90 minutes for the bride, 45–60 minutes for bridesmaids hair, 30–45 minutes for makeup each. Add 30 minutes buffer.',
        'Work backwards from your ceremony time, minus travel time, minus photography time (photographers typically want 30–45 minutes of getting ready shots).',
      ],
      tips: [
        'Ensure the getting ready space has good natural light for photos',
        'Have a dedicated mirror and good lighting for the artist',
        'Order breakfast and keep snacks available',
      ],
      why: 'A delayed getting ready schedule cascades through the entire day.',
    },
    {
      id: 'b3',
      title: 'Your hair and makeup trial',
      tag: 'Essential',
      body: [
        'A trial is not optional — it is essential. Book it 6–8 weeks before the wedding when your hair is in the condition it will be on the day. Wear a top that opens at the front so you can see the full effect without disturbing the hair when you remove it. Bring your veil, headpiece, and any hair accessories.',
        'Take photos in different lighting including outdoor light. Test how it holds by wearing it for the rest of the day.',
      ],
      tips: [
        'Book the trial for a day you have plans so you can test longevity',
        'Bring photos of your dress neckline — the hairstyle should complement it',
        'Note the exact products used so they can be replicated on the day',
      ],
      why: "The day before your wedding is too late to discover the look doesn't work. The trial is your dress rehearsal.",
    },
    {
      id: 'b4',
      title: 'Skincare in the lead-up',
      tag: 'Plan ahead',
      body: [
        'Your skin on your wedding day is the result of months of care, not what you do the week before. Start a consistent skincare routine at least 6 months before the wedding. If you want to try any new treatments — chemical peels, laser, microneedling — do them 3–6 months ahead to allow full recovery and results.',
        'In the final month before the wedding, introduce nothing new to your skincare routine. Your skin needs to be in its most familiar, stable state.',
      ],
      tips: [],
      why: 'Reactions, breakouts, or unexpected results from new products have no recovery time if they happen close to the wedding.',
    },
    {
      id: 'b5',
      title: 'Makeup longevity and weather',
      tag: 'Day of',
      body: [
        'Wedding days are long — often 12+ hours from getting ready to the end of the reception. Your makeup needs to last the entire time. Discuss this specifically with your artist: primer, setting spray, and powder are essential.',
        'In hot or humid weather, sweat-proof formulas and minimal eye makeup reduce the risk of creasing. In cold weather, skin can look more grey — ask your artist about warmth in the foundation and blush. Ask your artist to prepare a touch-up kit: powder, blush, lipstick, and setting spray in a small bag you can keep in your clutch.',
      ],
      tips: [],
      why: 'You will be photographed, hugged, kissed, and exposed to weather all day. Your makeup should be built to last.',
    },
    {
      id: 'b6',
      title: 'The wedding party brief',
      tag: 'Guest experience',
      body: [
        'Brief your bridal party on the getting ready schedule well in advance. Confirm who is getting hair only, makeup only, or both. Share the schedule so everyone knows their slot. Ask them to arrive with clean, dry hair and moisturised skin.',
        'If anyone has allergies to specific products or ingredients, tell your artist in advance. Confirm dress code for getting ready — robes or button-front shirts photograph beautifully and preserve the hair.',
      ],
      tips: [],
      why: 'A well-briefed bridal party means no late arrivals and no surprises for your artist.',
    },
    {
      id: 'b7',
      title: "Men's grooming",
      tag: 'Often forgotten',
      body: [
        'Grooms and groomsmen often overlook grooming preparation. Recommend: a fresh haircut 1–2 weeks before (not the day before — hair needs to settle), beard trim 3–5 days before, facial if desired 1–2 weeks before, skincare in the weeks leading up for a healthy glow in photos.',
        'For the groom specifically, a professional grooming session on the morning of the wedding is worth considering — many barbers offer wedding day services.',
      ],
      tips: [],
      why: 'Grooms are in as many photos as brides. A little preparation makes a visible difference.',
    },
  ],

  music: [
    {
      id: 'm1',
      title: 'Booking your DJ or band',
      tag: 'Book early',
      body: [
        'Popular DJs and bands book out 9–12 months ahead for peak wedding season, and a band even earlier since group availability is harder to line up. Ask what happens if a band member is sick — is there a substitute, or does the lineup change on the day? Get every inclusion in writing: hours of coverage, MC duties, lighting, and overtime rates.',
        'Watch them perform live if you can, not just a demo reel — a demo shows their best moment, not how they read and adapt to an actual room.',
      ],
      tips: [
        'Ask for a full "do not play" list option, not just requests',
        'Confirm who acts as MC for announcements — DJ, band, or a nominated friend',
        'Check their setup and pack-down time against your venue\'s access window',
      ],
      why: 'Music sets the emotional pace of the whole day — a mismatch between what you booked and what shows up is hard to recover from in the moment.',
    },
    {
      id: 'm2',
      title: 'Building playlists by moment',
      tag: 'Plan ahead',
      body: [
        'Different parts of the day call for different music, and it helps your DJ or band to have them separated rather than one long list: ceremony (processional, signing, recessional), cocktail hour (background, conversational), dinner (low-key, not competing with speeches), and dancing (the songs that actually fill the floor).',
        'A handful of "must-play" and "must-not-play" songs, plus your first dance and any parent dances, matters far more to your vendor than a 200-song wishlist — give them the moments that need a specific song, and trust them with the rest.',
      ],
      tips: [
        'Pick your first dance, parent dances, and processional song early — everything else can wait',
        'Keep the "do not play" list short and specific, not a whole genre ban',
      ],
      why: 'A DJ reading the room with a short, clear brief will fill a dance floor better than one working through an unstructured 200-song list.',
    },
    {
      id: 'm3',
      title: 'Guest song requests',
      tag: 'Guest experience',
      body: [
        'Letting guests suggest songs is a nice touch, but decide upfront whether every request gets played automatically or needs approval first — a request queue with no filter can pull the night in a direction you didn\'t plan for. If you enable requests, tell guests when they can expect them to be played (the DJ still runs the room, not a jukebox).',
      ],
      tips: [
        'Turn on approval if you want final say over what actually gets played',
        'Let guests know requests are welcomed but not guaranteed',
      ],
      why: 'An open request queue can crowd out the songs that actually matter to you if there\'s no approval step.',
    },
    {
      id: 'm4',
      title: 'Ceremony sound and timing',
      tag: 'Day of',
      body: [
        'Outdoor ceremonies especially need a real sound check — wind and open air swallow acoustic music fast. Confirm who is providing the sound system: your band/DJ, the venue, or a separate ceremony musician, and make sure they know your exact processional cues (when to start, how long the walk takes, when to swell for the entrance).',
      ],
      tips: [
        'Do a walk-through with whoever is playing the processional, timed to the actual aisle length',
        'For outdoor ceremonies, ask specifically about wind and how audio will carry',
      ],
      why: 'The processional only happens once — a music cue that starts too early or too late is one of the most noticeable things a guest will remember.',
    },
  ],

  photography: [
    {
      id: 'ph1',
      title: 'Shot list essentials',
      tag: 'Planning',
      body: [
        'A shot list gives your photographer the confidence to capture what matters most without guessing. The shots couples most regret missing: first look, ring detail close-up, dress hanging shot, getting ready candids, parent moments, ceremony details (florals, candles, order of service), and reception details before guests arrive.',
        'Family formals are a separate exercise — list every group you want. Allow 5–7 minutes per group. With 8 groups that is nearly an hour.',
      ],
      tips: [
        'Send your shot list at least 2 weeks before the wedding',
        'Brief a family member to round up people for formals so the photographer does not have to',
        'Mark your 5 absolute must-have shots in case of time pressure',
      ],
      why: "The shots you forget to request are the ones you'll miss most when the gallery arrives.",
    },
    {
      id: 'ph2',
      title: 'Golden hour timing',
      tag: 'Day of',
      body: [
        'Sunset light — the 30–45 minutes before the sun disappears — is the most flattering light of the day. Warm, soft, and directional, it makes ordinary locations look extraordinary.',
        'Confirm the exact sunset time for your date and location. Block 30 minutes exclusively for couple portraits during this window. Brief your MC to manage the reception timeline so you can slip away without guests noticing.',
      ],
      tips: [
        'Check sunset time at the exact location using a weather or photography sun calculator',
        'Communicate this plan to your MC at least a week before',
        'Keep the location close to your venue — every minute walking is a minute less shooting',
      ],
      why: 'Golden hour couple portraits are almost universally the most beautiful images from a wedding day. Protecting that window pays back many times over.',
    },
    {
      id: 'ph3',
      title: 'Photographer restrictions at your venue',
      tag: 'Logistics',
      body: [
        'Many venues have photography restrictions you will not discover until too late. Common restrictions include: no flash during the ceremony, designated positions only, no-go zones in sacred spaces, and in some religious venues, no photography during specific moments.',
        'Brief your photographer on any restrictions well before the day. Ideally they visit the venue or walk through virtually with you.',
      ],
      tips: [
        'Ask your venue coordinator for a written list of photography restrictions',
        'Share this list with your photographer as soon as you receive it',
        'If restrictions are severe, discuss how to adapt the shot list',
      ],
      why: 'Finding out about restrictions on the day means lost opportunities. Finding out early means creative solutions.',
    },
    {
      id: 'ph4',
      title: 'Second shooter decision',
      tag: 'Coverage',
      body: [
        'A second shooter provides simultaneous coverage of two locations or perspectives. Most valuable when: the ceremony and reception are in different locations, the wedding is over 80 guests, or you want both candid and portrait-focused coverage at the same moment.',
        'Second shooters typically add 30–50% to the photography cost but significantly increase the number and variety of images you receive.',
      ],
      tips: [
        'Ask whether the second shooter is a regular collaborator or a hired-in assistant',
        'Review the second shooter\'s own portfolio, not just the lead photographer\'s',
        'Confirm exactly what the second shooter will focus on',
      ],
      why: 'A second shooter is insurance against missed moments. For large or logistically complex weddings, it is rarely the wrong call.',
    },
    {
      id: 'ph5',
      title: 'Photo delivery timeline',
      tag: 'After the day',
      body: [
        'Typical turnaround: sneak peek gallery within 1–2 weeks, full edited gallery 6–12 weeks after the wedding. Confirm what is in your contract: minimum edited image count, delivery format (online gallery, USB, prints), and whether you have print rights.',
        'Some photographers retain copyright — confirm your rights to share, print, and post images before signing.',
      ],
      tips: [
        'Ask for the turnaround to be written into your contract',
        'Confirm the online gallery platform and how long images are hosted',
        'Discuss what happens if the turnaround runs longer than quoted',
      ],
      why: 'Unclear delivery expectations are one of the most common sources of post-wedding frustration. Get it in writing.',
    },
  ],

  vendors: [
    {
      id: 'v1',
      title: 'Reviewing vendor contracts',
      tag: 'Legal',
      body: [
        'Every vendor contract should clearly state: exactly what is included, total cost, payment schedule, cancellation terms on both sides, and what happens if the vendor cannot perform on the day.',
        'Pay particular attention to substitution clauses — some contracts allow vendors to send a replacement without your consent. If the specific person is the reason you booked, ensure the contract names that individual.',
      ],
      tips: [
        'Never pay a vendor in full before the event',
        'Ask vendors whether they carry their own cancellation insurance',
        "If anything concerns you, ask for the clause to be changed before signing",
      ],
      why: "Vendor contracts are your primary protection when things go wrong. Reading them carefully before signing is not pessimistic — it is professional.",
    },
    {
      id: 'v2',
      title: 'When to book each vendor',
      tag: 'Timing',
      body: [
        'Booking order matters because the most popular vendors fill first. As a rule: venue (immediately), photographer and videographer (within 1–2 months of date announcement), celebrant and catering (within 3 months), hair and makeup, florist, DJ or band (within 4 months), cake (within 6 months).',
        'For peak season dates, compress all timelines by at least two months.',
      ],
      tips: [
        'Confirm your date with a venue soft hold before announcing to family',
        'Book your most-wanted vendors even if other logistics are unresolved',
      ],
      why: "Your first-choice vendors have limited availability. Every week of indecision is a week another couple might book them.",
    },
    {
      id: 'v3',
      title: 'Comparing vendor quotes',
      tag: 'Budget',
      body: [
        'Comparing quotes across vendors is harder than it looks because inclusions vary dramatically. Before comparing prices, standardise what you are comparing: is travel included? Is a second person included? What are the hours of service? Are service charges extra?',
        'The lowest quote is rarely the best value once you account for what it excludes. Always ask vendors to itemise their quote.',
      ],
      tips: [
        "Build a comparison spreadsheet with consistent line items for each vendor category",
        "Ask every vendor 'What is NOT included in this quote?'",
        'Request references and follow up — online reviews can be incomplete',
      ],
      why: 'Choosing a vendor based on price alone without comparing inclusions leads to hidden costs and disappointed expectations.',
    },
    {
      id: 'v4',
      title: 'Vendor meals and logistics',
      tag: 'Day of',
      body: [
        'Vendors working long days need to be fed. Most catering contracts charge a vendor meal rate ($40–80 per head) for photographers, videographers, DJs, and coordinators present for more than 4 hours. This cost is often overlooked in the initial budget.',
        'Brief your venue coordinator on which vendors need meals, when they eat, and where they will be set up.',
      ],
      tips: [
        "Ask each vendor upfront if they require a meal — it's standard and expected",
        'Designate a vendor holding area near their workstations',
        'Include vendor meal count in your final catering number',
      ],
      why: 'A vendor who has not eaten for 8 hours is not performing at their best. A small cost produces a significant improvement in service quality.',
    },
    {
      id: 'v5',
      title: 'Managing vendor communications on the day',
      tag: 'Logistics',
      body: [
        'On the day itself, you should not be the vendor point of contact. Assign this role to a coordinator or trusted person. Provide them with a vendor contact sheet: every supplier\'s name, arrival time, phone number, and what they need on arrival.',
        'Send a consolidated briefing email two weeks before confirming arrival times, access, parking, and emergency contacts. Ask each vendor to confirm receipt.',
      ],
      tips: [
        'Give the vendor contact sheet to at least two people, not just one',
        'Confirm all vendors personally 48 hours before the wedding',
        'Have a backup plan for your two most critical vendors',
      ],
      why: 'Vendor logistics handled well are invisible. Handled poorly, they create chain reactions that affect the whole day.',
    },
  ],

  budget: [
    {
      id: 'bud1',
      title: 'Setting your total budget',
      tag: 'Finance',
      body: [
        'Before allocating anything, agree on a total number both partners are genuinely comfortable with — not an aspirational figure that assumes optimistic estimates. Venue and catering typically absorb 45–55% of a total wedding budget.',
        'Track every confirmed and estimated spend in a single place from day one. The most common cause of budget blowout is not one big decision — it is dozens of small incremental additions never counted together.',
      ],
      tips: [
        'Build a 10–15% contingency into your budget from the beginning',
        'Separate confirmed and estimated spend clearly',
        'Revisit your budget total every month as plans develop',
      ],
      why: 'Budget clarity at the beginning of planning prevents the financial stress that derails so many couples mid-engagement.',
    },
    {
      id: 'bud2',
      title: 'Deposits, payment schedules, and cancellation terms',
      tag: 'Finance',
      body: [
        'Most vendors require a deposit (typically 20–50% of total cost) to hold your date, with the balance due shortly before the wedding. Your total deposit commitments in the first three months of booking can be significant — plan for this cash flow.',
        "Read every cancellation clause before signing. What happens if you cancel? What if the vendor cancels? These clauses became more specific after COVID and are now more important to read.",
      ],
      tips: [
        'Map all deposit and payment due dates in a calendar',
        'Ask whether vendors carry cancellation insurance that protects your deposit',
        'Never pay the full amount in advance',
      ],
      why: 'Understanding your financial commitments before you sign protects you from significant losses if circumstances change.',
    },
    {
      id: 'bud3',
      title: 'Common hidden costs',
      tag: 'Finance',
      body: [
        'Wedding budgets are routinely underestimated because certain costs are easy to overlook. Most commonly missed: vendor meal allowances, gratuities and service charges, wedding night accommodation, rehearsal dinner, wedding party gifts, outfit alterations, and postage for invitations.',
        'Stationery costs are particularly easy to underestimate — design, printing, envelopes, and postage together can be several hundred dollars.',
      ],
      tips: [
        "Ask every vendor 'What is NOT included in this quote?'",
        'Create a running list of costs you forgot to budget for as you plan',
        'Factor in post-wedding expenses: thank-you cards, photo albums, dress preservation',
      ],
      why: "Hidden costs don't announce themselves. Hunting for them deliberately is the only way to avoid discovering them when it's too late to adjust.",
    },
    {
      id: 'bud4',
      title: 'Smart savings without compromising quality',
      tag: 'Finance',
      body: [
        'The highest-return areas to invest in: photography (you will look at it forever), food and drink (guests will talk about it), and music (it drives the atmosphere). These are not areas to economise heavily.',
        'Lower-risk areas to save: stationery (digital invitations are widely accepted), favours (most end up uncollected), and extensive florals (greenery and foliage are beautiful and far cheaper than blooms). A Friday or Sunday wedding can cost 15–30% less than Saturday.',
      ],
      tips: [
        'Ask vendors whether they offer off-peak pricing',
        'Repurpose ceremony florals at the reception',
        'Consider a smaller, more intentional guest list — per-head savings are significant',
      ],
      why: 'Knowing where quality genuinely matters and where it does not lets you allocate your budget where it will have the most impact.',
    },
    {
      id: 'bud5',
      title: 'Tracking and reporting',
      tag: 'Finance',
      body: [
        "A budget that is not tracked is not a budget — it is a wish. Review your actual vs budgeted spend at least once a month. When actual costs exceed estimates, the earlier you know, the more options you have.",
        'Keep receipts and invoices organised from the beginning. Post-wedding, you will need them if disputes arise.',
      ],
      tips: [
        'Designate one person to own the budget tracking',
        'Update your budget every time you sign a new contract or make a purchase',
        'Export and back up your budget spreadsheet regularly',
      ],
      why: 'Budget surprises are avoidable. Regular tracking converts surprises into decisions made in advance.',
    },
  ],

  guests: [
    {
      id: 'g1',
      title: 'Building your guest list',
      tag: 'Planning',
      body: [
        'The guest list is one of the most consequential decisions in wedding planning — it drives venue size, catering cost, and the intimacy of your celebration. Start by listing everyone both of you would genuinely want present, then apply a realistic budget filter.',
        'Create tiers: must-invite, should-invite, and would-be-nice-to-invite. This makes the conversation about cuts much easier.',
      ],
      tips: [
        'Decide on your plus-one policy before you start sending invitations',
        'Consider whether children are invited and communicate this consistently',
        'If a venue has a strict capacity, use that as a non-negotiable anchor for the conversation',
      ],
      why: 'Guest list conflicts are among the most common sources of wedding stress. A clear process prevents them.',
    },
    {
      id: 'g2',
      title: 'RSVP management',
      tag: 'Logistics',
      body: [
        'Your RSVP process is the first real logistical interaction guests have with your wedding. A clear, easy-to-use RSVP — ideally digital — with a firm deadline and a dietary requirements field will save you significant headaches.',
        'Set your RSVP deadline 3–4 weeks before your wedding day. Non-responders should be followed up personally — email is often ignored.',
      ],
      tips: [
        'Include your RSVP deadline clearly on the invitation',
        'Chase non-responders with a direct message, not email',
        'Collect dietary requirements in the RSVP, not at a later stage',
      ],
      why: 'Accurate final numbers affect catering costs, seating, and venue setup. A well-managed RSVP is foundational to everything else.',
    },
    {
      id: 'g3',
      title: 'Seating plan strategy',
      tag: 'Logistics',
      body: [
        "A seating plan for a large wedding is a significant undertaking — typically 2–4 hours of work once you have your final RSVPs. Start by grouping guests by relationship and then assign groups to tables.",
        'Avoid separating couples unless they prefer it. Seat elderly guests near exits and bathrooms. Think carefully about who you place at the bridal table — those guests will be less free to mingle.',
      ],
      tips: [
        'Use a digital seating tool rather than spreadsheets — swaps are much easier',
        'Print table numbers and escort cards as late as possible — last-minute changes happen',
        'Consider sight lines to the dance floor and speeches when planning table placement',
      ],
      why: 'A thoughtful seating plan transforms a room of acquaintances into a room of conversations.',
    },
    {
      id: 'g4',
      title: 'Dietary requirements',
      tag: 'Catering',
      body: [
        'Collecting dietary requirements is a basic responsibility of hospitality. Ask on your RSVP form and pass the consolidated list to your caterer at least 2 weeks before the event.',
        'For guests with severe allergies (nut, shellfish), confirm cross-contamination protocols with your caterer in writing. A verbal assurance is not enough.',
      ],
      tips: [
        "List dietary requirement options explicitly on the RSVP — don't leave it open-ended",
        'Follow up with guests who have severe allergies to confirm their needs are met',
        'Ensure serving staff know which dishes contain common allergens',
      ],
      why: 'Missing a dietary requirement is not just logistically inconvenient — for guests with serious allergies, it can be a health risk.',
    },
    {
      id: 'g5',
      title: 'Pre-wedding guest communications',
      tag: 'Guest care',
      body: [
        'Your guests need practical information well before the wedding day: venue address and directions, parking or transport options, accommodation suggestions, dress code, and what to expect from the day.',
        'A wedding website is the most efficient way to share this. Send the link with your invitation, and update it as logistics are confirmed.',
      ],
      tips: [
        'Include a FAQ section on your wedding website',
        "Send a 'getting there' guide to all guests one week before",
        'Nominate someone to be the guest contact on the day for queries',
      ],
      why: 'Guests who feel informed feel cared for. Clear pre-wedding communication is one of the highest-return investments of planning time.',
    },
  ],

  food: [
    {
      id: 'f1',
      title: 'Per person catering costs',
      tag: 'Budget',
      body: [
        'Catering is typically the largest single line item after the venue. Realistic per-person ranges: $80–120 budget, $120–180 mid-range, $180–300 premium, $300+ luxury. These figures usually include food and soft drinks but not alcohol.',
        'What drives price up: plated service (costs more than buffet), number of courses, premium ingredients, and staff-to-guest ratio.',
      ],
      tips: [
        'Always do a food tasting before finalising your menu',
        'Ask what is included in the quoted price per head — soft drinks, coffee, and service charges are often extra',
        'Confirm the minimum and maximum guest numbers in the contract',
      ],
      why: 'Catering is what guests experience most tangibly at your wedding. It warrants careful research and realistic budgeting.',
    },
    {
      id: 'f2',
      title: 'Dietary requirement management',
      tag: 'Logistics',
      body: [
        'Collecting and communicating dietary requirements requires a clear system. Collect via your RSVP, consolidate into a single document, and share with your caterer at least two weeks before the event.',
        'On the day, ensure serving staff know which guests have which requirements. For severe allergies, confirm cross-contamination protocols in writing.',
      ],
      tips: [
        'Create a dietary requirements document that maps guest name to their needs',
        'Brief the catering manager specifically on severe allergies the day before',
        'Place labelled dietary cards at each place setting',
      ],
      why: 'Systems, not intentions, ensure dietary requirements are met reliably across a large event.',
    },
    {
      id: 'f3',
      title: 'Cocktail hour food quantity',
      tag: 'Catering',
      body: [
        'Cocktail hour is often when guests are most hungry — they have been standing and drinking. The general rule: 4–6 canapés per person per hour.',
        'Timing matters as much as quantity. Ensure canapés are circulated continuously rather than served in a single rush. Running out of food at cocktail hour sets a poor tone for the reception.',
      ],
      tips: [
        'Choose a mix of light and substantial canapés',
        'Include at least one vegetarian and one gluten-free option',
        'Brief your catering manager on the desired cadence of canapé circulation',
      ],
      why: 'Hungry guests are less generous guests. Well-fed guests drink more moderately and enjoy the evening more.',
    },
    {
      id: 'f4',
      title: 'Service style decision',
      tag: 'Planning',
      body: [
        'Your service style shapes atmosphere, cost, and flow. Seated and plated: most formal, highest cost, clear timeline. Buffet: more casual, moderate cost, more flexibility. Cocktail-style: most relaxed, encourages mingling, risk of guests feeling underfed. Food stations: interactive, flexible, best for varied dietary needs.',
        'Consider your guest demographic: elderly guests do better with seated formats; young sociable crowds often prefer cocktail-style freedom.',
      ],
      tips: [
        'Walk through the service flow with your venue coordinator before deciding',
        'Consider a hybrid: seated for the main meal, cocktail-style for dessert',
        "Ask your caterer which format they do best — it varies significantly",
      ],
      why: "Service style is one of the most impactful decisions you'll make for guest experience. Changing it late is expensive.",
    },
    {
      id: 'f5',
      title: 'Late night food',
      tag: 'Evening',
      body: [
        'A late night food offering — typically around 10–11pm — serves a practical and atmospheric function. Guests who have been dancing and drinking benefit from food. The snack re-energises the dance floor significantly.',
        'Late night food does not need to be elaborate: sliders, fries, pizza, or a grazing board all work well. Budget $15–25 per person.',
      ],
      tips: [
        "Time the late night food with your DJ's set — often timed during a slower period to bring people together",
        'Ensure it is accessible on or near the dance floor, not in a separate room',
        'Communicate it to guests in advance — it builds anticipation',
      ],
      why: 'Late night food is often the most-talked-about catering moment at a reception. The cost-to-impact ratio is excellent.',
    },
  ],

  schedule: [
    {
      id: 's1',
      title: 'Building a realistic timeline',
      tag: 'Planning',
      body: [
        'The single biggest mistake in wedding timeline planning is underestimating how long each moment takes. Greet time, transport, photos, seating guests, speeches — every transition takes longer than it looks on paper.',
        'Build your timeline backwards from your ceremony time. Assign realistic durations to every preparation step. Add buffer time (10–15 minutes) between major transitions.',
      ],
      tips: [
        'Add 15–20 minute buffers between major transitions — something will run late',
        'Share the run sheet with your photographer, MC, venue coordinator, and helpers',
        'Identify your three biggest timeline risks and have a mitigation plan for each',
      ],
      why: 'Building in realistic time is an act of care for your future self.',
    },
    {
      id: 's2',
      title: 'Ceremony duration by tradition',
      tag: 'Planning',
      body: [
        'Ceremony length varies dramatically by tradition: civil 20–30 minutes, Protestant or non-denominational 45–60 minutes, Catholic mass 60–90 minutes, Hindu ceremony 90–180 minutes, Sikh Anand Karaj 60–90 minutes, Jewish ceremony 30–60 minutes.',
        'Use the upper end of the range when planning. A ceremony that ends early is a gift; one that runs over creates cascading delays.',
      ],
      tips: [
        'Confirm the expected duration with your officiant, not from a general guide',
        'Factor in time for guests to be seated before the ceremony starts',
        'If your ceremony includes communion, add 15–30 minutes',
      ],
      why: 'Your ceremony duration sets the entire day in motion. Getting it right means everything else can flow.',
    },
    {
      id: 's3',
      title: 'Speeches — timing and order',
      tag: 'Programme',
      body: [
        'Speeches are one of the highest-variance elements — a great speech is a highlight; a poor one can derail the atmosphere. Three to five speeches is typically enough. Cap total speech time at 20–25 minutes maximum.',
        'Recommended order: welcome from MC, parent(s) of one partner, best person or maid of honour, couple\'s combined speech. Talk to speakers in advance about length and content.',
      ],
      tips: [
        'Speeches before the main course keeps energy high — after dessert often loses the room',
        'Give each speaker a firm 5-minute time limit and ask them to rehearse',
        'Have a kind but firm MC who can step in if a speech runs long',
      ],
      why: 'Speeches are a gift of time and love. A little guidance ensures they land the way the speaker intends.',
    },
    {
      id: 's4',
      title: 'First dance to dinner transition',
      tag: 'Programme',
      body: [
        'The transition from first dance to being seated for dinner is commonly the most rushed moment in a reception. Allow 15–20 minutes between your first dance finishing and guests being seated for their first course.',
        'This time is used by: caterers plating starters, guests finding seats, and your MC making announcements. Rushing this transition creates a chaotic atmosphere that takes time to recover from.',
      ],
      tips: [
        'Brief your MC on the exact sequence: first dance → MC directs guests to seats → 15 min hold → first course',
        'Have your venue coordinator confirm the kitchen is ready before the first dance begins',
        'If seating is open plan, give extra time for guests to find seats',
      ],
      why: 'The transition into dinner sets the tone for the entire seated reception. Smooth transitions are invisible; rushed ones are remembered.',
    },
    {
      id: 's5',
      title: "The photographer's timeline needs",
      tag: 'Coordination',
      body: [
        'Family formals take far longer than couples expect. Allow 5–7 minutes per group. With 8 family group shots, that is nearly an hour of photography time that needs to be in your timeline, not stolen from another moment.',
        'Your photographer also needs time to travel between locations, set up at the new venue, and capture venue details before guests arrive.',
      ],
      tips: [
        'Designate a family member to round up people for formals so the photographer does not have to',
        'Do family formals immediately after the ceremony while everyone is still together',
        'Limit your family formal list to 6–8 groups maximum',
      ],
      why: 'Every minute the photographer spends waiting for people is a minute less capturing the moments you actually want.',
    },
  ],
};

function TagPill({ tag }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      background: 'rgba(10,10,10,0.05)', color: 'rgba(10,10,10,0.5)',
      fontSize: 11, fontWeight: 600, fontFamily: PJS, flexShrink: 0,
    }}>
      {tag}
    </span>
  );
}

function AccordionItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.07)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 0', textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1.4 }}>
          {item.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <TagPill tag={item.tag} />
          {open
            ? <ChevronUp size={15} style={{ color: 'rgba(10,10,10,0.35)' }} />
            : <ChevronDown size={15} style={{ color: 'rgba(10,10,10,0.35)' }} />
          }
        </div>
      </button>
      {open && (
        <div style={{ paddingBottom: 24 }}>
          {item.body.map((para, i) => (
            <p key={i} style={{
              fontSize: 14, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)',
              fontFamily: PJS, margin: i === 0 ? '0 0 12px' : '12px 0 0',
            }}>
              {para}
            </p>
          ))}
          {item.tips && item.tips.length > 0 && (
            <div style={{ marginTop: 18, padding: '14px 16px', background: 'rgba(10,10,10,0.03)', borderLeft: '3px solid rgba(10,10,10,0.12)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 10px' }}>
                Tips
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {item.tips.map((tip, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, marginBottom: i < item.tips.length - 1 ? 6 : 0, lineHeight: 1.6 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.why && (
            <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '14px 0 0', lineHeight: 1.6 }}>
              Why this matters: {item.why}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PageConsiderations({ pageKey }) {
  const items = CONSIDERATIONS[pageKey] || [];
  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
          No considerations available for this page.
        </p>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {items.map(item => <AccordionItem key={item.id} item={item} />)}
    </div>
  );
}
