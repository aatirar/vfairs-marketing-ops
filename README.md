# vFairs Marketing OS

The shared AI-powered toolkit for the vFairs marketing team. Runs inside Claude Code with live access to HubSpot, GA4, Google Ads, Search Console, Gong, Slack, Ahrefs, Semrush, and more.

---

## What's inside

- **~60 marketing skills**: `/mql-report`, `/google-ads-audit`, `/search-console-audit`, `/page-cro`, `/landing-page-review`, `/sales-pitch`, `/gong-weekly-analysis`, and more.
- **7 specialist agents** for GA4, GSC, Google Ads, HubSpot, MQL, Gong, and Semrush analysis.
- **Production scripts** for reporting (MQL, ads, GSC), automation (Slack tasks, morning briefing, audit-debt), and analysis (whales, ICP, Gong, outbound).
- **vFairs context** baked in: company background, ICP, competitors, pricing, branding, voice rules.

---

## Get started

1. Read **[docs/ONBOARDING.md](docs/ONBOARDING.md)** end to end. About 15 minutes from clone to first skill run.
2. Get the shared vault link from Aatir or the #marketing-ops Slack channel.
3. Open the repo in Claude Code: `cd vFairs-Marketing-OS && claude`.

---

## Key references

| Doc | What it covers |
|---|---|
| `docs/ONBOARDING.md` | Step-by-step first-time setup |
| `docs/CREDENTIALS.md` | Vault structure, per-key instructions, troubleshooting |
| `docs/MCP-SETUP.md` | MCP server install, auth, and debugging |
| `docs/SKILLS.md` | Full skill catalog with examples |
| `docs/PLAYBOOKS.md` | Multi-skill workflows (weekly report, launch prep, etc.) |
| `docs/CONTRIBUTING.md` | How to add a new skill or script |
| `CLAUDE.md` | Project context Claude Code loads automatically |

---

## Brand rules (always)

When generating vFairs copy: no em dashes, no "It's not X, it's Y" structures, no AI metaphors, no jargon ("enterprise-grade," "robust," "seamless"). Check-in supports QR + RFID + facial recognition (not NFC). Full rules in `context/messaging/`.

---

## Support

- **Setup issues**: Aatir or #marketing-ops on Slack
- **Skill bugs / requests**: open an issue on this repo
- **Add a new skill**: see `docs/CONTRIBUTING.md`
