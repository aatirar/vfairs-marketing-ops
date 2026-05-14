# Playbooks

Multi-step or recurring workflows that the vFairs marketing team actually runs. Every playbook here is backed by recurring outputs in the repo — not aspirational chains.

The single-skill catalog is in [SKILLS.md](SKILLS.md). This file is where you go when you have a recurring *job* and need cadence + post-output guidance.

To propose a new playbook: it must already be a recurring workflow with evidence in `outputs/`. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 1. Daily morning briefing

**Trigger:** Every morning, M-F.

**Skill:** `/morning-report`

**What it does:** orchestrates several lookups in one command — MQL MTD + projection to EOM, Google Ads spend MTD + projected EOM, unread work email needing attention, today's calendar with Granola prep notes for each meeting, Slack tasks (in-progress / blocked / follow-up), and Slack campaigns (active).

**After it runs:**
- Triage the unread email list — what needs a reply today
- Note MQL projection vs target — if behind, ask the demand-gen pod why
- Note ad spend pacing — if overspending, flag to performance pod
- Read Granola prep notes before each meeting

**Result:** ~3 minutes of reading replaces ~30 minutes of dashboard-clicking. Start the day with the full picture.

**Cadence:** Daily.

**Evidence:** `outputs/daily-briefing-2026-04-28.md`, `daily-briefing-2026-04-29.md`, `daily-briefing-2026-04-30.md`.

---

## 2. Bi-weekly executive marketing report

**Trigger:** Bi-weekly, or before a leadership update.

**Skill:** `/marketing-report`

**What it does:** orchestrates 6 specialized subagents in parallel — `ga4-analyst`, `gsc-analyzer`, `mql-analyst`, `google-ads-auditor`, `hubspot-researcher`, plus a general-purpose agent for Semrush. Each writes findings to `outputs/<source>-analysis.md`. The main skill then synthesizes them into one executive narrative covering channel performance, organic search health, paid efficiency, pipeline health, and competitive context.

**After it runs:**
- Read the final report at `outputs/marketing-report-[date].md`
- Review the punch list of recommended actions at the end
- Share with leadership in `#marketing-leadership` Slack

**Result:** A single .md report that takes ~3-5 minutes to generate vs. ~half a day to assemble manually.

**Cadence:** Bi-weekly.

**Evidence:** `outputs/marketing-report-2026-02-23.md`, `marketing-report-2026-03-11.md`, `marketing-report-2026-03-31.md`, `marketing-report-2026-04-14.md`.

---

## 3. Monthly Google Ads performance audit

**Trigger:** First Monday of the month, or before a paid-spend reallocation conversation.

**Skill:** `/google-ads-audit`

**What it does:** queries Google Ads API for the last 30 days of campaign, ad group, keyword, and search-term performance. Identifies wasted spend, low-CTR ad groups, keywords with QS < 6, and underperforming search terms. Generates recommendations.

**After it runs:**
- Pause keywords and search terms flagged as wasted spend
- Review low-QS keywords with the performance pod
- Reallocate budget per the recommendation
- Compare to previous month's audit to track trajectory

**Result:** Concrete punch list of paused/optimized items, with quantified wasted-spend savings. Output at `outputs/vfairs/google-ads-audit-[date].md`.

**Cadence:** Monthly.

**Evidence:** `outputs/vfairs/google-ads-audit-2026-02-19.md`, `google-ads-audit-2026-02-26.md`, `google-ads-audit-2026-03-31.md`, `google-ads-audit-2026-04-14.md`.

---

## 4. Weekly Gong call analysis

**Trigger:** Monday morning. Reviews last week's prospect calls.

**Sequence:**
1. `/fetch-gong-calls` — pulls the last 7 days of Gong calls (recordings, metadata, transcripts, AI summaries) into `outputs/gong/` with one file per call + an index file `index-[date].md`
2. `/gong-weekly-analysis` — reads the index, filters short calls, classifies Prospect vs. Customer by title + summary, spawns parallel subagents to read prospect transcripts and extract personas, pain points, objections, competitive mentions, feature requests, and quotes

**After it runs:**
- Skim the weekly intelligence report for patterns
- Surface competitive mentions to the GTM pod
- Hand feature requests to PM via VoC routing (see playbook 5)
- Flag objections that map to specific landing-page weak spots

**Result:** A weekly intelligence report identifying recurring themes that show up across 3+ prospect calls.

**Cadence:** Weekly (Monday).

**Evidence:** 18 weekly index files in `outputs/gong/` from `index-2026-01-07.md` through `index-2026-05-04.md`.

---

## 5. Voice of Customer cycle

**Trigger:** End of week or end of month. You want to convert customer + prospect signals into routed action items.

