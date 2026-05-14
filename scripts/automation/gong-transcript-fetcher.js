/**
 * Gong Transcript Fetcher
 * Fetches all calls from the past 7 days including metadata, transcripts,
 * and AI summaries. Saves one .md file per call to outputs/gong/transcripts/.
 *
 * API notes (this account — us-3499.api.gong.io):
 * - /v2/calls list returns no parties[] data (common on certain API tiers)
 * - /v2/calls/extensive returns no parties[] data either
 * - Speaker IDs in transcripts are internal Gong user IDs
 * - Internal users resolvable via /v2/users (170 vFairs users across 2 pages)
 * - External participants NOT resolvable without parties data
 * - HubSpot context on extensive calls has Account/Opportunity objects with company names
 * - Topics startTime/endTime appear to be null on this account
 */

const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

// Load credentials
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const ACCESS_KEY = (process.env.GONG_ACCESS_KEY || '').trim();
const ACCESS_KEY_SECRET = (process.env.GONG_ACCESS_KEY_SECRET || '').trim();
const BASE_URL = (process.env.GONG_BASE_URL || 'https://api.gong.io').trim();

if (!ACCESS_KEY || !ACCESS_KEY_SECRET) {
  console.error('ERROR: Missing GONG_ACCESS_KEY or GONG_ACCESS_KEY_SECRET in .env');
  process.exit(1);
}

const authToken = Buffer.from(`${ACCESS_KEY}:${ACCESS_KEY_SECRET}`).toString('base64');
const headers = {
  Authorization: `Basic ${authToken}`,
  'Content-Type': 'application/json',
};

