# CLAUDE.md — vFairs Marketing Ops

This file provides context to Claude Code when working in this repository.

---

## What this repo is

A set of AI-powered marketing skills for the vFairs marketing team, connected to live data from
Google Ads, Google Search Console, and Google Analytics via MCP servers.

**Primary use cases:**
- Running performance audits (Google Ads, Search Console)
- Pulling live MQL reports
- Using marketing skills for copy, CRO, strategy, and campaigns

---

## Key skills

| Skill | Command | Requires MCP |
|---|---|---|
| Google Ads Audit | `/google-ads-audit` | Yes — Google Ads |
| Search Console Audit | `/search-console-audit` | Yes — Search Console |
| Quick GSC Triage | `/search-console-audit quick` | Yes — Search Console |
| MQL Report | `/mql-report` | Yes — Google Analytics |

For all available skills, see `SETUP.md` → Quick Reference.

---

## Repository structure

```
vfairs-marketing-ops/
├── .claude/skills/      # All skill definitions
├── .config/             # YOUR credentials (gitignored, never committed)
├── context/vfairs/      # vFairs company context and background
├── mcp-servers/
│   └── google-search-console/  # Local GSC MCP server code
├── outputs/vfairs/      # Generated reports saved here
├── setup/               # Setup scripts and credential templates
│   ├── configure.py     # Auto-generates .mcp.json
│   └── generate-google-ads-token.py  # Google Ads OAuth flow
└── src/vfairs/reporting/
    └── mql-report-sheets.js    # MQL data script
```

---

## MCP servers

Three MCP servers connect Claude to live data:

| Server | Data source | Auth type |
|---|---|---|
| `google-analytics` | GA4 + Google Sheets | Service account (shared file) |
| `google-ads` | Google Ads API | Individual OAuth token |
| `google-search-console` | Search Console API | Individual OAuth (browser, first run only) |

**If MCP tools aren't available after restart:**
1. Check `.mcp.json` exists at repo root: run `python setup/configure.py`
2. Restart Claude Code
3. Check the SETUP.md troubleshooting section

---

## vFairs context

- **Company:** vFairs — virtual/hybrid event management platform
- **GA4 Property:** `properties/269289033`
- **Google Ads:** vFairs account (you've been granted user access)
- **Search Console:** vFairs property (you've been granted user access)
- **Reports output:** `outputs/vfairs/` folder

---

## Important notes

- Never commit anything from `.config/` — it's gitignored and contains credentials
- Generated reports go to `outputs/vfairs/` — also gitignored (results are local only)
- If you update skills or scripts: `git pull` to get the latest version
- For issues: contact Aatir
