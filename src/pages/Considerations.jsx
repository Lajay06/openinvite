import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";

const PJS = "'Plus Jakarta Sans', sans-serif";

// ── Content data ───────────────────────────────────────────────────────────

const CULTURAL_ITEMS = [
  {
    id: 'c1', title: 'Understanding your ceremony type', tag: 'Foundation',
    body: [
      'Every ceremony type carries its own meaning, structure, and beauty. Whether your ceremony is rooted in a specific religious tradition or is entirely secular, understanding what makes it distinct helps you honour it fully — and helps your guests engage more deeply with what they are witnessing.',
      'Religious ceremonies typically follow a set liturgy with rituals that have been practised for generations. The meaning embedded in each element — the exchange of vows, the blessing, the symbolic rituals — is layered and profound. Civil and secular ceremonies offer almost unlimited flexibility, which is both a creative opportunity and a planning challenge.',
    ],
    tips: [
      'Create a ceremony program that explains each element to guests who may be unfamiliar with the tradition.',
      'Brief your celebrant or officiant to gently narrate what is happening for first-time attendees.',
      'Research the history and meaning of your key rituals — this will help you explain them to guests and deepen your own connection to them.',
    ],
    why: 'Guests who understand what is happening are more emotionally present and more moved by the ceremony. A well-explained ceremony is a gift to everyone in the room.',
  },
  {
    id: 'c2', title: 'Booking your officiant or religious leader', tag: 'Book early',
    timeframe: '12–18 months ahead',
    body: [
      'Priests, rabbis, imams, pandits, granthis, and sought-after civil celebrants are booked 12–18 months in advance for peak season dates. This is one of the first bookings you should make, second only to your venue.',
      'Different faiths have different requirements — some require you to be an active, practising member of their congregation. A Catholic priest can typically only marry you in a Catholic church. A Gurdwara Anand Karaj ceremony requires both partners to be Sikh. Research these requirements early so there are no surprises.',
      'Civil celebrants offer significant flexibility — they can marry you almost anywhere, personalise the ceremony completely, and are available regardless of your religious background.',
    ],
    tips: [
      'Ask any religious leader whether they are legally registered to perform marriages in your state or country — and verify this independently.',
      'For civil celebrants, interview at least three before choosing — personality and presentation style matter as much as experience.',
      'Confirm whether your officiant has performed ceremonies at your venue before. Familiarity with acoustics and layout helps the day run smoothly.',
    ],
    why: 'If your officiant is not legally registered to perform marriages in your jurisdiction, your marriage will not be legally recognised — even after a beautiful ceremony. This is non-negotiable to verify.',
  },
  {
    id: 'c3', title: 'Pre-ceremony requirements', tag: 'Plan ahead',
    timeframe: '3–6 months to complete',
    body: [
      'Many religious ceremonies require formal preparation before the wedding can take place. These are not optional — they are prerequisites. Understanding what is required early prevents last-minute stress.',
      'Catholic and Christian ceremonies often require a pre-marriage preparation course (typically 6 weeks, held at the parish). Jewish ceremonies require meetings with the rabbi, selection of a ketubah, and arrangement of witnesses. Hindu ceremonies often involve an astrological consultation to identify an auspicious date and time. Muslim Nikah ceremonies require confirmation of the wali (guardian) and two male witnesses. Sikh ceremonies require the Anand Karaj to be performed in a Gurdwara with readings from the Guru Granth Sahib.',
    ],
    tips: [
      'Contact your officiant or religious leader within a week of booking them to understand the full list of pre-ceremony requirements.',
      'Build pre-ceremony requirements into your planning timeline from the start — not as an afterthought.',
      'If the requirements feel unfamiliar, ask your officiant to walk you through them in detail. They have done this many times and will guide you.',
    ],
    why: 'Discovering a mandatory 6-week course requirement three months before your wedding, when all Saturdays are booked, is a common and preventable source of significant stress.',
  },
  {
    id: 'c4', title: 'Venue and ceremony space requirements', tag: 'Logistics',
    body: [
      'Religious ceremonies often have specific venue requirements that cannot be negotiated. Understanding these early is essential — especially if your partner\'s tradition and your venue preference are in tension.',
      'Catholic ceremonies must typically take place in a Catholic church. Jewish ceremonies require a chuppah setup — allow at least two hours. Hindu ceremonies require a mandap — confirm setup time and safety requirements with your venue. Sikh Anand Karaj ceremonies must take place in a Gurdwara. Muslim Nikah ceremonies can be held in almost any space, provided there are appropriate witnesses present.',
      'For non-religious and civil ceremonies, you have maximum flexibility. Any licensed venue works, and you can marry outdoors, in a gallery, on a rooftop, or anywhere else you love.',
    ],
    tips: [
      'If your religious ceremony requires a specific type of venue, secure that booking before anything else.',
      'For ceremonies requiring physical structures (chuppah, mandap), confirm with the venue whether they have hosted these before and what their setup policy is.',
      'Always do a venue site visit with your officiant present, so they can assess the space for acoustics, positioning, and sightlines.',
    ],
    why: 'Booking a secular venue first and then discovering your religious tradition requires a different type of space creates a very painful planning reversal.',
  },
  {
    id: 'c5', title: 'Catering and dietary requirements by faith', tag: 'Important',
    body: [
      'Food is deeply connected to religious practice, and this is one of the areas most couples underestimate. Getting it right is a profound act of hospitality toward your guests.',
      'Jewish guests who observe kashrut require kosher catering — this is a significant cost uplift and requires a certified kosher kitchen and catering team. It is not possible to simply add a kosher option to a non-kosher caterer. Muslim guests require halal meat — confirm halal certification with your caterer, not just "halal-friendly" which is not the same thing. Hindu guests may be strictly vegetarian — ensure the vegetarian menu is substantive and thoughtfully designed, not an afterthought. Sikh ceremonies at a Gurdwara traditionally include langar (a free communal vegetarian meal) for all attendees. Buddhist guests are often vegetarian or vegan.',
    ],
    tips: [
      'On your RSVP form, ask for dietary requirements AND religious dietary needs separately — they are different and need different responses.',
      'For guests with severe allergies (nut, shellfish), contact them directly to confirm their meal is safe — do not rely solely on a checkbox.',
      'Always have a substantive vegetarian menu regardless of your ceremony type — it is the most common dietary requirement across all backgrounds.',
    ],
    why: 'Serving food that a guest cannot eat due to their religious practice is a significant act of exclusion, even if unintentional. A little research and planning prevents this entirely.',
  },
  {
    id: 'c6', title: 'Alcohol considerations', tag: 'Guest experience',
    body: [
      'Many religious traditions restrict or prohibit alcohol, and navigating this thoughtfully makes your celebration more inclusive and more joyful for everyone.',
      'Muslim and many Hindu ceremonies are traditionally alcohol-free. Sikh ceremonies at a Gurdwara prohibit alcohol entirely — including in the car park. Jewish and Christian ceremonies may include wine as part of the ritual. If you have guests from multiple faith backgrounds, a soft bar option alongside alcoholic drinks is a thoughtful compromise.',
    ],
    tips: [
      'Always have premium non-alcoholic options — beautifully presented mocktails, sparkling water with fruit, fresh pressed juices. They should look and feel as special as the alcoholic options.',
      'Never make guests feel singled out or questioned for choosing a non-alcoholic drink.',
      'For fully alcohol-free receptions, consider a professional mocktail menu — the creativity can become a genuine talking point.',
    ],
    why: 'Guests who feel comfortable and catered for drink more freely — whether alcohol or not — and this relaxed energy is contagious and contributes enormously to the atmosphere of the reception.',
  },
  {
    id: 'c7', title: 'Dress code communication', tag: 'Guest experience',
    body: [
      'Different faith traditions carry different expectations around modesty and dress, and communicating these clearly is a genuine act of care for your guests. Guests who feel appropriately dressed feel comfortable; guests who feel underdressed or disrespectfully dressed feel self-conscious all day.',
      'Sikh Gurdwaras require all guests to cover their heads — have head coverings available at the entrance for guests who arrive without one. Hindu ceremonies often expect modest attire and many guests may wish to wear traditional Indian dress. Muslim ceremonies typically expect modest dress for women (arms and legs covered). Jewish ceremonies expect men to wear a kippah — these are usually provided at the entrance.',
    ],
    tips: [
      'Include dress code information in your invitation, on your wedding website, and in any pre-wedding communication.',
      'Be specific: "smart casual" means different things to different people. "Midi-length dresses or trousers and a blouse" is actionable.',
      'If the dress code is culturally specific, offer a short explanation — guests will appreciate the context and the invitation to dress respectfully.',
    ],
    why: 'A guest who arrives at a Gurdwara without a head covering, not knowing it was required, starts the day feeling embarrassed. A single line in your invitation prevents this entirely.',
  },
  {
    id: 'c8', title: 'Photography and videography restrictions', tag: 'Important',
    body: [
      'Many religious spaces have strict rules about photography and videography during ceremonies. These rules exist for good reasons — to protect the sanctity of the space and the privacy of participants — and must be followed.',
      'Catholic churches often prohibit flash photography and restrict videographers to specific positions, typically the back of the church. Gurdwaras may restrict photography during specific rituals. Mosques may prohibit photography of women without their explicit consent. Some religious leaders will not allow photography during key moments such as the signing of the register or the exchange of rings.',
      'Always brief your photographer and videographer on venue-specific rules before the day — ideally in writing so there is no ambiguity.',
    ],
    tips: [
      'Schedule a pre-wedding meeting between your photographer and the venue coordinator or officiant.',
      'Consider an "unplugged ceremony" — asking guests to put their phones away. This produces better professional photos and more emotionally present guests.',
      'If photography is restricted during the ceremony, plan a dedicated portrait session immediately after that covers all the key moments.',
    ],
    why: 'A photographer who violates venue rules mid-ceremony creates a deeply uncomfortable moment. Prevention is simple — a briefing call costs nothing and protects the day.',
  },
  {
    id: 'c9', title: 'Blending cultural traditions', tag: 'Cultural fusion',
    body: [
      'Multicultural weddings are among the most beautiful and meaningful ceremonies you can attend — but they require significantly more planning than single-tradition ceremonies. The richness of blending two cultures is proportional to the care taken in honouring both.',
      'Decide early whether you will have one ceremony incorporating elements from both traditions, or two separate ceremonies. Both approaches work, but they have very different logistical implications. A combined ceremony requires a celebrant experienced in both traditions. Two separate ceremonies require two venues, two sets of vendors, and significantly more budget.',
      'Consult with leaders from both traditions early — some elements can be blended beautifully, and some cannot be combined without diminishing one or both traditions. Honesty about these limits is a form of respect.',
    ],
    tips: [
      'Focus on the 2–3 moments that matter most to each family and build the ceremony around those moments first.',
      'Create a ceremony program that explains each element in both cultural contexts — not just what is happening, but why it is meaningful.',
      'Brief your MC or celebrant to guide guests through the transitions between traditions with warmth and context.',
    ],
    why: 'A multicultural wedding handled with care becomes a profound shared experience for two families who may have very little else in common yet. That is an extraordinary gift.',
  },
  {
    id: 'c10', title: 'Helping guests who are unfamiliar with your tradition',
    tag: 'Guest experience',
    body: [
      'Many of your guests may be attending their first Hindu, Jewish, Muslim, Sikh, or Buddhist ceremony. This is an opportunity to share something deeply meaningful about who you are — and to make every guest feel included rather than confused.',
      'A well-designed ceremony program is one of the most impactful guest experience investments you can make. Include: the order of service, a brief explanation of each ritual and its significance, any participation expected from guests (when to stand, when to sit, any responses), and any cultural context that helps guests appreciate what they are witnessing.',
    ],
    tips: [
      'Brief your MC or celebrant to gently explain what is happening at key moments — "We are now about to witness the laavan, the four rounds that represent the couple\'s journey through life together."',
      'Consider a short "what to expect" note on your wedding website that guests can read before arriving.',
      'Translate any prayers or readings said in another language — even a short summary in the program helps guests follow along.',
    ],
    why: 'Guests who understand what is happening feel included and emotionally connected. Guests who are confused feel like outsiders, even if everyone around them is warm. The ceremony program is the solution.',
  },
];

