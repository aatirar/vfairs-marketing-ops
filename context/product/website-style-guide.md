# vFairs Website Style Guide

Source of truth for visual styling on **any HTML mockup of a vFairs landing page** — used by the `/re-write` skill mockup mode and any future landing-page work.

If you are generating an HTML preview of a vFairs page rewrite, read this file first and apply the tokens below. Do not invent your own palette or fonts.

---

## Asset locations

| Asset | Source path | Use this copy for HTML mockups |
|---|---|---|
| Logo (landscape gradient) | `Context/vfairs/branding-guidelines/vfairs-logo-landscape-gradient.png` | `outputs/landing-page-rewrites/assets/vfairs-logo.png` |
| TT Norms Pro Regular (400) | `Context/vfairs/branding-guidelines/TTNorms®Pro (1)/woff2/TT_Norms_Pro_Regular.woff2` | `outputs/landing-page-rewrites/assets/fonts/TT_Norms_Pro_Regular.woff2` |
| TT Norms Pro Medium (500) | `…/TT_Norms_Pro_Medium.woff2` | `…/TT_Norms_Pro_Medium.woff2` |
| TT Norms Pro DemiBold (600) | `…/TT_Norms_Pro_DemiBold.woff2` | `…/TT_Norms_Pro_DemiBold.woff2` |
| TT Norms Pro Bold (700) | `…/TT_Norms_Pro_Bold.woff2` | `…/TT_Norms_Pro_Bold.woff2` |
| TT Norms Pro Black (900) | `…/TT_Norms_Pro_Black.woff2` | `…/TT_Norms_Pro_Black.woff2` |

The asset folder `outputs/landing-page-rewrites/assets/` is already populated. Reuse it — do not re-copy on every mockup.

---

## Brand colors

```css
:root {
  /* Primary gradient (logo) */
  --vf-coral: #ED4F75;
  --vf-orange: #F4793A;
  --vf-gradient: linear-gradient(135deg, #ED4F75 0%, #F4793A 100%);
  --vf-gradient-soft: linear-gradient(135deg, rgba(237,79,117,.10) 0%, rgba(244,121,58,.10) 100%);

  /* Ink */
  --vf-ink: #1f2230;
  --vf-ink-2: #424656;
  --vf-muted: #6b7280;

  /* Surfaces */
  --vf-bg: #ffffff;
  --vf-bg-soft: #fff7f3;  /* warm cream tint, alternates with white between sections */
  --vf-line: #ececf1;
  --vf-chip: #fff1ec;
  --vf-chip-ink: #6b3a2a;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(31,34,48,.06);
  --shadow-md: 0 6px 28px rgba(244,121,58,.10), 0 2px 8px rgba(31,34,48,.06);
}
```

**Rules:**
- Primary CTA: gradient background (`var(--vf-gradient)`), white text, soft orange shadow.
- Eyebrow text: `--vf-orange` on `--vf-chip` background, pill-shaped.
- Section alternation: `--vf-bg` (white) → `--vf-bg-soft` (warm cream), repeating, so the page reads as horizontal bands.
- Headlines: use `<span class="gradient-text">…</span>` to highlight 2–3 key words in the H1 / Main H2 with the gradient. One emphasis per heading; never the whole headline.
- Bullet checkmarks: gradient-filled circle with a white checkmark inside.
- Card icons: gradient-filled square (44×44, 12px radius), white SVG stroke, soft orange shadow.

---

## Typography

```css
@font-face { font-family: "TT Norms Pro"; src: url("assets/fonts/TT_Norms_Pro_Regular.woff2") format("woff2"); font-weight: 400; }
@font-face { font-family: "TT Norms Pro"; src: url("assets/fonts/TT_Norms_Pro_Medium.woff2") format("woff2"); font-weight: 500; }
@font-face { font-family: "TT Norms Pro"; src: url("assets/fonts/TT_Norms_Pro_DemiBold.woff2") format("woff2"); font-weight: 600; }
@font-face { font-family: "TT Norms Pro"; src: url("assets/fonts/TT_Norms_Pro_Bold.woff2") format("woff2"); font-weight: 700; }
@font-face { font-family: "TT Norms Pro"; src: url("assets/fonts/TT_Norms_Pro_Black.woff2") format("woff2"); font-weight: 900; }

body { font-family: "TT Norms Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
```