const OUTPUT_DIR = path.resolve(__dirname, '../../outputs/gong/transcripts');
const GONG_OUTPUT_DIR = path.resolve(__dirname, '../../outputs/gong');

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet(url, params = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, { headers, params });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.errors?.[0] || err.message;
      if (status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        console.warn(`  Rate limit (429). Waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else {
        if (attempt === retries) throw new Error(`GET ${url} failed [${status}]: ${msg}`);
        await sleep(1000 * attempt);
      }
    }
  }
}

async function apiPost(url, body, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(url, body, { headers });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.errors?.[0] || err.message;
      if (status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        console.warn(`  Rate limit (429). Waiting ${wait / 1000}s...`);
        await sleep(wait);
      } else {
        if (attempt === retries) throw new Error(`POST ${url} failed [${status}]: ${msg}`);
        await sleep(1000 * attempt);
      }
    }
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sanitizeTitle(title) {
  if (!title) return 'untitled';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '');
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatTimestamp(ms) {
  if (ms === undefined || ms === null) return '';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Step 2: Date Range ─────────────────────────────────────────────────────

const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const fromDateTime = sevenDaysAgo.toISOString();
const toDateTime = now.toISOString();

console.log(`\nGong Transcript Fetcher`);
console.log(`Base URL: ${BASE_URL}`);
console.log(`Date range: ${fromDateTime.slice(0, 10)} → ${toDateTime.slice(0, 10)}\n`);

// ── Step: Fetch all vFairs users for speaker resolution ────────────────────

async function fetchAllUsers() {
  const users = [];
  let cursor;
  let page = 1;
  console.log('Fetching users for speaker resolution...');
  while (true) {
    const params = {};
    if (cursor) params.cursor = cursor;
    const data = await apiGet(`${BASE_URL}/v2/users`, params);
    const pageUsers = data.users || [];
    users.push(...pageUsers);
    cursor = data.records?.cursor;
    if (!cursor || pageUsers.length === 0) break;
    page++;
    await sleep(400);
  }
  // Build map: gong user id → "First Last (email)"
  const map = {};
  for (const u of users) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.emailAddress || u.id;
    map[u.id] = name;
  }
  console.log(`  Resolved ${users.length} vFairs users.\n`);
  return map;
}

// ── Step 3: Fetch All Calls (paginated) ────────────────────────────────────

async function fetchAllCalls() {
  const calls = [];
  let cursor;
  let page = 1;
  console.log('Fetching calls list...');
  while (true) {
    const params = { fromDateTime, toDateTime };
    if (cursor) params.cursor = cursor;
    const data = await apiGet(`${BASE_URL}/v2/calls`, params);
    const pageCalls = data.calls || [];
    calls.push(...pageCalls);
    console.log(`  Page ${page}: ${pageCalls.length} calls (total: ${calls.length})`);
    cursor = data.records?.cursor;
    if (!cursor || pageCalls.length === 0) break;
    page++;
    await sleep(400);
  }
  console.log(`Total calls found: ${calls.length}\n`);
  return calls;
}

// ── Step 4: Fetch Transcripts in Batches ───────────────────────────────────

async function fetchTranscripts(callIds) {
  const map = {};
  const batches = chunk(callIds, 200);
  console.log(`Fetching transcripts in ${batches.length} batch(es)...`);
  for (let i = 0; i < batches.length; i++) {
    console.log(`  Batch ${i + 1}/${batches.length} (${batches[i].length} calls)...`);
    try {
      const data = await apiPost(`${BASE_URL}/v2/calls/transcript`, {
        filter: { callIds: batches[i] },
      });
      for (const t of data.callTranscripts || []) {
        map[t.callId] = t.transcript || [];
      }
    } catch (err) {
      console.warn(`  WARNING: Transcript batch ${i + 1} failed: ${err.message}`);
    }
    await sleep(400);
  }
  console.log(`Transcripts available for ${Object.keys(map).length} calls.\n`);
  return map;
}

// ── Step 5: Fetch Extensive Details ────────────────────────────────────────

async function fetchExtensive(callIds) {
  const map = {};
  const batches = chunk(callIds, 200);
  console.log(`Fetching AI summaries in ${batches.length} batch(es)...`);
  for (let i = 0; i < batches.length; i++) {
    console.log(`  Batch ${i + 1}/${batches.length} (${batches[i].length} calls)...`);
    try {
      const data = await apiPost(`${BASE_URL}/v2/calls/extensive`, {
        filter: { callIds: batches[i] },
        contentSelector: {
          context: 'Extended',
          exposedFields: {
            collaboration: { publicComments: true },
            content: {
              pointsOfInterest: true,
              trackers: true,
              topics: true,
              keyPoints: true,
            },
            interaction: { questions: true, actionItems: true },
            media: false,
          },
        },
      });
      for (const c of data.calls || []) {
        map[c.metaData?.id] = c;
      }
    } catch (err) {
      console.warn(`  WARNING: Extensive batch ${i + 1} failed: ${err.message}`);
    }
    await sleep(400);
  }
  console.log(`Extensive details available for ${Object.keys(map).length} calls.\n`);
  return map;
}

// ── Extract company name from HubSpot context ──────────────────────────────

function extractCompanyFromContext(extensive) {
  if (!extensive) return null;
  const ctx = Object.values(extensive.context || {});
  for (const item of ctx) {
    if (item.system === 'HubSpot') {
      for (const obj of item.objects || []) {
        if (obj.objectType === 'Account') {
          const nameField = (obj.fields || []).find(
            (f) => f.name === 'Name' || f.name === 'name'
          );
          if (nameField?.value) return String(nameField.value);
        }
      }
    }
  }
  return null;
}

// ── Step 7: Build per-call Markdown ───────────────────────────────────────

function buildCallMarkdown(call, transcript, extensive, userMap) {
  const callId = call.id;
  const title = call.title || 'Untitled Call';
  const started = call.started ? new Date(call.started) : null;
  const dateStr = started
    ? started.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : 'N/A';
  const duration = formatDuration(call.duration);
  const direction = call.direction || 'N/A';
  const callUrl = call.url || 'N/A';

  // Primary rep resolution
  const primaryRep = call.primaryUserId
    ? userMap[call.primaryUserId] || call.primaryUserId
    : 'N/A';

  // Company from HubSpot context
  const company = extractCompanyFromContext(extensive);

  // Participant section
  const participantLines = [];
  participantLines.push(`  - **Primary Rep (vFairs):** ${primaryRep}`);
  if (company) participantLines.push(`  - **Company:** ${company}`);
  participantLines.push(
    `  - *Note: External participant names are not exposed by the Gong API on this account tier.*`
  );

  // Speaker name resolution for transcript
  // Internal users resolved via userMap; external speakers labelled "External Participant [id_short]"
  const speakerDisplayMap = {};
  const buildSpeakerDisplay = (speakerId) => {
    if (speakerDisplayMap[speakerId]) return speakerDisplayMap[speakerId];
    const name = userMap[speakerId]
      ? userMap[speakerId]
      : `External Participant`;
    speakerDisplayMap[speakerId] = name;
    return name;
  };

  // AI Summary sections
  let aiSummary = 'AI summary not available.';
  let keyPointsSection = 'No key points available.';
  let actionItemsSection = 'No action items available.';
  let topicsSection = 'No topics available.';

  if (extensive) {
    const content = extensive.content || {};
    const interaction = extensive.interaction || {};

    // Topics
    const topics = content.topics || [];
    if (topics.length > 0) {
      const topicLines = topics
        .map((t) => {
          const start = t.startTime ? ` (${formatTimestamp(t.startTime)})` : '';
          return `- ${t.name || 'Unknown topic'}${start}`;
        })
        .filter(Boolean);
      if (topicLines.length > 0) topicsSection = topicLines.join('\n');
    }

    // Key points
    const keyPoints = content.keyPoints || [];
    if (keyPoints.length > 0) {
      keyPointsSection = keyPoints
        .map((kp) => `- ${typeof kp === 'string' ? kp : kp.text || JSON.stringify(kp)}`)
        .join('\n');
      aiSummary = 'See Key Points section below.';
    }

    // Points of interest (used as summary fallback)
    const poi = content.pointsOfInterest || [];
    if (poi.length > 0 && keyPoints.length === 0) {
      aiSummary = poi
        .map((p) => `- ${typeof p === 'string' ? p : p.text || JSON.stringify(p)}`)
        .join('\n');
    }

    // Trackers
    const trackers = content.trackers || [];
    if (trackers.length > 0 && keyPoints.length === 0) {
      keyPointsSection = trackers
        .map((t) => `- **${t.name}** (${t.count || 0} mentions)`)
        .join('\n');
    }

    // Action items
    const actionItems = interaction.actionItems || [];
    if (actionItems.length > 0) {
      actionItemsSection = actionItems
        .map((a) => {
          const speaker = a.speakerId ? buildSpeakerDisplay(a.speakerId) : 'Unknown';
          const ts = a.when ? ` [${formatTimestamp(a.when)}]` : '';
          const text = typeof a === 'string' ? a : a.text || JSON.stringify(a);
          return `- ${text}${ts} — *${speaker}*`;
        })
        .join('\n');
    }
  }

  // Full transcript
  let transcriptSection = 'Transcript not available for this call.';
  if (transcript && transcript.length > 0) {
    const lines = [];
    for (const monologue of transcript) {
      const speakerName = buildSpeakerDisplay(monologue.speakerId);
      for (const sentence of monologue.sentences || []) {
        const ts =
          sentence.start !== undefined ? ` [${formatTimestamp(sentence.start)}]` : '';
        lines.push(`**${speakerName}**${ts}: ${sentence.text}`);
      }
    }
    if (lines.length > 0) transcriptSection = lines.join('\n\n');
  }

  return `# ${title}

## Metadata
- **Call ID:** ${callId}
- **Date:** ${dateStr}
- **Duration:** ${duration}
- **Direction:** ${direction}
- **Primary Rep:** ${primaryRep}
- **URL:** ${callUrl}
- **System:** ${call.system || 'N/A'}
- **Language:** ${call.language || 'N/A'}
- **Workspace ID:** ${call.workspaceId || 'N/A'}

## Participants
${participantLines.join('\n')}

## AI Summary
${aiSummary}

## Key Points
${keyPointsSection}

## Action Items
${actionItemsSection}

## Topics Discussed
${topicsSection}

## Full Transcript
${transcriptSection}
`;
}

// ── Step 8: Build Index ────────────────────────────────────────────────────

function buildIndexMarkdown(callFiles) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = callFiles.map(({ call, filename, primaryRep, company }) => {
    const started = call.started
      ? new Date(call.started).toISOString().slice(0, 10)
      : 'N/A';
    const duration = formatDuration(call.duration);
    const participant = [primaryRep, company].filter((x) => x && x !== 'N/A').join(' / ') || 'N/A';
    return `| [${call.title || 'Untitled'}](transcripts/${filename}) | ${started} | ${duration} | ${participant} |`;
  });

  return `# Gong Calls Index — ${today}

**Date range:** ${fromDateTime.slice(0, 10)} to ${toDateTime.slice(0, 10)}
**Total calls:** ${callFiles.length}
**Generated:** ${new Date().toISOString()}

| Title | Date | Duration | Rep / Company |
|-------|------|----------|---------------|
${rows.join('\n')}
`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  // Fetch users for speaker/rep resolution
  let userMap = {};
  try {
    userMap = await fetchAllUsers();
  } catch (err) {
    console.warn(`WARNING: Could not fetch users: ${err.message}. Speaker names will be IDs.`);
  }

  // Fetch calls
  let calls;
  try {
    calls = await fetchAllCalls();
  } catch (err) {
    console.error(`FATAL: Could not fetch calls: ${err.message}`);
    process.exit(1);
  }

  if (calls.length === 0) {
    const indexPath = path.join(
      GONG_OUTPUT_DIR,
      `index-${now.toISOString().slice(0, 10)}.md`
    );
    await fs.writeFile(
      indexPath,
      `# Gong Calls Index — ${now.toISOString().slice(0, 10)}\n\nNo calls found in the past 7 days.\n`,
      'utf8'
    );
    console.log(`No calls found. Index written: ${indexPath}`);
    return;
  }

  const callIds = calls.map((c) => c.id);

  // Fetch transcripts and extensive in parallel (batches already throttled internally)
  const [transcriptMap, extensiveMap] = await Promise.all([
    fetchTranscripts(callIds),
    fetchExtensive(callIds),
  ]);

  // Write per-call files
  console.log('Writing call files...');
  const callFiles = [];
  const usedFilenames = new Set();
  let missingTranscript = 0;
  let missingSummary = 0;

  for (const call of calls) {
    const callId = call.id;
    const started = call.started ? new Date(call.started) : new Date();
    const datePrefix = started.toISOString().slice(0, 10);
    const slug = sanitizeTitle(call.title);
    const extensive = extensiveMap[callId] || null;
    const transcript = transcriptMap[callId] || null;

    if (!transcript) missingTranscript++;
    if (!extensive) missingSummary++;

    // De-duplicate filenames: append -2, -3, etc. if collision
    let filename = `${datePrefix}-${slug}.md`;
    if (usedFilenames.has(filename)) {
      let counter = 2;
      while (usedFilenames.has(`${datePrefix}-${slug}-${counter}.md`)) counter++;
      filename = `${datePrefix}-${slug}-${counter}.md`;
    }
    usedFilenames.add(filename);

    const primaryRep = call.primaryUserId
      ? userMap[call.primaryUserId] || call.primaryUserId
      : 'N/A';
    const company = extractCompanyFromContext(extensive);

    const markdown = buildCallMarkdown(call, transcript, extensive, userMap);
    await fs.writeFile(path.join(OUTPUT_DIR, filename), markdown, 'utf8');
    console.log(`  Written: ${filename}`);

    callFiles.push({ call, filename, primaryRep, company });
  }

  // Write index
  const indexFilename = `index-${now.toISOString().slice(0, 10)}.md`;
  const indexPath = path.join(GONG_OUTPUT_DIR, indexFilename);
  await fs.writeFile(indexPath, buildIndexMarkdown(callFiles), 'utf8');
  console.log(`\nIndex written: ${indexPath}`);

  // Final report
  const fileCount = (await fs.readdir(OUTPUT_DIR)).length;
  console.log('\n─── RESULTS ─────────────────────────────');
  console.log(`Total calls fetched:      ${calls.length}`);
  console.log(`Date range:               ${fromDateTime.slice(0, 10)} to ${toDateTime.slice(0, 10)}`);
  console.log(`Files written:            ${callFiles.length}`);
  console.log(`Files on disk:            ${fileCount}`);
  console.log(`Missing transcripts:      ${missingTranscript} (voicemails / short calls)`);
  console.log(`Missing AI summaries:     ${missingSummary} (calls < 2 min or no AI tier)`);
  console.log(`vFairs users resolved:    ${Object.keys(userMap).length}`);
  console.log(`Output directory:         ${OUTPUT_DIR}`);
  console.log(`Index file:               ${indexPath}`);
  console.log('─────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('Unhandled error:', err.message);
  process.exit(1);
});
