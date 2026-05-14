require('dotenv').config();
const axios = require('axios');

// Load configuration from .env
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const MQL_LIST_ID = process.env.HUBSPOT_MQL_LIST_ID;
const MQL_LIST_NAME = process.env.HUBSPOT_MQL_LIST_NAME;

// HubSpot API configuration
const hubspotAPI = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Get contacts from a list and filter by date range
 */
async function getMQLCountByDateRange(startDate, endDate, periodLabel) {
  console.log(`\nSearching MQL list for contacts created ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}...`);

  let totalCount = 0;
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  try {
    let after = undefined;
    let hasMore = true;

    while (hasMore) {
      // Use the Lists API to get list members
      const url = `/crm/v3/lists/${MQL_LIST_ID}/memberships/join-order`;
      const params = {
        limit: 100,
        ...(after && { after })
      };

      const response = await hubspotAPI.get(url, { params });

      if (response.data.results && response.data.results.length > 0) {
        // Get contact IDs from list
        const contactIds = response.data.results.map(r => r.recordId);

        // Fetch contact details to check create date
        const batchResponse = await hubspotAPI.post('/crm/v3/objects/contacts/batch/read', {
          properties: ['createdate'],
          inputs: contactIds.map(id => ({ id }))
        });

        // Filter contacts by date range
        if (batchResponse.data.results) {
          for (const contact of batchResponse.data.results) {
            const createDate = new Date(contact.properties.createdate).getTime();
            if (createDate >= startTimestamp && createDate <= endTimestamp) {
              totalCount++;
            }
          }
        }
      }

      // Check if there are more pages
      hasMore = response.data.paging?.next?.after ? true : false;
      after = response.data.paging?.next?.after;
    }

    console.log(`${periodLabel}: ${totalCount} MQLs\n`);
    return totalCount;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Calculate percentage change
 */
function calculateChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format date range
 */
function formatDateRange(startDate, endDate) {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

/**
 * Main function
 */
async function generateMQLReport() {
  console.log('\n📊 HUBSPOT MQL REPORT');
  console.log('='.repeat(50));
  console.log(`List: ${MQL_LIST_NAME}`);
  console.log('='.repeat(50));

  try {
    // Get current date
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Calculate date ranges
    const currentYearStart = new Date(currentYear, currentMonth, 1);
    const currentYearEnd = new Date(today);
    const previousYearStart = new Date(currentYear - 1, currentMonth, 1);
    const previousYearEnd = new Date(currentYear - 1, currentMonth, today.getDate());

    console.log(`\nCurrent Period:  ${formatDateRange(currentYearStart, currentYearEnd)}`);
    console.log(`Previous Period: ${formatDateRange(previousYearStart, previousYearEnd)}`);

    // Get MQL counts for both periods
    const currentMQLs = await getMQLCountByDateRange(
      currentYearStart,
      currentYearEnd,
      `${currentYear} MTD`
    );

    const previousMQLs = await getMQLCountByDateRange(
      previousYearStart,
      previousYearEnd,
      `${currentYear - 1} Same Period`
    );

    // Calculate change
    const absoluteChange = currentMQLs - previousMQLs;
    const percentChange = calculateChange(currentMQLs, previousMQLs);

    // Display results
    console.log('📈 RESULTS:');
    console.log('-'.repeat(50));
    console.log(`${currentYear} (MTD):        ${currentMQLs} MQLs`);
    console.log(`${currentYear - 1} (Same Period): ${previousMQLs} MQLs`);
    console.log('-'.repeat(50));

    const changeSymbol = absoluteChange >= 0 ? '+' : '';
    const changeEmoji = absoluteChange >= 0 ? '✅' : '⚠️';

    console.log(`${changeEmoji} Change:          ${changeSymbol}${absoluteChange} MQLs (${changeSymbol}${percentChange.toFixed(1)}%)`);
    console.log('='.repeat(50));
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the report
generateMQLReport();
