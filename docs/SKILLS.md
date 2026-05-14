# Skills Catalog

Every slash-command skill in vFairs Marketing OS, organized by what marketers actually do.

**Conventions:**
- Skills are invoked in Claude Code with `/skill-name` or by describing what you want to do.
- "Prereqs" lists which credentials must be in `.env` (or service account) for the skill to work. Run `npm run verify` if unsure.
- "Example" is what you'd type to trigger the skill.

---

## ⚡ Setup & meta

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/onboarding` | Interactive setup wizard. Detects your OS, runs installs, walks you through credentials, verifies every connection | First time setting up the repo on your machine | None — it sets up everything | `/onboarding` |
| `/product-marketing-context` | Generates `.claude/product-marketing-context.md` with positioning, ICP, voice. Other skills load it automatically | Once at the start, plus whenever your positioning shifts | None | `/product-marketing-context` |
| `/update-config` | Configure Claude Code settings (hooks, permissions, env vars) via `settings.json` | When the harness needs tweaking | None | `/update-config allow npm commands` |
| `/fewer-permission-prompts` | Scans recent transcripts and adds common read-only Bash/MCP calls to the project allowlist | When you're tired of approving the same tool calls | None | `/fewer-permission-prompts` |

---

## 📊 Reporting (live data)

The reporting skills pull live data from HubSpot, GA4, Google Ads, Search Console, and Gong.

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/morning-report` | Daily briefing: MQL MTD + projection, Google Ads spend MTD + projected EOM, unread work email, today's calendar, Slack tasks + campaigns, Granola prep notes for each meeting | Every morning, first thing | All shared creds + personal Slack + Workspace OAuth | `/morning-report` |
| `/mql-report` | Live 2026 vs 2025 YTD MQL comparison: volume, sources, meeting rates, event types | Weekly or whenever leadership asks | GA4 service account + Google Sheets access | `/mql-report` |
| `/google-ads-audit` | Full Google Ads performance analysis: wasted spend, low CTRs, keyword quality scores, search-term wasteful matches, budget reallocation recommendations | Monthly or before a budget review | `GOOGLE_ADS_*` env vars + developer token | `/google-ads-audit` |
| `/search-console-audit` | World-class GSC audit: query intelligence, page performance, CTR gaps, strike-distance pages, AEO/GEO opportunities, technical health | Monthly. Use `quick` for 15-min triage | `google-credentials.json` + GSC property access | `/search-console-audit` or `/search-console-audit quick` |
| `/marketing-report` | Cross-source executive marketing report. Orchestrates ga4-analyst, gsc-analyzer, mql-analyst, google-ads-auditor, hubspot-researcher, semrush subagents in parallel | Bi-weekly or before a board meeting | All shared API creds | `/marketing-report` |

---

## ✍️ Content & copy

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/copywriting` | Write copy for any vFairs page (homepage, feature, pricing, about). Loads `context/messaging/voice.md` automatically | Whenever a new page is briefed | None (works offline) | `/copywriting write a feature page for "speaker management"` |
| `/copy-editing` | Review and improve existing copy via multiple focused passes (clarity, voice, jargon, structure) | When you have a draft and want sharper output | None | `/copy-editing` then paste the draft |
| `/write-landing-page` | Full landing page workflow: keyword research → competitor scrape → top-of-page audit → vFairs capability mapping → full copy. Outputs production-ready `.md` | Building a new feature/product/solution page | Ahrefs + Semrush + Tavily | `/write-landing-page "speaker management software"` |
| `/page-builder` | Comprehensive page brief for a vFairs solution/product/feature/industry page. Includes H1, H2 sections, FAQs, CTAs, all body copy | Same as write-landing-page; choose based on the structure you prefer | Ahrefs + Tavily | `/page-builder "convention management software"` |
| `/landing-page-review` | Deep URL-driven audit with competitive intent analysis, ICP definition, 4-competitor scrape, Ahrefs research, full H1/H2/H3 audit with rewrite table | Auditing an existing landing page | Ahrefs + Tavily + URL access | `/landing-page-review https://vfairs.com/...` |
| `/landing-page-review-quick` | Fast review using Anthony Pierri + April Dunford frameworks. Screenshot or pasted copy only | When you want a 5-minute critique | None | `/landing-page-review-quick` + paste screenshot |
| `/re-write` | Rewrite the entire H-hierarchy AND body bullets of a vFairs page using Ahrefs SEO/AEO data and vFairs voice rules. Single inline rewrite table | Improving an existing live page | Ahrefs + URL access | `/re-write https://vfairs.com/...` |
| `/email-sequence` | Build nurture, onboarding, re-engagement, or lifecycle email sequences | Setting up a new email program | None | `/email-sequence onboarding for trial users` |
| `/social-content` | Create or repurpose social content (LinkedIn, X, IG, Facebook). Platform-specific best practices | When the social pod needs content | None | `/social-content LinkedIn post about our new feature` |

