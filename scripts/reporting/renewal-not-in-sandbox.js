/**
 * Renewal Pipeline Gap Report
 *
 * Finds companies that have active deals in the Renewal Pipeline but are NOT
 * recorded in the Sandbox Sheet (i.e. no matching signed contract on file).
 *
 * Output: CSV + console table grouped by deal owner.
 * Columns: Deal Owner | Company Name | Main POC | Deal Stage | Deal Created
 *
 * USAGE:
 *   cd src/vfairs
 *   node reporting/renewal-not-in-sandbox.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

// =============================================================================
// CONFIG
// =============================================================================

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SANDBOX_SHEET_ID = '1BOVlYWUzio3X5Qnwec-iXb1CF1rbe1PeRvAE-HpdS88';
const SANDBOX_TAB      = 'Raw Data';
const OUTPUT_DIR       = path.join(__dirname, '../../outputs/vfairs');

const COL_CONTRACT_END  = 17;
const COL_DEAL_ID       = 44;
const COL_COMPANY_ID    = 46;

const INACTIVE_STAGE_LABELS = ['Closed lost', 'Anticipated Churn'];

const MONTH_ABBR = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };

// =============================================================================
// HUBSPOT CLIENT
// =============================================================================

const hubspot = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

const delay  = (ms) => new Promise((r) => setTimeout(r, ms));
const hsGet  = async (url, params = {}) => { await delay(120); return hubspot.get(url, { params }); };
const hsPost = async (url, data)        => { await delay(120); return hubspot.post(url, data); };
const chunk  = (arr, size) => { const o = []; for (let i = 0; i < arr.length; i += size) o.push(arr.slice(i, i + size)); return o; };

// =============================================================================
// DATE PARSING
// =============================================================================

function parseSheetDate(raw) {
  if (!raw || String(raw).trim() === '') return null;
  const s = String(raw).trim();
  const dmy = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dmy) { const mo = MONTH_ABBR[dmy[2]]; if (mo !== undefined) return new Date(+dmy[3], mo, +dmy[1]); }
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// =============================================================================
// STEP 1 — GET SANDBOX COMPANY IDs
// =============================================================================

async function getSandboxCompanyIds() {
  process.stdout.write('Fetching sandbox company IDs... ');

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SANDBOX_SHEET_ID, range: `${SANDBOX_TAB}!A:BJ` });
  const rows = (res.data.values || []).slice(1);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const companyIds = new Set();
  const dealIds    = new Set();

  for (const row of rows) {
    const endDate = parseSheetDate(row[COL_CONTRACT_END]);
    if (!endDate || endDate < today) continue;

    const cid = (row[COL_COMPANY_ID] || '').trim();
    if (cid && cid !== '0') { companyIds.add(cid); continue; }

    // Resolve company via deal ID
    const did = (row[COL_DEAL_ID] || '').trim();
    if (did && did !== '0') dealIds.add(did);
  }

  // Batch-resolve deal → company
  if (dealIds.size > 0) {
    for (const batch of chunk([...dealIds], 100)) {
      try {
        const r = await hsPost('/crm/v4/associations/deals/companies/batch/read', { inputs: batch.map((id) => ({ id })) });
        for (const item of r.data.results || []) for (const assoc of item.to || []) companyIds.add(String(assoc.toObjectId));
      } catch (e) { /* skip */ }
    }
  }

  console.log(`${companyIds.size} companies`);
  return companyIds;
}

// =============================================================================
// STEP 2 — GET ACTIVE RENEWAL DEALS WITH FULL PROPERTIES
// =============================================================================

async function getActiveRenewalDeals() {
  process.stdout.write('Fetching active renewal pipeline deals... ');

  const pRes = await hsGet('/crm/v3/pipelines/deals');
  const pipeline = (pRes.data.results || []).find((p) => p.label.toLowerCase().includes('renewal'));
  if (!pipeline) throw new Error('Renewal Pipeline not found.');

  // Build stage ID → label map
  const stageMap = {};
  for (const s of pipeline.stages) stageMap[s.id] = s.label;

  const inactiveIds = pipeline.stages
    .filter((s) => INACTIVE_STAGE_LABELS.some((l) => s.label.toLowerCase() === l.toLowerCase()))
    .map((s) => s.id);

  const deals = [];
  let after = undefined, hasMore = true;

  while (hasMore) {
    const res = await hsPost('/crm/v3/objects/deals/search', {
      filterGroups: [{ filters: [
        { propertyName: 'pipeline',  operator: 'EQ',     value:  pipeline.id },
        { propertyName: 'dealstage', operator: 'NOT_IN', values: inactiveIds },
      ]}],
      properties: ['dealname', 'dealstage', 'hubspot_owner_id', 'createdate'],
      limit: 100,
      ...(after && { after }),
    });
    deals.push(...(res.data.results || []));
    hasMore = !!res.data.paging?.next?.after;
    after   = res.data.paging?.next?.after;
  }

  console.log(`${deals.length} deals`);
  return { deals, stageMap };
}

