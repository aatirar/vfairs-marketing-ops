---
name: ad-replicator
description: Given a company or product name, finds the top 3 competitors, scrapes their latest LinkedIn ads via Apify, selects the 3 strongest ads to replicate, and generates brand-adapted versions using Gemini image generation with the company's logo. Outputs 3 ready-to-review ad creatives.
allowed-tools: mcp__tavily__tavily_search, mcp__apify__call-actor, mcp__apify__get-actor-output, Bash, Glob, Write, Agent
argument-hint: '"Company Name" [--logo path/to/logo.png]'
---

# /ad-replicator — Competitor Ad Intelligence + Brand-Adapted Creatives

Takes a company name, finds its top 3 LinkedIn-active competitors, scrapes their latest ads, selects 3 to replicate, and generates brand-adapted versions using the company's logo.

---

## PHASE 1 — PARSE INPUTS

The argument format is:
```
/ad-replicator "RepairDesk"
/ad-replicator "RepairDesk" --logo "data/personal/repair-desk-logo.png"
/ad-replicator "vFairs"
```

Extract:
- `COMPANY_NAME` — the company/product name (e.g. "RepairDesk")
- `LOGO_PATH` — optional explicit logo path from `--logo` flag

**Auto-discover logo if not provided:**
Use Glob to search `data/personal/` for files matching `*[company-slug]*logo*` or `*logo*[company-slug]*` (case-insensitive slug). Examples:
- "RepairDesk" → look for `repair-desk-logo*`, `repairdesk-logo*`, `repairdesk*logo*`
- "vFairs" → look for `vfairs-logo*`, `vfairs*logo*`

If no logo found, set `LOGO_PATH = null` and proceed — images will be generated without logo reference.

Create a URL-safe slug: lowercase, hyphens for spaces/special chars. E.g. "RepairDesk" → `repairdesk`, "Ring Central" → `ring-central`.

---

## PHASE 2 — FIND TOP 3 COMPETITORS

Use `mcp__tavily__tavily_search` with this query:
```
"[COMPANY_NAME] top competitors alternatives B2B SaaS"
```

From the search results, extract exactly **3 competitor names** that:
- Are direct software competitors (same category)
- Are likely to run LinkedIn ads (funded SaaS companies, not tiny bootstrapped tools)
- Have a recognizable LinkedIn presence

Also derive a LinkedIn slug for each competitor (lowercase, hyphens for spaces). You'll use this to build the Ad Library URL.

Examples:
- "Syncro" → slug `syncro`
- "RepairShopr" → slug `repairshopr`
- "mHelpDesk" → slug `mhelpdesk`

**Print a brief confirmation:**
```
Company: RepairDesk
Logo: data/personal/repair-desk-logo.png ✓
Competitors identified: Syncro, RepairShopr, mHelpDesk
```

---

## PHASE 3 — SCRAPE LINKEDIN ADS (SEQUENTIAL)

For all 3 competitors, launch `mcp__apify__call-actor` calls **one at a time, sequentially**. Do NOT call them in parallel — the Apify Streamable HTTP MCP server drops the session when multiple calls hit it simultaneously.

**Actor:** `silva95gustavo/linkedin-ad-library-scraper`

**Input per competitor:**
```json
{
  "startUrls": [{
    "url": "https://www.linkedin.com/ad-library/search?accountOwner=[competitor-slug]&dateOption=last-30-days"
  }],
  "skipDetails": false,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": [],
    "apifyProxyCountry": "US"
  }
}
```

Use `async: false`. Typical runtime: 30–90 seconds per run.

**If a competitor returns 0 results:**
- Try again with `skipDetails: true`
- If still 0, try a variant slug (e.g. "repairshopr" → "repair-shopr", "repairshoprsoftware")
- If still 0, note it as "no active ads found" and continue with remaining competitors

After all runs complete, use `mcp__apify__get-actor-output` to retrieve dataset items for each run.

**From each competitor's ads, keep the first 5** (or all if fewer than 5 returned). For each ad, note:
- `competitor` — which competitor this belongs to
- `headline` — ad headline text
- `body` — ad body copy
- `cta` — call-to-action text
- `imageUrl` — primary creative image URL (look for fields: `imageUrl`, `image`, `creativeUrl`, `media[0].url`, `assets[0].downloadUrl` — use whichever is populated)
- `landingPage` — destination URL
- `format` — ad format (Single Image, Carousel, Video, Document)

---

## PHASE 4 — SELECT 3 ADS TO REPLICATE

From all collected ads (up to 15 total), select **exactly 3** — ideally one per competitor.

**Scoring criteria — favor ads that have:**
1. Single Image or Carousel format (replicable as static creative)
2. A clear, readable headline (strong hook)
3. A specific CTA (not just "Learn More")
4. An available `imageUrl` (so we can pass it as style reference)
5. A message angle that [COMPANY_NAME] could plausibly adapt

**Discard:**
- Video-only ads (no static creative to reference)
- Ads with no headline or body copy
- Duplicate messages from the same competitor (keep the strongest)

