/**
 * Whale Finder
 * Scans MQL data from Google Sheets and HubSpot to identify new whale prospects
 */

const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const whaleUtils = require('./whale-utils');

// Configuration
const CREDENTIALS_PATH = path.join(__dirname, '../../../.config/google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';
const WHALE_TRACKER_PATH = path.join(__dirname, '../../../data/whale-tracker.json');
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Google Sheets column mapping
const COLUMNS = {
  YEAR: 0,
  MONTH: 1,
  DATE: 2,
  ORIGINAL_SOURCE: 3,
  SOURCE_DRILL_1: 4,
  SOURCE_DRILL_2: 5,
  LEAD_STATUS: 6,
  GEOGRAPHY: 7,
  EVENT_PLANNING: 8,
  EVENT_TYPE: 9,
  INDUSTRY: 10,
  ICP_SCORE: 11,
  MEETING_BOOKED: 12,
  FIRST_MEETING_DATE: 13,
  CONTACT_VID: 14,
  IP_CITY: 15,
  FIRST_PAGE: 16,
  COMPANY: 17,
  ANNUAL_REVENUE: 18,
  FIRST_NAME: 19,
  LAST_NAME: 20,
  EMAIL: 21,
  OWNER_NAME: 22,
  COMPANY_DOMAIN: 23
};

/**
 * Authenticate with Google Sheets API
 */
async function authenticate() {
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    return await auth.getClient();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    throw error;
  }
}

/**
 * Fetch data from Google Sheets
 */
async function fetchSheetData(authClient) {
  try {
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    // Skip header row and map to contact objects
    return rows.slice(1).map(row => ({
      contactId: row[COLUMNS.CONTACT_VID],
      firstName: row[COLUMNS.FIRST_NAME],
      lastName: row[COLUMNS.LAST_NAME],
      email: row[COLUMNS.EMAIL],
      company: row[COLUMNS.COMPANY],
      companyDomain: row[COLUMNS.COMPANY_DOMAIN],
      annualRevenue: row[COLUMNS.ANNUAL_REVENUE],
      industry: row[COLUMNS.INDUSTRY],
      icpScore: row[COLUMNS.ICP_SCORE],
      geography: row[COLUMNS.GEOGRAPHY],
      createDate: row[COLUMNS.DATE],
      leadStatus: row[COLUMNS.LEAD_STATUS],
      ownerName: row[COLUMNS.OWNER_NAME],
      originalSource: row[COLUMNS.ORIGINAL_SOURCE]
    }));
  } catch (error) {
    console.error('❌ Error fetching sheet data:', error.message);
    throw error;
  }
}

/**
 * Get contact details from HubSpot (including ICP score)
 */
async function getContactFromHubSpot(contactId) {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        properties: 'icp_lead_score,annualrevenue,industry'
      }
    });

    return response.data.properties;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error(`⚠️  Error fetching contact ${contactId}:`, error.message);
    return null;
  }
}

/**
 * Get associated deals for a contact from HubSpot
 */
async function getContactDeals(contactId) {
  try {
    const url = `https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/deals`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.results || [];
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return []; // No deals found
    }
    console.error(`⚠️  Error fetching deals for contact ${contactId}:`, error.message);
    return [];
  }
}

/**
 * Get deal details from HubSpot
 */
async function getDealDetails(dealId) {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        properties: 'dealname,dealstage,amount,closedate,pipeline,hs_lastmodifieddate,createdate,hubspot_owner_id'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`⚠️  Error fetching deal ${dealId}:`, error.message);
    return null;
  }
}

/**
 * Load existing whale tracker data
 */
