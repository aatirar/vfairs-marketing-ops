---
name: admin-setup
version: 1.0.0
description: Admin-only credential issuance and rotation wizard for the vFairs Marketing OS repo. Walks the repo administrator (Aatir or successor) through creating the shared Google Doc vault, generating each shared credential one at a time with live verification, rotating the 4 leaked HomeBase credentials, and finalizing onboarding docs for the marketing team. Run ONCE when standing up the team repo; re-run when rotating a credential or onboarding a new admin. Trigger on /admin-setup or when the user says "set up creds," "issue credentials," "rotate credentials," "set up the vault," "admin init," or "I need to set up the team for onboarding."
---

# /admin-setup — Repo admin credential wizard

You are guiding the repo administrator (today: Aatir) through the one-time work of standing up the credential infrastructure for the vFairs Marketing OS so marketers can clone the repo and run `/onboarding`.

This is **admin-only**. Marketers never invoke this. Marketers invoke `/onboarding`.

The user is technical-enough to read clearly-written instructions, click around in dashboards, and copy-paste values. They are NOT a security engineer. Avoid jargon. Explain *why* each step matters in one sentence before saying *how*.

---

## Operating principles

1. **One credential at a time.** Generate it, paste into the Google Doc vault, paste into local `.env`, run the verify check, only then move to the next. Never batch.

2. **Verify after every step.** Use the matching check from `scripts/utils/verify-setup.js` after each credential. If it fails, fix before moving on.

3. **Resumable.** The full flow takes 60–90 minutes. The admin may stop and resume. At any point, ask: *"Want me to start from where we left off, or restart from the beginning?"* Track state by checking which env vars are populated in `.env` and which `npm run verify` checks pass.

4. **Never echo credential values to chat.** When asking the user to paste a value, instruct them to paste it directly into the Google Doc or `.env` in their editor — never into the Claude Code prompt. If they accidentally paste one, immediately tell them to rotate it.

5. **Use the existing reference docs.** `docs/CREDENTIALS.md` is the source of truth for what each credential does and how to rotate it. Don't duplicate that content here — guide the admin through the *process*, link them to the reference for the *content*.

---

## EXECUTION FLOW

### Phase 0 — Pre-flight

Greet the admin. Confirm three things before starting:

1. **Are they in the right repo?**
   ```bash
   pwd && ls -la .env.example .gitignore package.json 2>/dev/null
   ```
   Should print the `vFairs-Marketing-OS` repo root with all three files present. If not, stop and direct them to `cd` into the repo.

2. **Do they have a `.env` already?**
   ```bash
   ls -la .env 2>/dev/null
   ```
   - If `.env` exists with values: assume partial setup, ask which step to resume from. Offer to run `npm run verify` to see what's already working.
   - If `.env` is missing: `cp .env.example .env` and proceed to Phase 1.

3. **What's the admin's intent?**
   Ask:
   > Are you here to:
   > (a) Set up the team for the first time
   > (b) Rotate one or more existing credentials
   > (c) Add a brand new credential we haven't used before

   Branch:
   - **(a)** → Phase 1
   - **(b)** → Skip to Phase 3, then identify which credentials need rotation
   - **(c)** → Skip to Phase 5 (additions are usually one-offs)

---

### Phase 1 — Create the Google Doc vault

Goal: a restricted Google Doc that holds all shared credentials. Marketers will be granted Viewer access; they read values from it during `/onboarding`.

**Why Google Doc:** zero added cost (vFairs has Workspace), audit log via Drive, easy to revoke per-person access, no learning curve for marketers.

Walk the admin through:

1. **Create the Doc.** Open https://docs.google.com → New Document. Title it: `vFairs Marketing OS — Credentials Vault`.

2. **Put it in a restricted folder.** Create or reuse a Drive folder named `vFairs Marketing OS — Admin`. Set folder sharing to "Restricted" (only specific people). The Doc inherits.