// =============================================================================
// STEP 3 — BATCH RESOLVE DEAL → COMPANY + CONTACT
// =============================================================================

async function resolveAssociations(dealIds) {
  const dealToCompany = {};
  const dealToContact = {};

  process.stdout.write('Batch-fetching deal→company associations... ');
  for (const batch of chunk(dealIds, 100)) {
    try {
      const r = await hsPost('/crm/v4/associations/deals/companies/batch/read', { inputs: batch.map((id) => ({ id })) });
      for (const item of r.data.results || []) {
        const assocs = item.to || [];
        if (assocs.length > 0) dealToCompany[item.from.id] = String(assocs[0].toObjectId);
      }
    } catch (e) { /* skip */ }
  }
  console.log(`${Object.keys(dealToCompany).length} mapped`);

  process.stdout.write('Batch-fetching deal→contact associations (main POC)... ');
  for (const batch of chunk(dealIds, 100)) {
    try {
      const r = await hsPost('/crm/v4/associations/deals/contacts/batch/read', { inputs: batch.map((id) => ({ id })) });
      for (const item of r.data.results || []) {
        const assocs = item.to || [];
        if (assocs.length > 0) dealToContact[item.from.id] = String(assocs[0].toObjectId);
      }
    } catch (e) { /* skip */ }
  }
  console.log(`${Object.keys(dealToContact).length} mapped`);

  return { dealToCompany, dealToContact };
}

// =============================================================================
// STEP 4 — BATCH FETCH COMPANY NAMES
// =============================================================================

async function fetchCompanyNames(companyIds) {
  process.stdout.write(`Fetching names for ${companyIds.length} companies... `);
  const names = {};

  for (const batch of chunk(companyIds, 100)) {
    try {
      const r = await hsPost('/crm/v3/objects/companies/batch/read', {
        properties: ['name'],
        inputs: batch.map((id) => ({ id })),
      });
      for (const c of r.data.results || []) names[c.id] = c.properties.name || '(no name)';
    } catch (e) { /* skip */ }
  }

  console.log('done');
  return names;
}

// =============================================================================
// STEP 5 — BATCH FETCH CONTACT NAMES
// =============================================================================

async function fetchContactNames(contactIds) {
  process.stdout.write(`Fetching names for ${contactIds.length} contacts... `);
  const names = {};

  for (const batch of chunk(contactIds, 100)) {
    try {
      const r = await hsPost('/crm/v3/objects/contacts/batch/read', {
        properties: ['firstname', 'lastname', 'email'],
        inputs: batch.map((id) => ({ id })),
      });
      for (const c of r.data.results || []) {
        const p = c.properties;
        const full = [p.firstname, p.lastname].filter(Boolean).join(' ').trim() || p.email || '(unknown)';
        names[c.id] = full;
      }
    } catch (e) { /* skip */ }
  }

  console.log('done');
  return names;
}

// =============================================================================
// STEP 6 — FETCH OWNER NAMES
// =============================================================================

