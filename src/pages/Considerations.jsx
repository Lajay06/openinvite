import React, { useState, useEffect } from "react";
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const PJS = "'Plus Jakarta Sans', sans-serif";

// ── Profile builder ──────────────────────────────────────────────────────────

function buildProfile(weddingStyle) {
  const ws = Array.isArray(weddingStyle) ? weddingStyle : [];
  const has = (...values) => values.some(v => ws.includes(v));
  return {
    raw: ws,
    isHindu:         has('Hindu'),
    isMuslim:        has('Muslim'),
    isSikh:          has('Sikh'),
    isJewish:        has('Jewish'),
    isCatholic:      has('Catholic'),
    isChristian:     has('Christian', 'Catholic'),
    isBuddhist:      has('Buddhist'),
    isCivil:         has('Civil'),
    isNonReligious:  has('Non-religious'),
    isCulturalFusion:has('Cultural Fusion'),
    isReligious:     has('Hindu','Muslim','Sikh','Jewish','Catholic','Christian','Buddhist'),
    hasFaithDietary: has('Hindu','Muslim','Sikh','Jewish','Buddhist'),
    hasAlcoholRestriction: has('Muslim','Sikh','Buddhist'),
    isLuxury:        has('Luxury'),
    isMinimalist:    has('Minimalist'),
    isMaximalist:    has('Maximalist'),
    isBohemian:      has('Bohemian'),
    isTraditional:   has('Traditional'),
    isModern:        has('Modern'),
    isOutdoor:       has('Outdoor & nature'),
    isDestination:   has('Destination'),
    isMultiDay:      has('Multi-day'),
    isElopement:     has('Elopement'),
    isIntimate:      has('Intimate & romantic'),
    isParty:         has('Party & dancing'),
  };
}

// ── Resolve helper ───────────────────────────────────────────────────────────

function resolve(field, profile) {
  return typeof field === 'function' ? field(profile) : field;
}

// ── Item data ────────────────────────────────────────────────────────────────