**Type scale (desktop):**
| Element | Size | Weight | Line height | Letter-spacing |
|---|---|---|---|---|
| H1 (hero) | 52px | 900 (Black) | 1.06 | -0.015em |
| H2 (section title) | 36px | 700 (Bold) | 1.15 | -0.015em |
| H3 (section head) | 24–30px | 700 (Bold) | 1.25 | -0.015em |
| Card title (h4) | 16px | 600 (DemiBold) | 1.25 | -0.005em |
| Body | 16px | 400 (Regular) | 1.55 | normal |
| Lede / subhead | 18–19px | 400 | 1.55 | normal |
| Eyebrow | 12px | 600 | normal | 0.14em (uppercase) |
| Button | 15px | 600 | normal | -0.005em |

Mobile (<980px): scale H1 to 38px, H2 to 30px. Card grids drop from 4 columns to 2.

---

## Layout primitives

- **Container:** max-width 1180px, 24px horizontal padding.
- **Section padding:** 88px top/bottom (desktop), 56px (mobile).
- **Border-radius:** 10px buttons/inputs, 12px icons, 14px chip blocks, 16–18px cards and form panels.
- **Section image placeholder:** `var(--vf-bg-soft)` background, 1px line border, 18px radius, 400px height, muted italic label inside (used while real screenshots are pending).

---

## Component patterns

### Hero
- Two columns: copy left (1.1fr), demo form right (0.9fr).
- Background: dual radial gradients (coral top-left, orange top-right) over a soft warm-white linear ramp.
- Eyebrow → H1 (with one gradient-text span) → 18–19px lede → CTA pair → trust row with gradient dots.

### Eyebrow
- Always present at top of every section, pill-shaped, uppercase, gradient-text color on chip background.

### Section grid
- Standard layout: 1fr / 1fr, 64px gap, alternating image side per section.
- Class `.section-grid.reverse` puts image on the left.

### Card grid (used for sections rendered as 4×2)
- 4 columns × 2 rows = 8 cards.
- Each card: gradient icon → 16px DemiBold title → 14px supporting line.
- Hover: lift 3px, soft orange shadow, border edge picks up orange.

### Chip block (used for field types, languages, integrations, etc.)
- Sits inside a section as a labeled cluster of pills.
- Label is muted uppercase. Last chip can be `.chip.more` with italic muted styling for "+ countless others"–style enders.

### Differentiator row
- 3 columns, white cards with a 4px gradient top stripe (the gradient-as-accent rule).

### FAQ
- Stacked, separated by 1px lines, q in 17px DemiBold, "+" sign in orange. New AEO additions get a small gradient pill labeled "New."

### Final CTA
- Dark navy/charcoal background with radial coral + orange gradient washes.
- White H2 (42px), white-80 body copy, gradient primary CTA.

---

## Hard rules

- Use **TT Norms Pro** only. No Inter, no system-default fallback used as primary.
- Use **the gradient** for: primary CTA, eyebrow text color, card icons, bulleted-list circles, differentiator top stripe, and one or two H1/H2 emphasis words. **Do not** wash entire sections with the gradient — it should feel like vFairs, not Lisa Frank.
- Section image placeholders use the soft-cream tint, never a solid orange or pink block.
- Always alternate section backgrounds (`white` → `bg-soft` → `white` → `bg-soft` …) so the page reads as horizontal bands, not a single wall of content.
- Logo always lives in the top-left nav as a 38px-tall PNG. Never recolor, never crop the wordmark.

---

## Reference implementation

`outputs/landing-page-rewrites/event-registration-software-new.html` is the canonical reference for this style applied end-to-end. `outputs/landing-page-rewrites/event-ticketing-software-new.html` is the second reference (8-card grid as a standalone "every rule" section). If a future mockup needs a section type not covered here, copy one of these files' patterns rather than inventing a new one.

## Inline editing

Branded mockups are editable in place — every heading, sub-head, bullet, card, chip, and FAQ becomes click-to-edit:

```
node src/vfairs/automation/lp-inline-edit.js [slug-or-html-path]
```

Edits save directly back to the `.html` file (a `.bak` is created on first save). Useful for tweaking copy without re-running the full rewrite skill. Edits do not auto-sync to the payload JSON — that's a manual step when needed.

## File output convention

When `/re-write` runs in mockup mode against a slug `<slug>`:

- HTML: `outputs/landing-page-rewrites/<slug>.html`
- Payload: `outputs/landing-page-rewrites/<slug>-payload.json`
- Report: `outputs/landing-page-rewrites/<slug>.md`
- Shared assets: `outputs/landing-page-rewrites/assets/` (already populated — reuse, do not re-copy)

The HTML file references `assets/vfairs-logo.png` and `assets/fonts/TT_Norms_Pro_*.woff2` via relative paths. This works the moment the HTML is opened locally; for any hosted preview, adjust paths accordingly.
