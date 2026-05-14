/**
 * Gong Segment Research — Job/Career Fairs × Educational Institutions
 *
 * Two-phase approach to avoid paginating all 7,100+ calls:
 * Phase 1: GET /v2/calls (lightweight) — scan all call titles for company name matches
 * Phase 2: POST /v2/calls/extensive with specific callIds — get AI summaries
 * Phase 3: GET /v2/calls/{id}/transcript — download transcript for earliest call per company
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.GONG_BASE_URL || 'https://us-3499.api.gong.io';
const ACCESS_KEY = process.env.GONG_ACCESS_KEY;
const ACCESS_SECRET = process.env.GONG_ACCESS_KEY_SECRET;
const AUTH = Buffer.from(`${ACCESS_KEY}:${ACCESS_SECRET}`).toString('base64');
const OUT_DIR = path.join(__dirname, '../../../outputs/outbound/gong-segment');

fs.mkdirSync(OUT_DIR, { recursive: true });

// Target companies — top job/career fair × education customers
const TARGET_PATTERNS = [
  'tulare',
  'tcoe',
  'university of maryland global',
  'umgc',
  'women in cybersecurity',
  'wicys',
  'bocconi',
  'abbott',
  'national urban league',
  'federal aviation',
  'faa',
  'inroads',
  'junior achievement',
  'bell canada',
  'jvs toronto',
  'ncwit',
  'information and communications technology council',
  'graduate career consortium',
  'health ecareers',
  'diversity in ed',
  'university of ottawa',
  'career communications group',
  'goodwill',
];

function matchesTarget(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return TARGET_PATTERNS.some(p => lower.includes(p));
}

function matchedPattern(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  return TARGET_PATTERNS.find(p => lower.includes(p)) || null;
}

async function gongGet(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Basic ${AUTH}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Gong GET ${endpoint} → ${res.status}: ${await res.text()}`);
  return res.json();
}

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

/**
 * Phase 1: Lightweight scan — GET /v2/calls returns basic metadata (id, title, started, duration)
 * Much faster than /v2/calls/extensive since it doesn't fetch parties or content.
 */
async function scanCallTitles() {
  console.log('Phase 1: Scanning call titles (lightweight)...');
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 30); // 30 months back

  let cursor = null;
  const matched = [];
  let totalScanned = 0;

  do {
    const params = {
      fromDateTime: fromDate.toISOString(),
      toDateTime: new Date().toISOString(),
    };
    if (cursor) params.cursor = cursor;

    const data = await gongGet('/v2/calls', params);
    const calls = data.calls || [];
    totalScanned += calls.length;

    for (const call of calls) {
      const title = call.title || '';
      if (matchesTarget(title)) {
        matched.push({
          id: call.id,
          title,
          started: call.started,
          duration: call.duration,
          _pattern: matchedPattern(title),
        });
      }
    }

    cursor = data.records?.cursor || null;
    process.stdout.write(`\r  Scanned ${totalScanned} calls, ${matched.length} matched (cursor: ${cursor ? 'more' : 'done'})   `);

    if (calls.length === 0) break;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  } while (cursor);

  console.log(`\n  Done. ${totalScanned} total calls scanned, ${matched.length} matched target companies.`);
  return matched;
}

/**
 * Phase 2: For a batch of call IDs, fetch extensive data (AI summary, parties)
 */