3. **Disable downloading/printing/copying for viewers.** In the Doc → Share → Settings (gear icon) → uncheck "Viewers and commenters can see the option to download, print, and copy."

4. **Paste the vault template.** Open `docs/admin/vault-template.md` in this repo, copy the entire contents, and paste it into the Doc. This gives the admin every section pre-formatted with `<TO FILL>` placeholders.

5. **Save the Doc URL.** Tell the admin to keep this URL handy — they'll add it to `docs/ONBOARDING.md` at the end so marketers know where to find the vault.

Once done, ask the admin to confirm the Doc is created and the template is pasted before moving to Phase 2.

---

### Phase 2 — Generate shared credentials (12 services)

Walk through each credential in this exact order. For each one:

1. **Brief why it exists** (1 sentence)
2. **Tell where to click** (linked instructions)
3. **Tell what scopes / type to pick**
4. **Tell where to paste it** (the Google Doc + `.env`)
5. **Run the verification check**
6. **Only then move on**

After ANY failure, fix it before proceeding. Do not let the admin move to the next credential with a failing check.

#### 2.1 HubSpot read-only private app token

**Why:** Marketing skills query CRM data (MQLs, contacts, deals, lists) without write access. Read-only protects against accidents.

**How:**
1. Go to https://app.hubspot.com → click your profile (top right) → Account Setup → Integrations → Private Apps
2. Click "Create a private app"
3. Name: `vFairs Marketing OS (Read-only)`
4. Scopes tab → add ONLY these read scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`
   - `crm.lists.read`
   - `crm.schemas.contacts.read`
   - `crm.schemas.companies.read`
   - `crm.schemas.deals.read`
5. Click "Create app" → confirm
6. Copy the access token (starts with `pat-na1-...`)

**Paste:**
- Into Google Doc under `HUBSPOT_ACCESS_TOKEN`
- Into local `.env` after `HUBSPOT_ACCESS_TOKEN=`

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "HubSpot token"
```
Expect: `✓ HubSpot token  PASS  connected`

#### 2.2 Google Ads (developer token + OAuth)

This is the trickiest one because it has 4 parts. Take it slow.

**Part A — Developer token:**
1. Sign in to Google Ads as a Google Ads admin
2. Tools (top right) → Setup → API Center
3. Apply for a developer token if not already approved. Basic Access is fine for read.
4. Copy the developer token

**Paste:** `GOOGLE_ADS_DEVELOPER_TOKEN` in vault + `.env`

**Part B — OAuth client (for the marketing-bot account):**
1. Go to https://console.cloud.google.com → make sure the active project is the one with the vFairs Workspace org
2. APIs & Services → Credentials → "+ Create Credentials" → OAuth client ID
3. Application type: **Desktop app**. Name: `vFairs Marketing OS — Google Ads`
4. Download the JSON — you only need `client_id` and `client_secret`

**Paste:** `GOOGLE_ADS_CLIENT_ID` + `GOOGLE_ADS_CLIENT_SECRET` in vault + `.env`

**Part C — Refresh token (one-time OAuth flow):**

This auths as `marketing-bot@vfairs.com` (the shared service account). The admin needs to know the marketing-bot password OR be signed in as marketing-bot in their browser.

```bash
python setup/generate-google-ads-token.py
```

Sign in as `marketing-bot@vfairs.com` when prompted. Click Allow. Script prints a refresh token.

**Paste:** `GOOGLE_ADS_REFRESH_TOKEN` in vault + `.env`

**Part D — Login customer ID:**
1. Google Ads top bar → click the customer ID (10 digits, like `123-456-7890`)
2. Strip the dashes → `1234567890`

