/**
 * Transform Script — converts sync JSON output into Astro-compatible markdown files.
 *
 * Usage:
 *   npx tsx src/scripts/transform.ts
 *
 * Reads from:  sync-output/{site-name}/content/ (JSON files)
 *              sync-output/{site-name}/public/   (images)
 *
 * Writes to:   src/content/casinos/{slug}.md
 *              src/content/bonuses/{slug}.md
 *              src/content/news/{slug}.md
 *              src/content/guides/{slug}.md
 *              src/content/comparisons/{slug}.md
 *              src/content/authors/{slug}.md
 *              public/images/...
 *
 * Existing manually-created content is NOT overwritten unless --force is passed.
 */

import * as fs from "fs";
import * as path from "path";

// ─── Config ─────────────────────────────────────────────────────────

const FORCE = process.argv.includes("--force");
const SYNC_DIR = findSyncDir();

function findSyncDir(): string {
  const base = path.resolve("sync-output");
  if (!fs.existsSync(base)) {
    console.error("[Transform] No sync-output/ directory found. Run sync.ts first.");
    process.exit(1);
  }
  const dirs = fs.readdirSync(base).filter(d =>
    fs.statSync(path.join(base, d)).isDirectory()
  );
  if (dirs.length === 0) {
    console.error("[Transform] No site directories in sync-output/");
    process.exit(1);
  }
  // Use most recently modified
  const sorted = dirs
    .map(d => ({ name: d, mtime: fs.statSync(path.join(base, d)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const dir = path.join(base, sorted[0].name);
  console.log(`[Transform] Using: ${dir}`);
  return dir;
}

const CONTENT_IN = path.join(SYNC_DIR, "content");
const PUBLIC_IN = path.join(SYNC_DIR, "public");
const CONTENT_OUT = path.resolve("src/content");
const PUBLIC_OUT = path.resolve("public");

// ─── Helpers ────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[Transform] ${msg}`);
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toYamlValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return '""';
  if (typeof val === "boolean") return val.toString();
  if (typeof val === "number") return val.toString();
  if (typeof val === "string") {
    // Multi-line or special chars → use quoted string
    if (val.includes("\n") || val.includes('"') || val.includes(":") || val.includes("#") || val.includes("'")) {
      return JSON.stringify(val);
    }
    return `"${val}"`;
  }
  return JSON.stringify(val);
}

function arrayToYaml(arr: string[], indent = 2): string {
  if (!arr || arr.length === 0) return "[]";
  const pad = " ".repeat(indent);
  return "\n" + arr.map(item => `${pad}- ${toYamlValue(item)}`).join("\n");
}

function objectArrayToYaml(arr: any[], indent = 2): string {
  if (!arr || arr.length === 0) return "[]";
  const pad = " ".repeat(indent);
  return "\n" + arr.map(obj => {
    const entries = Object.entries(obj).filter(([_, v]) => v != null && v !== "");
    const first = entries[0];
    const rest = entries.slice(1);
    let block = `${pad}- ${first[0]}: ${toYamlValue(first[1])}`;
    for (const [k, v] of rest) {
      block += `\n${pad}  ${k}: ${toYamlValue(v)}`;
    }
    return block;
  }).join("\n");
}

function arrToString(arr: string[] | null, separator = " | "): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(separator);
}

function writeMd(filePath: string, frontmatter: string, body: string) {
  if (!FORCE && fs.existsSync(filePath)) {
    log(`  SKIP (exists): ${path.basename(filePath)}`);
    return false;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `---\n${frontmatter}---\n${body}\n`);
  return true;
}

function copyImages(srcDir: string, destDir: string) {
  if (!fs.existsSync(srcDir)) return 0;
  let count = 0;

  function copyRecursive(src: string, dest: string) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        ensureDir(path.dirname(destPath));
        if (!fs.existsSync(destPath) || FORCE) {
          fs.copyFileSync(srcPath, destPath);
          count++;
        }
      }
    }
  }

  copyRecursive(srcDir, destDir);
  return count;
}

function nowIso(): string {
  return new Date().toISOString();
}

function dateOnly(iso: string | null): string {
  if (!iso) return new Date().toISOString().split("T")[0];
  return iso.split("T")[0];
}

// ─── Transforms ─────────────────────────────────────────────────────

