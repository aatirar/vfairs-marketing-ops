require('dotenv').config();
const { WebClient } = require('@slack/web-api');

// Try both bot and user tokens
const slackBot = new WebClient(process.env.SLACK_BOT_TOKEN);
const slackUser = new WebClient(process.env.SLACK_USER_TOKEN);

// Your List IDs
const AATIR_TASKS_ID = 'F078XJDBZ0F';
const CAMPAIGN_TRACKER_ID = 'F09VB7V9NFR';

async function testListAPI(listId, listName, client, tokenType) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${listName} (${tokenType})`);
  console.log(`List ID: ${listId}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // Test the correct API method from documentation
    const response = await client.apiCall('slackLists.items.list', {
      list_id: listId,
      limit: 5  // Just get first 5 items for testing
    });

    if (!response.ok) {
      console.log(`❌ API Error: ${response.error}`);

      if (response.error === 'missing_scope') {
        console.log('\n⚠️  Missing required scope: lists:read');
        console.log('Add this scope to your Slack app and reinstall.');
      }

      return null;
    }

    console.log(`✅ Success! Found ${response.items?.length || 0} items\n`);

    // Show raw response structure
    console.log('📋 Raw API Response Structure:');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n');

    // Analyze field structure
    if (response.items && response.items.length > 0) {
      console.log('🔍 Field Analysis:\n');

      response.items.forEach((item, index) => {
        console.log(`Item ${index + 1}:`);
        console.log(`  - ID: ${item.id}`);
        console.log(`  - Created: ${new Date(item.date_created * 1000).toLocaleDateString()}`);
        console.log(`  - Number of fields: ${item.fields?.length || 0}`);

        if (item.fields && item.fields.length > 0) {
          console.log(`  - Field keys available:`);
          item.fields.forEach(field => {
            const fieldTypes = [];
            if (field.text) fieldTypes.push('text');
            if (field.rich_text) fieldTypes.push('rich_text');
            if (field.select) fieldTypes.push('select');
            if (field.date) fieldTypes.push('date');
            if (field.user) fieldTypes.push('user');
            if (field.checkbox) fieldTypes.push('checkbox');
            if (field.number) fieldTypes.push('number');

            console.log(`      • ${field.key} (${fieldTypes.join(', ') || 'value only'})`);

            // Show sample values
            if (field.text) console.log(`        → Text: "${field.text}"`);
            if (field.select) console.log(`        → Select: ${JSON.stringify(field.select)}`);
            if (field.date) console.log(`        → Date: ${JSON.stringify(field.date)}`);
            if (field.checkbox !== undefined) console.log(`        → Checkbox: ${field.checkbox}`);
          });
        }
        console.log('');
      });

      // Show metadata
      if (response.response_metadata) {
        console.log('📊 Response Metadata:');
        console.log(`  - Next cursor: ${response.response_metadata.next_cursor || '(none - no more items)'}`);
      }
    }

    return response;

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.log('Stack:', error.stack);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 SLACK LISTS API TEST\n');
  console.log('Testing with correct API method: slackLists.items.list\n');

  // Test with user token first (more likely to have lists:read scope)
  console.log('═'.repeat(70));
  console.log('TESTING WITH USER TOKEN');
  console.log('═'.repeat(70));

  await testListAPI(AATIR_TASKS_ID, "Aatir's Task Stream", slackUser, 'USER TOKEN');
  await testListAPI(CAMPAIGN_TRACKER_ID, "Campaign Tracker", slackUser, 'USER TOKEN');

  // Test with bot token
  console.log('\n═'.repeat(70));
  console.log('TESTING WITH BOT TOKEN');
  console.log('═'.repeat(70));

  await testListAPI(AATIR_TASKS_ID, "Aatir's Task Stream", slackBot, 'BOT TOKEN');
  await testListAPI(CAMPAIGN_TRACKER_ID, "Campaign Tracker", slackBot, 'BOT TOKEN');

  console.log('\n✨ Test complete!\n');
  console.log('Next steps:');
  console.log('1. Check which token type worked (user vs bot)');
  console.log('2. Review the field keys available in your lists');
  console.log('3. Update slack-tasks-reader.js to use the correct field structure\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
});
