---
name: linkedin-ads-review
description: Scrape and analyze a competitor's LinkedIn ads from the last 30 days using Apify. Delivers a structured competitive intelligence report with campaign architecture, messaging analysis, funnel mapping, and strategic implications — the kind a top 1% LinkedIn ads marketer would produce.
allowed-tools: mcp__apify__search-actors, mcp__apify__fetch-actor-details, mcp__apify__call-actor, mcp__apify__get-actor-output, Write
argument-hint: "[competitor name]"
---

# LinkedIn Ads Review Skill

Scrapes a competitor's LinkedIn Ad Library for the last 30 days via Apify and delivers a world-class competitive intelligence report.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked as `/linkedin-ads-review [competitor name]`, follow these steps exactly:

### Step 1: Build the LinkedIn Ad Library URL

Construct the URL using the competitor name from the argument (lowercase, hyphens for spaces):

```
https://www.linkedin.com/ad-library/search?accountOwner={competitor-name}&dateOption=last-30-days
```

Examples:
- `/linkedin-ads-review bizzabo` → `accountOwner=bizzabo`
- `/linkedin-ads-review hopin` → `accountOwner=hopin`
- `/linkedin-ads-review cvent` → `accountOwner=cvent`

If the competitor name has spaces (e.g. "RingCentral"), try both with a hyphen (`ring-central`) and without (`ringcentral`). If zero results are returned, try the company's LinkedIn URL slug instead.

### Step 2: Run the Apify Actor

Call the LinkedIn Ads scraper Actor directly — no need to search or fetch schema first:

```
Actor: silva95gustavo/linkedin-ad-library-scraper

Input:
{
  "startUrls": [{"url": "https://www.linkedin.com/ad-library/search?accountOwner={competitor-name}&dateOption=last-30-days"}],
  "skipDetails": false,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": [],
    "apifyProxyCountry": "US"
  }
}
```

Use `async: false` to wait for results. This usually takes 30–90 seconds.

**If 0 results:** Try `skipDetails: true` for a faster retry with a different URL variant.
**If MCP tools not available:** Tell the user "Apify MCP not loaded — please restart Claude Code."

### Step 3: Analyze the Data

Once you have the scraped ads, perform the full analysis framework below. Do NOT just list the ads — synthesize and interpret them like a senior performance marketer would.

---

## ANALYSIS FRAMEWORK

Structure the output as a complete competitive intelligence report with these exact sections:

---

### 1. SNAPSHOT
- Competitor name, date range, total ads found
- Ad format breakdown (table: format | count | % of mix)
- Active campaigns detected (inferred from UTM parameters, paidBy field, themes)
- One-line "Positioning Read" — what this campaign portfolio says about their go-to-market right now

### 2. CAMPAIGN ARCHITECTURE

Reverse-engineer their campaign structure from UTM parameters (`utm_campaign`), landing page destinations, payer fields, and messaging themes.

Group ads into campaigns. For each campaign:
- **Campaign name** (inferred or from UTM)
- **Objective** (Awareness / Consideration / Conversion — infer from CTA, landing page, format)
- **Ad count**
- **Key message** (1 sentence)
- **Funnel stage** (TOFU / MOFU / BOFU)

### 3. MESSAGING INTELLIGENCE

The deepest section. Analyze what they're saying and how.

**3a. Core Value Propositions Being Tested**
List the distinct value prop angles across all ads. Identify which are A/B variants of the same theme vs. genuinely different messages.

