/**
 * audit-debt-slack.js
 *
 * Fetches and parses product release messages from the vFairs Slack releases channel.
 * Outputs structured JSON to stdout for consumption by the /audit-debt skill.
 *
 * Usage: node audit-debt-slack.js [days=7]
 * Output: JSON array of parsed releases to stdout
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { WebClient } = require('@slack/web-api');

const RELEASES_CHANNEL_ID = 'C0297H29Q8Y';
const DAYS_BACK = parseInt(process.argv[2] || '7');

// Tags that definitively skip — no buyer-facing change
const SKIP_TAGS = [
  'bug fix', 'hotfix', 'config', 'config change', 'cosmetic',
  'minor bug', 'performance fix', 'security patch', 'internal'
];

// Tags that are always significant — always audit
const ALWAYS_AUDIT_TAGS = [
  'new feature', 'major enhancement', 'major feature',
  'new module', 'new integration'
];

// Everything else (e.g. "Minor Enhancement", "Modular Roadmap") — let Claude decide

function parseTags(tagString) {
  if (!tagString) return [];
  return tagString.split(',').map(t => t.trim().toLowerCase());
}

function classifySignificance(tags) {
  const normalized = parseTags(tags.join ? tags.join(', ') : tags);
  if (normalized.some(t => SKIP_TAGS.some(s => t.includes(s)))) return 'skip';
  if (normalized.some(t => ALWAYS_AUDIT_TAGS.some(a => t.includes(a)))) return 'high';
  return 'evaluate'; // Claude will decide based on KB article content
}

function parseReleaseMessage(text) {
  if (!text) return null;

  // Must contain the feature alert pattern
  if (!text.includes('New Feature Alert') && !text.includes('VFC-')) return null;

  const release = {
    jiraId: null,
    featureName: null,
    module: null,
    app: null,
    tags: [],
    tagsRaw: null,
    deploymentDate: null,
    kbArticleUrl: null,
    demoLink: null,
    limitations: null,
    significance: 'evaluate',
    rawText: text
  };

  // Extract JIRA ID and feature name: "VFC-36352: Manage Follow-up Scheduling..."
  const jiraMatch = text.match(/VFC-(\d+)[:\s]+(.+?)(?:\n|$)/);
  if (jiraMatch) {
    release.jiraId = `VFC-${jiraMatch[1]}`;
    release.featureName = jiraMatch[2].trim().replace(/[*_]/g, '');
  }

  // Extract key-value fields
  const fieldPatterns = {
    module: /Module:\s*(.+?)(?:\n|$)/i,
    app: /App:\s*(.+?)(?:\n|$)/i,
    tagsRaw: /Tags:\s*(.+?)(?:\n|$)/i,
    deploymentDate: /Deployment Date:\s*(.+?)(?:\n|$)/i,
    kbArticleUrl: /Knowledge.base Article link:\s*(https?:\/\/\S+)/i,
    demoLink: /Demo Event Link:\s*(https?:\/\/\S+)/i,
    limitations: /Limitations \(if any\):\s*(.+?)(?:\n\n|A big shoutout|$)/is,
  };

  for (const [field, pattern] of Object.entries(fieldPatterns)) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim()) {
      release[field] = match[1].trim();
    }
  }

  // Parse tags array
  if (release.tagsRaw) {
    release.tags = release.tagsRaw.split(',').map(t => t.trim());
    release.significance = classifySignificance(release.tags);
  }

  // Only return if we got at least a JIRA ID
  if (!release.jiraId) return null;

  return release;
}

async function fetchReleases() {
  const slack = new WebClient(process.env.SLACK_USER_TOKEN);

  const cutoffTs = (Date.now() / 1000) - (DAYS_BACK * 24 * 60 * 60);

  let releases = [];
  let cursor;

  try {
    do {
      const result = await slack.conversations.history({
        channel: RELEASES_CHANNEL_ID,
        oldest: cutoffTs.toString(),
        limit: 200,
        cursor
      });

      for (const msg of result.messages || []) {
        // Check message text directly
        const parsed = parseReleaseMessage(msg.text);
        if (parsed) {
          parsed.slackTs = msg.ts;
          parsed.slackPermalink = null; // Would need extra API call
          releases.push(parsed);
          continue;
        }

        // Also check rich text blocks (some Slack messages use blocks)
        if (msg.blocks) {
          const blockText = msg.blocks
            .flatMap(b => b.elements || [b])
            .flatMap(e => e.elements || [e])
            .filter(e => e.text)
            .map(e => e.text)
            .join('\n');
          const parsedBlock = parseReleaseMessage(blockText);
          if (parsedBlock) {
            parsedBlock.slackTs = msg.ts;
            releases.push(parsedBlock);
          }
        }
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

  } catch (err) {
    process.stderr.write(`Slack API error: ${err.message}\n`);
    process.exit(1);
  }

  // Sort by deployment date descending
  releases.sort((a, b) => (b.slackTs || '').localeCompare(a.slackTs || ''));

  return releases;
}

fetchReleases().then(releases => {
  process.stdout.write(JSON.stringify(releases, null, 2));
}).catch(err => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