**Paste:** `GOOGLE_ADS_LOGIN_CUSTOMER_ID` in vault + `.env`

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "Google Ads"
```
Expect: `✓ Google Ads developer token  PASS  token + refresh token present`

#### 2.3 GA4 property ID

**Why:** Identifies which property our GA4 skill queries. Auth comes from the service account JSON (next step), not this value.

**How:** It's already `269289033` in `.env.example`. Just confirm.

**Paste:** `GA4_PROPERTY_ID=269289033` in vault + `.env`

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "GA4 property"
```

#### 2.4 Service account JSON (GA4 + GSC + Sheets)

**Why:** One file authenticates the team for read-only access to GA4, Search Console, and the MQL Google Sheet. Shared across all marketers. The admin's job is to make sure this file exists and is granted access to each property.

**How:**
1. Go to https://console.cloud.google.com → IAM & Admin → Service Accounts
2. Look for `claude-homebase@gdrive-mcp-456412.iam.gserviceaccount.com` (existing) OR create new: `vfairs-marketing-os@<project>.iam.gserviceaccount.com`
3. Click the account → Keys → Add Key → Create new key → JSON → download
4. Rename downloaded file to `google-credentials.json`
5. Place at `.config/google-credentials.json` in this repo
6. Upload the same file to the Google Doc vault as an attachment under "Service Account JSON"

**Then grant the service account access to each property:**
- **GA4:** GA4 Admin → Property Access Management → add `<service-account-email>` with Viewer role
- **GSC:** Search Console → Settings → Users and permissions → add `<service-account-email>` with Owner role (GSC requires Owner for API)
- **MQL Sheet:** Open the MQL Sheet → Share → add `<service-account-email>` as Viewer

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "service account\|Sheets"
```

#### 2.5 Gong (key + secret)

**Why:** Read-only access to Gong call recordings, transcripts, and summaries for `/gong-weekly-analysis`, `/gong-ytd-analysis`, `/fetch-gong-calls`.

**How:**
1. Sign in to Gong as an admin
2. Settings (cog icon) → Company → Ecosystem → API → Create API Access Token
3. Name: `vFairs Marketing OS`. Permissions: read-only (calls, users, transcripts).
4. Copy both the access key AND the secret. The secret is shown only once.

**Paste:** `GONG_API_KEY` + `GONG_API_SECRET` in vault + `.env`

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "Gong"
```
Expect: `✓ Gong API key  PASS  connected`

#### 2.6 Ahrefs API key

**Why:** Keyword research + backlink data for `/re-write`, `/landing-page-review`, `/page-builder`, `/write-landing-page`, `/seo-audit`.

**How:**
1. Sign in to Ahrefs
2. Profile → Subscription & limits → "API" tab
3. Generate API token. Note: requires a paid Ahrefs API subscription (separate from the regular Ahrefs subscription).

