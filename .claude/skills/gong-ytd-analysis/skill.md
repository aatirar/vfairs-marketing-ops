---
name: gong-ytd-analysis
description: YTD Gong call intelligence. Classifies all calls across all fetched index files as PROSPECT or CUSTOMER, then runs parallel subagent analysis for both. Produces two reports: a prospect intelligence report and a customer insights report.
allowed-tools: Agent, Glob, Grep, Read, Write
disable-model-invocation: false
---

# /gong-ytd-analysis — Year-to-Date Gong Intelligence Reports

Produces two reports from all Gong calls fetched YTD:
1. `outputs/gong/ytd-analysis/ytd-prospects-[YYYY-MM-DD].md` — prospect intelligence (personas, pain points, objections, competitors, feature requests, quotes)
2. `outputs/gong/ytd-analysis/ytd-customers-[YYYY-MM-DD].md` — customer insights (personas, use cases, pain points by area, praises, frustrations, feature requests, themes)

---

## PHASE 1 — CLASSIFY ALL CALLS

### Step 1.1 — Discover All Index Files

Use Glob to find all `outputs/gong/index-*.md` files. Read each one fully to extract the full call list. Note: index files use a pipe-separated table. Parse Title, Date, Duration, and File Path columns for each call.

Build a unified call list across all index files. De-duplicate by file path (some calls may appear in overlapping indexes if date ranges overlap).

Record total call count.

### Step 1.2 — Filter: Remove Calls Under 5 Minutes

Parse Duration from each row. Format is `Xm Ys`. Keep only calls where total minutes ≥ 5. Track discard count.

### Step 1.3 — Title-Based Classification (No Transcript Reads)

For each remaining call, read the title and apply these rules:

**Classify as CUSTOMER** if title contains any of:
- `weekly`, `biweekly`, `bi-weekly`, `daily`
- `catchup`, `catch up`, `catch-up`
- `setup`, `set up`, `set-up`
- `kick-off`, `kickoff`, `kick off`
- `feedback call`
- `onboarding`
- `dry run`
- `creative sync`
- `check-in`, `check in`
- `project update`, `status update`
- `handover`, `hand-off`
- `training`
- `go live`, `go-live`
- `event support`
- `post event`, `post-event`
- `run through`, `run-through`, `runthrough`
- `review call`
- `follow-up` (when paired with a company name, not sales-like)
- `next steps` (when it looks like a customer check-in)

**Classify as PROSPECT** if title contains any of:
- `demo`
- `discovery`
- `intro call`, `introduction`
- `make events better` (vFairs standard prospect meeting title)
- `pricing`
- `proposal`
- `presentation`

**Leave as UNCLASSIFIED** if no clear rule matches.

### Step 1.4 — Second-Pass Classification (UNCLASSIFIED only, via subagents)

The UNCLASSIFIED pool will be large (hundreds of calls). Do NOT read them all in the main conversation — this will overflow the context window.

Instead, split the UNCLASSIFIED list into batches of **30 calls each**. Spawn parallel `general-purpose` subagents to classify each batch.

**CRITICAL: Launch ALL classification subagents in a single message with multiple Agent tool calls.**

**CLASSIFICATION SUBAGENT PROMPT TEMPLATE:**

```
You are classifying Gong call transcripts for vFairs, an event management platform.

For each file path below, read only the first 80 lines of the file (covers Metadata + Key Points). Then classify the call as:
- PROSPECT — discovery, demo, first contact, pricing discussion, "what does vFairs do", competitive comparison
- CUSTOMER — ongoing project, event setup, configuration, training, support for a contracted event, technical issue, post-sale
- SKIP — voicemail, no transcript available, call under 2 minutes, wrong number

Return ONLY a JSON array:
[
  {"file": "filename.md", "classification": "PROSPECT|CUSTOMER|SKIP"},
  ...
]

Files to classify:
[LIST OF ABSOLUTE FILE PATHS]
```

Wait for all classification subagents to complete. Merge their results.

### Step 1.5 — Build Final Lists

You now have three lists:
- **PROSPECT** file paths (from title rules + second-pass classification)
- **CUSTOMER** file paths (from title rules + second-pass classification)
- **SKIP** (discard)

Record counts for the run summary.

---

## PHASE 2 — PARALLEL ANALYSIS (PROSPECT + CUSTOMER)

**CRITICAL: Launch ALL analysis subagents in a SINGLE message.** Mix prospect and customer batches freely — they are fully independent.

### Prospect Batches (8 calls each)

For each batch of 8 prospect transcript file paths, spawn a `general-purpose` subagent with this prompt:

---

**PROSPECT SUBAGENT PROMPT:**

```
You are analyzing a batch of Gong call transcripts for vFairs, an event management platform.

Read each of the following transcript files in full:
[LIST OF ABSOLUTE FILE PATHS]

Aggregate intelligence across all calls in your batch into ONE JSON object. Do NOT summarize calls individually.

Return ONLY valid JSON (no prose before or after):

{
  "batch_id": "[batch number]",
  "calls_analyzed": ["list of call titles"],
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
    {"quote": "exact verbatim quote from external participant only", "company": "...", "date": "YYYY-MM-DD", "context": "why this is notable"}
  ]
}

Rules:
- Only quotes from external participants (not vFairs reps)
- Quotes must reveal pain, motivation, decision criteria, or memorable objections
- Aim for 2-4 quotes per batch
- If a transcript has no Key Points or transcript section, note it in calls_analyzed as "skipped - no content"
```

---

### Customer Batches (12 calls each)

