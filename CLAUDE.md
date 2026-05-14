# CLAUDE.md — vFairs Marketing OS

Context for Claude Code when working in this repository.

---

## What this repo is

The vFairs Marketing OS is the shared toolkit for the vFairs marketing team. It bundles:

- **~60 marketing skills** (commands like `/mql-report`, `/search-console-audit`, `/page-cro`)
- **7 specialist agents** (GA4, GSC, Google Ads, HubSpot, MQL, Gong, Semrush analysts)
- **Live data connectors** for HubSpot, GA4, Google Ads, Google Search Console, Gong, Slack, Ahrefs, Semrush, Apify, Tavily, and more
- **Production scripts** for reporting, automation, content ops, and analysis
- **vFairs context** (company, product, ICP, competitors, messaging) that grounds every skill in our reality

Marketers clone the repo, run setup once, and use it inside Claude Code.

---

## Repository structure

```
vFairs-Marketing-OS/
├── .claude/
│   ├── skills/             # Slash-command skills (/mql-report, /page-cro, etc.)
│   ├── agents/             # Specialist subagents (ga4-analyst, hubspot-researcher, ...)
│   └── settings.example.json
├── .config/                # Local credentials (gitignored, never committed)
├── .env.example            # Template for shared + personal credentials
├── .mcp.json               # Generated per-machine by setup/configure.py
│
├── context/                # vFairs knowledge base
│   ├── company/            # About, marketing strategy, pricing
│   ├── product/            # Features, modalities, branding
│   ├── icp/                # Personas, ICP scoring rubric
│   ├── competitors/        # Cvent, Bizzabo, Accelevents, Whova, etc.
│   ├── messaging/          # Voice, tone, hard avoids, jargon list
│   └── playbooks/          # Standard workflows
│
├── scripts/                # Production scripts (Node.js + Python)
│   ├── reporting/          # MQL, Google Ads, GSC, marketing reports
│   ├── automation/         # Slack, audit-debt, morning briefing
│   ├── analysis/           # Whales, ICP, Gong, outbound
│   ├── content-ops/        # Landing-page tools, image generation
│   ├── workflows/          # n8n workflow exports
│   └── utils/              # Helpers, connection tests
│
├── mcp-servers/            # Custom local MCP servers (GSC)
├── setup/                  # One-time setup tooling
│   ├── configure.py        # Auto-generates .mcp.json
│   └── credentials-template/
│
├── docs/
│   ├── ONBOARDING.md       # Step-by-step first-time setup
│   ├── CREDENTIALS.md      # Vault structure + per-key instructions
│   ├── MCP-SETUP.md        # MCP server install + auth
│   ├── SKILLS.md           # Skill catalog (what, when, prereqs, example)
│   ├── PLAYBOOKS.md        # Multi-skill workflows
│   └── CONTRIBUTING.md     # How to add a skill or script
│
├── data/                   # Gitignored - synced from shared Drive on demand
├── outputs/                # Gitignored - generated reports land here
└── workspaces/             # Gitignored - per-marketer scratch space
```

---

## Credentials model: read this before touching anything

We use a **hybrid** approach.

**Shared (read-only) from team vault.** The vFairs marketing team maintains a shared 1Password vault (or equivalent) with read-only credentials for:

- HubSpot read-only private app token
- Google service account JSON (works for GA4 AND GSC)
- Google Ads shared refresh token + developer token
- Gong shared API key (read-only)
- Ahrefs, Semrush, Apify, Tavily, Smartlead API keys

Marketers paste these into their local `.env` once. No OAuth dances.

**Personal (write actions) per marketer.** Each marketer authenticates personally for actions that touch their own identity:

- Slack user token (their account, for posting/reading their messages)
- Gmail / Google Calendar OAuth (their inbox/calendar)

See `docs/CREDENTIALS.md` for the full vault structure and per-key setup.

---

## Easy-setup philosophy

Setting up Google Ads, GSC, and GA4 has historically been the biggest pain point. The new model:

