const SITE_URL = import.meta.env.SITE || "https://cashspins.online";
const ORG_ID = `${SITE_URL}/#organization`;

/**
 * Build a canonical URL with a trailing slash.
 * Handles leading slashes and empty strings gracefully.
 */
export function buildCanonical(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${SITE_URL}/${clean}/`;
}

/**
 * Build-time ISO date (YYYY-MM-DD) — used as a stand-in for dateModified
 * when a per-article updated_at isn't available in frontmatter.
 */
export function buildDate(): string {
  return new Date().toISOString().split("T")[0];
}

/** Absolute URL for a site-relative or already-absolute resource. */
function absUrl(maybePath?: string | null): string | undefined {
  if (!maybePath) return undefined;
  return /^https?:\/\//i.test(maybePath) ? maybePath : `${SITE_URL}${maybePath.startsWith("/") ? "" : "/"}${maybePath}`;
}

/** Anchor to the site-wide Organization node referenced from other schemas. */
function publisherRef() {
  return { "@id": ORG_ID };
}

/**
 * Generate JSON-LD for a Review (casino review page).
 * Emits mainEntityOfPage + dateModified when the consumer supplies them.
 */
export function generateReviewSchema(casino: {
  title: string;
  description: string;
  rating?: number | null;
  image?: string;
  author_name?: string;
  author_slug?: string;
  published_at?: string;
  date_modified?: string;
  slug?: string;
}): string {
  const pageUrl = casino.slug ? buildCanonical(`casinos/${casino.slug}`) : undefined;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Review",
    headline: casino.title,
    description: casino.description,
    ...(casino.image && { image: absUrl(casino.image) }),
    ...(casino.published_at && { datePublished: casino.published_at }),
    dateModified: casino.date_modified ?? casino.published_at ?? buildDate(),
    ...(casino.author_name && {
      author: {
        "@type": "Person",
        name: casino.author_name,
        ...(casino.author_slug && { url: buildCanonical(`team/${casino.author_slug}`) }),
      },
    }),
    ...(casino.slug && {
      itemReviewed: {
        "@type": "Organization",
        name: casino.title,
        url: buildCanonical(`casinos/${casino.slug}`),
      },
    }),
    ...(casino.rating !== undefined && casino.rating !== null && {
      reviewRating: {
        "@type": "Rating",
        ratingValue: casino.rating,
        bestRating: 10,
        worstRating: 0,
      },
    }),
    publisher: publisherRef(),
    reviewedBy: publisherRef(),
    ...(pageUrl && { mainEntityOfPage: pageUrl }),
  };

  return JSON.stringify(schema);
}

/**
 * Generate JSON-LD for an Article, NewsArticle, or HowTo-like page.
 * Defaults to "Article". Pass type="NewsArticle" for news entries.
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  author_name?: string;
  author_slug?: string;
  published_at?: string;
  date_modified?: string;
  type?: "Article" | "NewsArticle" | "TechArticle";
  section_path?: string; // e.g. "guides/slug" or "news/slug"
}): string {
  const pageUrl = article.section_path ? buildCanonical(article.section_path) : undefined;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": article.type ?? "Article",
    headline: article.title,
    description: article.description,
    ...(article.image && { image: absUrl(article.image) }),
    ...(article.published_at && { datePublished: article.published_at }),
    dateModified: article.date_modified ?? article.published_at ?? buildDate(),
    ...(article.author_name && {
      author: {
        "@type": "Person",
        name: article.author_name,
        ...(article.author_slug && { url: buildCanonical(`team/${article.author_slug}`) }),
      },
    }),
    publisher: publisherRef(),
    ...(pageUrl && { mainEntityOfPage: pageUrl }),
  };

  return JSON.stringify(schema);
}

/**
 * Generate JSON-LD for a FAQPage.
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return JSON.stringify(schema);
}

/**
 * Generate JSON-LD for a Person (author / editor).
 * worksFor is defaulted to the site-wide Organization so E-E-A-T graph is closed.
 */
export function generatePersonSchema(author: {
  name: string;
  slug: string;
  role?: string | null;
  bio?: string | null;
  avatar?: string | null;
  expertise?: string[] | null;
  credentials?: string[] | null;
  sameAs?: string[] | null;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${buildCanonical(`team/${author.slug}`)}#person`,
    name: author.name,
    jobTitle: author.role ?? "Casino Analyst",
    ...(author.bio && { description: author.bio }),
    ...(author.expertise?.length && { knowsAbout: author.expertise }),
    ...(author.credentials?.length && {
      hasCredential: author.credentials.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Certification",
        name: c,
      })),
    }),
    sameAs: author.sameAs ?? [],
    url: buildCanonical(`team/${author.slug}`),
    ...(author.avatar && { image: absUrl(author.avatar) }),
    worksFor: publisherRef(),
  };
  return JSON.stringify(schema);
}

/**
 * Generate JSON-LD for a HowTo page — used for /how-we-review/ which documents
 * the 8-step review methodology.
 */
export function generateHowToSchema(howto: {
  name: string;
  description: string;
  path: string;
  steps: Array<{ name: string; text: string; image?: string }>;
  date_modified?: string;
}): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howto.name,
    description: howto.description,
    mainEntityOfPage: buildCanonical(howto.path),
    dateModified: howto.date_modified ?? buildDate(),
    publisher: publisherRef(),
    step: howto.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.image && { image: absUrl(s.image) }),
    })),
  };
  return JSON.stringify(schema);
}

/**
 * Generate JSON-LD for a simple WebPage (used for privacy, terms, etc.).
 */
export function generateWebPageSchema(page: {
  name: string;
  path: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  lastReviewed?: string;
}): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": page.type ?? "WebPage",
    name: page.name,
    url: buildCanonical(page.path),
    description: page.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: publisherRef(),
    ...(page.lastReviewed && { lastReviewed: page.lastReviewed }),
    dateModified: page.lastReviewed ?? buildDate(),
  };
  return JSON.stringify(schema);
}
