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

const faqSchema = z
  .object({
    question: z.string(),
    answer: z.string(),
  })
  .passthrough();

// ─── Universal fields shared across all article content types ─────────────────

const universalFields = {
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  seo_title: z.string().optional(),
  published_at: z.string(),
  author_slug: z.string(),
  content_type: z.string(),
  image: z.string(),
  image_alt: z.string().optional(),

  excerpt: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  schema_json_ld: z.any().optional(),

  // SEO
  seo_score: z.number().nullable().optional(),
  word_count: z.number().nullable().optional(),
};

// ─── Casino-specific fields (shared by casinos + bonuses collections) ─────────

const casinoFields = {
  // Identity
  name: z.string().optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  best_for: z.string().nullable().optional(),
  avoid_if: z.string().nullable().optional(),
  verdict: z.string().nullable().optional(),
  rating_justification: z.string().nullable().optional(),

  // Casino meta
  safety_index: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  established: z.string().nullable().optional(),
  owner: z.string().nullable().optional(),
  license: z.string().nullable().optional(),
  license_status: z.string().nullable().optional(),

  // Bonus
  bonus_value: z.string().nullable().optional(),
  bonus_wagering: z.string().nullable().optional(),
  bonus_code: z.string().nullable().optional(),
  bonus_min_deposit: z.string().nullable().optional(),
  bonus_max_bet: z.string().nullable().optional(),
  bonus_time_limit: z.string().nullable().optional(),
  vip_program: z.boolean().nullable().optional(),

  // Structured bonuses
  bonuses: z.array(bonusSchema).optional(),

  // Pros & cons
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),

  // Payment & methods (arrays, not pipe-delimited)
  payment_methods: z.array(z.string()).optional(),
  deposit_methods: z.array(z.string()).optional(),
  withdrawal_methods: z.array(z.string()).optional(),
  currencies: z.array(z.string()).optional(),
  payout_speed: z.string().nullable().optional(),
  min_deposit: z.string().nullable().optional(),

  // Games
  game_providers: z.array(z.string()).optional(),
  game_count: z.number().nullable().optional(),

  // Trust
  kyc_required: z.boolean().nullable().optional(),
  tc_fairness: z.string().nullable().optional(),

  // Media
  logo: z.string().nullable().optional(),
  screenshots: z.array(screenshotSchema).optional().nullable(),

  // FAQs
  faqs: z.array(faqSchema).optional(),

  // Links
  claim_url: z.string().nullable().optional(),

  // Taxonomy
  categories: z.array(z.string()).optional(),
};

// ─── Bonus-specific fields ──────────────────────────────────────────────────

const bonusExtraFields = {
  casino_slug: z.string().optional(),
  casino_name: z.string().optional(),
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
  schema: z.object({ ...universalFields, ...casinoFields, ...bonusExtraFields }).passthrough(),
});

/** News articles */
const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: z
    .object({
      ...universalFields,
      source_url: z.string().nullable().optional(),
      faqs: z.array(faqSchema).optional(),
    })
    .passthrough(),
});

/** Long-form guides */
const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z
    .object({
      ...universalFields,
      faqs: z.array(faqSchema).optional(),
    })
    .passthrough(),
});

/** Head-to-head comparisons */
const comparisons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/comparisons" }),
  schema: z
    .object({
      ...universalFields,
      casino_a_slug: z.string().optional(),
      casino_b_slug: z.string().optional(),
      casino_a_name: z.string().optional(),
      casino_b_name: z.string().optional(),
      casino_a_rating: z.number().nullable().optional(),
      casino_b_rating: z.number().nullable().optional(),
      casino_a_logo: z.string().optional(),
      casino_b_logo: z.string().optional(),
      casino_a_bonus_value: z.string().optional(),
      casino_b_bonus_value: z.string().optional(),
      casino_a_game_count: z.string().optional(),
      casino_b_game_count: z.string().optional(),
      casino_a_payout_speed: z.string().nullable().optional(),
      casino_b_payout_speed: z.string().nullable().optional(),
      casino_a_license: z.string().optional(),
      casino_b_license: z.string().optional(),
      winner: z.string().nullable().optional(),
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
      bio: z.string().nullable().optional(),
      avatar: z.string(),
      role: z.string().optional(),
      expertise: z.array(z.string()).optional(),
      credentials: z.array(z.string()).optional(),
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
