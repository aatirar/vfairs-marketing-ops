# Google Ads Audit Skill - Setup Guide

## Setup Status ✅

The following has been completed:

✅ **Credentials Added** - Developer token and project ID in `vFairs/.env`
✅ **OAuth Credentials** - `google-ads-credentials.json` in `vFairs/` folder
✅ **MCP Server Configured** - `.mcp.json` created with Google Ads MCP server
✅ **pipx Installed** - Python package installer for MCP server
✅ **Permissions Set** - MCP tools enabled in local settings
✅ **Skill Created** - `/google-ads-audit` skill ready to use
✅ **Audit Directory** - `vFairs/google-ads-audits/` created for report storage

## Next Steps

### 1. Restart Claude Code

**IMPORTANT:** You must restart Claude Code for the MCP server to load.

Close and reopen your Claude Code session.

### 2. Approve the MCP Server

When you restart, Claude Code will detect the new MCP server in `.mcp.json` and ask you to approve it:

```
New MCP server detected: google-ads
Do you want to enable this server? [y/n]
```

Type `y` to approve.

### 3. First-Time OAuth Authorization

The first time you run `/google-ads-audit`, you'll need to authorize access:

1. A browser window will automatically open
2. Sign in with your Google account (the one that has access to Google Ads)
3. You'll see a consent screen: "google-ads-mcp wants to access your Google Account"
4. Click "Allow" to grant permissions
5. You'll see "Authentication successful" - you can close the browser
6. Return to Claude Code - the skill will continue automatically

**Note:** The OAuth token is cached, so you only need to do this once unless you revoke access.

### 4. Run Your First Audit

In Claude Code, simply type:

```
/google-ads-audit
```

The skill will:
- Connect to your Google Ads account(s)
- Analyze last 30 days of performance data
- Generate a comprehensive audit report
- Save the report to `vFairs/google-ads-audits/[date].md`

## What Data Gets Accessed?

The MCP server uses **READ-ONLY** access to:

- Campaign performance metrics (impressions, clicks, cost, conversions)
- Ad group statistics and settings
- Ad copy and creative assets
- Keyword performance and Quality Scores
- Search terms report
- Landing page URLs and performance
- Budget allocations

**The skill CANNOT:**
- Modify campaigns or budgets
- Create or delete ads
- Change bids or targeting
- Access billing payment information beyond spend data

## Troubleshooting

### MCP server won't start / PermissionError (WinError 5)

On Windows, using `pipx run` can fail with **PermissionError: [WinError 5] Access is denied** when Python creates or cleans up temp directories. The fix is to **install the server once** and run the installed executable instead.

**One-time setup (run in PowerShell or Command Prompt):**

```powershell
pipx install "git+https://github.com/googleads/google-ads-mcp.git"
```

If `pipx` isn't on your PATH, use:

```powershell
python -m pipx install "git+https://github.com/googleads/google-ads-mcp.git"
```

The executable will be at `C:\Users\<YourUsername>\.local\bin\google-ads-mcp.exe`. The project's `.mcp.json` is already configured to use this path. After installing, **restart Cursor** so the MCP server can start.

If your pipx installs to a different directory (e.g. `%APPDATA%\Python\Scripts`), update the `"command"` path in `.mcp.json` to match.

### "MCP server not found"

**Solution:** Restart Claude Code. The MCP server is only loaded when Claude starts.

### "pipx: command not found"

**Solution:** Open a new terminal window. The PATH changes from installing pipx require a new shell session. If that doesn't work:

```bash
# Use Python to run pipx directly
python -m pipx --version
```

### "Authentication failed"

**Possible causes:**
1. Wrong Google account - Make sure you're signing in with the account that has Google Ads access
2. OAuth consent screen not configured - Check your Google Cloud project settings
3. Credentials file path incorrect - Verify `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`

**Solution:** Delete cached token and retry:
```bash
# The token cache is typically at:
# Windows: %APPDATA%\google-ads-mcp\token.json
# Delete it and run /google-ads-audit again
```

### "Developer token not approved" or "Test mode only"

Your developer token is still in test mode and can only access Google Ads test accounts.

**Solution:**
1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Apply for production access (requires form submission)
3. Approval typically takes 1-2 business days
4. You'll receive an email when approved

You can still use the skill with test accounts while waiting for approval.

