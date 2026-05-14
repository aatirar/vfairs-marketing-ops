/**
 * Sandbox Segment Analysis for Cold Outbound ICP Validation
 * Analyzes 5 years of vFairs transaction data to rank segments by:
 * - Total revenue
 * - Average contract value (ACV)
 * - Unique customer count
 * - Repeat customer rate
 * - Geographic distribution
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../../data/customers/vFairs-Hosted Customer Sandbox Data (Original) - Raw Data.csv');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
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

function parseMoney(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[$,]/g, '')) || 0;
}

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

function run() {
  console.log('Loading sandbox CSV...');
  const rows = parseCSV(CSV_PATH);
  console.log(`Loaded ${rows.length} rows\n`);

  // Filter to new sales only (exclude renewals for ACV analysis, but keep for repeat rate)
  // We'll analyze all rows for segment sizing, and new-sales rows for ACV
  const newSales = rows.filter(r => {
    const t = normalize(r['Transaction Type/ Sales Type'] || r['Transaction Type/Sales Type'] || '');
    return t.includes('new') || t === '';
  });

  // ─── SEGMENT 1: By Event Type ───────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 1: Revenue & ACV by Event Type (New Sales)');
  console.log('═══════════════════════════════════════════════════════════════');

  const byEventType = {};
  for (const row of newSales) {
    const eventType = normalize(row['Type of Event']) || 'unknown';
    const amount = parseMoney(row['Total Amount']);
    const customerCode = row['Customer Code'] || row['Group ID'];
    const isRepeat = normalize(row['New/Repeat Client']) === 'repeat';
    const country = normalize(row['Country']) || 'unknown';

    if (!byEventType[eventType]) {
      byEventType[eventType] = {
        totalRevenue: 0,
        dealCount: 0,
        customers: new Set(),
        repeatCustomers: new Set(),
        countries: {},
      };
    }

    const seg = byEventType[eventType];
    seg.totalRevenue += amount;
    seg.dealCount++;
    if (customerCode) seg.customers.add(customerCode);
    if (isRepeat && customerCode) seg.repeatCustomers.add(customerCode);
    seg.countries[country] = (seg.countries[country] || 0) + 1;
  }

  // Also compute repeat rate from ALL rows (including renewals)
  const repeatByEventType = {};
  for (const row of rows) {
    const eventType = normalize(row['Type of Event']) || 'unknown';
    const customerCode = row['Customer Code'] || row['Group ID'];
    const isRepeat = normalize(row['New/Repeat Client']) === 'repeat';
    if (!repeatByEventType[eventType]) repeatByEventType[eventType] = { new: 0, repeat: 0 };
    if (isRepeat) repeatByEventType[eventType].repeat++;
    else repeatByEventType[eventType].new++;
  }

  const eventTypeResults = Object.entries(byEventType)
    .map(([type, data]) => {
      const acv = data.dealCount > 0 ? data.totalRevenue / data.dealCount : 0;
      const allRows = repeatByEventType[type] || { new: 0, repeat: 0 };
      const repeatRate = (allRows.new + allRows.repeat) > 0
        ? ((allRows.repeat / (allRows.new + allRows.repeat)) * 100).toFixed(1)
        : '0.0';
      const topCountries = Object.entries(data.countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, n]) => `${c}(${n})`)
        .join(', ');
      return {
        type,
        totalRevenue: data.totalRevenue,
        dealCount: data.dealCount,
        uniqueCustomers: data.customers.size,
        acv,
        repeatRate: parseFloat(repeatRate),
        topCountries,
      };
    })
    .filter(r => r.dealCount >= 5) // exclude noise
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  console.log('\nEvent Type | Total Rev | Deals | Uniq Customers | ACV | Repeat Rate | Top Countries');
  console.log('─'.repeat(110));
  for (const r of eventTypeResults) {
    console.log(
      `${r.type.padEnd(30)} | $${r.totalRevenue.toLocaleString().padStart(12)} | ${String(r.dealCount).padStart(5)} | ${String(r.uniqueCustomers).padStart(14)} | $${Math.round(r.acv).toLocaleString().padStart(8)} | ${String(r.repeatRate).padStart(8)}% | ${r.topCountries}`
    );
  }

  // ─── SEGMENT 2: By Industry ─────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 2: Revenue & ACV by Client Industry (New Sales)');
  console.log('═══════════════════════════════════════════════════════════════');

  const byIndustry = {};
  for (const row of newSales) {
    const industry = normalize(row['Client Industry']) || 'unknown';
    const amount = parseMoney(row['Total Amount']);
    const customerCode = row['Customer Code'] || row['Group ID'];

    if (!byIndustry[industry]) {
      byIndustry[industry] = { totalRevenue: 0, dealCount: 0, customers: new Set() };
    }
    byIndustry[industry].totalRevenue += amount;
    byIndustry[industry].dealCount++;
    if (customerCode) byIndustry[industry].customers.add(customerCode);
  }

  // Repeat rate by industry from all rows
  const repeatByIndustry = {};
  for (const row of rows) {
    const industry = normalize(row['Client Industry']) || 'unknown';
    const isRepeat = normalize(row['New/Repeat Client']) === 'repeat';
    if (!repeatByIndustry[industry]) repeatByIndustry[industry] = { new: 0, repeat: 0 };
    if (isRepeat) repeatByIndustry[industry].repeat++;
    else repeatByIndustry[industry].new++;
  }

  const industryResults = Object.entries(byIndustry)
    .map(([industry, data]) => {
      const acv = data.dealCount > 0 ? data.totalRevenue / data.dealCount : 0;
      const allRows = repeatByIndustry[industry] || { new: 0, repeat: 0 };
      const repeatRate = (allRows.new + allRows.repeat) > 0
        ? ((allRows.repeat / (allRows.new + allRows.repeat)) * 100).toFixed(1)
        : '0.0';
      return {
        industry,
        totalRevenue: data.totalRevenue,
        dealCount: data.dealCount,
        uniqueCustomers: data.customers.size,
        acv,
        repeatRate: parseFloat(repeatRate),
      };
    })
    .filter(r => r.dealCount >= 10)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 25);

  console.log('\nIndustry | Total Rev | Deals | Uniq Customers | ACV | Repeat Rate');
  console.log('─'.repeat(100));
  for (const r of industryResults) {
    console.log(
      `${r.industry.padEnd(45)} | $${r.totalRevenue.toLocaleString().padStart(12)} | ${String(r.dealCount).padStart(5)} | ${String(r.uniqueCustomers).padStart(14)} | $${Math.round(r.acv).toLocaleString().padStart(8)} | ${String(r.repeatRate).padStart(6)}%`
    );
  }

  // ─── SEGMENT 3: Event Type × Industry Cross-tab (Top Combos) ───────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 3: Top Segment Combinations (Event Type × Industry)');
  console.log('═══════════════════════════════════════════════════════════════');

  const byCombination = {};
  for (const row of newSales) {
    const eventType = normalize(row['Type of Event']) || 'unknown';
    const industry = normalize(row['Client Industry']) || 'unknown';
    const key = `${eventType} | ${industry}`;
    const amount = parseMoney(row['Total Amount']);
    const customerCode = row['Customer Code'] || row['Group ID'];

    if (!byCombination[key]) {
      byCombination[key] = { totalRevenue: 0, dealCount: 0, customers: new Set() };
    }
    byCombination[key].totalRevenue += amount;
    byCombination[key].dealCount++;
    if (customerCode) byCombination[key].customers.add(customerCode);
  }

  // Repeat rate for combos
  const repeatByCombination = {};
  for (const row of rows) {
    const eventType = normalize(row['Type of Event']) || 'unknown';
    const industry = normalize(row['Client Industry']) || 'unknown';
    const key = `${eventType} | ${industry}`;
    const isRepeat = normalize(row['New/Repeat Client']) === 'repeat';
    if (!repeatByCombination[key]) repeatByCombination[key] = { new: 0, repeat: 0 };
    if (isRepeat) repeatByCombination[key].repeat++;
    else repeatByCombination[key].new++;
  }

  const comboResults = Object.entries(byCombination)
    .map(([key, data]) => {
      const acv = data.dealCount > 0 ? data.totalRevenue / data.dealCount : 0;
      const allRows = repeatByCombination[key] || { new: 0, repeat: 0 };
      const repeatRate = (allRows.new + allRows.repeat) > 0
        ? ((allRows.repeat / (allRows.new + allRows.repeat)) * 100).toFixed(1)
        : '0.0';
      // Composite score: ACV × (1 + repeat rate/100) × log(deals)
      const score = acv * (1 + parseFloat(repeatRate) / 100) * Math.log(data.dealCount + 1);
      return {
        key,
        totalRevenue: data.totalRevenue,
        dealCount: data.dealCount,
        uniqueCustomers: data.customers.size,
        acv,
        repeatRate: parseFloat(repeatRate),
        score,
      };
    })
    .filter(r => r.dealCount >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  console.log('\nEvent Type | Industry | Total Rev | Deals | ACV | Repeat% | Composite Score');
  console.log('─'.repeat(120));
  for (const r of comboResults) {
    console.log(
      `${r.key.padEnd(60)} | $${r.totalRevenue.toLocaleString().padStart(10)} | ${String(r.dealCount).padStart(5)} | $${Math.round(r.acv).toLocaleString().padStart(8)} | ${String(r.repeatRate).padStart(5)}% | ${r.score.toFixed(0)}`
    );
  }

  // ─── SEGMENT 4: Geography breakdown for top event types ────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 4: US vs International Revenue Split by Event Type');
  console.log('═══════════════════════════════════════════════════════════════');

  const geoByEventType = {};
  for (const row of newSales) {
    const eventType = normalize(row['Type of Event']) || 'unknown';
    const country = normalize(row['Country']) || 'unknown';
    const amount = parseMoney(row['Total Amount']);
    if (!geoByEventType[eventType]) geoByEventType[eventType] = { us: 0, canada: 0, uk: 0, me: 0, other: 0, total: 0 };
    const g = geoByEventType[eventType];
    g.total += amount;
    if (country === 'united states') g.us += amount;
    else if (country === 'canada') g.canada += amount;
    else if (country === 'united kingdom') g.uk += amount;
    else if (['saudi arabia', 'united arab emirates', 'bahrain', 'kuwait', 'qatar', 'oman'].includes(country)) g.me += amount;
    else g.other += amount;
  }

  const topEventTypes = eventTypeResults.slice(0, 8).map(r => r.type);
  console.log('\nEvent Type | US% | Canada% | UK% | ME% | Other%');
  console.log('─'.repeat(80));
  for (const et of topEventTypes) {
    const g = geoByEventType[et];
    if (!g || g.total === 0) continue;
    const pct = v => ((v / g.total) * 100).toFixed(1);
    console.log(
      `${et.padEnd(30)} | ${pct(g.us).padStart(5)}% | ${pct(g.canada).padStart(7)}% | ${pct(g.uk).padStart(4)}% | ${pct(g.me).padStart(4)}% | ${pct(g.other).padStart(6)}%`
    );
  }

  // ─── SEGMENT 5: Recent 2 years (2023-2024) vs older — trend check ──────────
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('ANALYSIS 5: Recent Trend (2023-2025) — Which segments are GROWING?');
  console.log('═══════════════════════════════════════════════════════════════');

  const recentRows = newSales.filter(r => {
    const year = parseInt(r['Year'] || '0');
    return year >= 2023;
  });
  const olderRows = newSales.filter(r => {
    const year = parseInt(r['Year'] || '0');
    return year >= 2020 && year < 2023;
  });

  const recentByType = {};
  for (const row of recentRows) {
    const t = normalize(row['Type of Event']) || 'unknown';
    const amount = parseMoney(row['Total Amount']);
    recentByType[t] = (recentByType[t] || 0) + amount;
  }

  const olderByType = {};
  for (const row of olderRows) {
    const t = normalize(row['Type of Event']) || 'unknown';
    const amount = parseMoney(row['Total Amount']);
    olderByType[t] = (olderByType[t] || 0) + amount;
  }

  console.log('\nEvent Type | 2023-2025 Rev | 2020-2022 Rev | Trend');
  console.log('─'.repeat(80));
  const allTypes = [...new Set([...Object.keys(recentByType), ...Object.keys(olderByType)])];
  allTypes
    .filter(t => (recentByType[t] || 0) > 10000 || (olderByType[t] || 0) > 10000)
    .sort((a, b) => (recentByType[b] || 0) - (recentByType[a] || 0))
    .forEach(t => {
      const r = recentByType[t] || 0;
      const o = olderByType[t] || 0;
      const trend = o > 0 ? `${r > o ? '▲' : '▼'} ${Math.abs(((r - o) / o) * 100).toFixed(0)}%` : 'New';
      console.log(`${t.padEnd(30)} | $${r.toLocaleString().padStart(12)} | $${o.toLocaleString().padStart(12)} | ${trend}`);
    });

  // ─── SUMMARY: ICP Scorecard ─────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY: ICP SEGMENT SCORECARD (for Executive Briefing)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nTop segments ranked by composite score (ACV × Repeat Rate × Volume):');
  console.log();

  comboResults.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. ${r.key}`);
    console.log(`   ACV: $${Math.round(r.acv).toLocaleString()} | Deals: ${r.dealCount} | Repeat: ${r.repeatRate}% | Score: ${r.score.toFixed(0)}`);
    console.log();
  });

  // Save results to output file
  const output = {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    newSalesRows: newSales.length,
    byEventType: eventTypeResults,
    byIndustry: industryResults,
    topCombinations: comboResults,
    recentTrend: allTypes.map(t => ({
      type: t,
      recent2023_2025: recentByType[t] || 0,
      older2020_2022: olderByType[t] || 0,
    })).sort((a, b) => b.recent2023_2025 - a.recent2023_2025),
  };

  const outPath = path.join(__dirname, '../../../outputs/outbound-segment-analysis.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, (key, val) => val instanceof Set ? [...val] : val, 2));
  console.log(`\n✅ Full results saved to: ${outPath}`);
}

run();
