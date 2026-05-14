require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_USER_TOKEN);
const AATIR_TASKS_ID = 'F078XJDBZ0F';

async function getInProgressTasks() {
  try {
    console.log('\n📋 Fetching In Progress tasks from Aatir\'s Task Stream...\n');

    // Use correct API method from documentation
    const response = await slack.apiCall('slackLists.items.list', {
      list_id: AATIR_TASKS_ID,
      limit: 100
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.error}`);
      if (response.error === 'missing_scope') {
        console.log('\n⚠️  Missing scope: lists:read');
        console.log('Add this scope at https://api.slack.com/apps');
      }
      return;
    }

    if (!response.items || response.items.length === 0) {
      console.log('📭 No tasks found in the list\n');
      return;
    }

    console.log(`✅ Found ${response.items.length} total items\n`);

    // Filter for "in_progress" tasks
    const inProgressTasks = response.items.filter(item => {
      // Find status field
      const statusField = item.fields?.find(f =>
        f.key === 'status' ||
        f.key.toLowerCase().includes('status')
      );

      if (!statusField) return false;

      // Check if status is in_progress
      const status = statusField.select?.[0] || statusField.value;
      return status === 'in_progress' ||
             status === 'InProgress' ||
             status?.toLowerCase().includes('progress');
    });

    console.log(`🟠 IN PROGRESS TASKS (${inProgressTasks.length})\n`);
    console.log(`${'='.repeat(70)}\n`);

    if (inProgressTasks.length === 0) {
      console.log('   No tasks currently in progress\n');
      return;
    }

    inProgressTasks.forEach((task, index) => {
      // Extract task name (usually in a rich_text field)
      const nameField = task.fields?.find(f =>
        f.key === 'name' ||
        f.key === 'title' ||
        f.key.includes('text') ||
        f.key.includes('notes')
      );
      const taskName = nameField?.text || nameField?.value || 'Untitled Task';

      // Extract due date if available
      const dateField = task.fields?.find(f =>
        f.key === 'date' ||
        f.key === 'due_date' ||
        f.key.includes('date')
      );
      const dueDate = dateField?.date?.[0];

      // Extract assignee if available
      const userField = task.fields?.find(f =>
        f.key === 'owner' ||
        f.key === 'assignee' ||
        f.key.includes('user')
      );
      const assignee = userField?.user?.[0];

      // Extract description/notes
      const descField = task.fields?.find(f =>
        f.key === 'description' ||
        f.key === 'notes' ||
        (f.key !== nameField?.key && f.text)
      );
      const description = descField?.text;

      console.log(`${index + 1}. 🟠 ${taskName}`);
      console.log(`   Status: In Progress`);
      if (dueDate) {
        const date = new Date(dueDate);
        const today = new Date();
        const isOverdue = date < today;
        console.log(`   Due: ${isOverdue ? '⚠️  ' : '📅 '}${date.toLocaleDateString()}`);
      }
      if (assignee) console.log(`   Assignee: ${assignee}`);
      if (description && description !== taskName) {
        console.log(`   Note: ${description}`);
      }
      console.log(`   ID: ${task.id}`);
      console.log('');
    });

    console.log(`${'='.repeat(70)}\n`);

    // Also show all available field keys for debugging
    if (response.items.length > 0) {
      console.log('📊 Available field keys in your list:');
      const allKeys = new Set();
      response.items.forEach(item => {
        item.fields?.forEach(field => allKeys.add(field.key));
      });
      Array.from(allKeys).forEach(key => console.log(`   - ${key}`));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nDetails:', error);
  }
}

getInProgressTasks();