---

## 🎯 CRO (conversion rate optimization)

| Skill | What it does | When | Example |
|---|---|---|---|
| `/page-cro` | Optimize any page (homepage, landing, pricing, feature, blog) for conversion | Page underperforming | `/page-cro https://vfairs.com/pricing` |
| `/signup-flow-cro` | Optimize signup, registration, or trial activation flows | Signup conversion dropping | `/signup-flow-cro` |
| `/onboarding-cro` | Optimize post-signup activation, first-run experience, time-to-value | Activation rate too low | `/onboarding-cro` |
| `/form-cro` | Optimize lead capture, contact, demo request, or application forms | High form abandonment | `/form-cro https://vfairs.com/get-quote` |
| `/popup-cro` | Create or optimize popups, modals, exit intent, slide-ins | When you want an overlay | `/popup-cro newsletter signup` |
| `/paywall-upgrade-cro` | In-product paywalls, upgrade screens, upsell modals, feature gates | Free→paid conversion | `/paywall-upgrade-cro` |
| `/ab-test-setup` | Design statistically valid A/B tests with sample sizes, success metrics, hypotheses | Before launching any experiment | `/ab-test-setup test new H1 on /pricing` |
| `/analytics-tracking` | Set up GA4 events, GTM tags, conversion tracking, UTM schemes | Implementing tracking | `/analytics-tracking set up demo signup events` |

---

## 🔍 SEO

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/seo-audit` | Diagnose SEO issues on a page or site (technical, on-page, content) | Why isn't this ranking? | Ahrefs | `/seo-audit https://vfairs.com/...` |
| `/programmatic-seo` | Build SEO pages at scale using templates + data (location, comparison, integration pages) | Need 50+ similar pages | None | `/programmatic-seo location pages for event tech in [city]` |
| `/schema-markup` | Add or fix JSON-LD structured data (FAQ, Product, Review, Breadcrumb, etc.) | Want rich snippets | None | `/schema-markup add FAQ schema to /pricing` |
| `/llm-checks` | Audit how vFairs (or any brand) appears in LLM answers, find authority gaps vs competitors, generate citation-ready content briefs | Quarterly. AEO/GEO audit | Tavily + web access | `/llm-checks for "virtual event platform"` |

---

## 📣 Paid + acquisition

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/paid-ads` | Strategy, creative, audience targeting, optimization across Google, Meta, LinkedIn, X | New campaign or optimization | None | `/paid-ads LinkedIn campaign for enterprise buyers` |
| `/ad-replicator` | Find top competitors → scrape their LinkedIn ads → pick 3 strongest → generate brand-adapted versions via Gemini | Need ad creative fast | Apify + Gemini | `/ad-replicator vFairs` |
| `/linkedin-ads-review` | Scrape a competitor's LinkedIn ads from last 30 days, produce competitive intelligence report (architecture, messaging, funnel, strategic implications) | Quarterly competitive scan | Apify | `/linkedin-ads-review Cvent` |
| `/launch-strategy` | Plan a product launch, feature announcement, or release — phased approach, channel strategy, ongoing momentum | New launch | None | `/launch-strategy mobile app launch` |
| `/referral-program` | Design, optimize, or analyze a referral / affiliate / partner program | Building word-of-mouth | None | `/referral-program for existing customers` |

---

## 🐋 Sales enablement

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/sales-pitch` | Build a tailored 10-slide vFairs pitch deck for a target account. Researches industry, checks Gong for prior interactions, publishes to Gamma | Before a high-value pitch | Tavily + Gong + Gamma | `/sales-pitch "Salesforce" "annual conference"` |
| `/find-whales` | Scan MQL data + HubSpot to identify high-value whale prospects ($50M+ revenue, ICP 60+). Adds new whales to tracking | Weekly or monthly | HubSpot + shared MQL Sheet + Google Sheets API | `/find-whales` |
| `/whale-board` | Fantasy-league-style leaderboard for whale prospects: health scores, deal progression, stalled-opportunity highlights | Weekly check-in | HubSpot + whale-tracker.json synced | `/whale-board` |

---

## 🗣️ Voice of Customer (VoC)

These 4 skills run as a chain. Profile → synthesize → route → dispatch.