**Output a selection summary table:**
```
SELECTED ADS FOR REPLICATION:

1. [Competitor A] — "[Headline]"
   CTA: [CTA text] | Format: [format]
   Why selected: [1 sentence]
   Image URL: [url or "unavailable"]

2. [Competitor B] — "[Headline]"
   ...

3. [Competitor C] — "[Headline]"
   ...
```

---

## PHASE 5 — GENERATE BRAND-ADAPTED CREATIVES

For each of the 3 selected ads, run the image generation script via Bash. **Run all 3 sequentially** (Gemini API handles one at a time reliably).

**For each ad, craft a generation prompt** using this template:

```
I am showing you [a competitor's LinkedIn ad / an ad style reference] and a company logo.

Create a LinkedIn ad creative (1200x628px landscape) in a SIMILAR VISUAL STYLE to the reference ad, but adapted for [COMPANY_NAME].

Style to replicate from the reference:
- [Describe background: dark/light, color palette, texture]
- [Describe layout: logo placement, headline position, CTA location]
- [Describe tone: minimal, bold, photography-heavy, illustration-based]
- [Any notable visual element: gradient, geometric shapes, abstract bg]

Content for [COMPANY_NAME]'s version:
- Use the provided [COMPANY_NAME] logo exactly as-is in [top-left / top-right] corner
- Headline: "[Adapted headline — same formula as original but for COMPANY_NAME's value prop]"
- Sub-headline: "[Adapted sub-headline]"
- CTA button: "[Adapted CTA]" — use a color that matches the logo's primary color
- Overall feel: [COMPANY_NAME]'s category and audience ([e.g. repair shop owners / event managers])

Do not copy the competitor's brand name, colors, or logo. Only borrow the visual layout and structural approach.
```

**Adapting the headline/CTA for [COMPANY_NAME]:**
- Keep the same *formula* as the original (question / stat / bold claim / outcome / how-to)
- Replace the competitor's value prop with [COMPANY_NAME]'s equivalent
- Example: Syncro's "Manage every ticket from one place" → RepairDesk's "Run every repair job from one screen"

**Build the Bash command:**

If `imageUrl` is available for the ad:
```bash
node scripts/content-ops/generate-creative.js \
  --ref "[LOGO_PATH]" \
  --style-ref "[imageUrl]" \
  --prompt "[generated prompt]" \
  --out "[company-slug]-ad-[1|2|3]-[timestamp]"
```

If `imageUrl` is unavailable (or LOGO_PATH is null), omit the corresponding flag:
```bash
node scripts/content-ops/generate-creative.js \
  --ref "[LOGO_PATH]" \
  --prompt "[generated prompt]" \
  --out "[company-slug]-ad-[1|2|3]-[timestamp]"
```

**After each Bash call:** Note the saved file path from the output line `✓ Saved: [path]`.

---

## PHASE 6 — OUTPUT REPORT

After all 3 images are generated, display the final report in chat AND save it to:
```
outputs/vfairs/creatives/[company-slug]-ad-report-[YYYY-MM-DD].md
```

**Report format:**
```markdown
# Ad Replicator Report — [COMPANY_NAME]
**Date:** [today]
**Competitors analyzed:** [Competitor A], [Competitor B], [Competitor C]
**Total ads scraped:** [N]
**Logo used:** [path or "none"]

---

## Generated Creatives

### Ad 1 — Inspired by [Competitor A]
**Inspired by:** "[Original headline]" ([Competitor A])
**Our version:** "[Adapted headline]"
**File:** `[absolute path to generated image]`

### Ad 2 — Inspired by [Competitor B]
...

### Ad 3 — Inspired by [Competitor C]
...

---

## Competitor Ad Intelligence Summary

### [Competitor A]
- Total ads found: N
- Most common message angle: [1 sentence]
- CTA patterns: [list]
- Funnel focus: [TOFU / MOFU / BOFU]

### [Competitor B] ...
### [Competitor C] ...

---

## Notes
- [Any competitors with no ads found]
- [Any generation warnings or fallbacks used]
- Text accuracy note: Gemini image gen occasionally misspells text — treat all outputs as design briefs, not final copy.
```

---

## ERROR HANDLING

| Situation | Response |
|---|---|
| Competitor has no LinkedIn ads | Note it, continue with remaining competitors. Try 1 slug variant before giving up. |
| Ad image URL is expired/403 | Proceed with text-only generation (no `--style-ref`). Note in report. |
| Logo file not found | Proceed without `--ref` flag. Note in report. |
| Gemini returns no image | Log full API response, retry once with a simplified prompt. |
| All 3 competitors have no ads | Report this clearly. Suggest the user run `/linkedin-ads-review [competitor]` manually to debug the slug. |

---

## QUALITY NOTES

- Adapt, don't copy. The prompt must tell Gemini to replicate the *layout structure and visual style*, never the competitor's brand, colors, or messaging verbatim.
- One competitor per generated ad where possible — this gives breadth of style inspiration.
- The `--style-ref` image is guidance, not an instruction to reproduce it exactly. Gemini will interpret it loosely.
- Generated text in images may contain typos (known model limitation). Note this in the report.
- All output images are saved to `outputs/vfairs/creatives/` — they can be opened directly from the file paths in the report.
