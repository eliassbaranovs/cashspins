const SITE_URL = import.meta.env.SITE || "https://cashspins.online";

/**
 * Build a canonical URL with a trailing slash.
 * Handles leading slashes and empty strings gracefully.
 */
export function buildCanonical(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${SITE_URL}/${clean}/`;
}

/**
 * Generate JSON-LD for a Review (casino review page).
 */
export function generateReviewSchema(casino: {
  title: string;
  description: string;
  rating?: number | null;
  image?: string;
  author_name?: string;
  published_at?: string;
  slug?: string;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Review",
    headline: casino.title,
    description: casino.description,
    ...(casino.image && { image: casino.image }),
    ...(casino.published_at && { datePublished: casino.published_at }),
    ...(casino.author_name && {
      author: { "@type": "Person", name: casino.author_name },
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
    publisher: {
      "@type": "Organization",
      name: "CashSpins",
      url: SITE_URL,
    },
  };

  return JSON.stringify(schema);
}

/**
 * Generate JSON-LD for an Article (guides, news, etc.).
 */
export function generateArticleSchema(article: {
  title: string;
  description: string;
  image?: string;
  author_name?: string;
  published_at?: string;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    ...(article.image && { image: article.image }),
    ...(article.published_at && { datePublished: article.published_at }),
    ...(article.author_name && {
      author: { "@type": "Person", name: article.author_name },
    }),
    publisher: {
      "@type": "Organization",
      name: "CashSpins",
      url: SITE_URL,
    },
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
