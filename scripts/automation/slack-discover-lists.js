require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function discoverLists() {
  try {
    console.log('🔍 Discovering all Slack Lists in your workspace...\n');

    // Try to call the lists API using apiCall method
    const result = await slack.apiCall('lists.list');

    if (!result.ok) {
      console.log(`❌ API Error: ${result.error}`);

      if (result.error === 'missing_scope') {
        console.log('\n⚠️  Your Slack app is missing required permissions.');
        console.log('Go to https://api.slack.com/apps and add these scopes:');
        console.log('   - lists:read');
        console.log('   - users:read');
        console.log('Then reinstall the app to your workspace.');
      }
      return;
    }

    if (!result.lists || result.lists.length === 0) {
      console.log('❌ No lists found.');
      console.log('\nℹ️  If you\'re using Slack Lists, they might be in specific channels.');
      console.log('Let me also check for channels...\n');

      // Try to list channels as a fallback
      const channels = await slack.conversations.list();
      console.log('Channels in workspace:');
      channels.channels.slice(0, 10).forEach(channel => {
        console.log(`   - ${channel.name} (${channel.id})`);
      });

      return;
    }

    console.log(`✅ Found ${result.lists.length} list(s):\n`);

    result.lists.forEach((list, index) => {
      console.log(`${index + 1}. ${list.name}`);
      console.log(`   ID: ${list.id}`);
      console.log(`   Channel: ${list.channel_id || 'N/A'}`);
      console.log(`   Items: ${list.item_count || 0}`);
      console.log(`   Created: ${new Date(list.date_created * 1000).toLocaleDateString()}`);
      console.log('');
    });

    console.log('📋 Next step: Identify which lists are:');
    console.log('   1. Your personal vFairs tasks');
    console.log('   2. Marketing team campaign tracker');
    console.log('\nCopy the list IDs and we\'ll use them in the main reader script.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Slack Lists might require different API access.');
    console.log('Let me know:');
    console.log('   1. Are your lists in specific Slack channels?');
    console.log('   2. Can you share a screenshot of where you see these lists in Slack?');
  }
}

discoverLists();
