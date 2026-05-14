/**
 * Phase 1: Deal Enrichment
 *
 * For each 2026 contact in the MQL sheet:
 * - Fetch associated deals from HubSpot
 * - Most recently modified OPEN deal → Deal Stage + Time in Stage
 * - Any Closed-Won deal → Effective Lead Status = "Won" (else use sheet lead status)
 * - Sum Closed-Won 2026 deals → Won Deal Value 2026
 *
 * Writes to columns:
 *   AL: Deal Stage        (label of most recently modified open deal)
 *   AM: Time in Stage     (days since last stage change)
 *   AN: Effective Lead Status ("Won" if closed-won exists, else contact lead status)
 *   AO: Won Deal Value 2026 (sum of closed-won amounts with closedate in 2026)
 *
 * Usage:
 *   node reporting/enrich-deals.js             # all unenriched 2026 contacts
 *   node reporting/enrich-deals.js --dry-run   # no writes, just log
 *   node reporting/enrich-deals.js --limit 10  # cap for testing
 *   node reporting/enrich-deals.js --all       # re-run even already-enriched rows
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { google } = require('googleapis');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const SHEET_ID      = '1r7QiPKC_ktXuw1JW5tx6fN-8DMu3HdQSxus87Zc_zVQ';
const HS_BASE       = 'https://api.hubapi.com';
const HS_AUTH       = { 'Authorization': `Bearer ${HUBSPOT_TOKEN}`, 'Content-Type': 'application/json' };

// Column indices (0-based, from column A)
const COL = {
  YEAR:          0,   // A
  LEAD_STATUS:   5,   // F
  VID:           12,  // M
  // Enrichment output columns:
  DEAL_STAGE:    37,  // AL
  TIME_IN_STAGE: 38,  // AM
  EFF_STATUS:    39,  // AN
  WON_VALUE:     40,  // AO
};

const isDryRun = process.argv.includes('--dry-run');
const rerunAll = process.argv.includes('--all');
const limitArg = process.argv.indexOf('--limit');
const LIMIT    = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseHsDate(value) {
  if (!value) return null;
  const n = Number(value);
  return !isNaN(n) && n > 1_000_000_000 ? new Date(n) : new Date(value);
}

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

// ── Fetch all deal pipeline stages once at startup ────────────────────────────
// Returns: { stageMap: {id→label}, wonIds: Set, lostIds: Set }
async function fetchStageData() {
  const data = await hsGet(`${HS_BASE}/crm/v3/pipelines/deals`);
  const stageMap = {};
  const wonIds   = new Set();
  const lostIds  = new Set();
  for (const pipeline of data.results || []) {
    for (const stage of pipeline.stages || []) {
      stageMap[stage.id] = stage.label;
      const prob     = parseFloat(stage.metadata?.probability ?? -1);
      const isClosed = stage.metadata?.isClosed === 'true';
      if (isClosed && prob >= 1.0)  wonIds.add(stage.id);
      if (isClosed && prob <  1.0)  lostIds.add(stage.id);
    }
  }
  return { stageMap, wonIds, lostIds };
}

// ── Get deal IDs associated with a contact ────────────────────────────────────
async function getDealIds(contactId) {
  let after = null;
  const ids = [];
  do {
    const url = `${HS_BASE}/crm/v3/objects/contacts/${contactId}/associations/DEAL?limit=100${after ? '&after=' + after : ''}`;
    let data;
    try { data = await hsGet(url); } catch { break; }
    for (const r of data.results || []) if (r.id) ids.push(r.id);
    after = data.paging?.next?.after || null;
  } while (after);
  return ids;
}

// ── Batch-read deals (up to 50 at a time) with stage history ─────────────────
async function batchReadDeals(dealIds) {
  const results = [];
  for (let i = 0; i < dealIds.length; i += 50) {
    const chunk = dealIds.slice(i, i + 50);
    const resp = await hsPost('/crm/v3/objects/deals/batch/read', {
      properties: ['dealstage', 'hs_lastmodifieddate', 'amount', 'closedate'],
      propertiesWithHistory: ['dealstage'],
      inputs: chunk.map(id => ({ id }))
    });
    results.push(...(resp.results || []));
    if (i + 50 < dealIds.length) await sleep(200);
  }
  return results;
}

// ── Calculate days in current stage from history ──────────────────────────────
function daysInCurrentStage(deal) {
  const history = deal.propertiesWithHistory?.dealstage;
  let sinceMs;
  if (history && history.length > 0) {
    // History is newest-first; index 0 = when current stage was entered
    sinceMs = new Date(history[0].timestamp).getTime();
  } else {
    const mod = deal.properties?.hs_lastmodifieddate;
    if (!mod) return '';
    sinceMs = parseHsDate(mod)?.getTime();
  }
  if (!sinceMs) return '';
  return String(Math.floor((Date.now() - sinceMs) / (1000 * 60 * 60 * 24)));
}

// ── Process a single contact ──────────────────────────────────────────────────
async function processContact(row, stageMap, wonIds, lostIds) {
  const vid        = String(row[COL.VID]         || '').trim();
  const leadStatus = String(row[COL.LEAD_STATUS] || '').trim();

  if (!vid) return null;

  const dealIds = await getDealIds(vid);
  if (!dealIds.length) {
    return { dealStage: '', timeInStage: '', effStatus: leadStatus, wonValue: '' };
  }

  let deals;
  try { deals = await batchReadDeals(dealIds); }
  catch { return { dealStage: '', timeInStage: '', effStatus: leadStatus, wonValue: '' }; }

  const closedWon = deals.filter(d => wonIds.has(d.properties?.dealstage || ''));
  const openDeals = deals.filter(d => {
    const s = d.properties?.dealstage || '';
    return !wonIds.has(s) && !lostIds.has(s);
  });

  // Effective lead status
  const effStatus = closedWon.length > 0 ? 'Won' : leadStatus;

  // Won Deal Value 2026: sum closed-won amounts where closedate is in 2026
  let wonValue = '';
  if (closedWon.length > 0) {
    const total = closedWon
      .filter(d => {
        const cd = parseHsDate(d.properties?.closedate);
        return cd && cd.getFullYear() === 2026;
      })
      .reduce((sum, d) => {
        const amt = parseFloat(d.properties?.amount || '0');
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    wonValue = total > 0 ? String(Math.round(total)) : '';
  }

  // Most recently modified OPEN deal
  if (!openDeals.length) {
    return { dealStage: '', timeInStage: '', effStatus, wonValue };
  }

  openDeals.sort((a, b) => {
    const at = parseHsDate(a.properties?.hs_lastmodifieddate)?.getTime() || 0;
    const bt = parseHsDate(b.properties?.hs_lastmodifieddate)?.getTime() || 0;
    return bt - at;
  });
  const topDeal = openDeals[0];

  const stageId    = topDeal.properties?.dealstage || '';
  const stageLabel = stageMap[stageId] || stageId;
  const timeInStage = daysInCurrentStage(topDeal);

  return { dealStage: stageLabel, timeInStage, effStatus, wonValue };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!HUBSPOT_TOKEN) throw new Error('HUBSPOT_ACCESS_TOKEN not set in .env');

  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}${rerunAll ? ' (--all)' : ''}`);

  console.log('Fetching deal pipeline stages...');
  const { stageMap, wonIds, lostIds } = await fetchStageData();
  console.log(`  Found ${Object.keys(stageMap).length} stages (${wonIds.size} won, ${lostIds.size} lost)`);

  const auth = new google.auth.GoogleAuth({
    credentials: require(path.resolve(__dirname, '../../.config/google-credentials.json')),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Reading sheet...');
  const readRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'MQLs!A2:AO'
  });
  const rows = readRes.data.values || [];
  console.log(`Sheet rows: ${rows.length}`);

  const toProcess = rows
    .map((row, idx) => ({ row, sheetRow: idx + 2 }))
    .filter(({ row }) => {
      const year = String(row[COL.YEAR] || '').trim();
      const done = String(row[COL.DEAL_STAGE] || '').trim();
      return year === '2026' && (rerunAll || !done);
    })
    .slice(0, LIMIT);

  console.log(`2026 contacts to enrich: ${toProcess.length}`);
  if (isDryRun) console.log('DRY RUN — no writes.\n');

  const BATCH_SIZE = 5;
  const pending    = [];
  let errors       = 0;
  let noDeals      = 0;
  let withDeals    = 0;
  let wonCount     = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(({ row, sheetRow }) =>
        processContact(row, stageMap, wonIds, lostIds).then(r => r ? { sheetRow, ...r } : null)
      )
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const { sheetRow, dealStage, timeInStage, effStatus, wonValue } = res.value;
        pending.push({ sheetRow, values: [dealStage, timeInStage, effStatus, wonValue] });

        if (!dealStage && !wonValue) noDeals++;
        else { withDeals++; if (effStatus === 'Won') wonCount++; }

        console.log(
          `  Row ${sheetRow}: stage="${dealStage || '-'}" days=${timeInStage || '-'} status="${effStatus}" won=$${wonValue || '0'}`
        );
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
            range: `MQLs!AL${u.sheetRow}:AO${u.sheetRow}`,
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
      console.log(`\nProgress: ${done}/${toProcess.length} | With deals: ${withDeals} | No deals: ${noDeals} | Won: ${wonCount} | Errors: ${errors}`);
    }
  }

  console.log('\n── Summary ─────────────────────────────────────────────');
  console.log(`  With open deals:  ${withDeals}`);
  console.log(`  No deals at all:  ${noDeals}`);
  console.log(`  Won (closed-won): ${wonCount}`);
  console.log(`  Errors:           ${errors}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
