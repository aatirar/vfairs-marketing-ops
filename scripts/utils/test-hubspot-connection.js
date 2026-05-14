require('dotenv').config();
const axios = require('axios');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const MQL_LIST_ID = process.env.HUBSPOT_MQL_LIST_ID;

const hubspotAPI = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testConnection() {
  console.log('Testing HubSpot connection...\n');
  console.log(`Access Token: ${HUBSPOT_TOKEN.substring(0, 20)}...`);
  console.log(`List ID: ${MQL_LIST_ID}\n`);

  try {
    // Test 1: Get list details
    console.log('Test 1: Fetching list details...');
    const listResponse = await hubspotAPI.get(`/crm/v3/lists/${MQL_LIST_ID}`);
    console.log(`✅ List found: ${listResponse.data.name}`);
    console.log(`   Processing Type: ${listResponse.data.processingType}`);
    console.log(`   List Size: ${listResponse.data.listSize || 'N/A'}\n`);

    // Test 2: Get first page of list members
    console.log('Test 2: Fetching list memberships (first page)...');
    const membersResponse = await hubspotAPI.get(`/crm/v3/lists/${MQL_LIST_ID}/memberships`, {
      params: { limit: 5 }
    });
    console.log(`✅ Found ${membersResponse.data.results.length} members on first page`);

    if (membersResponse.data.results.length > 0) {
      const firstMemberId = membersResponse.data.results[0].recordId;
      console.log(`   First member ID: ${firstMemberId}\n`);

      // Test 3: Get contact details
      console.log('Test 3: Fetching contact details...');
      const contactResponse = await hubspotAPI.get(`/crm/v3/objects/contacts/${firstMemberId}`, {
        params: { properties: 'createdate,email' }
      });
      console.log(`✅ Contact retrieved:`);
      console.log(`   Email: ${contactResponse.data.properties.email || 'N/A'}`);
      console.log(`   Created: ${new Date(contactResponse.data.properties.createdate).toLocaleDateString()}\n`);
    }

    console.log('🎉 All tests passed! HubSpot connection is working.\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testConnection();