async function fetchOwnerNames() {
  process.stdout.write('Fetching owner names... ');
  const owners = {};
  try {
    let after, hasMore = true;
    while (hasMore) {
      const params = { limit: 500, includeInactive: true };
      if (after) params.after = after;
      const r = await hsGet('/crm/v3/owners', params);
      for (const o of r.data.results || []) {
        owners[String(o.id)] = [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || String(o.id);
      }
      hasMore = !!(r.data.paging && r.data.paging.next && r.data.paging.next.after);
      after = hasMore ? r.data.paging.next.after : undefined;
    }
  } catch (e) { console.warn('⚠ Could not fetch owners:', e.response?.status); }
  console.log(`${Object.keys(owners).length} owners`);
  return owners;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n=== RENEWAL PIPELINE GAP REPORT ===\n');

  if (!process.env.HUBSPOT_ACCESS_TOKEN) { console.error('❌ HUBSPOT_ACCESS_TOKEN missing'); process.exit(1); }

  // ── Collect data ────────────────────────────────────────────────────────────
  const sandboxCompanyIds         = await getSandboxCompanyIds();
  const { deals, stageMap }       = await getActiveRenewalDeals();
  const ownerNames                = await fetchOwnerNames();

  const dealIds = deals.map((d) => d.id);
  const { dealToCompany, dealToContact } = await resolveAssociations(dealIds);

  // Filter to deals whose company is NOT in sandbox
  const gapDeals = deals.filter((d) => {
    const cid = dealToCompany[d.id];
    return cid && !sandboxCompanyIds.has(cid);
  });

  console.log(`\nDeals in renewal but NOT in sandbox: ${gapDeals.length} (of ${deals.length} total active renewal deals)`);

  // Collect unique company + contact IDs to enrich
  const gapCompanyIds = [...new Set(gapDeals.map((d) => dealToCompany[d.id]).filter(Boolean))];
  const gapContactIds = [...new Set(gapDeals.map((d) => dealToContact[d.id]).filter(Boolean))];

  const companyNames = await fetchCompanyNames(gapCompanyIds);
  const contactNames = await fetchContactNames(gapContactIds);

  // ── Build rows ──────────────────────────────────────────────────────────────
  const rows = gapDeals.map((d) => {
    const companyId = dealToCompany[d.id] || '';
    const contactId = dealToContact[d.id] || '';
    const ownerId   = d.properties.hubspot_owner_id || '';
    const created   = d.properties.createdate ? d.properties.createdate.substring(0, 10) : '';

    return {
      dealOwner:   ownerNames[String(ownerId)] || (ownerId ? `[${ownerId}]` : 'Unassigned'),
      companyName: companyNames[companyId] || companyId || '(unknown)',
      mainPOC:     contactNames[contactId] || '(none)',
      dealStage:   stageMap[d.properties.dealstage] || d.properties.dealstage || '(unknown)',
      dealCreated: created,
      companyId,
      contactId,
    };
  });

  // Sort by deal owner, then company name
  rows.sort((a, b) => a.dealOwner.localeCompare(b.dealOwner) || a.companyName.localeCompare(b.companyName));

  // ── Console output grouped by owner ─────────────────────────────────────────
  console.log('\n' + '='.repeat(100));
  let currentOwner = null;
  let ownerCount   = 0;

  for (const row of rows) {
    if (row.dealOwner !== currentOwner) {
      if (currentOwner !== null) console.log(`  (${ownerCount} companies)\n`);
      console.log(`\n▶ ${row.dealOwner}`);
      console.log(`  ${'Company'.padEnd(40)} ${'Main POC'.padEnd(30)} ${'Stage'.padEnd(25)} ${'Created'}`);
      console.log(`  ${'─'.repeat(40)} ${'─'.repeat(30)} ${'─'.repeat(25)} ${'─'.repeat(10)}`);
      currentOwner = row.dealOwner;
      ownerCount   = 0;
    }
    console.log(`  ${row.companyName.substring(0, 39).padEnd(40)} ${row.mainPOC.substring(0, 29).padEnd(30)} ${row.dealStage.substring(0, 24).padEnd(25)} ${row.dealCreated}`);
    ownerCount++;
  }
  if (currentOwner !== null) console.log(`  (${ownerCount} companies)`);

  // ── CSV output ───────────────────────────────────────────────────────────────
  const today    = new Date().toISOString().substring(0, 10);
  const csvPath  = path.join(OUTPUT_DIR, `renewal-gap-report-${today}.csv`);
  const csvLines = [
    'Deal Owner,Company Name,Main POC,Deal Stage,Deal Created',
    ...rows.map((r) => [r.dealOwner, r.companyName, r.mainPOC, r.dealStage, r.dealCreated]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
    ),
  ];

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  console.log(`\n✅ Report saved: ${csvPath}`);
  console.log(`   ${rows.length} rows  |  ${gapCompanyIds.length} unique companies  |  grouped under ${new Set(rows.map((r) => r.dealOwner)).size} owners\n`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.response?.data || err.message);
  process.exit(1);
});
