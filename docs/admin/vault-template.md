# vFairs Marketing OS — Credentials Vault Template

**Admin: paste the contents below into a new Google Doc titled `vFairs Marketing OS — Credentials Vault`.**

The Doc should live in a restricted Drive folder (`vFairs Marketing OS — Admin`) accessible only to people you explicitly add. Marketers get Viewer access. Disable "viewers can download / print / copy" in the Doc's share settings.

Replace every `<TO FILL>` with the actual value as you generate it through `/admin-setup`.

---

# vFairs Marketing OS — Credentials Vault

**Last rotated:** `<DATE>`
**Admin:** `<NAME>` (`<email>@vfairs.com`)
**Repo:** https://github.com/aatirar/vfairs-marketing-ops

## How to use this vault

If you're a new marketer:
1. You should have View access to this Doc
2. Clone the repo: `git clone https://github.com/aatirar/vfairs-marketing-ops`
3. Open Claude Code in the repo: `claude`
4. Run `/onboarding` — it walks you through everything
5. When `/onboarding` asks you to paste a value into `.env`, find it here and paste it directly into your `.env` file (NOT into Claude Code's chat)
6. Download `google-credentials.json` (attachment at the bottom of this Doc) and place it at `.config/google-credentials.json` in the repo

**Hard rules:**
- Do not share this Doc URL outside the team
- Do not screenshot any section of this Doc
- Do not paste any value below into Slack, email, or any chat
- If you accidentally commit a value to git, message the admin immediately

---

## Shared credentials (paste each into your local `.env`)

```env
# ─── HubSpot (read-only) ──────────────────────────────────────────────
HUBSPOT_ACCESS_TOKEN=<TO FILL>

# ─── Google Ads (shared marketing-bot account) ────────────────────────
GOOGLE_ADS_DEVELOPER_TOKEN=<TO FILL>
GOOGLE_ADS_CLIENT_ID=<TO FILL>
GOOGLE_ADS_CLIENT_SECRET=<TO FILL>
GOOGLE_ADS_REFRESH_TOKEN=<TO FILL>
GOOGLE_ADS_LOGIN_CUSTOMER_ID=<TO FILL>

# ─── GA4 (auth via service account JSON, this is just the property) ───
GA4_PROPERTY_ID=269289033

# ─── Gong (read-only) ─────────────────────────────────────────────────
GONG_API_KEY=<TO FILL>
GONG_API_SECRET=<TO FILL>

# ─── SEO + competitive intel ──────────────────────────────────────────
AHREFS_API_KEY=<TO FILL>
SEMRUSH_API_KEY=<TO FILL>
APIFY_API_KEY=<TO FILL>
TAVILY_API_KEY=<TO FILL>

# ─── Outbound + email ─────────────────────────────────────────────────
SMARTLEAD_API_KEY=<TO FILL>

# ─── Generative ──────────────────────────────────────────────────────
GEMINI_API_KEY=<TO FILL>

# ─── Optional — LinkedIn-fetching content skills ─────────────────────
RAPIDAPI_KEY=<TO FILL or leave blank>

# ─── Data sync — shared Drive folder for marketing data ──────────────
DATA_DRIVE_FOLDER_ID=<TO FILL>

# ─── Workspace OAuth client (shared — you'll use it for your personal Gmail+Calendar token) ───
GOOGLE_OAUTH_CLIENT_ID=<TO FILL>
GOOGLE_OAUTH_CLIENT_SECRET=<TO FILL>
```

---

## Personal credentials (each marketer generates their own)

These are NOT in this vault. You create your own as part of `/onboarding`.

| Value | How you'll get it |
|---|---|
| `SLACK_USER_TOKEN` | `/onboarding` will direct you to install the vFairs Marketing OS Slack app and copy your user token (starts with `xoxp-...`). Paste into your local `.env`. |
| Personal Gmail + Calendar OAuth token | `/onboarding` runs `python scripts/utils/generate-workspace-token.py <your-email>@vfairs.com`. Browser opens. You sign in as yourself. Token caches at `~/.google_workspace_mcp/credentials/`. No `.env` entry needed. |

---

## Service Account JSON

**Filename:** `google-credentials.json`
**Where to place locally:** `.config/google-credentials.json` in the repo
**Service account email:** `<TO FILL>` (e.g. `vfairs-marketing-os@<project>.iam.gserviceaccount.com`)
**Permissions granted:**
- GA4 property `269289033` (Viewer)
- Search Console property (Owner — GSC API requires Owner)
- MQL Google Sheet (Viewer)
- Data Drive folder `DATA_DRIVE_FOLDER_ID` (Viewer)

📎 **Attachment:** [google-credentials.json](attach-here)

Right-click the attachment → Download. Save to your repo at `.config/google-credentials.json`.

---

## Admin-only entries (not for marketers)

These should be hidden in a separate restricted section of the Doc visible only to admins.

| Item | Value |
|---|---|
| marketing-bot@vfairs.com password | `<TO FILL>` (used to mint Google Ads refresh tokens) |
| HubSpot Private App URL | `<TO FILL>` |
| n8n admin URL + API key | `<TO FILL>` |
| Google Cloud project ID | `<TO FILL>` |
| Service account creation date | `<TO FILL>` |
| Last credential rotation log | `<TO FILL — keep a running list of "rotated X on YYYY-MM-DD">` |

---

## Rotation history

| Date | Credential | Reason | Notified team in |
|---|---|---|---|
| `<YYYY-MM-DD>` | `<credential>` | `<scheduled rotation / leak / departure>` | `#marketing-ops` |

Keep this table updated. Every rotation = new row.
