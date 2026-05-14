---
name: voc-synthesize
description: Cross-reference profiled VoC signals across Gong, Slack, Granola, HubSpot emails, and public reviews. Surface only patterns confirmed by 3+ independent sources or 1 source with weight tier A. Output a confidence-ranked theme list with verbatim quotes preserved.
allowed-tools: Read, Glob, Grep, Bash, Agent, Write, mcp__claude_ai_Slack__slack_search_public_and_private, mcp__claude_ai_Notion__notion-search, mcp__google-workspace__search_gmail_messages
disable-model-invocation: false
---

# /voc-synthesize — Cross-Source Pattern Detection

Takes the corpus of profiled VoC signals (output of `/voc-profiler`) plus this week's raw Gong/Slack/Granola/review pulls, and surfaces confirmed patterns. The whole point: a single mention is noise; three independent mentions across different channels is a pattern.

## INPUT

Default: synthesize the trailing 7 days. Optional argument: `--window 30d` or `--quarter Q1-2026`.

## EXECUTION

### Phase 1 — Gather

Pull from each source for the window:
1. Profiled signals at `outputs/voc/profiled/*.json`
2. Latest Gong weekly analysis at `outputs/gong/weekly-analysis/gong-analysis-*.md`
3. Slack — query `#sales-huddle`, `#product-feedback`, `#cs-escalations` for the window
4. Granola — search notes by keywords from the previous week's themes (rolling)
5. Review intel at `outputs/review-intel/*.md` (last update)
6. HubSpot email logs — recent inbound emails on open deals containing complaint/request/praise keywords

### Phase 2 — Cluster

Spawn parallel subagents (one per dimension):
- **pain-cluster** — group complaints by underlying pain
- **request-cluster** — group feature requests by capability area
- **praise-cluster** — group positive language by what's being praised
- **objection-cluster** — group prospect objections
- **competitive-cluster** — group competitor mentions

Each subagent returns clusters with:
- Theme name
- Source breakdown (`gong: 4, slack: 2, granola: 1, reviews: 0, hubspot: 1`)
- Weight tier breakdown of contributors (`A: 2, B: 5, C: 1`)
- 3–5 verbatim quotes (preserve exactly, attribute by company + date)
- First-seen date and most-recent date

### Phase 3 — Confidence rules

Rank each cluster:
- **High** — confirmed by 3+ independent sources OR 2+ sources with at least one tier A signal
- **Medium** — 2 sources, both tier B+
- **Low** — 1 source only, or all contributors tier C

Drop tier-Low clusters from the published synthesis (keep them in `outputs/voc/synthesis/<date>-noise.json` for traceability).

### Phase 4 — Write report

Output to `outputs/voc/synthesis/<YYYY-MM-DD>-synthesis.md`:

```markdown
# VoC Synthesis — Week of <date range>
**Profiled signals processed:** N
**Sources:** Gong (X) · Slack (Y) · Granola (Z) · Reviews (W) · HubSpot email (V)

## High-confidence themes
### Theme: <name>
**Confidence:** High · 4 sources · 12 mentions · weight A:3 B:7 C:2
**First seen:** 2026-04-08 · **Most recent:** 2026-04-25
**Quotes:**
> "verbatim quote one"
> — Company A, 2026-04-12 (Gong, weight A)

> "verbatim quote two"
> — Company B, 2026-04-19 (Slack, weight B)

[3-5 quotes total]

**Implication:** [one sentence on what this means for marketing/product/sales]

## Medium-confidence themes
[...]

## Watchlist (single-source, monitoring for repeats)
[...]
```

## OPERATIONAL RULES

- The 3-source rule is the whole point. Do not relax it because a single quote is interesting.
- "Independent source" means different channel. Two Gong calls = one source. One Gong + one Slack = two sources.
- Preserve verbatim quotes. The synthesis report is the input to `/voc-route`, which depends on exact phrasing.
- Always keep the dropped Low-confidence clusters in a separate file for traceability — that's how the system learns what eventually graduates from noise to signal.