const LOGISTICS_ITEMS = [
  {
    id: 'l1', title: 'Indoor vs outdoor venue considerations', tag: 'Planning',
    body: [
      'Outdoor weddings are beautiful and inherently unpredictable. If your venue is outdoors or partially outdoors, you need a comprehensive wet weather plan — not a vague backup, but a fully designed alternative that is equally beautiful and equally joyful.',
      'For outdoor venues consider: marquee hire (book 6+ months in advance), shade provision for warm climates, portable heaters for cool evenings, ground cover for grass venues to protect stilettos, insect considerations in tropical locations, and the exact time of sunset relative to your ceremony.',
      'Indoor venues offer reliability and climate control, but verify: acoustics for speeches and live music, ventilation capacity for your guest count, natural light availability for photography, and any external noise restrictions on amplified music.',
    ],
    tips: [
      'Visit your outdoor venue on a rainy day before booking — see exactly what the space looks and feels like in the worst case.',
      'Confirm with your marquee supplier what the latest possible setup time is relative to your wet weather decision deadline.',
      'For indoor venues, ask the venue coordinator where the best natural light is at the time of day your ceremony takes place.',
    ],
    why: 'Couples who have a beautiful wet weather plan approach their ceremony morning without dread regardless of the forecast. Couples without one are at the mercy of the weather in the most stressful possible way.',
  },
  {
    id: 'l2', title: 'Transportation and guest flow', tag: 'Day of',
    body: [
      'Think through every guest journey, from every starting point. How are guests arriving at the ceremony? Is parking available and clearly communicated? How are they travelling from ceremony to reception — and is this gap long enough to be uncomfortable?',
      'For destination weddings or venues without nearby parking, shuttle buses eliminate both parking stress and drink driving risk. For urban venues, provide specific taxi and rideshare information. For regional venues, accommodation proximity becomes a planning factor that affects your whole guest experience.',
    ],
    tips: [
      'Map the full guest journey from invitation to departure and identify every point of potential confusion or frustration.',
      'Appoint a friendly, confident person to greet arriving guests and direct them — this single role dramatically reduces guest anxiety.',
      'For guests travelling far, a simple info card with the ceremony address, reception address, and recommended accommodation removes the need for guests to search for anything.',
    ],
    why: 'A guest who arrives stressed, confused about parking, or late because directions were unclear is emotionally behind for the first hour. First impressions set the entire tone of the day.',
  },
  {
    id: 'l3', title: 'Timing and buffer planning', tag: 'Day of',
    body: [
      'The single most common wedding day mistake is an unrealistic timeline. Experienced coordinators add buffer time to every transition — not because they are pessimistic, but because they have seen what happens without it.',
      'Ceremony start: add 15 minutes for late arrivals and seating. Ceremony to reception: add 30 minutes for congratulations, group photos, and transport. Speeches: allocate a minimum of 5 minutes per speech — most parents run longer. First dance to dinner service: 15 minutes. Sunset photography: confirm the exact sunset time for your date and location, block 30 minutes.',
    ],
    tips: [
      'Build the timeline backwards from your contracted end time and check that every element fits with buffers included.',
      'Share the timeline with your photographer, coordinator, venue, and MC at least one week before the wedding.',
      'Designate someone to be the "timekeeper" on the day — your coordinator if you have one, or a trusted, organised friend.',
    ],
    why: 'A cascade of 10-minute delays compounds into a two-hour delay by the end of the night. This makes guests unsettled, vendors stressed, and the couple feel guilty — all of it preventable with an honest timeline.',
  },
  {
    id: 'l4', title: 'Wet weather contingency', tag: 'Outdoor venues',
    body: [
      'Every outdoor or semi-outdoor venue requires a specific, beautiful, fully realised wet weather plan. "We will move inside" is not a plan — it is the beginning of one. Where inside? How will it be decorated? Who makes the call and when? How will guests be notified?',
      'The call should be made by 9am for an afternoon ceremony. Having a clear decision-maker — your venue coordinator or wedding planner — means the couple does not carry this weight on the morning of the wedding. The decision should be made early enough that the alternative setup can happen without panic.',
    ],
    tips: [
      'Design the wet weather option as fully as the original plan — including table arrangements, florals that work in both spaces, and lighting.',
      'Confirm with your venue exactly who makes the final call and by what time.',
      'Have a guest communication plan ready to send: a text or email to all guests, updated venue map, and clear new directions.',
    ],
    why: 'The most stressful wedding days are those where a weather decision is made at midday for a 2pm ceremony. The least stressful are those where the plan was made at 9am and the afternoon is calm.',
  },
  {
    id: 'l5', title: 'Vendor coordination and briefing', tag: 'Logistics',
    body: [
      'Every vendor working at your wedding needs a single, clear briefing document before the day. Vendors who are well-briefed deliver better results and require less management on the day — which means less stress for you and your coordinator.',
      'The briefing document should include: full timeline, venue address with specific load-in entrance, parking instructions, name and mobile number of the day-of contact, their specific setup window and completion time, any venue-specific rules they need to follow, and what to do if they cannot reach the contact person.',
    ],
    tips: [
      'Create a vendor WhatsApp or messaging group for day-of communication — much faster than individual calls.',
      'Designate one person (not you or your partner) as the vendor contact on the day. Every vendor should call this person, not you.',
      'Send the briefing document two weeks before the wedding and follow up one week before to confirm receipt.',
    ],
    why: 'On your wedding day, you should not be answering a phone call from a florist asking where the loading dock is. A thorough briefing document means every vendor already knows.',
  },
  {
    id: 'l6', title: 'On-the-day coordination', tag: 'Important',
    body: [
      'The most common regret from couples who did not hire a wedding coordinator is that they spent their wedding day managing logistics instead of being fully present in their own celebration. A good coordinator removes this burden entirely.',
      'A professional day-of coordinator typically costs 3–8% of your total wedding budget. In return, they manage every vendor, every timeline decision, every venue issue, and every guest question — none of which reaches you. The financial return on this investment, measured in your own peace of mind and presence, is difficult to overstate.',
      'If budget genuinely does not allow for a professional coordinator, designate a highly organised friend or family member who is not in the wedding party. Brief them thoroughly at least two weeks in advance. Give them the full vendor list, timeline, venue layout, and authority to make decisions.',
    ],
    tips: [
      'Even if you have a venue coordinator, their priority is the venue — not you. A wedding coordinator\'s only priority is you.',
      'Ask your coordinator to do a final venue walkthrough with you two weeks before the wedding.',
      'Provide your coordinator with a brief written overview of your preferences and non-negotiables so they can make judgment calls on your behalf without interrupting you.',
    ],
    why: 'You have spent 12–18 months and a significant amount of money planning this day. A coordinator ensures you actually get to experience it, rather than manage it.',
  },
];