async function getExtensive(callIds) {
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

/**
 * Phase 3: Fetch transcript for a single call
 */
async function getTranscript(callId) {
  try {
    const data = await gongGet(`/v2/calls/${callId}/transcript`);
    return data.transcript || [];
  } catch (e) {
    console.warn(`  Could not fetch transcript for ${callId}: ${e.message}`);
    return [];
  }
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
}

function formatTranscript(transcript) {
  if (!transcript || transcript.length === 0) return 'No transcript available.';
  return transcript.map(seg => {
    const time = Math.floor((seg.startTime || 0) / 1000);
    const mins = String(Math.floor(time / 60)).padStart(2, '0');
    const secs = String(time % 60).padStart(2, '0');
    const speaker = seg.speakerId ? `Speaker ${seg.speakerId}` : 'Unknown';
    const sentences = (seg.sentences || []).map(s => s.text).join(' ');
    return `[${mins}:${secs}] ${speaker}: ${sentences}`;
  }).join('\n');
}

function extractCompany(call) {
  const parties = call.parties || [];
  for (const p of parties) {
    if (p.affiliation !== 'Internal' && p.organization) return p.organization;
  }
  return call.metaData?.title || '';
}

async function run() {
  console.log('=== Gong Segment Research: Job/Career Fairs × Education ===\n');

  // Phase 1: Lightweight title scan
  const titleMatches = await scanCallTitles();

  if (titleMatches.length === 0) {
    console.log('\nNo calls matched target company names in titles. Exiting.');
    return;
  }

  // Save the raw match list for debugging
  fs.writeFileSync(
    path.join(OUT_DIR, '_matched-call-list.json'),
    JSON.stringify(titleMatches, null, 2)
  );
  console.log(`\n  Saved matched call list → _matched-call-list.json`);

  // Group by pattern (company) and sort by date
  const byPattern = {};
  for (const call of titleMatches) {
    const key = call._pattern;
    if (!byPattern[key]) byPattern[key] = [];
    byPattern[key].push(call);
  }

  console.log('\nMatched companies:');
  for (const [pattern, calls] of Object.entries(byPattern)) {
    calls.sort((a, b) => new Date(a.started) - new Date(b.started));
    console.log(`  ${pattern}: ${calls.length} call(s), earliest: ${calls[0].started?.substring(0, 10)} "${calls[0].title}"`);
  }

  // Phase 2: Fetch extensive data for all matched calls (in batches of 20)
  console.log('\n\nPhase 2: Fetching extensive data for matched calls...');
  const allIds = titleMatches.map(c => c.id);
  const extensiveMap = {};

  for (let i = 0; i < allIds.length; i += 20) {
    const batch = allIds.slice(i, i + 20);
    console.log(`  Batch ${Math.floor(i / 20) + 1}: ${batch.length} calls`);
    const calls = await getExtensive(batch);
    for (const call of calls) {
      extensiveMap[call.metaData?.id] = call;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  // Phase 3: For each company, pick earliest call and download transcript
  console.log('\n\nPhase 3: Downloading transcripts for earliest call per company...');
  const index = [];

  for (const [pattern, calls] of Object.entries(byPattern)) {
    // calls are already sorted ascending by date
    const earliest = calls[0];
    const callId = earliest.id;
    const extensive = extensiveMap[callId];
    const allCallsExtensive = calls.map(c => extensiveMap[c.id]).filter(Boolean);

    const company = (extensive && extractCompany(extensive)) || pattern;
    const date = (earliest.started || '').substring(0, 10);
    const title = earliest.title || 'untitled';
    const duration = Math.round((earliest.duration || 0) / 60);

    console.log(`\n  ${company} (${pattern})`);
    console.log(`    First call: "${title}" (${date}, ${duration} min, ID: ${callId})`);

    const aiContent = extensive?.content || {};

    console.log(`    Fetching transcript...`);
    const transcript = await getTranscript(callId);
    console.log(`    Transcript: ${transcript.length} segments`);

    // Build all-calls list
    const allCallsList = calls.map(c => {
      const ext = extensiveMap[c.id];
      const dur = Math.round((c.duration || 0) / 60);
      const outcome = ext?.content?.callOutcome || '';
      return `- ${(c.started || '').substring(0, 10)} | ${c.title} (${dur} min)${outcome ? ' — ' + outcome : ''}`;
    }).join('\n');

    const md = `# ${company} — First Call Analysis

## Company Profile
- **Matched Pattern:** ${pattern}
- **Total Calls in Gong:** ${calls.length}
- **First Call Date:** ${date}
- **First Call Duration:** ${duration} minutes
- **Call Title:** ${title}
- **Call ID:** ${callId}

## All Calls on Record
${allCallsList}

## AI Summary of First Call

### Key Points
${(aiContent.keyPoints || []).map(p => `- ${p.text || p}`).join('\n') || 'Not available'}

### Brief
${aiContent.brief || 'Not available'}

### Call Outcome
${aiContent.callOutcome || 'Not available'}

### Topics Discussed
${(aiContent.topics || []).map(t => `- ${t.name || t}`).join('\n') || 'Not available'}

---

## Full Transcript (First Call)

${formatTranscript(transcript)}
`;

    const slug = `${date}-${slugify(company || pattern)}`;
    const filePath = path.join(OUT_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, md);
    console.log(`    ✅ Saved → ${path.basename(filePath)}`);

    index.push({ company, pattern, date, title, duration, callCount: calls.length, transcriptSegments: transcript.length, file: path.basename(filePath) });

    await new Promise(r => setTimeout(r, 500));
  }

  // Write index
  const indexMd = `# Gong Segment Research Index — Job/Career Fairs × Education
Generated: ${new Date().toISOString()}

| Company | Pattern | First Call | Duration | Total Calls | Transcript | File |
|---|---|---|---|---|---|---|
${index.map(r => `| ${r.company} | ${r.pattern} | ${r.date} | ${r.duration} min | ${r.callCount} | ${r.transcriptSegments} segs | [${r.file}](${r.file}) |`).join('\n')}
`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.md'), indexMd);
  console.log(`\n✅ Index saved → index.md`);
  console.log(`\nDone. ${index.length} companies processed.`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
