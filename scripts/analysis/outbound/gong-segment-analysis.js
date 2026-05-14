/**
 * Gong Segment Analysis — Phase 2
 *
 * Reads the matched call list from gong-segment-research.js Phase 1 output,
 * then fetches AI summaries for ALL substantive calls (20+ min, 2024 onwards)
 * per target company and synthesizes pain points, language, and buying signals.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.GONG_BASE_URL || 'https://us-3499.api.gong.io';
const ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const ACCESS_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const AUTH = Buffer.from(`${ACCESS_KEY}:${ACCESS_SECRET}`).toString('base64');
const SEGMENT_DIR = path.join(__dirname, '../../../outputs/outbound/gong-segment');

async function gongPost(endpoint, body) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${AUTH}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Gong POST ${endpoint} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getExtensiveBatch(callIds) {
  if (callIds.length === 0) return [];
  const data = await gongPost('/v2/calls/extensive', {
    filter: { callIds },
    contentSelector: {
      context: 'Extended',
      exposedFields: {
        parties: true,
        content: {
          brief: true,
          keyPoints: true,
          callOutcome: true,
          topics: true,
        }
      }
    }
  });
  return data.calls || [];
}

async function run() {
  console.log('=== Gong Segment Analysis: Pain Point Synthesis ===\n');

  // Load matched call list from Phase 1
  const matchedPath = path.join(SEGMENT_DIR, '_matched-call-list.json');
  if (!fs.existsSync(matchedPath)) {
    console.error('No matched call list found. Run gong-segment-research.js first.');
    process.exit(1);
  }

  const allMatched = JSON.parse(fs.readFileSync(matchedPath, 'utf-8'));
  console.log(`Loaded ${allMatched.length} matched calls from Phase 1.\n`);

  // Group by pattern, filter to 2024+ AND 20+ minutes
  const byPattern = {};
  let eligible = 0;
  for (const call of allMatched) {
    const year = new Date(call.started).getFullYear();
    const mins = Math.round((call.duration || 0) / 60);
    if (year < 2024 || mins < 15) continue;

    const key = call._pattern;
    if (!byPattern[key]) byPattern[key] = [];
    byPattern[key].push(call);
    eligible++;
  }

  console.log(`Eligible calls (2024+, 15+ min): ${eligible}`);
  console.log('By company:');
  const sortedPatterns = Object.entries(byPattern)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [pattern, calls] of sortedPatterns) {
    console.log(`  ${pattern}: ${calls.length} calls`);
  }

  // For each company, take up to 10 most recent calls
  const selectedCalls = [];
  for (const [pattern, calls] of sortedPatterns) {
    calls.sort((a, b) => new Date(b.started) - new Date(a.started)); // newest first
    const selected = calls.slice(0, 10);
    for (const call of selected) {
      selectedCalls.push({ ...call, _company: pattern });
    }
  }

  console.log(`\nFetching extensive data for ${selectedCalls.length} selected calls...\n`);

  // Fetch in batches of 20
  const extensiveByCompany = {};

  for (let i = 0; i < selectedCalls.length; i += 20) {
    const batch = selectedCalls.slice(i, i + 20);
    const batchNum = Math.floor(i / 20) + 1;
    process.stdout.write(`  Batch ${batchNum}/${Math.ceil(selectedCalls.length / 20)}...`);

    const calls = await getExtensiveBatch(batch.map(c => c.id));

    // Map results back to companies
    for (const ext of calls) {
      const id = ext.metaData?.id;
      const matched = batch.find(c => c.id === id);
      if (!matched) continue;
      const company = matched._company;
      if (!extensiveByCompany[company]) extensiveByCompany[company] = [];
      extensiveByCompany[company].push({
        id,
        title: ext.metaData?.title || matched.title,
        date: (ext.metaData?.started || matched.started || '').substring(0, 10),
        duration: Math.round((ext.metaData?.duration || matched.duration || 0) / 60),
        brief: ext.content?.brief || '',
        keyPoints: ext.content?.keyPoints || [],
        callOutcome: ext.content?.callOutcome || '',
        topics: (ext.content?.topics || []).map(t => t.name || t),
      });
    }

    console.log(` done (${calls.length} returned)`);
    await new Promise(r => setTimeout(r, 400));
  }

  // Build synthesis report
  console.log('\n\nBuilding synthesis report...\n');

  let report = `# Gong Segment Analysis — Job/Career Fairs × Education
Generated: ${new Date().toISOString()}

**Calls analyzed:** ${selectedCalls.length} calls across ${Object.keys(extensiveByCompany).length} companies (2024+, 15+ min)

---

`;

  // Per-company summaries
  for (const [pattern, calls] of Object.entries(extensiveByCompany)) {
    calls.sort((a, b) => new Date(a.date) - new Date(b.date));
    report += `## ${pattern.toUpperCase()} (${calls.length} calls analyzed)\n\n`;

    for (const call of calls) {
      report += `### ${call.date} | ${call.title} (${call.duration} min)\n\n`;

      if (call.brief) {
        report += `**Brief:** ${call.brief}\n\n`;
      }

      if (call.keyPoints.length > 0) {
        report += `**Key Points:**\n`;
        for (const kp of call.keyPoints) {
          report += `- ${kp.text || kp}\n`;
        }
        report += '\n';
      }

      if (call.callOutcome) {
        report += `**Outcome:** ${call.callOutcome}\n\n`;
      }

      if (call.topics.length > 0) {
        report += `**Topics:** ${call.topics.join(', ')}\n\n`;
      }

      report += '---\n\n';
    }
  }

  const reportPath = path.join(SEGMENT_DIR, '_segment-analysis.md');
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Full analysis saved → _segment-analysis.md`);
  console.log(`   ${Object.keys(extensiveByCompany).length} companies, ${selectedCalls.length} calls`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
