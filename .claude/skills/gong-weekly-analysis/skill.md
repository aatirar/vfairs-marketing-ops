---
name: gong-weekly-analysis
description: Analyze this week's Gong prospect calls. Filters short calls, classifies Prospect vs Customer by title + summary, then spawns parallel subagents to read prospect transcripts and extract personas, pain points, objections, competitive mentions, feature requests, and quotes. Outputs a weekly intelligence report.
allowed-tools: Glob, Read, Write, Agent
disable-model-invocation: false
---

# /gong-weekly-analysis — Weekly Prospect Call Intelligence Report

Orchestrates parallel analysis of this week's Gong prospect calls. The main conversation acts as orchestrator: it handles filtering and classification, then spawns parallel subagents to read transcript batches, then consolidates their structured outputs into a single report.

---

## PHASE 1 — ORCHESTRATOR: Filter and Classify

### Step 1.1 — Find the Latest Index File

Use Glob to find all index files matching `outputs/gong/index-*.md`. Pick the one with the most recent date. Read it fully.

### Step 1.2 — Filter: Remove Calls Under 5 Minutes

Parse the Duration column. Format is `Xm Ys` (e.g. `4m 30s`, `62m 43s`). Keep only calls where total minutes ≥ 5. Track the discard count.

### Step 1.3 — First-Pass Classification by Title

For each remaining call, read the **title** from the index and apply these rules:

**Classify as CUSTOMER (skip — not analyzed this run)** if the title contains any of:
- `weekly`, `biweekly`, `bi-weekly`, `daily`
- `catchup`, `catch up`, `catch-up`
- `setup`, `set up`
- `kick-off`, `kickoff`, `kick off`
- `feedback call`
- `onboarding`
- `dry run`
- `creative sync`
- `follow-up`, `follow up` (when paired with a company name, not sales-like context)
- `next steps`
- `check-in`, `check in`

**Leave as UNCLASSIFIED** anything that doesn't match the above.

### Step 1.4 — Second-Pass Classification (UNCLASSIFIED calls only)

For each UNCLASSIFIED call, read only the first 80 lines of its transcript file (covers Metadata + Key Points — stop before `## Topics Discussed`).

Classify as:
- **PROSPECT** — discovery, demo, pricing discussion, "what does vFairs do", competitive comparison, or first-time exploration
- **CUSTOMER** — ongoing project, event setup, configuration, training, or support for a contracted event

Discard CUSTOMER calls from this run.

### Step 1.5 — Produce Prospect Batch List

You now have a final list of PROSPECT transcript file paths. Note the total count.

Split them into batches of **6–8 calls each**. Aim for ~10 batches (adjust based on actual prospect count — if fewer than 30 prospects, use 4-5 batches; if more than 80, use batches of 8-10).

Record:
- Total calls in index
- Calls filtered (<5 min)
- Calls classified as Customer (skipped)
- Calls classified as Prospect (to analyze)
- Number of batches

---

## PHASE 2 — SPAWN PARALLEL SUBAGENTS

**CRITICAL: Launch ALL subagents in a SINGLE message using multiple Agent tool calls in parallel.** Do NOT launch them one at a time sequentially.

For each batch, spawn a `general-purpose` subagent with this prompt (substituting the actual file paths):

---

**SUBAGENT PROMPT TEMPLATE:**