function transformCasino(json: any): { frontmatter: string; body: string } {
  const slug = json.slug;
  const now = nowIso();

  // Map screenshots from string array to object array
  const screenshots = (json.screenshots || []).map((url: string, i: number) => ({
    url,
    alt: `${json.name} screenshot ${i + 1}`,
  }));

  // Map bonuses
  const bonuses = (json.bonuses || []).map((b: any) => ({
    name: b.name || b.title || "Bonus",
    type: b.type || "deposit",
    wagering: b.wagering || null,
    min_deposit: b.min_deposit || null,
    max_cashout: b.max_cashout || null,
    free_spins: b.free_spins || null,
    expiry: b.expiry || null,
  }));

  // Derive categories from entity data
  const categories: string[] = [];
  if (json.depositMethods?.some((m: string) => /bitcoin|btc/i.test(m))) categories.push("bitcoin-casino");
  if (json.depositMethods?.some((m: string) => /ethereum|eth/i.test(m))) categories.push("ethereum-casino");
  if (json.depositMethods?.some((m: string) => /crypto|bitcoin|btc|eth|usdt|ltc/i.test(m))) categories.push("crypto-casino");
  if (json.depositMethods?.some((m: string) => /visa/i.test(m))) categories.push("visa-casino");
  if (json.depositMethods?.some((m: string) => /mastercard/i.test(m))) categories.push("mastercard-casino");
  if (json.depositMethods?.some((m: string) => /skrill/i.test(m))) categories.push("skrill-casino");
  if (json.depositMethods?.some((m: string) => /bank/i.test(m))) categories.push("bank-transfer-casino");
  if (json.payoutSpeed && parseInt(json.payoutSpeed) <= 60) categories.push("fast-withdrawal-casino");
  if (json.kycRequired === false) categories.push("no-kyc-casino");
  if (json.vipProgram) categories.push("vip-program-casino");
  if (json.license) categories.push("licensed-casino");
  categories.push("online-casino");

  // Extract keyStats safely
  const keyStats = json.keyStats || {};
  const payoutSpeedText = keyStats.payout_speed || (json.payoutSpeed != null ? String(json.payoutSpeed) : "");
  const gameCountNum = keyStats.game_count ? parseInt(String(keyStats.game_count)) : (json.gameCount ? Number(json.gameCount) : 0);

  // Use paymentMethods (full 86-item list) over depositMethods (12-item subset)
  const allPaymentMethods = json.paymentMethods || json.depositMethods || [];
  const cryptoMethods = allPaymentMethods.filter((m: string) => /bitcoin|btc|ethereum|eth|usdt|litecoin|ltc|doge|tron|trx|solana|sol|crypto/i.test(m));

  const fm = `title: ${toYamlValue(json.title || `${json.name} Review`)}
slug: ${toYamlValue(slug)}
description: ${toYamlValue(json.description || "")}
seoTitle: ${toYamlValue(json.seoTitle || json.title || `${json.name} Review`)}
excerpt: ${toYamlValue(json.excerpt || "")}
publishedAt: ${toYamlValue(now)}
updatedAt: ${toYamlValue(now)}
publishDate: ${toYamlValue(dateOnly(null))}
author: ${toYamlValue(json.author || "Editorial Team")}
authorSlug: ${toYamlValue(json.author || "editorial-team")}
contentType: "review"
category: "Casino Review"
draft: false
noIndex: false
robots: "index, follow"
image: ${toYamlValue(json.cover || `/images/covers/casino/${slug}.webp`)}
imageAlt: ${toYamlValue(`${json.name} cover image`)}
imageWidth: 1792
imageHeight: 1024
tags: ${arrayToYaml(json.tags || [])}
casino: ${toYamlValue(slug)}
casinoName: ${toYamlValue(json.name)}
ourRating: ${json.rating ?? 0}
${json.safetyIndex ? `safetyIndex: ${toYamlValue(json.safetyIndex)}` : ""}
best_for: ${toYamlValue(json.bestFor || "")}
${json.avoidIf ? `avoid_if: ${toYamlValue(json.avoidIf)}` : ""}
${json.verdict ? `verdict: ${toYamlValue(json.verdict)}` : ""}
${json.ratingJustification ? `rating_justification: ${toYamlValue(json.ratingJustification)}` : ""}
website: ${toYamlValue(json.claimUrl || "")}
established: ${toYamlValue(String(json.established || ""))}
company: ${toYamlValue(json.owner || "")}
licences: ${toYamlValue(json.license || "")}
${json.licenseStatus ? `license_status: ${toYamlValue(json.licenseStatus)}` : ""}
casino_type: ${toYamlValue(json.casinoType || "Online Casino")}
bonus_title: ${toYamlValue(json.bonusValue || "")}
wagering: ${toYamlValue(json.bonusWagering || "")}
bonus_code: ${toYamlValue(json.bonusCode || "")}
bonus_min_deposit: ${toYamlValue(json.bonusMinDeposit || "")}
${json.bonusMaxBet ? `bonus_max_bet: ${toYamlValue(json.bonusMaxBet)}` : ""}
${json.bonusTimeLimit ? `bonus_time_limit: ${toYamlValue(json.bonusTimeLimit)}` : ""}
vip_program: ${typeof json.vipProgram === "boolean" ? json.vipProgram : (typeof json.vipProgram === "string" && json.vipProgram.length > 0 ? true : false)}
${typeof json.vipProgram === "string" && json.vipProgram.length > 10 ? `vip_details: ${toYamlValue(json.vipProgram)}` : ""}
bonuses: ${objectArrayToYaml(bonuses)}
pros: ${arrayToYaml(json.pros || [])}
cons: ${arrayToYaml(json.cons || [])}
acceptedCryptos: ${arrayToYaml(cryptoMethods)}
depositMethods: ${toYamlValue(arrToString(json.depositMethods || []))}
withdrawalMethods: ${toYamlValue(arrToString(json.withdrawalMethods || []))}
paymentMethods: ${toYamlValue(arrToString(allPaymentMethods))}
currencies: ${toYamlValue(arrToString(json.currencies || []))}
${payoutSpeedText ? `payout_speed: ${toYamlValue(payoutSpeedText)}` : ""}
gameProviders: ${toYamlValue(arrToString(json.gameProviders || []))}
${json.gameTypes?.length ? `gameTypes: ${arrayToYaml(json.gameTypes)}` : ""}
${gameCountNum > 0 ? `game_count: ${gameCountNum}` : ""}
${json.languages?.length ? `languages: ${arrayToYaml(json.languages)}` : ""}
kycRequired: ${typeof json.kycRequired === "boolean" ? json.kycRequired : (typeof json.kycRequired === "string" ? /yes|true|required/i.test(json.kycRequired) : true)}
${typeof json.kycRequired === "string" && json.kycRequired.length > 10 ? `kyc_details: ${toYamlValue(json.kycRequired)}` : ""}
isNewCasino: false
lastVerified: ${toYamlValue(dateOnly(null))}
${json.tcFairness ? `tc_fairness: ${toYamlValue(json.tcFairness)}` : ""}
${json.blacklistStatus ? `blacklist_status: ${toYamlValue(json.blacklistStatus)}` : ""}
${json.trustpilotScore ? `trustpilot_score: ${toYamlValue(json.trustpilotScore)}` : ""}
${json.askgamblersScore ? `askgamblers_score: ${toYamlValue(json.askgamblersScore)}` : ""}
${json.seoScore ? `seo_score: ${json.seoScore}` : ""}
${json.wordCount ? `word_count: ${json.wordCount}` : ""}
${json.primaryKeyword ? `primary_keyword: ${toYamlValue(json.primaryKeyword)}` : ""}
${json.secondaryKeywords?.length ? `secondary_keywords: ${arrayToYaml(json.secondaryKeywords)}` : ""}
logo: ${toYamlValue(json.logo || "")}
screenshots: ${objectArrayToYaml(screenshots)}
${json.paymentIcons?.length ? `paymentIcons: ${objectArrayToYaml(json.paymentIcons.map((p: any) => ({ name: p.name, icon: p.icon })))}` : ""}
${json.providerIcons?.length ? `providerIcons: ${objectArrayToYaml(json.providerIcons.map((p: any) => ({ name: p.name, icon: p.icon })))}` : ""}
faqs: ${objectArrayToYaml((json.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })))}
claim_url: ${toYamlValue(json.claimUrl || "")}
categories: ${arrayToYaml(categories)}
schemaJsonLd: ${json.schemaJsonLd ? toYamlValue(typeof json.schemaJsonLd === "string" ? json.schemaJsonLd : JSON.stringify(json.schemaJsonLd)) : '""'}
`;

  return { frontmatter: fm, body: json.content || "" };
}

