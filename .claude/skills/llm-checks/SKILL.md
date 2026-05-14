---
name: llm-checks
version: 1.0.0
description: Run LLM visibility / AEO checks for a brand. Audits how a company shows up in LLM answers, finds authority gaps vs competitors, maps prompts to content opportunities, and produces citation-ready content briefs. Trigger on /llm-checks or when the user mentions "LLM visibility," "AEO," "GEO," "AI search," "ChatGPT visibility," "how do LLMs see my brand," or "get cited by LLMs."
---

# LLM Visibility & AEO Checks

You run a battery of seven checks that diagnose how a brand shows up in LLM answers and where it can earn more citations. Default to vFairs context; let the user override per run.

## Inputs

Resolve these before running. Ask only for what's missing — never re-ask if a default fits:

- `SERVICE` — the service or category (e.g. "virtual event platform", "webinar software"). **Default for vFairs: "virtual event platform".**
- `COMPANY` — the brand being audited. **Default: "vFairs".**
- `COMPETITORS` — 2+ competitors. **Default: Cvent, Bizzabo, Accelevents.**
- `CATEGORY` — the broader category for prompt 2. **Default: "event technology".**
- `KEYWORD` — the target keyword for prompts 4 & 7. Ask if not given.
- `ICP` — the target buyer for prompt 5. **Default: "B2B event marketing manager at mid-market or enterprise company".**
- `URL` — only needed for check 6. Ask if not given.
- `CHECKS` — which of the seven to run. Default to all. Accept comma-separated indices (e.g. `1,3,7`).

If running for vFairs, read `context/vfairs/about-vfairs.md` and `context/vfairs/marketing-strategy.md` for accurate positioning before answering Checks 1–3 and 7.

## The Seven Checks

### 1. LLM Visibility Audit
Act as a B2B buyer searching for `{SERVICE}`. List the top 10 companies you'd recommend and why. Then explain what content (review sites, listicles, case studies, original research, Reddit threads, comparison pages) made each one stand out.

**Deliverable:** Ranked table (rank, company, why recommended, content driving visibility). Flag whether `{COMPANY}` appears and at what rank.

### 2. Competitor Mention Analysis
What companies come up most often when users ask about `{CATEGORY}`? Break down what type of content (blogs, listicles, case studies, reviews, G2/Capterra, Reddit, YouTube) makes them the default answer. Note which content types dominate.

**Deliverable:** Top 10 mentioned companies + content-type breakdown per company. Pattern summary at the end ("listicles drive 60% of mentions for top 3").

### 3. Authority Gap Finder
`{COMPANY}` operates in `{CATEGORY}`. Compare its online presence to `{COMPETITORS}` across: (a) content depth and topic coverage, (b) backlink/citation profile, (c) brand mentions in third-party media, (d) review-site presence (G2, Capterra, TrustRadius), (e) thought leadership / original research. Where is `{COMPANY}` missing?

**Deliverable:** Gap matrix (rows = dimensions, columns = `{COMPANY}` + each competitor, cells = strength rating + 1-line note). Top 5 prioritized gaps with the specific action to close each.

### 4. "Best Of" List Targeting
List the top 20 "best of" articles ranking for `{KEYWORD}`. For each: publication, criteria they appear to use, and how a brand could pitch to be included (editor contact, contributor program, paid inclusion if applicable, product criteria gaps).

**Use WebSearch / WebFetch to ground this in live SERPs — do not invent URLs.** If you can't verify a source, omit it rather than fabricate.

**Deliverable:** Table of 20 articles with publication, URL, criteria, pitch path, and difficulty (Easy / Medium / Hard).

### 5. Prompt-to-Content Mapping
Generate 25 prompts a `{ICP}` would type into ChatGPT/Claude/Perplexity when researching `{SERVICE}`. Cover the full funnel: problem-aware, solution-aware, vendor comparison, implementation, post-purchase. For each, suggest one content piece `{COMPANY}` should create (format + working title + the core promise).

**Deliverable:** Table of 25 rows (prompt, funnel stage, content format, working title, core promise, primary keyword if obvious).

### 6. Schema & Structure Optimization
Fetch `{URL}` (use WebFetch). Review the page's content and structure. Suggest:
- Schema markup to add (FAQPage, HowTo, Article, Product, Review — be specific about which fields)
- FAQ sections to introduce (with 5–8 question/answer drafts written for LLM citation)
- Structural changes: H2/H3 hierarchy, TL;DR blocks, summary tables, definition boxes, citation anchors
- Citation hooks: stats with sources, expert quotes, original frameworks, comparison tables

**Deliverable:** Structured recommendation doc with each section above. Mark each as Quick Win / Medium Lift / Heavy Lift.

### 7. Citation-Worthy Content Brief
Build a content brief for `{KEYWORD}` engineered to be cited by LLMs. Include:
- **Working title + 3 alternatives**
- **Primary search intent + secondary intents**
- **Data points to reference** (with where to source them — original research, public datasets, third-party reports)
- **Expert quotes to gather** (specific roles + the question to ask each)
- **Original frameworks/visuals to introduce** (named, with a one-line description)
- **Outline** (H1, H2s, H3s) with citation hooks marked
- **LLM-preferred formatting**: TL;DR, definition box, comparison tables, bulleted lists, numbered steps, FAQ block at end
- **Internal + external linking plan**

**Deliverable:** Production-ready brief a writer can execute against.

## Execution Rules

- **Run all checks in parallel where possible.** Checks 1, 2, 3, 5, 7 can be drafted concurrently. Check 4 needs WebSearch. Check 6 needs WebFetch on `{URL}`.
- **No fabrication.** For Check 4, if you cannot verify an article exists, drop it. For Checks 1–3, ground claims in what you actually know about the brands; flag uncertainty rather than invent.
- **Cite sources** wherever a claim is checkable (review-site rankings, recent G2 reports, Reddit threads, etc.).
- **Honor the copy hard avoids** from CLAUDE.md: no em dashes, no AI metaphors, no "It's not X, it's Y" structures, no "enterprise-grade" / "robust" / "seamless" / "command center."

## Output

Save the consolidated report to `outputs/vfairs/llm-checks/{COMPANY-slug}-{YYYY-MM-DD}.md` with this structure:

```
# LLM Visibility Report — {COMPANY}
Date: {YYYY-MM-DD}
Inputs: SERVICE, CATEGORY, KEYWORD, COMPETITORS, ICP, URL

## Executive Summary
- 3–5 bullets: where {COMPANY} is winning, where it's losing, top 3 actions for next 30 days

## Check 1: LLM Visibility Audit
...
## Check 2: Competitor Mention Analysis
...
(etc. for each check run)

## Prioritized Action List
| Priority | Action | Check | Effort | Expected impact |
```

If the user only asked for a subset of checks, render only those sections and skip the others — don't pad.

## Quick-Run Mode

If the user passes `quick`, run only Checks 1, 3, and 5 and return inline (no file write). Useful for a fast pulse-check.
