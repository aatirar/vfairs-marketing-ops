require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const DATA_DIR = path.join(__dirname, '../data');
const STATE_FILE = path.join(DATA_DIR, 'last-mql-fetch.md');
const OUTPUT_CSV = path.join(DATA_DIR, 'mqls-ytd-2026.csv');

// HubSpot API client
const hubspotAPI = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Properties to fetch (matching your CSV structure)
const PROPERTIES = [
  'email',
  'firstname',
  'lastname',
  'createdate',
  'company',
  'annualrevenue',
  'jobtitle',
  'hs_analytics_source',
  'hs_analytics_source_data_1',
  'hs_analytics_source_data_2',
  'first_conversion_event_name',
  'hs_analytics_first_url',
  'hs_analytics_last_url',
  'what_kind_of_event_are_you_planning',
  'event_mode',
  'engagements_last_meeting_booked',
  'num_associated_deals',
  'lead_validity'
];

// CSV header (matching user's export format)
const CSV_HEADER = [
  'Record ID',
  'Email',
  'First Name',
  'Last Name',
  'Create Date',
  'Company Name',
  'Job Title',
  'Annual Revenue',
  'Original Source',
  'Original Source Drill-Down 1',
  'Original Source Drill-Down 2',
  'First Conversion',
  'First Page Seen',
  'Last Page Seen',
  'What kind of event are you planning',
  'Product Type',
  'Date of last meeting booked in meetings tool',
  'Number of Associated Deals'
].join(',');

/**
 * Read last fetch timestamp from state file
 */
function getLastFetchTimestamp() {
  try {
    const content = fs.readFileSync(STATE_FILE, 'utf8');
    const match = content.match(/\*\*Last Fetch Unix Timestamp:\*\* (\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch (error) {
    console.error('❌ Error reading state file:', error.message);
  }
  // Default to Jan 1, 2026 if file not found
  return new Date('2026-01-01T00:00:00.000Z').getTime();
}

/**
 * Update state file with new timestamp
 */
function updateStateFile(timestamp, fetchCount) {
  const now = new Date(timestamp);
  const content = `# Last MQL Fetch Timestamp

**Last Fetch Date:** ${now.toISOString()}

**Last Fetch Unix Timestamp:** ${timestamp}

**Notes:**
- Initial seed data provided: hubspot-crm-exports-2026-ytd-mqls-2026-01-15.csv
- All MQLs from Jan 1 - Jan 15, 2026 are in the seed file
- Next fetch will pull MQLs created AFTER ${now.toISOString()}
- This file is auto-updated by \`fetch-mqls-incremental.js\`

---

## Fetch History

| Fetch Date | MQLs Fetched | Status |
|------------|--------------|--------|
| ${new Date().toISOString().split('T')[0]} | ${fetchCount} new MQLs | ✓ Automated |
`;

  fs.writeFileSync(STATE_FILE, content, 'utf8');
}

/**
 * Format value for CSV (escape quotes and commas)
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format date from Unix timestamp
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  // Format as YYYY-MM-DD HH:MM (matching user's CSV format)
  return date.toISOString().replace('T', ' ').substring(0, 16);
}

/**
 * Convert contact to CSV row
 */
function contactToCsvRow(contact) {
  const props = contact.properties;

  return [
    contact.id,
    escapeCsvValue(props.email),
    escapeCsvValue(props.firstname),
    escapeCsvValue(props.lastname),
    formatDate(props.createdate),
    escapeCsvValue(props.company),
    escapeCsvValue(props.jobtitle),
    escapeCsvValue(props.annualrevenue),
    escapeCsvValue(props.hs_analytics_source),
    escapeCsvValue(props.hs_analytics_source_data_1),
    escapeCsvValue(props.hs_analytics_source_data_2),
    escapeCsvValue(props.first_conversion_event_name),
    escapeCsvValue(props.hs_analytics_first_url),
    escapeCsvValue(props.hs_analytics_last_url),
    escapeCsvValue(props.what_kind_of_event_are_you_planning),
    escapeCsvValue(props.event_mode),
    formatDate(props.engagements_last_meeting_booked),
    escapeCsvValue(props.num_associated_deals || '0')
  ].join(',');
}

/**
 * Fetch MQLs from HubSpot (with pagination)
 */
async function fetchMQLsSince(sinceTimestamp) {
  const allContacts = [];
  let after = null;
  let hasMore = true;
  let pageCount = 0;

  console.log(`🔍 Fetching MQLs created after ${new Date(sinceTimestamp).toISOString()}...\n`);

  while (hasMore) {
    try {
      pageCount++;
      console.log(`   Fetching page ${pageCount}...`);

      const requestBody = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'createdate',
                operator: 'GT',
                value: sinceTimestamp.toString()
              },
              {
                propertyName: 'lead_validity',
                operator: 'EQ',
                value: 'true'
              }
            ]
          }
        ],
        properties: PROPERTIES,
        limit: 100
      };

      if (after) {
        requestBody.after = after;
      }

      const response = await hubspotAPI.post('/crm/v3/objects/contacts/search', requestBody);

      const results = response.data.results || [];
      allContacts.push(...results);

      console.log(`   ✓ Found ${results.length} contacts on page ${pageCount}`);

      // Check if there are more pages
      if (response.data.paging?.next?.after) {
        after = response.data.paging.next.after;
      } else {
        hasMore = false;
      }

    } catch (error) {
      console.error(`❌ Error fetching page ${pageCount}:`, error.response?.data || error.message);
      throw error;
    }
  }

  return allContacts;
}