function transformBonus(json: any): { frontmatter: string; body: string } {
  const slug = json.slug;
  const now = nowIso();

  const bonuses = (json.bonuses || []).map((b: any) => ({
    name: b.name || b.title || "Bonus",
    type: b.type || "deposit",
    wagering: b.wagering || null,
    min_deposit: b.min_deposit || null,
    max_cashout: b.max_cashout || null,
    free_spins: b.free_spins || null,
    expiry: b.expiry || null,
  }));

  const fm = `title: ${toYamlValue(json.title || `${json.name} Bonus Review`)}
slug: ${toYamlValue(slug)}
description: ${toYamlValue(json.description || "")}
seoTitle: ${toYamlValue(json.seoTitle || json.title || "")}
excerpt: ${toYamlValue(json.excerpt || "")}
publishedAt: ${toYamlValue(now)}
updatedAt: ${toYamlValue(now)}
publishDate: ${toYamlValue(dateOnly(null))}
author: ${toYamlValue(json.author || "Editorial Team")}
authorSlug: ${toYamlValue(json.author || "editorial-team")}
contentType: "bonus"
category: "Bonus Guide"
draft: false
noIndex: false
robots: "index, follow"
image: ${toYamlValue(json.cover || "")}
imageAlt: ${toYamlValue(`${json.name} bonus`)}
imageWidth: 1792
imageHeight: 1024
tags: ${arrayToYaml(json.tags || [])}
casino: ${toYamlValue(json.casinoSlug || "")}
casinoName: ${toYamlValue(json.name || "")}
bonus_title: ${toYamlValue(json.bonusValue || "")}
wagering: ${toYamlValue(json.bonusWagering || "")}
bonus_code: ${toYamlValue(json.bonusCode || "")}
bonuses: ${objectArrayToYaml(bonuses)}
claim_url: ${toYamlValue(json.claimUrl || "")}
logo: ${toYamlValue(json.logo || "")}
faqs: ${objectArrayToYaml((json.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })))}
schemaJsonLd: ${json.schemaJsonLd ? toYamlValue(typeof json.schemaJsonLd === "string" ? json.schemaJsonLd : JSON.stringify(json.schemaJsonLd)) : '""'}
`;

  return { frontmatter: fm, body: json.content || "" };
}

