/**
 * Enrich top 250 new customers with HubSpot company data
 *
 * For each company in the top-250 CSV:
 * 1. Search HubSpot by name → get numberofemployees, annualrevenue, domain, industry
 * 2. Also pull the most recent deal's associated contact title (decision-maker)
 * 3. Output enriched CSV for ICP analysis
 *
 * Falls back gracefully when company not found in HubSpot.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const HS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const CSV_IN = path.join(__dirname, '../../../outputs/outbound/new-customers-top250-clay.csv');
const CSV_OUT = path.join(__dirname, '../../../outputs/outbound/new-customers-top250-enriched.csv');

const hs = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: { Authorization: `Bearer ${HS_TOKEN}`, 'Content-Type': 'application/json' },
});

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = (vals[i] || '').replace(/^"|"$/g, '').trim());
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function escapeCSV(v) {
  const s = String(v == null ? '' : v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function empBucket(n) {
  if (!n) return '';
  const e = parseInt(n);
  if (e < 50) return 'Micro (<50)';
  if (e < 200) return 'Small (50-199)';
  if (e < 1000) return 'Mid-Market (200-999)';
  if (e < 5000) return 'Mid-Market (1K-5K)';
  if (e < 20000) return 'Enterprise (5K-20K)';
  return 'Enterprise (20K+)';
}

function revBucket(n) {
  if (!n) return '';
  const r = parseFloat(n);
  if (r < 1e6) return '<$1M';
  if (r < 5e6) return '$1M-$5M';
  if (r < 25e6) return '$5M-$25M';
  if (r < 100e6) return '$25M-$100M';
  if (r < 500e6) return '$100M-$500M';
  if (r < 2e9) return '$500M-$2B';
  return '$2B+';
}

async function searchCompany(name) {
  try {
    const res = await hs.post('/crm/v3/objects/companies/search', {
      query: name,
      properties: ['name', 'domain', 'numberofemployees', 'annualrevenue', 'industry', 'city', 'country', 'hs_object_id'],
      limit: 3,
    });
    const results = res.data.results || [];
    if (!results.length) return null;

    // Pick best match: prefer exact name match (case-insensitive), else first result
    const exact = results.find(r => r.properties.name?.toLowerCase() === name.toLowerCase());
    return (exact || results[0]).properties;
  } catch (e) {
    return null;
  }
}

async function getDecisionMakerTitle(companyId) {
  try {
    // Get deals for this company
    const dealsRes = await hs.get(`/crm/v3/objects/companies/${companyId}/associations/deals`, {
      params: { limit: 5 }
    });
    const dealIds = (dealsRes.data.results || []).map(d => d.id);
    if (!dealIds.length) return '';

    // Get the most recent deal's contacts
    const dealId = dealIds[0];
    const contactsRes = await hs.get(`/crm/v3/objects/deals/${dealId}/associations/contacts`, {
      params: { limit: 3 }
    });
    const contactIds = (contactsRes.data.results || []).map(c => c.id);
    if (!contactIds.length) return '';

    // Get contact properties
    const batchRes = await hs.post('/crm/v3/objects/contacts/batch/read', {
      inputs: contactIds.slice(0, 3).map(id => ({ id })),
      properties: ['firstname', 'lastname', 'jobtitle'],
    });
    const contacts = (batchRes.data.results || []).filter(c => c.properties.jobtitle);
    if (!contacts.length) return '';
    return contacts[0].properties.jobtitle;
  } catch (e) {
    return '';
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const rows = parseCSV(fs.readFileSync(CSV_IN, 'utf8'));
  console.log(`Loaded ${rows.length} companies to enrich`);

  const enriched = [];
  let found = 0, notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row['Customer Name'];
    process.stdout.write(`\r[${i+1}/${rows.length}] ${name.slice(0,50).padEnd(50)}`);

    const hs_data = await searchCompany(name);

    let employees = '', revenue = '', domain = '', hsIndustry = '', decisionTitle = '';
    if (hs_data) {
      found++;
      employees = hs_data.numberofemployees || '';
      revenue = hs_data.annualrevenue || '';
      domain = hs_data.domain || '';
      hsIndustry = hs_data.industry || '';

      // Get decision-maker title from deals (only for companies with data)
      if (hs_data.hs_object_id) {
        decisionTitle = await getDecisionMakerTitle(hs_data.hs_object_id);
        await sleep(100); // avoid rate limits
      }
    } else {
      notFound++;
    }

    enriched.push({
      ...row,
      hs_employees: employees,
      hs_annual_revenue: revenue,
      hs_domain: domain,
      hs_industry: hsIndustry,
      hs_decision_title: decisionTitle,
      emp_bucket: empBucket(employees),
      rev_bucket: revBucket(revenue),
      hs_found: hs_data ? 'Yes' : 'No',
    });

    await sleep(150); // ~6.5 req/sec, well under HubSpot's 100/10s limit
  }

  console.log(`\n\nFound in HubSpot: ${found}/${rows.length}`);
  console.log(`Not found: ${notFound}`);

  // Write enriched CSV
  const headers = Object.keys(enriched[0]);
  const csvOut = [
    headers.join(','),
    ...enriched.map(r => headers.map(h => escapeCSV(r[h])).join(','))
  ].join('\n');

  fs.writeFileSync(CSV_OUT, csvOut);
  console.log(`\nEnriched CSV saved to: ${CSV_OUT}`);

  // Summary stats
  const withEmployees = enriched.filter(r => r.hs_employees);
  const withRevenue = enriched.filter(r => r.hs_annual_revenue);
  const withTitle = enriched.filter(r => r.hs_decision_title);

  console.log(`\n=== ENRICHMENT COVERAGE ===`);
  console.log(`Employee count populated: ${withEmployees.length}/${rows.length} (${Math.round(withEmployees.length/rows.length*100)}%)`);
  console.log(`Annual revenue populated: ${withRevenue.length}/${rows.length} (${Math.round(withRevenue.length/rows.length*100)}%)`);
  console.log(`Decision title found:     ${withTitle.length}/${rows.length} (${Math.round(withTitle.length/rows.length*100)}%)`);

  // Employee distribution
  const buckets = {};
  for (const r of enriched) {
    if (r.emp_bucket) buckets[r.emp_bucket] = (buckets[r.emp_bucket] || 0) + 1;
  }
  console.log(`\n=== EMPLOYEE SIZE DISTRIBUTION ===`);
  Object.entries(buckets).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

  // Revenue distribution
  const revBuckets = {};
  for (const r of enriched) {
    if (r.rev_bucket) revBuckets[r.rev_bucket] = (revBuckets[r.rev_bucket] || 0) + 1;
  }
  console.log(`\n=== REVENUE DISTRIBUTION ===`);
  Object.entries(revBuckets).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

  // Top decision titles
  const titles = {};
  for (const r of enriched) {
    if (r.hs_decision_title) titles[r.hs_decision_title] = (titles[r.hs_decision_title] || 0) + 1;
  }
  const topTitles = Object.entries(titles).sort((a,b)=>b[1]-a[1]).slice(0,20);
  console.log(`\n=== TOP DECISION-MAKER TITLES (from HubSpot deals) ===`);
  topTitles.forEach(([t,n]) => console.log(`  ${n}x — ${t}`));
}

main().catch(console.error);