const GUEST_ITEMS = [
  {
    id: 'g1', title: 'The guest journey — think like your guests',
    body: [
      'The single most useful exercise in wedding planning is to walk through your entire wedding from a guest\'s perspective — from the moment they receive the invitation to the moment they leave the reception.',
      'Invitation: is the date, time, location, and dress code absolutely clear? Can they RSVP easily? Travel: is parking or transport information included? Arrival: is there someone to greet them? Is there signage? Is there a drink on arrival? Ceremony: is the program clear? Is the space comfortable? Reception: is the flow from ceremony to reception obvious? Is the seating chart easy to read? End of night: is transport home available? Is the timing clear?',
    ],
    tips: [
      'Ask a friend who knows little about the wedding to read your invitation and tell you what they understand — the gaps they find are the gaps all guests will experience.',
      'Do a physical walkthrough of the venue from the guest car park to every space they will use.',
      'Every moment of confusion reduces the magic. Every moment of warmth and clarity adds to it.',
    ],
    why: 'Guests who feel looked after from the moment of invitation are relaxed, grateful, and emotionally available to celebrate fully with you. Guests who feel confused or afterthought are physically present but emotionally distant.',
  },
  {
    id: 'g2', title: 'Children at your wedding',
    body: [
      'The decision about whether to include children should be made early and communicated clearly and consistently. Half measures — some children invited, others not — create significant family tension and hurt feelings that outlast the wedding.',
      'If children are welcome: design the experience for them. A children\'s meal option, a quiet parent room for babies, an activity pack or colouring table for children over 5, and a child-safe venue all contribute to a genuinely welcoming environment. If no children are invited: communicate this sensitively, early, and with a genuine acknowledgment that parents need time to arrange childcare.',
    ],
    tips: [
      'Include the children policy on your wedding website and in the invitation itself — not just word of mouth.',
      'For families travelling from interstate or overseas, a no-children policy may need to be discussed directly and sensitively.',
      'If children are welcome, designate a responsible adult (not in the wedding party) to be the children\'s "activity coordinator" during the reception.',
    ],
    why: 'Clarity and consistency are the most important qualities here — not the decision itself. Guests can accept either outcome graciously when it is communicated with care.',
  },
  {
    id: 'g3', title: 'Dietary requirements management',
    body: [
      'Collecting dietary requirements is only the beginning. The far more important step is ensuring those requirements are accurately transmitted to your caterer, tracked through to the day, and correctly served at the table.',
      'Collect requirements at RSVP time. Pass them to your caterer at least four weeks before the wedding, in writing. On the day, have a system so waiting staff know which guests have dietary needs — typically a coloured sticker or symbol on the place card corresponding to a brief in the kitchen.',
      'Treat allergies with absolute seriousness. A nut allergy is life-threatening. A gluten intolerance causes significant discomfort. Neither should be left to chance on the day.',
    ],
    tips: [
      'Contact any guest with a severe allergy directly before the wedding to confirm their meal has been handled correctly.',
      'Ensure your caterer can confirm which dishes contain common allergens and that cross-contamination is managed in the kitchen.',
      'On your RSVP, ask separately for dietary requirements and religious dietary needs — they are different things that require different responses.',
    ],
    why: 'A guest with coeliac disease who is served bread and has to sit through three courses unable to eat is not going to remember the beautiful centrepieces. Getting this right is one of the most basic and fundamental acts of hospitality.',
  },
  {
    id: 'g4', title: 'Elderly and mobility-impaired guests',
    body: [
      'Reviewing your venue with elderly and mobility-impaired guests in mind is not a compliance exercise — it is an act of genuine care. Many couples have grandparents or elderly relatives for whom this is one of the most significant events they will attend.',
      'Check: is there step-free access from car park to every guest area? Are accessible toilets available and clearly signed? Is seating available during cocktail hour (not everyone can stand for two hours)? Is the ceremony space wide enough for wheelchairs? For outdoor venues, is the ground suitable for walking frames, wheelchairs, or high heels?',
    ],
    tips: [
      'Walk the venue yourself with the specific needs of your most mobility-limited guests in mind.',
      'Reserve aisle seats for elderly guests or those who may need to leave quietly during the ceremony.',
      'Brief your MC to direct guests with mobility needs to the relevant team member on arrival.',
    ],
    why: 'An elderly guest who cannot access the ceremony or reception feels excluded from the most important day of your life. A 20-minute venue walkthrough with their needs in mind prevents this.',
  },
  {
    id: 'g5', title: 'The unplugged ceremony',
    body: [
      'An unplugged ceremony is a simple, increasingly popular practice: asking guests to put their phones and cameras away for the duration of the ceremony so they are fully present.',
      'The benefits are significant. Guests with phones raised block sightlines for other guests. The sea of screens in your ceremony photos is distracting. Your photographer cannot capture a genuine first kiss when every guest\'s phone is raised in front of their face. And most importantly, guests who are not behind a screen are genuinely, emotionally present — which makes the ceremony more moving for everyone, including you.',
    ],
    tips: [
      'Include the request in your ceremony program: "We invite you to be fully present with us. Please put your phone away for the duration of the ceremony. Our photographer will capture everything beautifully."',
      'Ask your celebrant to make a warm, brief announcement before the ceremony begins.',
      'Frame it positively — an invitation to be present — not a prohibition.',
    ],
    why: 'You hired a professional photographer specifically so your guests could be present rather than behind cameras. An unplugged ceremony is simply honouring that decision.',
  },
  {
    id: 'g6', title: 'Welcome gifts and personal touches',
    body: [
      'Small, thoughtful personal touches create lasting memories and make guests feel genuinely seen. They do not need to be expensive — they need to be considered.',
      'Welcome bags for out-of-town guests are one of the highest-impact investments you can make in guest experience. Local snacks, a handwritten note from the couple, a brief area guide, and a small hangover kit for the morning after show extraordinary thoughtfulness. A personalised note at each place setting, a favour that genuinely reflects your story, or a local product that connects to your wedding location all add warmth that guests will remember long after the day.',
    ],
    tips: [
      'Personalise where you can — a note that mentions the guest\'s name and something specific about your relationship with them is far more powerful than a generic printed card.',
      'Welcome bags should feel local and personal, not generic. Source from the area near your venue where possible.',
      'If budget is tight, prioritise one or two genuinely thoughtful touches over many mediocre ones.',
    ],
    why: 'Guests travel, take time off work, and spend money to celebrate your wedding. A small act of welcome and gratitude transforms their experience from attendance to genuine participation.',
  },
];

