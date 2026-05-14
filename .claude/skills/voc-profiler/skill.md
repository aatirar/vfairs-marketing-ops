---
name: voc-profiler
description: Enrich a raw Voice of Customer signal (a quote, complaint, request, or praise from Gong/Slack/Granola/reviews) with HubSpot context — ICP fit score, account segment, ARR tier, deal stage, and renewal date. Flags missing metadata explicitly so weighted decisions never run on anonymous noise.
allowed-tools: Read, Glob, Grep, Bash, mcp__hubspot__hubspot-search-objects, mcp__hubspot__hubspot-get-property, mcp__hubspot__hubspot-list-properties, Write
disable-model-invocation: false
---

# /voc-profiler — Profile a VoC Signal

Takes any incoming customer/prospect signal and attaches the metadata needed to weight it correctly. A passing complaint from a $500K enterprise account is not the same as one from a $5K SMB; this skill makes that explicit.

## INPUT

User invokes with one of:
- A quote / fragment of text and the source ("Slack #sales-huddle, 2026-04-22")
- A path to a Gong transcript (`outputs/gong/transcripts/<file>.md`)
- A path to a Granola note
- A review row from `outputs/review-intel/`

If the source is missing, ask once for it. If the company name is missing, mark `attribution: anonymous` and proceed.

## EXECUTION

### Step 1 — Extract attribution candidates
Pull from the source:
- Company name (look at file metadata, Granola title, HubSpot deal mention)
- Speaker title / role
- Date
- Source channel (gong | slack | granola | review | hubspot-email)
- Verbatim quote (preserve exactly — no paraphrase)

### Step 2 — Resolve to HubSpot
Use `mcp__hubspot__hubspot-search-objects` with the company name. If multiple matches, prefer the most recent open deal or active customer. Pull:
- `arr_band` (or compute from `amount` / `closedate`)
- `lifecycle_stage`
- `dealstage` (if open deal)
- `industry`, `country`, `numberofemployees`
- `renewal_date` (custom property)
- Owner / AE name

If no HubSpot match, set `hubspot_match: false` and continue.

### Step 3 — Compute ICP fit score (0–100)
Use the vFairs ICP rubric (already documented in `context/vfairs/marketing-strategy.md`):
- Industry vertical match: 0–30
- Employee count band: 0–20
- Event maturity signal: 0–20
- Geography: 0–10
- Recent activity (logins, support tickets, deal momentum): 0–20

Do not invent values. If a dimension is unknowable, score 0 and add it to `data_gaps`.

### Step 4 — Assign weight tier
- **A** — ICP ≥ 70, ARR ≥ $250K, active or expansion-stage → high weight
- **B** — ICP 50–69, any ARR → standard weight
- **C** — ICP < 50 OR free-tier / churned → low weight, surface only when corroborated
- **U** — anonymous / no HubSpot match → quarantined; needs human review before weighting

### Step 5 — Output JSON + human-readable card
Write to `outputs/voc/profiled/<YYYY-MM-DD>-<slug>.json` and print a card to console:

```
┌─ VoC Signal Profile ──────────────────────────────────────────┐
│ Quote: "<verbatim, max 240 chars>"                            │
│ Source: <gong | slack | granola | review> · <date>            │
│ Attribution: <Company> · <Role>                               │
│ HubSpot match: ✓ (deal id <id>)                               │
│ Segment: <industry> · <employees> employees · <geo>           │
│ ARR tier: <$XK–XK band>    Lifecycle: <stage>                 │
│ ICP fit: <score>/100       Weight tier: <A|B|C|U>             │
│ Data gaps: <list, or "none">                                  │
└───────────────────────────────────────────────────────────────┘
```

## OPERATIONAL RULES

- Never paraphrase the quote. Preserve original phrasing exactly — that's the most valuable artifact.
- If `data_gaps` is non-empty, list them. Do not silently fill with averages.
- If multiple HubSpot matches and you can't disambiguate, output all candidates and flag for human review.
- This skill is the input to `/voc-synthesize`. Profiled signals accumulate at `outputs/voc/profiled/`.
