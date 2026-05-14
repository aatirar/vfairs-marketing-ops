---
name: voc-route
description: Take the synthesized VoC themes from /voc-synthesize and route each one to its destination — testimonial queue, case-study leads, marketing objection map (mapped to website pages), product feedback intake, or executive memo. Outputs routing decisions with the verbatim quotes and account context attached, so the receiving team can act without re-doing the analysis.
allowed-tools: Read, Glob, Grep, Bash, Write, mcp__hubspot__hubspot-search-objects, mcp__claude_ai_Slack__slack_send_message_draft
disable-model-invocation: false
---

# /voc-route — Route Synthesized Signals to Action

The synthesis report is intelligence, not action. This skill reads the latest synthesis at `outputs/voc/synthesis/<date>-synthesis.md` and decides where each theme should go. Every routing decision carries the verbatim quotes plus account context with it, so the receiving team is not asked to re-do the analysis.

## INPUT

Default: route the most recent synthesis. Optional: `--date 2026-04-26` to route a historical run.

## ROUTING DESTINATIONS

For each theme in the synthesis, decide which queue(s) it belongs in:

### 1. Testimonial queue
**Trigger:** Praise that is specific, attributable, and quotable. The customer is identifiable (HubSpot match, weight tier A or B), the praise points at a concrete outcome or capability, and the language would survive being put on a landing page.
**Output:** `outputs/voc/routed/testimonial-queue.md` — append entry with quote, customer name, contact, account context, and a flag for usable channels (Meta ads, search testimonial pages, short-form video, sales decks).

### 2. Case-study leads
**Trigger:** Customer described a clear before/after — a transformation, a measurable outcome, a switching story. Active customer, weight tier A preferred.
**Output:** `outputs/voc/routed/case-study-leads.md` with: customer, the outcome arc in their words, the proposed angle, and a draft outreach email (1-2 sentences) the brand team can send.

### 3. Marketing objection map
**Trigger:** Recurring prospect objection. Map each one to the website page(s) where it should be addressed proactively. Use the page→module table in `context/vfairs/` if available.
**Output:** `outputs/voc/routed/objection-map.md` — table format: Objection | # mentions | Pages where it should be addressed | Suggested H2/section copy (drafted by the dispatch step).

### 4. Product feedback
**Trigger:** Feature requests or friction points, especially recurring ones. Preserve the verbatim quote — PMs read raw quotes much more carefully than summaries.
**Output:** `outputs/voc/routed/product-feedback.md` — one entry per request, with: capability area, # mentions, weighted account list (so PM can see the ARR concentration), 3-5 verbatim quotes.

### 5. Executive memo
**Trigger:** Strategic, organization-level signals only. Category shifts, segment-level pattern changes, competitive moves with revenue implications. Not "we got 3 complaints about onboarding."
**Output:** `outputs/voc/routed/exec-memo.md` — written as a memo, not a list. 5-7 strategic observations with implications, plus an "ask" — what decision is being requested.

A theme can be routed to multiple destinations. Praise about a specific feature might land in both Testimonial Queue and Product Feedback (positive signal that the PM team should see).

## EXECUTION

### Step 1 — Read synthesis
Glob `outputs/voc/synthesis/*-synthesis.md`, pick latest (or specified date). Parse high-confidence and medium-confidence themes.

### Step 2 — Classify each theme
Apply the trigger rules above. A single theme can carry multiple labels.

For each theme:
- Pull the verbatim quotes from the synthesis (do not regenerate)
- Pull the account context (company, ICP fit, ARR, weight tier) from the profiled signals
- Make routing decisions explicit (don't bury them in prose)

### Step 3 — Write to destination files
Append entries to each destination file rather than overwriting. The whole point is these files compound over time. Use date-stamped section headers.

### Step 4 — Print routing dispatch summary
Console output should show, at a glance, what landed where:

```
┌─ VoC Routing Dispatch — 2026-05-05 ──────────────────────────┐
│ Synthesis input: 11 themes (7 high · 4 medium)               │
│                                                                │
│ → Testimonial queue:        3 new entries                     │
│ → Case-study leads:         2 new entries                     │
│ → Marketing objection map:  4 new entries                     │
│ → Product feedback:         5 new entries                     │
│ → Executive memo:           2 strategic observations          │
│                                                                │
│ Multi-routed themes:        2 (praise also flagged to PM)     │
│ Themes held (insufficient signal): 0                          │
└────────────────────────────────────────────────────────────────┘
```

## OPERATIONAL RULES

- Do not paraphrase quotes during routing. The receiving team needs the original phrasing — that's the most valuable artifact.
- A theme without a confident routing destination should be held, not force-fitted. Add it to `outputs/voc/routed/held.md` for next-week review.
- If a theme implies an executive-level signal, it goes to exec memo even if it also routes elsewhere. Strategic visibility wins.
- Always include the account context (ARR tier, weight) with each routed item. The team weighing the decision needs it.