function transformNews(json: any): { frontmatter: string; body: string } {
  const now = nowIso();

  const fm = `title: ${toYamlValue(json.title || "")}
slug: ${toYamlValue(json.slug)}
description: ${toYamlValue(json.description || "")}
seoTitle: ${toYamlValue(json.seoTitle || json.title || "")}
excerpt: ${toYamlValue(json.excerpt || "")}
publishedAt: ${toYamlValue(json.publishedDate || now)}
updatedAt: ${toYamlValue(now)}
publishDate: ${toYamlValue(dateOnly(json.publishedDate))}
author: ${toYamlValue(json.author || "Editorial Team")}
authorSlug: ${toYamlValue(json.author || "editorial-team")}
contentType: "news"
category: ${toYamlValue(json.category || "Industry News")}
draft: false
noIndex: false
robots: "index, follow"
image: ${toYamlValue(json.cover || "")}
imageAlt: ${toYamlValue(`${json.title} cover`)}
imageWidth: 1792
imageHeight: 1024
tags: ${arrayToYaml(json.tags || [])}
source_url: ${toYamlValue(json.sourceUrl || "")}
source_name: ${toYamlValue("")}
faqs: ${objectArrayToYaml((json.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })))}
schemaJsonLd: ${json.schemaJsonLd ? toYamlValue(typeof json.schemaJsonLd === "string" ? json.schemaJsonLd : JSON.stringify(json.schemaJsonLd)) : '""'}
`;

  return { frontmatter: fm, body: json.content || "" };
}

function transformGuide(json: any): { frontmatter: string; body: string } {
  const now = nowIso();

  const fm = `title: ${toYamlValue(json.title || "")}
slug: ${toYamlValue(json.slug)}
description: ${toYamlValue(json.description || "")}
seoTitle: ${toYamlValue(json.seoTitle || json.title || "")}
excerpt: ${toYamlValue(json.excerpt || "")}
publishedAt: ${toYamlValue(now)}
updatedAt: ${toYamlValue(now)}
publishDate: ${toYamlValue(dateOnly(null))}
author: ${toYamlValue(json.author || "Editorial Team")}
authorSlug: ${toYamlValue(json.author || "editorial-team")}
contentType: "guide"
category: ${toYamlValue(json.category || "Guide")}
draft: false
noIndex: false
robots: "index, follow"
image: ${toYamlValue(json.cover || "")}
imageAlt: ${toYamlValue(`${json.title} cover`)}
imageWidth: 1792
imageHeight: 1024
tags: ${arrayToYaml(json.tags || [])}
faqs: ${objectArrayToYaml((json.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })))}
schemaJsonLd: ${json.schemaJsonLd ? toYamlValue(typeof json.schemaJsonLd === "string" ? json.schemaJsonLd : JSON.stringify(json.schemaJsonLd)) : '""'}
`;

  return { frontmatter: fm, body: json.content || "" };
}

