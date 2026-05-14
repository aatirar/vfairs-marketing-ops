require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_USER_TOKEN);
const AATIR_TASKS_ID = 'F078XJDBZ0F';

// Status emoji mapping
const STATUS_EMOJI = {
  'in_progress': '🟠',
  'done': '✅',
  'not_started': '⚪',
  'blocked': '🔴',
  'delegated': '🔵',
  'follow_up': '💬'
};

const STATUS_LABELS = {
  'in_progress': 'In Progress',
  'done': 'Done',
  'not_started': 'Not Started',
  'blocked': 'Blocked',
  'delegated': 'Delegated',
  'follow_up': 'Follow Up'
};

function parseQuery(args) {
  const query = args.join(' ').toLowerCase();

  // Detect status filter
  let statusFilter = null;
  if (query.includes('in progress') || query.includes('in-progress')) statusFilter = 'in_progress';
  else if (query.includes('done') || query.includes('completed')) statusFilter = 'done';
  else if (query.includes('not started') || query.includes('pending')) statusFilter = 'not_started';
  else if (query.includes('blocked')) statusFilter = 'blocked';
  else if (query.includes('delegated')) statusFilter = 'delegated';
  else if (query.includes('follow up') || query.includes('follow-up')) statusFilter = 'follow_up';

  // Get keyword filter (remove status keywords)
  let keyword = query
    .replace(/in progress|in-progress|done|completed|not started|pending|blocked|delegated|follow up|follow-up|all/g, '')
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
  if (date < today) return `⚠️  ${date.toLocaleDateString()} (overdue)`;
  return `📅 ${date.toLocaleDateString()}`;
}

function getTaskStatus(fields) {
  const statusField = fields?.find(f =>
    f.key === 'status' || f.key.toLowerCase().includes('status')
  );

  if (!statusField) return 'not_started';

  const status = statusField.select?.[0] || statusField.value || 'not_started';
  return status.toLowerCase().replace(/\s+/g, '_');
}

function getTaskName(fields) {
  const nameField = fields?.find(f =>
    f.key === 'name' || f.key === 'message' || f.key === 'title' ||
    f.key.includes('text') || f.key.includes('notes')
  );

  return nameField?.text || nameField?.value || 'Untitled Task';
}

function getTaskDate(fields) {
  const dateField = fields?.find(f =>
    f.key === 'date' || f.key === 'due_date' || f.key.includes('date')
  );

  return dateField?.date?.[0];
}

function getTaskOwner(fields) {
  const userField = fields?.find(f =>
    f.key === 'owner' || f.key === 'assignee' || f.key.includes('user')
  );

  return userField?.user?.[0];
}

function getTaskNotes(fields, nameField) {
  const notesField = fields?.find(f =>
    (f.key === 'Col081TB97V8D' || f.key === 'notes' || f.key === 'description') &&
    f.key !== nameField
  );

  return notesField?.text;
}

async function queryTasks() {
  try {
    const args = process.argv.slice(2);
    const { statusFilter, keyword } = parseQuery(args);

    console.log('\n📋 Fetching tasks from Aatir\'s Task Stream...\n');

    const response = await slack.apiCall('slackLists.items.list', {
      list_id: AATIR_TASKS_ID,
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
      console.log('📭 No tasks found\n');
      return;
    }

    // Parse and filter tasks
    let tasks = response.items.map(item => ({
      id: item.id,
      name: getTaskName(item.fields),
      status: getTaskStatus(item.fields),
      date: getTaskDate(item.fields),
      owner: getTaskOwner(item.fields),
      notes: getTaskNotes(item.fields, getTaskName(item.fields)),
      created: item.date_created
    }));

    // Apply filters
    if (statusFilter) {
      tasks = tasks.filter(t => t.status === statusFilter);
    }

    if (keyword) {
      tasks = tasks.filter(t =>
        t.name.toLowerCase().includes(keyword) ||
        (t.notes && t.notes.toLowerCase().includes(keyword))
      );
    }

    // Group by status
    const grouped = {
      'in_progress': tasks.filter(t => t.status === 'in_progress'),
      'not_started': tasks.filter(t => t.status === 'not_started'),
      'done': tasks.filter(t => t.status === 'done'),
      'blocked': tasks.filter(t => t.status === 'blocked'),
      'delegated': tasks.filter(t => t.status === 'delegated'),
      'follow_up': tasks.filter(t => t.status === 'follow_up')
    };

    // Display results
    console.log(`${'='.repeat(70)}`);
    console.log(`  TASK QUERY RESULTS`);
    if (statusFilter) console.log(`  Filter: ${STATUS_LABELS[statusFilter]}`);
    if (keyword) console.log(`  Keyword: "${keyword}"`);
    console.log(`  Total: ${tasks.length} task(s)`);
    console.log(`${'='.repeat(70)}\n`);

    if (tasks.length === 0) {
      console.log('   📭 No tasks match your query\n');
      return;
    }

    // Display each status group
    Object.entries(grouped).forEach(([status, statusTasks]) => {
      if (statusTasks.length === 0) return;

      console.log(`${STATUS_EMOJI[status]} ${STATUS_LABELS[status].toUpperCase()} (${statusTasks.length})\n`);

      statusTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${STATUS_EMOJI[status]} ${task.name}`);
        console.log(`   Status: ${STATUS_LABELS[status]}`);
        if (task.date) console.log(`   Due: ${formatDate(task.date)}`);
        if (task.owner) console.log(`   Owner: ${task.owner}`);
        if (task.notes) console.log(`   Note: ${task.notes}`);
        console.log(`   ID: ${task.id}`);
        console.log('');
      });

      console.log('');
    });

    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

queryTasks();
