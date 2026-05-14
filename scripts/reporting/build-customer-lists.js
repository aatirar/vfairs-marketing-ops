/**
 * Build Master Active Customer Lists in HubSpot
 *
 * Creates two HubSpot static lists — "Master Active Customer Companies" and
 * "Master Active Customer Contacts" — by merging:
 *
 *   1. All deals in the Renewal Pipeline that are NOT "Closed lost" or
 *      "Anticipated Churn" → companies and contacts via batch associations.
 *
 *   2. All rows in the Sandbox Sheet (Raw Data tab) where Contract End Date
 *      is in the future → resolved via the Deal ID column (populated for
 *      ~99.97% of active rows) to fetch company and contact associations.
 *      A name-mapping CSV is the fallback for the rare rows without a Deal ID.
 *
 * USAGE:
 *   cd src/vfairs
 *   node reporting/build-customer-lists.js
 *
 * OUTPUTS:
 *   - Two HubSpot static lists updated (created on first run)
 *   - data/customer-name-mapping.csv updated with unresolved names
 *
 * @author Aatir Abdul Rauf
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SANDBOX_SHEET_ID = '1BOVlYWUzio3X5Qnwec-iXb1CF1rbe1PeRvAE-HpdS88';
const SANDBOX_TAB      = 'Raw Data';
const MAPPING_FILE     = path.join(__dirname, '../../data/customer-name-mapping.csv');

// Column indices in the Raw Data tab (0-indexed)
const COL = {
  CUSTOMER_NAME:     2,
  CONTRACT_END_DATE: 17,
  EMAIL:             39,
  DEAL_ID:           44,
  COMPANY_ID:        46,
  CONTACT_ID:        47,
};

// Stage labels in Renewal Pipeline that mean the account is no longer active
const INACTIVE_STAGE_LABELS = ['Closed lost', 'Anticipated Churn'];

const LIST_NAME_COMPANIES    = 'Master Active Customer Companies';
const LIST_NAME_CONTACTS     = 'Master Active Customer Contacts';
const OBJECT_TYPE_COMPANIES  = '0-2';
const OBJECT_TYPE_CONTACTS   = '0-1';

// Month abbreviations for DD/Mon/YYYY parsing
const MONTH_ABBR = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };

// =============================================================================
// HUBSPOT API CLIENT
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

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// =============================================================================
// DATE PARSING — handles M/D/YYYY, DD/Mon/YYYY, and ISO YYYY-MM-DD
// =============================================================================

function parseSheetDate(raw) {
  if (!raw || String(raw).trim() === '') return null;
  const s = String(raw).trim();

  // DD/Mon/YYYY e.g. "07/Nov/2027" — most common format in sandbox
  const dmy = s.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (dmy) {
    const mo = MONTH_ABBR[dmy[2]];
    if (mo !== undefined) return new Date(+dmy[3], mo, +dmy[1]);
  }

  // M/D/YYYY e.g. "7/5/2027"
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return new Date(+mdy[3], +mdy[1] - 1, +mdy[2]);

  // ISO or anything else JavaScript can parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  return null;
}

// =============================================================================
// STEP 1 — SANDBOX SHEET: FETCH ACTIVE ROWS
// =============================================================================

async function getActiveSandboxRows() {
  console.log('─'.repeat(52));
  console.log('STEP 1  Sandbox Sheet');
  console.log('─'.repeat(52));

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SANDBOX_SHEET_ID,
    range: `${SANDBOX_TAB}!A:BJ`,
  });

  const rows = res.data.values || [];
  if (rows.length < 2) throw new Error('Sandbox sheet appears empty.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expired = 0;
  let noDate  = 0;
  const active = [];

  for (const row of rows.slice(1)) {
    const endDate = parseSheetDate(row[COL.CONTRACT_END_DATE]);
    if (!endDate)        { noDate++;  continue; }
    if (endDate < today) { expired++; continue; }

    active.push({
      customerName: (row[COL.CUSTOMER_NAME] || '').trim(),
      dealId:       (row[COL.DEAL_ID]       || '').trim(),
      companyId:    (row[COL.COMPANY_ID]    || '').trim(),
      contactId:    (row[COL.CONTACT_ID]    || '').trim(),
    });
  }

  console.log(`  Total data rows:         ${rows.length - 1}`);
  console.log(`  Active (not expired):    ${active.length}`);
  console.log(`  Expired:                 ${expired}`);
  console.log(`  Skipped (no date):       ${noDate}\n`);

  return active;
}

// =============================================================================
// STEP 2 — RESOLVE SANDBOX ROWS VIA DEAL IDs + BATCH ASSOCIATIONS
// =============================================================================

function loadNameMapping() {
  if (!fs.existsSync(MAPPING_FILE)) return new Map();
  const lines = fs.readFileSync(MAPPING_FILE, 'utf8').split('\n').slice(1);
  const map = new Map();
  for (const line of lines) {
    const comma = line.indexOf(',');
    if (comma < 0) continue;
    const name = line.slice(0, comma).trim();
    const id   = line.slice(comma + 1).trim();
    if (name && id) map.set(name.toLowerCase(), id);
  }
  return map;
}

async function resolveSandboxRows(activeRows, nameMapping) {
  console.log('─'.repeat(52));
  console.log('STEP 2  Resolving sandbox entries → HubSpot IDs');
  console.log('─'.repeat(52));

  const dealIds    = new Set();
  const companyIds = new Set();
  const contactIds = new Set();
  const unmapped   = new Set();
  let   mappedHit  = 0;

  for (const row of activeRows) {
    if (row.dealId && row.dealId !== '0') {
      dealIds.add(row.dealId);
    } else if (row.companyId && row.companyId !== '0') {
      // Rare: has company ID but no deal ID
      companyIds.add(row.companyId);
      if (row.contactId && row.contactId !== '0') contactIds.add(row.contactId);
    } else {
      // Fallback: manual name mapping
      const mapped = nameMapping.get(row.customerName.toLowerCase());
      if (mapped) {
        companyIds.add(mapped);
        mappedHit++;
      } else if (row.customerName) {
        unmapped.add(row.customerName);
      }
    }
  }

  console.log(`  Rows with Deal ID:        ${dealIds.size}`);
  console.log(`  Rows with Company ID:     ${companyIds.size}`);
  console.log(`  Resolved via name map:    ${mappedHit}`);
  if (unmapped.size > 0) {
    console.log(`  Unmatched (need mapping): ${unmapped.size}  ← see ${MAPPING_FILE}`);
  }

  // Batch-fetch company associations for all deal IDs
  if (dealIds.size > 0) {
    console.log(`\n  Fetching company associations for ${dealIds.size} deals (batch)...`);
    let companyHits = 0;
    for (const batch of chunk([...dealIds], 100)) {
      try {
        const res = await hsPost('/crm/v4/associations/deals/companies/batch/read', {
          inputs: batch.map((id) => ({ id })),
        });
        for (const item of res.data.results || []) {
          for (const assoc of item.to || []) {
            companyIds.add(String(assoc.toObjectId));
            companyHits++;
          }
        }
      } catch (e) {
        console.warn(`  ⚠ Deal→company batch error: ${e.response?.data?.message || e.message}`);
      }
    }
    console.log(`  → ${companyHits} company associations found`);

    // Batch-fetch contact associations for all deal IDs
    console.log(`  Fetching contact associations for ${dealIds.size} deals (batch)...`);
    let contactHits = 0;
    for (const batch of chunk([...dealIds], 100)) {
      try {
        const res = await hsPost('/crm/v4/associations/deals/contacts/batch/read', {
          inputs: batch.map((id) => ({ id })),
        });
        for (const item of res.data.results || []) {
          for (const assoc of item.to || []) {
            contactIds.add(String(assoc.toObjectId));
            contactHits++;
          }
        }
      } catch (e) {
        console.warn(`  ⚠ Deal→contact batch error: ${e.response?.data?.message || e.message}`);
      }
    }
    console.log(`  → ${contactHits} contact associations found`);
  }

  console.log(`\n  Unique sandbox companies:  ${companyIds.size}`);
  console.log(`  Unique sandbox contacts:   ${contactIds.size}\n`);

  return { companyIds, contactIds, unmapped };
}


// =============================================================================
// STEP 4 — RENEWAL PIPELINE: ACTIVE DEALS + ASSOCIATIONS
// =============================================================================

async function fetchRenewalPipeline() {
  console.log('─'.repeat(52));
  console.log('STEP 4  Renewal Pipeline');
  console.log('─'.repeat(52));

  // Discover pipeline and stage IDs
  const pRes = await hsGet('/crm/v3/pipelines/deals');
  const pipeline = (pRes.data.results || []).find(
    (p) => p.label.toLowerCase().includes('renewal')
  );
  if (!pipeline) throw new Error('No pipeline with "Renewal" in its name found in HubSpot.');

  console.log(`  Pipeline: "${pipeline.label}" (${pipeline.id})`);

  const inactiveIds = (pipeline.stages || [])
    .filter((s) => INACTIVE_STAGE_LABELS.some(
      (label) => s.label.toLowerCase() === label.toLowerCase()
    ))
    .map((s) => s.id);

  console.log(`  Stages: ${pipeline.stages.length} total, ${inactiveIds.length} inactive`);

  // Fetch all deals in this pipeline where stage is NOT one of the inactive stages.
  // Using a single filterGroup with pipeline=X AND dealstage NOT_IN [inactiveIds]
  // avoids the 5 filterGroups limit.
  const dealIds    = [];
  let after   = undefined;
  let hasMore = true;

  const filterBody = (after) => ({
    filterGroups: [{
      filters: [
        { propertyName: 'pipeline',  operator: 'EQ',     value:  pipeline.id },
        { propertyName: 'dealstage', operator: 'NOT_IN', values: inactiveIds },
      ],
    }],
    properties: ['dealname', 'dealstage'],
    limit: 100,
    ...(after && { after }),
  });

  while (hasMore) {
    const res = await hsPost('/crm/v3/objects/deals/search', filterBody(after));
    const deals = res.data.results || [];
    dealIds.push(...deals.map((d) => d.id));
    hasMore = !!res.data.paging?.next?.after;
    after   = res.data.paging?.next?.after;
  }

  console.log(`  Active deals found:  ${dealIds.length}`);

  if (dealIds.length === 0) {
    return { dealCount: 0, companyIds: new Set(), contactIds: new Set() };
  }

  // Batch-fetch company associations
  const companyIds = new Set();
  console.log(`  Fetching company associations...`);
  for (const batch of chunk(dealIds, 100)) {
    try {
      const res = await hsPost('/crm/v4/associations/deals/companies/batch/read', {
        inputs: batch.map((id) => ({ id })),
      });
      for (const item of res.data.results || []) {
        for (const assoc of item.to || []) companyIds.add(String(assoc.toObjectId));
      }
    } catch (e) {
      console.warn(`  ⚠ Deal→company batch: ${e.response?.data?.message || e.message}`);
    }
  }
  console.log(`  Unique companies:  ${companyIds.size}`);

  // Only fetch contacts directly associated with deals (main POCs — no company-wide expansion)
  const contactIds = new Set();
  console.log(`  Fetching direct deal→contact associations (main POCs only)...`);
  for (const batch of chunk(dealIds, 100)) {
    try {
      const res = await hsPost('/crm/v4/associations/deals/contacts/batch/read', {
        inputs: batch.map((id) => ({ id })),
      });
      for (const item of res.data.results || []) {
        for (const assoc of item.to || []) contactIds.add(String(assoc.toObjectId));
      }
    } catch (e) {
      console.warn(`  ⚠ Deal→contact batch: ${e.response?.data?.message || e.message}`);
    }
  }

  console.log(`  Unique contacts (direct deal associations):  ${contactIds.size}\n`);
  return { dealCount: dealIds.length, companyIds, contactIds };
}

// =============================================================================
// STEP 5 — UPSERT HUBSPOT STATIC LISTS + SYNC MEMBERS
// =============================================================================

async function upsertStaticList(name, objectTypeId) {
  const encodedName = encodeURIComponent(name);
  try {
    const res = await hsGet(`/crm/v3/lists/object-type-id/${objectTypeId}/name/${encodedName}`);
    const listId = res.data.list?.listId || res.data.listId;
    console.log(`  Found existing list: "${name}" (${listId})`);
    return listId;
  } catch (e) {
    if (e.response?.status !== 404) throw e;
  }

  const res = await hsPost('/crm/v3/lists', {
    name,
    objectTypeId,
    listType:       'STATIC',
    processingType: 'MANUAL',
  });
  const listId = res.data.list?.listId || res.data.listId;
  console.log(`  Created new list: "${name}" (${listId})`);
  return listId;
}

async function clearListMembers(listId) {
  // Fetch all current members and remove them in batches
  const current = [];
  let after   = undefined;
  let hasMore = true;
  while (hasMore) {
    try {
      const res = await hsGet(`/crm/v3/lists/${listId}/memberships/join-order`, after ? { after, limit: 100 } : { limit: 100 });
      for (const m of res.data.results || []) current.push(String(m.recordId));
      hasMore = !!res.data.paging?.next?.after;
      after   = res.data.paging?.next?.after;
    } catch (e) {
      // If endpoint fails, skip clearing (first run will have 0 members anyway after creation)
      break;
    }
  }

  if (current.length > 0) {
    for (const batch of chunk(current, 100)) {
      await hubspot.put(`/crm/v3/lists/${listId}/memberships/remove`, batch, {
        headers: { 'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      });
      await delay(120);
    }
    console.log(`  Cleared ${current.length} existing members`);
  }
}

async function syncListMembers(listId, newIds) {
  await clearListMembers(listId);

  const idArray = [...newIds].map(String);
  let missing = 0;

  // PUT /crm/v3/lists/{id}/memberships/add requires a bare array (no wrapper object)
  for (const batch of chunk(idArray, 100)) {
    const res = await hubspot.put(`/crm/v3/lists/${listId}/memberships/add`, batch, {
      headers: { 'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    });
    await delay(120);
    missing += (res.data.recordIdsMissing || []).length;
  }

  console.log(`  Added ${idArray.length} records  (${missing} not found in HubSpot — may be stale IDs)`);
}

// =============================================================================
// STEP 6 — UPDATE MAPPING FILE WITH UNRESOLVED NAMES
// =============================================================================

function updateMappingFile(unmapped) {
  if (unmapped.size === 0) return;

  let content = 'sandbox_name,hubspot_company_id\n';
  const existing = new Set();

  if (fs.existsSync(MAPPING_FILE)) {
    content = fs.readFileSync(MAPPING_FILE, 'utf8');
    for (const line of content.split('\n').slice(1)) {
      const name = line.split(',')[0].trim();
      if (name) existing.add(name.toLowerCase());
    }
  }

  const newLines = [];
  for (const name of unmapped) {
    if (!existing.has(name.toLowerCase())) newLines.push(`${name},`);
  }

  if (newLines.length === 0) return;

  fs.mkdirSync(path.dirname(MAPPING_FILE), { recursive: true });
  fs.writeFileSync(MAPPING_FILE, content.trimEnd() + '\n' + newLines.join('\n') + '\n');
  console.log(`\n  Added ${newLines.length} unmatched names to ${MAPPING_FILE}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('\n' + '='.repeat(52));
  console.log('  MASTER CUSTOMER LIST BUILD');
  console.log('='.repeat(52) + '\n');

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.error('❌ HUBSPOT_ACCESS_TOKEN not set. Check .env');
    process.exit(1);
  }

  // ── Sandbox Sheet ─────────────────────────────────────────────────────────
  const activeRows  = await getActiveSandboxRows();
  const nameMapping = loadNameMapping();
  console.log(`  Name mapping: ${nameMapping.size} manual entries loaded\n`);

  const {
    companyIds: sandboxCompanyIds,
    contactIds: sandboxContactIds,
    unmapped,
  } = await resolveSandboxRows(activeRows, nameMapping);

  // ── Renewal Pipeline ───────────────────────────────────────────────────────
  const { dealCount, companyIds: renewalCompanyIds, contactIds: renewalContactIds } =
    await fetchRenewalPipeline();

  // ── Merge ──────────────────────────────────────────────────────────────────
  // Companies: sandbox-only (source of truth = signed contracts in sandbox sheet)
  // Contacts: union of both sources (catches POCs added directly in renewal pipeline)
  const masterCompanyIds = new Set([...sandboxCompanyIds]);
  const masterContactIds = new Set([...sandboxContactIds, ...renewalContactIds]);

  // ── HubSpot Static Lists ───────────────────────────────────────────────────
  console.log('─'.repeat(52));
  console.log('STEP 5  Updating HubSpot static lists');
  console.log('─'.repeat(52));

  const companiesListId = await upsertStaticList(LIST_NAME_COMPANIES, OBJECT_TYPE_COMPANIES);
  await syncListMembers(companiesListId, masterCompanyIds);

  const contactsListId  = await upsertStaticList(LIST_NAME_CONTACTS,  OBJECT_TYPE_CONTACTS);
  await syncListMembers(contactsListId,  masterContactIds);

  // ── Update mapping file ────────────────────────────────────────────────────
  updateMappingFile(unmapped);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(52));
  console.log('  COMPLETE');
  console.log('='.repeat(52));
  console.log('\n[Sandbox Sheet]');
  console.log(`  Active rows (not expired):       ${activeRows.length}`);
  console.log(`  Unique deals resolved:           ${activeRows.filter((r) => r.dealId && r.dealId !== '0').length}`);
  console.log(`  Unique companies from sandbox:   ${sandboxCompanyIds.size}`);
  console.log(`  Unmatched (need mapping):        ${unmapped.size}`);
  console.log('\n[Renewal Pipeline]');
  console.log(`  Active deals:                    ${dealCount}`);
  console.log(`  Unique companies:                ${renewalCompanyIds.size}`);
  console.log(`  Unique contacts:                 ${renewalContactIds.size}`);
  console.log('\n[Final HubSpot Lists]');
  console.log(`  Master Active Customer Companies: ${masterCompanyIds.size} records  (sandbox only)`);
  console.log(`  Master Active Customer Contacts:  ${masterContactIds.size} records  (sandbox + renewal POCs)`);

  if (unmapped.size > 0) {
    console.log(`\n⚠  Fill HubSpot company IDs in: ${MAPPING_FILE}`);
    console.log(`   Then re-run to include those accounts.`);
  }

  console.log();
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.response?.data || err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
