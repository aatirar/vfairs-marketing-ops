---
name: marketing-report
description: Generate a comprehensive, multi-source marketing performance report for vFairs by orchestrating analysis across Google Search Console, MQLs, Google Analytics, Google Ads, HubSpot, and SEMRush. Synthesizes all data into a high-calibre executive report with prioritized action items.
allowed-tools: Write, Read, Bash
disable-model-invocation: false
---

# Marketing Performance Report Orchestrator

You are a Chief Marketing Officer-level analyst. Your job is to orchestrate 6 specialized analysis subagents, collect their findings, and synthesize a comprehensive marketing performance report that reveals exactly what's working, what's broken, and what to fix first.

**vFairs context:**
- B2B SaaS in virtual + hybrid events
- 2026 Goal: $18.5M → $30M ARR, $10M new sales
- Marketing org: 8 pods led by the VP Marketing

---

## EXECUTION INSTRUCTIONS

### Phase 1: Delegate to All 6 Subagents

Invoke each of these subagents. You can run them in any order — they are independent:

1. **Use gsc-analyzer** — "Analyze Google Search Console performance for vFairs. Pull the last 28 days of query and page data, identify strike-distance pages, CTR gaps, competitor queries, and AEO opportunities. Write findings to outputs/gsc-analysis.md."

2. **Use mql-analyst** — "Run the MQL report script and analyze 2026 vs 2025 YTD MQL volume, meeting booking rates, top sources, and event types. Write findings to outputs/mql-analysis.md."

3. **Use ga4-analyst** — "Analyze Google Analytics 4 traffic for vFairs (property 269289033). Pull sessions by channel, top landing pages, and device/country breakdown for the last 30 days. Write findings to outputs/ga4-analysis.md."

4. **Use google-ads-auditor** — "Audit vFairs Google Ads account (customer ID 6191550310). Pull last 30 days of campaign, ad group, keyword, and search terms performance. Identify wasted spend, low QS keywords, and CTR underperformers. Write findings to outputs/ads-analysis.md."

5. **Use hubspot-researcher** — "Pull HubSpot pipeline data for vFairs. Analyze deals created in the last 30 days by stage and value, contact lifecycle distribution, and pipeline coverage ratio vs $10M new sales target. Write findings to outputs/hubspot-analysis.md."

