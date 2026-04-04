# CashSpins.Online Full Rebuild — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Rebuild cashspins.online as a premium dark-theme casino affiliate site using TailwindCSS and the Royal Verity design system from stitch/, with full SEO architecture, content collections, and scalable programmatic pages.

**Architecture:** Astro 6 static site with TailwindCSS v4, Zod-validated content collections (casinos, bonuses, news, guides, comparisons, authors), reusable components following the "Elite Curator" design language. All pages SSG. Content is externally generated markdown — templates must gracefully handle missing optional fields.

**Tech Stack:** Astro 6.1.3, TailwindCSS v4, @astrojs/sitemap, @astrojs/mdx

---

## File Map

### Config & Setup
- Modify: `astro.config.mjs` — add Tailwind + MDX, fix site URL
- Modify: `package.json` — add tailwind, mdx deps
- Create: `src/styles/global.css` — Tailwind directives + design tokens
- Create: `public/robots.txt`

### Content Schema
- Create: `src/content.config.ts` — Zod schemas for all 6 collections (Astro 6 uses root-level content config)

### Layout & Shared Components
- Create: `src/layouts/BaseLayout.astro` — master layout with meta, OG, JSON-LD, fonts
- Create: `src/components/Navbar.astro` — glassmorphism sticky nav
- Create: `src/components/Footer.astro` — legal footer
- Create: `src/components/Breadcrumbs.astro`
- Create: `src/components/CasinoCard.astro` — horizontal card for listings
- Create: `src/components/BonusCard.astro`
- Create: `src/components/ArticleCard.astro` — news/guide cards
- Create: `src/components/RatingStars.astro`
- Create: `src/components/RatingBadge.astro`
- Create: `src/components/CTAButton.astro`
- Create: `src/components/ProsCons.astro`
- Create: `src/components/FAQSection.astro`
- Create: `src/components/RelatedContent.astro`
- Create: `src/components/SearchFilter.astro` — client-side island

### SEO Utilities
- Create: `src/lib/seo.ts` — canonical URL builder, JSON-LD generators
- Create: `src/lib/collections.ts` — helper functions for querying/filtering collections

### Pages — Static
- Create: `src/pages/index.astro` — homepage hub
- Create: `src/pages/casinos/index.astro` — casino directory with filters
- Create: `src/pages/casinos/[slug].astro` — casino review
- Create: `src/pages/bonus/index.astro` — bonus listing
- Create: `src/pages/bonus/[slug].astro` — bonus detail
- Create: `src/pages/news/index.astro` — news listing
- Create: `src/pages/news/[slug].astro` — news article
- Create: `src/pages/guides/index.astro` — guides listing
- Create: `src/pages/guides/[slug].astro` — guide detail
- Create: `src/pages/go/[slug].astro` — affiliate redirect
- Create: `src/pages/team/index.astro` — author listing
- Create: `src/pages/team/[slug].astro` — author profile
- Create: `src/pages/terms.astro`
- Create: `src/pages/privacy.astro`
- Create: `src/pages/affiliate-disclosure.astro`

### SEO Landing Pages
- Create: `src/pages/best-online-casinos.astro`
- Create: `src/pages/crypto-casinos.astro`
- Create: `src/pages/no-deposit-bonus.astro`
- Create: `src/pages/new-casinos.astro`
- Create: `src/pages/fast-withdrawal-casinos.astro`
- Create: `src/pages/mobile-casinos.astro`

---

## Task 1: Project Setup & Tailwind Config

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Create: `src/styles/global.css`
- Create: `public/robots.txt`

- [ ] **Step 1: Install dependencies**

```bash
npm install @astrojs/tailwind tailwindcss @astrojs/mdx
```

Note: Astro 6 + TailwindCSS v4 uses `@astrojs/tailwind` integration. If v4 compat issues, fall back to manual CSS import with `@import "tailwindcss"`.

- [ ] **Step 2: Update astro.config.mjs**

```js
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://cashspins.online",
  integrations: [
    tailwind(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/go/"),
    }),
  ],
});
```

- [ ] **Step 3: Create global.css with design tokens**

The Royal Verity design system colors as CSS custom properties + Tailwind v4 directives. Fonts: Manrope (headlines) + Inter (body).

- [ ] **Step 4: Create robots.txt**

```
User-agent: *
Allow: /
Disallow: /go/
Sitemap: https://cashspins.online/sitemap-index.xml
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

---

## Task 2: Content Collection Schemas

**Files:**
- Create: `src/content.config.ts`

Define Zod schemas matching SITE_GUIDANCE.md contract for: casinos, bonuses, news, guides, comparisons, authors. All non-starred fields optional.

- [ ] **Step 1: Write content.config.ts with all 6 collection schemas**
- [ ] **Step 2: Verify build succeeds with existing content files**
- [ ] **Step 3: Commit**

---

## Task 3: SEO Utilities

**Files:**
- Create: `src/lib/seo.ts`
- Create: `src/lib/collections.ts`

- [ ] **Step 1: Create seo.ts**

Functions: `buildCanonical(slug, section)`, `generateReviewSchema(casino)`, `generateArticleSchema(article)`, `generateFAQSchema(faqs)`.

- [ ] **Step 2: Create collections.ts**

Helpers: `getRelatedByTags(currentTags, allItems, limit)`, `getCasinosByCategory(category)`, `getLatest(collection, limit)`.

- [ ] **Step 3: Commit**

---

## Task 4: Base Layout + Navbar + Footer

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Navbar.astro`
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Build BaseLayout.astro**