const ALL_ITEMS = [

  // ── CULTURAL & RELIGIOUS ──────────────────────────────────────────────────

  {
    id: 'cr-ceremony-form',
    tab: 'cultural',
    title: p => p.isHindu ? 'Your Hindu ceremony structure' : p.isMuslim ? 'Your Nikah structure' : p.isSikh ? 'Your Anand Karaj structure' : p.isJewish ? 'Your Jewish ceremony structure' : p.isCatholic ? 'Your Catholic wedding Mass' : p.isChristian ? 'Your Christian ceremony structure' : p.isBuddhist ? 'Your Buddhist ceremony structure' : 'Your ceremony structure',
    tag: 'Foundation',
    relevance: p => p.isReligious || p.isCulturalFusion ? 'HIGH' : 'MEDIUM',
    body: p => {
      if (p.isHindu) return [
        'A Hindu wedding is not a single event — it is a sequence of rituals that unfold over hours or even days. The Saptapadi (seven steps around the sacred fire) is the legal and spiritual centrepiece, but rituals like Mehndi, Haldi, Sangeet, and the Baraat procession each carry deep meaning.',
        'Confirm with your pandit which rituals you will include and how long each takes. A full traditional ceremony can run four to six hours. Your venue and catering timelines must account for this.',
      ];
      if (p.isMuslim) return [
        'The Nikah is a legal contract witnessed by two Muslim adults. The ceremony itself is often brief — sometimes 20 to 30 minutes — but the surrounding events (Walima reception, Mehendi, separate gender gatherings) shape the overall day significantly.',
        'Discuss with your officiant whether the Mahr (gift) will be announced publicly or privately, and who will serve as the Wali (guardian). These decisions affect seating, timing, and your guest communications.',
      ];
      if (p.isSikh) return [
        'The Anand Karaj consists of four Laavaan (hymns) during which the couple circles the Guru Granth Sahib. The ceremony takes place in a Gurdwara, which has its own protocols around head covering, shoes, and behaviour.',
        'Non-Sikh guests will need guidance. Provide a printed or digital order-of-service explaining each stage, what to wear, and when it is appropriate to enter or exit. Langar (community meal) is traditionally served — coordinate with the Gurdwara kitchen early.',
      ];
      if (p.isJewish) return [
        'Jewish ceremonies involve the Chuppah (wedding canopy), Kiddushin (betrothal blessings), the exchange of a ring under the Chuppah, the Ketubah (marriage contract, traditionally read aloud), seven blessings (Sheva Brachot), and the breaking of the glass.',
        'Whether you are having an Orthodox, Conservative, Reform, or egalitarian ceremony changes many of these elements. Confirm the requirements of your rabbi early — some may require pre-marital counselling sessions, and the Ketubah must be signed before the ceremony.',
      ];
      if (p.isCatholic) return [
        'A Catholic wedding may be celebrated within a full Mass (approximately 60-75 minutes) or as a Rite of Marriage without Mass (approximately 30-45 minutes). The choice affects timing, music selections, and whether non-Catholic guests receive Communion.',
        'Your parish priest must verify that both parties are free to marry in the Church. Pre-Cana marriage preparation is required — usually a course or weekend retreat. Book this early, as popular dates fill months in advance.',
      ];
      if (p.isChristian) return [
        'Protestant and non-denominational Christian ceremonies vary widely by church tradition and individual pastor. Elements typically include opening prayer, scripture readings, a homily or message, vows, ring exchange, and a blessing.',
        'Meet with your officiant early to understand what flexibility you have over the order of service, music choices (live vs recorded), and whether communion will be offered. Some ministers require proof of baptism.',
      ];
      if (p.isBuddhist) return [
        'Buddhist wedding ceremonies vary considerably between traditions (Theravada, Mahayana, Zen) and between countries. Many begin with offerings to monks, chanting of suttas, and a blessing with holy water or incense.',
        'Discuss with your monk or lay officiant exactly which elements will be included. Some Buddhist traditions do not have a formal wedding ceremony at all — the blessing of the couple is instead woven into a broader merit-making ritual.',
      ];
      return [
        'Your ceremony is the legal and emotional heart of your wedding day. Understanding the full structure — vows, readings, music, any rituals, signing of documents — lets you build an accurate run sheet and avoid running over time.',
        'If you are having a civil ceremony, your celebrant is bound by legal requirements for the wording of vows and the presence of witnesses. Outside those constraints, most everything else is flexible.',
      ];
    },
    tips: p => {
      const base = [
        'Book your officiant before booking your venue — some religious officiants will only work in approved venues.',
        'Ask for a rehearsal. Complex ceremonies have many moving parts.',
      ];
      if (p.isHindu) return ['Hire a pandit who has experience with intercultural or mixed audiences if any guests will be unfamiliar with Hindu rituals.', ...base];
      if (p.isMuslim) return ['Check whether your venue permits prayer breaks — guests may need Dhuhr or Asr prayer time depending on the timing of your event.', ...base];
      if (p.isJewish) return ['Arrange your Ketubah signing at least 30 minutes before the ceremony begins. It requires two witnesses and takes time.', ...base];
      return base;
    },
    why: p => p.isReligious ? 'Religious ceremonies have requirements that directly affect venue, timing, catering, and guest communications. Getting this right early prevents expensive late changes.' : 'Understanding your ceremony structure is the single most important factor in building an accurate run sheet for the day.',
  },

  {
    id: 'cr-dietary-faith',
    tab: 'cultural',
    title: 'Faith-based dietary requirements',
    tag: 'Catering',
    relevance: p => p.hasFaithDietary ? 'HIGH' : 'LOW',
    body: p => {
      if (p.isHindu) return [
        'Many Hindu guests will be vegetarian or vegan. Some will not eat beef under any circumstances, and others follow Jain dietary practices (no root vegetables, no eating after sunset). Do not assume — ask on your RSVP form.',
        'Ensure your caterer can provide a fully vegetarian menu with clearly labelled dishes. Cross-contamination at the serving station is a significant concern for strict observers.',
      ];
      if (p.isMuslim) return [
        'Halal requirements mean all meat must be from animals slaughtered according to Islamic law, with a blessing. This applies to beef, lamb, and poultry — seafood is generally permissible. Pork and alcohol must be absent from a fully halal menu.',
        'If you are serving alcohol at a separate bar, ensure the food service areas are completely separate and clearly signed. Many Muslim guests will appreciate this accommodation even if they do not ask for it explicitly.',
      ];
      if (p.isSikh) return [
        'Many Sikh guests follow Amrit-caste dietary rules — no meat, no eggs, and no alcohol. Others are meat-eaters but will not eat beef. Langar (community meals in a Gurdwara) are always vegetarian.',
        'If your reception follows Langar tradition, work with the Gurdwara committee on the menu. If you are hosting a separate reception, clearly communicate what will be served so guests can plan accordingly.',
      ];
      if (p.isJewish) return [
        'Kosher requirements vary significantly by level of observance. At minimum, many Jewish guests avoid shellfish and pork. Stricter observers require fully certified Kosher catering — separate meat and dairy preparation, certified products, and sometimes a mashgiach (supervisor) on site.',
        'Ask your rabbi what standard of Kashrut is expected at this wedding, and source your caterer accordingly. Kosher-certified caterers are not available everywhere and must be booked very early.',
      ];
      if (p.isBuddhist) return [
        'Many Buddhist guests follow vegetarian or vegan diets, and some avoid pungent vegetables (onion, garlic, leeks). Alcohol is generally abstained from in more observant traditions.',
        'Provide robust vegetarian options and label all dishes clearly. If monks or nuns are attending, they typically eat before noon and will not eat an evening meal.',
      ];
      return ['Your guests have faith-based dietary needs. Communicate these clearly on your RSVP form and confirm your caterer can accommodate them.'];
    },
    tips: () => [
      'Include a dietary requirements field on your RSVP that explicitly lists Halal, Kosher, vegetarian, vegan, and Jain options.',
      'Ask your caterer for their supplier certifications in writing.',
    ],
    why: () => 'Failing to accommodate faith-based dietary needs is one of the most common ways guests feel excluded at weddings. Getting this right is a mark of respect for your community.',
  },

  {
    id: 'cr-alcohol',
    tab: 'cultural',
    title: 'Alcohol at faith-conscious celebrations',
    tag: 'Catering',
    relevance: p => p.hasAlcoholRestriction ? 'HIGH' : 'LOW',
    body: p => {
      if (p.isMuslim) return [
        'At a Muslim wedding, serving alcohol is generally considered haram. Many couples choose a fully dry reception, which is completely valid and can still be a joyful, celebratory occasion. Non-alcoholic mocktails, elaborate drinks stations, and great food create the same atmosphere.',
        'If you are having a mixed wedding where some guests are not Muslim and you wish to provide alcohol, discuss this honestly with your family and imam. A common compromise is to host two separate receptions, or to serve alcohol in a sectioned-off area of the venue.',
      ];
      if (p.isSikh) return [
        'Traditionally, Amrit-caste Sikhs (who have taken Amrit — a Sikh initiation) do not consume alcohol. Many Sikh weddings that take place in or near a Gurdwara are fully dry out of respect for this.',
        'If you are having your reception at a separate venue and wish to serve alcohol, this is a personal and family decision. Be mindful of the message it sends to Amrit-caste relatives and ensure they are not put in an uncomfortable position.',
      ];
      if (p.isBuddhist) return [
        'The fifth Buddhist precept is to refrain from intoxicants. For observant guests — particularly monks and nuns — serving alcohol may be inappropriate. Consider whether a dry or low-alcohol reception better reflects your values.',
        'If you do serve alcohol, ensure non-alcoholic options are equally prominent and not treated as an afterthought.',
      ];
      return ['Consider your guests\' relationship with alcohol when planning your beverage service.'];
    },
    tips: () => [
      'Invest in a skilled mocktail or non-alcoholic drinks programme — it elevates the experience for everyone.',
      'Communicate clearly on invitations whether the event is dry or alcohol is available.',
    ],
    why: () => 'Alcohol decisions affect venue licensing, guest comfort, and family dynamics. Making an informed, intentional choice early prevents awkward surprises on the day.',
  },

  {
    id: 'cr-cultural-fusion',
    tab: 'cultural',
    title: 'Blending two cultural traditions',
    tag: 'Design',
    relevance: p => p.isCulturalFusion || p.raw.length > 2 ? 'HIGH' : 'MEDIUM',
    body: () => [
      'When two cultural or religious traditions are woven into a single wedding, the result can be extraordinarily meaningful — but it requires more planning, more communication, and more intentional decisions than a single-tradition wedding.',
      'Start by identifying which elements from each tradition are non-negotiable for you and your families. Then look for moments where traditions can genuinely complement each other rather than compete. Avoid tokenism — including a ritual purely for aesthetics, without understanding its meaning, can feel hollow or disrespectful.',
      'A bilingual or multilingual order-of-service helps guests from each side feel included. A brief explanation of rituals — either printed, projected, or narrated by a MC — transforms confusion into appreciation.',
    ],
    tips: () => [
      'Find an officiant or celebrant who has experience with intercultural ceremonies. They will have navigated the logistics before.',
      'Allocate more time to family conversations than you think necessary — expectations on both sides can differ significantly.',
      'Consider having a cultural liaison or knowledgeable friend who can answer guest questions on the day.',
    ],
    why: () => 'Intercultural weddings are among the most memorable and meaningful. The investment in getting the details right pays off in a day that genuinely honours both families.',
  },

  {
    id: 'cr-legal-marriage',
    tab: 'cultural',
    title: 'Legal recognition of your religious ceremony',
    tag: 'Legal',
    relevance: p => p.isReligious ? 'HIGH' : 'MEDIUM',
    body: () => [
      'In many countries, a religious ceremony is not automatically a legally recognised marriage. You may need to also complete a civil ceremony — either before, after, or embedded within your religious one — for your marriage to be recorded with the government.',
      'Requirements vary by country and by religion. In Australia, your celebrant or minister must be registered with the Attorney-General\'s Department and must give you a Notice of Intended Marriage at least one month before the ceremony. In the UK, the rules differ by venue and faith tradition. Research the rules that apply to your specific situation.',
    ],
    tips: () => [
      'Confirm with your officiant whether they are legally authorised to solemnise marriages in your jurisdiction.',
      'If a separate civil ceremony is required, consider doing it quietly a few days before and keeping your religious ceremony as the main event.',
    ],
    why: () => 'Discovering after your wedding day that you are not legally married is a distressing and avoidable situation. Confirm the legal requirements early.',
  },

  // ── LOGISTICS ────────────────────────────────────────────────────────────

  {
    id: 'log-run-sheet',
    tab: 'logistics',
    title: p => p.isMultiDay ? 'Multi-day run sheet and coordination' : 'Run sheet and timeline',
    tag: 'Planning',
    relevance: () => 'HIGH',
    body: p => {
      if (p.isMultiDay) return [
        'A multi-day wedding requires a separate run sheet for each event — rehearsal dinner, wedding day, and post-wedding brunch or activities. Each sheet should list every vendor\'s arrival time, every transition point, and the name of the person responsible for each decision.',
        'Designate a day-of coordinator or at minimum a trusted person for each event. Do not attempt to manage logistics yourself while also being the couple. Even a well-organised friend is better than no one.',
      ];
      return [
        'A run sheet is not the same as a schedule. A schedule tells you when events happen. A run sheet tells you who is responsible, what the contingency is if something runs late, and what the vendor contact number is for every person on site.',
        'Build your run sheet from the ceremony time backwards. Work out when hair and makeup needs to start, when the photographer arrives, when florals are delivered, and when the venue team needs access. Every supplier should receive a copy of the portions relevant to them.',
      ];
    },
    tips: p => {
      const base = [
        'Add 15-20 minute buffers between major transitions. Something will run late.',
        'Share the run sheet with your photographer, MC, venue coordinator, and any family members helping on the day.',
      ];
      if (p.isMultiDay) return ['Nominate a different person to be the point of contact on each day.', ...base];
      return base;
    },
    why: () => 'The run sheet is the single document that prevents your wedding from descending into chaos. Time spent building it carefully is never wasted.',
  },

  {
    id: 'log-transport',
    tab: 'logistics',
    title: p => p.isDestination ? 'Destination transport and travel logistics' : p.isOutdoor ? 'Transport and access for your outdoor venue' : 'Guest and wedding party transport',
    tag: 'Transport',
    relevance: p => p.isDestination || p.isOutdoor || p.isMultiDay ? 'HIGH' : 'MEDIUM',
    body: p => {
      if (p.isDestination) return [
        'At a destination wedding, you are responsible for giving guests enough information to make their own travel decisions — and enough lead time to get good prices. Send save-the-dates 12 months out for international destinations, and include a travel information page on your wedding website.',
        'Negotiate a room block at your chosen hotel or resort. Even if you cannot guarantee the rooms, a block gives guests a discounted rate and keeps them in the same location — which is invaluable for atmosphere and logistics.',
        'Consider whether you want to arrange group airport transfers, and whether local activities between wedding events will be guided or self-directed.',
      ];
      if (p.isOutdoor) return [
        'Outdoor venues often have limited or unpaved parking, restricted access for catering trucks, and no natural shelter for guests arriving in adverse weather. Walk the site with your venue coordinator and map out exactly where cars, vendors, and guests will all arrive.',
        'If the venue is not easily walkable, consider shuttle buses between a nearby carpark and the site. This also reduces drink-driving risk at the end of the night.',
      ];
      return [
        'Guest transport is most critical for events that involve a venue change — for example, a ceremony location separate from the reception. Guests should never have to figure out transport themselves on the day.',
        'Consider chartered coaches, Uber codes, or designated carpark drop-off points. Communicate logistics clearly in your pre-wedding information pack.',
      ];
    },
    tips: () => [
      'Include a transport information section on your wedding website with maps, parking details, and shuttle timetables.',
      'Arrange a vehicle for the couple — do not rely on a guest or vendor.',
    ],
    why: p => p.isDestination ? 'Destination weddings require guests to invest significant time and money. Making the logistics easy is how you honour that commitment.' : 'Transport confusion causes stress for guests and delays your timeline. Clear, proactive communication prevents it.',
  },

  {
    id: 'log-contingency',
    tab: 'logistics',
    title: p => p.isOutdoor ? 'Wet weather contingency for your outdoor wedding' : 'Contingency planning',
    tag: 'Risk',
    relevance: p => p.isOutdoor ? 'HIGH' : 'MEDIUM',
    body: p => {
      if (p.isOutdoor) return [
        'An outdoor wedding without a wet weather plan is an enormous risk. You need a confirmed backup option — not a vague idea of one — before you finalise your venue booking. Options include a marquee, an indoor space at the same property, or a nearby venue you have pre-booked.',
        'Your decision window matters. Decide how close to the wedding day you will make the call to move indoors, and who makes that decision. Communicate this window to guests in advance so they are not left guessing.',
        'Even in good weather, outdoor events require sunscreen stations, shade areas for elderly or young guests, and a plan for unexpected heat or cold. In warmer climates, start times in late afternoon are often better than midday.',
      ];
      return [
        'Every wedding should have contingency thinking even if it is not outdoor. What happens if a key vendor cancels? What if the venue has a power outage? What if a member of the wedding party is ill?',
        'You do not need a plan for every scenario, but you should identify your three or four highest-risk failure points and have a response ready for each.',
      ];
    },
    tips: p => {
      if (p.isOutdoor) return [
        'Hire a marquee specialist even if you hope not to use it.',
        'Put the wet weather plan in writing and share it with all vendors and key family members.',
        'Check your venue contract: who decides when the contingency is activated?',
      ];
      return ['Wedding insurance covers cancellation, vendor failure, and some property damage. It is inexpensive relative to your total spend.'];
    },
    why: p => p.isOutdoor ? 'The weather is completely outside your control. Thorough planning is the only leverage you have.' : 'Contingency planning is not pessimism — it is what separates couples who handle problems gracefully from those who are devastated by them.',
  },

  {
    id: 'log-vendor-comms',
    tab: 'logistics',
    title: 'Vendor briefing and communication',
    tag: 'Vendors',
    relevance: () => 'MEDIUM',
    body: () => [
      'Every vendor on your wedding day needs three things: a clear briefing document, a copy of the run sheet relevant to their role, and a single point of contact who can make decisions without interrupting you.',
      'Send a consolidated briefing email two weeks before the wedding confirming arrival times, access instructions, parking, and emergency contacts. Ask each vendor to confirm receipt. Do not leave this until the week before.',
    ],
    tips: () => [
      'Create a vendor contact sheet with every supplier\'s name, phone, and scheduled arrival time. Give a copy to your coordinator, your parents, and your venue.',
      'Confirm all vendors the week before. Cancellations do happen.',
    ],
    why: () => 'Vendor problems on the day are almost always caused by poor communication beforehand. A well-briefed vendor team runs quietly in the background while you enjoy your day.',
  },

  {
    id: 'log-accessibility',
    tab: 'logistics',
    title: 'Accessibility for all guests',
    tag: 'Guest care',
    relevance: () => 'MEDIUM',
    body: () => [
      'Consider whether your venues — ceremony, cocktail hour, and reception — are fully accessible for guests with mobility limitations, visual or hearing impairments, or age-related challenges. Steps, cobblestones, long walking distances, and low lighting are common barriers at otherwise beautiful venues.',
      'Ask your venue specifically: Is there a step-free entrance? Are accessible bathrooms available? Is there a designated drop-off point? Is the audio system compatible with hearing loops? Document the answers.',
    ],
    tips: () => [
      'Consider elderly or mobility-limited guests when planning seating locations — they should be close to the aisle, exits, and bathrooms.',
      'Include accessibility information in your pre-wedding communications so guests can plan.',
    ],
    why: () => 'Accessibility planning is an act of inclusion. Every guest deserves to participate fully in your celebration without having to navigate it alone.',
  },

  // ── GUEST EXPERIENCE ────────────────────────────────────────────────────

  {
    id: 'gx-rsvp',
    tab: 'guest',
    title: 'RSVP design and guest communication',
    tag: 'Guests',
    relevance: () => 'HIGH',
    body: p => {
      if (p.isDestination) return [
        'For a destination wedding, your RSVP process needs to provide guests with enough information to book travel and accommodation. Send save-the-dates at least 12 months in advance, and include a travel FAQ page on your wedding website from the start.',
        'Your RSVP form should collect: attendance confirmation, dietary requirements, song requests if you want them, and any accessibility needs. For a destination event, also ask which pre-wedding activities guests plan to attend.',
      ];
      if (p.isIntimate) return [
        'With a smaller guest list, you have the luxury of a more personal invitation experience. Hand-delivered invitations, personalised notes, or phone calls to confirm attendance are all appropriate and appreciated at an intimate gathering.',
        'Your RSVP form should still collect dietary requirements, any accessibility needs, and a reply deadline — even for a small group.',
      ];
      return [
        'Your RSVP process is the first real logistical interaction guests have with your wedding. A clear, easy-to-use RSVP — ideally digital — with a firm deadline and a dietary requirements field will save you significant headaches when finalising numbers with your caterer.',
        'Set your RSVP deadline 3-4 weeks before your wedding day. This gives you time to chase non-responders and finalise numbers without a last-minute scramble.',
      ];
    },
    tips: () => [
      'Chase non-responders personally — email is often ignored. A direct message or call is more effective.',
      'Include your RSVP deadline clearly on the invitation, not just the envelope or website.',
    ],
    why: () => 'Accurate final numbers affect catering costs, seating arrangements, and venue setup. A well-managed RSVP process is foundational to everything else.',
  },

  {
    id: 'gx-seating',
    tab: 'guest',
    title: p => p.isIntimate ? 'Seating for an intimate gathering' : 'Seating plan strategy',
    tag: 'Guests',
    relevance: () => 'HIGH',
    body: p => {
      if (p.isIntimate) return [
        'With fewer than 50 guests, a formal seating plan may not be necessary — open seating with a few reserved tables for immediate family and elderly guests often works beautifully at intimate celebrations.',
        'If you do seat guests formally, the smaller scale gives you the flexibility to genuinely think about who each person knows, who they would enjoy talking to, and any tensions to navigate. Take advantage of that.',
      ];
      return [
        'A seating plan for a large wedding is a significant undertaking — typically two to four hours of work once you have your final RSVPs. Start by grouping guests by relationship (family groups, work colleagues, school friends, partner\'s family etc.) and then assign groups to tables.',
        'Avoid separating couples unless they prefer it. Seat elderly guests near exits and bathrooms. Think carefully about who you place at the bridal table — those guests will be less free to mingle during dinner.',
      ];
    },
    tips: () => [
      'Use a digital seating tool rather than spreadsheets — it makes swaps much easier.',
      'Print table numbers and escort cards as late as possible — last-minute changes are inevitable.',
    ],
    why: () => 'A thoughtful seating plan can transform a room of acquaintances into a room of conversations. It is one of the highest-return investments of planning time.',
  },

  {
    id: 'gx-children',
    tab: 'guest',
    title: 'Children at your wedding',
    tag: 'Guests',
    relevance: () => 'MEDIUM',
    body: () => [
      'Deciding whether children are invited — and if so, which ones — is one of the most common sources of family tension in wedding planning. Make your decision early, communicate it clearly and consistently, and do not make exceptions that will leak back to families who were told no.',
      'If children are attending, consider their experience: a dedicated children\'s area with activities, a simplified kids\' menu, early leave permission for parents, and a quiet space for naps or meltdowns all make a meaningful difference.',
    ],
    tips: () => [
      'If your wedding is child-free, say so clearly on the invitation rather than waiting for parents to ask.',
      'Consider offering to help families find babysitters or childcare for the night — a list of local agencies in your pre-wedding communication is a thoughtful touch.',
    ],
    why: () => 'A clear, consistent policy prevents misunderstandings and protects family relationships. Ambiguity is what causes offence — not the decision itself.',
  },

  {
    id: 'gx-entertainment',
    tab: 'guest',
    title: p => p.isParty ? 'Entertainment for a dance-focused celebration' : 'Entertainment and atmosphere',
    tag: 'Entertainment',
    relevance: p => p.isParty ? 'HIGH' : 'MEDIUM',
    body: p => {
      if (p.isParty) return [
        'For a party-focused wedding, entertainment is a core part of the experience, not an afterthought. The key decision is live band vs DJ vs hybrid — each has different implications for cost, sound quality, song flexibility, and atmosphere.',
        'A live band creates energy that is hard to replicate, but your song selection is limited to the band\'s repertoire. A DJ offers complete flexibility but depends heavily on the individual\'s ability to read the room. Many couples hire a DJ who also incorporates live musicians.',
        'Brief your entertainer on your crowd: average age, cultural background, any songs that are meaningful, any genres to avoid. The more context they have, the better they can serve the room.',
      ];
      return [
        'Entertainment shapes the emotional arc of your wedding — from the pre-ceremony music that sets the mood to the last song of the night. Even if dancing is not a priority, the background music, any speeches, and the overall flow of energy all matter.',
        'Consider: acoustic music during dinner, a playlist curated by you for cocktail hour, or a live string quartet for the ceremony. These touches are noticed and remembered.',
      ];
    },
    tips: p => {
      if (p.isParty) return [
        'Ask your DJ or band for recordings or reviews from previous weddings.',
        'Discuss the power-down protocol — when the music ends affects the atmosphere of the final hour significantly.',
      ];
      return ['Music is the emotion of your wedding. Do not default to a generic playlist — curate it.'];
    },
    why: () => 'Entertainment is one of the things guests talk about most after a wedding. The right entertainment makes a good wedding unforgettable.',
  },

  {
    id: 'gx-speeches',
    tab: 'guest',
    title: 'Speeches and their timing',
    tag: 'Programme',
    relevance: () => 'MEDIUM',
    body: () => [
      'Speeches are one of the highest-variance elements of a wedding — a great speech is a highlight of the evening; a poor one can derail the atmosphere for an hour. Three to five speeches is typically enough. More than five and attention flags.',
      'Common order: welcome from the venue host or MC, father or parent of one partner, best man or maid of honour, couple\'s combined speech. Toast speeches should be no longer than five minutes each; more is rarely better.',
      'Talk to speakers in advance about length and content. It is entirely appropriate to ask them not to tell certain stories or to avoid certain topics.',
    ],
    tips: () => [
      'Speeches before the main course keeps energy high. Speeches after dessert often lose the room.',
      'Give each speaker a firm time limit and ask them to rehearse.',
      'Have a kind but firm MC who can step in if a speech runs long.',
    ],
    why: () => 'Speeches are a gift of time and love from the people who matter most to you. A little guidance ensures they land the way the speaker intends.',
  },

  // ── LEGAL ────────────────────────────────────────────────────────────────

  {
    id: 'leg-notice',
    tab: 'legal',
    title: 'Notice of intended marriage',
    tag: 'Legal',
    relevance: () => 'HIGH',
    body: () => [
      'In Australia, you are legally required to lodge a Notice of Intended Marriage (NOIM) with your registered celebrant at least one month before your wedding and no more than 18 months before. Without it, your marriage cannot be legally solemnised.',
      'Your celebrant will need to verify the identity of both parties — passport, birth certificate, or similar. If either partner has been previously married, you will need to provide documentary evidence that the marriage has ended (death certificate or divorce order).',
    ],
    tips: () => [
      'Lodge your NOIM well before the one-month minimum. One month is the legal floor — celebrants appreciate more lead time.',
      'Confirm your celebrant is registered on the official list of marriage celebrants in your jurisdiction.',
    ],
    why: () => 'The NOIM is a legal prerequisite. There is no way around it, and the consequences of overlooking it are severe.',
  },

  {
    id: 'leg-name-change',
    tab: 'legal',
    title: 'Name change after marriage',
    tag: 'Legal',
    relevance: () => 'MEDIUM',
    body: () => [
      'If either partner plans to take the other\'s surname, or if you plan to hyphenate or create a blended name, you will need to update a range of official documents after the wedding. The marriage certificate is the trigger document for all of these changes.',
      'Documents to update typically include: passport, driver\'s licence, bank accounts, superannuation, electoral roll, Medicare, employer payroll, and any professional registrations. The process varies by jurisdiction but usually starts with the state\'s Births Deaths and Marriages office.',
    ],
    tips: () => [
      'Do not book your honeymoon flights under a new name until your passport is updated.',
      'Some institutions require original documents, not copies. Plan accordingly.',
    ],
    why: () => 'Name change administration is a significant post-wedding task. Planning for it in advance means you are not dealing with a long to-do list in the first weeks of marriage.',
  },

  {
    id: 'leg-prenup',
    tab: 'legal',
    title: 'Financial agreements before marriage',
    tag: 'Legal',
    relevance: p => p.isLuxury ? 'HIGH' : 'MEDIUM',
    body: () => [
      'A Binding Financial Agreement (sometimes called a prenuptial agreement) is a legal document that records how assets and liabilities would be divided in the event of separation. In Australia, both parties must receive independent legal advice before signing.',
      'These agreements are not a sign of distrust — they are a practical tool for couples who both have significant assets, who have children from previous relationships, or who are entering marriage with substantially different financial positions.',
    ],
    tips: () => [
      'Consult a family lawyer who specialises in financial agreements — the document must meet specific legal requirements to be binding.',
      'Allow at least three months for this process. It often takes longer than expected.',
    ],
    why: () => 'A well-drafted financial agreement protects both parties and removes ambiguity. It is much easier to discuss and agree on these matters before marriage than during or after a separation.',
  },

  {
    id: 'leg-wills',
    tab: 'legal',
    title: 'Wills and estate planning',
    tag: 'Legal',
    relevance: () => 'MEDIUM',
    body: () => [
      'In most Australian states, marriage automatically revokes any existing will. This means that if either partner has a will written before the wedding and does not update it, they effectively die intestate (without a valid will) — even if the will is recent.',
      'This is the right time to write or update your wills, review your superannuation beneficiary nominations (which sit outside your estate and must be updated separately), and update your life insurance beneficiaries.',
    ],
    tips: () => [
      'Book an appointment with an estate planning lawyer or solicitor in the weeks after your wedding.',
      'Do not rely on cheap online will templates for complex situations — professional advice is worth the cost.',
    ],
    why: () => 'Estate planning is an act of care for the person you are marrying. Dealing with it now, while the legal landscape is changing, is the most efficient time.',
  },

  // ── BUDGET ───────────────────────────────────────────────────────────────

  {
    id: 'bud-total',
    tab: 'budget',
    title: p => p.isLuxury ? 'Budgeting for a luxury wedding' : p.isElopement ? 'Budgeting for an elopement' : 'Setting and managing your total budget',
    tag: 'Finance',
    relevance: () => 'HIGH',
    body: p => {
      if (p.isLuxury) return [
        'A luxury wedding budget requires a different kind of management than a mid-range one. The key challenge is scope creep — premium vendors upsell continuously, and it is easy to approve each individual upgrade without realising how far you have moved from your original number.',
        'Assign a fixed contingency buffer (typically 10-15% of total budget) at the beginning and do not allow it to be absorbed by vendor upgrades. It is there for genuine surprises, not incremental indulgences.',
        'Luxury vendors often require larger deposits earlier and have stricter cancellation terms. Read every contract carefully and ensure your event insurance matches your financial exposure.',
      ];
      if (p.isElopement) return [
        'An elopement budget is dramatically simpler than a traditional wedding — but that does not mean there are no decisions to make. Photography is typically the highest single cost in an elopement and is worth allocating generously, as it is often all you will have to share with family afterwards.',
        'Budget for: photography (potentially full day), officiant fee, travel if the location is remote, outfits, hair and makeup, a celebratory meal, and any accommodation.',
      ];
      return [
        'Before allocating anything, agree on a total number that both partners are genuinely comfortable with — not an aspirational figure that assumes optimistic cost estimates. Then allocate percentages to each category: venue and catering typically absorb 45-55% of a total wedding budget.',
        'Track every confirmed and estimated spend in a single place from day one. The most common cause of budget blowout is not one big decision — it is dozens of small incremental additions that were never counted together.',
      ];
    },
    tips: () => [
      'Build a 10-15% contingency into your budget from the beginning. Something will cost more than you expect.',
      'Separate your confirmed and estimated spend columns clearly. Confirmed is what you have signed for. Estimated is everything else.',
    ],
    why: () => 'Budget clarity at the beginning of planning prevents the financial stress that derails so many couples mid-engagement. The conversations are harder to have later.',
  },

  {
    id: 'bud-deposits',
    tab: 'budget',
    title: 'Deposits, payment schedules, and cancellation terms',
    tag: 'Finance',
    relevance: () => 'HIGH',
    body: () => [
      'Most wedding vendors require a deposit (typically 20-50% of total cost) to hold your date, with the balance due shortly before the wedding. Cash flow planning matters: your total deposit commitments in the first three months of booking can be significant.',
      'Read every contract\'s cancellation clause carefully before signing. Understand: what happens if you cancel? What happens if the vendor cancels? What happens in a force majeure situation? Many wedding contracts became contentious during COVID — the landscape has shifted and clauses are now more specific.',
    ],
    tips: () => [
      'Map out all deposit and payment due dates in a calendar so you are never surprised by a payment.',
      'Ask vendors whether they carry their own insurance. If they cancel, is your deposit refundable?',
    ],
    why: () => 'Understanding your financial commitments and cancellation exposure before you sign protects you from significant losses if circumstances change.',
  },

  {
    id: 'bud-hidden',
    tab: 'budget',
    title: 'Common hidden costs',
    tag: 'Finance',
    relevance: () => 'MEDIUM',
    body: () => [
      'Wedding budgets are routinely underestimated because certain costs are easy to overlook in the excitement of planning. The most commonly missed items are: vendor meal allowances (most caterers charge per vendor), gratuities and service charges, wedding night accommodation, rehearsal dinner costs, wedding party gift expenses, alterations and accessory costs for outfits, and postage for physical invitations.',
      'Stationery costs are particularly easy to underestimate — design, printing, envelopes, stamps, and postage together can be several hundred dollars for a mid-sized wedding.',
    ],
    tips: () => [
      'Ask every vendor what is NOT included in their quote before you compare prices.',
      'Create a list of costs you forgot to budget for as you plan — you will be surprised what accumulates.',
    ],
    why: () => 'Hidden costs do not announce themselves. Hunting for them deliberately is the only way to avoid discovering them when it is too late to adjust.',
  },

  {
    id: 'bud-savings',
    tab: 'budget',
    title: p => p.isMinimalist ? 'Elegant economies in a minimalist wedding' : 'Smart savings without compromising quality',
    tag: 'Finance',
    relevance: p => p.isMinimalist || p.isBohemian ? 'HIGH' : 'MEDIUM',
    body: p => {
      if (p.isMinimalist) return [
        'A minimalist wedding is inherently well-suited to cost efficiency — restraint is the point. The key is to spend deliberately on the things that will be most visible and experienced, and to genuinely simplify everything else.',
        'Single-variety florals (such as all-white ranunculus or all-green eucalyptus) cost less and look more intentional than mixed arrangements. Fewer but better-quality dishes is preferable to a large buffet of average food. A single beautiful venue eliminates transport costs.',
      ];
      return [
        'The highest-return areas to invest in are: photography (you will look at it forever), food and drink (your guests will talk about it), and music (it drives the atmosphere of the night). These are not areas to economise heavily.',
        'Lower-risk areas to save: stationery (digital invitations are now widely accepted), favours (most end up uncollected), and extensive florals (greenery and foliage are beautiful and far cheaper than blooms).',
      ];
    },
    tips: () => [
      'A Sunday or Friday wedding at the same venue can cost 15-30% less than a Saturday.',
      'Ask vendors whether they offer off-peak pricing or have any packages not listed on their website.',
    ],
    why: () => 'Knowing where quality genuinely matters and where it does not lets you allocate your budget where it will have the most impact.',
  },

  // ── VENDORS ──────────────────────────────────────────────────────────────

  {
    id: 'vnd-photographer',
    tab: 'vendors',
    title: 'Choosing your photographer',
    tag: 'Vendors',
    relevance: () => 'HIGH',
    body: p => {
      if (p.isElopement) return [
        'For an elopement, your photographer is arguably the most important vendor you will book — they are often your only witness and will create the record of the day you share with family who could not be there.',
        'Look for a photographer who specialises in elopements and adventure sessions. Their ability to work in natural light, navigate remote locations, and direct you authentically is different from a traditional wedding photographer\'s skill set.',
      ];
      if (p.isMultiDay || p.isDestination) return [
        'For a multi-day or destination wedding, confirm exactly which events your photographer will attend and what is included in the package. Travel, accommodation, and per diem for the photographer and second shooter can add significantly to the cost.',
        'A second shooter is particularly valuable at complex multi-day events where different things happen simultaneously.',
      ];
      return [
        'Photography is one of the most important investments you will make — it is what remains long after the day itself. Before booking, review a complete wedding gallery (not just the highlight portfolio), which shows how the photographer handles an entire day including less photogenic moments.',
        'Consider: editing style (light and airy vs dark and moody vs documentary), personality (you will spend more time with them than almost any other vendor), and whether they have a second shooter included.',
      ];
    },
    tips: () => [
      'Meet your photographer in person or via video call before booking. Chemistry matters enormously.',
      'Confirm who owns the copyright and what usage rights you have over the images.',
      'Discuss a shot list but do not over-prescribe — experienced photographers know what moments to watch for.',
    ],
    why: () => 'In 30 years, your photographs are what you and your children will have. Book a photographer whose work genuinely moves you.',
  },

  {
    id: 'vnd-catering',
    tab: 'vendors',
    title: p => p.isLuxury ? 'Premium catering and your guests\' culinary experience' : 'Catering style and food experience',
    tag: 'Vendors',
    relevance: () => 'HIGH',
    body: p => {
      if (p.isLuxury) return [
        'At a luxury wedding, catering is an experience — not just sustenance. The style of service (plated, degustation, live cooking stations, interactive elements) is as important as the food quality. Confirm with your caterer whether they have worked at your venue before and whether they are familiar with its kitchen facilities.',
        'Wine pairing, a curated cocktail menu, and premium spirits all contribute to the experience but can significantly increase per-head costs. Decide early what level of beverage service you want included.',
      ];
      return [
        'Your catering style — sit-down plated meal, buffet, share plates, cocktail reception, or food stations — determines much of the venue layout, timeline, and per-head cost. Each has different implications for staff numbers, timing, and atmosphere.',
        'Cocktail receptions encourage mingling but can leave guests hungry if not managed carefully. Buffets give choice but require more space and staffing. Seated plated meals create the most formal atmosphere and are typically the most expensive per head.',
      ];
    },
    tips: () => [
      'Always do a food tasting before finalising your menu — verbal descriptions do not convey what the plate actually delivers.',
      'Confirm the staff-to-guest ratio and whether it meets your service style expectations.',
      'Ask who your day-of catering manager will be — that person, not the business owner, is who you are relying on.',
    ],
    why: () => 'Catering accounts for a large portion of your budget and dominates your guests\' experience for several hours. It warrants careful evaluation.',
  },

  {
    id: 'vnd-flowers',
    tab: 'vendors',
    title: p => p.isMaximalist ? 'Floral design for a maximalist celebration' : p.isMinimalist ? 'Restrained florals for a minimalist aesthetic' : 'Florals and botanical styling',
    tag: 'Vendors',
    relevance: p => p.isMaximalist || p.isMinimalist ? 'HIGH' : 'MEDIUM',
    body: p => {
      if (p.isMaximalist) return [
        'Maximalist florals — large-scale installations, floral arches, cascading table arrangements, flower walls — create impact but require significant budget and lead time. Many statement pieces need to be hand-constructed on site, which means your florist and their team need venue access hours before guests arrive.',
        'Confirm that your venue allows candles, hanging installations, and any structural attachments. Some venues prohibit certain adhesives, open flames, or ceiling rigging. Knowing this early prevents expensive design revisions.',
      ];
      if (p.isMinimalist) return [
        'A minimalist approach to florals can be just as beautiful as an abundant one. Single-variety arrangements, potted plants, dried botanicals, and greenery-focused designs all read as considered and intentional rather than sparse.',
        'Wildflowers, eucalyptus, and seasonal locally-grown varieties are typically more affordable than imported blooms and often more striking in minimalist arrangements.',
      ];
      return [
        'Your florist interprets your aesthetic vision through living material. Choose one whose portfolio genuinely aligns with the look you want — and who can work with your seasonal availability and budget.',
        'Florists quote based on stem counts and species. The price difference between in-season local flowers and imported statement blooms can be enormous. Discuss this with your florist early.',
      ];
    },
    tips: () => [
      'Bring reference images to every florist consultation — they are worth more than verbal descriptions.',
      'Ask about repurposing ceremony florals at the reception to maximise your spend.',
    ],
    why: () => 'Florals contribute significantly to the atmosphere and visual language of your wedding. A florist who understands your vision becomes a creative partner.',
  },

  {
    id: 'vnd-contracts',
    tab: 'vendors',
    title: 'Reviewing vendor contracts',
    tag: 'Legal',
    relevance: () => 'MEDIUM',
    body: () => [
      'Every vendor contract should clearly state: exactly what is included, what the total cost is, what the payment schedule is, what the cancellation policy is on both sides, and what the contingency is if the vendor cannot perform on the day.',
      'Pay particular attention to substitution clauses — some contracts allow vendors to send a substitute without your consent. If the specific photographer, florist, or celebrant is the reason you booked, ensure the contract names that individual.',
    ],
    tips: () => [
      'Never pay a vendor in full before the event.',
      'If anything in a contract concerns you, ask for it to be changed — reputable vendors will negotiate reasonable terms.',
    ],
    why: () => 'Vendor contracts are your primary protection when things go wrong. Reading them carefully before signing is not pessimistic — it is professional.',
  },

];

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'cultural',  label: 'Cultural & religious' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'guest',     label: 'Guest experience' },
  { key: 'legal',     label: 'Legal' },
  { key: 'budget',    label: 'Budget' },
  { key: 'vendors',   label: 'Vendors' },
];

