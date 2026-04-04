const SITE_URL = "https://cashspins.online";

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
  ourRating?: number;
  image?: string;
  author?: string;
  publishedAt?: string;
  slug?: string;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Review",
    headline: casino.title,
    description: casino.description,
    ...(casino.image && { image: casino.image }),
    ...(casino.publishedAt && { datePublished: casino.publishedAt }),
    ...(casino.author && {
      author: { "@type": "Person", name: casino.author },
    }),
    ...(casino.slug && {
      itemReviewed: {
        "@type": "Organization",
        name: casino.title,
        url: buildCanonical(`casino/${casino.slug}`),
      },
    }),
    ...(casino.ourRating !== undefined && {
      reviewRating: {
        "@type": "Rating",
        ratingValue: casino.ourRating,
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
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    ...(article.image && { image: article.image }),
    ...(article.publishedAt && { datePublished: article.publishedAt }),
    ...(article.updatedAt && { dateModified: article.updatedAt }),
    ...(article.author && {
      author: { "@type": "Person", name: article.author },
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
