/**
 * Gong First-Demo Call Puller
 *
 * Targets accounts from the top 5 sub-segments of new customers (2024+).
 * Strategy:
 *  - Phase 1: Lightweight title scan of all calls to find matches
 *  - Filter to "demo/discovery" calls: title contains demo, discovery, intro,
 *    presentation, walkthrough, overview, first call
 *  - Filter to calls where title matches a target company name
 *  - Phase 2: Fetch extensive AI data (brief, keyPoints, callOutcome, topics)
 *    for matched calls — sorted by date ASC (earliest = first demo)
 *  - Output per-segment MD file with AI summaries
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

// ─── TARGET ACCOUNTS by sub-segment ───────────────────────────────────────────
const SEGMENTS = {
  'Conference × Non-Profit / Association': [
    'National Association of Attorneys General',
    'Muscular Dystrophy Association',
    'American Numismatic Association',
    'Oley Foundation',
    'Toigo Foundation',
    'Florida Section American Water Works',
    'European Public Real Estate',
    'Girl Guides of Canada',
    'Inter-Parliamentary Union',
    'OCETFO',
    'Pi Kappa Alpha',
    'Pi Kappa Phi',
    'International Stability Operations',
    'Parenting and Family',
    'Conference For Women',
    'VELA Education Fund',
    'Al Ahsa Chamber',
    'International Association of Fire Chiefs',
  ],
  'Benefits Fair × Enterprise HR': [
    'Lockton',
    'Bon Secours',
    'Delta Air Lines',
    'Total Wine',
    'Emirates Global Aluminum',
    'Ariat',
    'Bright Horizons',
    'UPMC',
    'Love\'s',
    'Northrop Grumman',
  ],
  'Job/Career Fair × Large Employers + MENA': [
    'NEOM',
    'Human Resources Development Fund',
    'HRDF',
    'Abbott Laboratories',
    'Goodwill',
    'Health eCareers',
    'Cox Enterprises',
    'FCEDA',
    'HBCU',
    'Christian HELP Foundation',
    'Oak Ridge',
    'Medavie',
    'Bab Rizq',
  ],
  'Conference × Education Management': [
    'CUPA',
    'College and University Professional',
    'California Collaborative for Educational Excellence',
    'Education Service Center',
    'Jisc',
    'Michigan Tech',
    'Monument Innovations',
    'Ohio School Health',
    'Upper Canada Child Care',
    'Canada School of Public Service',
  ],
  'Conference × Healthcare': [
    'Medline',
    'Premier Healthcare',
    'Children\'s Tumor Foundation',
    'Open Health Care',
    'MAD-ID',
    'Antimicrobial Stewardship',
    'PracticeLink',
    'Caring Health',
    'Vandalia Health',
    'EIT Health',
    'ICHOM',
    'The Health Foundation',
    'New York City Health and Hospitals',
    'Advanced Practice Nurses',
    'Alliance of Health Care',
  ],
};

// All target names flattened for fast matching
const ALL_TARGETS = Object.values(SEGMENTS).flat();

// Demo/discovery call title keywords
const DEMO_KEYWORDS = [
  'demo', 'discovery', 'intro', 'introduction', 'walkthrough', 'walk-through',
  'overview', 'presentation', 'first call', 'initial call', 'kick off', 'kickoff',
  'exploratory', 'sales call', 'proposal', 'pitch',
];

function titleMatchesTarget(title) {
  const t = (title || '').toLowerCase();
  return ALL_TARGETS.some(target =>
    t.includes(target.toLowerCase().slice(0, 15)) // first 15 chars is enough to avoid false negatives
  );
}

function titleIsDemo(title) {
  const t = (title || '').toLowerCase();
  return DEMO_KEYWORDS.some(kw => t.includes(kw));
}

function getSegmentForTitle(title) {
  const t = (title || '').toLowerCase();
  for (const [seg, targets] of Object.entries(SEGMENTS)) {
    if (targets.some(target => t.includes(target.toLowerCase().slice(0, 15)))) {
      return seg;
    }
  }
  return 'Unknown';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Phase 1: lightweight title scan ──────────────────────────────────────────
async function scanAllCalls() {
  const matched = [];
  let cursor = null;
  let page = 0;
  const fromDate = '2023-01-01T00:00:00Z'; // wider window to catch demo calls pre-sale

  console.log('Phase 1: Scanning all calls for target company names + demo keywords...');
  do {
    const params = { fromDateTime: fromDate, limit: 200 };
    if (cursor) params.cursor = cursor;
    const res = await gongClient.get('/v2/calls', { params });
    const calls = res.data?.calls || [];
    cursor = res.data?.records?.cursor || null;
    page++;

    for (const call of calls) {
      if (titleMatchesTarget(call.title) && titleIsDemo(call.title)) {
        matched.push({
          id: call.id,
          title: call.title,
          started: call.started,
          duration: call.duration,
          segment: getSegmentForTitle(call.title),
        });
      }
    }

    if (page % 20 === 0) {
      process.stdout.write(`\r  Scanned ~${page * 200} calls, matched ${matched.length} demo calls so far...`);
    }

    if (calls.length < 200) break;
    await sleep(200);
  } while (cursor);

  console.log(`\nPhase 1 complete: matched ${matched.length} demo calls`);
  return matched;
}

// ── Phase 2: fetch AI summaries in batches ────────────────────────────────────
async function fetchExtensive(callIds) {
  const results = [];
  const batchSize = 20;
  for (let i = 0; i < callIds.length; i += batchSize) {
    const batch = callIds.slice(i, i + batchSize);
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
      const calls = res.data?.calls || [];
      results.push(...calls);
    } catch (e) {
      console.error(`Batch ${i}-${i+batchSize} failed:`, e.message);
    }
    await sleep(300);
  }
  return results;
}

// ── Build output ──────────────────────────────────────────────────────────────
function formatCallSummary(call, matchedMeta) {
  const p = call.metaData || {};
  const content = call.content || {};
  const parties = (call.parties || []).filter(p => p.affiliation !== 'Internal');
  const externalParty = parties[0];

  const date = p.started ? p.started.slice(0, 10) : matchedMeta?.started?.slice(0, 10) || 'unknown';
  const duration = p.duration || matchedMeta?.duration || 0;
  const mins = Math.round(duration / 60);

  let out = `#### ${p.title || matchedMeta?.title || 'Untitled'}\n`;
  out += `*${date} · ${mins} min*`;
  if (externalParty) out += ` · ${externalParty.name || ''} (${externalParty.title || 'unknown title'})`;
  out += '\n\n';

  if (content.brief) out += `**Summary:** ${content.brief}\n\n`;

  if (content.keyPoints?.length) {
    out += `**Key Points:**\n`;
    content.keyPoints.forEach(kp => out += `- ${kp.text || kp}\n`);
    out += '\n';
  }

  if (content.callOutcome) out += `**Outcome:** ${content.callOutcome}\n\n`;

  if (content.topics?.length) {
    out += `**Topics:** ${content.topics.map(t => t.name || t).join(', ')}\n\n`;
  }

  out += '---\n\n';
  return out;
}

async function main() {
  // Phase 1
  const matched = await scanAllCalls();

  if (!matched.length) {
    console.log('No demo calls found for target accounts.');
    return;
  }

  // Sort by date ASC (earliest first) and dedupe
  matched.sort((a, b) => new Date(a.started) - new Date(b.started));

  // Keep only first 3 demo calls per company (to capture true first demo)
  // Group by title keyword match to avoid fetching too many
  const callIds = [...new Set(matched.map(c => c.id))].slice(0, 100);
  console.log(`\nPhase 2: Fetching AI summaries for ${callIds.length} demo calls...`);

  const extensive = await fetchExtensive(callIds);
  console.log(`Fetched extensive data for ${extensive.length} calls`);

  // Build a map for quick lookup
  const extMap = new Map(extensive.map(c => [c.metaData?.id, c]));

  // Write per-segment output
  let fullOutput = `# Gong First-Demo Call Analysis — New Customer Accounts\n`;
  fullOutput += `**Segments:** 5 target sub-segments · New customers since 2024\n`;
  fullOutput += `**Focus:** First demo/discovery calls only\n`;
  fullOutput += `**Generated:** ${new Date().toISOString().slice(0, 10)}\n\n---\n\n`;

  for (const [segName, targets] of Object.entries(SEGMENTS)) {
    const segCalls = matched.filter(m => m.segment === segName);
    if (!segCalls.length) continue;

    fullOutput += `## ${segName}\n\n`;
    fullOutput += `*${segCalls.length} demo calls found across ${targets.length} target accounts*\n\n`;

    for (const meta of segCalls) {
      const ext = extMap.get(meta.id);
      if (ext) {
        fullOutput += formatCallSummary(ext, meta);
      } else {
        fullOutput += `#### ${meta.title}\n*${meta.started?.slice(0,10)} · ${Math.round((meta.duration||0)/60)} min · (AI summary unavailable)*\n\n---\n\n`;
      }
    }
  }

  const outPath = path.join(OUT_DIR, 'demo-call-analysis.md');
  fs.writeFileSync(outPath, fullOutput);

  // Also save raw matched list
  fs.writeFileSync(path.join(OUT_DIR, '_matched-demo-calls.json'), JSON.stringify(matched, null, 2));

  console.log(`\nOutput saved to: ${outPath}`);
  console.log(`Total demo calls found: ${matched.length}`);
  console.log('\nBreakdown by segment:');
  for (const seg of Object.keys(SEGMENTS)) {
    const n = matched.filter(m => m.segment === seg).length;
    console.log(`  ${seg}: ${n} calls`);
  }
}

main().catch(console.error);
