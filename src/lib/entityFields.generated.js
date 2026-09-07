/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source: base44/entities/*.jsonc (the RULE 12 schema mirror).
 * Regenerate: npm run generate:entity-fields
 * Enforced by: tests/persistence/entity-fields-sync.mjs
 *
 * Only what the Ava action validator needs: declared top-level field names,
 * the required list, and enums. Nested sub-keys are deliberately NOT included
 * — see src/lib/avaActionValidation.js for why that limit is safe here.
 */
/* eslint-disable */
export const ENTITY_FIELDS = {
  "Budget": {
    "fields": [
      "actual_amount",
      "budgeted_amount",
      "category",
      "item_name",
      "notes",
      "paid",
      "payment_date",
      "vendor"
    ],
    "required": [
      "budgeted_amount",
      "category",
      "item_name"
    ],
    "enums": {
      "category": [
        "venue",
        "catering",
        "photography",
        "flowers",
        "music",
        "attire",
        "transportation",
        "decorations",
        "rings",
        "stationery",
        "beauty",
        "honeymoon",
        "miscellaneous"
      ]
    }
  },
  "Collaborator": {
    "fields": [
      "accepted_at",
      "accepted_user_id",
      "email",
      "invite_token",
      "name",
      "permissions",
      "status"
    ],
    "required": [
      "email",
      "name",
      "permissions"
    ],
    "enums": {
      "status": [
        "pending",
        "accepted"
      ]
    }
  },
  "CollaboratorGrant": {
    "fields": [
      "collaborator_email_hash",
      "collaborator_user_id_hash",
      "event_type",
      "granted_at",
      "is_test",
      "owner_user_id_hash",
      "permissions"
    ],
    "required": [
      "collaborator_user_id_hash",
      "event_type",
      "owner_user_id_hash"
    ],
    "enums": {
      "event_type": [
        "grant",
        "revoke"
      ]
    }
  },
  "CustomEventPage": {
    "fields": [
      "date",
      "description",
      "dress_code",
      "event_type",
      "order",
      "rsvp_required",
      "slug",
      "title",
      "venue_address",
      "venue_name",
      "visible_to_guests"
    ],
    "required": [
      "slug",
      "title"
    ],
    "enums": {
      "event_type": [
        "rehearsal_dinner",
        "bridal_shower",
        "bachelor_party",
        "bachelorette_party",
        "welcome_party",
        "farewell_brunch",
        "custom"
      ]
    }
  },
  "CustomGift": {
    "fields": [
      "category",
      "description",
      "image_url",
      "payment_link_url",
      "requested_amount",
      "title"
    ],
    "required": [
      "requested_amount",
      "title"
    ],
    "enums": {
      "category": [
        "honeymoon",
        "home_fund",
        "charity",
        "experience",
        "custom"
      ]
    }
  },
  "Event": {
    "fields": [
      "couple_names",
      "image_url",
      "location",
      "wedding_date"
    ],
    "required": [
      "couple_names"
    ],
    "enums": {}
  },
  "Guest": {
    "fields": [
      "category",
      "dietary_restrictions",
      "email",
      "encrypted_guest_pii",
      "event_responses",
      "interests",
      "invitation_sent",
      "invite_channel",
      "invite_sent_at",
      "is_test",
      "mailing_address",
      "meal_choice",
      "name",
      "notes",
      "phone",
      "plus_one",
      "plus_one_dietary_restrictions",
      "plus_one_email",
      "plus_one_meal_choice",
      "plus_one_name",
      "plus_one_rsvp",
      "plus_one_rsvp_link_id",
      "plus_one_rsvp_link_id_enc",
      "plus_one_rsvp_link_id_hash",
      "poll_votes",
      "profile_picture_url",
      "reminder_sent_at",
      "rsvp_date",
      "rsvp_link_id",
      "rsvp_link_id_enc",
      "rsvp_link_id_hash",
      "rsvp_note",
      "rsvp_status",
      "seating_avoid",
      "seating_preferences",
      "song_request",
      "special_requests",
      "table_assignment",
      "tags"
    ],
    "required": [
      "name"
    ],
    "enums": {
      "category": [
        "family",
        "friends",
        "colleagues",
        "partners_family",
        "partners_friends"
      ],
      "rsvp_status": [
        "pending",
        "attending",
        "declined",
        "maybe"
      ],
      "plus_one_rsvp": [
        "pending",
        "attending",
        "declined"
      ]
    }
  },
  "GuestContactSubmission": {
    "fields": [
      "email_hash",
      "encrypted_contact_details",
      "is_test",
      "status",
      "wedding_id"
    ],
    "required": [
      "wedding_id"
    ],
    "enums": {
      "status": [
        "pending",
        "approved",
        "dismissed"
      ]
    }
  },
  "GuestMessage": {
    "fields": [
      "channel",
      "guest_email",
      "guest_id",
      "guest_name",
      "guest_phone",
      "message",
      "read",
      "replied",
      "reply",
      "reply_sent_at",
      "whatsapp_contact_date",
      "whatsapp_contacted"
    ],
    "required": [
      "guest_email",
      "guest_name",
      "message"
    ],
    "enums": {
      "channel": [
        "in_app",
        "whatsapp",
        "email"
      ]
    }
  },
  "GuestbookEntry": {
    "fields": [
      "guest_name",
      "is_test",
      "message",
      "wedding_id"
    ],
    "required": [
      "guest_name",
      "message",
      "wedding_id"
    ],
    "enums": {}
  },
  "Hotel": {
    "fields": [
      "address",
      "amenities",
      "description",
      "distance",
      "imageUrl",
      "isRecommended",
      "name",
      "phone",
      "priceRange",
      "rating",
      "reviewCount",
      "website",
      "whyGood"
    ],
    "required": [
      "name"
    ],
    "enums": {
      "priceRange": [
        "$",
        "$$",
        "$$$",
        "$$$$"
      ]
    }
  },
  "Invitation": {
    "fields": [
      "couple_names",
      "custom_message",
      "design",
      "enabled_sections",
      "personalized_messages",
      "rsvp_deadline",
      "wedding_date"
    ],
    "required": [
      "couple_names",
      "wedding_date"
    ],
    "enums": {}
  },
  "LiveStream": {
    "fields": [
      "chat_enabled",
      "embed_code",
      "is_live",
      "password",
      "scheduled_start",
      "stream_type",
      "stream_url",
      "title"
    ],
    "required": [
      "stream_url",
      "title"
    ],
    "enums": {
      "stream_type": [
        "youtube",
        "vimeo",
        "zoom",
        "custom"
      ]
    }
  },
  "MoodboardItem": {
    "fields": [
      "board_name",
      "category",
      "image_url",
      "notes",
      "pinterest_id",
      "position_x",
      "position_y",
      "source_url",
      "tags",
      "title"
    ],
    "required": [
      "image_url",
      "title"
    ],
    "enums": {
      "category": [
        "venue",
        "decor",
        "flowers",
        "dress",
        "cake",
        "colors",
        "invitations",
        "photography",
        "hairstyle",
        "makeup",
        "centerpieces",
        "lighting",
        "other"
      ]
    }
  },
  "Music": {
    "fields": [
      "added_by",
      "album",
      "approved",
      "artist",
      "category",
      "duration",
      "embed_url",
      "guest_suggestion",
      "image_url",
      "notes",
      "preview_url",
      "song_title",
      "source",
      "sourceSongRequestId",
      "spotify_track_id"
    ],
    "required": [
      "artist",
      "song_title"
    ],
    "enums": {
      "source": [
        "spotify",
        "apple",
        "youtube"
      ],
      "category": [
        "ceremony",
        "cocktail_hour",
        "dinner",
        "dancing",
        "special_moments",
        "general"
      ]
    }
  },
  "Note": {
    "fields": [
      "category",
      "completed",
      "description",
      "due_date",
      "is_suggested",
      "priority",
      "reminder_date",
      "status",
      "title",
      "view_type",
      "wedding_timeline"
    ],
    "required": [
      "title"
    ],
    "enums": {
      "category": [
        "venue",
        "catering",
        "attire",
        "photography",
        "flowers",
        "music",
        "transportation",
        "legal",
        "guests",
        "decorations",
        "general"
      ],
      "priority": [
        "low",
        "medium",
        "high",
        "urgent"
      ],
      "wedding_timeline": [
        "12_months",
        "9_months",
        "6_months",
        "3_months",
        "1_month",
        "2_weeks",
        "1_week",
        "day_of"
      ],
      "status": [
        "Ideas",
        "In progress",
        "Done"
      ],
      "view_type": [
        "todo"
      ]
    }
  },
  "Notification": {
    "fields": [
      "body",
      "is_test",
      "link",
      "read",
      "recipient_user_id",
      "title",
      "type"
    ],
    "required": [
      "recipient_user_id",
      "title",
      "type"
    ],
    "enums": {
      "type": [
        "rsvp_received",
        "collaborator_joined",
        "questionnaire_answered",
        "task_due",
        "system"
      ]
    }
  },
  "Photo": {
    "fields": [
      "category",
      "date_taken",
      "description",
      "image_url",
      "order",
      "photographer_credit",
      "title",
      "visible_to_guests"
    ],
    "required": [
      "category",
      "image_url"
    ],
    "enums": {
      "category": [
        "engagement",
        "pre_wedding",
        "ceremony",
        "reception",
        "portraits",
        "party",
        "other"
      ]
    }
  },
  "PlanGift": {
    "fields": [
      "amount_cents",
      "buyer_email_enc",
      "buyer_name_enc",
      "buyer_user_id_hash",
      "coupon_id",
      "currency",
      "is_test",
      "plan",
      "promotion_code_display",
      "promotion_code_id",
      "purchased_at",
      "recipient_email_enc",
      "recipient_email_error",
      "recipient_email_sent",
      "recipient_note_enc",
      "redeemed_at",
      "redeemed_user_id_hash",
      "status",
      "stripe_session_id"
    ],
    "required": [
      "coupon_id",
      "plan",
      "promotion_code_display",
      "promotion_code_id",
      "recipient_email_enc",
      "stripe_session_id"
    ],
    "enums": {
      "plan": [
        "pro",
        "ultra"
      ],
      "status": [
        "purchased",
        "redeemed"
      ]
    }
  },
  "PollComment": {
    "fields": [
      "is_test",
      "poll_id",
      "text",
      "wedding_id"
    ],
    "required": [],
    "enums": {}
  },
  "PollVote": {
    "fields": [
      "guest_identifier",
      "is_test",
      "option_id",
      "poll_id",
      "wedding_id"
    ],
    "required": [],
    "enums": {}
  },
  "Questionnaire": {
    "fields": [
      "intro",
      "is_active",
      "is_test",
      "questions",
      "recipient_guest_ids",
      "recipient_mode",
      "recipient_tags",
      "title"
    ],
    "required": [
      "title"
    ],
    "enums": {
      "recipient_mode": [
        "all",
        "tag",
        "individual"
      ]
    }
  },
  "QuestionnaireResponse": {
    "fields": [
      "encrypted_answers",
      "guest_id_hash",
      "is_test",
      "questionnaire_id_hash",
      "submitted_at"
    ],
    "required": [
      "encrypted_answers",
      "guest_id_hash",
      "questionnaire_id_hash"
    ],
    "enums": {}
  },
  "QuoteRequest": {
    "fields": [
      "budget_range",
      "event_date",
      "guest_count",
      "message",
      "quoted_price",
      "status",
      "vendor_id",
      "vendor_name",
      "vendor_response"
    ],
    "required": [
      "event_date",
      "message",
      "vendor_id",
      "vendor_name"
    ],
    "enums": {
      "status": [
        "pending",
        "responded",
        "accepted",
        "declined"
      ]
    }
  },
  "ReceivedGift": {
    "fields": [
      "category",
      "delivery_status",
      "estimated_value",
      "giver_email",
      "giver_guest_id",
      "giver_name",
      "item_name",
      "notes",
      "received_date",
      "thank_you_date",
      "thank_you_note",
      "thank_you_sent"
    ],
    "required": [
      "item_name"
    ],
    "enums": {
      "delivery_status": [
        "expected",
        "received",
        "not_received"
      ],
      "category": [
        "physical",
        "cash",
        "experience",
        "digital",
        "other"
      ]
    }
  },
  "RegistryItem": {
    "fields": [
      "description",
      "image_url",
      "store_name",
      "url"
    ],
    "required": [
      "store_name",
      "url"
    ],
    "enums": {}
  },
  "RegistryProduct": {
    "fields": [
      "category",
      "description",
      "external_id",
      "image_url",
      "name",
      "notes",
      "price",
      "priority",
      "product_url",
      "purchased_by",
      "quantity_purchased",
      "quantity_requested",
      "registry_platform"
    ],
    "required": [
      "name",
      "price"
    ],
    "enums": {
      "category": [
        "kitchen",
        "home_decor",
        "bedding",
        "bathroom",
        "outdoor",
        "electronics",
        "other"
      ],
      "priority": [
        "high",
        "medium",
        "low"
      ]
    }
  },
  "Restaurant": {
    "fields": [
      "address",
      "cuisine",
      "description",
      "distance",
      "imageUrl",
      "name",
      "phone",
      "priceRange",
      "rating",
      "reviewCount",
      "specialties",
      "website",
      "whyGood"
    ],
    "required": [
      "name"
    ],
    "enums": {
      "priceRange": [
        "$",
        "$$",
        "$$$",
        "$$$$"
      ]
    }
  },
  "RlsExperimentThrowaway": {
    "fields": [
      "marker"
    ],
    "required": [],
    "enums": {}
  },
  "RsvpResponse": {
    "fields": [
      "encrypted_guest_level",
      "event_id",
      "guest_id_hash",
      "is_plus_one",
      "is_test",
      "meal_choice",
      "plus_one_names",
      "plus_ones",
      "status",
      "wedding_id"
    ],
    "required": [],
    "enums": {
      "status": [
        "pending",
        "yes",
        "no"
      ]
    }
  },
  "Schedule": {
    "fields": [
      "category",
      "description",
      "end_time",
      "event_date",
      "event_name",
      "location",
      "notes",
      "responsible_person",
      "start_time"
    ],
    "required": [
      "event_date",
      "event_name",
      "start_time"
    ],
    "enums": {
      "category": [
        "ceremony",
        "reception",
        "photography",
        "preparation",
        "transportation",
        "rehearsal",
        "pre_wedding",
        "post_wedding",
        "other"
      ]
    }
  },
  "SongRequest": {
    "fields": [
      "aiTags",
      "album",
      "albumArt",
      "artist",
      "doNotPlay",
      "duration",
      "explicit",
      "guestEmailHash",
      "guestNote",
      "mustPlay",
      "ownerUserId",
      "playlist",
      "spotifyTrackId",
      "spotifyUrl",
      "status",
      "submittedBy",
      "title",
      "weddingId"
    ],
    "required": [
      "artist",
      "submittedBy",
      "title"
    ],
    "enums": {
      "status": [
        "pending",
        "approved",
        "declined",
        "added"
      ]
    }
  },
  "StoryMilestone": {
    "fields": [
      "date",
      "image_url",
      "order",
      "story",
      "title"
    ],
    "required": [
      "date",
      "title"
    ],
    "enums": {}
  },
  "StreamChat": {
    "fields": [
      "guest_name",
      "is_visible",
      "message",
      "stream_id"
    ],
    "required": [
      "guest_name",
      "message",
      "stream_id"
    ],
    "enums": {}
  },
  "Table": {
    "fields": [
      "assigned_guests",
      "capacity",
      "event_id",
      "name",
      "rotation",
      "shape",
      "x",
      "y"
    ],
    "required": [
      "capacity",
      "name",
      "shape"
    ],
    "enums": {
      "shape": [
        "round",
        "rectangle"
      ]
    }
  },
  "Task": {
    "fields": [
      "category",
      "completed",
      "description",
      "due_date",
      "is_suggested",
      "priority",
      "reminder_date",
      "title",
      "wedding_timeline"
    ],
    "required": [
      "title"
    ],
    "enums": {
      "category": [
        "venue",
        "catering",
        "attire",
        "photography",
        "flowers",
        "music",
        "transportation",
        "legal",
        "guests",
        "decorations",
        "general"
      ],
      "priority": [
        "low",
        "medium",
        "high",
        "urgent"
      ],
      "wedding_timeline": [
        "12_months",
        "9_months",
        "6_months",
        "3_months",
        "1_month",
        "2_weeks",
        "1_week",
        "day_of"
      ]
    }
  },
  "ThemeDetails": {
    "fields": [
      "cultural_details",
      "is_cultural",
      "is_religious",
      "religious_details",
      "season",
      "setting",
      "vibes"
    ],
    "required": [],
    "enums": {
      "religious_details": [
        "Christian",
        "Jewish",
        "Muslim",
        "Hindu",
        "Buddhist",
        "Sikh",
        "Interfaith",
        "Other"
      ],
      "cultural_details": [
        "Indian",
        "Chinese",
        "Mexican",
        "Italian",
        "African",
        "Irish",
        "Greek",
        "Korean",
        "Japanese",
        "Latin American",
        "Middle Eastern",
        "Other"
      ],
      "season": [
        "Spring",
        "Summer",
        "Autumn",
        "Winter"
      ],
      "setting": [
        "Indoor",
        "Outdoor",
        "Both"
      ]
    }
  },
  "User": {
    "fields": [
      "currency",
      "deletionRequestedAt",
      "language",
      "notification_prefs",
      "onboarding_completed",
      "tempUnit",
      "trialStartedAt"
    ],
    "required": [],
    "enums": {
      "tempUnit": [
        "C",
        "F"
      ]
    }
  },
  "UserPayment": {
    "fields": [
      "amount",
      "currency",
      "product_name",
      "status",
      "stripe_payment_intent_id"
    ],
    "required": [
      "amount",
      "status"
    ],
    "enums": {
      "status": [
        "pending",
        "succeeded",
        "failed"
      ]
    }
  },
  "Vendor": {
    "fields": [
      "address",
      "backup_equipment",
      "booking_date",
      "cancellation_policy",
      "category",
      "contact_person",
      "contract_date",
      "contract_signed",
      "delivery_timeline",
      "deposit_amount",
      "deposit_paid",
      "editing_style",
      "email",
      "end_time",
      "equipment",
      "google_place_id",
      "google_rating",
      "google_reviews_count",
      "hours_booked",
      "image_count",
      "image_url",
      "instagram",
      "is_favourite",
      "latitude",
      "longitude",
      "meeting_date",
      "name",
      "notes",
      "package_selected",
      "payment_schedule",
      "phone",
      "portfolio_url",
      "price_range",
      "quoted_price",
      "rating",
      "reviews_count",
      "sample_work",
      "second_shooter",
      "services_offered",
      "special_requests",
      "start_time",
      "starting_price",
      "status",
      "style",
      "travel_fee",
      "video_length",
      "website"
    ],
    "required": [
      "category",
      "name"
    ],
    "enums": {
      "category": [
        "venue",
        "catering",
        "photography",
        "videography",
        "flowers",
        "music",
        "bakery",
        "transportation",
        "beauty",
        "attire",
        "planning",
        "decorations",
        "entertainment",
        "other"
      ],
      "price_range": [
        "$",
        "$$",
        "$$$",
        "$$$$"
      ],
      "status": [
        "researching",
        "contacted",
        "meeting_scheduled",
        "quoted",
        "booked",
        "rejected"
      ]
    }
  },
  "VendorBooking": {
    "fields": [
      "balance_paid",
      "booking_details",
      "deposit_amount",
      "deposit_paid",
      "event_date",
      "payment_intent_id",
      "service_type",
      "status",
      "total_amount",
      "vendor_id",
      "vendor_name"
    ],
    "required": [
      "event_date",
      "service_type",
      "total_amount",
      "vendor_id",
      "vendor_name"
    ],
    "enums": {
      "status": [
        "pending",
        "confirmed",
        "completed",
        "cancelled"
      ]
    }
  },
  "VendorLog": {
    "fields": [
      "body",
      "document_name",
      "document_type",
      "document_url",
      "logged_at",
      "subject",
      "type",
      "vendor_id"
    ],
    "required": [
      "subject",
      "type",
      "vendor_id"
    ],
    "enums": {
      "type": [
        "email",
        "call",
        "meeting",
        "note",
        "document"
      ],
      "document_type": [
        "contract",
        "invoice",
        "quote",
        "receipt",
        "other"
      ]
    }
  },
  "VendorReview": {
    "fields": [
      "event_date",
      "photos",
      "rating",
      "review_text",
      "reviewer_name",
      "vendor_id",
      "verified"
    ],
    "required": [
      "rating",
      "review_text",
      "reviewer_name",
      "vendor_id"
    ],
    "enums": {}
  },
  "VendorTask": {
    "fields": [
      "completed",
      "due_date",
      "notes",
      "priority",
      "title",
      "vendor_id"
    ],
    "required": [
      "title",
      "vendor_id"
    ],
    "enums": {
      "priority": [
        "low",
        "medium",
        "high"
      ]
    }
  },
  "VenueAsset": {
    "fields": [
      "event_id",
      "height",
      "name",
      "rotation",
      "type",
      "width",
      "x",
      "y"
    ],
    "required": [
      "height",
      "name",
      "type",
      "width",
      "x",
      "y"
    ],
    "enums": {
      "type": [
        "dance-floor",
        "bar",
        "stage",
        "dj-booth",
        "entrance",
        "bridal-table",
        "toilets"
      ]
    }
  },
  "VowSpeech": {
    "fields": [
      "author",
      "content",
      "notes",
      "title",
      "type"
    ],
    "required": [
      "author",
      "content",
      "title",
      "type"
    ],
    "enums": {
      "type": [
        "vow",
        "speech"
      ]
    }
  },
  "WebsiteTheme": {
    "fields": [
      "accent_color",
      "background_color",
      "font_family",
      "heading_font",
      "hero_image_url",
      "primary_color",
      "secondary_color",
      "text_color"
    ],
    "required": [],
    "enums": {
      "font_family": [
        "Inter",
        "Playfair Display",
        "Montserrat",
        "Lora",
        "Raleway",
        "Crimson Text"
      ],
      "heading_font": [
        "Inter",
        "Playfair Display",
        "Montserrat",
        "Lora",
        "Raleway",
        "Crimson Text"
      ]
    }
  },
  "WeddingDetails": {
    "fields": [
      "accommodation",
      "accommodationNotes",
      "activeTheme",
      "activeTypography",
      "activeUniverse",
      "additionalNotes",
      "assetContent",
      "attire",
      "avaStudioMilestones",
      "beauty",
      "budget",
      "cateringNotes",
      "celebrant",
      "celebrationContent",
      "ceremonyMusic",
      "ceremonyReadings",
      "ceremonyType",
      "contactPerson",
      "couple1Name",
      "couple2Name",
      "coupleNames",
      "coupleStory",
      "coverPhoto",
      "customPages",
      "dayAfterBrunch",
      "dayVendorContacts",
      "decorations",
      "emergencyContacts",
      "enabledPages",
      "entertainmentDetails",
      "experienceGuide",
      "favourItems",
      "floristNotes",
      "flowerGirlDetails",
      "flowers",
      "foodAndBeverage",
      "foodBeverage",
      "guestCount",
      "guestExperienceSettings",
      "guestSuiteAccommodation",
      "guestSuiteTransport",
      "guestType",
      "hairMakeupNotes",
      "heroEffect",
      "heroVideoFile",
      "heroVideoUrl",
      "homeContent",
      "honeymoonDeparture",
      "honeymoonDestination",
      "honeymoonDetails",
      "honeymoonNotes",
      "importantFeatures",
      "is_test",
      "license",
      "mainCeremony",
      "mealOptions",
      "menuItems",
      "music",
      "musicContent",
      "orderOfServiceNotes",
      "ourStoryContent",
      "pageSections",
      "pageTransition",
      "photography",
      "photographyNotes",
      "photosContent",
      "polls",
      "postWeddingEvents",
      "preWeddingEvents",
      "qna",
      "reception",
      "registryContent",
      "rehearsal",
      "ringBearerDetails",
      "rsvpContent",
      "scrollAnimation",
      "slug",
      "thankYouMessage",
      "theme",
      "transport",
      "transportNotes",
      "travelContent",
      "videographyNotes",
      "vowsNotes",
      "websiteAccentColor",
      "websiteEnabled",
      "websiteMode",
      "websitePassword",
      "websitePasswordEnabled",
      "websiteTheme",
      "weddingDate",
      "weddingFavours",
      "weddingParty",
      "weddingPolicies",
      "weddingStyle",
      "welcomeDinner",
      "welcomeMessage",
      "welcomeSignageText"
    ],
    "required": [],
    "enums": {
      "guestType": [
        "intimate",
        "celebration",
        "grand"
      ],
      "websiteTheme": [
        "still"
      ],
      "websiteMode": [
        "dark",
        "light"
      ],
      "pageTransition": [
        "fade",
        "slide",
        "reveal",
        "dissolve"
      ],
      "scrollAnimation": [
        "none",
        "subtle",
        "dramatic"
      ],
      "heroEffect": [
        "parallax",
        "zoomout",
        "static"
      ]
    }
  }
};
