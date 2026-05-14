---
name: review-intel
description: Scrape G2, Capterra, and Trustpilot reviews for a company and its competitors via Apify, then generate a messaging intelligence brief — ICP language, pain points, switching triggers, delight factors, and copy-ready phrases. Ideal for informing landing page copy, positioning, and content strategy.
allowed-tools: mcp__apify__call-actor, mcp__apify__get-actor-output, Write
argument-hint: '"primary-domain.com" ["competitor1.com"] ["competitor2.com"]'
---

# /review-intel — Voice-of-Customer Messaging Intelligence

Scrapes review sites (G2, Capterra, Trustpilot, Gartner, Software Advice) for the primary company and up to 3 competitors in parallel via Apify, then synthesizes the data into an actionable messaging brief.

---

## INPUTS

Parse the argument string for domains. Expected format:
```
/review-intel "repairdesk.com" "syncroapp.com" "repairshopr.com"
```

- **First domain** = primary company (your product)
- **Remaining domains** = competitors (up to 3)
- **Minimum:** 1 domain required
- Domains should be bare (no `https://`, no path)

---

## PHASE 1 — SCRAPE IN PARALLEL

For each domain provided, launch one `mcp__apify__call-actor` call. **All calls must be sent in a single message (parallel).**

**Actor:** `focused_vanguard/multi-platform-reviews-scraper`

**Input per domain:**
```json
{
  "domain": "[the-domain.com]",
  "platforms": ["g2", "capterra", "trustpilot", "gartner", "softwareadvice"],
  "maxReviewsPerPlatform": 50,
  "lookbackDays": 365,
  "includeReddit": false
}
```

Use `async: false` to wait for completion. Each run typically takes 60–120 seconds.

**If an actor run returns 0 results for a domain:** Note it as "no reviews found on major platforms" and continue with remaining domains.

**If a domain returns results only on some platforms:** That's normal — proceed with whatever data exists.

---

## PHASE 2 — COLLECT RESULTS

For each completed run, use `mcp__apify__get-actor-output` with the run ID to retrieve the dataset items.

Each review record will contain:
- `platform` — which site (g2, capterra, etc.)
- `productName` — the product being reviewed
- `rating` — numeric score (typically 1–5)
- `title` — review headline
- `body` or `review` — full review text
- `pros` — what the reviewer liked
- `cons` — what they didn't like
- `reviewerInfo` — role, company size, industry (when available)
- `publishedAt` — review date

**Parse and organize into two groups:**
1. **Own product reviews** (first domain)
2. **Competitor reviews** (all other domains, labeled by domain)

---

## PHASE 3 — ANALYZE AND SYNTHESIZE

Analyze all review data together. Do NOT just list reviews — extract patterns and synthesize into intelligence.

### 3.1 — ICP Profile (Own Product Only)
From reviewer metadata, identify:
- Most common buyer roles/titles
- Most common company sizes (SMB vs mid-market vs enterprise)
- Most common industries / use cases
- What they were using before switching

### 3.2 — Pain Points (Exact Customer Language)
From cons, review bodies, and switching context:
- What problems drove them to look for a solution?
- What frustrated them about their previous tool?
- What ongoing complaints does the product still have?
- Group into themes. Include verbatim phrases that reveal the real language buyers use.

### 3.3 — Switching Triggers (Own Product)
Look for phrases like "I switched from", "we moved from", "we replaced", "we were using X before":
- What drove the switch? (pricing, missing feature, scaling problem, support issues)
- What was the decisive moment or final trigger?

### 3.4 — Delight Factors (Own Product)
From pros and 4–5 star reviews:
- What do customers love most? (rank by frequency)
- What surprised them positively?
- What do they mention when recommending the product to others?

### 3.5 — Competitor Weaknesses (From Competitor Reviews)
From competitor cons and low-rated reviews:
- What do customers hate about each competitor?
- What features are missing?
- What support or onboarding complaints appear?
- These are your attack vectors.

### 3.6 — Competitor Strengths (From Competitor Reviews)
From competitor pros:
- What do customers love about competitors?
- What capabilities or experiences do they praise?
- These are gaps you must address or outflank.

### 3.7 — Copy-Ready Phrases
Extract 10–15 verbatim phrases from reviews that are:
- Emotionally resonant (reveal real frustration or delight)
- Specific and concrete (not generic praise)
- Usable directly in marketing copy, landing pages, or testimonials
- Mix of own product quotes and competitor-pain quotes

### 3.8 — Messaging Brief
Synthesize everything into concrete copy direction:

**Recommended H1 angles** (3 options, outcome-led, no jargon):
- Based on the #1 pain point + #1 delight factor
- Avoid: em dashes, "It's not X, it's Y" structures, vague abstract language

**Value proposition bullets** (3–4 bullets using customer language):
- Written in the format: "[specific outcome] so that [specific benefit]"
- Grounded in exact language from reviews

**Objection-handling lines** (for common cons/objections):
- Brief copy that addresses the top 2–3 recurring concerns

**Differentiation angles vs. each competitor:**
- 1–2 sentences per competitor based on their weakness vs. your strength

### 3.9 — Content Angles
5 LinkedIn/blog content angles derived from the review data:
- Grounded in a real pattern from the data
- Include a hook line for each (first sentence only)

---

## PHASE 4 — OUTPUT

### Display in Chat
Output the full messaging brief in structured markdown. Lead with the ICP Profile and Pain Points — those are the highest-value sections.

### Save to File
Save the full report to:
```
outputs/review-intel/[primary-domain]-[YYYY-MM-DD].md
```

Use this file header:
```markdown
# Review Intelligence: [Primary Product Name]
**Date:** [today's date]
**Domains analyzed:** [list all domains]
**Reviews collected:** [total count across all platforms and domains]
**Platforms:** G2, Capterra, Trustpilot, Gartner, Software Advice

---
```

Confirm the save with the file path.

---

## QUALITY STANDARDS

- Never summarize individual reviews — aggregate into patterns
- Always cite specific verbatim phrases to ground insights (use blockquotes)
- Flag if review volume is too low (<20 reviews per company) — the data may not be representative
- If a competitor has no reviews, note it and skip that section
- The output should be immediately actionable — a marketer should be able to open this and write a landing page headline within 5 minutes
- Ratings context: flag if average rating is below 4.0 (competitive vulnerability) or above 4.5 (strong social proof)