const LEGAL_ITEMS = [
  {
    id: 'leg1', title: 'Marriage licence and legal requirements', tag: 'Legal',
    body: [
      'The legal requirements for marriage vary significantly by country, state, and territory. Understanding and meeting these requirements is the single most important administrative task in wedding planning — failure to do so means your marriage is not legally recognised, regardless of how beautiful the ceremony was.',
      'In Australia, you must lodge a Notice of Intended Marriage (NOIM) with a registered celebrant at least one month and up to 18 months before the ceremony. In the UK, you give notice at your local register office at least 28 days before. In the US, requirements vary by state — some require a waiting period, others do not. For destination weddings, the country of marriage governs the legal requirements, and you may need to have the marriage additionally registered in your home country.',
    ],
    tips: [
      'Research the specific legal requirements for your country and state as your very first planning step.',
      'Keep copies of all legal documentation throughout the planning process.',
      'If marrying overseas, contact the embassy of the country you are marrying in for a definitive list of requirements.',
    ],
    why: 'Discovering a missed legal requirement after the ceremony — or arriving at the registry to find the paperwork was incorrectly completed — is a devastating situation that is entirely preventable.',
  },
  {
    id: 'leg2', title: 'Choosing a legally registered officiant', tag: 'Important',
    body: [
      'Not everyone who can perform a meaningful ceremony is legally authorised to marry you. A celebrant, religious leader, friend ordained online, or family member may be able to conduct a beautiful ceremony without the legal authority to make it a marriage.',
      'Verify that your celebrant, priest, rabbi, imam, or other officiant is legally registered to perform marriages in your jurisdiction. In Australia, officiants are registered with the Attorney-General\'s Department. In the UK, the Church of England, register offices, and approved premises are the legal options. In the US, ministers must be ordained by a recognised religious organisation or authorised by the state.',
    ],
    tips: [
      'Ask your officiant directly for their registration number or credential, and independently verify it with the relevant government authority.',
      'This is especially important for destination weddings or weddings involving officiants who have recently moved from another country.',
      'For friends ordained online to perform your ceremony, check the specific legal recognition of that ordination in your jurisdiction — recognition varies widely.',
    ],
    why: 'A beautiful ceremony performed by an unregistered officiant is not a marriage. It is a celebration followed by paperwork and potentially significant legal complications.',
  },
  {
    id: 'leg3', title: 'Name change process',
    body: [
      'If either partner is changing their name after marriage, the process is initiated with your official marriage certificate and involves updating documents across multiple organisations — in a specific order, because many organisations require your passport or driver\'s licence to be updated first.',
      'The order matters. Priority: marriage certificate (issued by the registry, takes 2–8 weeks), then passport (allow 6–8 weeks — do this first if you are travelling on honeymoon), then driver\'s licence, then bank accounts, then superannuation or pension, then Medicare and health insurance, then employer records, then electoral roll, then property or vehicle registrations.',
    ],
    tips: [
      'If you are travelling on honeymoon, do not change your passport until you return — travel on your existing passport and update it after.',
      'Many banks allow in-branch name change on the same day with your marriage certificate — call ahead to confirm what you need to bring.',
      'In Australia, Service NSW offers a one-stop name change notification service for many government departments.',
    ],
    why: 'Name changes that are not completed in the correct order create downstream complications — a bank that will not process the update without an updated passport, for example. The sequence matters.',
  },
  {
    id: 'leg4', title: 'Wedding insurance', tag: 'Highly recommended',
    body: [
      'Wedding insurance protects your financial investment against events outside your control: vendor insolvency, extreme weather that forces cancellation or postponement, venue closure, supplier non-appearance, and personal liability during the event.',
      'Given that weddings represent a significant financial investment concentrated in a single day, insurance is strongly recommended. Standard cover typically includes: cancellation and postponement costs, supplier failure (including deposits paid to vendors who cease trading), personal liability, wedding attire and rings. General travel insurance does not provide adequate wedding-specific cover — use a specialist wedding insurer.',
    ],
    tips: [
      'Purchase insurance as soon as you have paid your first deposit — this is typically when cover begins.',
      'Read the policy exclusions carefully, particularly around weather events (what qualifies as "extreme"?) and pre-existing medical conditions.',
      'Keep receipts and contracts for all vendor payments — you will need these if you make a claim.',
    ],
    why: 'Wedding insurance exists because the wedding industry carries real financial risk. Vendors go out of business. Venues flood. Storms happen. The question is not whether you need insurance but whether you can afford to absorb the loss without it.',
  },
  {
    id: 'leg5', title: 'Vendor contracts — what to check',
    body: [
      'Every vendor engagement should be governed by a written contract. A handshake or email agreement leaves both parties exposed. A clear contract protects everyone and removes ambiguity that causes disputes.',
      'Key items to verify in every vendor contract: exact services included and excluded (is the second shooter included? Are printed albums?), payment schedule and deposit terms, cancellation and postponement policy (when do you lose your deposit?), what happens if the vendor cannot attend (is there a substitute provision?), liability clause, and for photography and videography — who owns the images and what usage rights do you have.',
    ],
    tips: [
      'Never pay a vendor in full upfront. A standard structure is 25–30% deposit on booking, remainder 2–4 weeks before the wedding.',
      'For large vendors (venue, caterer), consider having a solicitor review the contract if the value is significant.',
      'Pay deposits by credit card where possible — this provides additional consumer protection if a vendor fails to deliver.',
    ],
    why: 'The payment terms, cancellation clauses, and liability provisions in vendor contracts are most important when something goes wrong. Reading them only after a dispute is too late.',
  },
];