function transformComparison(json: any): { frontmatter: string; body: string } {
  const now = nowIso();
  const slugs = json.casinoSlugs || [];

  const fm = `title: ${toYamlValue(json.title || "")}
slug: ${toYamlValue(json.slug)}
description: ${toYamlValue(json.description || "")}
seoTitle: ${toYamlValue(json.seoTitle || json.title || "")}
excerpt: ${toYamlValue(json.excerpt || "")}
publishedAt: ${toYamlValue(now)}
updatedAt: ${toYamlValue(now)}
publishDate: ${toYamlValue(dateOnly(null))}
author: ${toYamlValue(json.author || "Editorial Team")}
authorSlug: ${toYamlValue(json.author || "editorial-team")}
contentType: "comparison"
category: "Comparison"
draft: false
noIndex: false
robots: "index, follow"
image: ${toYamlValue(json.cover || "")}
imageAlt: ${toYamlValue(`${json.title} cover`)}
imageWidth: 1792
imageHeight: 1024
tags: ${arrayToYaml(json.tags || [])}
casino_a: ${toYamlValue(slugs[0] || "")}
casino_b: ${toYamlValue(slugs[1] || "")}
casino_a_slug: ${toYamlValue(slugs[0] || "")}
casino_b_slug: ${toYamlValue(slugs[1] || "")}
winner: ${toYamlValue(json.winner || "")}
faqs: ${objectArrayToYaml((json.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })))}
schemaJsonLd: ${json.schemaJsonLd ? toYamlValue(typeof json.schemaJsonLd === "string" ? json.schemaJsonLd : JSON.stringify(json.schemaJsonLd)) : '""'}
`;

  return { frontmatter: fm, body: json.content || "" };
}

function transformAuthor(json: any): { frontmatter: string; body: string } {
  const fm = `name: ${toYamlValue(json.name)}
slug: ${toYamlValue(json.slug)}
bio: ${toYamlValue(json.bio || json.persona_prompt || "")}
avatar: ${toYamlValue(json.avatar || `/images/authors/${json.slug}.webp`)}
role: ${toYamlValue(json.role || "Casino Analyst")}
expertise: ${arrayToYaml(json.expertise || [])}
credentials: ${arrayToYaml(json.credentials || [])}
`;

  return { frontmatter: fm, body: "" };
}

// ─── Main ───────────────────────────────────────────────────────────

function processDir(
  inputDir: string,
  outputDir: string,
  transform: (json: any) => { frontmatter: string; body: string },
  label: string,
) {
  const dir = path.join(CONTENT_IN, inputDir);
  if (!fs.existsSync(dir)) {
    log(`  ${label}: no directory found, skipping`);
    return 0;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  let count = 0;

  for (const file of files) {
    const json = readJson(path.join(dir, file));
    const slug = json.slug || file.replace(".json", "");
    const { frontmatter, body } = transform(json);
    const outPath = path.join(CONTENT_OUT, outputDir, `${slug}.md`);

    if (writeMd(outPath, frontmatter, body)) {
      count++;
    }
  }

  log(`  ${label}: ${count} transformed (${files.length} total)`);
  return count;
}

async function main() {
  log("Starting transform...");
  log(`  Force mode: ${FORCE ? "ON" : "OFF (use --force to overwrite)"}`);

  // Transform content
  const casinos = processDir("casino-reviews", "casinos", transformCasino, "Casino reviews");
  const bonuses = processDir("bonuses", "bonuses", transformBonus, "Bonus articles");
  const news = processDir("news", "news", transformNews, "News");
  const guides = processDir("guides", "guides", transformGuide, "Guides");
  const comparisons = processDir("comparisons", "comparisons", transformComparison, "Comparisons");
  const authors = processDir("authors", "authors", transformAuthor, "Authors");

  // Copy images
  log("Copying images...");
  const imgCount = copyImages(PUBLIC_IN, PUBLIC_OUT);
  log(`  Images: ${imgCount} copied`);

  // Summary
  log("─────────────────────────────────");
  log("Transform complete!");
  log(`  Casino reviews: ${casinos}`);
  log(`  Bonus articles: ${bonuses}`);
  log(`  News: ${news}`);
  log(`  Guides: ${guides}`);
  log(`  Comparisons: ${comparisons}`);
  log(`  Authors: ${authors}`);
  log(`  Images: ${imgCount}`);
  log(`  Total content: ${casinos + bonuses + news + guides + comparisons + authors}`);
  log("");
  log("Next: run 'npm run build' to generate static pages.");
}

main().catch((err) => {
  console.error("[Transform] Fatal error:", err);
  process.exit(1);
});
