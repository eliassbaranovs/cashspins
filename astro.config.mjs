// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

/**
 * Rehype plugin — converts <bonus-card> blocks written in markdown
 * into proper HTML elements at build time.
 * Format inside the tag: one "key: value" pair per line.
 */
function rehypeBonusCard() {
  return function (tree) {
    transformNode(tree);
  };
}

function transformNode(node) {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === "element" && child.tagName === "bonus-card") {
      return buildBonusCardNode(child);
    }
    transformNode(child);
    return child;
  });
}

function buildBonusCardNode(node) {
  const text = node.children
    .filter((c) => c.type === "text")
    .map((c) => c.value)
    .join("");

  const d = {};
  text.split("\n").forEach((line) => {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (m) d[m[1].trim()] = m[2].trim();
  });

  // Escape HTML entities to prevent XSS
  const e = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Only allow relative paths or https for link/logo
  const safeHref = (s) => {
    if (!s) return "#";
    if (/^(https?:\/\/|\/)/.test(s)) return e(s);
    return "#";
  };

  const parts = [];
  parts.push(`<div class="bonus-card">`);

  parts.push(`<div class="bonus-card__brand">`);
  if (d.logo) {
    parts.push(
      `<img src="${safeHref(d.logo)}" alt="${e(d.casino)} logo" class="bonus-card__logo" width="56" height="56" loading="lazy" />`
    );
  }
  if (d.casino) {
    parts.push(`<span class="bonus-card__casino">${e(d.casino)}</span>`);
  }
  parts.push(`</div>`);

  parts.push(`<div class="bonus-card__offer">`);
  if (d.bonus) {
    parts.push(`<strong class="bonus-card__title">${e(d.bonus)}</strong>`);
  }
  if (d.type) {
    parts.push(`<span class="bonus-card__type">${e(d.type)}</span>`);
  }
  const stats = [];
  if (d.wagering) stats.push(`<span><b>Wagering:</b> ${e(d.wagering)}</span>`);
  if (d.free_spins) stats.push(`<span><b>Free Spins:</b> ${e(d.free_spins)}</span>`);
  if (d.min_deposit) stats.push(`<span><b>Min Deposit:</b> ${e(d.min_deposit)}</span>`);
  if (d.max_cashout) stats.push(`<span><b>Max Cashout:</b> ${e(d.max_cashout)}</span>`);
  if (stats.length) {
    parts.push(`<div class="bonus-card__stats">${stats.join("")}</div>`);
  }
  parts.push(`</div>`);

  if (d.link) {
    parts.push(
      `<a href="${safeHref(d.link)}" class="bonus-card__cta" rel="noopener noreferrer">Claim Bonus</a>`
    );
  }

  parts.push(`</div>`);

  return { type: "raw", value: parts.join("") };
}

// https://astro.build/config
export default defineConfig({
  site: "https://casinorank.com",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/go/"),
    }),
  ],
  markdown: {
    rehypePlugins: [rehypeBonusCard],
  },
});
