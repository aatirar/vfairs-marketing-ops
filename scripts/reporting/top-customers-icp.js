/**
 * Top Customers for ICP Analysis
 *
 * Filters:
 *   1. Booking Year >= 2024 (post-virtual-skew era)
 *   2. Active customers only: Contract End Date is in the future (>= today)
 *
 * Outputs:
 *   - outputs/icp/top-customers.json     (full data)
 *   - outputs/icp/top-customers-clay.csv (for Clay enrichment)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SHEET_ID = '1BOVlYWUzio3X5Qnwec-iXb1CF1rbe1PeRvAE-HpdS88';
const OUTPUT_DIR = path.join(__dirname, '../../outputs/icp');

const TODAY = new Date();

const COL = {
  INVOICE:          0,
  UNIT:             1,
  CUSTOMER_NAME:    2,
  GROUP_ID:         3,
  CUSTOMER_CODE:    4,
  SALES_REP:        5,
  TOTAL_AMOUNT:     6,
  PRODUCT_TYPE:     7,
  EVENT_TYPE:       8,
  INDUSTRY:         9,
  COUNTRY:          10,
  NEW_REPEAT:       11,
  TRANSACTION_TYPE: 12,
  CONTRACT_TYPE:    13,
  NUM_EVENTS:       14,
  NEXT_EVENT_DATE:  15,
  CONTRACT_START:   16,
  CONTRACT_END:     17,
  ADDONS:           18,
  ADDON_VALUE:      19,
  CONTRACT_LINK:    20,
  BOOKING_DATE:     21,
  BOOKING_DATE_FMT: 22,
  MONTH:            23,
  YEAR:             24,
  INCOME_ACCOUNT:   25,
};

function parseDollar(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Fetching Raw Data tab...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Raw Data'!A1:Z25000",
  });

  const rows = res.data.values || [];
  console.log(`Total rows (incl header): ${rows.length}`);
  const data = rows.slice(1).filter(r => r.length > 5);

  // Step 1: Filter for 2024+ bookings
  const recent = data.filter(r => parseInt(r[COL.YEAR]) >= 2024);
  console.log(`Rows for 2024+: ${recent.length}`);

  // Step 2: Identify active customers — those with at least one row
  //         where Contract End Date >= today
  const activeGroupIds = new Set();
  const latestContractEnd = {}; // groupId -> latest contract end date

  for (const r of recent) {
    const groupId = r[COL.GROUP_ID] || r[COL.CUSTOMER_CODE] || r[COL.CUSTOMER_NAME];
    const endDate = parseDate(r[COL.CONTRACT_END]);
    if (endDate) {
      if (!latestContractEnd[groupId] || endDate > latestContractEnd[groupId]) {
        latestContractEnd[groupId] = endDate;
      }
      if (endDate >= TODAY) {
        activeGroupIds.add(groupId);
      }
    }
  }

  console.log(`Unique customers in 2024+ data: ${Object.keys(latestContractEnd).length}`);
  console.log(`Active customers (contract end >= today): ${activeGroupIds.size}`);

  // Step 3: Aggregate only active customers' 2024+ rows
  const customerMap = {};

  for (const r of recent) {
    const groupId = r[COL.GROUP_ID] || r[COL.CUSTOMER_CODE] || r[COL.CUSTOMER_NAME];
    if (!activeGroupIds.has(groupId)) continue; // skip inactive

    const name = r[COL.CUSTOMER_NAME] || 'Unknown';
    const amount = parseDollar(r[COL.TOTAL_AMOUNT]);
    const addonVal = parseDollar(r[COL.ADDON_VALUE]);
    const year = r[COL.YEAR];
    const eventType = (r[COL.EVENT_TYPE] || '').trim();
    const industry = (r[COL.INDUSTRY] || '').trim();
    const country = (r[COL.COUNTRY] || '').trim();
    const productType = (r[COL.PRODUCT_TYPE] || '').trim();
    const contractType = (r[COL.CONTRACT_TYPE] || '').trim();
    const transactionType = (r[COL.TRANSACTION_TYPE] || '').trim();
    const salesRep = (r[COL.SALES_REP] || '').trim();
    const numEvents = parseInt(r[COL.NUM_EVENTS]) || 0;
    const addons = (r[COL.ADDONS] || '').trim();

    if (!customerMap[groupId]) {
      customerMap[groupId] = {
        groupId,
        customerCode: r[COL.CUSTOMER_CODE] || '',
        name,
        totalSpend: 0,
        totalAddonValue: 0,
        invoiceCount: 0,
        years: new Set(),
        eventTypes: new Set(),
        industries: new Set(),
        countries: new Set(),
        productTypes: new Set(),
        contractTypes: new Set(),
        transactionTypes: new Set(),
        hasAddons: false,
        salesReps: new Set(),
        totalEvents: 0,
        renewalCount: 0,
        newSalesCount: 0,
        latestContractEnd: latestContractEnd[groupId],
      };
    }

    const c = customerMap[groupId];
    c.totalSpend += amount;
    c.totalAddonValue += addonVal;
    c.invoiceCount++;
    c.years.add(year);
    if (eventType) c.eventTypes.add(eventType);
    if (industry) c.industries.add(industry);
    if (country) c.countries.add(country);
    if (productType) c.productTypes.add(productType);
    if (contractType) c.contractTypes.add(contractType);
    if (transactionType) c.transactionTypes.add(transactionType);
    if (salesRep) c.salesReps.add(salesRep);
    c.totalEvents += numEvents;
    if (addons === 'Yes') c.hasAddons = true;
    if (transactionType.toLowerCase().includes('renewal')) c.renewalCount++;
    else c.newSalesCount++;
  }

  // Convert and sort
  const customers = Object.values(customerMap).map(c => ({
    ...c,
    years: [...c.years].sort(),
    eventTypes: [...c.eventTypes],
    industries: [...c.industries],
    countries: [...c.countries],
    productTypes: [...c.productTypes],
    contractTypes: [...c.contractTypes],
    transactionTypes: [...c.transactionTypes],
    salesReps: [...c.salesReps],
    primaryEventType: [...c.eventTypes][0] || '',
    primaryIndustry: [...c.industries][0] || '',
    primaryCountry: [...c.countries][0] || '',
    primaryContractType: [...c.contractTypes][0] || '',
    contractEndDate: c.latestContractEnd ? c.latestContractEnd.toISOString().split('T')[0] : '',
  }));

  customers.sort((a, b) => b.totalSpend - a.totalSpend);
  const top100 = customers.slice(0, 100);

  // Save JSON
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'top-customers.json'),
    JSON.stringify(top100, null, 2)
  );

  // -------------------------------------------------------------------------
  // Print summary table
  // -------------------------------------------------------------------------
  console.log('\n=== TOP 100 ACTIVE CUSTOMERS BY SPEND (2024+) ===\n');
  console.log('Rank | Customer Name                              | Spend       | Invoices | Primary Event Type       | Industry                      | Country');
  console.log('-----|--------------------------------------------|-----------  |----------|--------------------------|-------------------------------|--------------------');

  top100.forEach((c, i) => {
    const rank = String(i + 1).padStart(3);
    const name = c.name.substring(0, 42).padEnd(42);
    const spend = `$${Math.round(c.totalSpend).toLocaleString()}`.padStart(11);
    const inv = String(c.invoiceCount).padStart(8);
    const events = c.primaryEventType.substring(0, 24).padEnd(24);
    const industry = c.primaryIndustry.substring(0, 29).padEnd(29);
    const country = c.primaryCountry.substring(0, 20);
    console.log(`${rank}  | ${name} | ${spend} | ${inv} | ${events} | ${industry} | ${country}`);
  });

  // -------------------------------------------------------------------------
  // Segment Analysis
  // -------------------------------------------------------------------------
  console.log('\n\n=== SEGMENT ANALYSIS (Top 100 Active, 2024+) ===\n');

  const tally = (arr, key) => {
    const counts = {}, spend = {};
    arr.forEach(c => {
      c[key].forEach(v => {
        counts[v] = (counts[v] || 0) + 1;
        spend[v] = (spend[v] || 0) + c.totalSpend;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, count: v, spend: spend[k] }));
  };

  const print = (label, rows, topN = 15) => {
    console.log(`-- ${label} --`);
    rows.slice(0, topN).forEach(r =>
      console.log(`  ${r.label.padEnd(48)} ${String(r.count).padStart(3)} customers   $${Math.round(r.spend).toLocaleString()}`)
    );
    console.log('');
  };

  print('Event Types', tally(top100, 'eventTypes'));
  print('Industries (Top 15)', tally(top100, 'industries'));
  print('Countries', tally(top100, 'countries'), 10);
  print('Contract Types', tally(top100, 'contractTypes'));

  const multiYear = top100.filter(c => c.years.length > 1);
  const hasAddons = top100.filter(c => c.hasAddons);
  const newSales = top100.filter(c => c.newSalesCount > 0 && c.renewalCount === 0);
  const renewalOnly = top100.filter(c => c.renewalCount > 0 && c.newSalesCount === 0);
  const mixed = top100.filter(c => c.renewalCount > 0 && c.newSalesCount > 0);

  const total = top100.reduce((s, c) => s + c.totalSpend, 0);
  const avg = total / top100.length;

  console.log('-- Spend Tiers --');
  console.log(`  $200K+:      ${top100.filter(c => c.totalSpend >= 200000).length} customers`);
  console.log(`  $100K-$200K: ${top100.filter(c => c.totalSpend >= 100000 && c.totalSpend < 200000).length} customers`);
  console.log(`  $50K-$100K:  ${top100.filter(c => c.totalSpend >= 50000 && c.totalSpend < 100000).length} customers`);
  console.log(`  <$50K:       ${top100.filter(c => c.totalSpend < 50000).length} customers`);
  console.log(`\n  Total spend (top 100): $${Math.round(total).toLocaleString()}`);
  console.log(`  Average ACV:           $${Math.round(avg).toLocaleString()}`);
  console.log(`  Median ACV:            $${Math.round(top100[49].totalSpend).toLocaleString()}`);
  console.log(`\n  Multi-year buyers:     ${multiYear.length}/100`);
  console.log(`  With add-ons:          ${hasAddons.length}/100`);
  console.log(`  New sales only:        ${newSales.length}`);
  console.log(`  Renewals only:         ${renewalOnly.length}`);
  console.log(`  Mixed (new + renewal): ${mixed.length}`);

  // -------------------------------------------------------------------------
  // Export CSV for Clay enrichment
  // -------------------------------------------------------------------------
  const csvHeaders = [
    'Rank',
    'Customer Name',
    'Customer Code',
    'Group ID',
    'Country',
    'Industry (Sandbox)',
    'Primary Event Type',
    'All Event Types',
    'Contract Types',
    'Total Spend (2024+)',
    'Invoice Count',
    'Has Add-ons',
    'Contract End Date',
    'Years Active (2024+)',
    // Clay enrichment columns — leave blank, for Clay to fill
    'Website',
    'LinkedIn Company URL',
    'Employee Count (LinkedIn)',
    'Revenue Range',
    'Company Type',         // corporate / nonprofit / association / government / education / agency
    'Is Publicly Traded',
    'Founded Year',
    'Tech Stack: CRM',      // Salesforce / HubSpot / other
    'Tech Stack: MAP',      // Marketo / Pardot / HubSpot / other
    'Tech Stack: Event Platform (Prior)',  // Cvent / Hopin / Eventbrite / in-house / none
    'HubSpot Company ID',
    'HubSpot Deal ID',
    'Champion Title',
    'Champion Department',  // Events / Marketing / HR / Partnerships / Other
    'Is Association',       // Y/N — associations are a distinct ICP segment
    'Notes',
  ];

  const csvRows = top100.map((c, i) => [
    i + 1,
    c.name,
    c.customerCode,
    c.groupId,
    c.primaryCountry,
    c.primaryIndustry,
    c.primaryEventType,
    c.eventTypes.join(' | '),
    c.contractTypes.join(' | '),
    Math.round(c.totalSpend),
    c.invoiceCount,
    c.hasAddons ? 'Yes' : 'No',
    c.contractEndDate,
    c.years.join(', '),
    // Clay columns (empty)
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  const csvContent = [
    csvHeaders.map(escapeCSV).join(','),
    ...csvRows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  const csvPath = path.join(OUTPUT_DIR, 'top-customers-clay.csv');
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\nCSV for Clay saved: ${csvPath}`);
  console.log(`Rows: ${csvRows.length}`);
}

main().catch(console.error);
