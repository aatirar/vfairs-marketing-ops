# Playbooks

Multi-skill workflows. The single-skill catalog is in [SKILLS.md](SKILLS.md); this file is where you go when you have a *job* to do (weekly report, launch prep, new landing page) and need to know which skills to chain together and in what order.

Each playbook lists the trigger situation, the skill sequence, what to expect, and where the artifacts land.

---

## 1. Weekly marketing report

**Trigger:** Monday morning, or before a leadership update.

**Sequence:**
1. `/morning-report` — get the headline numbers for the day (MQLs MTD, ads spend MTD, calendar)
2. `/marketing-report` — full executive cross-source analysis (orchestrates 6 subagents: GA4, GSC, Google Ads, MQL, HubSpot, Semrush). Takes ~3-5 minutes
3. Review the generated report at `outputs/marketing-report-[date].md`
4. (Optional) Share with leadership in #marketing-leadership Slack channel

**Result:** A single .md report with headline metrics, channel performance, organic search health, paid efficiency, pipeline health, and competitive context. Plus a punch list of recommended actions.

**Cadence:** Weekly (Monday) or bi-weekly.

---

## 2. New landing page — research to publish

**Trigger:** A new feature, solution, or product page needs to ship.

**Sequence:**
1. `/page-builder "convention management software"` — research-backed brief: keyword data, top-3 competitor scrape, vFairs capability mapping, full page architecture, FAQs, CTAs
2. `/write-landing-page` — the actual page copy (H1, sub-head, all sections, body bullets)
3. Hand draft to product marketer or designer to build in WordPress / CMS
4. Once live: `/landing-page-review https://vfairs.com/new-page` — deep audit with rewrite table (catches anything the FCB structure missed)
5. `/schema-markup add FAQ schema to /new-page` — get rich-snippet eligible
6. `/ab-test-setup test new H1 on /new-page` — set up an experiment before declaring victory

**Result:** Production-ready page copy + schema + an experiment plan. ~2-3 hours end-to-end (mostly waiting for skill runs).

---

## 3. Audit and refresh an existing landing page

**Trigger:** A page is underperforming, or hasn't been touched in 6+ months.

**Sequence:**
1. `/landing-page-review https://vfairs.com/...` — deep audit with H1/H2/H3 rewrite table, competitor positioning, ICP pain validation
2. `/re-write https://vfairs.com/...` — generates the rewrite of every heading AND every bullet using Ahrefs SEO/AEO data and vFairs voice
3. `/page-cro https://vfairs.com/...` — section-by-section conversion analysis with experiment ideas
4. Prioritize: pick 3 changes that the rewrite + CRO analyses agreed on
5. `/ab-test-setup` — design the experiment to measure them

**Result:** Concrete rewrite table marketers can hand to copy + design + dev. Experiment plan to validate it.

---

## 4. Competitive intelligence sweep

**Trigger:** Quarterly competitor check, or when leadership asks "what are [Cvent / Bizzabo / Whova] doing?"

**Sequence:**
1. `/linkedin-ads-review Cvent` — last 30 days of LinkedIn ads with messaging analysis
2. `/linkedin-ads-review Bizzabo`
3. `/linkedin-ads-review Whova`
4. `/review-intel` for vFairs + the same 3 competitors — what real buyers say about each on G2, Capterra, Trustpilot
5. `/llm-checks` for "virtual event platform" — where vFairs ranks in ChatGPT/Perplexity answers vs competitors
6. Synthesize: where are we losing? Where are we winning? What's the messaging gap?

**Result:** A competitive intelligence brief covering ad strategy, review sentiment, AEO visibility, and copy gaps. Use to inform Q+1 messaging and roadmap conversations.

**Cadence:** Quarterly.

---

## 5. Voice of Customer cycle (Gong → action)

**Trigger:** End of week. You want to convert this week's customer + prospect signals into action.

**Sequence:**
1. `/fetch-gong-calls` — pull the last 7 days of Gong calls
2. `/gong-weekly-analysis` — extract themes, personas, pains, objections, competitive mentions, feature requests, quotes
3. For each notable signal: `/voc-profiler` — enrich with HubSpot context (ICP fit, ARR, deal stage)
4. `/voc-synthesize` — surface only patterns confirmed by 3+ sources
5. `/voc-route` — for each theme, decide its destination (testimonial, case study, marketing-objection map page, PM feedback intake, exec memo)
6. `/voc-dispatch` — generate the actual artifacts (outreach emails, copy briefs, one-pagers, weekly memo)