function loadWhaleTracker() {
  try {
    if (fs.existsSync(WHALE_TRACKER_PATH)) {
      return JSON.parse(fs.readFileSync(WHALE_TRACKER_PATH, 'utf8'));
    }
  } catch (error) {
    console.error('⚠️  Error loading whale tracker:', error.message);
  }

  // Return empty structure if file doesn't exist
  return {
    activeWhales: [],
    archivedWhales: [],
    metadata: {
      lastUpdated: null,
      totalActiveWhales: 0,
      totalArchivedWhales: 0,
      totalPipelineValue: 0,
      averageHealth: 0
    }
  };
}

/**
 * Save whale tracker data
 */
function saveWhaleTracker(data) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(WHALE_TRACKER_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(WHALE_TRACKER_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error saving whale tracker:', error.message);
    return false;
  }
}

/**
 * Main whale finding function
 */
async function findWhales() {
  console.log('\n🐋 WHALE FINDER - Scanning for High-Value Prospects');
  console.log('='.repeat(60));

  try {
    // Authenticate with Google Sheets
    console.log('🔐 Authenticating with Google Sheets...');
    const authClient = await authenticate();
    console.log('   ✓ Authenticated\n');

    // Fetch MQL data
    console.log('📥 Fetching MQL data from Google Sheets...');
    const contacts = await fetchSheetData(authClient);
    console.log(`   ✓ Loaded ${contacts.length} contacts\n`);

    // Load existing whale tracker
    console.log('📂 Loading existing whale tracker...');
    const tracker = loadWhaleTracker();
    const existingWhaleIds = new Set(
      tracker.activeWhales.map(w => w.contactId)
    );
    console.log(`   ✓ Currently tracking ${tracker.activeWhales.length} whales\n`);

    // Scan for whales
    console.log('🔍 Scanning for whale prospects...');
    const newWhales = [];
    const alreadyTracked = [];
    const notQualified = [];

    for (const contact of contacts) {
      if (!contact.contactId) continue;

      // Check if already tracked
      if (existingWhaleIds.has(contact.contactId)) {
        alreadyTracked.push(contact);
        continue;
      }

      // If ICP score is missing from sheet, fetch from HubSpot
      let icpScore = contact.icpScore;
      let annualRevenue = contact.annualRevenue;
      let industry = contact.industry;

      if (!icpScore || icpScore === 'N/A' || icpScore === '') {
        const hubspotContact = await getContactFromHubSpot(contact.contactId);
        if (hubspotContact) {
          icpScore = hubspotContact.icp_lead_score || contact.icpScore;
          // Also update revenue and industry if missing
          if (!annualRevenue || annualRevenue === '0') {
            annualRevenue = hubspotContact.annualrevenue || annualRevenue;
          }
          if (!industry) {
            industry = hubspotContact.industry || industry;
          }
        }
      }

      // Check if qualifies as whale
      const whaleCheck = whaleUtils.isWhale({
        annualRevenue,
        icpScore,
        industry
      });

      if (!whaleCheck.qualifies) {
        notQualified.push(contact);
        continue;
      }

      // Update contact with HubSpot data
      contact.icpScore = icpScore;
      contact.annualRevenue = annualRevenue;
      contact.industry = industry;

      // This is a new whale! Get deal info from HubSpot
      console.log(`   🐋 Found whale: ${contact.company} (${whaleUtils.formatRevenue(whaleCheck.revenue)})`);

      const deals = await getContactDeals(contact.contactId);
      let dealInfo = null;

      if (deals.length > 0) {
        // Get the most recent deal
        const latestDeal = deals[0];
        const dealDetails = await getDealDetails(latestDeal.toObjectId);

        if (dealDetails) {
          dealInfo = {
            dealId: dealDetails.id,
            dealName: dealDetails.properties.dealname || 'Untitled Deal',
            currentStage: dealDetails.properties.dealstage || 'Discovery',
            stageEnteredDate: new Date(dealDetails.properties.hs_lastmodifieddate || dealDetails.properties.createdate).toISOString(),
            daysInStage: whaleUtils.daysBetween(
              dealDetails.properties.hs_lastmodifieddate || dealDetails.properties.createdate,
              new Date()
            ),
            stageHistory: [],
            dealAmount: parseFloat(dealDetails.properties.amount) || 0,
            dealOwner: contact.ownerName || 'Unknown'
          };
        }
      }

      // Calculate base score
      const baseScore = whaleUtils.calculateBaseScore(
        whaleCheck.revenue,
        whaleCheck.icpScore,
        whaleCheck.isPriorityIndustry
      );

      // Calculate initial health
      const daysSinceCreated = whaleUtils.daysBetween(contact.createDate, new Date());
      const daysInStage = dealInfo ? dealInfo.daysInStage : daysSinceCreated;
      const currentStage = dealInfo ? dealInfo.currentStage : 'Discovery';

      const healthCalc = whaleUtils.calculateHealthScore(
        baseScore,
        daysSinceCreated,
        daysInStage,
        currentStage
      );

      // Create whale object
      const whale = {
        contactId: contact.contactId,
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        company: contact.company,
        email: contact.email,
        firstDetected: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),

        whaleMetrics: {
          annualRevenue: whaleCheck.revenue,
          icpScore: whaleCheck.icpScore,
          industry: contact.industry,
          geography: contact.geography,
          baseScore: baseScore,
          currentHealth: healthCalc.health,
          status: whaleUtils.getHealthStatus(healthCalc.health),
          isPriorityIndustry: whaleCheck.isPriorityIndustry
        },

        dealInfo: dealInfo,

        activityMetrics: {
          daysSinceCreated: daysSinceCreated,
          daysSinceLastActivity: 0,
          lastActivityType: 'MQL Created',
          lastActivityDate: contact.createDate
        },

        healthBreakdown: healthCalc.breakdown
      };

      newWhales.push(whale);
    }

    console.log(`\n📊 Scan Results:`);
    console.log(`   🆕 New whales found: ${newWhales.length}`);
    console.log(`   ✓ Already tracked: ${alreadyTracked.length}`);
    console.log(`   ❌ Not qualified: ${notQualified.length}`);

    // Add new whales to tracker
    if (newWhales.length > 0) {
      tracker.activeWhales.push(...newWhales);
      tracker.metadata.totalActiveWhales = tracker.activeWhales.length;
      tracker.metadata.lastUpdated = new Date().toISOString();
      tracker.metadata.totalPipelineValue = tracker.activeWhales.reduce(
        (sum, w) => sum + (w.dealInfo?.dealAmount || 0),
        0
      );
      tracker.metadata.averageHealth = Math.round(
        tracker.activeWhales.reduce((sum, w) => sum + w.whaleMetrics.currentHealth, 0) /
        tracker.activeWhales.length
      );

      console.log(`\n💾 Saving updated whale tracker...`);
      const saved = saveWhaleTracker(tracker);
      if (saved) {
        console.log(`   ✓ Saved to ${WHALE_TRACKER_PATH}`);
      }

      // Display new whales
      console.log('\n🐋 NEW WHALES ADDED:');
      console.log('='.repeat(60));
      newWhales.forEach((whale, idx) => {
        console.log(`${idx + 1}. ${whale.whaleMetrics.status} ${whale.company}`);
        console.log(`   Revenue: ${whaleUtils.formatRevenue(whale.whaleMetrics.annualRevenue)} | ICP: ${whale.whaleMetrics.icpScore} | Health: ${whale.whaleMetrics.currentHealth}`);
        console.log(`   Deal: ${whale.dealInfo ? whale.dealInfo.currentStage : 'No deal yet'}`);
        console.log('');
      });
    } else {
      console.log('\n✨ No new whales found. All existing whales are already being tracked.');
    }

    console.log('='.repeat(60));
    console.log('✅ Whale scan complete!');
    console.log('='.repeat(60));
    console.log();

  } catch (error) {
    console.error('\n❌ Error during whale scan:', error.message);
    process.exit(1);
  }
}

// Run the whale finder
findWhales();
