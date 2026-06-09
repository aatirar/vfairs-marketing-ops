# Credentials

This is the reference for every credential the vFairs Marketing OS uses: where it lives, what it grants, who manages it, and what to do when it breaks.

---

## TL;DR

We use **two buckets**:

1. **Shared (read-only) credentials** live in the team vault. Every marketer copies the same values. These power any "read live data" skill (HubSpot, GA4, Google Ads, GSC, Gong, Ahrefs, Semrush).
2. **Personal credentials** are generated per marketer. Each person has their own. These power any skill that acts as that person (Slack posting, Gmail, Calendar).

Real credential values are **never** in this repo. They live in a restricted Google Doc titled **"vFairs Marketing OS — Credentials Vault"** that the admin shares with each marketer as a Viewer. See `docs/admin/vault-template.md` for the Doc's structure.

---

## Vault structure

The vault is a single Google Doc with these sections (template lives at `docs/admin/vault-template.md`):

| Section | Contents | Who can read |
|---|---|---|
| Shared credentials | All shared API keys + tokens, formatted to paste into `.env` | All marketers (Viewer access) |
| Service Account JSON (attachment) | `google-credentials.json` for GA4 + GSC + Sheets | All marketers (download as file) |
| Admin-only entries | marketing-bot password, HubSpot Private App URL, n8n admin URL, Google Cloud project ID | Admin only — hidden section |
| Rotation history | Running log of every credential rotation with dates and reasons | All marketers (Viewer) |

**Admin to fill in:** the live vault Doc URL goes in `docs/ONBOARDING.md` Step 4. Replace the placeholder text after running `/admin-setup`.

---

## Shared credentials (read-only)

Every marketer pastes these into their local `.env`.

| Env var | What it is | Scope | Used by |
|---|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token | Read-only on contacts, companies, deals, lists | `/mql-report`, `/find-whales`, `/voc-profiler`, hubspot MCP |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | vFairs Google Ads developer token | Required header for all Google Ads API calls | `/google-ads-audit`, google-ads MCP |
| `GOOGLE_ADS_CLIENT_ID` | OAuth client ID for the marketing-bot Workspace account | Identifies the app | google-ads MCP |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth client secret | Pairs with client_id | google-ads MCP |
| `GOOGLE_ADS_REFRESH_TOKEN` | Long-lived refresh token from marketing-bot account | Read-only on the vFairs Google Ads account | google-ads MCP |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | vFairs Google Ads customer ID (10 digits, no dashes) | Identifies which account to query | google-ads MCP |
| `GA4_PROPERTY_ID` | vFairs GA4 property ID (`269289033`) | Identifies which property | google-analytics MCP, `/mql-report` |
| `GONG_API_KEY` | Shared marketing-team Gong API key | Read-only on calls + transcripts | `/gong-weekly-analysis`, `/gong-ytd-analysis`, `/fetch-gong-calls` |
| `GONG_API_SECRET` | Pairs with `GONG_API_KEY` | Same | Same |
| `AHREFS_API_KEY` | Ahrefs API key | Read on keyword + backlink data | ahrefs MCP, `/re-write`, `/landing-page-review` |
| `SEMRUSH_API_KEY` | Semrush API key | Read on keyword + competitor data | semrush MCP |
| `APIFY_API_KEY` | Apify API token | Read + run actors | apify MCP, `/linkedin-ads-review`, `/review-intel` |
| `TAVILY_API_KEY` | Tavily web search API key | Read web search results | tavily MCP, `/sales-pitch`, `/landing-page-review` |
| `SMARTLEAD_API_KEY` | Smartlead API key | Read campaign + lead data | smartlead MCP |
| `GEMINI_API_KEY` | Google Gemini API key | Generate text + images | Image generation scripts |
| `RAPIDAPI_KEY` | RapidAPI key | LinkedIn post fetches (if used) | Optional. Some content skills |
| `DATA_DRIVE_FOLDER_ID` | Google Drive folder ID for shared data | Service account already has Viewer access | `npm run sync` — pulls customer CSVs, MQL exports, whales, etc. |

### Service account file

| File | Stored in | Used by | Permissions |
|---|---|---|---|
| `.config/google-credentials.json` | Vault. Download and place locally | GA4, GSC, Google Sheets (MQL data) | Viewer on GA4 property, user on GSC property, viewer on MQL Sheet |