| Skill | What it does | When | Example |
|---|---|---|---|
| `/voc-profiler` | Enrich a raw VoC signal (a Gong quote, Slack complaint, review) with HubSpot context: ICP fit, account segment, ARR tier, deal stage, renewal date | Step 1 of VoC analysis | `/voc-profiler` + paste the signal |
| `/voc-synthesize` | Cross-reference profiled signals across Gong, Slack, Granola, HubSpot emails, public reviews. Surface only patterns confirmed by 3+ independent sources | Step 2 — finding real themes | `/voc-synthesize` |
| `/voc-route` | Take synthesized themes and route each one to its destination (testimonials, case-study leads, marketing-objection map, product feedback, exec memo) | Step 3 — turning insight into action | `/voc-route` |
| `/voc-dispatch` | Generate the actual artifacts: case-study outreach emails, copy briefs for landing pages, PM one-pagers, weekly exec memo | Step 4 — produce deliverables | `/voc-dispatch` |
| `/review-intel` | Scrape G2, Capterra, Trustpilot reviews for vFairs and competitors. Generate messaging-intelligence brief (ICP language, switching triggers, copy-ready phrases) | Quarterly. Inform copy + positioning | `/review-intel for vFairs + Cvent + Bizzabo` |

---

## 🎙️ Gong call intelligence

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/fetch-gong-calls` | Fetch the last 7 days of Gong calls (recordings, metadata, transcripts, AI summaries) into `outputs/gong/` | Monday mornings | Gong shared key | `/fetch-gong-calls` |
| `/fetch-gong-range` | Fetch a specific date range. Use for historical backfill | One-off backfill jobs | Gong shared key | `/fetch-gong-range 2026-01-01 2026-01-31` |
| `/gong-weekly-analysis` | Analyze this week's prospect calls. Classify Prospect vs Customer, spawn parallel subagents to extract personas, pains, objections, competitive mentions, feature requests. Weekly intelligence report | Monday after `/fetch-gong-calls` | Gong files synced | `/gong-weekly-analysis` |
| `/gong-ytd-analysis` | Year-to-date call intelligence. Classifies all calls across all fetched index files. Two reports: prospect intel + customer insights | Quarterly | All Gong files synced | `/gong-ytd-analysis` |

---

## 🤖 Slack + ops automation

| Skill | What it does | When | Prereqs | Example |
|---|---|---|---|---|
| `/slack-campaigns` | Query the Campaign Tracker Slack channel — filter by status, owner, keyword. Shows all campaigns with assigned owners and metadata | Weekly campaign review | Personal Slack token | `/slack-campaigns active` |
| `/audit-debt` | Pull product releases from Slack + Granola, evaluate marketing significance, map to affected pages, scrape pages for content gaps, research competitor positioning, propose Pierri-style messaging, push to a new Google Sheet | Weekly Friday | Personal Slack + Tavily + Sheets | `/audit-debt` |

---

## 🧠 Strategy & psychology

| Skill | What it does | When | Example |
|---|---|---|---|
| `/content-strategy` | Plan content topics, clusters, and editorial calendar | Quarterly content planning | `/content-strategy for ICP: HR directors` |
| `/competitor-alternatives` | Build competitor comparison / alternative / "vs" pages | Need vs/alternative pages | `/competitor-alternatives vFairs vs Cvent` |
| `/pricing-strategy` | Pricing decisions, tier structure, packaging, freemium, Van Westendorp, willingness to pay | Pricing review | `/pricing-strategy for enterprise tier` |
| `/free-tool-strategy` | Plan, evaluate, or build a free tool for lead-gen, SEO, or brand | Engineering-as-marketing idea | `/free-tool-strategy event ROI calculator` |
| `/marketing-ideas` | 139 proven marketing approaches organized by category. Use when stuck | Need inspiration | `/marketing-ideas for top-of-funnel awareness` |
| `/marketing-psychology` | Apply 70+ mental models / cognitive biases to marketing | Persuasion / messaging work | `/marketing-psychology to improve pricing page conversions` |

---

## 🔗 Quick reference: most-used skills by role

**Daily, every marketer:** `/morning-report`

**Performance marketing pod:** `/google-ads-audit`, `/paid-ads`, `/page-cro`, `/landing-page-review`, `/ab-test-setup`

**SEO / content pod:** `/search-console-audit`, `/re-write`, `/write-landing-page`, `/programmatic-seo`, `/llm-checks`, `/schema-markup`

**Product marketing pod:** `/copywriting`, `/launch-strategy`, `/competitor-alternatives`, `/audit-debt`, `/sales-pitch`

**Sales enablement / GTM pod:** `/find-whales`, `/whale-board`, `/sales-pitch`, `/review-intel`, `/gong-weekly-analysis`

**VoC / research:** `/voc-profiler` → `/voc-synthesize` → `/voc-route` → `/voc-dispatch`

**Leadership / reporting:** `/marketing-report`, `/mql-report`, `/morning-report`

---

For multi-skill workflows (e.g. "weekly marketing report" = morning-report → marketing-report → push to Slack), see [PLAYBOOKS.md](PLAYBOOKS.md).

To add a new skill, see [CONTRIBUTING.md](CONTRIBUTING.md).