### "No customer accounts found"

**Possible causes:**
1. The Google account you authorized doesn't have access to any Google Ads accounts
2. Google Ads accounts are suspended
3. You haven't granted all required permissions during OAuth

**Solution:**
1. Verify you have access: Go to [ads.google.com](https://ads.google.com) and check you can see campaigns
2. Make sure you clicked "Allow" for all permissions during OAuth
3. Try re-authorizing by deleting the token cache (see above)

### "Rate limit exceeded"

Google Ads API has rate limits:
- **Test accounts:** 15,000 operations per day
- **Production accounts:** Higher limits (varies by spend)

**Solution:** Wait 1 hour and retry. Consider running audits less frequently (weekly/monthly instead of daily).

### Antivirus Warnings

Your antivirus may scan `google-ads-mcp.exe` on first install. This is normal and expected.

**Why it's safe:**
- Official Google project: https://github.com/googleads/google-ads-mcp
- Open source code (you can review it)
- Read-only access via OAuth (no sensitive credentials stored)
- Uses standard Google authentication protocols

Allow the scan to complete - it will pass and run normally.

## Technical Details

### MCP Server Architecture

```
Claude Code
    ↓
Google Ads MCP Server (Python via pipx)
    ↓
Google Ads API (OAuth2)
    ↓
Your Google Ads Account(s)
```

### Environment Variables

Located in `.env` at the repo root. See `.env.example` for the full template and `docs/CREDENTIALS.md` for what each value is and where to get it. The relevant keys for Google Ads:

```env
GOOGLE_ADS_DEVELOPER_TOKEN=<from vault>
GOOGLE_ADS_CLIENT_ID=<from vault>
GOOGLE_ADS_CLIENT_SECRET=<from vault>
GOOGLE_ADS_REFRESH_TOKEN=<from vault>
GOOGLE_ADS_LOGIN_CUSTOMER_ID=<from vault>
GOOGLE_APPLICATION_CREDENTIALS=.config/google-credentials.json
```

### Files Created

- **`.mcp.json`** - MCP server configuration (root directory)
- **`.claude/settings.local.json`** - Permissions updated to allow MCP tools
- **`vFairs/.env`** - Google Ads credentials added
- **`vFairs/google-ads-credentials.json`** - OAuth2 client credentials (you added this)
- **`vFairs/google-ads-audits/`** - Directory for saving audit reports
- **`.claude/skills/google-ads-audit/`** - Skill files

### OAuth Token Location

After first authorization, the MCP server caches your OAuth token at:
- **Windows:** `%APPDATA%\google-ads-mcp\token.json`
- **Mac/Linux:** `~/.google-ads-mcp/token.json`

This allows the skill to run without re-authorization each time.

## Security Best Practices

1. **Never commit credentials to git:**
   - `vFairs/.env` is already in `.gitignore`
   - `google-ads-credentials.json` should also be in `.gitignore`
   - Never share these files publicly

2. **Rotate tokens periodically:**
   - Developer tokens don't expire but can be regenerated if compromised
   - OAuth tokens expire and refresh automatically

3. **Use test mode during development:**
   - Test your setup with Google Ads test accounts first
   - Apply for production access only when ready

4. **Review OAuth permissions:**
   - Only grants read access (readonly scope)
   - Cannot modify campaigns or spend money
   - Can revoke access anytime at https://myaccount.google.com/permissions

## Support

If you encounter issues:

1. **Check MCP Server Logs:**
   - In Claude Code, open debug console
   - Look for google-ads-mcp logs

2. **Verify Configuration:**
   - Ensure all three credentials are correct in `.env`
   - Check that `.mcp.json` is in the project root
   - Confirm `google-ads-credentials.json` exists at the specified path

3. **Test MCP Connection:**
   - In Claude Code: "List my Google Ads accounts"
   - Should return list of accessible customer IDs

4. **Google Ads API Documentation:**
   - Official docs: https://developers.google.com/google-ads/api/docs/start
   - MCP server repo: https://github.com/googleads/google-ads-mcp

## Ready to Go!

Once you've restarted Claude Code and approved the MCP server, you're all set!

Run your first audit:
```
/google-ads-audit
```

The skill will guide you through OAuth if needed, then generate your comprehensive audit report.

**Pro tip:** Schedule this as a monthly task to track optimization progress over time!
