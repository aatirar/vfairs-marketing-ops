---
name: sales-pitch
description: Build a tailored vFairs sales pitch deck (10 slides) for a specific company and use case. Researches the company's industry, checks Gong for prior interactions, and generates a top-tier sales narrative using vFairs context. Publishes to Gamma via direct API call.
allowed-tools: mcp__tavily__tavily_search, mcp__tavily__tavily_research, mcp__duckduckgo__search, mcp__granola__search_meetings, mcp__granola__get_meeting_details, mcp__granola__get_meeting_transcript, Read, Write, Glob, Bash
disable-model-invocation: false
---

# /sales-pitch — Tailored vFairs Sales Pitch Deck

Builds a 10-slide, account-specific sales pitch using industry research, Gong call history, and vFairs positioning.

---

## INPUT FORMAT

```
/sales-pitch "Company Name" "use case"
```

**Examples:**
```
/sales-pitch "Salesforce" "annual sales kickoff conference"
/sales-pitch "American Heart Association" "annual trade show"
/sales-pitch "Deloitte" "virtual job fair"
/sales-pitch "MIT" "open day and student recruitment event"
```

---

## PHASE 0 — Load vFairs Reference Material

Read the following files in parallel before starting any research:

1. `context/vfairs/about-vfairs.md` — products, features, capabilities, client logos, awards
2. `context/vfairs/marketing-strategy.md` — metrics, customer wins, 2025/2026 performance data
3. `context/vfairs/pricing.md` — product tiers and pricing (for the investment slide)

