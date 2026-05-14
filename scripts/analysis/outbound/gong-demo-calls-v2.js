/**
 * Gong Demo Call Puller v2
 *
 * Broader approach: scan for ANY call matching target company names,
 * look at what titles exist, then pick earliest calls (= first touches).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ACCESS_KEY    = process.env.GONG_ACCESS_KEY;
const ACCESS_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const BASE_URL      = process.env.GONG_BASE_URL || 'https://us-3499.api.gong.io';
const AUTH = 'Basic ' + Buffer.from(`${ACCESS_KEY}:${ACCESS_SECRET}`).toString('base64');
const gongClient = axios.create({ baseURL: BASE_URL, headers: { Authorization: AUTH } });

const OUT_DIR = path.join(__dirname, '../../../outputs/outbound/gong-new-customers');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Exclude keywords that mark operational (non-demo) calls
const EXCLUDE_KEYWORDS = [
  'weekly', 'bi-weekly', 'biweekly', 'monthly', 'status', 'check-in', 'check in',
  'standup', 'stand-up', 'renewal', 'upsell', 'support', 'onboarding', 'training',
  'handoff', 'hand-off', 'implementation', 'qbr', 'quarterly', 'review call',
];

// Broader target list — use short unique fragments to match company names
const SEGMENTS = {
  'Conference × Non-Profit / Association': [
    'attorneys general', 'muscular dystrophy', 'numismatic', 'oley foundation',
    'toigo', 'water works association', 'european public real estate', 'girl guides',
    'inter-parliamentary', 'ocetfo', 'pi kappa', 'stability operations',
    'conference for women', 'vela education', 'al ahsa', 'fire chiefs',
    'national association of attorneys',
  ],
  'Benefits Fair × Enterprise HR': [
    'lockton', 'bon secours', 'delta air', 'total wine', 'emirates global aluminum',
    'ariat', 'bright horizons', 'upmc', "love's travel", 'lovesbenefits',
  ],
  'Job/Career Fair × MENA + Large Employers': [
    'neom', 'hrdf', 'human resources development fund', 'abbott lab',
    'goodwill', 'health ecareers', 'cox enterprises', 'fceda',
    'hbcu connect', 'christian help foundation', 'oak ridge associated',
    'medavie', 'bab rizq',
  ],
  'Conference × Education Management': [
    'cupa', 'college and university professional', 'california collaborative',
    'education service center', 'jisc', 'michigan tech week',
    'monument innovations', 'ohio school health', 'upper canada child care',
    'canada school of public service',
  ],
  'Conference × Healthcare': [
    'medline', 'premier healthcare', "children's tumor", 'open health care',
    'mad-id', 'antimicrobial stewardship', 'practicelink', 'caring health',
    'vandalia health', 'eit health', 'ichom', 'health foundation',
    'new york city health and hospitals', 'advanced practice nurses',
    'alliance of health care unions',
  ],
};

const ALL_FRAGMENTS = Object.values(SEGMENTS).flat();

function titleMatchesAnyTarget(title) {
  const t = (title || '').toLowerCase();
  return ALL_FRAGMENTS.some(frag => t.includes(frag.toLowerCase()));
}

function isLikelyOperational(title) {
  const t = (title || '').toLowerCase();
  return EXCLUDE_KEYWORDS.some(kw => t.includes(kw));
}

function getSegment(title) {
  const t = (title || '').toLowerCase();
  for (const [seg, frags] of Object.entries(SEGMENTS)) {
    if (frags.some(f => t.includes(f.toLowerCase()))) return seg;
  }
  return 'Unknown';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scanAllCalls() {
  const matched = [];
  let cursor = null;
  let page = 0;
  let totalScanned = 0;

  console.log('Scanning Gong calls (2022+) for target company names...');

  do {
    const params = { fromDateTime: '2022-01-01T00:00:00Z', limit: 200 };
    if (cursor) params.cursor = cursor;

    const res = await gongClient.get('/v2/calls', { params });
    const calls = res.data?.calls || [];
    cursor = res.data?.records?.cursor || null;
    totalScanned += calls.length;
    page++;

    for (const call of calls) {
      if (titleMatchesAnyTarget(call.title)) {
        matched.push({
          id: call.id,
          title: call.title,
          started: call.started,
          duration: call.duration,
          isOperational: isLikelyOperational(call.title),
          segment: getSegment(call.title),
        });
      }
    }

    if (page % 25 === 0) {
      process.stdout.write(`\r  Scanned ${totalScanned.toLocaleString()} calls → ${matched.length} matches...`);
    }

    await sleep(150);
  } while (cursor);

  console.log(`\nDone. Scanned ${totalScanned.toLocaleString()} calls, matched ${matched.length}`);
  return matched;
}

async function fetchExtensive(callIds) {
  const results = [];
  for (let i = 0; i < callIds.length; i += 20) {
    const batch = callIds.slice(i, i + 20);
    try {
      const res = await gongClient.post('/v2/calls/extensive', {
        filter: { callIds: batch },
        contentSelector: {
          exposedFields: {
            parties: true,
            content: { brief: true, keyPoints: true, callOutcome: true, topics: true },
          },
        },
      });
      results.push(...(res.data?.calls || []));
    } catch (e) {
      console.error(`  Batch error: ${e.message}`);
    }
    await sleep(300);
  }
  return results;
}

async function main() {
  const allMatched = await scanAllCalls();

  // Save all matches for inspection
  fs.writeFileSync(path.join(OUT_DIR, '_all-matched-calls.json'), JSON.stringify(allMatched, null, 2));

  // Show title distribution to understand naming conventions
  console.log('\n--- Sample matched call titles (all):');
  allMatched.slice(0, 40).forEach(c => console.log(`  [${c.segment.slice(0,20)}] ${c.title} (${c.started?.slice(0,10)})`));

  if (!allMatched.length) {
    console.log('\nNo calls found. This could mean the companies are too new and not yet in Gong.');
    return;
  }

  // Separate demo-likely vs operational
  const demoCalls = allMatched.filter(c => !c.isOperational);
  const operationalCalls = allMatched.filter(c => c.isOperational);

  console.log(`\nDemocalls (non-operational): ${demoCalls.length}`);
  console.log(`Operational/status calls: ${operationalCalls.length}`);

  // Per company: take the 2 earliest non-operational calls (= first touches)
  // Group by segment + company keyword
  const byCompany = new Map();
  for (const c of demoCalls) {
    // Use a fragment as the grouping key
    const frag = ALL_FRAGMENTS.find(f => (c.title || '').toLowerCase().includes(f.toLowerCase())) || c.title;
    if (!byCompany.has(frag)) byCompany.set(frag, []);
    byCompany.get(frag).push(c);
  }

  // For each company, sort by date ASC → pick first 2
  const targetCalls = [];
  for (const [frag, calls] of byCompany.entries()) {
    calls.sort((a, b) => new Date(a.started) - new Date(b.started));
    targetCalls.push(...calls.slice(0, 2));
  }

  console.log(`\nFetching extensive data for ${targetCalls.length} first-touch calls...`);
  const callIds = targetCalls.map(c => c.id);
  const extensive = await fetchExtensive(callIds);
  const extMap = new Map(extensive.map(c => [c.metaData?.id, c]));

  // Build output
  let out = `# Gong First-Touch Call Analysis — New Customer Accounts (2024+)\n`;
  out += `**Generated:** ${new Date().toISOString().slice(0,10)}\n`;
  out += `**Total calls found:** ${allMatched.length} (${demoCalls.length} non-operational)\n\n---\n\n`;

  for (const [segName] of Object.entries(SEGMENTS)) {
    const segCalls = targetCalls.filter(c => c.segment === segName);
    if (!segCalls.length) continue;

    out += `## ${segName}\n\n`;

    for (const meta of segCalls.sort((a, b) => new Date(a.started) - new Date(b.started))) {
      const ext = extMap.get(meta.id);
      const date = meta.started?.slice(0, 10) || '?';
      const mins = Math.round((meta.duration || 0) / 60);

      out += `### ${meta.title}\n*${date} · ${mins} min*\n\n`;

      if (ext) {
        const content = ext.content || {};
        const parties = (ext.parties || []).filter(p => p.affiliation !== 'Internal');
        if (parties.length) {
          out += `**Prospect:** ${parties.map(p => `${p.name || 'Unknown'} (${p.title || 'unknown title'})`).join(', ')}\n\n`;
        }
        if (content.brief) out += `**Summary:** ${content.brief}\n\n`;
        if (content.keyPoints?.length) {
          out += `**Key Points:**\n`;
          content.keyPoints.forEach(kp => out += `- ${kp.text || kp}\n`);
          out += '\n';
        }
        if (content.callOutcome) out += `**Outcome:** ${content.callOutcome}\n\n`;
        if (content.topics?.length) out += `**Topics:** ${content.topics.map(t => t.name || t).join(', ')}\n\n`;
      } else {
        out += `*(AI summary not available for this call)*\n\n`;
      }
      out += '---\n\n';
    }
  }

  const outPath = path.join(OUT_DIR, 'demo-call-analysis.md');
  fs.writeFileSync(outPath, out);
  console.log(`\nSaved to: ${outPath}`);

  console.log('\nBreakdown by segment:');
  for (const seg of Object.keys(SEGMENTS)) {
    const n = targetCalls.filter(c => c.segment === seg).length;
    console.log(`  ${seg}: ${n} first-touch calls`);
  }
}

main().catch(console.error);