/**
 * Append contacts to CSV file
 */
function appendToCSV(contacts) {
  // Check if file exists
  const fileExists = fs.existsSync(OUTPUT_CSV);

  // If file doesn't exist, create it with header
  if (!fileExists) {
    fs.writeFileSync(OUTPUT_CSV, CSV_HEADER + '\n', 'utf8');
    console.log('📄 Created new CSV file with header');
  }

  // Append contacts
  if (contacts.length > 0) {
    const rows = contacts.map(contact => contactToCsvRow(contact));
    fs.appendFileSync(OUTPUT_CSV, rows.join('\n') + '\n', 'utf8');
    console.log(`✅ Appended ${contacts.length} contacts to ${OUTPUT_CSV}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       vFAIRS MQL INCREMENTAL FETCH                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get last fetch timestamp
    const lastFetchTimestamp = getLastFetchTimestamp();
    console.log(`📅 Last fetch: ${new Date(lastFetchTimestamp).toISOString()}\n`);

    // Step 2: Fetch new MQLs
    const contacts = await fetchMQLsSince(lastFetchTimestamp);

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total new MQLs found: ${contacts.length}\n`);

    if (contacts.length === 0) {
      console.log('✓ No new MQLs since last fetch. Nothing to do.\n');
      return;
    }

    // Step 3: Append to CSV
    appendToCSV(contacts);

    // Step 4: Update state file with current timestamp
    const newTimestamp = Date.now();
    updateStateFile(newTimestamp, contacts.length);
    console.log(`✅ Updated state file with new timestamp\n`);

    // Step 5: Show sample of fetched contacts
    console.log('📋 SAMPLE OF FETCHED MQLS (first 3):');
    contacts.slice(0, 3).forEach((contact, idx) => {
      const props = contact.properties;
      console.log(`\n   ${idx + 1}. ${props.firstname} ${props.lastname}`);
      console.log(`      Email: ${props.email}`);
      console.log(`      Company: ${props.company || 'N/A'}`);
      console.log(`      Created: ${formatDate(props.createdate)}`);
    });

    console.log('\n\n🎉 Fetch completed successfully!\n');

  } catch (error) {
    console.error('\n❌ FETCH FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
main();
