/**
 * Milestone 1: Last Interaction Detection + Email Summary
 *
 * For each 2026 contact in the MQL sheet:
 *
 * Step 1 — Use EXISTING sheet data (no API call):
 *   Compare "Recent sales email replied date" (AE) vs "Last engagement date" (AF)
 *   If customer reply is MORE RECENT → customer replied last → flag it
 *
 * Step 2 — For contacts where rep acted last:
 *   Fetch HubSpot engagements to determine: was the last rep action an email or a meeting?
 *
 * Step 3 — Gemini summary (only for "customer replied last" contacts):
 *   Fetch last 3 outbound rep emails (the discussion context)
 *   Summarize what was being discussed + flag that customer replied with no rep follow-up
 *
 * Writes to columns:
 *   AH: Last Interaction Type  (Email - Customer / Email - Rep / Meeting / Gong Call / None)
 *   AI: Last Interaction Date  (YYYY-MM-DD)
 *   AJ: Last Email Sender      (Customer / Rep / -)
 *   AK: Email Summary          (2 sentences — only when customer replied last)
 *
 * Usage:
 *   node reporting/enrich-last-interaction.js             # all unenriched 2026 contacts
 *   node reporting/enrich-last-interaction.js --dry-run   # no writes, just log
 *   node reporting/enrich-last-interaction.js --limit 10  # cap (for testing)
 *   node reporting/enrich-last-interaction.js --all       # re-run even already-enriched rows
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const GEMINI_KEY    = process.env.GEMINI_API_KEY;
const SHEET_ID      = '1r7QiPKC_ktXuw1JW5tx6fN-8DMu3HdQSxus87Zc_zVQ';
const REP_DOMAINS   = ['vfairs.com', 'getvfairs.com'];
const HS_BASE       = 'https://api.hubapi.com';
const HS_AUTH       = { 'Authorization': `Bearer ${HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' };

// Column indices (0-based, from column A)
const COL = {
  YEAR:            0,   // A
  LEAD_STATUS:     5,   // F
  VID:             12,  // M
  EMAIL:           20,  // U
  REPLY_DATE:      30,  // AE — hs_sales_email_last_replied (customer's last reply)
  ENGAGEMENT_DATE: 31,  // AF — hs_last_sales_activity_timestamp (last rep activity)
  // New enrichment columns:
  INTERACTION_TYPE: 33, // AH
  INTERACTION_DATE: 34, // AI
  EMAIL_SENDER:    35,  // AJ
  EMAIL_SUMMARY:   36,  // AK
};

const isDryRun = process.argv.includes('--dry-run');
const rerunAll = process.argv.includes('--all');
const limitArg = process.argv.indexOf('--limit');
const LIMIT    = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── HubSpot helpers ───────────────────────────────────────────────────────────

async function hsGet(url) {
  const r = await fetch(url, { headers: HS_AUTH });
  if (!r.ok) throw new Error(`GET ${url.split('?')[0]} → ${r.status}`);
  return r.json();
}

async function hsPost(endpoint, body) {
  const r = await fetch(`${HS_BASE}${endpoint}`, {
    method: 'POST', headers: HS_AUTH, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`POST ${endpoint} → ${r.status}`);
  return r.json();
}

// ── Get last N outbound emails from HubSpot Engagements v1 ───────────────────
async function getOutboundEmails(contactId, limit = 3) {
  const url = `${HS_BASE}/engagements/v1/engagements/associated/CONTACT/${contactId}/paged?count=100`;
  let data;
  try { data = await hsGet(url); } catch { return []; }

  return (data.results || [])
    .filter(e => e.engagement?.type === 'EMAIL')
    .map(e => ({
      timestamp: e.engagement?.timestamp || 0,
      fromEmail: e.metadata?.from?.email || '',
      subject:   e.metadata?.subject || '(no subject)',
      rawHtml:   e.metadata?.html || '',
      body:      (e.metadata?.text || e.metadata?.html || '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim()
                   .slice(0, 2000)   // keep more so we can find quoted content
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ── Extract the customer's quoted reply from a rep email body ─────────────────
// When a rep replies to a customer, HubSpot logs the rep's email including
// the customer's previous message as a quote in the body.
function extractCustomerQuote(email) {
  // Try HTML first: <blockquote> is the most reliable marker
  if (email.rawHtml) {
    const bq = email.rawHtml.match(/<blockquote[^>]*>([\s\S]+?)<\/blockquote>/i);
    if (bq) {
      const text = bq[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 20) return text.slice(0, 1000);
    }
    // Gmail quote div
    const gq = email.rawHtml.match(/class="gmail_quote"[^>]*>([\s\S]+?)(?=<\/div>)/i);
    if (gq) {
      const text = gq[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 20) return text.slice(0, 1000);
    }
  }

  const text = email.body;
  if (!text) return null;

  // "On [date], [Name] <email> wrote:" pattern (most common in plain-text replies)
  const onWrote = text.match(/On\s+.{5,100}?wrote:\s*[\r\n]+([\s\S]+)/i);
  if (onWrote) {
    return onWrote[1].replace(/^>+\s?/gm, '').trim().slice(0, 1000);
  }

  // Lines starting with ">" (standard quote markers)
  const quoteLines = text.split('\n').filter(l => l.trimStart().startsWith('>'));
  if (quoteLines.length >= 2) {
    return quoteLines.map(l => l.replace(/^[\s>]+/, '')).join('\n').trim().slice(0, 1000);
  }

  return null;
}

// ── Get last meeting from HubSpot CRM v3 ─────────────────────────────────────
async function getLastMeeting(contactId) {
  let assocData;
  try {
    assocData = await hsGet(`${HS_BASE}/crm/v3/objects/contacts/${contactId}/associations/MEETING?limit=20`);
  } catch { return null; }

  const ids = (assocData.results || []).map(r => r.id).filter(Boolean);
  if (!ids.length) return null;

  try {
    const resp = await hsPost('/crm/v3/objects/meetings/batch/read', {
      properties: ['hs_timestamp', 'hs_meeting_source', 'hs_meeting_title'],
      inputs: ids.slice(0, 20).map(id => ({ id }))
    });
    return (resp.results || [])
      .filter(m => m.properties?.hs_timestamp)
      .sort((a, b) => new Date(b.properties.hs_timestamp) - new Date(a.properties.hs_timestamp))[0] || null;
  } catch { return null; }
}

// ── Gemini: summarize customer's reply (extracted from rep's email quote) ──────
async function summarizeCustomerReply(customerQuote, replyDate, genAI) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
  const replyStr = replyDate.toLocaleDateString('en-US');

  const prompt = `A sales prospect sent the following message to a vFairs sales rep on ${replyStr}. The rep has not replied yet.

Customer's message:
"${customerQuote}"

Write exactly 2 sentences:
1. What the customer is asking for or saying (be specific — include any product details, objections, or requests they raised)
2. What the rep should do next to move this forward

Rules: Under 55 words total. No em dashes. No jargon. Be concrete, not vague.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/\n+/g, ' ');
  } catch (e) {
    return `[Summary error: ${e.message.slice(0, 80)}]`;
  }
}

// ── Gemini: fallback when no customer quote found — summarize rep's thread ────
async function summarizeRepThread(emails, customerReplyDate, genAI) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

  const thread = emails.map((e, i) => {
    const date = new Date(e.timestamp).toLocaleDateString('en-US');
    return `Email ${i + 1} [Rep, ${date}]\nSubject: ${e.subject}\n${e.body.slice(0, 600)}`;
  }).join('\n\n---\n\n');

  const replyStr = customerReplyDate.toLocaleDateString('en-US');

  const prompt = `A sales prospect replied to the rep's email on ${replyStr}. The customer's reply text is not directly available. The rep has not followed up yet.

Here are the last ${emails.length} rep emails (newest first):
${thread}

Write exactly 2 sentences:
1. What topic the rep was discussing with the prospect
2. What the rep should do next given the customer replied on ${replyStr} with no follow-up

Rules: Specific and factual. No em dashes. No jargon. Under 60 words total.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/\n+/g, ' ');
  } catch (e) {
    return `[Summary error: ${e.message.slice(0, 80)}]`;
  }
}

// ── Process a single contact ──────────────────────────────────────────────────
async function processContact(row, genAI) {
  const vid            = String(row[COL.VID]             || '').trim();
  const replyDateRaw   = String(row[COL.REPLY_DATE]      || '').trim();
  const engDateRaw     = String(row[COL.ENGAGEMENT_DATE] || '').trim();

  if (!vid) return null;

  const replyDate = replyDateRaw ? new Date(replyDateRaw) : null;
  const engDate   = engDateRaw   ? new Date(engDateRaw)   : null;

  // ── Path A: Customer replied MORE RECENTLY than last rep activity ─────────
  const customerRepliedLast = replyDate && (!engDate || replyDate > engDate);
  if (customerRepliedLast) {
    const date   = replyDate.toISOString().split('T')[0];
    const emails = await getOutboundEmails(vid, 3);

    if (!emails.length) {
      return {
        type: 'Email - Customer', date, sender: 'Customer',
        summary: `Customer replied on ${date}. No rep emails found in CRM.`,
        geminiUsed: false
      };
    }

    // Try to extract the customer's actual reply from the quoted text in the rep's emails
    let customerQuote = null;
    for (const email of emails) {
      customerQuote = extractCustomerQuote(email);
      if (customerQuote) break;
    }

    const summary = customerQuote
      ? await summarizeCustomerReply(customerQuote, replyDate, genAI)
      : await summarizeRepThread(emails, replyDate, genAI);

    return { type: 'Email - Customer', date, sender: 'Customer', summary, geminiUsed: true };
  }

  // ── Path B: Rep was last to act — determine email vs meeting ─────────────
  // Run both in parallel to save time
  const [emails, lastMeeting] = await Promise.all([
    getOutboundEmails(vid, 1),
    getLastMeeting(vid)
  ]);

  const emailTime   = emails[0]?.timestamp   || 0;
  const meetingTime = lastMeeting
    ? new Date(lastMeeting.properties.hs_timestamp).getTime()
    : 0;

  if (!emailTime && !meetingTime) {
    // Use engagement date from sheet as fallback
    const fallbackDate = engDate ? engDate.toISOString().split('T')[0] : '';
    return { type: 'None', date: fallbackDate, sender: '', summary: '', geminiUsed: false };
  }

  if (meetingTime >= emailTime) {
    const src  = (lastMeeting.properties?.hs_meeting_source || '').toUpperCase();
    const type = src.includes('GONG') ? 'Gong Call' : 'Meeting';
    const date = new Date(meetingTime).toISOString().split('T')[0];
    return { type, date, sender: '', summary: '', geminiUsed: false };
  }

  // Email is more recent than meeting
  const date = new Date(emailTime).toISOString().split('T')[0];
  return { type: 'Email - Rep', date, sender: 'Rep', summary: '', geminiUsed: false };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!HUBSPOT_TOKEN) throw new Error('HUBSPOT_ACCESS_TOKEN not set in .env');
  if (!GEMINI_KEY)    throw new Error('GEMINI_API_KEY not set in .env');

  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}${rerunAll ? ' (--all)' : ''}`);

  const auth   = new google.auth.GoogleAuth({
    credentials: require(path.resolve(__dirname, '../../.config/google-credentials.json')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const genAI  = new GoogleGenerativeAI(GEMINI_KEY);

  console.log('Reading sheet...');
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'MQLs!A2:AK'
  });
  const rows = readRes.data.values || [];
  console.log(`Sheet rows: ${rows.length}`);

  const toProcess = rows
    .map((row, idx) => ({ row, sheetRow: idx + 2 }))
    .filter(({ row }) => {
      const year = String(row[COL.YEAR] || '').trim();
      const done = String(row[COL.INTERACTION_TYPE] || '').trim();
      return year === '2026' && (rerunAll || !done);
    })
    .slice(0, LIMIT);

  console.log(`2026 contacts to enrich: ${toProcess.length}`);
  if (isDryRun) console.log('DRY RUN — no writes.\n');

  // Quick stats preview
  const customerRepliedCount = toProcess.filter(({ row }) => {
    const rD = row[COL.REPLY_DATE]      ? new Date(row[COL.REPLY_DATE])      : null;
    const eD = row[COL.ENGAGEMENT_DATE] ? new Date(row[COL.ENGAGEMENT_DATE]) : null;
    return rD && (!eD || rD > eD);
  }).length;
  console.log(`Contacts where customer replied last (→ Gemini): ${customerRepliedCount}`);
  console.log(`Estimated Gemini cost: ~$${(customerRepliedCount * 0.0001).toFixed(4)}\n`);

  const BATCH_SIZE = 5;
  const pending    = [];
  let geminiCalls  = 0;
  let errors       = 0;
  let counts       = { 'Email - Customer': 0, 'Email - Rep': 0, 'Meeting': 0, 'Gong Call': 0, 'None': 0 };

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(({ row, sheetRow }) =>
        processContact(row, genAI).then(r => r ? { sheetRow, ...r } : null)
      )
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const { sheetRow, type, date, sender, summary, geminiUsed } = res.value;
        pending.push({ sheetRow, values: [type, date, sender, summary] });
        if (geminiUsed) geminiCalls++;
        counts[type] = (counts[type] || 0) + 1;
        console.log(`  Row ${sheetRow}: [${type}] ${date}${sender ? ' | sender=' + sender : ''}${summary ? ' | summary=YES' : ''}`);
        if (summary) console.log(`    → ${summary.slice(0, 120)}`);
      } else if (res.status === 'rejected') {
        errors++;
        console.error(`  Error: ${res.reason?.message?.slice(0, 120)}`);
      }
    }

    // Flush every 50 rows or at end
    const isLast = i + BATCH_SIZE >= toProcess.length;
    if (!isDryRun && pending.length > 0 && (pending.length >= 50 || isLast)) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: pending.map(u => ({
            range: `MQLs!AH${u.sheetRow}:AK${u.sheetRow}`,
            values: [u.values]
          }))
        }
      });
      console.log(`  ✓ Wrote ${pending.length} rows to sheet`);
      pending.length = 0;
    }

    if (!isLast) await sleep(400);

    const done = Math.min(i + BATCH_SIZE, toProcess.length);
    if (done % 100 === 0 || done === toProcess.length) {
      console.log(`\nProgress: ${done}/${toProcess.length} | Gemini: ${geminiCalls} | Errors: ${errors}`);
    }
  }

  console.log('\n── Summary ─────────────────────────────────────────────');
  Object.entries(counts).forEach(([k, v]) => { if (v) console.log(`  ${k}: ${v}`); });
  console.log(`  Gemini calls: ${geminiCalls} (~$${(geminiCalls * 0.0001).toFixed(4)})`);
  console.log(`  Errors: ${errors}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