const BUDGET_ITEMS = [
  {
    id: 'b1', title: 'Hidden costs that surprise couples', tag: 'Budget',
    body: [
      'The listed price from any vendor or venue is rarely the final price you pay. Understanding what is not included in the initial quote is as important as understanding what is.',
      'Common hidden costs: venue service charge, typically 10–15% added to food and beverage totals; cake cutting fee of $3–8 per guest if you bring an external cake to a venue; corkage fee if bringing your own wine; overtime charges if your event runs past the contracted end time (venues and bands charge premium rates for overtime); valet parking; coat check staffing; linen and chair upgrades beyond venue standard; generator hire for outdoor venues; accommodation costs for vendors who travel significant distances.',
    ],
    tips: [
      'Ask every vendor specifically: "What is NOT included in this quote?" and "What are the most common additions couples make with you?"',
      'Ask your venue for a full list of potential add-ons, surcharges, and overtime rates at your initial meeting.',
      'Build an estimate of likely extras — based on what is not included — into your initial budget, not as a surprise at the end.',
    ],
    why: 'Couples who discover their venue has a 15% service charge after signing the contract consistently report feeling misled — not because the charge was hidden, but because they did not know to ask. Ask everything.',
  },
  {
    id: 'b2', title: 'Building a contingency buffer',
    body: [
      'Every experienced wedding planner recommends a 10–15% contingency on your total budget, set aside from the beginning and treated as untouchable unless genuinely needed. This is not pessimism — it is the product of seeing how consistently weddings evolve over 12–18 months of planning.',
      'Guest list creep is real. Upgrades that seem small individually (better chairs, additional flowers, a photo booth) compound significantly. Genuine surprises happen — vendors who increase prices, venues who require additional deposits. The contingency exists for all of this.',
    ],
    tips: [
      'Set the contingency amount aside in a separate account from day one.',
      'Treat it as genuinely unavailable until you are within 6 weeks of the wedding.',
      'If you do not need it, it becomes your honeymoon upgrade fund — a lovely outcome.',
    ],
    why: 'Couples without a contingency fund face an unpleasant binary as wedding day approaches: cut something they love or go into debt. The contingency prevents both.',
  },
  {
    id: 'b3', title: 'Where to spend and where to save',
    body: [
      'Not all wedding spending is equal in its return. Understanding where money makes the most difference — and where it makes surprisingly little — is one of the most useful frameworks for budget allocation.',
      'Spend on: photography and videography (the only things you keep forever), food and drinks (guests remember a poor meal for years), music and entertainment (sets the energy of the entire reception and is remembered above almost everything else), and your ceremony experience (the actual marriage — make it beautiful and meaningful).',
      'Save on: wedding favours (the majority are left on tables at the end of the night), elaborate floral centrepieces (greenery and simpler arrangements photograph equally well for a fraction of the cost), printed stationery (digital RSVP and information saves significantly), and day-after brunches (a simple hotel spread is warmly received and inexpensive).',
    ],
    tips: [
      'Before making a purchase, ask: will guests remember or benefit from this in a year? Will it appear in photographs?',
      'Talk to recently married couples about what they wish they had spent more or less on — the answer is consistently: more on photography, less on favours.',
      'Florals: negotiate with your florist to repurpose ceremony flowers at the reception rather than having them sit in an empty church.',
    ],
    why: 'Wedding budgets are finite. Every dollar spent on something that does not contribute to the experience is a dollar not spent on something that does. Intentional allocation makes every dollar work harder.',
  },
  {
    id: 'b4', title: 'Tipping etiquette',
    body: [
      'Tipping is not mandatory in all countries but is deeply appreciated by wedding vendors who work long, physically and emotionally demanding days to make yours perfect. In Australia and the UK, tipping is less expected than in the US but is always warmly received.',
      'General guidance: photographer and videographer — $100–200 each if exceptional; caterers — 15–20% of the food bill if a service charge is not already included; band or DJ — $50–100 per performer or member; hair and makeup — 15–20% of the total bill; officiant or celebrant — $100–200 cash, or a donation to their church or charitable organisation; wedding coordinator — $200–500 depending on scope and engagement length.',
    ],
    tips: [
      'Prepare tip envelopes in advance, labelled by vendor, with cash already inside.',
      'Assign someone you trust — not a family member who will be busy enjoying the night — to distribute envelopes at the appropriate moment in the evening.',
      'If budget is genuinely limited, a heartfelt written note with a smaller tip is more meaningful than a larger amount without acknowledgment.',
    ],
    why: 'Wedding vendors remember couples who express genuine gratitude. Beyond the human dimension, a glowing review and a generous tip are the two most powerful ways to support a small business that cared for your day.',
  },
];

