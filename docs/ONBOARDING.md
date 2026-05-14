# Onboarding: from zero to first skill in ~15 minutes

Welcome to the vFairs Marketing OS. This guide gets you set up to run AI-powered marketing skills in Claude Code with live access to HubSpot, GA4, Google Ads, Search Console, Gong, and more.

**Time required:** About 15 minutes if everything goes smoothly. Budget 30 if it's your first time installing developer tools.

**Audience:** vFairs marketers. No coding experience required, just willingness to copy-paste commands into a terminal.

---

## ✨ The fastest path: use `/onboarding`

This document is the reference guide. If you'd rather have Claude Code walk you through setup interactively, do this:

1. Install Claude Code (see Step 1 below if you don't have it yet).
2. Clone this repo.
3. Run `claude` from the repo root.
4. Type `/onboarding`.

The `/onboarding` skill auto-detects your OS, runs commands for you, verifies each step, and handles errors. **Recommended for first-time setup.**

If you'd rather do it manually, continue below.

---

## Big picture

You'll do five things:

1. Install three small tools: Claude Code, Node.js, Python
2. Clone this repo to your computer
3. Get the shared credentials from the team vault and paste them into one file
4. Run two setup commands
5. Open Claude Code and run your first skill

Most of the time is in steps 1 and 3. Once you're set up, you only need to open Claude Code.

---

## What you need before you start

| Need | Where to get it |
|---|---|
| GitHub access to this repo | Ask Aatir to add you as a collaborator |
| Team vault access (1Password, Bitwarden, or wherever the team stores shared creds) | Ask Aatir to invite you |
| A Google account that's been added to vFairs Google Ads and Search Console as a viewer | Aatir handles this |
| Admin rights on your laptop | You should already have this |

---

## Step 1: Install Claude Code

Claude Code is the AI tool that runs your skills. It runs in a terminal.

### Mac

1. Open **Terminal** (Spotlight: `Cmd + Space`, type "Terminal")
2. Install Node.js if you don't have it. Check first: `node --version`. If you see a version number, skip. Otherwise:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   brew install node
   ```
3. Install Claude Code:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
4. Verify: `claude --version`. You should see a version number.

### Windows

1. Open **PowerShell as Administrator** (Win+X, then "Terminal (Admin)")
2. Install Node.js: download the LTS installer from [nodejs.org](https://nodejs.org) and run it.
3. After install, close and reopen PowerShell. Then:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
4. Verify: `claude --version`.

### Sign in to Claude Code

Run `claude` in your terminal. It'll open a browser for you to sign in. Use the team Anthropic account credentials Aatir shares with you. After signing in, type `/exit` to close.

---

## Step 2: Install Python

Python runs the local Search Console MCP server.

### Mac

```
python3 --version
```
If you see `Python 3.x.x`, skip. Otherwise:
```
brew install python
```

### Windows

```
python --version
```
If you see `Python 3.x.x`, skip. Otherwise download from [python.org/downloads](https://python.org/downloads). During install, **check "Add Python to PATH"**.

---

## Step 3: Clone this repo

In your terminal:

### Mac
```
cd ~/Documents
git clone https://github.com/aatirar/vfairs-marketing-ops.git vFairs-Marketing-OS
cd vFairs-Marketing-OS
```

### Windows
```
cd $HOME\Documents
git clone https://github.com/aatirar/vfairs-marketing-ops.git vFairs-Marketing-OS
cd vFairs-Marketing-OS
```

---

## Step 4: Get credentials from the team vault

Open the shared vault (1Password or whatever the team uses). You'll need access to the **"vFairs Marketing OS"** entry. Ask Aatir if you can't find it.

The vault has two things you need to copy:

### 4a. Copy the `.env` template values

Inside the repo, you'll see `.env.example`. Make your own copy:

**Mac:**
```
cp .env.example .env
```

**Windows:**
```
copy .env.example .env
```

Open `.env` in any text editor (Cursor, VS Code, Notepad). Open the vault entry "vFairs Marketing OS .env values" and paste each value into your `.env` file. Save.

Values you'll be copying:
- HubSpot read-only token
- Google Ads developer token + client ID + client secret + refresh token
- Gong API key + secret (shared marketing read-only)
- Ahrefs, Semrush, Apify, Tavily, Smartlead, Gemini API keys
- Slack user token (yours, see Step 4c)

### 4b. Download the shared Google service account JSON

In the vault, find **"google-credentials.json"** under "vFairs Marketing OS". Download it. Place it in the repo at:

**Mac:**
```
mkdir -p .config
mv ~/Downloads/google-credentials.json .config/
```

**Windows:**
```
mkdir .config
move %USERPROFILE%\Downloads\google-credentials.json .config\
```

This one file authorizes BOTH GA4 and Google Search Console. It's been pre-added as a user on the vFairs GSC property and given GA4 viewer access, so it just works.

### 4c. Generate your personal Slack token (write actions)

Slack actions (posting messages, reading your DMs) need to be tied to your personal account, not a shared one. To get yours:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Open the "vFairs Marketing OS" app (Aatir will have shared it with you)
3. Under "Install App," click "Install to Workspace"
4. Copy the **User OAuth Token** (starts with `xoxp-`)
5. Paste into `.env` as `SLACK_USER_TOKEN=xoxp-...`

If you don't need Slack-posting skills (`/morning-report`, `/slack-tasks`, `/slack-campaigns`, `/audit-debt`), you can skip this and leave the value blank.

---

## Step 5: Install MCP servers

MCP servers are background processes that let Claude Code talk to APIs.

### Mac

```
pip3 install pipx
pipx ensurepath
```
Close and reopen Terminal, then:
```
pipx install google-analytics-mcp
pipx install git+https://github.com/googleads/google-ads-mcp.git
```

Set up the local GSC server:
```
cd mcp-servers/google-search-console
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..
```

### Windows

```
pip install pipx
pipx ensurepath
```
Close and reopen PowerShell, then:
```
pipx install google-analytics-mcp
pipx install git+https://github.com/googleads/google-ads-mcp.git
```

GSC server:
```
cd mcp-servers\google-search-console
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
deactivate
cd ..\..
```

---

## Step 6: Generate your local .mcp.json

This script detects all the paths on your machine and writes the `.mcp.json` file Claude Code needs.

```
python setup/configure.py
```

You'll see a list of paths and any warnings. If all green, you're done. If anything's red, fix it and re-run.

---

## Step 7: Install Node dependencies

Some scripts (like `/mql-report`) need Node packages:

```
cd scripts
npm install
cd ..
```

---

## Step 8: Open in Claude Code and test

From the repo root:
```
claude
```

Claude Code starts, loads MCP servers (takes ~10 seconds). At the prompt, type:
```
What MCP tools do you have available?
```

You should see HubSpot, Google Ads, Search Console, GA4, and others.

Now run your first real skill:
```
/mql-report
```

Expected: A live MQL comparison report. Takes 5-10 seconds.

If you got data: **you're done.** Welcome to the team.

---

## Troubleshooting

### "MCP tools not available" when running a skill

Claude Code reads `.mcp.json` at the repo root.
1. Make sure you're running `claude` from the repo root (where `.mcp.json` lives, not from a subfolder)
2. Run `python setup/configure.py` to regenerate
3. Restart: `/exit`, then `claude`

### Google Ads: "invalid_grant" or "refresh token expired"

The shared refresh token in `.env` may have been rotated. Re-fetch from the vault and replace in `.env`.

### Search Console: "no data" or "permission denied"

The shared service account email must be added as a user on the vFairs GSC property. Ask Aatir to confirm. The email is in the service account JSON under `"client_email"`.

### "No module named yaml" or similar Python errors

```
pip install google-auth-oauthlib pyyaml google-api-python-client
```

### MQL report says "auth error"

The service account in `.config/google-credentials.json` needs viewer access to the MQL Google Sheet. Ask Aatir if it's missing.

### HubSpot returns 401

The HubSpot token in `.env` was rotated. Re-fetch from the vault.

### "Permission denied" when running setup/configure.py

```
chmod +x setup/configure.py
python setup/configure.py
```

---

## What's next

- **See all available skills:** [docs/SKILLS.md](SKILLS.md)
- **Multi-skill workflows:** [docs/PLAYBOOKS.md](PLAYBOOKS.md)
- **Add your own skill:** [docs/CONTRIBUTING.md](CONTRIBUTING.md)
- **Daily morning briefing:** run `/morning-report` each morning for MQLs + ads spend + email + calendar
- **Weekly check-in:** run `/gong-weekly-analysis` Monday mornings for last week's prospect call insights

For questions or stuck setup: Aatir or #marketing-ops on Slack.
