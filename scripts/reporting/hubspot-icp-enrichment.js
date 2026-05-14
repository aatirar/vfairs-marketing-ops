/**
 * HubSpot ICP Enrichment
 *
 * For each of the top 100 customers (from top-customers.json), this script:
 *   1. Re-scans Raw Data to collect HubSpot Company IDs + Deal IDs already
 *      stored in the sheet (cols 46 + 44) — the fast, exact path.
 *   2. For customers missing those IDs, falls back to name-based fuzzy search
 *      using progressive widening: exact → suffix-stripped → first-words → token.
 *   3. Batch-reads company properties from HubSpot (name, domain, industry,
 *      employee count, revenue, country, lifecycle stage).
 *   4. Fetches the most recent deal per company (ACV, source, close date,
 *      create date, stage) plus the champion contact (title, department).
 *   5. Writes results to:
 *        outputs/icp/top-customers-hubspot.json   (full)
 *        outputs/icp/top-customers-hubspot.csv    (for merging into Clay CSV)
 *        outputs/icp/hubspot-unmatched.txt        (manual review)
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { google } = require('googleapis');
const axios     = require('axios');
const fs        = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SHEET_ID         = '1BOVlYWUzio3X5Qnwec-iXb1CF1rbe1PeRvAE-HpdS88';
const TOP_CUSTOMERS    = path.join(__dirname, '../../outputs/icp/top-customers.json');
const OUTPUT_DIR       = path.join(__dirname, '../../outputs/icp');

// Sandbox Raw Data column indices (0-based)
const COL = {
  CUSTOMER_NAME:  2,
  GROUP_ID:       3,
  CUSTOMER_CODE:  4,
  CONTRACT_END:   17,
  DEAL_ID:        44,
  COMPANY_ID:     46,
  CONTACT_ID:     47,
};

// HubSpot company properties to fetch
const COMPANY_PROPS = [
  'name', 'domain', 'industry', 'numberofemployees', 'annualrevenue',
  'country', 'city', 'phone', 'lifecyclestage', 'type',
  'founded_year', 'description',
];

// HubSpot deal properties to fetch
const DEAL_PROPS = [
  'dealname', 'amount', 'createdate', 'closedate', 'dealstage',
  'hs_analytics_source', 'hs_analytics_source_data_1',
  'hs_deal_stage_probability',
];

// HubSpot contact properties to fetch
const CONTACT_PROPS = [
  'firstname', 'lastname', 'jobtitle', 'department', 'email',
];

// ---------------------------------------------------------------------------
// HubSpot client
// ---------------------------------------------------------------------------
const hs = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

const delay  = (ms) => new Promise(r => setTimeout(r, ms));
const hsGet  = async (url, params = {}) => { await delay(150); return hs.get(url, { params }); };
const hsPost = async (url, data)        => { await delay(150); return hs.post(url, data); };

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

// ---------------------------------------------------------------------------
// Fuzzy name matching helpers
// ---------------------------------------------------------------------------
const LEGAL_SUFFIXES = /\b(inc|llc|ltd|limited|corp|corporation|co|company|group|services|solutions|sa|sas|gmbh|bv|nv|plc|lp|llp|foundation|institute|association|society|council|authority|committee|board|trust|fund|university|college|school)\b\.?/gi;
const STOP_WORDS     = new Set(['the', 'of', 'and', 'for', 'in', 'at', 'by', 'a', 'an']);

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSuffixes(name) {
  return normalize(name).replace(LEGAL_SUFFIXES, ' ').replace(/\s+/g, ' ').trim();
}

function significantWords(name, n = 3) {
  return stripSuffixes(name)
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, n)
    .join(' ');
}

function tokenOverlapScore(a, b) {
  const setA = new Set(stripSuffixes(a).split(' ').filter(w => w.length > 2));
  const setB = new Set(stripSuffixes(b).split(' ').filter(w => w.length > 2));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// Search HubSpot companies by name query, return best match above threshold
async function fuzzySearchCompany(name) {
  const strategies = [
    normalize(name),           // exact normalized
    stripSuffixes(name),       // without legal suffixes
    significantWords(name, 3), // first 3 significant words
    significantWords(name, 2), // first 2 significant words
  ];

  for (const query of [...new Set(strategies)]) {
    if (!query || query.length < 3) continue;
    try {
      const res = await hsPost('/crm/v3/objects/companies/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'CONTAINS_TOKEN',
            value: query.split(' ')[0], // search by first significant word
          }],
        }],
        properties: ['name', 'domain', ...COMPANY_PROPS],
        limit: 20,
      });

      const results = res.data.results || [];
      if (!results.length) continue;

      // Score each result by token overlap with original name
      const scored = results
        .map(r => ({ ...r, score: tokenOverlapScore(name, r.properties.name || '') }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (best.score >= 0.4) {
        return { result: best, matchType: 'fuzzy', query, score: best.score };
      }
    } catch (e) {
      // continue to next strategy
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Batch read companies by ID
// ---------------------------------------------------------------------------
async function batchReadCompanies(ids) {
  const results = {};
  for (const batch of chunk(ids, 100)) {
    try {
      const res = await hsPost('/crm/v3/objects/companies/batch/read', {
        inputs: batch.map(id => ({ id })),
        properties: COMPANY_PROPS,
      });
      for (const r of (res.data.results || [])) {
        results[r.id] = r.properties;
      }
    } catch (e) {
      console.error(`Batch read error: ${e.message}`);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Fetch most recent deal for a company
// ---------------------------------------------------------------------------
async function getDealsForCompany(companyId) {
  try {
    // Get deal associations
    const assocRes = await hsGet(
      `/crm/v4/objects/companies/${companyId}/associations/deals`
    );
    const dealIds = (assocRes.data.results || []).map(r => r.toObjectId);
    if (!dealIds.length) return null;

    // Batch read deals
    const res = await hsPost('/crm/v3/objects/deals/batch/read', {
      inputs: dealIds.slice(0, 10).map(id => ({ id })), // most recent 10
      properties: DEAL_PROPS,
    });

    const deals = (res.data.results || [])
      .map(d => ({ id: d.id, ...d.properties }))
      .sort((a, b) => new Date(b.closedate || 0) - new Date(a.closedate || 0));

    return deals[0] || null; // most recently closed deal
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch champion contact for a company
// ---------------------------------------------------------------------------
async function getContactForCompany(companyId) {
  try {
    const assocRes = await hsGet(
      `/crm/v4/objects/companies/${companyId}/associations/contacts`
    );
    const contactIds = (assocRes.data.results || []).map(r => r.toObjectId);
    if (!contactIds.length) return null;

    const res = await hsPost('/crm/v3/objects/contacts/batch/read', {
      inputs: contactIds.slice(0, 5).map(id => ({ id })),
      properties: CONTACT_PROPS,
    });

    // Prefer contacts with a job title
    const contacts = (res.data.results || [])
      .map(c => c.properties)
      .sort((a, b) => (b.jobtitle ? 1 : 0) - (a.jobtitle ? 1 : 0));

    return contacts[0] || null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
function esc(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Load top 100 customer list
  const top100 = JSON.parse(fs.readFileSync(TOP_CUSTOMERS, 'utf8'));
  const targetGroupIds = new Set(top100.map(c => c.groupId));
  console.log(`Loaded ${top100.length} target customers`);

  // 2. Re-scan Raw Data to collect HubSpot IDs
  console.log('\nFetching Raw Data from Sandbox sheet...');
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Raw Data'!A1:BV25000",
  });
  const rows = (res.data.values || []).slice(1).filter(r => r.length > 5);

  // Map groupId -> { companyIds, dealIds }
  const idMap = {};
  for (const r of rows) {
    const gid = r[COL.GROUP_ID] || r[COL.CUSTOMER_CODE] || r[COL.CUSTOMER_NAME];
    if (!targetGroupIds.has(gid)) continue;

    if (!idMap[gid]) idMap[gid] = { companyIds: new Set(), dealIds: new Set() };
    const cid = (r[COL.COMPANY_ID] || '').trim();
    const did = (r[COL.DEAL_ID] || '').trim();
    if (cid && cid !== '#N/A' && cid !== '0') idMap[gid].companyIds.add(cid);
    if (did && did !== '#N/A' && did !== '0') idMap[gid].dealIds.add(did);
  }

  // 3. Map top100 entries to HubSpot company IDs
  const companyIdToCustomer = {}; // hsCompanyId -> customer entry
  const needsFuzzy = [];

  for (const customer of top100) {
    const ids = idMap[customer.groupId];
    const companyId = ids && ids.companyIds.size > 0
      ? [...ids.companyIds][0]
      : null;

    if (companyId) {
      customer._hsCompanyId  = companyId;
      customer._matchType    = 'id';
      companyIdToCustomer[companyId] = customer;
    } else {
      needsFuzzy.push(customer);
    }
  }

  console.log(`Matched by ID:     ${Object.keys(companyIdToCustomer).length}`);
  console.log(`Needs fuzzy match: ${needsFuzzy.length}`);

  // 4. Fuzzy search for unmatched customers
  if (needsFuzzy.length > 0) {
    console.log('\nRunning fuzzy name search for unmatched customers...');
    for (const customer of needsFuzzy) {
      process.stdout.write(`  Searching: ${customer.name.substring(0, 50)}... `);
      const match = await fuzzySearchCompany(customer.name);
      if (match) {
        const hsId = match.result.id;
        customer._hsCompanyId  = hsId;
        customer._matchType    = `fuzzy (score: ${match.score.toFixed(2)}, query: "${match.query}")`;
        customer._matchedName  = match.result.properties.name;
        companyIdToCustomer[hsId] = customer;
        console.log(`matched → ${match.result.properties.name} [${match.score.toFixed(2)}]`);
      } else {
        customer._hsCompanyId = null;
        customer._matchType   = 'unmatched';
        console.log('NO MATCH');
      }
    }
  }

  // 5. Batch read company properties
  const allCompanyIds = Object.keys(companyIdToCustomer);
  console.log(`\nBatch reading ${allCompanyIds.length} companies from HubSpot...`);
  const companyData = await batchReadCompanies(allCompanyIds);

  // 6. Fetch deals + contacts per company
  console.log('Fetching deals and contacts...');
  const dealData    = {};
  const contactData = {};

  for (let i = 0; i < allCompanyIds.length; i++) {
    const id = allCompanyIds[i];
    process.stdout.write(`  [${i + 1}/${allCompanyIds.length}] Company ${id}... `);

    const [deal, contact] = await Promise.all([
      getDealsForCompany(id),
      getContactForCompany(id),
    ]);
    dealData[id]    = deal;
    contactData[id] = contact;
    console.log(`deal: ${deal ? deal.dealname?.substring(0, 30) : 'none'} | contact: ${contact ? contact.jobtitle || contact.firstname : 'none'}`);
  }

  // 7. Merge everything back onto top100
  const unmatched = [];
  for (const customer of top100) {
    const id = customer._hsCompanyId;
    if (!id) { unmatched.push(customer.name); continue; }

    const co = companyData[id] || {};
    const deal = dealData[id];
    const contact = contactData[id];

    customer.hs = {
      companyId:        id,
      matchType:        customer._matchType,
      matchedName:      customer._matchedName || co.name || '',
      domain:           co.domain || '',
      industry:         co.industry || '',
      employeeCount:    co.numberofemployees || '',
      annualRevenue:    co.annualrevenue || '',
      country:          co.country || '',
      city:             co.city || '',
      companyType:      co.type || '',
      foundedYear:      co.founded_year || '',
      lifecycleStage:   co.lifecyclestage || '',
      // Deal
      dealId:           deal?.id || '',
      dealName:         deal?.dealname || '',
      dealAmount:       deal?.amount || '',
      dealCloseDate:    deal?.closedate || '',
      dealCreateDate:   deal?.createdate || '',
      dealStage:        deal?.dealstage || '',
      leadSource:       deal?.hs_analytics_source || '',
      leadSourceDrill:  deal?.hs_analytics_source_data_1 || '',
      // Contact
      championName:     contact ? `${contact.firstname || ''} ${contact.lastname || ''}`.trim() : '',
      championTitle:    contact?.jobtitle || '',
      championDept:     contact?.department || '',
      championEmail:    contact?.email || '',
    };

    // clean up temp fields
    delete customer._hsCompanyId;
    delete customer._matchType;
    delete customer._matchedName;
  }

  // 8. Save JSON
  const jsonPath = path.join(OUTPUT_DIR, 'top-customers-hubspot.json');
  fs.writeFileSync(jsonPath, JSON.stringify(top100, null, 2));

  // 9. Save CSV
  const csvHeaders = [
    'Rank', 'Customer Name', 'Country', 'Industry (Sandbox)', 'Primary Event Type',
    'Total Spend (2024+)', 'Contract Types',
    // HubSpot
    'HS Company ID', 'Match Type', 'HS Matched Name', 'Domain',
    'HS Industry', 'Employee Count', 'Annual Revenue', 'Company Type', 'Founded Year',
    'Lifecycle Stage',
    // Deal
    'Deal ID', 'Deal Name', 'Deal Amount', 'Deal Close Date', 'Deal Create Date',
    'Deal Stage', 'Lead Source', 'Lead Source Drill',
    // Contact
    'Champion Name', 'Champion Title', 'Champion Dept', 'Champion Email',
  ];

  const csvRows = top100.map((c, i) => {
    const h = c.hs || {};
    return [
      i + 1, c.name, c.primaryCountry, c.primaryIndustry, c.primaryEventType,
      Math.round(c.totalSpend), c.contractTypes?.join(' | '),
      h.companyId, h.matchType, h.matchedName, h.domain,
      h.industry, h.employeeCount, h.annualRevenue, h.companyType, h.foundedYear,
      h.lifecycleStage,
      h.dealId, h.dealName, h.dealAmount, h.dealCloseDate, h.dealCreateDate,
      h.dealStage, h.leadSource, h.leadSourceDrill,
      h.championName, h.championTitle, h.championDept, h.championEmail,
    ];
  });

  const csvContent = [
    csvHeaders.map(esc).join(','),
    ...csvRows.map(r => r.map(esc).join(',')),
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, 'top-customers-hubspot.csv'), csvContent);

  // 10. Write unmatched list
  if (unmatched.length) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'hubspot-unmatched.txt'),
      unmatched.join('\n')
    );
  }

  // 11. Print summary
  const matched    = top100.filter(c => c.hs?.companyId).length;
  const byId       = top100.filter(c => c.hs?.matchType === 'id').length;
  const byFuzzy    = top100.filter(c => c.hs?.matchType?.startsWith('fuzzy')).length;
  const withDeal   = top100.filter(c => c.hs?.dealId).length;
  const withTitle  = top100.filter(c => c.hs?.championTitle).length;
  const withSource = top100.filter(c => c.hs?.leadSource).length;
  const empCount   = top100.filter(c => c.hs?.employeeCount).length;

  console.log('\n=== MATCH SUMMARY ===');
  console.log(`  Total matched:       ${matched}/100`);
  console.log(`    Via company ID:    ${byId}`);
  console.log(`    Via fuzzy search:  ${byFuzzy}`);
  console.log(`    Unmatched:         ${unmatched.length}`);
  console.log(`  With deal data:      ${withDeal}/100`);
  console.log(`  With champion title: ${withTitle}/100`);
  console.log(`  With lead source:    ${withSource}/100`);
  console.log(`  With employee count: ${empCount}/100`);

  if (unmatched.length) {
    console.log(`\n  Unmatched (saved to hubspot-unmatched.txt):`);
    unmatched.forEach(n => console.log(`    - ${n}`));
  }

  // Lead source breakdown
  const sources = {};
  top100.forEach(c => {
    const s = c.hs?.leadSource || 'unknown';
    sources[s] = (sources[s] || 0) + 1;
  });
  console.log('\n=== LEAD SOURCES ===');
  Object.entries(sources).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(40)} ${v}`));

  // Champion title breakdown
  const titles = {};
  top100.forEach(c => {
    const t = c.hs?.championTitle;
    if (t) titles[t] = (titles[t] || 0) + 1;
  });
  console.log('\n=== CHAMPION TITLES (Top 20) ===');
  Object.entries(titles).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([k, v]) => console.log(`  ${k.padEnd(50)} ${v}`));

  console.log(`\nOutputs saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