Extract and keep in working memory:
- **Products relevant to the use case** (e.g., Mobile App, Registration, Virtual Platform, Onsite Badge Printing)
- **Enterprise client logos** (Adobe, Microsoft, Amazon, Nestlé, L'Oréal, etc.)
- **Award/recognition proof points** (Gartner Magic Quadrant Leader, G2 badges, Bizbash awards, etc.)
- **3–4 most relevant case studies or client wins** matching the use case industry or format
- **Key differentiators** (immersive virtual venues, white-glove customer service, modular platform, AI features)

---

## PHASE 1 — Industry and Company Research

### Step 1A — Company Profile

Search for the company using `mcp__tavily__tavily_search`:
- query: `"[Company Name] company overview industry size annual events"`
- max_results: 5

Extract:
- Industry/vertical (e.g., financial services, higher education, professional associations, tech)
- Company size and type (enterprise, nonprofit, government, etc.)
- Known events they run (conferences, trade shows, job fairs, etc.)
- Any event tech they currently use (if publicly mentioned)

### Step 1B — Industry Event Tech Pain Points

Run `mcp__tavily__tavily_research`:
- query: `"[industry] event management challenges pain points event technology 2025 2026 conference [use case]"`
- search_depth: "advanced"
- max_results: 8

Extract the **top 5 pain points** specific to this industry + use case. Look for:
- Registration and check-in complexity
- Hybrid/virtual engagement challenges
- Sponsor/exhibitor ROI concerns
- Data capture and lead retrieval
- Integration with existing CRM/HR/ATS systems
- Budget constraints and justifying event ROI
- Attendee experience expectations post-COVID
- Scaling across multiple events or regions

### Step 1C — Competitor Context (optional enrichment)

Search `mcp__duckduckgo__search`:
- query: `"[Company Name] event platform" OR "[Company Name] Cvent" OR "[Company Name] Bizzabo" site:linkedin.com OR site:g2.com`

If results surface a current vendor, note it — it will inform the differentiation slide.

---

## PHASE 2 — Gong History Check

### Step 2A — Search Gong Transcripts

Use Glob to find all transcript files:
```
outputs/gong/transcripts/*.md
```

Search file names for a match to the company name (case-insensitive partial match). For example, if company is "Cleveland Browns", look for files with "cleveland" or "browns" in the name.

Also use Glob with pattern:
```
outputs/gong/transcripts/*[company-keyword]*.md
```
(Replace [company-keyword] with the most distinctive word from the company name, lowercased and hyphenated.)

### Step 2B — Read Matching Transcript(s)

If matching Gong transcript files are found:
- Read the full file (or first 150 lines minimum)
- Extract: call date, vFairs rep name, duration, AI summary, key points with mentions > 0, any transcript excerpts
- Note: prior pain points raised, products demoed, objections, pricing discussed, next steps mentioned

If NO matching transcript is found:
- Note: "No prior Gong interaction found — pitch built entirely from industry research."

### Step 2C — Search Granola for Meeting Notes

Call `mcp__granola__search_meetings` with query = "[Company Name]" and limit = 5.

If meetings are found, call `mcp__granola__get_meeting_details` for the most recent one, then `mcp__granola__get_meeting_transcript` if available.

Extract any additional context: attendees, topics discussed, next steps noted.

---

## PHASE 3 — Build the Pitch Deck

Now synthesize everything into a 10-slide pitch deck. Write it to:

```
outputs/vfairs/sales-pitches/[company-slug]-[YYYY-MM-DD].md
```

Where `[company-slug]` = company name lowercased, spaces replaced with hyphens (e.g., `american-heart-association-2026-03-16.md`).

---

### PITCH DECK STRUCTURE

Use this exact slide sequence. This follows the **Challenger Sale + SPIN Selling hybrid** framework used by top enterprise SaaS reps.

---

#### SLIDE 1 — Cover

```
# [Company Name] × vFairs
## [Use Case Title] — Event Technology Proposal
[Today's Date]
Prepared for: [Company Name]
Presented by: vFairs Sales Team
```

If a Gong rep was identified, add: `Account Executive: [Rep Name]`

---

#### SLIDE 2 — The Landscape: How [Industry] Runs Events Today

**Purpose:** Open with insight, not a pitch. Show you know their world.

Write 3–4 sentences describing how organizations in this industry currently approach [use case] events — what tools they typically use, what their events look like, what they're trying to achieve.

Then write a callout box:
```
> **The shift:** [1 sentence on how expectations have changed in 2025–2026 — hybrid, AI, attendee personalization, etc.]
```

Ground this in the industry research from Phase 1B.

---

#### SLIDE 3 — The Challenges Holding Events Back

**Purpose:** Name their pain before they do. Be specific to industry + use case.

Present the **Top 5 pain points** discovered in Phase 1B, formatted as:

```
### Challenge 1: [Pain Point Title]
[2 sentences describing this challenge concretely — what it looks like in practice, what goes wrong]

### Challenge 2: ...
```

If Gong/Granola data was found, weave in 1–2 specific signals from those conversations (e.g., "In our previous conversation on [date], [their rep] mentioned..."). Do not fabricate quotes — only use what was actually found.

---

#### SLIDE 4 — What This Costs You

**Purpose:** Quantify the status quo problem. Make inaction feel expensive.

Write 4 bullet points in this format:
- **[Operational cost]:** [specific consequence — e.g., "Manual check-in for 2,000 attendees = 3-hour queues and first-impression failures"]
- **[Revenue/ROI cost]:** [specific consequence — e.g., "No lead retrieval data means sponsors can't prove ROI → renewal risk"]
- **[Audience cost]:** [specific consequence — e.g., "No mobile app = attendees miss sessions, miss sponsors, leave early"]
- **[Strategic cost]:** [specific consequence — e.g., "One platform per event type means 3× the vendor management, 3× the integration risk"]

Tailor each bullet to the use case.

---

#### SLIDE 5 — Introducing vFairs

**Purpose:** Reframe vFairs as the solution to exactly what was named above.

Write a 2-sentence platform description that maps to the use case (not a generic pitch).

Then list the **3–4 core modules** most relevant to this use case with one-line descriptions each. Pull from `about-vfairs.md`.

End with:
```
> **Trusted by:** Adobe · Microsoft · Amazon · Nestlé · L'Oréal · Airbus · Northrop Grumman · Kraft Heinz
> **Rating:** 4.8★ across 324 verified reviews · Gartner Magic Quadrant Leader 2025
```

---

#### SLIDE 6 — Built for [Use Case]: Key Capabilities

**Purpose:** Go deep on 4–5 capabilities directly solving Slide 3's pain points.

Format each as:

```
### [Feature Name]
**The problem it solves:** [1 sentence referencing Slide 3]
**What vFairs does:** [2–3 sentences on the specific capability, concrete and specific]
**Why it matters for [Company Name]:** [1 sentence personalizing to their context]
```

Map each capability back to a pain point from Slide 3. Use specific product features from `about-vfairs.md`.

---

#### SLIDE 7 — Case Study: [Relevant Customer Name]

**Purpose:** Social proof from a similar org/use case.

Select the **most relevant case study** from the vFairs context files that matches either:
- Same industry/vertical as [Company Name]
- Same event format as the use case
- Similar company size (enterprise, association, university, etc.)

Write in this format:

```
## [Customer Name] — [Use Case]

**The challenge:** [1–2 sentences on what they were struggling with]

**What we built:** [2–3 sentences on the vFairs solution deployed]

**The results:**
- [Metric 1: e.g., "3,200 attendees, 94% satisfaction score"]
- [Metric 2: e.g., "42% increase in sponsor lead captures vs. prior year"]
- [Metric 3: e.g., "Event went fully paperless — zero check-in queues"]
```

If no perfect match exists in the context files, choose the closest available and note it explicitly. Do not fabricate metrics.

---

#### SLIDE 8 — Why vFairs Over the Alternatives

**Purpose:** Preemptively address competition without naming names (unless a competitor was surfaced in research).

Write a comparison table:

```
| What matters to you | vFairs | Typical alternatives |
|---|---|---|
| [Criterion 1 — e.g., Onsite + virtual in one platform] | ✅ Fully unified | ❌ Separate tools required |
| [Criterion 2 — e.g., White-glove event support] | ✅ Dedicated CSM + project team | ❌ DIY or paid add-on |
| [Criterion 3] | ✅ ... | ❌ ... |
| [Criterion 4] | ✅ ... | ❌ ... |
| [Criterion 5] | ✅ ... | ❌ ... |
```

Choose 5 criteria that directly address the use case challenges from Slide 3. Pull differentiators from `about-vfairs.md`.

If a competitor was found in Phase 1C research, add a row:
```
| vs. [Competitor Name] specifically | ✅ [vFairs advantage] | ⚠️ [their known gap] |
```

---

#### SLIDE 9 — What Our Customers Say

**Purpose:** Credibility through voice of customer.

Include:
- **3 testimonial quotes** — pull from `about-vfairs.md` or `marketing-strategy.md`. If not available verbatim, use award/review data as proof points.
- **Awards/recognition block:**

```
🏆 Gartner Magic Quadrant Leader — Event Marketing & Management Platforms 2025
🏆 Gartner Customer Choice Award — 3 consecutive years
🏆 G2 Leader — 482 badges earned in 2025
🏆 BizBash: Best Event App, Best Virtual Event, Best Virtual Trade Show (2025)
🏆 Event Tech Live 2025: People's Choice Award + Best Visitor Registration Technology
⭐ 4.8/5.0 — 324 verified customer reviews
```

---

#### SLIDE 10 — The Path Forward

**Purpose:** Make next steps specific, low-friction, and time-bound.

Write in this format:

```
## Proposed Next Steps

### Step 1 — Discovery Call (This Week)
[30 minutes to walk through your specific event requirements and attendee journey]

### Step 2 — Custom Demo (Week of [+1 week from today])
[Tailored demo built around [use case] + [Company Name]'s event profile]

### Step 3 — Proposal + Investment
Based on [use case] scope, the recommended configuration is:
- **[Product 1]:** [tier] — starting at $[price from pricing.md]
- **[Product 2]:** [tier] — starting at $[price]
- **[Optional add-on]:** $[price]

*Final pricing depends on attendee volume, event count, and specific feature needs.*

### Step 4 — Pilot Event
[Option to start with a single event before committing to annual — reduces risk, builds confidence]

---

**Ready to move forward?**
📧 [Contact: sales@vfairs.com]
🌐 vfairs.com
```

Tailor the recommended products to the use case using `pricing.md` — suggest 2–3 relevant product tiers without overpromising.

---

## PHASE 4 — Publish to Gamma

After writing the markdown file, publish it to Gamma as a presentation using the direct API (the Gamma MCP tool uses a deprecated endpoint — always use the direct API approach below).

### Step 4A — Write payload JSON

Use Node.js to read the markdown file and write a payload JSON:

```bash
node -e "
const fs = require('fs');
const pitch = fs.readFileSync('[ABSOLUTE_PATH_TO_MD_FILE]', 'utf8');
const payload = {
  inputText: pitch,
  format: 'presentation',
  textMode: 'preserve',
  numCards: 10,
  imageOptions: { source: 'aiGenerated', style: 'professional corporate photography' },
  cardOptions: { dimensions: '16x9' }
};
fs.writeFileSync('[ABSOLUTE_PATH_TO_PAYLOAD_JSON]', JSON.stringify(payload));
console.log('done');
"
```

Save payload to: `outputs/vfairs/sales-pitches/gamma-payload-temp.json`

### Step 4B — POST to Gamma API

```bash
node -e "
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync('[PAYLOAD_PATH]', 'utf8'));
fetch('https://public-api.gamma.app/v1.0/generations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-KEY': '[GAMMA_API_KEY from .config/.env]' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d)))
.catch(e => console.error(e.message));
"
```

Extract the `generationId` from the response.

### Step 4C — Poll for completion

```bash
node -e "
const id = '[generationId]';
const key = '[GAMMA_API_KEY]';
function poll() {
  fetch('https://public-api.gamma.app/v1.0/generations/' + id, { headers: { 'X-API-KEY': key } })
  .then(r => r.json())
  .then(d => {
    console.log('Status:', d.status);
    if (d.status === 'completed') console.log('URL:', d.gammaUrl);
    else if (d.status === 'failed') console.error('Failed:', JSON.stringify(d));
    else setTimeout(poll, 5000);
  });
}
poll();
"
```

Wait until status is `completed`, then extract `gammaUrl`. Delete the temp payload file after.

**API key location:** `GAMMA_API_KEY` in `.config/.env`
**Endpoint:** `https://public-api.gamma.app/v1.0/generations`
**Auth header:** `X-API-KEY` (NOT Bearer token)
**Note:** Do NOT use the `mcp__gamma__generate_gamma` tool — it calls a deprecated endpoint and returns a 410 error.

---

## PHASE 5 — Output and Summary

After writing the file, report back to the user with:

1. **File saved to:** `outputs/vfairs/sales-pitches/[filename].md`
2. **Company:** [Name] | **Use Case:** [Use Case] | **Industry:** [identified industry]
3. **Gong history found:** Yes/No — [if yes: call date, rep, brief summary of prior interaction]
4. **Granola history found:** Yes/No — [if yes: meeting title and date]
5. **Case study used:** [Customer name and why it was selected]
6. **Key pain points addressed:** [3-bullet summary of Slide 3]
7. **Recommended products:** [from Slide 10]

---

## QUALITY RULES

- **Never fabricate quotes, metrics, or case study results.** If you don't have real data, write "[Metric to be confirmed with CSM team]" as a placeholder.
- **Never use em dashes** in any copy. Use commas, colons, or line breaks instead.
- **No AI-sounding metaphors.** Keep language concrete and specific (e.g., not "seamless synergy" — say "attendees scan their badge at the kiosk and are checked in within 3 seconds").
- **Personalize every slide** to the company and use case. Generic decks lose deals.
- **Gong context takes priority.** If a prior call surfaced specific objections or needs, address them directly in the relevant slides.
- **Slide length:** Each slide content block should be substantive but scannable — aim for 150–300 words per slide. The deck is a leave-behind, not a wall of text.