**Paste:** `AHREFS_API_KEY` in vault + `.env`

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "Ahrefs"
```

#### 2.7 Semrush API key

**Why:** Competitor keyword research, paired with Ahrefs.

**How:**
1. Sign in to Semrush
2. Profile → "API" (in Account dropdown)
3. Copy API key. Requires a Guru+ or Business plan for API access.

**Paste:** `SEMRUSH_API_KEY` in vault + `.env`

**Verify:** `npm run verify 2>&1 | grep -A1 "Semrush"`

#### 2.8 Apify API key

**Why:** Web scrape jobs for `/linkedin-ads-review`, `/review-intel`, `/ad-replicator`, `/comparison-page`.

**How:**
1. Sign in to https://apify.com
2. Settings → Integrations → API & Integrations → API tokens
3. Copy the personal API token (starts with `apify_api_...`)

**Paste:** `APIFY_API_KEY` in vault + `.env`

**Verify:** `npm run verify 2>&1 | grep -A1 "Apify"`

#### 2.9 Tavily API key

**Why:** Web search + content extraction for `/sales-pitch`, `/landing-page-review`, `/audit-debt`.

**How:**
1. Sign up at https://tavily.com (free tier exists; paid for heavy use)
2. Dashboard → API Keys → copy

**Paste:** `TAVILY_API_KEY` in vault + `.env`

**Verify:** `npm run verify 2>&1 | grep -A1 "Tavily"`

#### 2.10 Smartlead API key

**Why:** Email outbound campaign visibility.

**How:**
1. Sign in to https://smartlead.ai
2. Settings → API Keys → generate

**Paste:** `SMARTLEAD_API_KEY` in vault + `.env`

**Verify:** `npm run verify 2>&1 | grep -A1 "Smartlead"`

#### 2.11 Gemini API key

**Why:** Generative tasks (image generation in `/ad-replicator`, summary generation in some skills).

**How:**
1. Go to https://aistudio.google.com → Get API Key
2. Create new API key. Restrict to specific Google project if possible.

**Paste:** `GEMINI_API_KEY` in vault + `.env`

**Verify:**
```bash
npm run verify 2>&1 | grep -A1 "Gemini"
```

#### 2.12 Workspace OAuth client (for per-marketer Gmail/Calendar)

**Why:** Each marketer OAuths into their OWN Gmail/Calendar. This OAuth client is the *app* they auth against. Shared client ID + secret in the vault; per-marketer tokens generated locally during `/onboarding`.

**How:**
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID
2. Application type: **Desktop app**. Name: `vFairs Marketing OS — Workspace`
3. Make sure these APIs are enabled in this project: Gmail API, Calendar API
4. Download the JSON — copy `client_id` and `client_secret`

**Paste:** `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` in vault + `.env`

**Verify (admin's own OAuth — also tests the client works):**
```bash
python scripts/utils/generate-workspace-token.py <admin-email>@vfairs.com
```
Browser opens. Admin signs in with their vFairs Google account. Click Allow. Token cached at `~/.google_workspace_mcp/credentials/`. Then:

```bash
npm run verify 2>&1 | grep -A1 "Workspace OAuth"
```

#### 2.13 Final shared credential — Data Drive folder ID

**Why:** `npm run sync` pulls customer CSVs and MQL exports from a shared Google Drive folder. The service account needs Viewer access to the folder.

**How:**
1. In Google Drive, create folder `vFairs Marketing OS — Data` (or reuse an existing one with customer data)
2. Share it with the service account email as Viewer
3. Copy the folder ID from the URL: `drive.google.com/drive/folders/<FOLDER_ID>`

**Paste:** `DATA_DRIVE_FOLDER_ID` in vault + `.env`

**Verify:**
```bash
npm run sync:dry
```
Dry-run — should list files without copying. If permission denied, share the folder again.

---

### Phase 3 — Rotate the 4 leaked HomeBase credentials

These are credentials still living in the original `HomeBase` repo's `.env`. They have been scrubbed from `vFairs-Marketing-OS`, but the original values are still valid in the third-party services. We rotate them so the leaked ones become useless.

Confirm with admin:
> The HomeBase repo still contains 4 credentials that should be rotated. Are you ready to do this now? Each rotation invalidates the old value — make sure no other system depends on them.

If yes, walk through each:

For each rotation below, the **actual leaked value** is in `HomeBase/.config/.env` under the named env var. Open that file in your editor to confirm which value to invalidate — DO NOT paste the value into chat, into this Doc, or into git.

#### 3.1 HubSpot leaked token

- Look up in `HomeBase/.config/.env`: `HUBSPOT_ACCESS_TOKEN` (starts with `pat-na1-...`)
- Go to HubSpot → Settings → Account Setup → Integrations → Private Apps
- Find the matching app → click it → "Rotate token" OR delete and re-create
- Copy new token
- Update HomeBase's local `.env` if you (Aatir) personally still use HomeBase
- Confirm vFairs-Marketing-OS `.env` and Google Doc vault use a DIFFERENT (read-only) token created in Phase 2.1

#### 3.2 n8n JWT

- Look up in `HomeBase/.config/.env`: the n8n JWT (starts with `eyJ...`)
- Log into the n8n instance
- Settings → API → revoke the existing API key → create new one
- Update HomeBase `.env` with the new value

#### 3.3 Google OAuth client + secret

- Look up in `HomeBase/.config/.env`: `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`
- Google Cloud Console → APIs & Services → Credentials
- Find the matching OAuth client by its ID prefix → DELETE it (don't just rotate the secret — delete the whole client)
- The new Workspace OAuth client created in Phase 2.12 takes its place

#### 3.4 Google Ads developer token

- Look up in `HomeBase/.config/.env`: `GOOGLE_ADS_DEVELOPER_TOKEN`
- Google Ads → Tools → API Center → Request developer token reset
- Note: Google may take 24-48 hours to issue a fresh dev token. The new one becomes `GOOGLE_ADS_DEVELOPER_TOKEN` going forward.

After all 4 rotations, the leaked HomeBase values are dead. The new vFairs-Marketing-OS values are clean.

---

### Phase 4 — Update repo docs with the Google Doc vault link

1. Open `docs/ONBOARDING.md`. Find any line that says "the team vault" or "1Password" — replace with the actual Google Doc URL the admin just created.
2. Open `docs/CREDENTIALS.md`. Same replacement.
3. Commit the changes:
   ```bash
   cd "$REPO_ROOT"
   git add docs/ONBOARDING.md docs/CREDENTIALS.md
   git commit -m "docs: point onboarding to live Google Doc vault"
   git push origin main
   ```

The repo is now ready for the first marketer to run `/onboarding`.

---

### Phase 5 — Admin's own smoke test

Before inviting any marketer:

```bash
npm run verify
```

Expect: all 12+ checks PASS.

If anything fails, fix it before moving on. Common failures and fixes are in `docs/CREDENTIALS.md` — diagnostic table.

Then run one real skill end-to-end:

```bash
# In Claude Code, with this repo loaded:
/mql-report
```

Should pull live data from the MQL Sheet, compare YoY, and print a report. If this works, you're done.

---

### Phase 6 — Invite the first marketer

1. Share the GitHub repo: `https://github.com/aatirar/vfairs-marketing-ops` → Settings → Collaborators → invite by vFairs email
2. Share the Google Doc vault as Viewer (NOT Editor; NOT Commenter — Viewer only)
3. Tell them:
   > Clone the repo. Open it in Claude Code. Run `/onboarding`. It takes about 30 minutes.
