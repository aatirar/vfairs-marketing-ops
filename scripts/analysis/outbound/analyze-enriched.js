/**
 * Analyze enriched top-250 data
 * Cross-tab employee size / revenue bands vs. event type and revenue per customer
 * Goal: find where the best ICP lives (high ACV + right company size)
 */

const fs = require('fs');
const path = require('path');

const CSV = path.join(__dirname, '../../../outputs/outbound/new-customers-top250-enriched.csv');

function parseCSVLine(line) {
  const result = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result.map(v => v.trim());
}

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = vals[i] || '');
    return row;
  });
}

const fmt = n => '$' + Math.round(n).toLocaleString();

function main() {
  const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
  console.log(`Loaded ${rows.length} enriched rows\n`);

  // ── 1. Employee size vs ACV ────────────────────────────────────────────────
  const empGroups = {};
  for (const r of rows) {
    const bucket = r.emp_bucket || 'Unknown';
    if (!empGroups[bucket]) empGroups[bucket] = { count: 0, totalRev: 0, acvs: [] };
    empGroups[bucket].count++;
    empGroups[bucket].totalRev += parseFloat(r['Total Revenue']) || 0;
    empGroups[bucket].acvs.push(parseFloat(r['Total Revenue']) || 0);
  }

  const empOrder = ['Micro (<50)', 'Small (50-199)', 'Mid-Market (200-999)', 'Mid-Market (1K-5K)', 'Enterprise (5K-20K)', 'Enterprise (20K+)', 'Unknown'];
  console.log('=== ACV BY EMPLOYEE SIZE BUCKET ===');
  console.log('Bucket                    | Count | Avg ACV  | Total Rev');
  console.log('--------------------------|-------|----------|----------');
  for (const b of empOrder) {
    const g = empGroups[b];
    if (!g) continue;
    const avg = g.count > 0 ? g.totalRev / g.count : 0;
    console.log(`${b.padEnd(26)}| ${String(g.count).padStart(5)} | ${fmt(avg).padStart(8)} | ${fmt(g.totalRev)}`);
  }

  // ── 2. Event type vs employee size (cross-tab) ─────────────────────────────
  console.log('\n=== EVENT TYPE × EMPLOYEE SIZE (count of customers) ===');
  const eventTypes = [...new Set(rows.map(r => r['Event Type']))].sort();
  const empBuckets = ['Micro (<50)', 'Small (50-199)', 'Mid-Market (200-999)', 'Mid-Market (1K-5K)', 'Enterprise (5K-20K)', 'Enterprise (20K+)', 'Unknown'];

  const cross = {};
  for (const r of rows) {
    const et = r['Event Type'] || 'Other';
    const eb = r.emp_bucket || 'Unknown';
    if (!cross[et]) cross[et] = {};
    cross[et][eb] = (cross[et][eb] || 0) + 1;
  }

  // Only show event types with 5+ customers
  const majorEventTypes = eventTypes.filter(et => rows.filter(r => r['Event Type'] === et).length >= 5);
  const header = ['Event Type'.padEnd(22), ...empBuckets.map(b => b.slice(0,8).padStart(9))].join('|');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const et of majorEventTypes) {
    const row = [et.padEnd(22), ...empBuckets.map(b => String(cross[et]?.[b] || 0).padStart(9))].join('|');
    console.log(row);
  }

  // ── 3. Top segment combos by average ACV (event × emp bucket, min 3 customers) ──
  console.log('\n=== TOP COMBOS: EVENT TYPE × EMP SIZE (min 3 customers, sorted by avg ACV) ===');
  const combos = {};
  for (const r of rows) {
    const key = `${r['Event Type']} × ${r.emp_bucket || 'Unknown'}`;
    if (!combos[key]) combos[key] = { count: 0, totalRev: 0 };
    combos[key].count++;
    combos[key].totalRev += parseFloat(r['Total Revenue']) || 0;
  }
  const comboRanked = Object.entries(combos)
    .filter(([, v]) => v.count >= 3)
    .map(([k, v]) => ({ key: k, count: v.count, avg: v.totalRev / v.count, total: v.totalRev }))
    .sort((a, b) => b.avg - a.avg);

  comboRanked.slice(0, 20).forEach((c, i) => {
    console.log(`${i+1}. ${c.key.padEnd(55)} | ${c.count} customers | Avg ACV: ${fmt(c.avg)} | Total: ${fmt(c.total)}`);
  });

  // ── 4. Job/Career Fair deep dive ──────────────────────────────────────────
  console.log('\n=== JOB/CAREER FAIR CUSTOMERS — FULL BREAKDOWN ===');
  const jobFair = rows.filter(r => r['Event Type'] === 'Job/Career Fair').sort((a, b) => parseFloat(b['Total Revenue']) - parseFloat(a['Total Revenue']));
  console.log(`Count: ${jobFair.length}`);
  jobFair.forEach(r => {
    console.log(`  ${r['Customer Name'].slice(0,45).padEnd(45)} | ${fmt(parseFloat(r['Total Revenue']))} | ${r.emp_bucket || '?'} | ${r.rev_bucket || '?'} | ${r['Geo']} | ${r.hs_decision_title || '-'}`);
  });

  // ── 5. Benefits Fair deep dive ─────────────────────────────────────────────
  console.log('\n=== BENEFITS FAIR CUSTOMERS — FULL BREAKDOWN ===');
  const benefits = rows.filter(r => r['Event Type'] === 'Benefits Fair').sort((a, b) => parseFloat(b['Total Revenue']) - parseFloat(a['Total Revenue']));
  console.log(`Count: ${benefits.length}`);
  benefits.forEach(r => {
    console.log(`  ${r['Customer Name'].slice(0,45).padEnd(45)} | ${fmt(parseFloat(r['Total Revenue']))} | ${r.emp_bucket || '?'} | ${r.rev_bucket || '?'} | ${r['Geo']} | ${r.hs_decision_title || '-'}`);
  });

  // ── 6. ICP sweet spot: mid-market (200-5K employees) high-ACV customers ───
  console.log('\n=== ICP SWEET SPOT: 200-5K EMPLOYEES × $30K+ ACV ===');
  const sweetSpot = rows
    .filter(r => ['Mid-Market (200-999)', 'Mid-Market (1K-5K)'].includes(r.emp_bucket) && parseFloat(r['Total Revenue']) >= 30000)
    .sort((a, b) => parseFloat(b['Total Revenue']) - parseFloat(a['Total Revenue']));
  console.log(`Count: ${sweetSpot.length}`);
  sweetSpot.forEach(r => {
    console.log(`  ${r['Customer Name'].slice(0,45).padEnd(45)} | ${fmt(parseFloat(r['Total Revenue']))} | ${r.emp_bucket} | ${r['Event Type']} | ${r['Industry']} | ${r['Geo']}`);
  });

  // ── 7. Non-profit/Association conferences ─────────────────────────────────
  console.log('\n=== CONFERENCE × NON-PROFIT (top 20 by ACV) ===');
  const confNP = rows
    .filter(r => r['Event Type'] === 'Conference' && r['Industry'] === 'Non-Profit')
    .sort((a, b) => parseFloat(b['Total Revenue']) - parseFloat(a['Total Revenue']));
  confNP.slice(0, 20).forEach(r => {
    console.log(`  ${r['Customer Name'].slice(0,45).padEnd(45)} | ${fmt(parseFloat(r['Total Revenue']))} | ${r.emp_bucket || '?'} | ${r['Geo']} | ${r.hs_decision_title || '-'}`);
  });
}

main();
