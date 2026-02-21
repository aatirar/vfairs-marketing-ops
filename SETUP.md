# vFairs Marketing Ops — Setup Guide

This guide gets you from zero to running AI-powered marketing audits in Claude Code.
You'll set up three MCP (data connection) servers that let Claude access live data from
Google Ads, Google Search Console, and Google Analytics.

**Time required:** ~45–60 minutes the first time.

---

## What you'll be able to do when done

| Skill | What it does |
|---|---|
| `/google-ads-audit` | Full analysis of vFairs Google Ads: wasted spend, low CTR, keyword quality, recommendations |
| `/search-console-audit` | SEO analysis: ranking movements, CTR gaps, page opportunities, technical health |
| `/mql-report` | Live MQL performance vs last year (volume, sources, meeting rates) |
| + 25 other skills | Copywriting, CRO, A/B test planning, email sequences, and more |

---

## Before you start — get these files from Aatir

Aatir will send you these **3 credential files** via a secure channel (not Slack DMs):

| File | Used for |
|---|---|
| `google-credentials.json` | Google Analytics (GA4) + MQL report |
| `client_secret_[...].json` | Google Search Console |
| `google-ads.yaml` | Google Ads (pre-filled except your personal token) |

**Don't lose these.** Keep them in a safe place — you'll place them in your `.config/` folder in a later step.

---

## Step 1 — Install Cursor (code editor)

Cursor is the editor you'll use to view reports, browse files, and use Claude Code.

