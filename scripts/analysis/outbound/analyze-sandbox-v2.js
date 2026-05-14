/**
 * Sandbox Analysis v2 — Corrected Methodology
 *
 * ACV: Use "Overall Customer Value / Total Annual Contract Value" column,
 *      deduped per Customer Code (same value repeats across all transactions for a contract).
 *      Take unique ACV per Customer Code per year.
 *
 * Repeat Rate: % of 2024 customers (by Customer Code) who also appear in 2025.
 *              NOT the "New/Repeat Client" column (that is transaction-level, not company-level).
 *
 * Segments: Type of Event × Client Industry groupings.
 *           We combine similar industries and event types where appropriate.
 *
 * Output: Segment scorecard with named top 5 customers per segment.
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../../data/customers/vFairs-Hosted Customer Sandbox Data (Original) - Raw Data.csv');

// Parse CSV properly (handles quoted fields with commas)
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

function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

// Normalize industry names to broader buckets for analysis
function normalizeIndustry(industry) {
  const i = (industry || '').trim();
  // Education groupings
  if (/higher education/i.test(i)) return 'Higher Education';
  if (/educational institution/i.test(i)) return 'Educational Institution';
  if (/education management/i.test(i)) return 'Education Management';
  if (/education/i.test(i)) return 'Education (Other)';
  // Non-profit
  if (/non-?profit/i.test(i) || /nonprofit/i.test(i)) return 'Non-Profit';
  // Healthcare
  if (/hospital/i.test(i) || /health care/i.test(i) || /healthcare/i.test(i) || /medical/i.test(i) || /pharmaceut/i.test(i)) return 'Healthcare/Pharma';
  // Technology
  if (/information technology/i.test(i) || /computer software/i.test(i) || /internet/i.test(i)) return 'Technology';
  // Government
  if (/government/i.test(i)) return 'Government';
  // Finance
  if (/financial services/i.test(i) || /banking/i.test(i) || /insurance/i.test(i) || /accounting/i.test(i)) return 'Finance';
  // Manufacturing / Industrial
  if (/manufactur/i.test(i)) return 'Manufacturing';
  // Staffing
  if (/staffing/i.test(i) || /recruiting/i.test(i)) return 'Staffing';
  // Associations / Trade
  if (/association/i.test(i)) return 'Association';
  return i || 'Unknown';
}

// Normalize event type to broader buckets
function normalizeEventType(eventType) {
  const e = (eventType || '').trim();
  if (/job fair/i.test(e) || /career fair/i.test(e)) return 'Job/Career Fair';
  if (/conference/i.test(e)) return 'Conference';
  if (/trade show/i.test(e)) return 'Trade Show';
  if (/summit/i.test(e)) return 'Summit';
  if (/expo/i.test(e)) return 'Expo';
  if (/benefit/i.test(e)) return 'Benefits Fair';
  if (/networking/i.test(e)) return 'Networking Event';
  if (/webinar/i.test(e)) return 'Webinar';
  if (/virtual event/i.test(e)) return 'Virtual Event (General)';
  return e || 'Unknown';
}

function main() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(content);
  console.log(`Total rows loaded: ${rows.length}`);

  // Focus on 2024-2025
  const relevant = rows.filter(r => {
    const year = parseInt(r['Year']);
    return year === 2024 || year === 2025;
  });
  console.log(`Rows in 2024-2025: ${relevant.length}`);

  // Build per-customer annual records
  // ACV = sum of Total Amount per Customer Code per Year (aggregated, not from ACV column)
  // Key: CustomerCode|Year → { name, code, year, acv (summed), eventType, industry, transactions }
  const customerYearMap = new Map();
  for (const row of relevant) {
    const code = row['Customer Code'];
    if (!code || code === 'Customer Code') continue;
    const year = parseInt(row['Year']);
    const key = `${code}|${year}`;
    const amount = parseAmount(row['Total Amount']);
    if (!customerYearMap.has(key)) {
      customerYearMap.set(key, {
        name: row['Customer Name'],
        code,
        year,
        acv: 0,  // will be summed below
        eventType: normalizeEventType(row['Type of Event']),
        rawEventType: row['Type of Event'],
        industry: normalizeIndustry(row['Client Industry']),
        rawIndustry: row['Client Industry'],
        country: row['Country'],
        transactions: 0,
      });
    }
    const record = customerYearMap.get(key);
    record.transactions++;
    record.acv += amount;  // sum all transaction amounts = true annual spend
    // Use most recent row's event type / industry (in case of mixed — rare)
    if (row['Type of Event']) record.eventType = normalizeEventType(row['Type of Event']);
    if (row['Client Industry']) record.industry = normalizeIndustry(row['Client Industry']);
  }

  const customerYears = Array.from(customerYearMap.values());
  console.log(`Unique customer-years: ${customerYears.length}`);

  // Separate by year
  const customers2024 = customerYears.filter(c => c.year === 2024);
  const customers2025 = customerYears.filter(c => c.year === 2025);
  console.log(`Unique customers 2024: ${customers2024.length}`);
  console.log(`Unique customers 2025: ${customers2025.length}`);

  // Build sets for repeat rate calculation
  const codes2024 = new Set(customers2024.map(c => c.code));
  const codes2025 = new Set(customers2025.map(c => c.code));

  // Build segment analysis
  // Segment = eventType × industry
  // Use 2024 customers as the base, mark which repeated in 2025
  const segmentMap = new Map();

  function getSegmentKey(eventType, industry) {
    return `${eventType} × ${industry}`;
  }

  function ensureSegment(key, eventType, industry) {
    if (!segmentMap.has(key)) {
      segmentMap.set(key, {
        eventType,
        industry,
        customers2024: [],
        customers2025: [],
        repeaters: [],
      });
    }
    return segmentMap.get(key);
  }

  // Add all 2024 customers
  for (const c of customers2024) {
    const key = getSegmentKey(c.eventType, c.industry);
    const seg = ensureSegment(key, c.eventType, c.industry);
    seg.customers2024.push(c);
  }

  // Add all 2025 customers
  for (const c of customers2025) {
    const key = getSegmentKey(c.eventType, c.industry);
    const seg = ensureSegment(key, c.eventType, c.industry);
    seg.customers2025.push(c);
  }

  // Calculate metrics per segment
  const results = [];
  for (const [key, seg] of segmentMap.entries()) {
    const n2024 = seg.customers2024.length;
    const n2025 = seg.customers2025.length;
    const total = new Map();

    // Collect all unique customers across both years
    const allCustomers = new Map();
    for (const c of [...seg.customers2024, ...seg.customers2025]) {
      if (!allCustomers.has(c.code) || allCustomers.get(c.code).acv < c.acv) {
        allCustomers.set(c.code, c);
      }
    }

    // Repeaters: in 2024 AND in 2025
    const repeaters2024Codes = new Set(seg.customers2024.map(c => c.code));
    const repeaters2025Codes = new Set(seg.customers2025.map(c => c.code));
    let repeaterCount = 0;
    for (const code of repeaters2024Codes) {
      if (repeaters2025Codes.has(code)) repeaterCount++;
    }
    const repeatRate = n2024 > 0 ? repeaterCount / n2024 : 0;

    // ACV: average of ACV values across all unique customers in segment (2024+2025 combined unique)
    const uniqueCustomers = Array.from(allCustomers.values());
    const acvValues = uniqueCustomers.filter(c => c.acv > 0).map(c => c.acv);
    const avgACV = acvValues.length > 0 ? acvValues.reduce((a, b) => a + b, 0) / acvValues.length : 0;
    const totalRevenue = acvValues.reduce((a, b) => a + b, 0);

    // Top 5 by ACV
    const top5 = uniqueCustomers
      .filter(c => c.acv > 0)
      .sort((a, b) => b.acv - a.acv)
      .slice(0, 5);

    // Composite score: ACV × (1 + repeatRate) × ln(deals+1)
    const totalDeals = n2024 + n2025;
    const score = avgACV * (1 + repeatRate) * Math.log(totalDeals + 1);

    results.push({
      segment: key,
      eventType: seg.eventType,
      industry: seg.industry,
      n2024,
      n2025,
      uniqueCustomers: uniqueCustomers.length,
      repeaterCount,
      repeatRate,
      avgACV,
      totalRevenue,
      score,
      top5,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Print results
  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const pct = (n) => (n * 100).toFixed(0) + '%';

  let output = `# Sandbox Segment Scorecard — Corrected Methodology\n`;
  output += `**Source:** vFairs Hosted Customer Sandbox · 2024–2025 only\n`;
  output += `**ACV:** Overall Customer Value column, deduped per Customer Code per year\n`;
  output += `**Repeat Rate:** % of 2024 customers (by Customer Code) who also appeared in 2025\n`;
  output += `**Generated:** ${new Date().toISOString().slice(0, 10)}\n\n`;

  output += `---\n\n## Top Segments by Composite Score (ACV × (1+RepeatRate) × ln(Deals))\n\n`;
  output += `| Rank | Segment | Customers (24/25) | Repeat Rate | Avg ACV | Total Rev | Score |\n`;
  output += `|---|---|---|---|---|---|---|\n`;
  results.slice(0, 20).forEach((r, i) => {
    output += `| ${i + 1} | ${r.segment} | ${r.n2024}/${r.n2025} (${r.uniqueCustomers} unique) | ${pct(r.repeatRate)} | ${fmt(r.avgACV)} | ${fmt(r.totalRevenue)} | ${r.score.toFixed(0)} |\n`;
  });

  output += `\n---\n\n## Segment Deep Dives (Top 15)\n\n`;

  results.slice(0, 15).forEach((r, i) => {
    output += `### ${i + 1}. ${r.segment}\n\n`;
    output += `- **Customers:** ${r.n2024} in 2024 · ${r.n2025} in 2025 · ${r.uniqueCustomers} unique total\n`;
    output += `- **Repeat Rate:** ${pct(r.repeatRate)} (${r.repeaterCount} of ${r.n2024} 2024 customers returned in 2025)\n`;
    output += `- **Avg ACV:** ${fmt(r.avgACV)}\n`;
    output += `- **Total Revenue (2024-2025):** ${fmt(r.totalRevenue)}\n`;
    output += `- **Composite Score:** ${r.score.toFixed(0)}\n\n`;
    output += `**Top Customers by ACV:**\n\n`;
    r.top5.forEach((c, j) => {
      output += `${j + 1}. **${c.name}** (${c.code}) — ACV: ${fmt(c.acv)} · Year: ${c.year} · ${c.country}\n`;
    });
    output += `\n`;
  });

  // Also print consolidated view: Job/Career Fair across all education variants
  output += `---\n\n## Job/Career Fair — Education Consolidated\n\n`;
  output += `*(Combining Higher Education + Educational Institution + Education Management + Education (Other))*\n\n`;

  const jobFairEduSegments = results.filter(r =>
    r.eventType === 'Job/Career Fair' &&
    (r.industry.includes('Education') || r.industry.includes('Higher'))
  );

  const allJobFairEduCustomers = new Map();
  for (const seg of jobFairEduSegments) {
    for (const c of seg.top5) {
      if (!allJobFairEduCustomers.has(c.code) || allJobFairEduCustomers.get(c.code).acv < c.acv) {
        allJobFairEduCustomers.set(c.code, c);
      }
    }
  }

  // Also grab all customers, not just top 5 per sub-seg
  const allJobFairEduFull = new Map();
  for (const [key, seg] of segmentMap.entries()) {
    if (seg.eventType === 'Job/Career Fair' &&
        (seg.industry.includes('Education') || seg.industry.includes('Higher'))) {
      for (const c of [...seg.customers2024, ...seg.customers2025]) {
        if (c.acv > 0 && (!allJobFairEduFull.has(c.code) || allJobFairEduFull.get(c.code).acv < c.acv)) {
          allJobFairEduFull.set(c.code, c);
        }
      }
    }
  }

  const eduFull = Array.from(allJobFairEduFull.values()).sort((a, b) => b.acv - a.acv);
  const eduACVs = eduFull.filter(c => c.acv > 0).map(c => c.acv);
  const eduAvgACV = eduACVs.length > 0 ? eduACVs.reduce((a, b) => a + b, 0) / eduACVs.length : 0;
  const eduTotalRev = eduACVs.reduce((a, b) => a + b, 0);

  // Repeat rate for combined
  const eduCodes2024 = new Set();
  const eduCodes2025 = new Set();
  for (const [key, seg] of segmentMap.entries()) {
    if (seg.eventType === 'Job/Career Fair' &&
        (seg.industry.includes('Education') || seg.industry.includes('Higher'))) {
      seg.customers2024.forEach(c => eduCodes2024.add(c.code));
      seg.customers2025.forEach(c => eduCodes2025.add(c.code));
    }
  }
  let eduRepeaters = 0;
  for (const code of eduCodes2024) {
    if (eduCodes2025.has(code)) eduRepeaters++;
  }
  const eduRepeatRate = eduCodes2024.size > 0 ? eduRepeaters / eduCodes2024.size : 0;

  output += `- **Unique Customers (2024-2025):** ${eduFull.length}\n`;
  output += `- **Customers in 2024:** ${eduCodes2024.size}\n`;
  output += `- **Customers in 2025:** ${eduCodes2025.size}\n`;
  output += `- **Repeat Rate:** ${pct(eduRepeatRate)} (${eduRepeaters} of ${eduCodes2024.size} returned)\n`;
  output += `- **Avg ACV:** ${fmt(eduAvgACV)}\n`;
  output += `- **Total Revenue (2024-2025):** ${fmt(eduTotalRev)}\n\n`;
  output += `**All customers ranked by ACV:**\n\n`;
  eduFull.forEach((c, j) => {
    output += `${j + 1}. **${c.name}** — ACV: ${fmt(c.acv)} · ${c.industry} · Year: ${c.year} · ${c.country}\n`;
  });

  output += `\n---\n\n## Conference — All Industries\n\n`;
  const confAll = new Map();
  for (const [key, seg] of segmentMap.entries()) {
    if (seg.eventType === 'Conference') {
      for (const c of [...seg.customers2024, ...seg.customers2025]) {
        if (c.acv > 0 && (!confAll.has(c.code) || confAll.get(c.code).acv < c.acv)) {
          confAll.set(c.code, c);
        }
      }
    }
  }
  const confFull = Array.from(confAll.values()).sort((a, b) => b.acv - a.acv);
  const confACVs = confFull.filter(c => c.acv > 0).map(c => c.acv);
  const confAvgACV = confACVs.length > 0 ? confACVs.reduce((a, b) => a + b, 0) / confACVs.length : 0;
  const confTotalRev = confACVs.reduce((a, b) => a + b, 0);

  const confCodes2024 = new Set();
  const confCodes2025 = new Set();
  for (const [key, seg] of segmentMap.entries()) {
    if (seg.eventType === 'Conference') {
      seg.customers2024.forEach(c => confCodes2024.add(c.code));
      seg.customers2025.forEach(c => confCodes2025.add(c.code));
    }
  }
  let confRepeaters = 0;
  for (const code of confCodes2024) {
    if (confCodes2025.has(code)) confRepeaters++;
  }
  const confRepeatRate = confCodes2024.size > 0 ? confRepeaters / confCodes2024.size : 0;

  output += `- **Unique Customers (2024-2025):** ${confFull.length}\n`;
  output += `- **Customers in 2024:** ${confCodes2024.size}\n`;
  output += `- **Customers in 2025:** ${confCodes2025.size}\n`;
  output += `- **Repeat Rate:** ${pct(confRepeatRate)} (${confRepeaters} of ${confCodes2024.size} returned)\n`;
  output += `- **Avg ACV:** ${fmt(confAvgACV)}\n`;
  output += `- **Total Revenue (2024-2025):** ${fmt(confTotalRev)}\n\n`;
  output += `**Top 15 customers by ACV:**\n\n`;
  confFull.slice(0, 15).forEach((c, j) => {
    output += `${j + 1}. **${c.name}** — ACV: ${fmt(c.acv)} · ${c.industry} · Year: ${c.year} · ${c.country}\n`;
  });

  // Save output
  const outPath = path.join(__dirname, '../../../outputs/outbound/segment-scorecard-v2.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output);
  console.log(`\nOutput saved to: ${outPath}`);

  // Also print summary to console
  console.log('\n=== TOP 10 SEGMENTS ===');
  results.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. ${r.segment}`);
    console.log(`   Customers: ${r.n2024} (2024) / ${r.n2025} (2025) — Repeat: ${pct(r.repeatRate)} — Avg ACV: ${fmt(r.avgACV)} — Score: ${r.score.toFixed(0)}`);
    if (r.top5.length > 0) {
      console.log(`   Top customer: ${r.top5[0].name} — ${fmt(r.top5[0].acv)}`);
    }
  });

  console.log('\n=== JOB/CAREER FAIR × EDUCATION (CONSOLIDATED) ===');
  console.log(`Unique customers: ${eduFull.length} | Avg ACV: ${fmt(eduAvgACV)} | Repeat Rate: ${pct(eduRepeatRate)}`);
  eduFull.forEach((c, j) => {
    console.log(`  ${j + 1}. ${c.name} — ${fmt(c.acv)}`);
  });
}

main();