**Result:** A weekly exec memo with verbatim quotes + account context, plus action items routed to the right team. Marketers know what to fix in copy; PMs know what to fix in product.

**Cadence:** Weekly.

---

## 6. New whale prospect engagement

**Trigger:** Quarterly whale prospect campaign, or you spot a hand-raiser in a high-ARR account.

**Sequence:**
1. `/find-whales` — refresh the whale list ($50M+ revenue, ICP 60+)
2. `/whale-board` — see current state: who's active, who's stalled, who needs attention
3. For each target: search Gong for prior interactions
4. `/sales-pitch "<company>" "<their event use case>"` — generates a tailored 10-slide pitch deck. Outputs to `outputs/sales-pitches/` and publishes to Gamma
5. Send the Gamma link + a personalized email to your sales counterpart
6. Track the response in Slack `#whale-engagement`

**Result:** A personalized 10-slide pitch deck per target account in ~5 minutes per company, vs ~2 hours by hand.

---

## 7. Daily marketing ops

**Trigger:** Every morning, M-F.

**Sequence:**
1. `/morning-report` — get your daily briefing in one command:
   - MQLs MTD + projection to EOM
   - Google Ads spend MTD + projected EOM
   - Unread email from `aatir@vfairs.com` (or your vFairs email) that needs attention
   - Today's calendar
   - Slack: your in-progress tasks + active campaigns
   - Granola prep notes for each meeting today
2. Address the action items surfaced
3. (Optional) `/slack-campaigns active` to dive deeper into the campaign tracker

**Result:** ~3 minutes of reading vs 30 minutes of clicking through dashboards. Start the day with the full picture.

**Cadence:** Daily.

---

## 8. SEO triage and fix

**Trigger:** Traffic dropped, rankings tanked, or you have 1 hour to find quick wins.

**Sequence:**
1. `/search-console-audit quick` — 15-minute triage (security, index coverage, top 20 pages, crawl stats, position movements)
2. For each problem page identified: `/seo-audit https://vfairs.com/...` (technical + on-page check)
3. `/re-write https://vfairs.com/...` for the highest-traffic page that's underperforming
4. `/schema-markup` if rich-snippet eligibility is missing
5. (Optional) Build `/programmatic-seo` pages if you have a keyword gap with high search volume but no targeted page

**Result:** A prioritized punch list of SEO fixes. Quick wins (CTR optimization, schema, internal linking) ship the same week; deeper rewrites take 2-3 weeks.

**Cadence:** Quarterly deep dive, monthly quick triage.

---

## 9. Launch prep

**Trigger:** A new feature, product, or major release is 4-6 weeks out.

**Sequence:**
1. `/launch-strategy <feature name>` — phased launch plan (beta → soft launch → full launch → ongoing momentum), channel strategy, success metrics
2. `/audit-debt` — pull recent product releases from Slack + Granola, identify what marketing should be communicating
3. `/copywriting` — write the launch homepage, feature page, blog announcement, email, social posts
4. `/ad-replicator vFairs` — generate launch ad creatives based on what's working in the category
5. `/email-sequence launch announcement to existing customers`
6. `/social-content launch posts for LinkedIn + X`

**Result:** A complete launch plan with copy, creative, and channel coverage. Hand off to each pod.

---

## 10. Pricing or packaging change

**Trigger:** Pricing review, new tier, or repackaging existing tiers.

**Sequence:**
1. `/pricing-strategy for new tier` — research-backed recommendations (Van Westendorp, willingness-to-pay analysis, competitor landscape)
2. `/page-cro https://vfairs.com/pricing` — audit current pricing page conversion
3. `/copywriting rewrite of pricing page` — new tier copy + section restructuring
4. `/paywall-upgrade-cro` if there are in-product upgrade paths to update
5. `/ab-test-setup` — design the A/B test before flipping live

**Result:** A defensible pricing recommendation + updated pricing-page copy + experiment plan.

---

## Tips for chaining skills

- **Save artifacts to `outputs/`**: Every skill that generates a report writes to `outputs/`. The next skill in the chain can read from there. No copy-paste needed.
- **Parallelize where possible**: When skills don't depend on each other (e.g. running `/linkedin-ads-review` for 3 competitors), kick them off in parallel by asking Claude Code to do so.
- **Trust the verify**: After installs or credential changes, always re-run `npm run verify` before starting a playbook. Saves time chasing connection errors mid-flow.
- **Build your own**: Every team has unique workflows. If you find yourself chaining 3+ skills together regularly, add it here. See [CONTRIBUTING.md](CONTRIBUTING.md).
