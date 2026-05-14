require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_USER_TOKEN);
const CAMPAIGN_TRACKER_ID = 'F09VB7V9NFR';

// Status emoji mapping
const STATUS_EMOJI = {
  'planning': '📋',
  'in_progress': '🟠',
  'launched': '🚀',
  'completed': '✅',
  'on_hold': '⏸️',
  'cancelled': '❌'
};

const STATUS_LABELS = {
  'planning': 'Planning',
  'in_progress': 'In Progress',
  'launched': 'Launched',
  'completed': 'Completed',
  'on_hold': 'On Hold',
  'cancelled': 'Cancelled'
};

function parseQuery(args) {
  const query = args.join(' ').toLowerCase();

  // Detect status filter
  let statusFilter = null;
  if (query.includes('planning') || query.includes('planned')) statusFilter = 'planning';
  else if (query.includes('in progress') || query.includes('in-progress') || query.includes('active')) statusFilter = 'in_progress';
  else if (query.includes('launched') || query.includes('live')) statusFilter = 'launched';
  else if (query.includes('completed') || query.includes('done')) statusFilter = 'completed';
  else if (query.includes('on hold') || query.includes('paused')) statusFilter = 'on_hold';
  else if (query.includes('cancelled') || query.includes('canceled')) statusFilter = 'cancelled';

  // Get keyword filter (remove status keywords)
  let keyword = query
    .replace(/planning|planned|in progress|in-progress|active|launched|live|completed|done|on hold|paused|cancelled|canceled|all/g, '')
    .trim();

  return { statusFilter, keyword };
}

function formatDate(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return '📅 Today';
  if (date.getTime() === tomorrow.getTime()) return '📅 Tomorrow';
  if (date < today) return `⚠️  ${date.toLocaleDateString()} (past)`;
  return `📅 ${date.toLocaleDateString()}`;
}

function getCampaignStatus(fields) {
  const statusField = fields?.find(f =>
    f.key === 'status' || f.key.toLowerCase().includes('status')
  );

  if (!statusField) return 'planning';

  const status = statusField.select?.[0] || statusField.value || 'planning';
  return status.toLowerCase().replace(/\s+/g, '_');
}

function getCampaignName(fields) {
  const nameField = fields?.find(f =>
    f.key === 'name' || f.key === 'campaign' || f.key === 'title' ||
    f.key === 'message' || f.key.includes('text') || f.key.includes('notes')
  );

  return nameField?.text || nameField?.value || 'Untitled Campaign';
}

function getCampaignDate(fields) {
  const dateField = fields?.find(f =>
    f.key === 'launch_date' || f.key === 'date' || f.key === 'start_date' ||
    f.key.includes('launch') || f.key.includes('date')
  );

  return dateField?.date?.[0];
}

function getCampaignOwner(fields) {
  const userField = fields?.find(f =>
    f.key === 'owner' || f.key === 'assignee' || f.key === 'lead' ||
    f.key.includes('user') || f.key.includes('owner')
  );

  const userId = userField?.user?.[0];
  if (!userId) return null;

  // Map common user IDs to names (you can expand this)
  const userMap = {
    'U011ZTN4X2R': 'Huda',
    'U014W31KQMR': 'Aatir'
    // Add more as needed
  };

  return userMap[userId] || userId;
}

function getCampaignChannel(fields) {
  const channelField = fields?.find(f =>
    f.key === 'channel' || f.key === 'type' || f.key === 'category' ||
    f.key.includes('channel') || f.key.includes('type')
  );

  return channelField?.select?.[0] || channelField?.text || channelField?.value;
}

function getCampaignBudget(fields) {
  const budgetField = fields?.find(f =>
    f.key === 'budget' || f.key.includes('budget') || f.key.includes('cost')
  );

  return budgetField?.number?.[0];
}

function getCampaignNotes(fields, nameField) {
  const notesField = fields?.find(f =>
    (f.key === 'notes' || f.key === 'description' || f.key.includes('notes')) &&
    f.key !== nameField && f.text
  );

  return notesField?.text;
}

async function queryCampaigns() {
  try {
    const args = process.argv.slice(2);
    const { statusFilter, keyword } = parseQuery(args);

    console.log('\n🎯 Fetching campaigns from Campaign Tracker...\n');

    const response = await slack.apiCall('slackLists.items.list', {
      list_id: CAMPAIGN_TRACKER_ID,
      limit: 200
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.error}`);
      if (response.error === 'missing_scope') {
        console.log('\n⚠️  Missing scope: lists:read');
      }
      return;
    }

    if (!response.items || response.items.length === 0) {
      console.log('📭 No campaigns found\n');
      return;
    }

    // Parse and filter campaigns
    let campaigns = response.items.map(item => ({
      id: item.id,
      name: getCampaignName(item.fields),
      status: getCampaignStatus(item.fields),
      date: getCampaignDate(item.fields),
      owner: getCampaignOwner(item.fields),
      channel: getCampaignChannel(item.fields),
      budget: getCampaignBudget(item.fields),
      notes: getCampaignNotes(item.fields, getCampaignName(item.fields)),
      created: item.date_created
    }));

    // Apply filters
    if (statusFilter) {
      campaigns = campaigns.filter(c => c.status === statusFilter);
    }

    if (keyword) {
      campaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        (c.owner && c.owner.toLowerCase().includes(keyword)) ||
        (c.channel && c.channel.toLowerCase().includes(keyword)) ||
        (c.notes && c.notes.toLowerCase().includes(keyword))
      );
    }

    // Group by status
    const grouped = {
      'planning': campaigns.filter(c => c.status === 'planning'),
      'in_progress': campaigns.filter(c => c.status === 'in_progress'),
      'launched': campaigns.filter(c => c.status === 'launched'),
      'completed': campaigns.filter(c => c.status === 'completed'),
      'on_hold': campaigns.filter(c => c.status === 'on_hold'),
      'cancelled': campaigns.filter(c => c.status === 'cancelled')
    };

    // Display results
    console.log(`${'='.repeat(70)}`);
    console.log(`  CAMPAIGN QUERY RESULTS`);
    if (statusFilter) console.log(`  Filter: ${STATUS_LABELS[statusFilter]}`);
    if (keyword) console.log(`  Keyword: "${keyword}"`);
    console.log(`  Total: ${campaigns.length} campaign(s)`);
    console.log(`${'='.repeat(70)}\n`);

    if (campaigns.length === 0) {
      console.log('   📭 No campaigns match your query\n');
      return;
    }

    // Display each status group
    Object.entries(grouped).forEach(([status, statusCampaigns]) => {
      if (statusCampaigns.length === 0) return;

      console.log(`${STATUS_EMOJI[status]} ${STATUS_LABELS[status].toUpperCase()} (${statusCampaigns.length})\n`);

      statusCampaigns.forEach((campaign, index) => {
        console.log(`${index + 1}. ${STATUS_EMOJI[status]} ${campaign.name}`);
        console.log(`   Status: ${STATUS_LABELS[status]}`);
        if (campaign.owner) console.log(`   Owner: ${campaign.owner}`);
        if (campaign.date) console.log(`   Launch: ${formatDate(campaign.date)}`);
        if (campaign.channel) console.log(`   Channel: ${campaign.channel}`);
        if (campaign.budget) console.log(`   Budget: $${campaign.budget.toLocaleString()}`);
        if (campaign.notes) console.log(`   Note: ${campaign.notes}`);
        console.log(`   ID: ${campaign.id}`);
        console.log('');
      });

      console.log('');
    });

    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

queryCampaigns();
