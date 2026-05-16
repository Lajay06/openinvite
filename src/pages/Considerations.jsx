import React, { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeDetails } from "@/entities/ThemeDetails";
import { 
  Heart, Users, Leaf, DollarSign, Lightbulb, Sparkles, CheckCircle,
  Feather, Gem, Brush, Landmark, Sprout, BookOpen, Globe, Palette, Loader2,
  Clock, Info, Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";

const weddingTypeGuides = {
  "Outdoor Garden": {
    hero: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&h=400&fit=crop",
    description: "Embrace nature's beauty with an enchanting outdoor garden celebration",
    essentials: [
      { title: "Weather Backup Plan", desc: "Secure a tent or indoor space as contingency. Check weather patterns for your date.", icon: "☂️" },
      { title: "Shade & Comfort", desc: "Provide parasols, fans, or cooling stations for warm weather comfort.", icon: "🌞" },
      { title: "Evening Lighting", desc: "String lights, lanterns, and pathway lighting create magical ambiance.", icon: "✨" },
      { title: "Stable Furniture", desc: "Choose sturdy pieces that won't sink into soft ground or grass.", icon: "🪑" },
      { title: "Sound System", desc: "Account for open-air acoustics and potential wind interference.", icon: "🔊" },
      { title: "Bug Control", desc: "Natural repellents, citronella candles, and bug spray stations.", icon: "🦟" }
    ],
    food: {
      style: "Farm-to-table, seasonal menu",
      suggestions: [
        "Garden salads with edible flowers and local greens",
        "Herb-crusted chicken or roasted vegetables",
        "Seasonal fruit tarts and lemon desserts",
        "Rosemary lemonade and botanical cocktails",
        "Cheese and charcuterie boards with local selections",
        "Fresh berry parfaits or pavlova"
      ]
    },
    music: {
      ceremony: "String quartet or acoustic guitar",
      reception: "Jazz trio, acoustic band, or soft indie music",
      suggestions: ["Live musicians visible in garden setting", "Unplugged/acoustic sets to blend with nature", "Volume levels respectful of outdoor environment"]
    },
    attire: {
      couple: "Light, flowing fabrics; garden party elegance; floral crowns or natural hair accessories",
      guests: "Garden party attire; floral prints; light colors; wedges or block heels for grass",
      note: "Remind guests about outdoor terrain and weather-appropriate clothing"
    },
    decor: {
      palette: "Soft pastels, sage green, ivory, blush pink, lavender",
      elements: ["Wildflower arrangements", "Wooden arbors with climbing vines", "Vintage lanterns and candles", "Natural linen tablecloths", "Potted herbs as centerpieces", "Hanging floral installations"]
    },
    timeline: [
      { time: "4:00 PM", event: "Guest Arrival", detail: "Cocktail hour in garden setting" },
      { time: "5:00 PM", event: "Ceremony", detail: "Golden hour natural lighting" },
      { time: "5:45 PM", event: "Reception Begins", detail: "Transition to dining area" },
      { time: "9:00 PM", event: "Evening Dancing", detail: "Under string lights and stars" }
    ],
    recommendations: [
      "Seasonal blooms and local flowers reduce costs and support sustainability",
      "Grass-friendly footwear recommendations for guests (wedges, flats)",
      "Consider sunrise/sunset timing for ceremony photos",
      "Have blankets available for cooler evening temperatures",
      "Generator backup for all electrical needs",
      "Assign staff for quick weather decision-making"
    ]
  },
  "Beach": {
    hero: "https://images.unsplash.com/photo-1519167758481-83f29da8c2d0?w=1200&h=400&fit=crop",
    description: "Sun, sand, and celebration by the shore",
    essentials: [
      { title: "Permits & Regulations", desc: "Check local beach permits, noise ordinances, and alcohol policies.", icon: "📋" },
      { title: "Tide Schedule", desc: "Plan ceremony timing around tide patterns to avoid water intrusion.", icon: "🌊" },
      { title: "Sand-Friendly Setup", desc: "Weighted decorations, sturdy arches, and stabilized furniture.", icon: "⚓" },
      { title: "Guest Comfort", desc: "Provide flip-flops basket, sunscreen, and shaded seating areas.", icon: "🩴" },
      { title: "Wind Management", desc: "Secure all decor, consider hair/veil strategies, weighted programs.", icon: "💨" },
      { title: "Sound Amplification", desc: "Enhanced sound system to overcome ocean noise.", icon: "📢" }
    ],
    food: {
      style: "Fresh seafood and coastal cuisine",
      suggestions: [
        "Raw oyster bar and fresh ceviche",
        "Grilled fish tacos or fish and chips stations",
        "Lobster rolls and shrimp cocktail",
        "Tropical fruit platters and coconut desserts",
        "Frozen margaritas and mai tais",
        "Key lime pie or tres leches cake"
      ]
    },
    music: {
      ceremony: "Steel drums or acoustic guitar",
      reception: "Reggae, tropical house, beach-themed playlist",
      suggestions: ["Live steel drum during cocktail hour", "Island-inspired DJ sets", "Acoustic covers of beach classics"]
    },
    attire: {
      couple: "Lightweight, breathable fabrics; shorter hemlines or tea-length; barefoot or sandals; hair down or loose waves",
      guests: "Beach casual or resort wear; sundresses; linen suits; sandals or barefoot; sun hats welcomed",
      note: "Emphasize comfort and sun protection; suggest layers for evening breeze"
    },
    decor: {
      palette: "Ocean blues, sandy beige, coral, turquoise, white",
      elements: ["Driftwood arbors", "Seashell and starfish accents", "Hurricane vases with candles", "Tropical flowers (plumeria, hibiscus)", "Nautical ropes and anchors", "Palm fronds and beach grass"]
    },
    timeline: [
      { time: "3:30 PM", event: "Guest Arrival", detail: "Welcome drinks on boardwalk" },
      { time: "4:30 PM", event: "Ceremony", detail: "Barefoot on the beach" },
      { time: "5:15 PM", event: "Sunset Photos", detail: "Golden hour by the water" },
      { time: "6:00 PM", event: "Reception", detail: "Beachside dinner under tent" }
    ],
    recommendations: [
      "Suggest barefoot ceremony with shoe check station",
      "Light, flowing fabrics for attire to move with ocean breeze",
      "Nautical or coastal-themed decor (driftwood, shells, blues)",
      "Seafood-focused menu celebrating local catches",
      "Sunset timing is crucial - plan around it",
      "Have indoor backup at nearby venue if needed"
    ]
  },
  "Rustic Barn": {
    hero: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=400&fit=crop",
    description: "Charming countryside elegance with natural warmth",
    essentials: [
      { title: "Venue Amenities", desc: "Confirm electricity, running water, restroom facilities, and heating/cooling.", icon: "🔌" },
      { title: "Rustic Decor", desc: "Wood, burlap, lace, wildflowers, and vintage elements.", icon: "🌾" },
      { title: "Comfortable Footwear", desc: "Alert guests to grassy/uneven terrain - suggest wedges or flats.", icon: "👠" },
      { title: "Farm Tables", desc: "Long wooden tables with mismatched vintage chairs create cozy atmosphere.", icon: "🪵" },
      { title: "String Lighting", desc: "Edison bulbs and lanterns for warm, romantic ambiance.", icon: "💡" },
      { title: "Climate Control", desc: "Fans for summer heat, heaters or fire pits for cool evenings.", icon: "🔥" }
    ],
    food: {
      style: "Farm-to-table comfort food, family-style service",
      suggestions: [
        "BBQ stations with pulled pork and brisket",
        "Fried chicken and buttermilk biscuits",
        "Mac and cheese, coleslaw, cornbread",
        "Farm salads with heirloom tomatoes",
        "Apple pie, peach cobbler, or berry crumble",
        "Sweet tea, craft beer, and whiskey bar"
      ]
    },
    music: {
      ceremony: "Acoustic guitar or fiddle",
      reception: "Bluegrass band, country music, or acoustic folk",
      suggestions: ["Live barn dance with caller", "Acoustic covers of country classics", "Square dancing entertainment"]
    },
    attire: {
      couple: "Lace wedding dress with cowboy boots; groom in suspenders, bow tie, or vest; relaxed elegance",
      guests: "Country chic; sundresses with boots; khakis and button-downs; denim welcomed if styled",
      note: "Encourage comfortable, casual elegance suitable for barn setting"
    },
    decor: {
      palette: "Earth tones, burgundy, burnt orange, sage green, cream",
      elements: ["Wildflower bouquets in mason jars", "Burlap table runners and lace overlays", "Wooden signs and vintage crates", "Hay bale seating", "Edison string lights", "Whiskey barrel cocktail tables"]
    },
    timeline: [
      { time: "2:00 PM", event: "Lawn Games", detail: "Cornhole, giant Jenga for guests" },
      { time: "4:00 PM", event: "Ceremony", detail: "In front of barn doors" },
      { time: "5:00 PM", event: "Cocktail Hour", detail: "Hay bale seating areas" },
      { time: "6:30 PM", event: "Farm-to-Table Dinner", detail: "Family-style dining" }
    ],
    recommendations: [
      "Farm-to-table menu with local, seasonal ingredients",
      "Mason jar drinking glasses and decor",
      "Hay bale seating for casual areas",
      "Live acoustic music or bluegrass band",
      "S'mores station around evening bonfire",
      "Citronella candles and bug spray baskets available"
    ]
  },
  "Ballroom Elegance": {
    hero: "https://images.unsplash.com/photo-1464047736614-af63643285bf?w=1200&h=400&fit=crop",
    description: "Timeless sophistication in a grand setting",
    essentials: [
      { title: "Grand Entrance", desc: "Sweeping staircase or dramatic double-door entrance for impact.", icon: "👑" },
      { title: "Luxe Lighting", desc: "Chandeliers, uplighting, and pin-spotting create dramatic ambiance.", icon: "✨" },
      { title: "Formal Dress Code", desc: "Black-tie or formal attire for an elegant affair.", icon: "🎩" },
      { title: "Premium Florals", desc: "Tall centerpieces, flower walls, and lavish installations.", icon: "🌹" },
      { title: "Fine Dining", desc: "Multi-course plated dinner with wine pairings.", icon: "🍽️" },
      { title: "Live Orchestra", desc: "String quartet for ceremony, full band for reception.", icon: "🎻" }
    ],
    food: {
      style: "Fine dining, plated multi-course service",
      suggestions: [
        "Passed hors d'oeuvres: caviar, foie gras, oysters",
        "Filet mignon or Chilean sea bass entrée",
        "Lobster bisque or French onion soup",
        "Champagne toast with premium selections",
        "Multi-tiered elegant wedding cake",
        "Premium wine pairings with each course"
      ]
    },
    music: {
      ceremony: "String quartet or harpist",
      reception: "Live orchestra for dinner, 12-piece band for dancing",
      suggestions: ["Classical processional music", "Big band or swing for dancing", "Live vocalist for first dance"]
    },
    attire: {
      couple: "Formal ball gown with cathedral train; tuxedo or tailcoat; luxury fabrics and embellishments",
      guests: "Black-tie: floor-length gowns for women, tuxedos for men; formal jewelry and accessories",
      note: "Specify black-tie or white-tie on invitations for proper formality"
    },
    decor: {
      palette: "Gold, champagne, ivory, blush, deep jewel tones",
      elements: ["Crystal chandeliers", "Tall floral centerpieces with roses and orchids", "Gold chiavari chairs", "Luxury linens (velvet, silk, satin)", "Mirrored or gold chargers", "Dramatic ceiling draping"]
    },
    timeline: [
      { time: "5:30 PM", event: "Cocktail Reception", detail: "Champagne and hors d'oeuvres" },
      { time: "6:30 PM", event: "Grand Entrance", detail: "Wedding party introduction" },
      { time: "7:00 PM", event: "Dinner Service", detail: "Four-course plated meal" },
      { time: "9:00 PM", event: "Dancing", detail: "Live band and DJ" }
    ],
    recommendations: [
      "Gold, silver, or crystal accent colors",
      "Velvet and silk linens for luxurious feel",
      "Premium bar with signature cocktails",
      "Professional dancers or entertainment acts",
      "Grand exit with sparklers or fireworks",
      "Valet parking for guests arriving in formal wear"
    ]
  },
  "Intimate Indoor": {
    hero: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=400&fit=crop",
    description: "Cozy and personal celebration for close loved ones",
    essentials: [
      { title: "Venue Selection", desc: "Restaurant private room, art gallery, or boutique hotel.", icon: "🏛️" },
      { title: "Personal Touches", desc: "Handwritten notes, photo displays, and meaningful details.", icon: "💌" },
      { title: "Intimate Seating", desc: "Single table or small clusters for conversation flow.", icon: "🪑" },
      { title: "Mood Lighting", desc: "Candles, soft lighting, and warm ambiance.", icon: "🕯️" },
      { title: "Curated Menu", desc: "Chef's tasting menu or family-style sharing platters.", icon: "🍷" },
      { title: "Meaningful Ceremony", desc: "Guests form circle around couple for intimate vows.", icon: "💕" }
    ],
    food: {
      style: "Chef's tasting menu or elevated family-style",
      suggestions: [
        "Artisanal cheese and charcuterie to start",
        "Small plates for sharing (tapas style)",
        "Seasonal tasting menu with wine pairings",
        "Signature cocktails named after the couple",
        "Individual dessert presentations",
        "Late-night coffee and petit fours"
      ]
    },
    music: {
      ceremony: "Solo pianist or acoustic guitarist",
      reception: "Jazz trio, solo vocalist, or curated playlist",
      suggestions: ["Soft background music for conversation", "Personalized playlist with meaningful songs", "Acoustic covers of favorite songs"]
    },
    attire: {
      couple: "Elegant but not overly formal; cocktail-length or simple silhouette; suit or tuxedo",
      guests: "Cocktail attire; semi-formal; dressy casual depending on venue",
      note: "Match formality to venue - art gallery vs. restaurant affects attire"
    },
    decor: {
      palette: "Warm neutrals, soft candlelight, intimate tones",
      elements: ["Abundant candlelight", "Small personal photos throughout", "Handwritten menu cards", "Intimate floral arrangements", "Vintage books or meaningful objects", "Soft textured linens"]
    },
    timeline: [
      { time: "6:00 PM", event: "Welcome Gathering", detail: "Drinks and mingling" },
      { time: "6:30 PM", event: "Ceremony", detail: "In the round format" },
      { time: "7:00 PM", event: "Dinner", detail: "Multi-course tasting menu" },
      { time: "9:00 PM", event: "Dessert & Dancing", detail: "Intimate celebration" }
    ],
    recommendations: [
      "Guest count under 50 for truly intimate feel",
      "Personalized favors for each guest",
      "Acoustic musician or jazz trio",
      "Welcome speech from couple to each guest",
      "Quality over quantity - invest in details",
      "Consider round-table discussions or toasts from all guests"
    ]
  },
  
  // Cultural Guides
  "Indian Wedding": {
    hero: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&h=400&fit=crop",
    description: "Vibrant multi-day celebration rich in tradition and color",
    essentials: [
      { title: "Multi-Day Events", desc: "Mehndi, Sangeet, Haldi ceremonies before main wedding day.", icon: "📅" },
      { title: "Mandap Design", desc: "Elaborate ceremonial structure for Hindu wedding rituals.", icon: "🏛️" },
      { title: "Pandit Coordination", desc: "Work with Hindu priest for all ceremonies and timing.", icon: "🙏" },
      { title: "Guest Capacity", desc: "Plan for large guest lists (often 300-500+ people).", icon: "👥" },
      { title: "Baraat Procession", desc: "Groom's grand entrance on horse or elephant with dancing.", icon: "🐘" },
      { title: "Vegetarian Catering", desc: "Ensure extensive vegetarian menu options available.", icon: "🥘" }
    ],
    food: {
      style: "Multi-regional Indian cuisine, extensive vegetarian options",
      suggestions: [
        "Multiple live food stations (chaat, dosa, tandoor)",
        "Regional specialties from couple's heritage",
        "Paneer dishes and dal varieties",
        "Biryani and naan bread stations",
        "Gulab jamun, ras malai, and mithai desserts",
        "Masala chai and lassi stations"
      ]
    },
    music: {
      ceremony: "Traditional Vedic chants and shehnai",
      reception: "Dhol drummers, Bollywood DJ, live band",
      suggestions: ["Sangeet night with performances", "Bollywood dance party", "Traditional folk music"]
    },
    attire: {
      couple: "Bride: Red/maroon lehenga or saree with heavy jewelry. Groom: Sherwani with turban for ceremony",
      guests: "Traditional Indian wear: sarees, lehengas, salwar kameez, kurta pajamas; vibrant colors encouraged",
      note: "Avoid black or white as they're considered inauspicious for Indian weddings"
    },
    decor: {
      palette: "Rich reds, golds, oranges, fuchsia, royal blue",
      elements: ["Elaborate mandap with marigold flowers", "Hanging marigold garlands", "Gold and red draping", "Diya lamps everywhere", "Rangoli floor designs", "Crystal and gold accents"]
    },
    timeline: [
      { time: "Day 1 - Mehndi", event: "Henna Party", detail: "Ladies gather for henna application" },
      { time: "Day 2 - Sangeet", event: "Music Night", detail: "Family performances and dancing" },
      { time: "Day 3 - Morning", event: "Haldi Ceremony", detail: "Turmeric blessing ritual" },
      { time: "Day 3 - Evening", event: "Wedding Ceremony", detail: "Baraat, ceremony, and reception" }
    ],
    recommendations: [
      "Book venue for multiple days if doing all events in one location",
      "Hire Bollywood choreographer for Sangeet performances",
      "Arrange transportation for Baraat procession",
      "Professional mehndi artists for pre-wedding events",
      "Coordinate with pandit on auspicious timing (muhurat)",
      "Plan for extended ceremony time (2-4 hours typical)"
    ]
  },
  
  "Chinese Wedding": {
    hero: "https://images.unsplash.com/photo-1591604466107-ec97de05aff3?w=1200&h=400&fit=crop",
    description: "Traditional ceremonies honoring family and prosperity",
    essentials: [
      { title: "Tea Ceremony", desc: "Central tradition honoring elders from both families.", icon: "🍵" },
      { title: "Auspicious Date", desc: "Select wedding date based on Chinese astrology.", icon: "🗓️" },
      { title: "Red & Gold Theme", desc: "These colors symbolize luck and prosperity.", icon: "🎊" },
      { title: "Banquet Hall", desc: "Large space for 8-10 course traditional banquet.", icon: "🏮" },
      { title: "Door Games", desc: "Fun challenges for groom before bride pickup.", icon: "🎮" },
      { title: "Multiple Outfits", desc: "Bride changes into several dresses throughout day.", icon: "👗" }
    ],
    food: {
      style: "Traditional Chinese banquet, symbolic dishes",
      suggestions: [
        "Roasted suckling pig (whole pig display)",
        "Shark fin soup or bird's nest soup",
        "Peking duck or crispy skin chicken",
        "Lobster with ginger and scallions",
        "Eight treasure rice or sweet longan dessert",
        "Symbolic dishes in even numbers (8 courses typical)"
      ]
    },
    music: {
      ceremony: "Traditional Chinese instruments (guzheng, erhu)",
      reception: "Mix of Mandarin pop and Western music",
      suggestions: ["Lion dance performance", "Traditional musicians for tea ceremony", "DJ for modern reception"]
    },
    attire: {
      couple: "Bride: Qipao/cheongsam (red) for tea ceremony, white gown for reception. Groom: Western suit or traditional changshan",
      guests: "Formal attire; avoid wearing white, black, or red (red reserved for bride)",
      note: "Multiple outfit changes expected throughout the celebration"
    },
    decor: {
      palette: "Red, gold, crimson, imperial yellow",
      elements: ["Dragon and phoenix motifs", "Red lanterns throughout venue", "Gold table settings", "Double happiness symbols", "Red envelopes display", "Cherry blossom branches"]
    },
    timeline: [
      { time: "8:00 AM", event: "Door Games", detail: "Groom's challenges to pick up bride" },
      { time: "10:00 AM", event: "Tea Ceremony", detail: "Honoring both families" },
      { time: "12:00 PM", event: "Photo Session", detail: "Extended couple and family photos" },
      { time: "6:00 PM", event: "Banquet Reception", detail: "8-10 course dinner with toasts" }
    ],
    recommendations: [
      "Hire professional tea ceremony set and servers",
      "Prepare red envelopes (hongbao) for guests and helpers",
      "Schedule hair and makeup for multiple outfit changes",
      "Book lion dance troupe for good luck performance",
      "Ensure even number of dishes served (8 or 10 courses)",
      "Coordinate with both families on tea ceremony protocol"
    ]
  },
  
  "Jewish Wedding": {
    hero: "https://images.unsplash.com/photo-1523438097201-512ae7d59c44?w=1200&h=400&fit=crop",
    description: "Meaningful traditions celebrating faith and family union",
    essentials: [
      { title: "Chuppah", desc: "Wedding canopy symbolizing new home together.", icon: "⛺" },
      { title: "Ketubah", desc: "Marriage contract signed before ceremony.", icon: "📜" },
      { title: "Rabbi Coordination", desc: "Work with rabbi on ceremony structure and requirements.", icon: "✡️" },
      { title: "Breaking the Glass", desc: "Iconic tradition at ceremony conclusion.", icon: "🥂" },
      { title: "Hora Dance", desc: "Chair lifting celebration dance with guests.", icon: "💃" },
      { title: "Kosher Catering", desc: "Ensure food meets kosher standards if required.", icon: "🍽️" }
    ],
    food: {
      style: "Kosher or kosher-style, Jewish traditional foods",
      suggestions: [
        "Challah bread at each table",
        "Matzo ball soup or Jewish penicillin",
        "Brisket, roasted chicken, or gefilte fish",
        "Latkes or kugel as sides",
        "Rugelach, babka, or hamantaschen desserts",
        "Israeli wine or Manischewitz for blessings"
      ]
    },
    music: {
      ceremony: "Traditional Jewish wedding music (Erev Shel Shoshanim)",
      reception: "Klezmer band, Israeli folk music, Hora dance music",
      suggestions: ["Live klezmer band", "Hava Nagila for hora dance", "Mix of Jewish and contemporary music"]
    },
    attire: {
      couple: "Bride: Modest dress (covered shoulders if Orthodox). Groom: Suit or tuxedo with kippah",
      guests: "Modest formal wear; men wear kippahs (provided); women may cover shoulders",
      note: "Level of modesty varies by denomination - consult with rabbi"
    },
    decor: {
      palette: "Royal blue, white, gold, silver",
      elements: ["Beautiful chuppah (often floral)", "Star of David accents", "Blue and white Israeli flag colors", "Candlesticks for Shabbat if applicable", "Elegant table settings", "Hamsa hand symbols"]
    },
    timeline: [
      { time: "5:00 PM", event: "Tish & Bedeken", detail: "Groom's table and veiling ceremony" },
      { time: "5:30 PM", event: "Processional", detail: "Parents walk couple to chuppah" },
      { time: "6:00 PM", event: "Ceremony", detail: "Seven blessings and glass breaking" },
      { time: "6:30 PM", event: "Cocktail Hour", detail: "While couple has yichud (seclusion)" },
      { time: "7:30 PM", event: "Reception", detail: "Grand entrance and hora dance" }
    ],
    recommendations: [
      "Book rabbi early and discuss ceremony customization",
      "Order custom ketubah that reflects your style",
      "Ensure glass for breaking is properly wrapped",
      "Hire strong dancers to help with chair lifting",
      "Provide kippahs for male guests if needed",
      "Check if venue allows open flames for candles"
    ]
  },
  
  "Nigerian Wedding": {
    hero: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=400&fit=crop",
    description: "Joyous celebration with vibrant colors and rich traditions",
    essentials: [
      { title: "Traditional Ceremony", desc: "Native law and custom wedding before white wedding.", icon: "👰" },
      { title: "Aso Ebi", desc: "Coordinated family cloth/uniform for different groups.", icon: "👗" },
      { title: "Bride Price", desc: "Respectful negotiation with bride's family.", icon: "💰" },
      { title: "Multiple Outfits", desc: "Several traditional outfit changes throughout day.", icon: "✨" },
      { title: "Grand Entrance", desc: "Elaborate couple entrance with dancing and fanfare.", icon: "🎊" },
      { title: "Money Spraying", desc: "Guests spray money on dancing couple.", icon: "💸" }
    ],
    food: {
      style: "Traditional Nigerian cuisine, multiple stations",
      suggestions: [
        "Jollof rice (star of the show)",
        "Fried rice and coconut rice",
        "Pepper soup and egusi soup",
        "Suya (spiced meat skewers)",
        "Pounded yam with various soups",
        "Chin chin, puff puff, and Nigerian desserts"
      ]
    },
    music: {
      ceremony: "Traditional drums and native songs",
      reception: "Afrobeats, highlife, live band, DJ",
      suggestions: ["Live Afrobeats band", "Traditional drummers", "DJ for modern Nigerian hits"]
    },
    attire: {
      couple: "Bride: Multiple traditional outfits (Iro and Buba, Gele headwrap). Groom: Traditional agbada or similar",
      guests: "Aso ebi uniform based on family/friend group; vibrant African prints; elaborate gele head wraps",
      note: "Expect to purchase aso ebi fabric from couple's chosen selection"
    },
    decor: {
      palette: "Bold jewel tones, gold, coordinated with aso ebi colors",
      elements: ["Dramatic high table for couple", "Gold chiavari chairs", "Elaborate floral arrangements", "African prints and patterns", "Grand entrance backdrop", "Cultural artifacts display"]
    },
    timeline: [
      { time: "Morning", event: "Traditional Ceremony", detail: "At bride's family compound" },
      { time: "2:00 PM", event: "Church Ceremony", detail: "White wedding service" },
      { time: "5:00 PM", event: "Grand Reception Entrance", detail: "Couple dances in with party" },
      { time: "6:00 PM", event: "Dinner & Dancing", detail: "Money spraying and celebration" }
    ],
    recommendations: [
      "Budget for multiple professional outfits and gele tying",
      "Hire MC (master of ceremonies) experienced with Nigerian weddings",
      "Plan for long celebration (often 6+ hours)",
      "Coordinate aso ebi colors with all family groups",
      "Arrange for money sprayers/collectors during dancing",
      "Book makeup artist familiar with dark skin tones"
    ]
  },
  
  "Mexican Wedding": {
    hero: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&h=400&fit=crop",
    description: "Festive celebration blending Catholic tradition and culture",
    essentials: [
      { title: "Lazo Ceremony", desc: "Floral or rosary lasso placed in figure-8 around couple.", icon: "∞" },
      { title: "Arras Ritual", desc: "13 gold coins symbolizing groom's promise to provide.", icon: "🪙" },
      { title: "Sponsors System", desc: "Padrinos and madrinas sponsor various ceremony elements.", icon: "👥" },
      { title: "Mariachi Band", desc: "Traditional music essential for authentic celebration.", icon: "🎺" },
      { title: "Vibrant Decor", desc: "Colorful papel picado and bright decorative elements.", icon: "🎨" },
      { title: "Catholic Mass", desc: "Full Catholic mass ceremony if following tradition.", icon: "✝️" }
    ],
    food: {
      style: "Traditional Mexican feast, family recipes",
      suggestions: [
        "Tamales and fresh tortillas",
        "Mole sauce over chicken or enchiladas",
        "Carnitas, barbacoa, or carne asada",
        "Street taco stations",
        "Tres leches or churros for dessert",
        "Margaritas, horchata, and Mexican beer"
      ]
    },
    music: {
      ceremony: "Classical or religious music for mass",
      reception: "Mariachi band, norteño, banda, cumbia",
      suggestions: ["Mariachi serenade for couple", "La Vibora de la Mar dance", "Mix of traditional and modern Mexican music"]
    },
    attire: {
      couple: "Bride: White gown often with mantilla veil. Groom: Charro suit or formal tuxedo",
      guests: "Formal attire; festive colors welcomed; ladies may wear traditional Mexican dresses",
      note: "Traditional charro suits for groom and groomsmen create striking look"
    },
    decor: {
      palette: "Vibrant colors - fuchsia, orange, yellow, turquoise, red",
      elements: ["Papel picado banners", "Bright floral centerpieces with roses and marigolds", "Colorful table linens", "Mexican tiles and pottery", "Hanging paper flowers", "Decorated unity candle"]
    },
    timeline: [
      { time: "4:00 PM", event: "Catholic Mass", detail: "Full wedding mass ceremony" },
      { time: "6:00 PM", event: "Cocktail Hour", detail: "Tequila and appetizers" },
      { time: "7:00 PM", event: "Reception Entrance", detail: "Mariachi greeting" },
      { time: "8:00 PM", event: "Dinner & Dancing", detail: "La Vibora de la Mar and el baile del dinero" }
    ],
    recommendations: [
      "Book mariachi band months in advance",
      "Coordinate multiple padrinos/madrinas for each ceremony element",
      "Order custom lazo and arras set",
      "Include money dance (el baile del dinero) in timeline",
      "Serve late-night tamales or antojitos mexicanos",
      "Have bilingual MC if guests speak both languages"
    ]
  }
};

const generalConsiderations = [
    { 
      category: "Guest Experience & Accessibility", 
      icon: Users, 
      color: "text-blue-600", 
      items: [ 
        "Ensure venue is wheelchair accessible with accessible restrooms and ramps.",
        "Consider elderly guests when planning ceremony length and seating comfort.",
        "Provide diverse dietary options (vegetarian, vegan, gluten-free, nut-free, halal, kosher).",
        "Offer childcare services or a kids' zone if children are invited.",
        "Arrange clear transportation and parking information for guests.",
        "Provide accommodations list with various price points for out-of-town guests.",
        "Consider guests with sensory sensitivities (lighting, music volume).",
        "Ensure clear signage throughout the venue for easy navigation.",
        "Plan for weather contingencies (tents, umbrellas, fans, heaters).",
        "Create a quiet space for guests who may need a break from festivities."
      ] 
    },
    { 
      category: "Environmental Impact & Sustainability", 
      icon: Leaf, 
      color: "text-green-600", 
      items: [ 
        "Choose seasonal, locally-sourced flowers and food to reduce carbon footprint.",
        "Opt for digital invitations and RSVP systems to reduce paper waste.",
        "Select a venue with strong sustainability practices and green certifications.",
        "Consider renting decorations or using biodegradable/reusable options.",
        "Plan for comprehensive recycling and composting at the event.",
        "Use LED lighting and energy-efficient equipment.",
        "Choose eco-friendly favors or donate to charity in guests' names.",
        "Work with vendors who have sustainable practices.",
        "Minimize food waste by accurate headcount and donation plans.",
        "Consider offsetting carbon emissions from travel."
      ] 
    },
    { 
      category: "Budget & Financial Etiquette", 
      icon: DollarSign, 
      color: "text-yellow-600", 
      items: [ 
        "Be transparent about who is contributing to which parts of the budget.",
        "Don't assume financial contributions from family without a conversation.",
        "Consider guests' financial situations for destination weddings or pre-wedding events.",
        "Communicate the dress code clearly to prevent guest overspending.",
        "Thank vendors and pay them on time as per your contracts.",
        "Build in a 10-15% buffer for unexpected costs.",
        "Prioritize spending on what matters most to you as a couple.",
        "Consider payment plans or credit card rewards for large purchases.",
        "Track all expenses in a spreadsheet or budgeting app.",
        "Don't forget hidden costs: tips, taxes, overtime fees, alterations."
      ] 
    },
    {
      category: "Timeline & Logistics",
      icon: Clock,
      color: "text-purple-600",
      items: [
        "Create a detailed day-of timeline and share with all vendors.",
        "Build in buffer time between events for delays and photos.",
        "Assign a point person or coordinator for vendor communication.",
        "Plan ceremony start time considering daylight for photos.",
        "Schedule hair and makeup with plenty of buffer time.",
        "Coordinate vendor arrival and setup times carefully.",
        "Plan for cocktail hour entertainment while you take photos.",
        "Consider traffic patterns and travel time between locations.",
        "Have a rain plan for outdoor ceremonies with clear decision deadline.",
        "Create an emergency kit with safety pins, stain remover, and first aid."
      ]
    },
    {
      category: "Communication & Guest Management",
      icon: Heart,
      color: "text-pink-600",
      items: [
        "Send save-the-dates 6-8 months before (1 year for destination weddings).",
        "Include wedding website URL on all communications.",
        "Be clear about invitation boundaries (adults-only, plus-one policy).",
        "Send invitations 8-12 weeks before the wedding.",
        "Set RSVP deadline 3-4 weeks before to finalize catering.",
        "Follow up with non-responders personally before the deadline.",
        "Update your website regularly with new information.",
        "Consider creating a FAQ section on your website.",
        "Assign someone to field day-of questions from guests.",
        "Send thank-you notes within 3 months of receiving gifts."
      ]
    },
    {
      category: "Legal & Administrative",
      icon: Lightbulb,
      color: "text-red-600",
      items: [
        "Research marriage license requirements in your location (timing, documents needed).",
        "Verify your officiant is legally authorized to perform marriages.",
        "Understand name change process if you're planning to change your name.",
        "Review all vendor contracts carefully before signing.",
        "Get wedding insurance to protect against cancellations or damages.",
        "Keep all receipts and contracts organized in one place.",
        "Understand cancellation and refund policies for all vendors.",
        "Ensure someone is designated to sign the marriage certificate.",
        "File marriage license paperwork within required timeframe.",
        "Update legal documents after marriage (insurance, wills, beneficiaries)."
      ]
    }
];

const classicConsiderations = [
    { 
      category: "Traditional & Formal", 
      icon: Landmark, 
      items: [ 
        "Follow classic invitation wording and etiquette guidelines.",
        "Consider a formal receiving line to greet all guests personally.",
        "Plan for traditional music for the processional and recessional.",
        "Arrange seating charts based on family relationships and dynamics.",
        "Include timeless elements like a first dance, cake cutting, and bouquet toss.",
        "Use formal place settings with multiple courses.",
        "Consider a traditional grand entrance for the wedding party.",
        "Incorporate classic color palettes (ivory, gold, navy).",
        "Use formal titles and proper addressing on invitations.",
        "Plan for traditional toasts from parents and wedding party."
      ] 
    },
    { 
      category: "Modern & Minimalist", 
      icon: Brush, 
      items: [ 
        "Focus on clean lines, geometric shapes, and a neutral color palette.",
        "Choose an art gallery, industrial loft, or modern restaurant as a venue.",
        "Opt for simple, structural floral arrangements, like single-stem bouquets.",
        "Use high-quality, simple stationery with sans-serif fonts.",
        "Prioritize guest experience over excessive decoration.",
        "Consider non-traditional ceremony structures (in the round, no bridal party).",
        "Use modern music choices or unexpected song selections.",
        "Opt for sleek, contemporary attire over traditional gowns.",
        "Feature interactive elements like photo booths or modern installations.",
        "Choose a single signature cocktail over a full bar."
      ] 
    },
    { 
      category: "Farmhouse & Rustic", 
      icon: Sprout, 
      items: [ 
        "Check for amenities like electricity, running water, and proper restrooms at barns or farms.",
        "Suggest appropriate footwear for guests (flats, wedges for grassy areas).",
        "Incorporate natural elements like wood, burlap, lace, and wildflowers.",
        "Use mismatched vintage china or family-style seating for a cozy feel.",
        "Offer comfort items like blankets for cool evenings or fans for hot days.",
        "Consider outdoor lighting like string lights and lanterns.",
        "Plan for bugs with citronella candles or bug spray baskets.",
        "Use farm tables and wooden cross-back chairs.",
        "Feature local, farm-to-table menu options.",
        "Include lawn games for cocktail hour entertainment."
      ] 
    },
    { 
      category: "Bohemian & Chic", 
      icon: Feather, 
      items: [ 
        "Choose an outdoor setting like a forest, beach, or desert.",
        "Incorporate macrame, pampas grass, and layered rugs into your decor.",
        "Opt for a flowing, non-traditional wedding dress and flower crown.",
        "Create a relaxed, lounge-like atmosphere with pillows and poufs.",
        "Feature a grazing table or food trucks instead of a formal plated dinner.",
        "Use natural fabrics like linen and cotton for linens.",
        "Incorporate dreamcatchers, hanging plants, and natural elements.",
        "Choose earthy, warm color palettes (terracotta, sage, cream).",
        "Feature acoustic or folk music for a laid-back vibe.",
        "Create multiple intimate seating areas for conversation."
      ] 
    },
    { 
      category: "Glamorous & Luxe", 
      icon: Gem, 
      items: [ 
        "Select a grand venue like a ballroom, historic estate, or museum.",
        "Use a dramatic color palette with metallic accents like gold or silver.",
        "Feature lavish floral installations, such as flower walls or hanging arrangements.",
        "Implement a black-tie dress code for an elegant affair.",
        "Wow guests with high-end entertainment, like a live orchestra or aerial performers.",
        "Use luxurious fabrics like velvet and silk for linens.",
        "Feature statement lighting with chandeliers and uplighting.",
        "Provide premium bar service with craft cocktails.",
        "Use crystal, gold chargers, and fine china for place settings.",
        "Consider a grand exit with fireworks or a luxury car."
      ] 
    },
    {
      category: "Garden & Outdoor",
      icon: Sprout,
      items: [
        "Have a solid rain backup plan with tented areas or indoor space.",
        "Consider the season and weather patterns for your location.",
        "Plan for shade and cooling stations for warm weather.",
        "Provide blankets or heaters for cool evening temperatures.",
        "Choose sturdy furniture that won't sink into soft ground.",
        "Consider generator needs for lighting and sound equipment.",
        "Plan for bug control with natural repellents.",
        "Ensure proper lighting for evening events (string lights, lanterns).",
        "Consider the sun's position for ceremony timing to avoid glare.",
        "Have backup sound equipment in case of wind or weather."
      ]
    }
];

const religiousConsiderations = {
  "Christian": [ 
    { name: "Catholic", items: [
      "Completion of Pre-Cana (marriage preparation course) is mandatory, typically 6+ months.",
      "Ceremony must take place inside a church with an approved priest.",
      "An annulment is required if either party was previously married.",
      "Both parties must be baptized Christians (with some exceptions).",
      "Readings must be approved by the church from scripture.",
      "Music selections must be sacred/religious in nature.",
      "Ceremony typically lasts 45-60 minutes with full mass.",
      "Discuss whether you'll have a full mass or abbreviated ceremony."
    ]}, 
    { name: "Protestant", items: [
      "Rules vary greatly by denomination (Baptist, Methodist, Lutheran, etc.).",
      "Pre-marital counseling with the pastor is often required (3-6 sessions).",
      "More flexibility in choice of music, vows, and ceremony location.",
      "Some denominations allow secular venues, others require church settings.",
      "Interfaith marriages are generally more accepted.",
      "Ceremony length is typically 20-30 minutes.",
      "Personal vows are often welcomed and encouraged.",
      "Communion may be incorporated if desired."
    ]}, 
    { name: "Orthodox", items: [
      "Ceremony is rich in symbolism, including the crowning of the couple.",
      "Typically longer than other Christian ceremonies (60-90 minutes).",
      "Both partners must typically be baptized Christians (Orthodox preferred).",
      "Wedding ceremony must take place in an Orthodox church.",
      "Specific fasting and sacramental requirements before wedding.",
      "The 'Dance of Isaiah' is a traditional circling of the altar.",
      "Crowns (stefana) are blessed and placed on couple's heads.",
      "Reception traditions include the 'Hora' circle dance."
    ]} 
  ],
  "Jewish": [ 
    { name: "Orthodox", items: [
      "Strict adherence to Halakha (Jewish law).",
      "Requires a religious get (divorce document) if previously married.",
      "Gender separation may be observed during the ceremony and reception.",
      "All food must be strictly kosher with proper certification.",
      "Ceremony cannot take place on Shabbat or Jewish holidays.",
      "Both partners must be Jewish (or complete Orthodox conversion).",
      "Ketubah must be in traditional Aramaic.",
      "Men typically wear kippot, women dress modestly.",
      "Live music only (no recorded music) during Shabbat restrictions."
    ]}, 
    { name: "Conservative", items: [
      "Blends tradition with some modern interpretations.",
      "Ketubah (marriage contract) is typically egalitarian.",
      "Interfaith marriage policies vary by synagogue; consult your rabbi.",
      "Kosher food is typically expected but requirements may vary.",
      "Men and women may sit together during ceremony.",
      "More flexible with ceremony timing and dates.",
      "May allow some personalization of traditional elements.",
      "Usually requires Jewish education or conversion for non-Jewish partners."
    ]}, 
    { name: "Reform", items: [
      "Most liberal branch, emphasizing personal choice.",
      "Rabbis often co-officiate at interfaith weddings.",
      "Couples can write their own Ketubah and vows.",
      "No strict kosher requirements, though often honored.",
      "Full gender equality in ceremony participation.",
      "Can take place in non-synagogue venues.",
      "May incorporate elements from both traditions in interfaith weddings.",
      "Emphasis on the meaning behind traditions rather than strict observance."
    ]} 
  ],
  "Muslim": [ 
    { name: "General", items: [
      "The Nikah is the core marriage ceremony, often simple and short.",
      "Requires two male witnesses or one male and two female witnesses.",
      "A marriage contract (Mahr/dowry) is agreed upon and witnessed.",
      "Celebrations (Walima) are held afterwards, can be elaborate.",
      "Ensure all food served is Halal with proper certification.",
      "Bride and groom may be in separate areas during parts of ceremony.",
      "Islamic officiant (Imam) typically performs the ceremony.",
      "Gender segregation may be practiced depending on family customs.",
      "No alcohol should be served at the reception.",
      "Traditional henna ceremony may precede the wedding."
    ]} 
  ],
  "Hindu": [ 
    { name: "General", items: [
      "Ceremonies are often long and complex (2-4 hours), performed by a pandit.",
      "Key rituals include the Saptapadi (seven steps) around a sacred fire (Agni).",
      "Auspicious dates are often chosen based on astrology (consult a pandit).",
      "Most food served is typically vegetarian.",
      "Multi-day celebrations including Mehendi, Sangeet, and main ceremony.",
      "Traditional attire: bride wears red/maroon saree or lehengas.",
      "Groom often arrives on a decorated horse (Baraat procession).",
      "Mangalsutra necklace and sindoor application are key rituals.",
      "Ceremonies are in Sanskrit with translations provided for guests.",
      "Family involvement and blessings are central to ceremonies."
    ]} 
  ],
  "Buddhist": [ 
    { name: "General", items: [
      "Focus is on the blessing of the union, not a legal contract.",
      "Ceremonies are often simple and led by monks.",
      "Incorporates chanting, incense, and offerings to Buddha.",
      "Attire is typically simple and respectful; avoid black.",
      "Emphasis on mindfulness, compassion, and loving-kindness.",
      "May include water blessing ceremony.",
      "Lotus flowers and jasmine are common decorative elements.",
      "Donations to temples or charity often encouraged.",
      "Guests may be asked to remove shoes before entering temple.",
      "Ceremony focuses on spiritual aspects rather than legal formalities."
    ]} 
  ],
  "Sikh": [
    { name: "General", items: [
      "Anand Karaj ceremony takes place in a Gurdwara (Sikh temple).",
      "Couple walks around Guru Granth Sahib four times (Laavan).",
      "All guests must cover their heads in the Gurdwara.",
      "Ceremony conducted in Punjabi with translations often provided.",
      "Community meal (Langar) is served to all guests.",
      "No alcohol or non-vegetarian food in the Gurdwara.",
      "Kirtan (devotional singing) is central to the ceremony.",
      "Both families typically participate actively in rituals.",
      "Bride typically wears red or pink lehenga.",
      "Ceremony emphasizes equality and spiritual union."
    ]}
  ]
};

const culturalConsiderations = {
    "North America": [ 
      { name: "American (Southern)", items: [
        "Burying a bottle of bourbon a month before the wedding to prevent rain.",
        "Cake pulls: charms hidden in the cake for bridesmaids to pull for fortunes.",
        "Reception often includes a blessing before the meal.",
        "Sweet tea and regional cuisine are commonly served.",
        "BBQ or traditional Southern comfort food menus.",
        "Steel drum or bluegrass bands for entertainment.",
        "Monogrammed items and personalized details are popular.",
        "Outdoor venues like plantations or gardens are favored."
      ]}, 
      { name: "Mexican", items: [
        "The lazo (lasso) ceremony symbolizes the couple's union with infinity loop.",
        "The arras (13 gold coins) ritual signifies the groom's promise to provide.",
        "A lively Mariachi band is a staple for music and entertainment.",
        "Traditional foods like tamales and tres leches cake are served.",
        "La Vibora de la Mar (snake dance) with the bride and groom lifted on chairs.",
        "Sponsors (padrinos/madrinas) play important roles in ceremony.",
        "Colorful papel picado decorations throughout venue.",
        "El Baile del Dinero (money dance) for guests to dance with couple."
      ]}, 
      { name: "Canadian", items: [
        "Outdoor ceremonies are popular, weather permitting (especially in summer).",
        "French-Canadian weddings may include traditional folk songs.",
        "Maple syrup favors or themed elements are common.",
        "Multicultural influences reflect Canada's diversity.",
        "Poutine bars or maple-themed desserts.",
        "Ice sculptures for winter weddings.",
        "Both English and French may be used in bilingual regions.",
        "Indigenous land acknowledgment becoming more common."
      ]} 
    ],
    "South America": [ 
      { name: "Colombian", items: [
        "The 'Serenata' and 'Las Velas' (candle ceremony) are common rituals.",
        "The 'Hora Loca' (crazy hour) is a high-energy party-within-a-party.",
        "Traditional cumbia and vallenato music for dancing.",
        "Elaborate floral arrangements with tropical flowers.",
        "Ajiaco or sancocho served at reception.",
        "Traditional salsa and cumbia dance performances.",
        "Colorful, festive decorations in bright colors.",
        "Late-night celebrations often lasting until dawn."
      ]}, 
      { name: "Brazilian", items: [
        "Serving 'bem casados' (well-married cookies) for good luck.",
        "The groom's tie is often cut into pieces and auctioned off to guests.",
        "Samba music and dancing are essential elements.",
        "Colorful decorations reflecting Brazilian carnival traditions.",
        "Brigadeiro and other Brazilian sweets table.",
        "Feijoada or churrasco-style dinner service.",
        "Drummers and live samba bands.",
        "The 'valsa' (waltz) for couple's first dance."
      ]}, 
      { name: "Peruvian", items: [
        "'Cinta de la torta' is a cake pull for single women, one has a fake ring.",
        "An offering to the earth, or 'despacho' ceremony, for good blessings.",
        "Traditional Andean music with pan flutes and charangos.",
        "Quinoa-based dishes may be included in the menu.",
        "Pisco sour signature cocktails.",
        "Ceviche stations for appetizers.",
        "Traditional marinera dance performances.",
        "Colorful textiles and alpaca wool decorative elements."
      ]},
      { name: "Argentinian", items: [
        "Tango performances or lessons for guests.",
        "Asado (barbecue) style reception meals.",
        "Late-night celebrations that can last until sunrise.",
        "Wine ceremonies celebrating Argentina's wine culture.",
        "Dulce de leche desserts and alfajores.",
        "Mate tea served during festivities.",
        "Football (soccer) themed elements often included.",
        "Choripan (chorizo sandwiches) for late-night snacks."
      ]} 
    ],
    "Europe": [ 
      { name: "Italian", items: [
        "'Confetti' (sugared almonds) are given as favors in odd numbers for luck.",
        "'La Serenata', where the groom serenades the bride before the wedding.",
        "Multiple course meals featuring regional Italian cuisine (pasta, risotto).",
        "Breaking a vase or glass for good luck ('rompere il vaso').",
        "Tarantella dance with all guests.",
        "Tiramisu or traditional Italian wedding cakes.",
        "Limoncello or prosecco toasts.",
        "La Cascata (money shower) during first dance."
      ]}, 
      { name: "Greek", items: [
        "The 'Stefana' (wedding crowns) ceremony is central, symbolizing union.",
        "Koufeta (sugared almonds) are given as favors for luck (in multiples of 5).",
        "Traditional Greek dancing, including the Kalamatiano.",
        "Money is pinned to the couple's clothes during dancing.",
        "Breaking plates for good luck and celebration.",
        "Baklava and traditional Greek pastries.",
        "Ouzo or raki served at reception.",
        "The 'Dance of Isaiah' circling the altar."
      ]}, 
      { name: "Scottish", items: [
        "The groom often wears a kilt of his family's tartan.",
        "A handfasting ceremony, binding the couple's hands, is traditional.",
        "Bagpiper leads the processional.",
        "Oathing stone ceremony for blessing the union.",
        "Whisky toast and traditional Scottish toasts.",
        "Shortbread cookies as wedding favors.",
        "Ceilidh dancing with live traditional band.",
        "Quaich ceremony (sharing from a two-handled cup)."
      ]}, 
      { name: "Irish", items: [
        "Claddagh rings symbolize love, loyalty, and friendship.",
        "Bells are often rung to ward off evil spirits and are a traditional gift.",
        "Traditional Celtic music and Irish dancing.",
        "Handfasting with Celtic knots is common.",
        "Whiskey and Guinness toasts.",
        "Traditional Irish soda bread served.",
        "Green color themes incorporated throughout.",
        "Blessing of the hands ceremony."
      ]},
      { name: "French", items: [
        "A 'croquembouche', a cone of cream-filled pastry puffs, is a classic wedding cake.",
        "The 'Coupe de Mariage' is an engraved two-handled cup passed between the couple.",
        "Elaborate multi-course meals with wine pairings.",
        "Lavender decorations in Provence-style weddings.",
        "Champagne tower or champagne fountain.",
        "Cheese course before dessert.",
        "Late arrival and cocktail hour extending for hours.",
        "Dragées (sugared almonds) as favors."
      ]}, 
      { name: "German", items: [
        "'Polterabend' - breaking dishes the night before for good luck.",
        "Sawing a log together symbolizes working together through difficulties.",
        "Traditional Oktoberfest elements may be incorporated.",
        "Bread and salt are given for prosperity.",
        "Beer steins and pretzels for favors.",
        "German chocolate cake or Black Forest cake.",
        "Traditional oom-pah band music.",
        "The 'Brautraub' (bride kidnapping) tradition."
      ]}, 
      { name: "Spanish", items: [
        "Orange blossom flowers are traditional for Spanish brides.",
        "Mantilla veils and flamenco-inspired elements.",
        "Late-night celebrations with traditional Spanish guitar.",
        "Paella or tapas-style reception meals.",
        "Sangria or cava served throughout.",
        "Flamenco dance performances.",
        "Las arras matrimoniales (13 coins ceremony).",
        "Sobremesa - extended conversation after meals."
      ]} 
    ],
    "Asia": [ 
      { name: "Indian", items: [
        "Multi-day events (Sangeet, Mehndi, Haldi) are common.",
        "Vibrant colors are key; red is a traditional bridal color.",
        "Baraat (groom's procession) is a major celebratory element with dancing.",
        "Elaborate vegetarian feast with regional specialties.",
        "Traditional Indian classical or Bollywood music.",
        "Henna (mehndi) designs on bride's hands and feet.",
        "Garland exchange ceremony (varmala/jaimala).",
        "Traditional attire: lehengas, sarees, sherwanis."
      ]}, 
      { name: "Chinese", items: [
        "A formal tea ceremony to honor elders is central.",
        "Red and gold are auspicious colors for decor and attire.",
        "The wedding banquet often includes 8-10 symbolic courses.",
        "Dragon and phoenix motifs symbolize the couple.",
        "Red envelopes (hongbao) with money as gifts.",
        "Roasted suckling pig traditionally served.",
        "Multiple outfit changes throughout the day.",
        "Auspicious dates chosen based on Chinese astrology."
      ]}, 
      { name: "Filipino", items: [
        "Sponsors (Ninongs and Ninangs) play a significant role in ceremony.",
        "Rituals include the veil, cord, and coin ceremonies.",
        "A money dance is common to wish the couple prosperity.",
        "Lechon (roasted pig) is often the centerpiece meal.",
        "Traditional Filipino folk dances (Tinikling).",
        "Barong Tagalog for groom, Filipiniana dress for bride.",
        "Catholic mass elements commonly included.",
        "Entourage includes flower girls, ring bearers, candle/veil/cord sponsors."
      ]}, 
      { name: "Japanese", items: [
        "The 'san-san-kudo' sake-sharing ceremony symbolizes the union.",
        "Couples may wear traditional kimonos (shiromuku for bride).",
        "Origami crane decorations for longevity and good fortune.",
        "Traditional sake toasting with guests.",
        "Cherry blossom themes for spring weddings.",
        "Formal Shinto ceremony at shrine.",
        "Letter reading ceremony to parents.",
        "Traditional Japanese sweets (wagashi) served."
      ]}, 
      { name: "Korean", items: [
        "The 'paebaek' ceremony honors the groom's family.",
        "Traditional hanbok attire for formal photos.",
        "Jujube and chestnut throwing for fertility blessings.",
        "Noodle soup symbolizing long life together.",
        "Pyebaek ceremony with family bowing.",
        "Duck wedding figurines symbolizing fidelity.",
        "Traditional Korean food spread with kimchi.",
        "Karaoke often incorporated into reception."
      ]},
      { name: "Thai", items: [
        "Water blessing ceremony (Rod Nam Sang) with rose petals.",
        "Traditional Thai silk clothing and decorations.",
        "Jasmine garlands and lotus flowers in arrangements.",
        "Thai classical music during ceremonies.",
        "Sai Monkhon (sacred thread) ceremony connecting couple.",
        "Shell ceremony for blessing.",
        "Traditional Thai feast with pad Thai and curries.",
        "Monks may bless the couple in morning ceremony."
      ]},
      { name: "Vietnamese", items: [
        "Tea ceremony (Le An Hoi) is central tradition.",
        "Red ao dai (traditional dress) for bride.",
        "Betel leaves and areca nuts in ceremony.",
        "Gift trays presented to bride's family.",
        "Traditional Vietnamese music with dan tranh.",
        "Ancestor altar acknowledgment and prayers.",
        "Lion dance for good luck and prosperity.",
        "Vietnamese coffee and desserts served."
      ]} 
    ],
    "Africa": [ 
      { name: "Nigerian", items: [
        "Vibrant ceremonies often involving multiple traditional outfits.",
        "The groom's family may present a dowry or bride price.",
        "'Aso Ebi' (family cloth) creates a uniform look for family members.",
        "Traditional drums and Afrobeat music for celebrations.",
        "Money spraying during dancing.",
        "Jollof rice and traditional Nigerian dishes.",
        "Multiple outfit changes throughout celebration.",
        "Gele (head wrap) tying demonstrations."
      ]}, 
      { name: "South African", items: [
        "Varies widely among different cultures (Zulu, Xhosa, Sotho, etc.).",
        "'Lobola' (bride price) negotiations are a key part of the process.",
        "Traditional beadwork and colorful fabrics.",
        "Ubuntu philosophy emphasizing community support.",
        "Traditional Zulu attire with animal skins for Zulu weddings.",
        "Umqombothi (traditional beer) may be served.",
        "Isicwaya (traditional dancing) performances.",
        "Acknowledgment of ancestors in ceremony."
      ]}, 
      { name: "Ghanaian", items: [
        "Kente cloth is a prominent and symbolic part of the attire.",
        "The traditional ceremony is often more significant than the civil one.",
        "Adinkra symbols incorporated into decorations.",
        "Palm wine ceremonies and traditional drumming.",
        "Engagement 'knocking' ceremony before wedding.",
        "Bride price negotiations with families.",
        "Traditional Ghanaian dishes like fufu and groundnut soup.",
        "High life or hiplife music for dancing."
      ]}, 
      { name: "Moroccan", items: [
        "The 'Negafa' (female attendant) dresses the bride in multiple lavish outfits.",
        "The bride makes a grand entrance on an 'amaria' (ornate platform).",
        "Henna ceremonies with intricate designs days before wedding.",
        "Traditional Moroccan mint tea service.",
        "Multiple outfit changes (up to 7 dresses).",
        "Traditional Berber jewelry and accessories.",
        "Moroccan tagine and couscous feast.",
        "Traditional Moroccan music with oud and darbuka drums."
      ]}, 
      { name: "Ethiopian", items: [
        "Coffee ceremony as part of the celebration.",
        "Traditional white cotton clothing called 'habesha kemis'.",
        "Injera bread and berbere spice in traditional meals.",
        "Traditional Ethiopian music with unique instruments (krar, masinko).",
        "Traditional Ethiopian dancing (eskista).",
        "Incense burning during ceremonies.",
        "Honey wine (tej) served at reception.",
        "Orthodox Christian ceremony elements common."
      ]},
      { name: "Kenyan", items: [
        "Varies by tribe (Kikuyu, Luo, Maasai traditions differ).",
        "Dowry negotiation (ruracio) is important tradition.",
        "Traditional beaded jewelry and colorful attire.",
        "Goat or cow may be slaughtered for feast.",
        "Traditional dancing and singing.",
        "Elders' blessings are central to ceremony.",
        "Ugali and nyama choma traditional foods.",
        "Swahili coast weddings include Islamic influences."
      ]} 
    ],
    "Middle East": [ 
      { name: "Lebanese", items: [
        "The 'Zaffe' is a grand entrance procession with music and dancers.",
        "The couple often cuts the wedding cake with a large, ceremonial sword.",
        "Traditional dabke dancing in a circle.",
        "Elaborate Middle Eastern feast with multiple mezze dishes.",
        "Tabla drums and traditional Arabic music.",
        "Henna night celebration before wedding.",
        "Arak or jallab served as traditional drinks.",
        "Gold jewelry gifted to bride."
      ]}, 
      { name: "Persian (Iranian)", items: [
        "The 'Sofreh Aghd' is a lavish spread of symbolic items (mirror, candles, honey).",
        "The couple dips their fingers in honey and feeds it to each other.",
        "Traditional Persian music with tar and santur instruments.",
        "Rosewater and traditional sweets are served.",
        "Grinding of sugar cones above couple's heads.",
        "Mirror ceremony where groom sees bride's reflection first.",
        "Elaborate Nowruz-inspired decorations.",
        "Persian poetry recitation during ceremony."
      ]},
      { name: "Turkish", items: [
        "A 'Henna Night' ('Kına Gecesi') is a traditional celebration for the bride.",
        "Guests often pin money onto the couple's attire during the reception.",
        "Traditional Turkish folk dancing and music.",
        "Turkish delight and baklava served to guests.",
        "Red ribbon tied around bride's waist.",
        "Traditional Turkish coffee reading ceremony.",
        "Mehter band music for entrance.",
        "Tying red ribbons for fertility wishes."
      ]},
      { name: "Egyptian", items: [
        "Zaffa (grand entrance) with belly dancers and drummers.",
        "Henna party (leilat al henna) before wedding.",
        "Gold jewelry (shabka) from groom to bride.",
        "Traditional Egyptian cuisine with koshari and mahshi.",
        "Belly dancing performances at reception.",
        "Tabla and mizmar traditional music.",
        "Katb el Kitab (signing of marriage contract).",
        "Sugar cone ceremony for sweet life together."
      ]} 
    ],
    "Australia & Oceania": [ 
      { name: "Australian", items: [
        "A sand ceremony, blending two colors of sand, is popular for beach weddings.",
        "Acknowledge the traditional owners of the land (Welcome to Country) in opening remarks.",
        "Bush tucker ingredients in wedding menu.",
        "Didgeridoo music for unique ceremonial elements.",
        "BBQ or 'barbie' style reception common.",
        "Pavlova or lamington for desserts.",
        "Outdoor venues taking advantage of natural landscapes.",
        "Eucalyptus and native flora in decorations."
      ]}, 
      { name: "New Zealander (Māori)", items: [
        "A 'pōwhiri' (traditional welcome) can be a powerful start to a ceremony.",
        "Incorporation of Māori songs (waiata) and prayers (karakia).",
        "Traditional haka performance for special celebrations.",
        "Greenstone (pounamu) jewelry as meaningful gifts.",
        "Hongi greeting (pressing noses) in ceremony.",
        "Koru (spiral) motifs in decorations.",
        "Hangi feast with earth-oven cooked food.",
        "Māori language incorporated into vows or blessings."
      ]}, 
      { name: "Fijian", items: [
        "The groom presents a 'tabua' (sperm whale's tooth) to the bride's family.",
        "Couples often wear traditional 'tapa' cloth outfits.",
        "Kava ceremony to honor ancestors and bless the union.",
        "Traditional Fijian feast with kokoda and lovo cooking.",
        "Meke dance performances.",
        "Flower garlands (salusalu) for greeting.",
        "Traditional Fijian drums and singing.",
        "Village elders' blessings central to ceremony."
      ]}, 
      { name: "Hawaiian", items: [
        "Lei exchange ceremony symbolizing love and respect.",
        "Traditional Hawaiian music with ukulele and steel guitar.",
        "Tropical flowers like plumeria and bird of paradise.",
        "Luau-style reception with traditional Hawaiian foods (kalua pork, poi).",
        "Blowing of conch shell (pu) to start ceremony.",
        "Hula dancing performances.",
        "Tying of maile lei to bind couple together.",
        "Oli chanting for blessings."
      ]} 
    ]
};

const getMixedFaithConsiderations = () => {
    return [
      "Find an officiant comfortable with interfaith ceremonies, or consider having two co-officiants.",
      "Discuss which rituals from each faith are most meaningful to you and your families.",
      "Create a wedding program that explains the different traditions to guests unfamiliar with them.",
      "Be mindful of any dietary restrictions from both faiths (e.g., kosher, halal, vegetarian).",
      "Choose a neutral venue if religious buildings present a conflict or scheduling issues.",
      "Consider the timing of your wedding around religious holidays or observances.",
      "Discuss how you will raise children and celebrate holidays before the wedding.",
      "Be prepared to have honest conversations with both families about your decisions.",
      "Research legal requirements for your location regarding interfaith marriages.",
      "Consider pre-marital counseling to address potential challenges.",
      "Create unity in your ceremony through symbolic acts that respect both traditions.",
      "Be clear about which traditions you're incorporating and why with both families."
    ];
};

const AccordionSection = ({ title, icon: Icon, items, color = "text-gray-900", isHighlighted = false }) => (
  <AccordionItem value={title} className={isHighlighted ? "border-l-4 border-purple-500 bg-purple-50/50" : ""}>
    <AccordionTrigger className="text-left hover:no-underline px-6 py-4 text-base font-semibold">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="flex-1">{title}</span>
        {isHighlighted && <Sparkles className="w-4 h-4 text-purple-500" />}
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-6 pb-6 pt-2">
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </AccordionContent>
  </AccordionItem>
);

export default function ConsiderationsPage() {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);

  useEffect(() => {
    const loadTheme = async () => {
        try {
            const themes = await ThemeDetails.list();
            if (themes.length > 0) {
                setTheme(themes[0]);
            }
        } catch (error) {
            console.error("Failed to load theme details:", error);
        }
        setLoading(false);
    };
    loadTheme();
  }, []);
  
  if (loading) {
      return (
          <div className="min-h-screen bg-white flex items-center justify-center">
              <div className="animate-pulse flex items-center gap-4 text-lg text-gray-600">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
                  Loading considerations...
              </div>
          </div>
      );
  }

  const selectedVibes = theme?.vibes || [];
  const selectedReligious = theme?.is_religious ? theme.religious_details : null;
  const selectedCultural = theme?.is_cultural ? theme.cultural_details : null;
  const hasThemeData = theme && (selectedVibes.length > 0 || selectedReligious || selectedCultural);

  return (
    <div className="min-h-screen bg-white">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              Experience Guide
            </h1>
            <p className="text-gray-500 text-base">
              Your personalized brochure for creating the perfect wedding experience
            </p>
          </div>
          <Link to={createPageUrl("EventDetails")}>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
          </Link>
        </div>

        {/* Alert */}
        {!hasThemeData && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Personalize this page:</strong> Update your{" "}
              <Link to={createPageUrl("EventDetails")} className="underline font-semibold">
                Event Details
              </Link>{" "}
              (style, religious, and cultural preferences) to see highlighted recommendations tailored to your wedding.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Categories</div>
            <div className="text-4xl font-bold text-gray-900">9</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Styles</div>
            <div className="text-4xl font-bold text-purple-600">6</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Cultures</div>
            <div className="text-4xl font-bold text-rose-600">35+</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-600 mb-1">Faiths</div>
            <div className="text-4xl font-bold text-indigo-600">6</div>
          </div>
        </div>

        <Tabs defaultValue="guides" className="w-full">
            <TabsList className="bg-transparent border-b border-gray-200 h-12 rounded-none px-0 w-full justify-start">
                <TabsTrigger 
                  value="guides"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4"
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Experience Guides
                </TabsTrigger>
                <TabsTrigger 
                  value="general"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4"
                >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    General
                </TabsTrigger>
                <TabsTrigger 
                  value="styles"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4"
                >
                    <Palette className="w-4 h-4 mr-2" />
                    Styles
                </TabsTrigger>
                <TabsTrigger 
                  value="religious" 
                  disabled={!selectedReligious}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 disabled:opacity-50"
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Religious
                </TabsTrigger>
                <TabsTrigger 
                  value="cultural" 
                  disabled={!selectedCultural}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 disabled:opacity-50"
                >
                    <Globe className="w-4 h-4 mr-2" />
                    Cultural
                </TabsTrigger>
                <TabsTrigger 
                  value="mixed-faith" 
                  disabled={selectedReligious !== 'Interfaith'}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-900 rounded-none pb-3 px-4 disabled:opacity-50"
                >
                    <Heart className="w-4 h-4 mr-2" />
                    Mixed Faith
                </TabsTrigger>
            </TabsList>

            <TabsContent value="guides" className="mt-8">
                {!selectedGuide ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(weddingTypeGuides).map(([type, guide]) => (
                      <Card key={type} className="group hover:shadow-xl transition-all cursor-pointer overflow-hidden" onClick={() => setSelectedGuide(type)}>
                        <div className="h-48 overflow-hidden">
                          <img src={guide.hero} alt={type} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <CardContent className="p-6">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{type}</h3>
                          <p className="text-gray-600 text-sm mb-4">{guide.description}</p>
                          <Button className="w-full bg-gray-900 hover:bg-gray-800">
                            View Guide
                            <BookOpen className="w-4 h-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Back Button */}
                    <Button variant="outline" onClick={() => setSelectedGuide(null)}>
                      ← Back to Guides
                    </Button>

                    {/* Hero Section */}
                    <div className="relative h-96 rounded-2xl overflow-hidden">
                      <img src={weddingTypeGuides[selectedGuide].hero} alt={selectedGuide} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                        <div className="p-8 text-white">
                          <h2 className="text-5xl font-bold mb-2">{selectedGuide}</h2>
                          <p className="text-xl opacity-90">{weddingTypeGuides[selectedGuide].description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Essentials Grid */}
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-6">Essential Elements</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {weddingTypeGuides[selectedGuide].essentials.map((item, idx) => (
                          <Card key={idx} className="bg-white border-gray-200 hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="text-4xl mb-4">{item.icon}</div>
                              <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                              <p className="text-gray-600 text-sm">{item.desc}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Food & Beverage */}
                    {weddingTypeGuides[selectedGuide].food && (
                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                          <span className="text-4xl">🍽️</span>
                          Food & Beverage
                        </h3>
                        <p className="text-lg text-gray-700 font-semibold mb-4">{weddingTypeGuides[selectedGuide].food.style}</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {weddingTypeGuides[selectedGuide].food.suggestions.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 bg-white/70 rounded-lg p-3">
                              <CheckCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Music */}
                    {weddingTypeGuides[selectedGuide].music && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                          <span className="text-4xl">🎵</span>
                          Music & Entertainment
                        </h3>
                        <div className="space-y-4">
                          <div className="bg-white/70 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 mb-2">Ceremony:</h4>
                            <p className="text-gray-700">{weddingTypeGuides[selectedGuide].music.ceremony}</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 mb-2">Reception:</h4>
                            <p className="text-gray-700">{weddingTypeGuides[selectedGuide].music.reception}</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 mb-2">Recommendations:</h4>
                            <ul className="space-y-2">
                              {weddingTypeGuides[selectedGuide].music.suggestions.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-gray-700 text-sm">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attire */}
                    {weddingTypeGuides[selectedGuide].attire && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                          <span className="text-4xl">👔</span>
                          Attire Guide
                        </h3>
                        <div className="space-y-4">
                          <div className="bg-white/70 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 mb-2">For the Couple:</h4>
                            <p className="text-gray-700">{weddingTypeGuides[selectedGuide].attire.couple}</p>
                          </div>
                          <div className="bg-white/70 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 mb-2">For Guests:</h4>
                            <p className="text-gray-700">{weddingTypeGuides[selectedGuide].attire.guests}</p>
                          </div>
                          {weddingTypeGuides[selectedGuide].attire.note && (
                            <div className="bg-blue-100 border-l-4 border-blue-500 rounded-lg p-4">
                              <p className="text-sm text-blue-900">
                                <strong>Note:</strong> {weddingTypeGuides[selectedGuide].attire.note}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Decor */}
                    {weddingTypeGuides[selectedGuide].decor && (
                      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-8">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                          <span className="text-4xl">🎨</span>
                          Decor & Styling
                        </h3>
                        <div className="bg-white/70 rounded-lg p-4 mb-4">
                          <h4 className="font-bold text-gray-900 mb-2">Color Palette:</h4>
                          <p className="text-gray-700">{weddingTypeGuides[selectedGuide].decor.palette}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-4">
                          <h4 className="font-bold text-gray-900 mb-3">Key Elements:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {weddingTypeGuides[selectedGuide].decor.elements.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Palette className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 text-sm">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sample Timeline */}
                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-8">
                      <h3 className="text-3xl font-bold text-gray-900 mb-6">Sample Timeline</h3>
                      <div className="space-y-4">
                        {weddingTypeGuides[selectedGuide].timeline.map((item, idx) => (
                          <div key={idx} className="flex gap-6 items-start">
                            <div className="bg-white rounded-lg px-4 py-2 font-bold text-gray-900 shadow-sm min-w-[100px] text-center">
                              {item.time}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{item.event}</h4>
                              <p className="text-gray-600 text-sm">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-6">Expert Recommendations</h3>
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
                        <ul className="space-y-4">
                          {weddingTypeGuides[selectedGuide].recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-4">
                              <Sparkles className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

            <TabsContent value="general" className="mt-8">
                <Accordion type="single" collapsible className="w-full bg-white border border-gray-200 rounded-lg">
                    {generalConsiderations.map((section, index) => (
                        <AccordionSection 
                            key={index}
                            title={section.category} 
                            icon={section.icon} 
                            items={section.items} 
                            color={section.color} 
                        />
                    ))}
                </Accordion>
            </TabsContent>

            <TabsContent value="styles" className="mt-8">
                <Accordion type="single" collapsible className="w-full bg-white border border-gray-200 rounded-lg">
                    {classicConsiderations.map((section, index) => (
                        <AccordionSection 
                            key={index}
                            title={section.category} 
                            icon={section.icon} 
                            items={section.items}
                            isHighlighted={selectedVibes.some(vibe => section.category.toLowerCase().includes(vibe.toLowerCase()))}
                        />
                    ))}
                </Accordion>
            </TabsContent>

            {selectedReligious && (
                 <TabsContent value="religious" className="mt-8">
                    <Accordion type="single" collapsible className="w-full bg-white border border-gray-200 rounded-lg">
                        {Object.entries(religiousConsiderations)
                            .filter(([faith]) => selectedReligious.toLowerCase().includes(faith.toLowerCase()))
                            .map(([faith, denominations]) => (
                                denominations.map((section, index) => (
                                    <AccordionSection 
                                        key={`${faith}-${index}`}
                                        title={section.name} 
                                        icon={BookOpen} 
                                        items={section.items} 
                                        color="text-indigo-600"
                                    />
                                ))
                            ))}
                    </Accordion>
                </TabsContent>
            )}

            {selectedCultural && (
                 <TabsContent value="cultural" className="mt-8">
                    <Accordion type="single" collapsible className="w-full bg-white border border-gray-200 rounded-lg">
                       {Object.entries(culturalConsiderations).map(([region, cultures]) => (
                           cultures
                            .filter(culture => selectedCultural.toLowerCase().includes(culture.name.toLowerCase()))
                            .map(culture => (
                                <AccordionSection 
                                  key={culture.name}
                                  title={`${culture.name} (${region})`} 
                                  icon={Globe} 
                                  items={culture.items} 
                                  color="text-rose-600"
                                />
                            ))
                       ))}
                    </Accordion>
                </TabsContent>
            )}

            {selectedReligious === 'Interfaith' && (
                 <TabsContent value="mixed-faith" className="mt-8">
                    <Card className="bg-white border-gray-200">
                        <CardContent className="p-8">
                            <div className="bg-purple-50 rounded-lg p-8 border-2 border-purple-200">
                                <div className="flex items-center gap-3 mb-6">
                                    <Heart className="w-8 h-8 text-purple-600" />
                                    <h4 className="text-2xl font-bold text-gray-900">
                                        Considerations for an Interfaith Wedding
                                    </h4>
                                </div>
                                <ul className="space-y-4">
                                    {getMixedFaithConsiderations().map((item, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700 leading-relaxed">{item}</span>
                                    </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
        </Tabs>
      </div>

      <AIWeddingAssistant />
    </div>
  );
}