**Sequence (the canonical 4-step chain — each skill's description explicitly references the next):**
1. `/voc-profiler` — enrich a raw VoC signal (a Gong quote, Slack complaint, review) with HubSpot context: ICP fit score, account segment, ARR tier, deal stage, renewal date. Flags missing metadata so weighted decisions never run on anonymous noise
2. `/voc-synthesize` — cross-reference profiled signals across Gong, Slack, Granola, HubSpot emails, and public reviews. Surface only patterns confirmed by 3+ independent sources (or 1 source with weight tier A). Output a confidence-ranked theme list with verbatim quotes preserved
3. `/voc-route` — for each theme, decide its destination: testimonial queue, case-study leads, marketing objection map (mapped to website pages), product feedback intake, or executive memo. Output routing decisions with the verbatim quotes and account context attached
4. `/voc-dispatch` — generate the actual artifacts: case-study outreach emails, copy briefs for landing-page updates, PM one-pagers with verbatim quotes, the weekly executive memo

**After it runs:**
- Send the case-study outreach emails
- Hand copy briefs to the content pod for landing-page updates
- Send PM one-pagers to product
- Distribute the exec memo

**Result:** Raw call quotes turn into concrete deliverables for the right team — without re-doing the analysis at each handoff.

**Cadence:** Weekly or bi-weekly.

**Evidence:** The 4 skills are designed as a pipeline (each description references the next).

---

## 6. Landing page deep audit + rewrite

**Trigger:** A page is underperforming on CVR or organic traffic, or it hasn't been touched in 6+ months.

**Sequence:**
1. `/landing-page-review <URL>` — deep audit with commercial intent analysis, ICP definition, ICP pain research, 4-competitor scrape (Cvent, Bizzabo, Accelevents, EventsMobi by default), Ahrefs keyword + long-tail question research, full H1/H2/H3 audit with rewrite table (3 alternatives per element using Feature-Capability-Benefit structure). Outputs both `.md` report and `.xlsx` rewrite tracker
2. `/re-write <URL>` — generates the rewrite of every heading AND every body bullet using Ahrefs SEO/AEO data + vFairs voice rules. Single inline rewrite table with verdict (Let it be / Rewrite) and rewrites where needed

**After it runs:**
- Pick the rewrites both audits agreed on
- Hand the `.xlsx` rewrite tracker to the copy + design pods
- Track status (Not Started / In Review / Approved / Live) in the tracker
- After deploy, monitor GSC + GA4 for ranking + CVR movement

**Result:** Production-ready rewrite table per page that copywriters can hand to design without re-research.

**Cadence:** Ad hoc — typically batch a set of high-traffic pages quarterly.

**Evidence:** `outputs/landing-page-rewrites/` has 10+ rewrite payloads (`conference-management-new.md`, `event-management-platform-new-b-payload.json`, etc.); `outputs/vfairs/landing-page-reviews/` has paired `.md` + `.xlsx` outputs from late April including `h1-batch-review-2026-04-29.{md,xlsx}`, `h2-batch-review-2026-04-29.{md,xlsx}`, `features-pages-copy-2026-04-30.{md,xlsx}`.

---

## 7. Marketing debt audit

**Trigger:** Weekly Friday, or whenever product velocity feels ahead of marketing communication.

**Skill:** `/audit-debt`

**What it does:** pulls product releases from Slack channel `C0297H29Q8Y` (last 7 days), pulls Granola meeting notes matching "Pod [N]" or "Product Updates" titles, pre-classifies each item's significance (skip / high / evaluate), maps each significant feature to affected marketing pages using a module→pages lookup table, scrapes each affected page via Tavily for content gaps, researches competitor positioning across 8 competitors (Cvent, Bizzabo, Accelevents, Whova, Swapcard, Rainfocus, EventsAir, Eventify), proposes messaging using Anthony Pierri's outcome-led principles. Writes all action items to `outputs/vfairs/audit-debt-items.json` and creates a formatted Google Sheet (18 columns, dropdowns, color-coded significance).

**After it runs:**
- Open the generated Google Sheet
- Assign each row to an owner (content pod, performance pod, PM pod)
- Track status: Not Started / In Progress / Done

**Result:** Every product release that should drive marketing change is captured, prioritized, and assigned — nothing falls through the cracks.

**Cadence:** Weekly.

**Evidence:** `outputs/vfairs/audit-debt-items.json` exists; skill orchestration documented in `.claude/skills/audit-debt/skill.md`.

---

## 8. Account-specific sales pitch

**Trigger:** Before a high-value sales meeting with a target account.

**Skill:** `/sales-pitch "<Company>" "<use case>"`

**What it does:** researches the company's industry profile and common event tech pain points via Tavily, checks Gong transcripts and Granola for prior interactions with that account, reads `context/company/about.md`, `marketing-strategy.md`, and `pricing.md` for reference material, builds a 10-slide pitch deck using Challenger Sale + SPIN Selling framework, saves to `outputs/vfairs/sales-pitches/[company-slug]-[date].md`, and publishes to Gamma.

**After it runs:**
- Review the generated deck
- Send the Gamma link to the rep who'll deliver the pitch
- Note any prior-interaction context the rep should know

**Result:** A tailored 10-slide pitch deck in ~5 minutes vs. ~2 hours by hand.

**Cadence:** Ad hoc — per account.

**Evidence:** `outputs/vfairs/sales-pitches/peloton-2026-03-16.md`, `pima-medical-institute-2026-03-17.md`.

---

## Tips for chaining skills

- **Save artifacts to `outputs/`** — every skill that generates a report writes there. The next skill in the chain reads from there. No copy-paste needed.
- **Parallelize where possible** — when skills don't depend on each other, kick them off in parallel by asking Claude Code to run them simultaneously.
- **Verify first** — after a creds change, always re-run `npm run verify` before starting a playbook.
- **Promote a workflow to a playbook** — if you've run a chain 3+ times and have outputs to show for it, add it here. See [CONTRIBUTING.md](CONTRIBUTING.md).