| Tool | Old (painful) | New (easy) |
|---|---|---|
| GA4 | Service account JSON, set property ID | Same. Shared JSON, drop in `.config/` |
| GSC | Individual OAuth per marketer (browser flow) | Shared service account, added as user on GSC property. No OAuth |
| Google Ads | Individual OAuth + per-user refresh token | Shared refresh token from `marketing-bot@vfairs.com`. Paste 4 values in `.env`, done |
| HubSpot | Personal access token | Shared read-only private app token |
| Gong | Per-user API key | Shared marketing-team API key (read-only) |

Result: a marketer should go from `git clone` to running their first skill in roughly 15 minutes, not 60.

---

## vFairs brand rules (project-wide hard avoids)

These are vFairs brand voice rules. Apply them in every piece of copy, report, landing page, ad, or email generated in this repo for vFairs assets specifically. Detailed rules live in `context/messaging/`.

**Hard avoids:**

- Em dashes in any vFairs copy
- "It's not X, it's Y" contrasting sentence structures
- AI-sounding metaphors and dramatic imagery
- "Enterprise-grade," "robust," "seamless," "command center"
- Idioms that don't translate globally
- Generic abstract language. Prefer concrete, specific failure scenarios

**Product accuracy:**

- vFairs check-in supports QR codes, RFID smart badges, and AI facial recognition. **Not NFC.** Never write NFC into product copy.
- Always load `context/product/website-style-guide.md` before generating any vFairs landing-page HTML mockup (TT Norms Pro + coral→orange gradient + staged assets).

**Voice:**

- Tactical, specific, outcome-led
- Plain language over jargon
- Real numbers over vague claims

---

## Key skills (full catalog in docs/SKILLS.md)

**Reporting (live data):**

- `/mql-report`. Live MQL volume + meeting rates, 2026 vs 2025 YTD
- `/google-ads-audit`. Full Google Ads performance audit
- `/search-console-audit`. Full GSC SEO audit (use `quick` for triage)
- `/marketing-report`. Cross-source executive marketing report
- `/morning-report`. Daily briefing (MQLs, ads spend, email, calendar)

**Content & CRO:**

- `/page-cro`, `/form-cro`, `/popup-cro`, `/signup-flow-cro`, `/paywall-upgrade-cro`, `/onboarding-cro`
- `/copywriting`, `/copy-editing`, `/email-sequence`
- `/landing-page-review`, `/landing-page-review-quick`, `/page-builder`, `/write-landing-page`, `/re-write`

**Strategy & SEO:**

- `/seo-audit`, `/programmatic-seo`, `/schema-markup`, `/content-strategy`
- `/competitor-alternatives`, `/launch-strategy`, `/pricing-strategy`, `/ab-test-setup`

**Sales enablement & intel:**

- `/sales-pitch`. Tailored 10-slide pitch deck for a target account
- `/llm-checks`, `/review-intel`, `/linkedin-ads-review`
- `/find-whales`, `/whale-board`

**Voice of Customer (Gong + reviews + email):**

- `/voc-profiler`, `/voc-synthesize`, `/voc-route`, `/voc-dispatch`

**Gong analysis:**

- `/gong-weekly-analysis`, `/gong-ytd-analysis`, `/fetch-gong-calls`

---

## MCP servers

Configured in `.mcp.json`, generated per-machine by `python setup/configure.py`.

| Server | Data source | Auth |
|---|---|---|
| `hubspot` | HubSpot CRM | Shared private app token |
| `google-analytics` | GA4 | Shared service account |
| `google-ads` | Google Ads API | Shared refresh token |
| `google-search-console` | GSC | Shared service account (no OAuth) |
| `google-workspace` | Gmail + Calendar | Personal OAuth |
| `ahrefs`, `semrush`, `apify`, `tavily`, `smartlead` | Hosted | Shared API keys |
| `gamma` | Slide generation | Shared API key |

If MCP tools aren't available after restart, see `docs/MCP-SETUP.md`.

---

## Important notes for Claude

- Never commit anything from `.config/` or `.env`. Gitignored and contain credentials
- Generated reports land in `outputs/`. Also gitignored
- Real business data (customer CSVs, MQL exports, Gong transcripts) lives in `data/`. Gitignored, synced from shared Drive
- When marketers want to add new skills, follow `docs/CONTRIBUTING.md`
- vFairs brand rules above are non-negotiable for any copy targeting vFairs audiences
- For issues during setup: contact Aatir or the #marketing-ops Slack channel