// ── Build tab items ───────────────────────────────────────────────────────────

const RELEVANCE_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function buildTabItems(tabKey, profile) {
  return ALL_ITEMS
    .filter(item => item.tab === tabKey)
    .map(item => ({
      ...item,
      _title:     resolve(item.title,     profile),
      _relevance: resolve(item.relevance, profile),
      _body:      resolve(item.body,      profile),
      _tips:      resolve(item.tips,      profile),
      _why:       resolve(item.why,       profile),
    }))
    .filter(item => item._relevance !== 'LOW')
    .sort((a, b) => RELEVANCE_ORDER[a._relevance] - RELEVANCE_ORDER[b._relevance]);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RelevancePill() {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 999,
      background: 'rgba(224,53,83,0.08)',
      color: '#E03553', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', fontFamily: PJS,
      flexShrink: 0,
    }}>
      Highly relevant
    </span>
  );
}

function TagPill({ tag }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', borderRadius: 999,
      background: 'rgba(10,10,10,0.05)',
      color: 'rgba(10,10,10,0.5)', fontSize: 11, fontWeight: 600,
      fontFamily: PJS, flexShrink: 0,
    }}>
      {tag}
    </span>
  );
}

function AccordionItem({ item }) {
  const [open, setOpen] = useState(item._relevance === 'HIGH');

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
          {item._title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item._relevance === 'HIGH' && <RelevancePill />}
          <TagPill tag={item.tag} />
          {open
            ? <ChevronUp size={15} style={{ color: 'rgba(10,10,10,0.35)' }} />
            : <ChevronDown size={15} style={{ color: 'rgba(10,10,10,0.35)' }} />
          }
        </div>
      </button>

      {open && (
        <div style={{ paddingBottom: 24 }}>
          {item._body.map((para, i) => (
            <p key={i} style={{
              fontSize: 14, lineHeight: 1.75, color: 'rgba(10,10,10,0.75)',
              fontFamily: PJS, margin: i === 0 ? '0 0 12px' : '12px 0 0',
            }}>
              {para}
            </p>
          ))}

          {item._tips && item._tips.length > 0 && (
            <div style={{ marginTop: 18, padding: '14px 16px', background: 'rgba(10,10,10,0.03)', borderLeft: '3px solid rgba(10,10,10,0.12)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 10px' }}>
                Tips
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {item._tips.map((tip, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, marginBottom: i < item._tips.length - 1 ? 6 : 0, lineHeight: 1.6 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item._why && (
            <p style={{ fontSize: 12, fontStyle: 'italic', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '14px 0 0', lineHeight: 1.6 }}>
              Why this matters: {item._why}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Considerations() {
  const [weddingStyle, setWeddingStyle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('cultural');

  useEffect(() => {
    getMyWeddingDetails()
      .then(r => {
        r = r || {};
        setWeddingStyle(Array.isArray(r.weddingStyle) ? r.weddingStyle : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.4)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const profile = buildProfile(weddingStyle);
  const contextPills = profile.raw;
  const tabItems = buildTabItems(tab, profile);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader
        title="Considerations"
        subtitle="An intelligent guide to what matters most for your wedding"
      />

      {/* Context banner */}
      <div style={{ padding: '16px 32px 0', maxWidth: 860, margin: '0 auto' }}>
        {contextPills.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Personalised for:</span>
            {contextPills.map(pill => (
              <span key={pill} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
              }}>
                {pill}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', fontFamily: PJS }}>
              Add your wedding style in Event details to see personalised guidance.
            </span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', overflowX: 'auto', marginTop: 20 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px', display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: PJS,
                color: tab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
                borderBottom: tab === t.key ? '2px solid #0A0A0A' : '2px solid transparent',
                transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 32px 80px' }}>
        {tabItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              No considerations apply here based on your wedding profile.
            </p>
          </div>
        ) : (
          tabItems.map(item => <AccordionItem key={item.id} item={item} />)
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