### Mac
1. Go to [cursor.com](https://cursor.com) and click **Download**
2. Open the downloaded `.dmg` file
3. Drag Cursor to your **Applications** folder
4. Open Cursor from Applications

### Windows
1. Go to [cursor.com](https://cursor.com) and click **Download**
2. Run the installer (`.exe`)
3. Follow the installer prompts
4. Open Cursor from the Start menu

> **Note:** You don't strictly need Cursor to run audits, but it's the best way to view the generated reports and manage files.

---

## Step 2 — Install Claude Code

Claude Code is the AI tool that runs your audit skills. It runs in a terminal.

### Mac
1. Open **Terminal** (search for it in Spotlight: `Cmd + Space`, type "Terminal")
2. Run this command:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
3. When it finishes, verify it worked:
   ```
   claude --version
   ```
   You should see a version number like `1.x.x`

### Windows
1. Open **Command Prompt** or **PowerShell** as Administrator
   - Press `Win + X` and select "Windows PowerShell (Admin)" or "Terminal (Admin)"
2. Run:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
3. Verify:
   ```
   claude --version
   ```

> **If you get "npm not found":** You need Node.js first. Go to [nodejs.org](https://nodejs.org), download the LTS version, install it, then retry step 2.

---

## Step 3 — Sign in to Claude Code

1. In your terminal, run:
   ```
   claude
   ```
2. It will open a browser window asking you to sign in
3. Sign in with the team account credentials Aatir shares with you
4. Once signed in, Claude Code will open in your terminal
5. Type `/exit` or press `Ctrl+C` to close it for now

---

## Step 4 — Install Python

Python is needed to run the Google Ads MCP server and Search Console MCP server.

### Mac
1. Open Terminal
2. Check if Python is already installed:
   ```
   python3 --version
   ```
   If you see `Python 3.x.x`, skip to Step 5.
3. If not installed, install it via Homebrew:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Then:
   ```
   brew install python
   ```

### Windows
1. Check if Python is installed. Open PowerShell and run:
   ```
   python --version
   ```
   If you see `Python 3.x.x`, skip to Step 5.
2. If not: go to [python.org/downloads](https://python.org/downloads)
3. Download the latest Python 3.x installer
4. Run the installer — **IMPORTANT: check "Add Python to PATH"** during installation
5. Restart PowerShell and verify: `python --version`

---

## Step 5 — Install pipx

pipx lets you install Python tools in isolated environments (like npm global packages, but for Python).

### Mac
```
pip3 install pipx
pipx ensurepath
```
Close and reopen Terminal after running these.

### Windows
```
pip install pipx
pipx ensurepath
```
Close and reopen PowerShell after running these.

---

## Step 6 — Clone this repository

This repo contains all your skills and MCP server code.

1. Open Terminal (Mac) or PowerShell (Windows)
2. Navigate to where you want to store it. We recommend your Documents folder:
   ```
   cd ~/Documents
   ```
3. Clone the repo (you'll need to be added as a collaborator by Aatir first):
   ```
   git clone https://github.com/aatirar/vfairs-marketing-ops.git
   ```
4. Move into the folder:
   ```
   cd vfairs-marketing-ops
   ```

---

## Step 7 — Place your credential files

Create a `.config` folder inside the repo and put your credential files there.

### Mac
```
mkdir -p ~/Documents/vfairs-marketing-ops/.config
```
Then copy the 3 files Aatir sent you into that `.config` folder:
```
cp ~/Downloads/google-credentials.json ~/Documents/vfairs-marketing-ops/.config/
cp ~/Downloads/google-ads.yaml ~/Documents/vfairs-marketing-ops/.config/
cp ~/Downloads/client_secret_*.json ~/Documents/vfairs-marketing-ops/.config/
```
> Replace `~/Downloads/` with wherever you saved the files.

### Windows
1. Open File Explorer
2. Navigate to `C:\Users\YOUR_USERNAME\Documents\vfairs-marketing-ops\`
3. Create a new folder called `.config` (you may need to type it directly in the address bar)
4. Copy the 3 credential files from Aatir into that `.config` folder

**Verify:** You should now have:
```
vfairs-marketing-ops/
└── .config/
    ├── google-credentials.json
    ├── google-ads.yaml
    └── client_secret_[long name].json
```

> ⚠️ The `.config` folder is in `.gitignore` — these files will NEVER be committed to GitHub.

---

## Step 8 — Install Google Analytics MCP server

```
pipx install google-analytics-mcp
```

Verify it worked:

**Mac:**
```
~/.local/bin/google-analytics-mcp --version
```

**Windows:**
```
%USERPROFILE%\pipx\venvs\analytics-mcp\Scripts\google-analytics-mcp.exe --version
```

If either command returns a version number, you're good.

---

## Step 9 — Install Google Ads MCP server

```
pipx install git+https://github.com/stephencollins/google-ads-mcp.git
```

> This installs the custom Google Ads MCP server via pipx.

---

## Step 10 — Set up Google Search Console MCP server

This MCP server runs locally from the repo. You need to set up its Python environment.

Navigate to the MCP server folder and create a virtual environment:

### Mac
```
cd ~/Documents/vfairs-marketing-ops/mcp-servers/google-search-console
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Windows
```
cd C:\Users\YOUR_USERNAME\Documents\vfairs-marketing-ops\mcp-servers\google-search-console
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
deactivate
```

---

## Step 11 — Generate your Google Ads refresh token

This is a one-time step that links your personal Google account to the Google Ads API.

1. First, install the required Python packages:
   ```
   pip install google-auth-oauthlib pyyaml
   ```

2. Navigate back to the repo root:
   **Mac:** `cd ~/Documents/vfairs-marketing-ops`
   **Windows:** `cd C:\Users\YOUR_USERNAME\Documents\vfairs-marketing-ops`

3. Run the auth script:
   ```
   python setup/generate-google-ads-token.py
   ```

4. A browser window will open. Sign in with **the Google account that has access to the vFairs Google Ads account**

5. Click **Allow** when asked for permissions

6. The script will save your refresh token automatically to `.config/google-ads.yaml`

7. You'll see: `✅ Refresh token saved to .config/google-ads.yaml`

> If you see "access_denied": make sure you're signing in with the correct Google account (the one Aatir added to Google Ads).

---

## Step 12 — Generate your .mcp.json

This script auto-detects your paths and creates the `.mcp.json` file Claude Code needs.

**From the repo root:**
```
python setup/configure.py
```

You'll see a list of paths it found and any warnings about missing files. If everything is green, you're ready. If there are warnings, fix the missing items and re-run.

> ⚠️ **Critical:** `.mcp.json` must be at the repo ROOT (not in a subfolder). The configure.py script handles this automatically.

---

## Step 13 — Install Node.js dependencies (for MQL report)

The MQL report script is a Node.js script. Install its dependencies:

```
cd src/vfairs
npm install
```

---

## Step 14 — Open the repo in Claude Code

1. In your terminal, navigate to the repo root:
   **Mac:** `cd ~/Documents/vfairs-marketing-ops`
   **Windows:** `cd C:\Users\YOUR_USERNAME\Documents\vfairs-marketing-ops`

2. Launch Claude Code:
   ```
   claude
   ```

3. Claude Code will start and load the MCP servers in the background (takes ~10 seconds)

4. You'll see a `>` prompt. Type a test message:
   ```
   What MCP tools do you have available?
   ```
   You should see it mention Google Analytics, Google Ads, and Google Search Console tools.

---

## Step 15 — First run: authorize Google Search Console

The first time you run `/search-console-audit`, the MCP server will open a browser window for you to sign in to Google Search Console. This is normal and only happens once.

1. Run `/search-console-audit quick` in Claude Code
2. A browser window will open — sign in with your Google account
3. Click **Allow**
4. Come back to Claude Code — the audit will continue automatically
5. Your authorization is cached for future runs

---

## Verify everything works

Run each skill and confirm you get data (not errors):

```
/mql-report
```
Expected: A report comparing 2026 vs 2025 MQL data

```
/google-ads-audit
```
Expected: Analysis of vFairs Google Ads campaigns (takes 1–2 minutes)

```
/search-console-audit quick
```
Expected: Quick triage of Search Console data

---

## Troubleshooting

### "MCP tools not available" when running a skill
Claude Code needs to find `.mcp.json` at the repo root. Check:
1. Run `ls -la` (Mac) or `dir` (Windows) in the repo root — you should see `.mcp.json`
2. If it's missing, re-run `python setup/configure.py`
3. Restart Claude Code (`/exit` then `claude` again)
4. If still missing: make sure you launched Claude Code from the repo root directory

### Google Ads auth error ("invalid_grant")
Your refresh token has expired. Re-run: `python setup/generate-google-ads-token.py`

### "No module named yaml" or "No module named google_auth_oauthlib"
Run: `pip install google-auth-oauthlib pyyaml`

### Search Console shows no data
Make sure Aatir has added your Google account as a user in Google Search Console.

### Google Ads shows no data
Make sure Aatir has added your Google account as a user in the vFairs Google Ads account.

### MQL report shows nothing
The MQL report uses a service account (no individual auth needed) — if it fails, let Aatir know.

---

## Opening in Cursor (optional but recommended)

To view generated reports and manage files in a nice UI:

1. Open Cursor
2. Go to **File → Open Folder**
3. Select your `vfairs-marketing-ops` folder
4. Reports generated by Claude Code will appear in `outputs/vfairs/`
5. You can also open a terminal inside Cursor (`Ctrl+`` `) and run `claude` from there

---

## Quick reference — available skills

**Audit skills (require MCP servers):**
- `/google-ads-audit` — Full Google Ads analysis
- `/search-console-audit` — Full SEO/GSC analysis
- `/search-console-audit quick` — 15-minute morning triage
- `/mql-report` — Live MQL performance report

**Performance marketing:**
- `/paid-ads` — Ad copy, targeting strategy, campaign structure
- `/ab-test-setup` — Design A/B tests with sample sizes and success metrics
- `/analytics-tracking` — Set up GA4 events and GTM implementation
- `/page-cro` — Improve any page's conversion rate
- `/form-cro` — Optimize lead capture forms
- `/popup-cro` — Design high-converting popups/overlays

**Content & copy:**
- `/copywriting` — Write landing pages, feature pages, homepage copy
- `/copy-editing` — Review and improve existing copy
- `/email-sequence` — Build nurture/onboarding email flows
- `/social-content` — LinkedIn/Twitter/Instagram content

**Strategy:**
- `/seo-audit` — Diagnose SEO issues on any page
- `/content-strategy` — Plan content topics and clusters
- `/launch-strategy` — Plan a product/feature launch
- `/pricing-strategy` — Packaging and pricing decisions
- `/competitor-alternatives` — Build competitor comparison pages