const VENDOR_ITEMS = [
  {
    id: 'v1', title: 'Vendor booking timeline', tag: 'Book early',
    body: [
      'The wedding industry has a booking calendar that is largely invisible to couples until they begin planning. The single most common mistake is leaving key bookings too late — not because couples are disorganised, but because they do not know how quickly vendors book out.',
      '18–24 months ahead: your venue. This is the single most critical booking. Everything else — your date, your caterer if external, your guest count — follows from the venue decision. 12–18 months: photographer, videographer, sought-after florists, caterer if external, band or DJ. 9–12 months: hair and makeup team (a good team books quickly), celebrant or officiant, cake designer. 6–9 months: transport (especially vintage or specialty vehicles), stationery designer. 3–6 months: photo booth, additional entertainment, favours. 1–3 months: confirm all vendors in writing, pass final headcounts, make final payments.',
    ],
    tips: [
      'Build your shortlist of vendors before you have a date confirmed — then confirm the date and start booking on the same day.',
      'For peak season dates (spring and autumn Saturdays), add at least 3 months to every timeline.',
      'When a vendor you love is unavailable for your date, ask if they have a recommendation — the referral network in the wedding industry is strong.',
    ],
    why: 'The experience of finding a vendor you love and discovering they were booked for your date six months ago is one of the most deflating moments in wedding planning. It is entirely preventable with early action.',
  },
  {
    id: 'v2', title: 'Questions to ask every vendor',
    body: [
      'The questions you ask a vendor before booking reveal as much about their professionalism and compatibility as their portfolio does. A vendor who cannot answer these questions clearly is not ready to be trusted with your wedding day.',
      'Ask every vendor: Are you available on our date? (Confirm in writing.) Can you show us examples of weddings similar to ours in size, style, and venue type? Do you carry public liability insurance? What is your cancellation and postponement policy — at what point do we lose our deposit? What happens if you are sick or unable to attend — do you have a confirmed backup? What do you need from us on the day, and by when? What are your payment terms? Have you worked at our venue before?',
    ],
    tips: [
      'Take notes during vendor meetings — the details blur quickly when you are meeting several vendors in a short period.',
      'Pay attention to how quickly and thoroughly a vendor responds to your initial enquiry — this is a reliable indicator of how they will communicate throughout the planning process.',
      'Trust your instinct about personality fit. You will spend significant time with your photographer, coordinator, and celebrant — you should genuinely enjoy their company.',
    ],
    why: 'Vendors who cannot confirm a substitute for illness, or who are vague about their cancellation terms, are not adequately protecting you. The questions exist to surface this before you pay a deposit.',
  },
  {
    id: 'v3', title: 'Vendor meals and logistics',
    body: [
      'Most vendor contracts include a clause requiring you to provide a meal for vendors working more than 4–5 hours at your reception. This typically includes: photographer, videographer, band or DJ members, coordinator, and sometimes hair and makeup artists if they stay for touch-ups. Venue staff are generally fed by the venue. Always confirm with each vendor what they expect.',
      'Vendor meals should be hot, substantial, and served during the same service window as your guests — while guests are eating dinner, not during your first dance. Factor the vendor headcount into your catering numbers from the beginning.',
    ],
    tips: [
      'Create a vendor meal list — names, dietary requirements, and meal timing — and share it with your caterer at least two weeks before the wedding.',
      'Ask your venue to designate a quiet vendor dining area away from the guest space.',
      'A vendor who eats well during your wedding works better in the second half of the night. It is a practical investment as much as a courtesy.',
    ],
    why: 'A photographer who has not eaten since breakfast and is shooting a three-hour reception is not at their creative best. Vendor meals are a small cost with a direct return in the quality of their work.',
  },
  {
    id: 'v4', title: 'Creating your vendor contact sheet',
    body: [
      'A vendor contact sheet is a single document that becomes your insurance policy for the wedding day. It should be created at least four weeks before the wedding and distributed to every person with a day-of role: your coordinator, your MC, your venue\'s on-site contact.',
      'The document should include: vendor name and company, mobile number (and a backup number where possible), scheduled arrival time and location, specific setup instructions or access needs, and what to do if the vendor cannot be reached. Also include your venue\'s emergency contact and the number for any hired equipment suppliers in case of technical failure.',
    ],
    tips: [
      'Test every phone number on the list two weeks before the wedding to confirm they are current.',
      'Store the document in both digital form (shared folder or notes app) and as a printed copy at the venue.',
      'Include the local emergency services number and nearby hospital address — genuinely hope you never need it.',
    ],
    why: 'On your wedding day, you should not be searching for a vendor\'s phone number. Everything should be in one place, in the hands of someone who is not you.',
  },
];

