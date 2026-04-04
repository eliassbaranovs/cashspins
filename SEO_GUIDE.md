# Astro Site Blueprint

The complete guide for building and auditing Astro sites that consume content from the SEO Engine pipeline. Hand this to any AI tool and it knows everything: architecture, data contract, SEO requirements, templates, performance, and audit checklist.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Site Config & Static Files](#2-site-config--static-files)
3. [Frontmatter Schema (Data Contract)](#3-frontmatter-schema-data-contract)
4. [Markdown Body Contract](#4-markdown-body-contract)
5. [Content Collections & Zod Schemas](#5-content-collections--zod-schemas)
6. [Base Layout & `<head>` Tags](#6-base-layout--head-tags)
7. [URL Structure & Routing](#7-url-structure--routing)
8. [Page Templates](#8-page-templates)
9. [Image Handling](#9-image-handling)
10. [Internal Link Rendering](#10-internal-link-rendering)
11. [Visible SEO Elements](#11-visible-seo-elements)
12. [Affiliate & Compliance](#12-affiliate--compliance)
13. [Category System & Pillar Pages](#13-category-system--pillar-pages)
14. [Author System](#14-author-system)
15. [Performance & Core Web Vitals](#15-performance--core-web-vitals)
16. [Build Safety Rules](#16-build-safety-rules)
17. [The Audit Checklist](#17-the-audit-checklist)

---

## 1. Architecture

```
SEO Engine (local Next.js dashboard)
  → PUBLISH commits .md files + images to Astro repo via GitHub Tree API
  → Vercel/Netlify auto-deploys on push
  → Output: static HTML only
```

**Zero runtime dependencies.** The Astro site has no Supabase connection, no API calls, no env vars for data. Everything the site needs is in frontmatter + markdown body + committed images at build time.

The pipeline handles: scraping, AI rewriting, image generation, Schema.org generation, internal link injection, frontmatter assembly, and quality validation. The Astro site's job is to **render that content correctly with proper SEO**.

---

## 2. Site Config & Static Files

### astro.config.mjs

```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://{domain}',       // REQUIRED — used for canonical URLs, OG tags, sitemap
  trailingSlash: 'always',        // Pick one and be consistent EVERYWHERE
  integrations: [sitemap({
    filter: (page) => !page.includes('/go/'),  // Exclude affiliate redirects
  })],
});
```

### public/robots.txt

```
User-agent: *
Allow: /
Disallow: /go/
Sitemap: https://{domain}/sitemap-index.xml
```

- `/go/` must be disallowed — these are noindex affiliate redirects
- Sitemap URL must be absolute and match what `@astrojs/sitemap` generates
- **Verify the domain matches your actual production URL** — not a placeholder like `casinorank.com`

### IndexNow Verification

- Place your IndexNow key file at `public/{key}.txt`
- The engine pings IndexNow after publish — the site just needs the verification file

---

## 3. Frontmatter Schema (Data Contract)

All fields are optional unless marked `*`. **Astro Zod schemas must make all non-starred fields optional** so missing data never fails a build — templates just skip rendering.

### Universal Fields (all content types)

```yaml
title*: "string"
slug*: "string"
description*: "string"             # 150-160 chars, used for meta description
seoTitle*: "string"                # Under 60 chars, used for <title> tag
excerpt: "string"                   # ~200 chars, used for listing cards
publishedAt*: "ISO 8601 datetime"
updatedAt: "ISO 8601 datetime"
publishDate: "YYYY-MM-DD"
author*: "string"                   # Display name
authorSlug*: "string"              # Matches author collection slug
contentType*: "review | bonus | news | comparison | guide"
category: "string"
draft: false
noIndex: false
robots: "index, follow"            # Default value; /go/ pages get "noindex, nofollow"
canonical: "full absolute URL"
image*: "/images/{slug}.webp"      # Local path in /public/images/
imageAlt*: "string"                # Descriptive, SEO-optimized, <125 chars
imageWidth: 1792
imageHeight: 1024
tags: ["string"]                    # For related content + display
schemaJsonLd: "JSON-LD string"     # Inject as-is in <script type="application/ld+json">
```

### Casino Review Fields

```yaml
casino: "slug"                      # Casino identifier
casinoName: "string"                # Display name
ourRating: 8.1                      # 0-10 scale
player_rating: 3.1                  # 0-10 scale
best_for: "string"                  # e.g., "High rollers who prefer Bitcoin"
website: "https://..."              # For /go/ redirect ONLY — never rendered as visible href
established: "2023"
company: "string"                   # Operating company
licences: "string"                  # e.g., "Curacao eGaming"
casino_type: "string"               # e.g., "Crypto Casino"

# Primary welcome bonus (flat fields)
bonus_title: "string"               # e.g., "200% up to 1 BTC"
bonus_percentage: 100
max_bonus: "string"
min_deposit: "string"
wagering: "string"                  # e.g., "35x"
free_spins: 50
bonus_code: "string"                # High SEO value when present
vip_program: true

# All bonuses (array — used for bonus cards)
bonuses:
  - name: "string"
    type: "deposit | no-deposit | free-spins | cashback | reload"
    wagering: "string"
    min_deposit: "string"
    max_cashout: "string"
    free_spins: "string"
    expiry: "string"

pros: ["string"]                    # 5-7 specific items
cons: ["string"]                    # 5-7 specific items

# Payment
acceptedCryptos: ["Bitcoin", "Ethereum"]
depositMethods: "pipe-separated string"     # e.g., "Bitcoin|Ethereum|USDT|Visa"
withdrawalMethods: "pipe-separated string"
currencies: "pipe-separated string"
cryptoWithdrawalSpeedMinutes: 60

# Games
gameProviders: "pipe-separated string"      # e.g., "Pragmatic Play|Evolution|NetEnt"
game_count: 5000

# Trust
kycRequired: true
isNewCasino: false
lastVerified: "YYYY-MM-DD"

# SEO Categories (auto-derived from entity properties, used for filtering/listing)
categories:
  - "crypto-casino"
  - "bitcoin-casino"
  - "no-kyc-casino"
  - "fast-withdrawal-casino"

# Media
logo: "/images/logos/{slug}-logo.{ext}"     # Actual extension matches source (jpg, svg, png, webp)
screenshots:
  - url: "/images/casinos/{slug}/screenshot_1.webp"
    alt: "string"
sectionImages:
  - section: "string"                       # Heading text this image relates to
    path: "/images/{slug}-section.png"

# FAQs
faqs:
  - question: "string"
    answer: "string"

# Affiliate
claim_url: "https://..."                    # Target URL for /go/{slug}/ redirect
```

### Bonus Page Fields

Same as casino review. Bonus pages are a filtered view of the same casino entity — they share the same frontmatter structure. The `contentType` is `"bonus"` and the body focuses on bonus analysis.

### News Fields

```yaml
contentType: "news"
source_url: "string"                # Original source article URL
source_name: "string"              # e.g., "CoinDesk"
```

Plus all universal fields.

### Comparison Fields

```yaml
contentType: "comparison"
casino_a: "slug"
casino_b: "slug"
casino_a_name: "string"
casino_b_name: "string"
casino_a_rating: 8.1
casino_b_rating: 7.5
winner: "slug or tie"
```

Plus all universal fields.

### Guide Fields

```yaml
contentType: "guide"
# Universal fields only. Body is long-form markdown.
```

---

## 4. Markdown Body Contract

**Standard markdown only.** No custom HTML tags, no MDX components, no embedded React.

### What the body contains

- Headings (`#`, `##`, `###`)
- Paragraphs, bold, italic
- Markdown tables
- Ordered and unordered lists
- Blockquotes (used for disclaimers)
- Links (internal, external, affiliate CTAs)
- Inline images (section screenshots with alt text)

### What the body does NOT contain

- YAML frontmatter (that's separate)
- Custom HTML tags like `<bonus-card>` (would render as raw text)
- Component syntax
- Embedded scripts

### Link Formats in Body

```markdown
**[Best Crypto Casinos](/best-crypto-casinos/)**     <!-- Bold = internal link (SEO) -->
[GambleAware](https://www.begambleaware.org)          <!-- Regular = external link -->
[**Claim Bonus ->**](/go/stake-casino/)                <!-- Bold CTA = affiliate -->
```

### CTA Format

All call-to-action links use: `[**Text ->**](/go/{slug}/)`

### Body vs Frontmatter Separation

All structured data lives in **frontmatter**, not the body:
- Bonuses, ratings, pros/cons, FAQs, screenshots, categories, payment methods, game providers

The body is **prose content only**. The Astro template renders structured data from frontmatter using components (bonus cards, rating badges, pros/cons lists, FAQ accordions, screenshot galleries).

### Casino Review Body

LLM-generated article covering: bonuses, games, payments, licensing, pros/cons, and verdict. Pure prose — no bonus cards or structured data. The template renders those from frontmatter.

### Bonus Page Body

LLM-generated analysis of: overview, welcome bonus breakdown, free spins, ongoing promotions, wagering terms comparison, how to claim, and verdict. Pure prose + markdown tables. The frontmatter `bonuses[]` array provides the same data in structured form for component rendering.

---

## 5. Content Collections & Zod Schemas

### Directory Structure

```
src/content/
  casinos/        # contentType: review       (committed by pipeline)
  bonuses/        # contentType: bonus         (committed by pipeline)
  news/           # contentType: news          (committed by pipeline)
  comparisons/    # contentType: comparison    (committed by pipeline)
  guides/         # contentType: guide         (committed by pipeline)
  authors/        # Manually created, NOT from pipeline
```

### File Paths (committed by publish step)

```
# Content
src/content/casinos/{slug}.md
src/content/bonuses/{slug}-bonus-review.md
src/content/news/{slug}.md
src/content/comparisons/{slug}.md
src/content/guides/{slug}.md

# Images
public/images/{slug}.webp                    # Cover images
public/images/logos/{slug}-logo.{ext}        # Casino logos (jpg, svg, png, webp)
public/images/casinos/{slug}/                # Screenshots
public/images/authors/{slug}.png             # Author avatars (manual)
```

### Zod Schema Rules

**Every field optional except starred.** Missing data = template skips it, never crashes.

Required fields: `title`, `slug`, `description`, `seoTitle`, `publishedAt`, `author`, `authorSlug`, `contentType`, `image`, `imageAlt`

Example pattern for arrays:

```ts
bonuses: z.array(z.object({
  name: z.string(),
  type: z.string().optional(),
  wagering: z.string().optional(),
  min_deposit: z.string().optional(),
  max_cashout: z.string().optional(),
  free_spins: z.string().optional(),
  expiry: z.string().optional(),
})).optional(),

screenshots: z.array(z.object({
  url: z.string(),
  alt: z.string().optional(),
})).optional(),

faqs: z.array(z.object({
  question: z.string(),
  answer: z.string(),
})).optional(),

categories: z.array(z.string()).optional(),
pros: z.array(z.string()).optional(),
cons: z.array(z.string()).optional(),
tags: z.array(z.string()).optional(),
```

---

## 6. Base Layout & `<head>` Tags

Your BaseLayout.astro renders all SEO tags from frontmatter props. If a field is missing, skip the tag — never render empty values.

### Required `<head>` Elements

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Primary SEO -->
<title>{seoTitle}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="{robots}">          <!-- default: "index, follow" -->

<!-- Open Graph -->
<meta property="og:title" content="{seoTitle}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="https://{domain}{image}">    <!-- ABSOLUTE URL -->
<meta property="og:url" content="{canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{siteName}">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{seoTitle}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="https://{domain}{image}">   <!-- ABSOLUTE URL -->

<!-- Schema.org JSON-LD (conditional) -->
{schemaJsonLd && <script type="application/ld+json" set:html={schemaJsonLd} />}

<!-- Preload cover image on article pages -->
{image && <link rel="preload" as="image" href={image}>}
```

### Rules

- `og:image` and `twitter:image` MUST be **absolute URLs** (not relative paths)
- `schemaJsonLd` is pre-generated JSON — inject as-is, **never parse or modify**
- `robots` defaults to `index, follow`; `/go/` pages and `draft: true` get `noindex, nofollow`
- If `canonical` is missing, construct: `https://{domain}/{route}/{slug}/`
- Trailing slash must match `trailingSlash` in astro.config.mjs
- Missing OG tags = **no preview when shared on social media or Google Discover**

---

## 7. URL Structure & Routing

### Routes

```
/casinos/[slug]/         # Casino reviews
/bonus/[slug]/           # Bonus reviews
/news/[slug]/            # News articles
/compare/[slug]/         # Comparisons
/guides/[slug]/          # Guides
/go/[slug]/              # Affiliate redirects (noindex, nofollow)
/team/[slug]/            # Author pages
/{category-slug}/        # Category/listing pages (pillar pages, root level)
```

### Rules

- No dates in URLs — content gets updated, dates make URLs look stale
- Category/pillar pages at root level for maximum authority (`/best-crypto-casinos/`)
- **Trailing slash consistency** — match `trailingSlash` config in every link, canonical, and sitemap entry
- Clean slugs: lowercase, hyphens only, no special chars

### /go/ Redirect Pages

- Read `claim_url` (or `website` as fallback) from frontmatter
- Perform client-side redirect (or server redirect if SSR)
- Must render `<meta name="robots" content="noindex, nofollow">`
- Never expose the direct casino URL in rendered HTML elsewhere
- CTAs in articles link here: `[**Claim Bonus ->**](/go/{slug}/)`

---

## 8. Page Templates

### Every Content Page Must Render

- [ ] `<title>` from `seoTitle`
- [ ] `<meta name="description">` from `description`
- [ ] Canonical URL
- [ ] Robots meta tag
- [ ] Full OG + Twitter Card tags (5 + 4)
- [ ] JSON-LD schema from `schemaJsonLd`
- [ ] Visible author byline linking to `/team/{authorSlug}/`
- [ ] Published date + updated date (if present)
- [ ] Cover image with `alt`, `width`, `height`
- [ ] Breadcrumb navigation: Home > Category > Page
- [ ] Article body from markdown (rendered as standard HTML)

### Casino Review Page

Render from frontmatter (in addition to universal elements):

| Component | Source Field(s) |
|-----------|----------------|
| Casino logo | `logo` |
| Rating badge | `ourRating` (0-10 scale) |
| Best-for line | `best_for` |
| Pros list | `pros[]` |
| Cons list | `cons[]` |
| Bonus card(s) | `bonuses[]` — render as cards with name, type, wagering, min_deposit, etc. |
| Primary bonus highlight | `bonus_title`, `bonus_percentage`, `max_bonus`, `wagering`, `free_spins`, `bonus_code` |
| Payment methods | `acceptedCryptos[]`, `depositMethods`, `withdrawalMethods` (pipe-separated — split on `|`) |
| Game info | `gameProviders` (pipe-separated), `game_count` |
| Trust signals | `licences`, `established`, `kycRequired`, `lastVerified` |
| Screenshots gallery | `screenshots[]` — with alt text |
| CTA button | Links to `/go/{casino}/` |
| FAQ section | `faqs[]` — must match FAQPage schema |
| Category tags | `categories[]` — each links to category page |

### Bonus Page

- Same casino data fields as review
- `contentType: "bonus"` — body focuses on bonus analysis
- Casino logo + link to full review (`/casinos/{casino}/`)
- Bonus cards from `bonuses[]` array prominently displayed
- CTA to `/go/{casino}/`
- FAQ section

### News Page

- `source_name` displayed as attribution
- Simpler layout — no casino-specific fields
- Body is the full article
- FAQ if present

### Comparison Page

- Side-by-side display: `casino_a_name` vs `casino_b_name`
- Ratings: `casino_a_rating` vs `casino_b_rating`
- `winner` field displayed as verdict
- Links to both casino review pages
- Body contains the prose comparison

### Guide Page

- Long-form content, universal fields only
- Body is the full article
- FAQ if present

### Author Page (`/team/[slug]/`)

- Avatar image
- Name, role, bio
- Credentials and expertise areas
- Social links (Twitter, LinkedIn)
- List of all articles by this author (query all content collections)
- Person schema in `<head>` (built by template from author data)

### Category/Listing Pages (`/{category-slug}/`)

- Root-level URL for maximum authority
- Intro content (editorially written, 500+ words)
- Grid/list of matching casinos filtered by `categories[]` field
- Each card: cover image, title, rating, excerpt, link
- Schema.org `ItemList`
- These are pillar pages — give them design love

---

## 9. Image Handling

### Rules for Templates

- All image `src` use **local paths** (`/images/...`) — never external URLs
- Every `<img>` MUST have:
  - `alt` attribute (from frontmatter)
  - `width` and `height` attributes (prevents CLS)
  - `loading="lazy"` for below-fold images
- Cover/hero image: eagerly loaded (no lazy), preloaded in `<head>`

### Image Paths Convention

```
/images/{slug}.webp                          # Cover images (WebP, 1792x1024)
/images/logos/{slug}-logo.{ext}              # Casino logos (actual ext: jpg, svg, png, webp)
/images/casinos/{slug}/screenshot_N.webp     # Screenshots
/images/authors/{slug}.png                   # Author avatars (manual)
```

### Format

- Content images: **WebP** (pre-optimized by pipeline via Sharp compression)
- Author avatars: PNG (manually managed)
- Never convert or re-process at build time — images are pre-optimized

---

## 10. Internal Link Rendering

Links come pre-embedded in the markdown body. The template renders them correctly.

### What the Pipeline Embeds

```markdown
**[Best Crypto Casinos](/best-crypto-casinos/)**      <!-- Bold = internal link -->
[GambleAware](https://www.begambleaware.org)           <!-- Regular = external authority link -->
[**Claim Bonus ->**](/go/stake-casino/)                 <!-- Bold CTA = affiliate link -->
```

### Template Responsibilities

- Bold markdown links → `<strong><a>` (standard rendering does this)
- External links: add `target="_blank" rel="noopener noreferrer"`
- `/go/` links: must work and redirect correctly
- **Never** add `nofollow` to internal links
- Optional: verify no broken links at build time

---

## 11. Visible SEO Elements

Things the user sees that also serve as SEO signals. The template must render all of these.

### Breadcrumbs

- Visible breadcrumb nav on every content page
- Format: `Home > Category > Page Title`
- Each level is a clickable link
- Must match the `BreadcrumbList` in the JSON-LD schema

### Author Byline

- Visible on every article: author name, avatar thumbnail, link to `/team/{authorSlug}/`
- Signals editorial credibility to both users and Google

### Dates

- Show `publishedAt` date visibly
- Show `updatedAt` if different from published (freshness signal for Google)
- Format: human-readable (e.g., "April 4, 2026")

### Rating Display

- Show `ourRating` prominently on casino reviews
- Visual format (stars, score bar, number badge — your choice)
- **Must match the ratingValue in the Review schema**

### FAQ Section

- Render `faqs[]` array as visible Q&A section
- **Must match FAQPage schema exactly** (same questions, same answers)
- Use `<h3>` for questions, paragraph for answers

### Pros & Cons

- Render `pros[]` and `cons[]` as visually distinct styled lists
- Not just plain bullets — use icons, colors, or cards
- These are key conversion elements

---

## 12. Affiliate & Compliance

### Disclaimer Block

The markdown body includes a blockquote disclaimer near the top:

> **Disclaimer:** This article contains affiliate links. We may earn a commission at no extra cost to you. Our reviews are based on independent research and real data — affiliate partnerships never influence our ratings or recommendations.

Render it visually distinct (styled blockquote, notice box). It should look like a notice, not regular paragraph content.

### Responsible Gambling Section

The markdown body includes compliance links (GambleAware, Gambling Therapy, etc.). Render as a clearly labeled section. This is legally required for gambling affiliate sites.

### /go/ Redirect Page

- Single-purpose: reads `claim_url` from frontmatter, redirects user
- Must be `noindex, nofollow`
- No content, no SEO value — purely functional
- Minimal HTML — fast load, no heavy assets
- **Never expose `claim_url` or `website` as visible links anywhere else on the site**

---

## 13. Category System & Pillar Pages

### Available Categories

```
bitcoin-casino, ethereum-casino, solana-casino, litecoin-casino,
usdt-casino, dogecoin-casino, visa-casino, mastercard-casino,
bank-transfer-casino, apple-pay-casino, skrill-casino,
no-kyc-casino, fast-withdrawal-casino, instant-withdrawal-casino,
no-deposit-bonus, free-spins-casino, vip-program-casino, live-casino,
crypto-casino, online-casino, sweepstakes-casino, sportsbook,
casino-and-sportsbook, licensed-casino, new-casino
```

### How It Works

1. Each casino's frontmatter has a `categories[]` array (auto-derived from entity properties by the pipeline)
2. Category/pillar pages at root level (`/{category-slug}/`) filter and list matching casinos
3. Casino pages link UP to their category pages (internal links in body)
4. Category pages link DOWN to all matching casino pages

### Category Page Template

- URL: `/{category-slug}/`
- Intro section with explanatory content (editorially written, 500+ words)
- Grid/list of matching casinos with: cover image, name, rating, excerpt, link
- Schema.org `ItemList`
- Higher sitemap priority than individual reviews
- These target the **hardest keywords** — they deserve premium design

---

## 14. Author System

### Author Collection

Authors are **manually created** in `src/content/authors/`, not generated by the pipeline. The pipeline references them via `author` and `authorSlug` in content frontmatter.

### Author Frontmatter

```yaml
name*: "string"
slug*: "string"
bio*: "string"                      # 2-3 sentences
avatar*: "/images/authors/{slug}.png"
role: "string"                       # e.g., "Senior Casino Analyst"
expertise: ["string"]               # e.g., ["crypto regulation", "casino reviews"]
credentials: ["string"]             # e.g., ["Certified iGaming Compliance Specialist"]
socialLinks:
  twitter: "string"
  linkedin: "string"
```

### Author Page Requirements

- Dedicated page at `/team/{slug}/`
- Renders: avatar, name, role, bio, credentials, expertise, social links
- Lists all articles by this author (query across all content collections by `authorSlug`)
- **Person schema** in `<head>`:

```json
{
  "@type": "Person",
  "name": "Author Name",
  "jobTitle": "Senior Casino Analyst",
  "description": "Bio text...",
  "knowsAbout": ["Cryptocurrency Gambling", "Casino Reviews"],
  "hasCredential": [{
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": "Certification",
    "name": "Certified iGaming Compliance Specialist"
  }],
  "sameAs": ["https://twitter.com/handle", "https://linkedin.com/in/handle"],
  "url": "https://{domain}/team/{slug}/"
}
```

### Why This Matters (E-E-A-T)

- Casino/gambling = YMYL content → Google applies stricter quality standards
- Named authors with credentials signal real expertise
- Author pages with article lists prove ongoing publishing authority
- Person schema feeds into Google's Knowledge Graph
- Multiple distinct authors = real editorial team signal

---

## 15. Performance & Core Web Vitals

Astro's static output gives you a massive head start. Don't throw it away.

### LCP (< 2.5s)

- Preload cover image on article pages (`<link rel="preload" as="image">`)
- WebP format keeps file sizes small
- Explicit width/height lets browser reserve space immediately

### CLS (< 0.1)

- Every image has `width` + `height` attributes
- Fonts: use `font-display: swap` or preload critical fonts
- No layout-shifting banners or injected content above the fold

### INP (< 200ms)

- Static HTML = minimal JS = fast by default
- Use Astro's island architecture — only hydrate interactive components
- Keep `/go/` redirect pages lightweight

### Checklist

- [ ] Fonts loaded with `display=swap` (Google Fonts: `&display=swap`)
- [ ] No render-blocking scripts in `<head>` for content pages
- [ ] Cover image preloaded on article pages
- [ ] Below-fold images lazy loaded
- [ ] Deploy on CDN (Vercel/Netlify edge)
- [ ] Test with PageSpeed Insights — **target 90+ on mobile**

---

## 16. Build Safety Rules

These prevent your Astro build from breaking when the pipeline publishes content.

1. **All frontmatter fields optional (except starred)** — template skips missing data, never crashes
2. **No external URLs in content** — all images are local `/images/...` paths committed alongside content
3. **`website` and `claim_url` are data only** — used by `/go/` redirect, never rendered as visible `<a>` links
4. **`schemaJsonLd` is a JSON string** — inject as-is with `set:html`, don't JSON.parse()
5. **Images committed alongside content** — no fetching at build time, no external hotlinks
6. **Markdown body is standard markdown** — no custom HTML tags (would render as raw text), no MDX components in pipeline content
7. **Pipe-separated strings** — `depositMethods`, `withdrawalMethods`, `gameProviders`, `currencies` use `|` separator. Split with `.split('|')` before rendering

---

## 17. The Audit Checklist

Run this against every Astro site before calling it done.

### Site Config

- [ ] `astro.config.mjs` has correct `site` URL (actual production domain)
- [ ] `trailingSlash` set and consistent everywhere (links, canonicals, sitemap)
- [ ] `@astrojs/sitemap` installed, configured, excludes `/go/`
- [ ] `public/robots.txt` exists — correct domain, disallows `/go/`, references sitemap
- [ ] IndexNow verification file in `public/`
- [ ] HTTPS enforced (hosting provider level)
- [ ] All content collections defined with proper Zod schemas
- [ ] Build succeeds with zero errors on all existing content

### BaseLayout `<head>`

- [ ] `<meta charset="UTF-8">` + `<meta name="viewport">`
- [ ] `<title>` from `seoTitle`
- [ ] `<meta name="description">` from `description`
- [ ] `<link rel="canonical">` — absolute URL, correct trailing slash
- [ ] `<meta name="robots">` from `robots` field (defaults to `index, follow`)
- [ ] OG tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Twitter tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] OG image + Twitter image use **absolute URLs**
- [ ] JSON-LD schema injected from `schemaJsonLd` (conditional — only if present)
- [ ] Cover image preloaded

### Content Pages (All Types)

- [ ] Single `<h1>` rendered from title
- [ ] Author byline visible with link to `/team/{authorSlug}/`
- [ ] Published date displayed
- [ ] Updated date displayed (if different from published)
- [ ] Cover image with `alt`, `width`, `height`
- [ ] Breadcrumb navigation: Home > Category > Title
- [ ] Markdown body renders clean HTML (headings, links, images, tables, blockquotes)
- [ ] Internal links render as standard `<a>` tags (no nofollow)
- [ ] External links have `target="_blank" rel="noopener noreferrer"`

### Casino Review Pages

- [ ] Logo rendered from local path
- [ ] Rating displayed (matches schema `ratingValue`)
- [ ] Pros/cons rendered as styled lists
- [ ] Bonus card(s) rendered from `bonuses[]` array
- [ ] Primary bonus highlighted (bonus_title, wagering, etc.)
- [ ] Payment methods displayed (pipe-separated fields split correctly)
- [ ] Game providers + count displayed
- [ ] Trust signals: license, established, KYC, last verified
- [ ] Screenshots gallery from `screenshots[]`
- [ ] CTA button to `/go/{casino}/`
- [ ] FAQ section from `faqs[]` (matches FAQPage schema)
- [ ] Categories displayed and linked to category pages

### Bonus Pages

- [ ] Casino logo + link to full review (`/casinos/{casino}/`)
- [ ] Bonus cards rendered from `bonuses[]`
- [ ] CTA to `/go/{casino}/`
- [ ] FAQ section

### News Pages

- [ ] Source attribution (`source_name`)
- [ ] Clean article layout

### Comparison Pages

- [ ] Side-by-side layout: `casino_a_name` vs `casino_b_name`
- [ ] Both ratings displayed
- [ ] Winner/verdict displayed
- [ ] Links to both casino reviews

### Author Pages

- [ ] Avatar image
- [ ] Name, role, bio, credentials, expertise
- [ ] Social links
- [ ] All articles by this author listed
- [ ] Person schema in `<head>`

### Category/Listing Pages

- [ ] Root-level URL (`/{category-slug}/`)
- [ ] Intro content section (500+ words)
- [ ] Grid/list of matching content items
- [ ] Each item: cover image, title, rating, excerpt, link
- [ ] `ItemList` schema
- [ ] Links to all matching child pages

### /go/ Redirect Pages

- [ ] Reads `claim_url` from frontmatter (falls back to `website`)
- [ ] Performs redirect
- [ ] `noindex, nofollow` in robots meta
- [ ] **Not** in sitemap
- [ ] Minimal HTML, fast load

### Images

- [ ] All `<img>` tags have `alt`, `width`, `height`
- [ ] Below-fold images: `loading="lazy"`
- [ ] Cover image: eagerly loaded (no lazy)
- [ ] No external image URLs rendered anywhere
- [ ] WebP format for all content images

### Performance

- [ ] Fonts: `display=swap` or preloaded
- [ ] No render-blocking scripts on content pages
- [ ] Static HTML output (no CSR for content)
- [ ] PageSpeed Insights: 90+ mobile
- [ ] CLS < 0.1

### Links

- [ ] Internal links render correctly (bold format preserved)
- [ ] No broken internal links
- [ ] `/go/` links redirect properly
- [ ] No direct casino URLs exposed in HTML (only via `/go/`)

---

*Last updated: 2026-04-04*
*Source: SEO Engine v1 + v2 + v3 — architecture, data contracts, and SEO learnings merged into one document*