For each batch of 12 customer transcript file paths, spawn a `general-purpose` subagent with this prompt:

---

**CUSTOMER SUBAGENT PROMPT:**

```
You are analyzing a batch of Gong call transcripts for vFairs, an event management platform. These are calls with existing customers — ongoing projects, support calls, event setup sessions, and check-ins.

Read each of the following transcript files in full:
[LIST OF ABSOLUTE FILE PATHS]

Aggregate intelligence across all calls into ONE JSON object. Do NOT summarize individually.

Return ONLY valid JSON (no prose before or after):

{
  "batch_id": "[batch number]",
  "calls_analyzed": ["list of call titles"],
  "personas": [
    {"role": "...", "company_type": "...", "industry": "...", "count": N}
  ],
  "use_cases": [
    {"persona": "...", "event_type": "...", "details": "...", "count": N}
  ],
  "pain_points": [
    {
      "area": "Registration|Badge Printing|Virtual Platform|Mobile App|Integrations|Reporting/Analytics|Service/Support|Pricing/Billing|Other",
      "pain": "...",
      "count": N,
      "example_quote": "verbatim quote from external participant"
    }
  ],
  "praises": [
    {"quote": "exact verbatim quote from external participant", "company": "...", "date": "YYYY-MM-DD", "context": "what they are praising"}
  ],
  "frustrations": [
    {"quote": "exact verbatim quote from external participant", "company": "...", "date": "YYYY-MM-DD", "context": "what they are frustrated about"}
  ],
  "feature_requests": [
    {"feature": "...", "count": N, "details": "...", "area": "Registration|Badge Printing|Virtual Platform|Mobile App|Integrations|Reporting/Analytics|Service/Support|Other"}
  ]
}

Rules:
- pain_points: categorize by product area. Look for "it doesn't", "we can't", "the problem is", "it keeps", "it's broken", "why can't it", "the issue is"
- praises: look for "I love", "this is great", "it worked perfectly", "really impressed", "so much easier", positive exclamations
- frustrations: look for complaints, repeated issues, "I'm frustrated", "this is annoying", "why is it", angry or disappointed tone
- Only quotes from external participants (not vFairs reps)
- Aim for 2-3 praises and 2-3 frustrations per batch
- If a transcript has no content, skip it and note in calls_analyzed
```

---

Wait for ALL subagents to complete before Phase 3.

---

## PHASE 3 — CONSOLIDATE AND WRITE REPORTS

### 3A — Prospect Report Consolidation

Merge all prospect JSON blobs:
- **Personas**: Group similar roles, sum counts, sort descending
- **Use Cases**: Group by event_type, sum counts, sort descending
- **Pain Points**: Group by similar theme, sum counts, keep best quote, sort descending
- **Objections**: Group by theme, sum counts, sort descending
- **Competitive Mentions**: Group by competitor, sum counts, merge context, sort descending
- **Feature Requests**: Group by theme, sum counts, sort descending
- **Quotes**: Pool all, select 12–16 most insightful and varied

Write to `outputs/gong/ytd-analysis/ytd-prospects-[TODAY].md`:

```markdown
# Gong YTD Prospect Intelligence Report
**Period:** 2026-01-01 to [latest date in dataset]
**Generated:** [today]

## Run Summary
[table: total calls, filtered, customer, prospect, subagents]

## Personas Encountered
## Use Cases by Persona
## Top Pain Points
## Common Objections
## Competitive Mentions
## Feature Requests
## Prospect Quotes
## Key Themes
```

### 3B — Customer Report Consolidation

Merge all customer JSON blobs:
- **Personas**: Group similar roles, sum counts, sort descending
- **Use Cases**: Group by event_type, sum counts, sort descending
- **Pain Points**: Group by area first, then by theme within area, sum counts, keep best quote
- **Praises**: Pool all, select 12–16 most illustrative
- **Frustrations**: Pool all, select 12–16 most significant
- **Feature Requests**: Group by area, then by theme, sum counts, sort descending

Write to `outputs/gong/ytd-analysis/ytd-customers-[TODAY].md`:

```markdown
# Gong YTD Customer Insights Report
**Period:** 2026-01-01 to [latest date in dataset]
**Generated:** [today]

## Run Summary
[table: total calls, filtered, prospect, customer, subagents]

## Personas Encountered
## Use Cases by Persona
## Top Pain Points by Product Area
[Grouped: Registration / Badge Printing / Virtual Platform / Mobile App / Integrations / Reporting & Analytics / Service & Support / Pricing & Billing]

## Customer Praises
[12–16 verbatim quotes with company, date, and context]

## Customer Frustrations
[12–16 verbatim quotes with company, date, and context]

## Feature Requests by Area
## Key Themes
```

---

## OPERATIONAL NOTES

- **Scale warning:** This skill processes ~3,500+ calls. Expect 30–50 classification subagents and 100–150 analysis subagents. Do NOT attempt to run the full YTD in a single session if context is already large — start fresh.
- **Parallel launch is mandatory.** All subagents must be in one message per phase. Sequential launch defeats the purpose.
- **Index file format:** Columns vary slightly between older and newer index files. Parse flexibly — Title is always first, Duration format is always `Xm Ys`.
- **Avoid re-reading classified files.** Once a file path is classified, only pass it to the appropriate analysis subagent — don't re-read it in the orchestrator.
- **Output directory:** Create `outputs/gong/ytd-analysis/` if it doesn't exist.
- **File paths:** Use repo-relative paths: `outputs/gong/transcripts/[filename].md`