**Important:** This one service account is shared across all marketers. It's been added as a user on:
- GA4 property `269289033` (Viewer role)
- Search Console property (User role)
- The MQL Google Sheet (Viewer role)

If GSC or GA4 fails for a marketer, the fix is **never** "have them re-auth." The fix is to confirm the service account email (visible in the JSON's `client_email` field) is still added to the relevant property.

---

## Personal credentials (per marketer)

| Env var | What it is | How to generate |
|---|---|---|
| `SLACK_USER_TOKEN` | OAuth user token from the "vFairs Marketing OS" Slack app | See ONBOARDING.md Step 4c |

### Google Workspace OAuth (Gmail + Calendar)

The `google-workspace` MCP server handles Gmail + Calendar via per-user OAuth. The first time a marketer runs a skill that needs Gmail or Calendar (`/morning-report`), the MCP server will open a browser for them to authorize. The token is cached locally at `~/.google_workspace_mcp/credentials/`.

No `.env` value needed for this. Just the first-time browser flow.

---

## Admin: adding a new marketer

When onboarding a new vFairs marketer:

1. **Vault**: Invite them to the "vFairs Marketing OS" section
2. **GitHub**: Add as collaborator on `aatirar/vfairs-marketing-ops`
3. **GA4**: They DON'T need individual access. The shared service account already covers them
4. **Google Ads**: They DON'T need individual access. The shared refresh token already covers them
5. **Search Console**: They DON'T need individual access. The shared service account already covers them
6. **HubSpot**: They DON'T need individual access. The shared read-only token already covers them
7. **Gong**: They DON'T need a Gong account. The shared marketing-team API key covers them
8. **Slack app**: Install the "vFairs Marketing OS" Slack app to their workspace so they can get a User OAuth Token
9. **Anthropic team account**: Share the team Claude Code account credentials
10. **Send them**: `docs/ONBOARDING.md` link. They handle the rest.

---

## Admin: rotating a credential

If a shared credential leaks or needs rotation:

| Credential | Rotate at | Action |
|---|---|---|
| HubSpot token | hubspot.com → Settings → Private Apps → "Marketing OS" → Rotate token | Update `HUBSPOT_ACCESS_TOKEN` in vault. Notify team |
| Google Ads refresh token | Run `python setup/generate-google-ads-token.py` while signed in as `marketing-bot@vfairs.com` | Update `GOOGLE_ADS_REFRESH_TOKEN` in vault. Notify team |
| GA4 / GSC service account | console.cloud.google.com → IAM → Service Accounts → "marketing-os" → Add Key → JSON | Replace `google-credentials.json` in vault. Notify team |
| Gong key | Gong → Settings → API → Regenerate | Update `GONG_API_KEY` + `GONG_API_SECRET` in vault. Notify team |
| Ahrefs / Semrush / Apify / Tavily / Smartlead / Gemini / RapidAPI | Rotate in respective dashboard | Update env var in vault. Notify team |

**When you rotate, post in #marketing-ops:** "Rotated `<credential>`. Pull fresh value from vault entry `vFairs Marketing OS .env values` and update your local `.env`. No code changes needed."

---

## Diagnosing credential errors

| Error from skill | Likely cause | Fix |
|---|---|---|
| HubSpot 401 | Token rotated or revoked | Fetch fresh `HUBSPOT_ACCESS_TOKEN` from vault |
| Google Ads `invalid_grant` | Refresh token expired or revoked | Fetch fresh `GOOGLE_ADS_REFRESH_TOKEN` from vault |
| GA4 403 / 404 | Service account removed from property | Admin re-adds to GA4 Admin → Account Access |
| GSC "permission denied" | Service account removed from GSC property | Admin re-adds in GSC → Settings → Users and permissions |
| Gong 401 | API key rotated | Fetch fresh from vault |
| Ahrefs / Semrush quota exceeded | Plan limit hit | Check plan dashboard, upgrade or wait for reset |
| MQL Sheet "permission denied" | Service account removed from sheet | Admin re-shares sheet with the service account email |

---

## Security checklist for marketers

- Your `.env` is gitignored. Verify with `cat .gitignore | grep -i env` before any `git add`.
- Your `.config/` folder is gitignored. Same check.
- If you accidentally commit a credential, **tell Aatir immediately**. We rotate it. No blame.
- Don't share your `.env` over Slack DM or email. Send people to the vault.
- Don't post screenshots of `.env` or `.config/` contents in any channel.
