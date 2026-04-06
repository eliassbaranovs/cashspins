import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const bonusSchema = z
  .object({
    name: z.string(),
    type: z.string().optional(),
    wagering: z.string().optional(),
    min_deposit: z.string().optional(),
    max_cashout: z.string().optional(),
    free_spins: z.union([z.string(), z.number()]).optional(),
    expiry: z.string().optional(),
  })
  .passthrough();

const screenshotSchema = z
  .object({
    url: z.string().optional(),
    alt: z.string().optional(),
  })
  .passthrough();

const sectionImageSchema = z
  .object({
    section: z.string().optional(),
    path: z.string().optional(),
  })
  .passthrough();

const faqSchema = z
  .object({
    question: z.string(),
    answer: z.string(),
  })
  .passthrough();

// ─── Universal fields shared across all article content types ─────────────────

const universalFields = {
  // Required
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  seoTitle: z.string(),
  publishedAt: z.string(),
  author: z.string(),
  authorSlug: z.string(),
  contentType: z.string(),
  image: z.string(),
  imageAlt: z.string(),

  // Optional
  excerpt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishDate: z.string().optional(),
  category: z.string().optional(),
  draft: z.boolean().default(false),
  noIndex: z.boolean().default(false),
  robots: z.string().default("index, follow"),
  canonical: z.string().optional(),
  imageWidth: z.number().optional(),
  imageHeight: z.number().optional(),
  tags: z.array(z.string()).optional(),
  schemaJsonLd: z.any().optional(),
};

// ─── Casino-specific fields (shared by casinos + bonuses collections) ─────────

const iconSchema = z.object({
  name: z.string(),
  icon: z.string(),
}).passthrough();

const casinoFields = {
  casino: z.string().optional(),
  casinoName: z.string().optional(),
  ourRating: z.number().min(0).max(10).optional(),
  player_rating: z.union([z.number(), z.string()]).optional(),
  best_for: z.string().optional(),
  avoid_if: z.string().optional(),
  verdict: z.string().optional(),
  rating_justification: z.string().optional(),
  safetyIndex: z.string().optional(),
  website: z.string().optional(),
  established: z.string().optional(),
  company: z.string().optional(),
  licences: z.string().optional(),
  license_status: z.string().optional(),
  casino_type: z.string().optional(),

  // Bonus headline fields
  bonus_title: z.string().optional(),
  bonus_percentage: z.union([z.number(), z.string()]).optional(),
  max_bonus: z.string().optional(),
  min_deposit: z.string().optional(),
  bonus_min_deposit: z.string().optional(),
  wagering: z.string().optional(),
  wageringMultiplier: z.number().optional(),
  free_spins: z.union([z.string(), z.number()]).optional(),
  bonus_code: z.string().optional(),
  bonus_max_bet: z.string().optional(),
  bonus_time_limit: z.string().optional(),
  vip_program: z.boolean().optional(),
  vip_details: z.string().optional(),

  // Structured bonuses
  bonuses: z.array(bonusSchema).optional(),

  // Pros & cons
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),

  // Payment & crypto
  acceptedCryptos: z.array(z.string()).optional(),
  depositMethods: z.string().optional(),
  withdrawalMethods: z.string().optional(),
  paymentMethods: z.string().optional(),
  currencies: z.string().optional(),
  cryptoWithdrawalSpeedMinutes: z.number().optional(),
  payout_speed: z.string().optional(),

  // Games
  gameProviders: z.string().optional(),
  gameTypes: z.array(z.string()).optional(),
  game_count: z.number().optional(),
  languages: z.array(z.string()).optional(),

  // Compliance / meta
  kycRequired: z.boolean().optional(),
  kyc_details: z.string().optional(),
  isNewCasino: z.boolean().optional(),
  lastVerified: z.string().optional(),
  tc_fairness: z.string().optional(),
  blacklist_status: z.string().optional(),
  trustpilot_score: z.string().optional(),
  askgamblers_score: z.string().optional(),

  // SEO metadata
  seo_score: z.number().optional(),
  word_count: z.number().optional(),
  primary_keyword: z.string().optional(),
  secondary_keywords: z.array(z.string()).optional(),

  // Media
  logo: z.string().optional(),
  screenshots: z.array(screenshotSchema).optional().nullable(),
  sectionImages: z.array(sectionImageSchema).optional(),
  paymentIcons: z.array(iconSchema).optional(),
  providerIcons: z.array(iconSchema).optional(),

  // FAQs
  faqs: z.array(faqSchema).optional(),

  // Links
  claim_url: z.string().optional(),

  // Taxonomy
  categories: z.array(z.string()).optional(),
};

// ─── Collections ─────────────────────────────────────────────────────────────

/** Casino reviews */
const casinos = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/casinos" }),
  schema: z.object({ ...universalFields, ...casinoFields }).passthrough(),
});

/** Bonus-focused pages */
const bonuses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/bonuses" }),
  schema: z.object({ ...universalFields, ...casinoFields }).passthrough(),
});

/** News articles */
const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: z
    .object({
      ...universalFields,
      source_url: z.string().optional(),
      source_name: z.string().optional(),
    })
    .passthrough(),
});

/** Long-form guides */
const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({ ...universalFields }).passthrough(),
});

/** Head-to-head comparisons */
const comparisons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/comparisons" }),
  schema: z
    .object({
      ...universalFields,
      casino_a: z.string().optional(),
      casino_b: z.string().optional(),
      casino_a_name: z.string().optional(),
      casino_b_name: z.string().optional(),
      casino_a_slug: z.string().optional(),
      casino_b_slug: z.string().optional(),
      casino_a_rating: z.number().optional(),
      casino_b_rating: z.number().optional(),
      casino_a_logo: z.string().optional(),
      casino_b_logo: z.string().optional(),
      casino_a_bonus: z.string().optional(),
      casino_b_bonus: z.string().optional(),
      casino_a_games: z.string().optional(),
      casino_b_games: z.string().optional(),
      casino_a_payout_speed: z.string().optional(),
      casino_b_payout_speed: z.string().optional(),
      casino_a_license: z.string().optional(),
      casino_b_license: z.string().optional(),
      winner: z.string().optional(),
      faqs: z.array(faqSchema).optional(),
    })
    .passthrough(),
});

/** Author profiles */
const authors = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/authors" }),
  schema: z
    .object({
      name: z.string(),
      slug: z.string(),
      bio: z.string(),
      avatar: z.string(),
      role: z.string().optional(),
      expertise: z.array(z.string()).optional(),
      credentials: z.array(z.string()).optional(),
      socialLinks: z
        .object({
          twitter: z.string().optional(),
          linkedin: z.string().optional(),
        })
        .optional(),
    })
    .passthrough(),
});

export const collections = {
  casinos,
  bonuses,
  news,
  guides,
  comparisons,
  authors,
};