6. **Use general-purpose subagent** (NOT semrush-analyst — it lacks ToolSearch and can't load deferred SEMRush tools) with this prompt: "You need to analyze SEMRush data for vfairs.com. FIRST: use ToolSearch with query 'semrush' to load the SEMRush MCP tools. Then use mcp__semrush__overview_research, mcp__semrush__organic_research, and mcp__semrush__backlink_research to pull domain overview, quick-win keywords (positions 4-20), competitor comparison, keyword gap, and backlink health. Write findings to outputs/semrush-analysis.md"

### Phase 2: Collect All Findings

After all 6 subagents complete, read their output files:
- `outputs/gsc-analysis.md`
- `outputs/mql-analysis.md`
- `outputs/ga4-analysis.md`
- `outputs/ads-analysis.md`
- `outputs/hubspot-analysis.md`
- `outputs/semrush-analysis.md`

Note any files that contain ERROR messages — flag those sections in the final report as "Data Unavailable."

### Phase 3: Synthesize the Report

**CRITICAL SYNTHESIS RULES:**
- Every finding must include specific numbers (not "traffic increased" — say "traffic increased 23% to 14,200 sessions")
- Cross-reference data across sources (e.g., if GA4 shows organic up but GSC shows impressions down — that's a signal worth flagging)
- Rank all action items by: (Impact on $30M ARR goal) × (Ease of implementation)
- Be direct about what's broken. Don't soften bad news.
- The final report must be actionable in the next 7 days, not just insightful.

**Cross-Channel Patterns to Hunt For:**
- Organic traffic up (GA4) but conversions down → landing page or offer problem
- Impressions up in GSC but CTR down → title/meta problem (correlate with GA4 organic sessions)
- MQL volume growing but meeting rate declining → lead quality or SDR problem
- Google Ads spend high with low conversions AND organic lagging → over-reliance on paid, organic needs investment
- SEMRush shows competitors gaining keywords vFairs ranks for → defensive content needed
- HubSpot pipeline thin but MQLs growing → qualification problem or sales velocity issue

### Phase 4: Write Final Report

Save the complete report to `outputs/marketing-report-[YYYY-MM-DD].md` using today's date.

---

## FINAL REPORT STRUCTURE

```markdown
# vFairs Marketing Performance Report
**Date:** [Date] | **Prepared by:** Claude Code | **Period:** Last 30 Days

---

## EXECUTIVE SUMMARY

### 🔴 Top 3 Things That Are Broken
1. **[Issue]:** [1 sentence with specific numbers] → Fix: [specific action]
2. **[Issue]:** [1 sentence with specific numbers] → Fix: [specific action]
3. **[Issue]:** [1 sentence with specific numbers] → Fix: [specific action]

### 🟢 Top 3 Things That Are Working
1. **[Win]:** [1 sentence with specific numbers] → Opportunity: [how to double down]
2. **[Win]:** [1 sentence with specific numbers] → Opportunity: [how to double down]
3. **[Win]:** [1 sentence with specific numbers] → Opportunity: [how to double down]

### Pipeline Health vs $10M Target
- On track / Behind / Ahead: [assessment with data]
- Biggest risk to hitting target: [specific finding]

---

## CHANNEL-BY-CHANNEL BREAKDOWN

### 1. Organic Search (GSC)
[Key metrics table: clicks, impressions, CTR, avg position vs previous period]
[Top 3 opportunities with specific pages/queries]
[Top 2 risks]
[Data source: outputs/gsc-analysis.md]

### 2. SEO Intelligence (SEMRush)
[Domain overview metrics]
[Top keyword opportunities (quick wins)]
[Competitor threat assessment]
[Backlink health]
[Data source: outputs/semrush-analysis.md]

### 3. Website Traffic (GA4)
[Key metrics: sessions, users, engagement rate vs previous period]
[Channel breakdown — what's growing, what's declining]
[Top performing and underperforming landing pages]
[Data source: outputs/ga4-analysis.md]

### 4. Lead Generation (MQLs)
[2026 vs 2025 YTD comparison table]
[Meeting booking rate trend]
[Top sources and event types]
[Run rate vs target]
[Data source: outputs/mql-analysis.md]

### 5. Paid Search (Google Ads)
[Spend, conversions, CPA overview]
[Wasted spend identified ($ amount)]
[Top optimization opportunities]
[Data source: outputs/ads-analysis.md]

### 6. CRM & Pipeline (HubSpot)
[Pipeline value and coverage ratio]
[Deal stage distribution]
[Lifecycle stage health]
[Pipeline coverage vs $10M target]
[Data source: outputs/hubspot-analysis.md]

---

## CROSS-CHANNEL INSIGHTS

[3-5 observations that only become visible when looking across multiple data sources simultaneously. These are the highest-value insights — the ones a siloed analyst would never find.]

Example format:
- **Organic-to-Pipeline Gap:** GSC shows [X] clicks to demo pages but HubSpot shows only [Y] deals created from organic. Conversion rate of [Z%] suggests [interpretation].

---

## PRIORITY ACTION PLAN

### This Week (Highest Impact)
| # | Action | Channel | Expected Impact | Owner |
|---|--------|---------|-----------------|-------|
| 1 | [Specific action] | [Channel] | [Estimated impact] | [Pod] |
| 2 | | | | |
| 3 | | | | |

### This Month
| # | Action | Channel | Expected Impact | Owner |
|---|--------|---------|-----------------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Strategic (Next Quarter)
[3 larger strategic initiatives worth resourcing]

---

## DATA AVAILABILITY

| Source | Status | Notes |
|--------|--------|-------|
| Google Search Console | ✅/❌ | |
| SEMRush | ✅/❌ | |
| Google Analytics 4 | ✅/❌ | |
| MQL Report | ✅/❌ | |
| Google Ads | ✅/❌ | |
| HubSpot | ✅/❌ | |

---

*Report generated by Claude Code Marketing Report Orchestrator*
*Individual channel analyses saved in outputs/ directory*
```

---

## ERROR HANDLING

If a subagent's output file is missing or contains an ERROR:
- Include the channel section in the report with "⚠️ Data Unavailable" note
- List what data was missing and why (from the error file)
- Do not skip the section — note the gap so it can be fixed

If all 6 subagents fail: tell the user which MCP servers need to be restarted before re-running.