**3b. Headline Patterns**
- What formulas do they use? (question / stat / bold claim / how-to / problem statement)
- What emotional triggers? (fear of missing out, aspiration, pain avoidance, social proof)
- Quote 3–5 standout headlines with analysis of why they work (or don't)

**3c. Body Copy Style**
- Tone (professional, conversational, urgent, authoritative)
- Average length (short punchy vs. long-form storytelling)
- Structure patterns (bullets, numbered lists, narrative, data-led)
- Notable copy techniques (personalization tokens, specific stats, named customers)

**3d. Positioning Signals**
- Who are they talking to? (job titles, pain points implied by copy)
- What category are they trying to own?
- What competitor comparisons or implicit positioning moves are detectable?

### 4. OFFER & CTA STRATEGY

Map every distinct offer and CTA in the dataset:

| Offer Type | CTA Text | # of Ads | Funnel Stage | Notes |
|---|---|---|---|---|
| Free Report/Guide | Learn More | X | MOFU | Anchor asset |
| Demo Request | Request Demo | X | BOFU | Retargeting signal |
| Webinar | Register | X | MOFU | |
| etc. | | | | |

**Key questions to answer:**
- What is their hero/anchor asset right now?
- Are they running hard bottom-funnel pushes or mostly top/mid funnel?
- Do they use any unusual or high-intent offers (free trials, interactive tools, assessments)?

### 5. FORMAT & CREATIVE STRATEGY

**Format Usage:**
For each format used (Single Image, Carousel, Video, Document, Message/InMail, Spotlight):
- What funnel stage is it assigned to?
- What type of content/offer does it carry?
- Creative quality signals (from image URLs, video presence, doc page count)

**Creative Observations:**
- Visual identity consistency
- Any standout creative approaches
- Are they testing multiple creatives per message (creative rotation)?

**Message Ads (InMail):**
If present — this is high-intent, expensive inventory. Note sender persona, personalization tokens used, and what they're promoting. This reveals what they consider high-value audience segments.

### 6. TARGETING INTELLIGENCE

Extract everything available from `impressionsPerCountry`, `targeting`, and `availability` fields.

- **Geographic focus** — which countries dominate? What does the geo mix reveal about their ICP?
- **Language targeting** — English only or multilingual?
- **Impression volumes** — where visible, flag any ads with 10k+ impressions as "heavy investment" signals
- **Flight dates** — are these always-on or burst campaigns? Any ads ending soon?
- **Payer entity variations** — if different legal entities appear (e.g. "Bizzabo Inc" vs "Bizzabo"), this can indicate separate campaign budgets or agencies

### 7. UTM & TRACKING INTELLIGENCE

Decode their UTM parameter structure to reverse-engineer their internal tracking model:

- `utm_campaign` — internal campaign names (reveals their naming conventions and priorities)
- `utm_content` — creative/ad names (reveals how they label variants)
- `utm_medium` + `utm_source` — confirms LinkedIn paid social attribution model
- **Notable patterns** — are they tracking by audience, creative, or offer?

### 8. STRATEGIC IMPLICATIONS FOR VFAIRS

This is the so-what. Think like a performance marketing director preparing for a board presentation.

**What they're doing well (that vFairs should note):**
- List 3–4 specific tactics worth studying or adopting

**Gaps and vulnerabilities (that vFairs can exploit):**
- Messages they're NOT addressing
- Audiences they appear to be ignoring
- Funnel stages where they seem weak

**Direct threats:**
- Any ads that are explicitly targeting vFairs' positioning or keywords
- Retargeting plays that suggest they're competing for the same buyers
- Anchor assets that vFairs needs a counter-asset for

**Counter-moves for vFairs:**
- 3–5 specific, actionable recommendations for vFairs' LinkedIn strategy based on this analysis

### 9. RAPID-FIRE RATINGS

Quick scorecard for senior stakeholders:

| Dimension | Score (1–10) | Verdict |
|---|---|---|
| Messaging clarity | | |
| Funnel coverage | | |
| Creative variety | | |
| Offer strength | | |
| CTA sharpness | | |
| **Overall program** | | |

---

## OUTPUT & SAVING

After generating the full analysis:

1. Display the complete report in the chat
2. Save it to: `outputs/vfairs/linkedin-ads-[competitor-name]-[YYYY-MM-DD].md`
3. Confirm the save with the file path

The report should be 800–1,500 words of actual analysis — not a data dump, but synthesized intelligence a performance marketing director can act on immediately and share with their team or CMO.

---

## QUALITY STANDARDS

- Never just list ads verbatim. Always synthesize and interpret.
- Cite specific ad examples (headline + body snippet) to support conclusions.
- Use competitor-specific language from the actual ads to ground insights.
- Be direct and opinionated. A top-tier analyst has a point of view.
- Flag anything surprising or unusual — that's the most valuable intelligence.
- If the dataset is small (<10 ads), note this as a limitation and work with what's available.
