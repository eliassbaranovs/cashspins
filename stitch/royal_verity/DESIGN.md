# Design System Document: The High-Stakes Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Elite Curator**
This design system moves away from the cluttered, flashing-light tropes of traditional gambling sites. Instead, it adopts the persona of a "High-End Digital Curator." The aesthetic is rooted in editorial prestige—think luxury watch catalogs or private member club portfolios.

We achieve this "bespoke" feel by rejecting the standard grid in favor of **intentional asymmetry**. We utilize large, authoritative typography and "Tonal Layering" to create a sense of depth and exclusivity. The layout should feel "curated" rather than "generated," using breathable white space (or rather, "dark space") to signal trust and premium value.

---

## 2. Colors & Surface Architecture
Our palette transitions from deep, obsidian blacks to glowing emeralds and liquid golds. 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined through:
1.  **Background Shifts:** Using `surface-container-low` against a `surface` background.
2.  **Tonal Transitions:** Soft gradients that imply an edge without drawing a line.
3.  **Negative Space:** Using the spacing scale to create mental groupings.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Obsidian Glass." Depth is achieved by stacking:
*   **Base:** `surface` (#131313) for the main canvas.
*   **Sections:** `surface-container-low` (#1C1B1B) for large content areas.
*   **Cards/Elements:** `surface-container-high` (#2A2A2A) for interactive components.
*   **Nesting:** An inner element (like a bonus code box) should use `surface-container-highest` (#353534) to "pop" toward the user.

### The "Glass & Gradient" Rule
To avoid a "flat" feel, use **Glassmorphism** for floating elements (e.g., sticky headers or hover-state cards). Use `surface-variant` at 60% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#47EB71) to `primary-container` (#17CE58) at a 135-degree angle to provide a "liquid" feel.

---

## 3. Typography: The Authoritative Voice
Typography is our primary tool for establishing "Trust." We use **Manrope** for impact and **Inter** for utility.

*   **Display (Manrope - Bold):** Used for "Hero" offers and big numbers (e.g., "$5,000 Bonus"). Its wide stance feels expensive and immovable.
*   **Headline (Manrope - SemiBold):** Used for casino names and section titles.
*   **Title (Inter - Medium):** Used for card titles and breadcrumbs.
*   **Body (Inter - Regular):** Optimized for readability in reviews. Use `on-surface-variant` (#D0C5AF) for secondary body text to reduce eye strain.
*   **Label (Inter - All Caps - Bold):** Used for "Verification Badges" and "Trust Tags."

---

## 4. Elevation & Depth: Tonal Layering
We do not use standard "Drop Shadows." We use **Ambient Lighting.**

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background to create a "recessed" look. Place a `surface-container-high` card on a `surface` background to create a "raised" look.
*   **Ambient Shadows:** For floating modals, use a shadow with `blur: 40px`, `y: 20px`, and color: `on-surface` (#E5E2E1) at **4% opacity**. This creates a natural glow rather than a dirty smudge.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` (#4D4635) at **20% opacity**. It should be felt, not seen.

---

## 5. Components

### High-Conversion Buttons
*   **Primary (Claim Bonus):** Gradient fill (`primary` to `primary-container`), `round-md`, with a subtle `primary_fixed` inner glow (1px top-inset).
*   **Secondary (Read Review):** Ghost style. No fill, `outline` border at 30% opacity. Gold `secondary` text.
*   **Tertiary:** Text-only with an arrow icon.

### Cards & Lists
*   **Casino Listings:** No dividers. Use a `surface-container-low` background for the card. On hover, transition the background to `surface-container-high` and add the "Ghost Border."
*   **Author Boxes:** Treat these as "Editorial Signatures." Use a `surface-container-highest` background, circular avatars, and `label-sm` for the "Verified Expert" tag.

### Trust Elements
*   **Rating Stars:** Use `tertiary` (#F2CC00). The "unfilled" stars should be `surface-container-highest`, not an outline.
*   **Verification Badges:** Small, pill-shaped components using `on-secondary-container` background and `secondary` text. Use a tiny "Check" icon.

### Input Fields
*   **Text Inputs:** Use `surface-container-lowest`. On focus, the border doesn't light up; instead, the background shifts to `surface-container-high` and the `primary` accent appears as a 2px bottom-line only.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical margins. For example, a "Review of the Week" card can be wider than the standard column to break the grid.
*   **Do** use "Gold" (`secondary`) sparingly. It is a highlighter for "Premium" or "VIP" status only.
*   **Do** use extreme vertical spacing between sections (e.g., `xl` or `2xl` scale) to emphasize the editorial feel.

### Don’t:
*   **Don’t** use 100% white (#FFFFFF). All "white" text should be `on-surface` (#E5E2E1) to maintain the dark-mode premium tone.
*   **Don’t** use standard "Casino Green." Only use the `primary` (#47EB71) for conversion-critical actions.
*   **Don’t** use divider lines between list items. Use a 16px gap and a slight color shift on every second item (zebra striping using `surface` and `surface-container-low`).

### Accessibility Note:
Ensure all `primary` and `secondary` text on `surface` backgrounds maintains a contrast ratio of at least 4.5:1. Use the `on-primary-fixed-variant` for text inside vibrant green buttons to ensure legibility.