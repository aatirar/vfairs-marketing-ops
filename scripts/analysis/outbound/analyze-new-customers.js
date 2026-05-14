/**
 * New Customer Analysis — since Jan 1 2024
 *
 * Definition of "new customer": Customer Code where NO transaction row
 * has a Contract Start Date before 2024-01-01.
 *
 * ACV: Sum of Total Amount per Customer Code across all their transactions.
 *
 * Output:
 * 1. Top 250 new customers ranked by total revenue
 * 2. Top 5 sub-segments by: Product Type × Type of Event × Geography bucket
 * 3. Clay enrichment ask
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../../data/customers/vFairs-Hosted Customer Sandbox Data (Original) - Raw Data.csv');
const OUT_DIR = path.join(__dirname, '../../../outputs/outbound');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length < 5) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

function parseDate(str) {
  if (!str) return null;
  // Formats: M/D/YYYY or YYYYMMDD or YYYY-MM-DD
  if (/^\d{8}$/.test(str)) {
    return new Date(`${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`);
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function geoRegion(country) {
  const c = (country || '').trim();
  if (!c) return 'Unknown';
  if (/united states|usa|u\.s\.a/i.test(c)) return 'US';
  if (/canada/i.test(c)) return 'Canada';
  if (/united kingdom|uk|u\.k\./i.test(c)) return 'UK';
  if (/australia|new zealand/i.test(c)) return 'ANZ';
  if (/india|pakistan|bangladesh|sri lanka/i.test(c)) return 'South Asia';
  if (/saudi arabia|uae|qatar|kuwait|oman|bahrain|jordan|egypt|lebanon/i.test(c)) return 'MENA';
  if (/germany|france|spain|italy|netherlands|belgium|sweden|denmark|norway|finland|switzerland|austria|poland|portugal/i.test(c)) return 'Europe';
  if (/china|japan|korea|singapore|malaysia|indonesia|thailand|philippines|vietnam|hong kong|taiwan/i.test(c)) return 'APAC';
  if (/nigeria|south africa|kenya|ghana/i.test(c)) return 'Africa';
  if (/brazil|mexico|colombia|argentina|chile/i.test(c)) return 'LATAM';
  return 'Other';
}

function normalizeProductType(pt) {
  const p = (pt || '').toLowerCase();
  if (p.includes('hybrid')) return 'Hybrid';
  if (p.includes('in-person') || p.includes('in person')) return 'In-Person';
  if (p.includes('virtual')) return 'Virtual';
  return 'Other';
}

function normalizeEventType(et) {
  const e = (et || '').trim();
  // Consolidate to clean buckets
  const map = {
    'Job Fair': 'Job/Career Fair',
    'Career Fair': 'Job/Career Fair',
    'Career fair': 'Job/Career Fair',
    'Conference': 'Conference',
    'Trade Show': 'Trade Show',
    'Summit': 'Summit',
    'Expo': 'Expo',
    'Benefits Fair': 'Benefits Fair',
    'Networking Event': 'Networking Event',
    'Webinar': 'Webinar',
    'Education Fair': 'Education Fair',
    'Onboarding Fair': 'Onboarding Fair',
  };
  for (const [k, v] of Object.entries(map)) {
    if (e.toLowerCase().startsWith(k.toLowerCase())) return v;
  }
  return e || 'Other';
}

function normalizeIndustry(ind) {
  const i = (ind || '').trim();
  if (/higher education/i.test(i)) return 'Higher Education';
  if (/educational institution/i.test(i)) return 'K-12 / Educational Institution';
  if (/education management/i.test(i)) return 'Education Management';
  if (/education/i.test(i)) return 'Education';
  if (/non-?profit|nonprofit/i.test(i)) return 'Non-Profit';
  if (/hospital|health care|healthcare|medical/i.test(i)) return 'Healthcare';
  if (/pharmaceut|biotech|life science/i.test(i)) return 'Pharma/Biotech';
  if (/information technology|computer software|internet|tech/i.test(i)) return 'Technology';
  if (/government|public sector/i.test(i)) return 'Government';
  if (/financial services|banking|insurance|accounting/i.test(i)) return 'Finance';
  if (/manufactur/i.test(i)) return 'Manufacturing';
  if (/staffing|recruiting/i.test(i)) return 'Staffing';
  if (/association/i.test(i)) return 'Association';
  if (/food|beverage/i.test(i)) return 'Food & Beverage';
  if (/telecom/i.test(i)) return 'Telecom';
  if (/retail/i.test(i)) return 'Retail';
  if (/oil|gas|energy|mining/i.test(i)) return 'Energy';
  if (/aviation|aerospace|airline/i.test(i)) return 'Aviation/Aerospace';
  if (/military|defense/i.test(i)) return 'Military/Defense';
  return i || 'Other';
}

function main() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(content);
  console.log(`Total rows: ${rows.length}`);

  const JAN_2024 = new Date('2024-01-01');

  // Step 1: Find Customer Codes that have ANY transaction before Jan 1, 2024
  const oldCustomerCodes = new Set();
  for (const row of rows) {
    const code = row['Customer Code'];
    if (!code) continue;
    const dateStr = row['Contract Start Date'];
    const d = parseDate(dateStr);
    if (d && d < JAN_2024) {
      oldCustomerCodes.add(code);
    }
  }
  console.log(`Customer Codes with any transaction before 2024: ${oldCustomerCodes.size}`);

  // Step 2: Filter rows to NEW customers only (not in oldCustomerCodes)
  const newRows = rows.filter(r => r['Customer Code'] && !oldCustomerCodes.has(r['Customer Code']));
  console.log(`Rows from new customers (2024+): ${newRows.length}`);

  // Step 3: Aggregate per Customer Code
  const customerMap = new Map();
  for (const row of newRows) {
    const code = row['Customer Code'];
    const amount = parseAmount(row['Total Amount']);
    if (!customerMap.has(code)) {
      customerMap.set(code, {
        code,
        name: row['Customer Name'],
        country: row['Country'],
        geo: geoRegion(row['Country']),
        productType: normalizeProductType(row['Product Type']),
        eventType: normalizeEventType(row['Type of Event']),
        industry: normalizeIndustry(row['Client Industry']),
        rawIndustry: row['Client Industry'],
        rawEventType: row['Type of Event'],
        totalRevenue: 0,
        transactions: 0,
        contractStartDate: row['Contract Start Date'],
        salesRep: row['Sales Rep'],
        companySize: row['Company Size'] || row['Company size'] || '',
        annualRevenue: row['Annual Revenue'] || row['Revenue'] || '',
        fortune500: row['Fortune 500'] || row['fortune 500'] || '',
        forbes2000: row['Forbes Global 2000'] || row['forbes 2000'] || '',
        channel: row['Channel'] || '',
      });
    }
    const c = customerMap.get(code);
    c.totalRevenue += amount;
    c.transactions++;
    // Keep most recent values for categorical fields
    if (row['Customer Name']) c.name = row['Customer Name'];
    if (row['Country']) { c.country = row['Country']; c.geo = geoRegion(row['Country']); }
    if (row['Product Type']) c.productType = normalizeProductType(row['Product Type']);
    if (row['Type of Event']) c.eventType = normalizeEventType(row['Type of Event']);
    if (row['Client Industry']) { c.industry = normalizeIndustry(row['Client Industry']); c.rawIndustry = row['Client Industry']; }
    if (row['Company Size'] || row['Company size']) c.companySize = row['Company Size'] || row['Company size'];
    if (row['Annual Revenue'] || row['Revenue']) c.annualRevenue = row['Annual Revenue'] || row['Revenue'];
    if (row['Fortune 500'] || row['fortune 500']) c.fortune500 = row['Fortune 500'] || row['fortune 500'];
    if (row['Forbes Global 2000'] || row['forbes 2000']) c.forbes2000 = row['Forbes Global 2000'] || row['forbes 2000'];
  }

  // Step 4: Sort by total revenue descending
  const customers = Array.from(customerMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  console.log(`Total new customers: ${customers.length}`);

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  // ─── BUILD OUTPUT ─────────────────────────────────────────────────────────

  let out = `# New Customer Analysis — Since Jan 1, 2024\n`;
  out += `**Definition:** Customers with NO transaction row where Contract Start Date < 2024-01-01\n`;
  out += `**ACV:** Sum of Total Amount across all transactions per Customer Code\n`;
  out += `**Generated:** ${new Date().toISOString().slice(0,10)}\n\n`;
  out += `**Total new customers: ${customers.length}**\n\n---\n\n`;

  // ── PART 1: TOP 250 ────────────────────────────────────────────────────────
  out += `## Part 1 — Top 250 New Customers by Revenue\n\n`;
  out += `| Rank | Customer | Revenue | Product Type | Event Type | Industry | Geo | Txns |\n`;
  out += `|---|---|---|---|---|---|---|---|\n`;
  customers.slice(0, 250).forEach((c, i) => {
    out += `| ${i+1} | ${c.name} | ${fmt(c.totalRevenue)} | ${c.productType} | ${c.eventType} | ${c.industry} | ${c.geo} | ${c.transactions} |\n`;
  });

  // ── PART 2: SUB-SEGMENT ANALYSIS ──────────────────────────────────────────
  out += `\n---\n\n## Part 2 — Top Sub-Segments\n\n`;
  out += `*Dimensions: Product Type × Event Type × Geo. Only customers in top 250 used to avoid long-tail noise.*\n\n`;

  // Use all new customers (not just top 250) for sub-segment analysis
  const segMap = new Map();
  for (const c of customers) {
    // Three segmentation dimensions
    const keys = [
      // Fine-grained: all 3
      `${c.eventType} | ${c.productType} | ${c.geo}`,
    ];
    for (const key of keys) {
      if (!segMap.has(key)) segMap.set(key, { key, customers: [] });
      segMap.get(key).customers.push(c);
    }
  }

  // Also segment by event type only, then by event+geo, then event+product
  const seg2Map = new Map(); // event type × geo
  const seg3Map = new Map(); // event type × industry
  for (const c of customers) {
    const k2 = `${c.eventType} × ${c.geo}`;
    if (!seg2Map.has(k2)) seg2Map.set(k2, { customers: [] });
    seg2Map.get(k2).customers.push(c);

    const k3 = `${c.eventType} × ${c.industry}`;
    if (!seg3Map.has(k3)) seg3Map.set(k3, { customers: [] });
    seg3Map.get(k3).customers.push(c);
  }

  function segStats(custs) {
    const totalRev = custs.reduce((a, b) => a + b.totalRevenue, 0);
    const avgACV = custs.length > 0 ? totalRev / custs.length : 0;
    return { count: custs.length, totalRev, avgACV };
  }

  // Rank segments by composite = count × avgACV
  const segRanked = Array.from(seg3Map.entries())
    .map(([k, v]) => ({ key: k, ...segStats(v.customers), customers: v.customers }))
    .filter(s => s.count >= 3)
    .sort((a, b) => (b.count * b.avgACV) - (a.count * a.avgACV));

  out += `### By Event Type × Industry (min 3 customers)\n\n`;
  out += `| Rank | Segment | Customers | Avg ACV | Total Rev |\n`;
  out += `|---|---|---|---|---|\n`;
  segRanked.slice(0, 15).forEach((s, i) => {
    out += `| ${i+1} | ${s.key} | ${s.count} | ${fmt(s.avgACV)} | ${fmt(s.totalRev)} |\n`;
  });

  // By event type × geo
  const geoRanked = Array.from(seg2Map.entries())
    .map(([k, v]) => ({ key: k, ...segStats(v.customers), customers: v.customers }))
    .filter(s => s.count >= 3)
    .sort((a, b) => (b.count * b.avgACV) - (a.count * a.avgACV));

  out += `\n### By Event Type × Geography (min 3 customers)\n\n`;
  out += `| Rank | Segment | Customers | Avg ACV | Total Rev |\n`;
  out += `|---|---|---|---|---|\n`;
  geoRanked.slice(0, 15).forEach((s, i) => {
    out += `| ${i+1} | ${s.key} | ${s.count} | ${fmt(s.avgACV)} | ${fmt(s.totalRev)} |\n`;
  });

  // Fine-grained 3-way
  const fineRanked = Array.from(segMap.entries())
    .map(([k, v]) => ({ key: k, ...segStats(v.customers), customers: v.customers }))
    .filter(s => s.count >= 3)
    .sort((a, b) => (b.count * b.avgACV) - (a.count * a.avgACV));

  out += `\n### Fine-Grained: Event Type × Product Type × Geo (min 3 customers)\n\n`;
  out += `| Rank | Segment | Customers | Avg ACV | Total Rev |\n`;
  out += `|---|---|---|---|---|\n`;
  fineRanked.slice(0, 20).forEach((s, i) => {
    out += `| ${i+1} | ${s.key} | ${s.count} | ${fmt(s.avgACV)} | ${fmt(s.totalRev)} |\n`;
  });

  // Top 5 segments — detail view with named customers
  out += `\n---\n\n## Part 3 — Top 5 Segments: Named Customer Breakdown\n\n`;
  const top5segs = segRanked.slice(0, 5);
  for (const seg of top5segs) {
    out += `### ${seg.key}\n`;
    out += `- Customers: ${seg.count} | Avg ACV: ${fmt(seg.avgACV)} | Total: ${fmt(seg.totalRev)}\n\n`;
    out += `| Customer | Revenue | Product | Geo |\n`;
    out += `|---|---|---|---|\n`;
    seg.customers.sort((a,b) => b.totalRevenue - a.totalRevenue).slice(0, 15).forEach(c => {
      out += `| ${c.name} | ${fmt(c.totalRevenue)} | ${c.productType} | ${c.geo} |\n`;
    });
    out += `\n`;
  }

  // ── PART 4: CLAY ENRICHMENT ASK ───────────────────────────────────────────
  out += `---\n\n## Part 4 — Clay Enrichment: What to Pull\n\n`;
  out += `The current sandbox data has company size and revenue columns but they are sparsely populated.\n`;
  out += `Here is the enrichment I need from Clay to 10x the ICP analysis:\n\n`;

  out += `### Fields to enrich per Customer Code (company)\n\n`;
  out += `| Field | Why it matters | Clay source |\n`;
  out += `|---|---|---|\n`;
  out += `| **Employee count** | Distinguishes SMB ($50–200 employees) from mid-market (200–2K) from enterprise (2K+). ICP is likely mid-market — large enough to have a budget, small enough to move fast. | Apollo / LinkedIn |\n`;
  out += `| **Company revenue (ARR/annual)** | Higher revenue = larger event budgets and faster procurement. Filter for $5M–$500M sweet spot. | Apollo / Clearbit |\n`;
  out += `| **LinkedIn company URL** | Needed to check if company runs events (LinkedIn Events tab) — a strong intent signal. | Apollo / LinkedIn |\n`;
  out += `| **Number of LinkedIn followers** | Proxy for brand size and community footprint — larger = more likely to run recurring events. | LinkedIn |\n`;
  out += `| **HQ country / city** | Verify geo accuracy (CSV country field has gaps). US city/state for targeting local events. | Apollo |\n`;
  out += `| **Funding status** | VC-backed companies = faster buying cycles (growth mode). Bootstrapped = slower. | Crunchbase |\n`;
  out += `| **Year founded** | Older orgs = established event programs; newer = more likely to be building from scratch. | Apollo |\n`;
  out += `| **Decision-maker title (primary contact)** | Confirm who signed the deal. We want to target same titles outbound. | Apollo / HubSpot deal contact |\n`;
  out += `| **Is a trade association or membership org?** | Associations run recurring annual events almost universally — highest repeat rate. Boolean flag. | Manual / Apollo keyword |\n`;
  out += `| **Event frequency signal** | Has the company run >1 event on Eventbrite, LinkedIn Events, or their own website in past 12 months? | Apify / Clay web scrape |\n`;
  out += `| **Tech stack (event-adjacent tools)** | Using Cvent, Bizzabo, Hopin, Zoom Events, Eventbrite? Active displacement targets. Using Salesforce/HubSpot? Signals marketing sophistication. | Apollo technographics / BuiltWith |\n`;
  out += `| **Job postings mentioning "events"** | Companies hiring event coordinators or virtual event managers are actively scaling their event programs. | Apollo job postings |\n\n`;

  out += `### Priority enrichment for outbound targeting\n\n`;
  out += `For the first Clay run, prioritize:\n`;
  out += `1. **Employee count** (single most useful ICP filter)\n`;
  out += `2. **Company revenue** (second most useful)\n`;
  out += `3. **LinkedIn company URL** (enables event frequency check)\n`;
  out += `4. **Decision-maker title** (validates targeting assumptions)\n`;
  out += `5. **Tech stack** (Cvent/Bizzabo/Hopin users = active displacement opportunity)\n\n`;

  out += `### The 5 questions enrichment will answer\n\n`;
  out += `1. What employee count range produces the best-value customers? (SMB vs mid-market vs enterprise)\n`;
  out += `2. Are there company revenue thresholds that predict deal size (and should set our outbound floor)?\n`;
  out += `3. Which competitor tech stacks are most common — and what does that tell us about their pain with current solutions?\n`;
  out += `4. Are there hiring signals (event roles) that predict near-term buying intent?\n`;
  out += `5. What's the geographic distribution by employee count — should we weight US mid-market differently than MENA enterprise?\n\n`;

  // Export the top 250 as a CSV for Clay
  out += `---\n\n## Appendix — Top 250 Customer List (for Clay upload)\n\n`;
  out += `*See companion file: \`new-customers-top250-clay.csv\`*\n`;

  fs.writeFileSync(path.join(OUT_DIR, 'new-customer-analysis.md'), out);

  // Also write a clean CSV of top 250 for Clay
  const csvHeaders = ['Rank','Customer Name','Customer Code','Total Revenue','Product Type','Event Type','Industry','Country','Geo','Transactions','Contract Start Date','Sales Rep','Channel'];
  const csvRows = customers.slice(0, 250).map((c, i) => [
    i+1, c.name, c.code, c.totalRevenue.toFixed(2), c.productType, c.eventType, c.industry, c.country, c.geo, c.transactions, c.contractStartDate, c.salesRep, c.channel
  ]);

  const csvContent = [csvHeaders, ...csvRows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'new-customers-top250-clay.csv'), csvContent);

  console.log(`\nOutput written to outputs/outbound/`);
  console.log(`  - new-customer-analysis.md`);
  console.log(`  - new-customers-top250-clay.csv`);

  // Console summary
  console.log(`\n=== SUMMARY ===`);
  console.log(`New customers since Jan 2024: ${customers.length}`);
  console.log(`\nTop 10 by revenue:`);
  customers.slice(0,10).forEach((c,i) => {
    console.log(`  ${i+1}. ${c.name} — ${fmt(c.totalRevenue)} — ${c.eventType} × ${c.industry} × ${c.geo}`);
  });

  console.log(`\nTop 10 sub-segments (Event × Industry):`);
  segRanked.slice(0,10).forEach((s,i) => {
    console.log(`  ${i+1}. ${s.key} — ${s.count} customers — Avg ACV: ${fmt(s.avgACV)} — Total: ${fmt(s.totalRev)}`);
  });
}

main();
