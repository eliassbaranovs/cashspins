/**
 * Return items that share the most tags with the current item, excluding
 * the current item itself. Results are sorted by descending overlap count.
 */
export function getRelatedByTags<
  T extends { data: { tags?: string[]; slug: string } },
>(
  currentTags: string[],
  allItems: T[],
  currentSlug: string,
  limit: number = 4,
): T[] {
  if (!currentTags.length) return [];

  const tagSet = new Set(currentTags.map((t) => t.toLowerCase()));

  const scored = allItems
    .filter((item) => item.data.slug !== currentSlug)
    .map((item) => {
      const itemTags = item.data.tags ?? [];
      const overlap = itemTags.filter((t) => tagSet.has(t.toLowerCase())).length;
      return { item, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  return scored.slice(0, limit).map(({ item }) => item);
}

/**
 * Return items whose `categories` array includes the given category
 * (case-insensitive match).
 */
export function filterByCategory<
  T extends { data: { categories?: string[] } },
>(items: T[], category: string): T[] {
  const lower = category.toLowerCase();
  return items.filter((item) =>
    (item.data.categories ?? []).some((c) => c.toLowerCase() === lower),
  );
}