const TABS = [
  { key: 'cultural',  label: 'Cultural & religious', items: CULTURAL_ITEMS },
  { key: 'logistics', label: 'Logistics',             items: LOGISTICS_ITEMS },
  { key: 'guest',     label: 'Guest experience',      items: GUEST_ITEMS },
  { key: 'legal',     label: 'Legal',                 items: LEGAL_ITEMS },
  { key: 'budget',    label: 'Budget',                items: BUDGET_ITEMS },
  { key: 'vendors',   label: 'Vendors',               items: VENDOR_ITEMS },
];

// ── Sub-components ─────────────────────────────────────────────────────────

const TAG_COLORS = {
  'Foundation':       { bg: 'rgba(37,99,235,0.08)',  color: '#1d4ed8' },
  'Book early':       { bg: 'rgba(234,88,12,0.08)',  color: '#c2410c' },
  'Plan ahead':       { bg: 'rgba(124,58,237,0.08)', color: '#6d28d9' },
  'Logistics':        { bg: 'rgba(10,10,10,0.06)',   color: 'rgba(10,10,10,0.5)' },
  'Important':        { bg: 'rgba(224,53,83,0.08)',  color: '#E03553' },
  'Guest experience': { bg: 'rgba(5,150,105,0.08)',  color: '#047857' },
  'Cultural fusion':  { bg: 'rgba(124,58,237,0.08)', color: '#6d28d9' },
  'Outdoor venues':   { bg: 'rgba(5,150,105,0.08)',  color: '#047857' },
  'Day of':           { bg: 'rgba(10,10,10,0.06)',   color: 'rgba(10,10,10,0.5)' },
  'Legal':            { bg: 'rgba(234,88,12,0.08)',  color: '#c2410c' },
  'Highly recommended': { bg: 'rgba(224,53,83,0.08)', color: '#E03553' },
  'Budget':           { bg: 'rgba(5,150,105,0.08)',  color: '#047857' },
  'Planning':         { bg: 'rgba(10,10,10,0.06)',   color: 'rgba(10,10,10,0.5)' },
};