4. Stand by for questions in #marketing-ops (if that channel exists; otherwise direct DM)

When they finish `/onboarding` successfully and run their first skill — the setup is proven.

---

## Hard rules for this skill

- **Never paste a credential value into Claude Code's chat.** Always direct the admin to paste into the Google Doc or `.env` in their editor. If the admin pastes one into chat by mistake, immediately tell them to rotate that credential and don't echo it back.
- **Never store secrets in repo files** other than `.env` (gitignored) and `.config/google-credentials.json` (gitignored). Verify both are in `.gitignore` before any commit:
  ```bash
  grep -E "^\.env$|^\.config" .gitignore
  ```
- **Verify after every credential.** If admin asks to skip verification ("trust me, it works"), refuse and explain that we'd rather catch a typo now than have a marketer hit it next week.
- **Don't move on from a failing check.** Diagnose the failure with the admin (usually: missing scope, wrong URL, token not actually pasted into `.env`).
- **For rotations (Phase 3): never delete the old value until the new value is verified working.** Otherwise admin loses a working credential to a typo.

---

## When this skill ends

End the session by:

1. Summarizing what was set up (count of credentials, vault URL on file, repo docs updated)
2. Saving a memory entry noting: vault is created, vault URL stored in `docs/ONBOARDING.md` and `docs/CREDENTIALS.md`, repo is ready for marketer onboarding
3. Telling the admin: *"You're done. Next step is to invite your first marketer. They run `/onboarding` and follow the wizard."*
