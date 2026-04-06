/**
 * Sync Script — pulls all content for a site from Supabase into local files.
 *
 * Usage:
 *   npx tsx scripts/sync.ts
 *
 * Env vars (in .env or .env.local):
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_ANON_KEY=eyJ...
 *   SITE_ID=fe9df4e8-679f-4a00-a3a6-805ca9f02d1a
 *
 * Output structure:
 *   sync-output/{site-name}/
 *     content/
 *       casino-reviews/{slug}.json
 *       bonuses/{slug}-bonus-review.json
 *       news/{slug}.json
 *       guides/{slug}.json
 *       comparisons/{slug}.json
 *       authors/{slug}.json
 *       taxonomy.json
 *     public/
 *       images/covers/casino/{slug}.webp
 *       images/covers/news/{slug}.webp
 *       images/covers/guide/{slug}.webp
 *       images/covers/comparison/{slug}.webp
 *       images/logos/{slug}.webp
 *       images/screenshots/{slug}/{n}.webp
 *       images/authors/{slug}.webp
 *       images/icons/payments/{name}.webp
 *       images/icons/providers/{name}.webp
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ─── Config ─────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_ID = process.env.SITE_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  process.exit(1);
}
if (!SITE_ID) {
  console.error("Missing SITE_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;
  if (fs.existsSync(destPath)) return true; // already downloaded
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

function log(msg: string) {
  console.log(`[Sync] ${msg}`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function sync() {
  log("Starting sync...");

  // Fetch site
  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", SITE_ID)
    .single();
  if (!site) {
    console.error("Site not found");
    process.exit(1);
  }
  log(`Site: ${site.name} (${site.domain})`);

  const siteName = slugify(site.name);
  const outDir = path.resolve(`sync-output/${siteName}`);
  const contentDir = path.join(outDir, "content");
  const publicDir = path.join(outDir, "public");

  // Track deduplicated icons
  const downloadedIcons = new Set<string>();

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, type")
    .eq("site_id", SITE_ID);
  if (!profiles || profiles.length === 0) {
    log("No profiles found");
    return;
  }
  const profileIds = profiles.map((p) => p.id);
  log(`Profiles: ${profiles.map((p) => p.type).join(", ")}`);

  // Fetch authors
  const { data: authors } = await supabase
    .from("authors")
    .select("*")
    .eq("site_id", SITE_ID);
  const authorMap = new Map<string, Record<string, unknown>>();
  if (authors) {
    for (const a of authors) {
      authorMap.set(a.id, a);
      writeJson(path.join(contentDir, "authors", `${a.slug}.json`), {
        name: a.name,
        slug: a.slug,
        bio: a.bio,
        role: a.persona_prompt ? "expert" : "contributor",
        avatar: `/images/authors/${a.slug}.webp`,
        persona_prompt: a.persona_prompt,
      });

      // Download avatar
      if (a.avatar_url) {
        await downloadImage(
          a.avatar_url,
          path.join(publicDir, "images/authors", `${a.slug}.webp`),
        );
      }
    }
    log(`Authors: ${authors.length} synced`);
  }

  // Helper: get author slug by ID
  function authorSlug(authorId: string | null): string | null {
    if (!authorId) return null;
    const a = authorMap.get(authorId);
    return a ? (a.slug as string) : null;
  }

  // ─── Casino Reviews ─────────────────────────────────────────────

  const { data: casinos } = await supabase
    .from("casinos")
    .select("*")
    .in("profile_id", profileIds)
    .in("status", ["verified", "linked"]);

  let casinoCount = 0;
  if (casinos && casinos.length > 0) {
    for (const casino of casinos) {
      // Get latest draft
      const { data: draft } = await supabase
        .from("casino_drafts")
        .select("*")
        .eq("entity_id", casino.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draft || !draft.content) continue;

      const aiFields = (draft.schema_markup || {}) as Record<string, unknown>;

      writeJson(
        path.join(contentDir, "casino-reviews", `${casino.slug}.json`),
        {
          // Identity
          name: casino.name,
          slug: casino.slug,
          // SEO
          title: draft.title,
          description: draft.meta_description,
          seoTitle: aiFields.seoTitle || draft.title,
          excerpt: aiFields.excerpt || "",
          primaryKeyword: casino.primary_keyword,
          secondaryKeywords: casino.secondary_keywords || [],
          tags: aiFields.tags || [],
          searchIntent: casino.search_intent,
          // Content
          content: draft.content,
          wordCount: draft.word_count,
          seoScore: draft.seo_score,
          author: authorSlug(draft.author_id),
          // Entity data
          rating: casino.rating,
          established: casino.established,
          license: casino.license,
          owner: casino.owner,
          minDeposit: casino.min_deposit,
          payoutSpeed: casino.payout_speed,
          gameCount: casino.game_count,
          paymentMethods: casino.payment_methods || [],
          gameProviders: casino.game_providers || [],
          gameTypes: casino.game_types || [],
          languages: casino.languages || [],
          currencies: casino.currencies || [],
          depositMethods: casino.deposit_methods || [],
          withdrawalMethods: casino.withdrawal_methods || [],
          pros: aiFields.pros || casino.pros || [],
          cons: aiFields.cons || casino.cons || [],
          // Bonus data
          bonusValue: casino.bonus_value,
          bonusWagering: casino.bonus_wagering,
          bonusCode: casino.bonus_code,
          bonusMinDeposit: casino.bonus_min_deposit,
          bonusMaxBet: casino.bonus_max_bet,
          bonusTimeLimit: casino.bonus_time_limit,
          bonuses: casino.bonuses || [],
          // URLs
          websiteUrl: casino.website_url,
          claimUrl: casino.claim_url,
          // Trust
          safetyIndex: casino.safety_index,
          trustpilotScore: casino.trustpilot_score,
          askgamblersScore: casino.askgamblers_score,
          complaintsCount: casino.complaints_count,
          tcFairness: casino.tc_fairness,
          blacklistStatus: casino.blacklist_status,
          licenseStatus: casino.license_status,
          kycRequired: casino.kyc_required,
          vipProgram: casino.vip_program,
          // AI fields
          verdict: aiFields.verdict || null,
          ratingJustification: aiFields.rating_justification || null,
          bestFor: aiFields.best_for || null,
          avoidIf: aiFields.avoid_if || null,
          keyStats: aiFields.key_stats || null,
          faqs: aiFields.faqs || [],
          schemaJsonLd: aiFields.schemaJsonLd || [],
          // Images (local paths)
          cover: `/images/covers/casino/${casino.slug}.webp`,
          logo: casino.logo_url ? `/images/logos/${casino.slug}.webp` : null,
          screenshots: (casino.screenshots || []).map(
            (_: string, i: number) =>
              `/images/screenshots/${casino.slug}/${i + 1}.webp`,
          ),
          // Payment/provider icon paths (for rendering)
          paymentIcons: (casino.payment_methods || []).map((m: string) => ({
            name: m,
            icon: `/images/icons/payments/${slugify(m)}.webp`,
          })),
          providerIcons: (casino.game_providers || [])
            .slice(0, 30)
            .map((p: string) => ({
              name: p,
              icon: `/images/icons/providers/${slugify(p)}.webp`,
            })),
        },
      );

      // Download cover
      if (draft.cover_image_url) {
        await downloadImage(
          draft.cover_image_url,
          path.join(publicDir, "images/covers/casino", `${casino.slug}.webp`),
        );
      }

      // Download logo
      if (casino.logo_url) {
        const ext = casino.logo_url.split("?")[0].split(".").pop() || "webp";
        await downloadImage(
          casino.logo_url,
          path.join(publicDir, "images/logos", `${casino.slug}.${ext}`),
        );
      }

      // Download screenshots
      if (casino.screenshots && Array.isArray(casino.screenshots)) {
        for (let i = 0; i < casino.screenshots.length; i++) {
          await downloadImage(
            casino.screenshots[i],
            path.join(
              publicDir,
              `images/screenshots/${casino.slug}`,
              `${i + 1}.webp`,
            ),
          );
        }
      }

      // Download payment method logos (deduplicated)
      if (
        casino.payment_method_logos &&
        Array.isArray(casino.payment_method_logos)
      ) {
        const methods = casino.payment_methods || [];
        for (
          let i = 0;
          i < Math.min(casino.payment_method_logos.length, methods.length);
          i++
        ) {
          const iconSlug = slugify(methods[i]);
          if (downloadedIcons.has(`payment-${iconSlug}`)) continue;
          downloadedIcons.add(`payment-${iconSlug}`);
          await downloadImage(
            casino.payment_method_logos[i],
            path.join(publicDir, "images/icons/payments", `${iconSlug}.webp`),
          );
        }
      }

      // Download game provider logos (deduplicated)
      if (
        casino.game_provider_logos &&
        Array.isArray(casino.game_provider_logos)
      ) {
        const providers = casino.game_providers || [];
        for (
          let i = 0;
          i < Math.min(casino.game_provider_logos.length, providers.length);
          i++
        ) {
          const iconSlug = slugify(providers[i]);
          if (downloadedIcons.has(`provider-${iconSlug}`)) continue;
          downloadedIcons.add(`provider-${iconSlug}`);
          await downloadImage(
            casino.game_provider_logos[i],
            path.join(publicDir, "images/icons/providers", `${iconSlug}.webp`),
          );
        }
      }

      casinoCount++;
    }
    log(`Casino reviews: ${casinoCount} synced`);
  }

  // ─── Bonus Articles ─────────────────────────────────────────────

  let bonusCount = 0;
  if (casinos && casinos.length > 0) {
    for (const casino of casinos) {
      const { data: bonusDraft } = await supabase
        .from("bonus_drafts")
        .select("*")
        .eq("entity_id", casino.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!bonusDraft || !bonusDraft.content) continue;

      const aiFields = (bonusDraft.schema_markup || {}) as Record<
        string,
        unknown
      >;

      writeJson(
        path.join(contentDir, "bonuses", `${casino.slug}-bonus-review.json`),
        {
          name: casino.name,
          slug: `${casino.slug}-bonus-review`,
          casinoSlug: casino.slug,
          title: bonusDraft.title,
          description: bonusDraft.meta_description,
          seoTitle: aiFields.seoTitle || bonusDraft.title,
          excerpt: aiFields.excerpt || "",
          tags: aiFields.tags || [],
          content: bonusDraft.content,
          wordCount: bonusDraft.word_count,
          seoScore: bonusDraft.seo_score,
          author: authorSlug(bonusDraft.author_id),
          // Bonus data from casino entity
          bonusValue: casino.bonus_value,
          bonusWagering: casino.bonus_wagering,
          bonusCode: casino.bonus_code,
          bonuses: casino.bonuses || [],
          claimUrl: casino.claim_url,
          websiteUrl: casino.website_url,
          logo: casino.logo_url ? `/images/logos/${casino.slug}.webp` : null,
          cover: `/images/covers/casino/${casino.slug}.webp`, // reuses casino cover
          bonusVerdict: aiFields.bonus_verdict || null,
          bestBonus: aiFields.best_bonus || null,
          wageringRating: aiFields.wagering_rating || null,
          faqs: aiFields.faqs || [],
          schemaJsonLd: aiFields.schemaJsonLd || [],
        },
      );
      bonusCount++;
    }
    log(`Bonus articles: ${bonusCount} synced`);
  }

  // ─── News ───────────────────────────────────────────────────────

  const { data: newsItems } = await supabase
    .from("news_items")
    .select("*")
    .in("profile_id", profileIds)
    .in("status", ["verified", "linked"]);

  let newsCount = 0;
  if (newsItems && newsItems.length > 0) {
    for (const news of newsItems) {
      const { data: draft } = await supabase
        .from("news_drafts")
        .select("*")
        .eq("entity_id", news.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draft || !draft.content) continue;

      const aiFields = (draft.schema_markup || {}) as Record<string, unknown>;

      writeJson(path.join(contentDir, "news", `${news.slug}.json`), {
        title: draft.title || news.title,
        slug: news.slug,
        description: draft.meta_description,
        seoTitle: aiFields.seoTitle || draft.title,
        excerpt: aiFields.excerpt || news.summary || "",
        content: draft.content,
        wordCount: draft.word_count,
        seoScore: draft.seo_score,
        author: authorSlug(draft.author_id),
        publishedDate: news.published_date,
        category: aiFields.category || news.category,
        tags: aiFields.tags || [],
        relatedCasinos: aiFields.related_casinos || news.related_casinos || [],
        keyTakeaways: aiFields.key_takeaways || [],
        impactLevel: aiFields.impact_level || null,
        regionsAffected: aiFields.regions_affected || [],
        entitiesMentioned: aiFields.entities_mentioned || news.entities || [],
        faqs: aiFields.faqs || [],
        schemaJsonLd: aiFields.schemaJsonLd || [],
        cover: `/images/covers/news/${news.slug}.webp`,
        sourceUrl: news.source_url,
      });

      if (draft.cover_image_url) {
        await downloadImage(
          draft.cover_image_url,
          path.join(publicDir, "images/covers/news", `${news.slug}.webp`),
        );
      }
      newsCount++;
    }
    log(`News articles: ${newsCount} synced`);
  }

  // ─── Guides ─────────────────────────────────────────────────────

  const { data: guides } = await supabase
    .from("guides")
    .select("*")
    .in("profile_id", profileIds)
    .in("status", ["verified", "linked"]);

  let guideCount = 0;
  if (guides && guides.length > 0) {
    for (const guide of guides) {
      const { data: draft } = await supabase
        .from("guide_drafts")
        .select("*")
        .eq("entity_id", guide.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draft || !draft.content) continue;

      const aiFields = (draft.schema_markup || {}) as Record<string, unknown>;

      writeJson(path.join(contentDir, "guides", `${guide.slug}.json`), {
        title: draft.title || guide.title,
        slug: guide.slug,
        description: draft.meta_description,
        seoTitle: aiFields.seoTitle || draft.title,
        excerpt: aiFields.excerpt || guide.summary || "",
        content: draft.content,
        wordCount: draft.word_count,
        seoScore: draft.seo_score,
        author: authorSlug(draft.author_id),
        category: aiFields.category || guide.category,
        difficulty: aiFields.difficulty || guide.difficulty,
        tags: aiFields.tags || [],
        keyTakeaways: aiFields.key_takeaways || [],
        relatedCasinos: aiFields.related_casinos || [],
        prerequisites: aiFields.prerequisites || [],
        estimatedReadTime: aiFields.estimated_read_time || null,
        faqs: aiFields.faqs || [],
        schemaJsonLd: aiFields.schemaJsonLd || [],
        cover: `/images/covers/guide/${guide.slug}.webp`,
      });

      if (draft.cover_image_url) {
        await downloadImage(
          draft.cover_image_url,
          path.join(publicDir, "images/covers/guide", `${guide.slug}.webp`),
        );
      }
      guideCount++;
    }
    log(`Guides: ${guideCount} synced`);
  }

  // ─── Comparisons ────────────────────────────────────────────────

  const { data: comparisons } = await supabase
    .from("comparisons")
    .select("*")
    .in("profile_id", profileIds)
    .in("status", ["verified", "linked"]);

  let compCount = 0;
  if (comparisons && comparisons.length > 0) {
    for (const comp of comparisons) {
      const { data: draft } = await supabase
        .from("comparison_drafts")
        .select("*")
        .eq("entity_id", comp.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draft || !draft.content) continue;

      const aiFields = (draft.schema_markup || {}) as Record<string, unknown>;

      // Fetch both casino names for reference
      const casinoNames: string[] = [];
      if (comp.casino_ids && Array.isArray(comp.casino_ids)) {
        for (const cid of comp.casino_ids) {
          const { data: c } = await supabase
            .from("casinos")
            .select("name, slug")
            .eq("id", cid)
            .single();
          if (c) casinoNames.push(c.slug);
        }
      }

      writeJson(path.join(contentDir, "comparisons", `${comp.slug}.json`), {
        title: draft.title || comp.title,
        slug: comp.slug,
        description: draft.meta_description,
        seoTitle: aiFields.seoTitle || draft.title,
        excerpt: aiFields.excerpt || "",
        content: draft.content,
        wordCount: draft.word_count,
        seoScore: draft.seo_score,
        author: authorSlug(draft.author_id),
        tags: aiFields.tags || [],
        casinoSlugs: casinoNames,
        winner: aiFields.winner || null,
        verdict: aiFields.verdict || null,
        comparisonStats: aiFields.comparison_stats || null,
        faqs: aiFields.faqs || [],
        schemaJsonLd: aiFields.schemaJsonLd || [],
        cover: `/images/covers/comparison/${comp.slug}.webp`,
      });

      if (draft.cover_image_url) {
        await downloadImage(
          draft.cover_image_url,
          path.join(publicDir, "images/covers/comparison", `${comp.slug}.webp`),
        );
      }
      compCount++;
    }
    log(`Comparisons: ${compCount} synced`);
  }

  // ─── Taxonomy ───────────────────────────────────────────────────

  if (
    site.taxonomy &&
    Array.isArray(site.taxonomy) &&
    site.taxonomy.length > 0
  ) {
    writeJson(path.join(contentDir, "taxonomy.json"), site.taxonomy);
    log(`Taxonomy: ${site.taxonomy.length} categories`);
  }

  // ─── Manifest ───────────────────────────────────────────────────

  const manifest = {
    siteId: SITE_ID,
    siteName: site.name,
    domain: site.domain,
    syncedAt: new Date().toISOString(),
    counts: {
      casinoReviews: casinoCount,
      bonusArticles: bonusCount,
      news: newsCount,
      guides: guideCount,
      comparisons: compCount,
      authors: authors?.length || 0,
      taxonomy: site.taxonomy?.length || 0,
      icons: downloadedIcons.size,
    },
    totalPages: casinoCount + bonusCount + newsCount + guideCount + compCount,
  };

  writeJson(path.join(outDir, "manifest.json"), manifest);

  log("─────────────────────────────────");
  log(`Done! Output: ${outDir}`);
  log(`  Casino reviews: ${casinoCount}`);
  log(`  Bonus articles: ${bonusCount}`);
  log(`  News: ${newsCount}`);
  log(`  Guides: ${guideCount}`);
  log(`  Comparisons: ${compCount}`);
  log(`  Authors: ${authors?.length || 0}`);
  log(`  Taxonomy: ${site.taxonomy?.length || 0} categories`);
  log(`  Deduplicated icons: ${downloadedIcons.size}`);
  log(`  Total pages: ${manifest.totalPages}`);
}

sync().catch((err) => {
  console.error("[Sync] Fatal error:", err);
  process.exit(1);
});