function Tag({ label }) {
  const style = TAG_COLORS[label] || { bg: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.5)' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
      background: style.bg, color: style.color, fontFamily: PJS, flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}

function AccordionItem({ item, checked, onCheck }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 0', cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onCheck(item.id); }}
          style={{
            flexShrink: 0, width: 18, height: 18,
            border: `2px solid ${checked ? '#E03553' : 'rgba(10,10,10,0.2)'}`,
            background: checked ? '#E03553' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', padding: 0,
          }}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 600, fontFamily: PJS,
          color: checked ? 'rgba(10,10,10,0.35)' : '#0A0A0A',
          textDecoration: checked ? 'line-through' : 'none',
          transition: 'all 0.2s',
        }}>
          {item.title}
        </span>

        {/* Tag + timeframe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {item.timeframe && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              background: 'rgba(234,88,12,0.08)', color: '#c2410c', fontFamily: PJS,
            }}>
              {item.timeframe}
            </span>
          )}
          {item.tag && <Tag label={item.tag} />}
        </div>

        {/* Chevron */}
        <div style={{ flexShrink: 0, color: 'rgba(10,10,10,0.3)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>
          <ChevronRight size={16} strokeWidth={1.8} />
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ paddingBottom: 20, paddingLeft: 30 }}>
          {/* Body paragraphs */}
          {item.body.map((para, i) => (
            <p key={i} style={{
              fontSize: 14, lineHeight: 1.75, color: 'rgba(10,10,10,0.7)',
              fontFamily: PJS, margin: i === 0 ? '0 0 12px' : '12px 0',
            }}>
              {para}
            </p>
          ))}

          {/* Tips */}
          {item.tips && item.tips.length > 0 && (
            <div style={{ margin: '16px 0' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px', letterSpacing: '0.06em' }}>
                Practical tips
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                {item.tips.map((tip, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, marginBottom: 4 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Why this matters */}
          {item.why && (
            <div style={{
              background: 'rgba(10,10,10,0.02)',
              borderLeft: '3px solid #E03553',
              padding: '12px 16px',
              marginTop: 16,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: '0 0 6px', letterSpacing: '0.06em' }}>
                Why this matters
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, margin: 0 }}>
                {item.why}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ done, total }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
          {done} of {total} reviewed
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(10,10,10,0.08)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#E03553', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export default function Considerations() {
  const [activeTab, setActiveTab] = useState('cultural');
  const [weddingStyles, setWeddingStyles] = useState([]);
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('oi_considerations_checked') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(rows => {
      setWeddingStyles((rows[0] || {}).weddingStyle || []);
    }).catch(() => {});
  }, []);

  const toggle = (id) => {
    setChecked(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('oi_considerations_checked', JSON.stringify(next));
      return next;
    });
  };

  const currentTab = TABS.find(t => t.key === activeTab) || TABS[0];
  const tabItems = currentTab.items;
  const doneCount = tabItems.filter(item => checked.includes(item.id)).length;
  const contextPills = weddingStyles.filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader
        title="Considerations"
        subtitle="A personalised guide based on your wedding style"
      />

      {/* Ava button */}
      <div style={{ padding: '16px 32px 0' }}>
        <AvaButton label="Ask Ava for personalised advice" />
      </div>

      {/* Context banner */}
      {contextPills.length > 0 && (
        <div style={{
          margin: '16px 32px 0',
          background: 'rgba(10,10,10,0.03)',
          border: '1px solid rgba(10,10,10,0.06)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, flexShrink: 0 }}>
            Personalised for your wedding
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {contextPills.map(s => (
              <span key={s} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(10,10,10,0.06)', color: '#0A0A0A', fontFamily: PJS,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', overflowX: 'auto', marginTop: 16 }}>
        <div style={{ padding: '0 32px', display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: PJS,
                color: activeTab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
                borderBottom: activeTab === t.key ? '2px solid #0A0A0A' : '2px solid transparent',
                transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 32px 80px' }}>
        <ProgressBar done={doneCount} total={tabItems.length} />
        <div>
          {tabItems.map(item => (
            <AccordionItem
              key={item.id}
              item={item}
              checked={checked.includes(item.id)}
              onCheck={toggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
