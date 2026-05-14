require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_USER_TOKEN);

// List IDs from Slack URLs
const AATIR_TASKS_ID = 'F078XJDBZ0F';
const CAMPAIGN_TRACKER_ID = 'F09VB7V9NFR';

// Status emoji mapping
const STATUS_EMOJI = {
  'not_started': '⚪',
  'in_progress': '🟠',
  'done': '✅',
  'blocked': '🔴',
  'Opt4U3H9UVI': '🔵', // Delegated
  'OptXXQRKDMJ': '💬'  // Follow up
};

async function fetchListContent(fileId, listName) {
  try {
    // Try to get list items using the Lists API
    try {
      const itemsResponse = await slack.apiCall('lists.items.list', {
        list_id: fileId,
        limit: 100
      });

      if (itemsResponse.ok && itemsResponse.items) {
        return { name: listName, items: itemsResponse.items };
      }
    } catch (apiError) {
      console.log(`   ℹ️  Lists API not available, trying file method...`);
    }

    // Fallback: Get file info
    const fileInfo = await slack.files.info({ file: fileId });

    if (!fileInfo.ok) {
      console.log(`❌ Error fetching ${listName}: ${fileInfo.error}`);
      return null;
    }

    const file = fileInfo.file;

    // If the file has a URL to download content, fetch it
    if (file.url_private) {
      const response = await fetch(file.url_private, {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_USER_TOKEN}`
        }
      });

      const content = await response.text();
      const listData = JSON.parse(content);
      return { name: listName, data: listData };
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching ${listName}:`, error.message);
    return null;
  }
}

function formatDate(timestamp) {
  if (!timestamp) return 'No date';
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return '📅 Today';
  if (date.toDateString() === tomorrow.toDateString()) return '📅 Tomorrow';
  if (date < today) return `⚠️  ${date.toLocaleDateString()} (overdue)`;
  return `📅 ${date.toLocaleDateString()}`;
}

function displayListTasks(listResult) {
  if (!listResult) return;

  const { name } = listResult;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${name.toUpperCase()}`);
  console.log(`${'='.repeat(70)}\n`);

  // Handle items from Lists API
  if (listResult.items) {
    const rows = listResult.items;

    if (rows.length === 0) {
      console.log('   📭 No tasks found\n');
      return;
    }

    displayRows(rows);
    return;
  }

  // Handle data from file download (fallback)
  if (!listResult.data) {
    console.log('   ⚠️  No data available\n');
    return;
  }

  const { data } = listResult;
  const metadata = data.list_metadata;

  if (!metadata) {
    console.log('   ⚠️  No list metadata found\n');
    return;
  }

  // Get rows from the first view
  const firstView = metadata.views?.[0];
  const rows = firstView?.rows || [];

  if (rows.length === 0) {
    console.log('   📭 No tasks found\n');
    return;
  }

  displayRows(rows);
}

function displayRows(rows) {
  // Handle both API items format and file data format
  const activeTasks = rows.filter(row => {
    // For API items
    if (row.completed !== undefined) return !row.completed;
    // For file data
    const status = row.cells?.status?.select?.[0] || row.cells?.todo_completed?.todo_completed?.[0] || 'not_started';
    return status !== 'done' && status !== true;
  });

  const completedTasks = rows.filter(row => {
    // For API items
    if (row.completed !== undefined) return row.completed;
    // For file data
    const status = row.cells?.status?.select?.[0] || row.cells?.todo_completed?.todo_completed?.[0] || 'not_started';
    return status === 'done' || status === true;
  });

  // Display active tasks
  console.log(`   📌 ACTIVE TASKS (${activeTasks.length})\n`);

  activeTasks.forEach((row, index) => {
    // Handle both formats
    const taskName = row.name || row.cells?.name?.text || 'Untitled task';
    const status = row.cells?.status?.select?.[0] || 'not_started';
    const dueDate = row.due_date || row.cells?.date?.date?.start;
    const description = row.description || row.cells?.Col081TB97V8D?.text;

    const statusEmoji = STATUS_EMOJI[status] || '⚪';
    const statusLabel = status.replace('_', ' ').replace('Opt4U3H9UVI', 'Delegated').replace('OptXXQRKDMJ', 'Follow up');

    console.log(`   ${index + 1}. ${statusEmoji} ${taskName}`);
    console.log(`      Status: ${statusLabel}`);
    if (dueDate) console.log(`      Due: ${formatDate(dueDate)}`);
    if (description) console.log(`      Note: ${description}`);
    console.log('');
  });

  // Show completed count
  if (completedTasks.length > 0) {
    console.log(`   ✅ ${completedTasks.length} task(s) completed\n`);
  }
}

async function displayTasks() {
  console.log('\n📋 Fetching your Slack tasks...\n');

  // Fetch both lists
  const [aatirTasks, campaignTracker] = await Promise.all([
    fetchListContent(AATIR_TASKS_ID, "Aatir's Task Stream"),
    fetchListContent(CAMPAIGN_TRACKER_ID, "Campaign Tracker")
  ]);

  // Display both lists
  displayListTasks(aatirTasks);
  displayListTasks(campaignTracker);

  console.log(`${'='.repeat(70)}`);
  console.log('✨ Task fetch complete!\n');
}

displayTasks().catch(error => {
  console.error('❌ Fatal error:', error.message);

  if (error.message.includes('missing_scope')) {
    console.log('\n⚠️  Missing Slack permissions. Required scopes:');
    console.log('   - files:read');
    console.log('   - users:read');
  }
});