```
You are analyzing a batch of Gong call transcripts for vFairs, an event management platform.

Read each of the following transcript files in full:
[LIST OF ABSOLUTE FILE PATHS FOR THIS BATCH]

For each file, extract intelligence and aggregate it across all calls in your batch. Do NOT summarize calls individually — aggregate everything into one JSON object.

Return ONLY a valid JSON object in this exact structure (no prose before or after):

{
  "batch_id": "[batch number, e.g. 1]",
  "calls_analyzed": [list of call titles from this batch],
  "personas": [
    {"role": "...", "company_type": "...", "industry": "...", "count": N}
  ],
  "use_cases": [
    {"persona": "...", "event_type": "...", "details": "...", "count": N}
  ],
  "pain_points": [
    {"pain": "...", "count": N, "example_quote": "..."}
  ],
  "objections": [
    {"objection": "...", "count": N, "details": "..."}
  ],
  "competitive_mentions": [
    {"competitor": "...", "sentiment": "positive|negative|neutral", "context": "...", "count": N}
  ],
  "feature_requests": [
    {"feature": "...", "count": N, "details": "..."}
  ],
  "quotes": [
    {"quote": "exact verbatim quote from external participant only", "company": "...", "date": "YYYY-MM-DD", "context": "why this quote is notable"}
  ]
}

Rules:
- personas: identify the external contact's role/title and company type (university, association, corporate, government, etc.)
- pain_points: look for "we currently...", "the challenge is...", "we need something that...", "our current tool doesn't..."
- objections: pricing concerns, contract length, feature gaps, IT/security, timing, approval process
- competitive_mentions: Cvent, Bizzabo, Swapcard, Swoogo, Accelevents, Whova, Hopin, RainFocus, EventsAir, Eventify, Splash, Hubilo, or any other platform named
- feature_requests: specific capabilities asked about that weren't clearly available — not standard demo features
- quotes: ONLY from external participants (not vFairs reps). Only include quotes that reveal pain, motivation, decision criteria, or memorable objections. Aim for 2-4 per batch.
- count fields: how many times this persona/pain/objection/etc. appeared across your batch
- If a transcript has no Key Points or Transcript section (short/voicemail), skip it and note it in calls_analyzed as "skipped - no content"
```

---

Wait for all subagents to complete before proceeding to Phase 3.

---

## PHASE 3 — ORCHESTRATOR: Consolidate and Write Report

Receive all JSON blobs from the subagents. Merge them as follows:

**Personas:** Combine all persona entries. Group by similar roles (e.g. "Event Manager" + "Events Coordinator" → same group). Sum counts. Sort by count descending.

**Use Cases:** Combine all use_cases entries. Group by event_type. Sum counts. Sort by count descending.

**Pain Points:** Combine all pain_points entries. Group by similar themes (e.g. "registration is manual" + "no self-serve registration" → "Manual/lack of self-serve registration"). Sum counts. Keep the best example_quote for each. Sort by count descending.

**Objections:** Combine and group by theme. Sum counts. Sort by count descending.

**Competitive Mentions:** Combine by competitor name. Sum counts. Merge context notes. Sort by count descending.

**Feature Requests:** Combine and group by theme. Sum counts. Sort by count descending.

**Quotes:** Pool all quotes. Select the 8–12 most insightful and varied ones across personas and topics.

---

Write the final report to:
```
outputs/gong/weekly-analysis/gong-analysis-[YYYY-MM-DD].md
```

Use this structure:

```markdown
# Gong Prospect Intelligence Report
**Week of:** [date range from index]
**Generated:** [today's date and time]

## Run Summary
| Metric | Count |
|--------|-------|
| Total calls in index | N |
| Filtered (<5 min) | N |
| Classified as Customer (skipped) | N |
| Classified as Prospect (analyzed) | N |
| Subagents used | N |

---

## Personas Encountered
[Ranked table or bullet list: Role → Company Type/Industry → Count]

---

## Use Cases by Persona
[Persona type → bullet list of event types they're trying to run, with counts]

---

## Top Pain Points
[Numbered list, most frequent first. Include count and one illustrative quote per pain point]

---

## Common Objections
[Numbered list, most frequent first. Include count and brief context]

---

## Competitive Mentions
[Competitor → Count → Sentiment → Summary of what was said]

---

## Feature Requests
[Bullet list ranked by frequency. Include count and brief description]

---

## Prospect Quotes
[8–12 verbatim quotes, each formatted as:]
> "exact quote"
> — [Company], [Date] | *Context: why this is notable*

---

## Key Themes This Week
[4–6 bullet points synthesizing the most important patterns — written as actionable insights for marketing and sales]
```

---

## OPERATIONAL NOTES

- **Orchestrator = Claude in main conversation.** Phases 1 and 3 run directly in your context.
- **Subagents = general-purpose agents** launched in parallel via the Agent tool. Each has its own context window.
- **Parallel launch is mandatory.** All Agent tool calls for subagents must be in one message. This is the performance benefit of this architecture.
- **Subagents return JSON only.** If a subagent returns prose instead of JSON, extract the structured data manually before merging.
- **Batch size guidance:** 6–8 calls per subagent is the sweet spot. Transcripts can be 50–100KB each — 6–8 fits within a subagent's context comfortably.
- **File paths:** Pass repo-relative paths: `outputs/gong/transcripts/[filename].md`
- **Duration parsing edge cases:** `0m 45s` → discard. `5m 0s` → keep. `4m 59s` → discard.
