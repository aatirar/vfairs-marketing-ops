require('dotenv').config({ path: '../.env' });
const axios = require('axios');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const hubspotAPI = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function getAllContactProperties() {
  console.log('Fetching all HubSpot contact properties...\n');

  try {
    const response = await hubspotAPI.get('/crm/v3/properties/contacts');
    const properties = response.data.results;

    console.log(`✅ Found ${properties.length} contact properties\n`);
    console.log('='.repeat(100));
    console.log('SEARCHING FOR YOUR REQUESTED PROPERTIES:\n');

    // Properties we're looking for based on user's request
    const searchTerms = [
      'email',
      'company',
      'first name',
      'firstname',
      'last name',
      'lastname',
      'job title',
      'jobtitle',
      'annual revenue',
      'annualrevenue',
      'original source',
      'source drill',
      'conversion',
      'first page',
      'last page',
      'create date',
      'createdate',
      'event',
      'product type',
      'meeting',
      'deals',
      'lead_validity',
      'lead validity'
    ];

    const matchedProperties = [];

    properties.forEach(prop => {
      const label = (prop.label || '').toLowerCase();
      const name = (prop.name || '').toLowerCase();
      const description = (prop.description || '').toLowerCase();

      const matchesSearch = searchTerms.some(term =>
        label.includes(term) || name.includes(term) || description.includes(term)
      );

      if (matchesSearch) {
        matchedProperties.push({
          name: prop.name,
          label: prop.label,
          type: prop.type,
          description: prop.description || 'No description'
        });
      }
    });

    // Sort by name for easier reading
    matchedProperties.sort((a, b) => a.name.localeCompare(b.name));

    console.log('\n📋 MATCHED PROPERTIES:\n');
    matchedProperties.forEach(prop => {
      console.log(`Property Name: ${prop.name}`);
      console.log(`Label: ${prop.label}`);
      console.log(`Type: ${prop.type}`);
      console.log(`Description: ${prop.description}`);
      console.log('-'.repeat(100));
    });

    console.log('\n\n📊 PROPERTY NAME MAPPING FOR YOUR SCRIPT:\n');
    console.log('const PROPERTY_NAMES = [');
    matchedProperties.forEach(prop => {
      console.log(`  '${prop.name}', // ${prop.label}`);
    });
    console.log('];\n');

    // Also save to a file for reference
    const fs = require('fs');
    const outputPath = '../data/hubspot-contact-properties.json';
    fs.writeFileSync(outputPath, JSON.stringify(matchedProperties, null, 2));
    console.log(`✅ Full property list saved to: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Error fetching properties:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

getAllContactProperties();
