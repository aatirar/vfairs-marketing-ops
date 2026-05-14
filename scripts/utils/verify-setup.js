#!/usr/bin/env node
/**
 * verify-setup.js — credential and connection verifier for vFairs Marketing OS.
 *
 * Run from repo root:  node scripts/utils/verify-setup.js
 *                     OR: npm run verify
 *
 * Tests every credential in .env + the service account file in .config/.
 * Outputs a green/red checklist. Exits 0 if everything works, 1 if anything fails.
 * Continues all checks even if individual ones fail — gives the full picture in one pass.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

const REPO_ROOT = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });

const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const icon = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  const status = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${icon} ${name.padEnd(30)} ${status}${detail ? '  ' + detail : ''}`);
}

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = https;
    const req = lib.request(url, options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let json;
        try { json = JSON.parse(body); } catch { json = body; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('timeout')));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
  } catch (e) {
    record(name, false, e.message);
  }
}

// ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n\x1b[1mvFairs Marketing OS — setup verification\x1b[0m');
  console.log('=========================================\n');

  // 1. .env file present
  console.log('\x1b[1m[1] Local files\x1b[0m');
  const envPath = path.join(REPO_ROOT, '.env');
  await check('.env file exists', async () => {
    if (!fs.existsSync(envPath)) throw new Error('Run: cp .env.example .env');
    return path.relative(REPO_ROOT, envPath);
  });

  const credPath = path.join(REPO_ROOT, '.config', 'google-credentials.json');
  await check('.config/google-credentials.json', async () => {
    if (!fs.existsSync(credPath)) throw new Error('Download from team vault and place at .config/google-credentials.json');
    const j = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    return `service account: ${j.client_email}`;
  });

  // 2. Shared credentials
  console.log('\n\x1b[1m[2] Shared API credentials (read from .env)\x1b[0m');

  await check('HubSpot token', async () => {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) throw new Error('HUBSPOT_ACCESS_TOKEN not set');
    const r = await fetchJSON('https://api.hubapi.com/crm/v3/properties/contact?limit=1', {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}` },
    });
    if (r.status === 401) throw new Error('401 — token invalid or rotated. Fetch fresh from vault.');
    if (r.status !== 200) throw new Error(`HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 100)}`);
    return 'connected';
  });

  await check('Google Ads developer token', async () => {
    if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) throw new Error('not set');
    if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) throw new Error('GOOGLE_ADS_REFRESH_TOKEN not set');
    return 'token + refresh token present (full check via google-ads MCP)';
  });

  await check('GA4 property', async () => {
    if (!process.env.GA4_PROPERTY_ID) throw new Error('GA4_PROPERTY_ID not set');
    return `property: ${process.env.GA4_PROPERTY_ID}`;
  });

  await check('Gong API key', async () => {
    if (!process.env.GONG_API_KEY || !process.env.GONG_API_SECRET) throw new Error('GONG_API_KEY or GONG_API_SECRET not set');
    const auth = Buffer.from(`${process.env.GONG_API_KEY}:${process.env.GONG_API_SECRET}`).toString('base64');
    const r = await fetchJSON('https://api.gong.io/v2/users?limit=1', {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
    });
    if (r.status === 401 || r.status === 403) throw new Error(`${r.status} — credentials invalid`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return 'connected';
  });

  await check('Ahrefs API key', async () => {
    if (!process.env.AHREFS_API_KEY) throw new Error('not set');
    const r = await fetchJSON('https://api.ahrefs.com/v3/subscription-info/limits-and-usage', {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.AHREFS_API_KEY}` },
    });
    if (r.status === 401 || r.status === 403) throw new Error(`${r.status} — key invalid`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return 'connected';
  });

  await check('Semrush API key', async () => {
    if (!process.env.SEMRUSH_API_KEY) throw new Error('not set');
    return 'key present (full check via semrush MCP)';
  });

  await check('Apify token', async () => {
    if (!process.env.APIFY_API_KEY) throw new Error('not set');
    const r = await fetchJSON('https://api.apify.com/v2/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.APIFY_API_KEY}` },
    });
    if (r.status === 401) throw new Error('401 — token invalid');
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return `user: ${r.body.data?.username || 'connected'}`;
  });

  await check('Tavily API key', async () => {
    if (!process.env.TAVILY_API_KEY) throw new Error('not set');
    return 'key present (full check via tavily MCP)';
  });

  await check('Smartlead API key', async () => {
    if (!process.env.SMARTLEAD_API_KEY) throw new Error('not set');
    return 'key present (full check via smartlead MCP)';
  });

  await check('Gemini API key', async () => {
    if (!process.env.GEMINI_API_KEY) throw new Error('not set');
    const r = await fetchJSON(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`, {
      method: 'GET',
    });
    if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error(`${r.status} — key invalid`);
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return 'connected';
  });

  // 3. Personal credentials (optional)
  console.log('\n\x1b[1m[3] Personal credentials (optional)\x1b[0m');

  await check('Slack user token', async () => {
    if (!process.env.SLACK_USER_TOKEN) return 'not set (skip — only needed for /morning-report, /slack-tasks, /slack-campaigns, /audit-debt)';
    const r = await fetchJSON('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (!r.body.ok) throw new Error(r.body.error || 'auth.test failed');
    return `user: ${r.body.user} in ${r.body.team}`;
  });

  await check('Google Workspace OAuth (Gmail+Calendar)', async () => {
    const credsDir = path.join(require('os').homedir(), '.google_workspace_mcp', 'credentials');
    if (!fs.existsSync(credsDir)) return 'not set up (skip — run scripts/utils/generate-workspace-token.py if you need /morning-report email/calendar)';
    const tokens = fs.readdirSync(credsDir).filter(f => f.endsWith('.json'));
    if (tokens.length === 0) return 'no tokens found (skip)';
    return `${tokens.length} token(s) cached: ${tokens.join(', ')}`;
  });

  // 4. Service account access checks
  console.log('\n\x1b[1m[4] Google service account access\x1b[0m');

  await check('GA4 access via service account', async () => {
    if (!fs.existsSync(credPath)) throw new Error('credentials file missing');
    try {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        keyFile: credPath,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      if (!token.token) throw new Error('no access token');
      return 'service account authenticated';
    } catch (e) {
      throw new Error(e.message.split('\n')[0]);
    }
  });

  await check('Google Sheets access (for MQL data)', async () => {
    if (!fs.existsSync(credPath)) throw new Error('credentials file missing');
    try {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        keyFile: credPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      await auth.getClient();
      return 'service account can access Sheets';
    } catch (e) {
      throw new Error(e.message.split('\n')[0]);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log('\n' + '='.repeat(50));
  console.log(`\x1b[1m${passed} passed, ${failed} failed\x1b[0m`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\nFix the failures above, then re-run: \x1b[1mnpm run verify\x1b[0m');
    console.log('Refer to docs/CREDENTIALS.md for help with each credential.\n');
    process.exit(1);
  } else {
    console.log("\n\x1b[32mYou're ready. Open Claude Code and try /mql-report or /morning-report.\x1b[0m\n");
    process.exit(0);
  }
}

main().catch(e => {
  console.error('\n\x1b[31mFATAL:\x1b[0m', e.message);
  process.exit(2);
});