Props: title, seoTitle, description, image, imageAlt, canonical, robots, schemaJsonLd, noIndex, ogType. Includes font imports, global.css, meta tags, OG tags, JSON-LD injection, Navbar, slot, Footer.

- [ ] **Step 2: Build Navbar.astro**

Glassmorphism sticky header following stitch home_elite_curator design. Logo "CASHSPINS", nav links (Casinos, Bonuses, News, Guides), mobile hamburger menu. Active route indicator.

- [ ] **Step 3: Build Footer.astro**

Trust badges (18+, SSL, BeGambleAware), nav links (GambleAware, Affiliate Disclosure, Privacy, Terms), copyright text, responsible gambling disclaimer. Follows stitch footer design.

- [ ] **Step 4: Verify with dev server**
- [ ] **Step 5: Commit**

---

## Task 5: Reusable Components

**Files:**
- Create: `src/components/Breadcrumbs.astro`
- Create: `src/components/CasinoCard.astro`
- Create: `src/components/BonusCard.astro`
- Create: `src/components/ArticleCard.astro`
- Create: `src/components/RatingStars.astro`
- Create: `src/components/RatingBadge.astro`
- Create: `src/components/CTAButton.astro`
- Create: `src/components/ProsCons.astro`
- Create: `src/components/FAQSection.astro`
- Create: `src/components/RelatedContent.astro`

- [ ] **Step 1: Build all components**

Each follows Royal Verity design: dark surfaces, tonal layering, no 1px borders, green primary CTAs, gold accents. CasinoCard follows stitch home_elite_curator listing card. ArticleCard follows stitch casino_news_guides card.

- [ ] **Step 2: Commit**

---

## Task 6: Homepage

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Build homepage**

Sections: Hero (featured casino from collection, big CTA), Top Casinos list (top 5 by rating), Live Bonus Feed (latest bonuses), Industry News (latest 4 news/guides), SEO content block, internal linking grid. Pulls real data from all collections.

- [ ] **Step 2: Commit**

---

## Task 7: Casino Pages (Directory + Review)

**Files:**
- Create: `src/pages/casinos/index.astro`
- Create: `src/pages/casinos/[slug].astro`

- [ ] **Step 1: Build casino directory**

Header, filter UI (by category/rating), sorted casino card list. Follows stitch best_online_casinos_directory.

- [ ] **Step 2: Build casino review page**

Breadcrumbs, hero (logo + rating + bonus CTA), quick stats grid, two-column layout (article body + sidebar with bonuses/payment/providers), pros/cons, FAQs, author card, related content. Follows stitch casino_review_template.

- [ ] **Step 3: Commit**

---

## Task 8: Bonus Pages

**Files:**
- Create: `src/pages/bonus/index.astro`
- Create: `src/pages/bonus/[slug].astro`

- [ ] **Step 1: Build bonus listing and detail pages**
- [ ] **Step 2: Commit**

---

## Task 9: News + Guides Pages

**Files:**
- Create: `src/pages/news/index.astro`
- Create: `src/pages/news/[slug].astro`
- Create: `src/pages/guides/index.astro`
- Create: `src/pages/guides/[slug].astro`

- [ ] **Step 1: Build news listing and article pages**

Follows stitch casino_news_guides layout. Category tabs, featured article, grid cards.

- [ ] **Step 2: Build guides listing and detail pages**
- [ ] **Step 3: Commit**

---

## Task 10: Utility Pages (Go redirect, Team, Legal)

**Files:**
- Create: `src/pages/go/[slug].astro`
- Create: `src/pages/team/index.astro`
- Create: `src/pages/team/[slug].astro`
- Create: `src/pages/terms.astro`
- Create: `src/pages/privacy.astro`
- Create: `src/pages/affiliate-disclosure.astro`

- [ ] **Step 1: Build go redirect handler** (noindex, nofollow, client-side redirect)
- [ ] **Step 2: Build team pages**
- [ ] **Step 3: Build legal pages** (terms, privacy, affiliate disclosure with placeholder legal text)
- [ ] **Step 4: Commit**

---

## Task 11: SEO Landing Pages

**Files:**
- Create: `src/pages/best-online-casinos.astro`
- Create: `src/pages/crypto-casinos.astro`
- Create: `src/pages/no-deposit-bonus.astro`
- Create: `src/pages/new-casinos.astro`
- Create: `src/pages/fast-withdrawal-casinos.astro`
- Create: `src/pages/mobile-casinos.astro`

- [ ] **Step 1: Build SEO landing page template pattern**

Each page: H1 title, intro SEO text, filtered casino list from collections (by categories field), structured internal links. Follows stitch best_crypto_casinos_pillar_page.

- [ ] **Step 2: Create all 6 landing pages using the pattern**
- [ ] **Step 3: Commit**

---

## Task 12: Final Build Verification

- [ ] **Step 1: Run `npm run build`** — must succeed with zero errors
- [ ] **Step 2: Run `npm run preview`** — spot check all routes
- [ ] **Step 3: Fix any issues**
- [ ] **Step 4: Final commit**
