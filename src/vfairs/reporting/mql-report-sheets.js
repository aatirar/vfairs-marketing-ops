/**
 * MQL Report from Google Sheets
 *
 * This script generates a Year-over-Year MQL comparison report.
 *
 * DATA SOURCES:
 * - 2026 data: Fetched live from Google Sheets (updated by Supermetrics)
 * - 2025 data: Static CSV snapshot (no changes expected)
 *
 * The two data sources have DIFFERENT column structures, which is why
 * we use header-based lookup for the CSV and index-based for Sheets.
 *
 * DEPENDENCIES:
 * - googleapis: Google Sheets API client
 * - csv-parse: Robust CSV parsing (handles quoted fields, escaped quotes)
 *
 * @author Aatir Abdul Rauf
 * @lastModified 2026-02-03
 */

const { google } = require('googleapis');
const { parse: parseCSV } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CREDENTIALS_PATH = path.join(__dirname, '../google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';
const DATA_2025_CSV = path.join(__dirname, '../data/ytd-mqls-2025.csv');

// -----------------------------------------------------------------------------
// Column mapping for 2026 Google Sheets data (index-based)
//
// WHY INDEX-BASED: The Google Sheet structure is controlled by Supermetrics
// and has a fixed column order. Using indices is faster for large datasets.
// If the Sheet structure changes, update these indices accordingly.
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Column mapping for 2025 CSV data (header-based)
//
// WHY HEADER-BASED: The CSV was exported from HubSpot and has 54 columns.
// Using header names makes the code resilient to column reordering.
// These are the EXACT header names from the CSV file.
// -----------------------------------------------------------------------------
const CSV_HEADERS = {
  CREATE_DATE: 'Create Date',
  MEETING_BOOKED: 'Meeting booked in calendar',
  ORIGINAL_SOURCE: 'Original Source',
  GEOGRAPHY: 'Geography'
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

    // Fetch all data (adjust range if needed)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:Z', // Adjust sheet name if different
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('No data found in sheet.');
      return [];
    }

    // Skip header row
    return rows.slice(1);
  } catch (error) {
    console.error('❌ Error fetching sheet data:', error.message);
    throw error;
  }
}

/**
 * Parse 2025 CSV data for comparison
 *
 * Uses csv-parse library for robust parsing that handles:
 * - Quoted fields with commas inside
 * - Escaped quotes (e.g., "Company ""XYZ"" Inc")
 * - Multi-line fields
 * - Various line endings (CRLF, LF)
 *
 * Returns an array of objects keyed by column header names.
 * Example: [{ "Create Date": "2025-01-15", "Meeting booked in calendar": "Yes", ... }]
 *
 * @returns {Array<Object>} Parsed CSV rows as objects with header keys
 */
function parse2025Data() {
  try {
    // Check if file exists before attempting to read
    if (!fs.existsSync(DATA_2025_CSV)) {
      console.error(`⚠️  2025 CSV file not found at: ${DATA_2025_CSV}`);
      console.error('   The report will continue but 2025 comparison data will be empty.');
      return [];
    }

    const content = fs.readFileSync(DATA_2025_CSV, 'utf8');

    // Use csv-parse with columns:true to get objects keyed by header names
    // This makes the code resilient to column reordering in the CSV
    const records = parseCSV(content, {
      columns: true,           // Use first row as headers, return objects
      skip_empty_lines: true,  // Ignore blank lines
      trim: true,              // Trim whitespace from values
      relax_quotes: true,      // Be lenient with malformed quotes
      relax_column_count: true // Handle rows with varying column counts
    });

    console.log(`   ✓ Parsed ${records.length} records from 2025 CSV`);

    // Validate that required columns exist
    if (records.length > 0) {
      const firstRow = records[0];
      const missingColumns = [];

      for (const [key, headerName] of Object.entries(CSV_HEADERS)) {
        if (!(headerName in firstRow)) {
          missingColumns.push(headerName);
        }
      }

      if (missingColumns.length > 0) {
        console.error(`⚠️  Missing expected columns in 2025 CSV: ${missingColumns.join(', ')}`);
        console.error('   Available columns:', Object.keys(firstRow).slice(0, 10).join(', '), '...');
      }
    }

    return records;
  } catch (error) {
    console.error('⚠️  Could not load 2025 data:', error.message);
    console.error('   The report will continue but 2025 comparison data will be empty.');
    return [];
  }
}

/**
 * Filter data by date range
 *
 * This function handles TWO different data formats:
 * 1. Array of arrays (Google Sheets data) - uses numeric column index
 * 2. Array of objects (CSV data) - uses string column name
 *
 * @param {Array} data - Array of rows (either arrays or objects)
 * @param {Date} startDate - Start date (inclusive)
 * @param {Date} endDate - End date (inclusive)
 * @param {number|string} dateColumn - Column index (for arrays) or header name (for objects)
 * @returns {Array} Filtered rows within the date range
 */
function filterByDateRange(data, startDate, endDate, dateColumn = COLUMNS.DATE) {
  return data.filter(row => {
    // Handle both array (Sheets) and object (CSV) row formats
    const dateStr = typeof dateColumn === 'string' ? row[dateColumn] : row[dateColumn];

    if (!dateStr) return false;

    // Remove quotes if present (legacy handling for raw CSV parsing)
    const cleanDateStr = String(dateStr).replace(/^"(.*)"$/, '$1');

    // Parse the date - handles formats like "2025-12-31" and "2025-12-31 23:59"
    const date = new Date(cleanDateStr);

    // Validate the parsed date is valid (not NaN)
    if (isNaN(date.getTime())) {
      return false;
    }

    return date >= startDate && date <= endDate;
  });
}

/**
 * Calculate meeting rate (percentage of MQLs that booked a meeting)
 *
 * Handles both array (Sheets) and object (CSV) data formats.
 * Meeting values can be: "true", "yes", "Yes", "TRUE", etc.
 *
 * @param {Array} data - Array of rows (either arrays or objects)
 * @param {number|string} meetingColumn - Column index (for arrays) or header name (for objects)
 * @returns {number} Meeting rate as a percentage (0-100), or 0 if no data
 */
function calculateMeetingRate(data, meetingColumn = COLUMNS.MEETING_BOOKED) {
  const total = data.length;

  // Guard against division by zero
  if (total === 0) return 0;

  const withMeetings = data.filter(row => {
    // Handle both array (Sheets) and object (CSV) row formats
    const meetingBooked = typeof meetingColumn === 'string' ? row[meetingColumn] : row[meetingColumn];

    if (!meetingBooked) return false;

    // Normalize the value: remove quotes, convert to lowercase
    const cleanValue = String(meetingBooked).replace(/^"(.*)"$/, '$1').toLowerCase().trim();

    // Accept various truthy representations
    return cleanValue === 'true' || cleanValue === 'yes' || cleanValue === '1';
  }).length;

  return (withMeetings / total) * 100;
}

/**
 * Get top traffic sources from 2026 Sheets data
 *
 * NOTE: This function uses index-based access because it's only used for
 * 2026 Google Sheets data (which has a fixed column structure).
 *
 * @param {Array} data - Array of rows from Google Sheets (array format)
 * @param {number} limit - Maximum number of sources to return (default: 5)
 * @returns {Array<{source: string, count: number, percentage: string}>}
 */
function getTopSources(data, limit = 5) {
  const sourceCounts = {};

  data.forEach(row => {
    const source = row[COLUMNS.ORIGINAL_SOURCE];
    if (source) {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }
  });

  // Guard against empty data
  const total = data.length || 1;

  return Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([source, count]) => ({
      source,
      count,
      percentage: ((count / total) * 100).toFixed(1)
    }));
}

/**
 * Get top event types from 2026 Sheets data
 *
 * NOTE: This function uses index-based access because it's only used for
 * 2026 Google Sheets data (which has a fixed column structure).
 *
 * @param {Array} data - Array of rows from Google Sheets (array format)
 * @param {number} limit - Maximum number of event types to return (default: 5)
 * @returns {Array<{type: string, count: number, percentage: string}>}
 */
function getTopEventTypes(data, limit = 5) {
  const eventCounts = {};

  data.forEach(row => {
    const eventType = row[COLUMNS.EVENT_TYPE];
    if (eventType) {
      eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
    }
  });

  // Guard against empty data
  const total = data.length || 1;

  return Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type, count]) => ({
      type,
      count,
      percentage: ((count / total) * 100).toFixed(1)
    }));
}

/**
 * Main function - generates the MQL YoY comparison report
 *
 * FLOW:
 * 1. Authenticate with Google Sheets API
 * 2. Fetch 2026 YTD data from Sheets (live data from Supermetrics)
 * 3. Load 2025 YTD data from local CSV snapshot
 * 4. Filter both datasets to same date range (Jan 1 - today)
 * 5. Calculate and display comparison metrics
 */
async function generateMQLReport() {
  console.log('\n📊 HUBSPOT MQL REPORT (from Google Sheets)');
  console.log('='.repeat(60));

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Authenticate with Google Sheets
    // -------------------------------------------------------------------------
    console.log('🔐 Authenticating with Google Sheets...');
    const authClient = await authenticate();
    console.log('   ✓ Authenticated\n');

    // -------------------------------------------------------------------------
    // STEP 2: Fetch 2026 data from Google Sheets
    // -------------------------------------------------------------------------
    console.log('📥 Fetching 2026 MQL data from Google Sheets...');
    const allData2026 = await fetchSheetData(authClient);
    console.log(`   ✓ Loaded ${allData2026.length} total rows\n`);

    // -------------------------------------------------------------------------
    // STEP 3: Calculate date ranges for YTD comparison
    // We compare Jan 1 - today for both years (apples to apples)
    // -------------------------------------------------------------------------
    const today = new Date();
    const currentYear = today.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);

    // Filter 2026 data to YTD (uses index-based column access)
    const data2026 = filterByDateRange(allData2026, startOfYear, today);

    // -------------------------------------------------------------------------
    // STEP 4: Load 2025 comparison data from CSV snapshot
    // Uses header-based column access via CSV_HEADERS constants
    // -------------------------------------------------------------------------
    console.log('📥 Loading 2025 comparison data...');
    const all2025Data = parse2025Data();
    const lastYearStart = new Date(currentYear - 1, 0, 1);
    const lastYearEnd = new Date(currentYear - 1, today.getMonth(), today.getDate());

    // Filter 2025 data to same YTD period (uses header-based column access)
    const data2025 = filterByDateRange(all2025Data, lastYearStart, lastYearEnd, CSV_HEADERS.CREATE_DATE);

    console.log(`   ✓ Filtered to ${data2025.length} rows from 2025 (${lastYearStart.toLocaleDateString()} - ${lastYearEnd.toLocaleDateString()})\n`);

    // -------------------------------------------------------------------------
    // STEP 5: Calculate metrics with safe division
    // -------------------------------------------------------------------------
    const total2026 = data2026.length;
    const total2025 = data2025.length;
    const change = total2026 - total2025;

    // Safe percentage change calculation (avoid division by zero)
    const percentChange = total2025 > 0
      ? ((change / total2025) * 100).toFixed(1)
      : (total2026 > 0 ? '+∞' : '0.0');

    // Meeting rates - use header-based lookup for 2025 CSV data
    const meetingRate2026 = calculateMeetingRate(data2026);
    const meetingRate2025 = calculateMeetingRate(data2025, CSV_HEADERS.MEETING_BOOKED);

    // Top sources and event types (2026 only - Sheets data)
    const topSources2026 = getTopSources(data2026);
    const topEvents2026 = getTopEventTypes(data2026);

    // -------------------------------------------------------------------------
    // STEP 6: Display formatted report
    // -------------------------------------------------------------------------
    console.log('='.repeat(60));
    console.log('📈 YEAR-OVER-YEAR COMPARISON (Jan 1 - ' + today.toLocaleDateString() + ')');
    console.log('='.repeat(60));
    console.log();

    console.log('📊 MQL Volume:');
    console.log(`   2026 YTD: ${total2026}`);
    console.log(`   2025 YTD: ${total2025}`);

    // Handle display when 2025 data is missing
    if (total2025 === 0) {
      console.log(`   Change:   N/A (no 2025 data for comparison)`);
    } else {
      console.log(`   Change:   ${change >= 0 ? '+' : ''}${change} (${change >= 0 ? '+' : ''}${percentChange}%) ${change >= 0 ? '✅' : '⚠️'}`);
    }
    console.log();

    console.log('🤝 Meeting Booking Rate:');
    console.log(`   2026: ${meetingRate2026.toFixed(1)}%`);
    console.log(`   2025: ${meetingRate2025.toFixed(1)}%`);

    // Safe meeting rate comparison
    if (total2025 === 0) {
      console.log(`   Change: N/A (no 2025 data for comparison)`);
    } else {
      const rateChange = meetingRate2026 - meetingRate2025;
      console.log(`   Change: ${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(1)}pp ${rateChange >= 0 ? '✅' : '⚠️'}`);
    }
    console.log();

    console.log('🔍 Top Sources (2026):');
    if (topSources2026.length === 0) {
      console.log('   No source data available');
    } else {
      topSources2026.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.source}: ${item.count} (${item.percentage}%)`);
      });
    }
    console.log();

    console.log('🎪 Top Event Types (2026):');
    if (topEvents2026.length === 0) {
      console.log('   No event type data available');
    } else {
      topEvents2026.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.type}: ${item.count} (${item.percentage}%)`);
      });
    }
    console.log();

    // -------------------------------------------------------------------------
    // STEP 7: Generate insights summary
    // -------------------------------------------------------------------------
    console.log('='.repeat(60));
    console.log('💡 Key Insights:');
    console.log('='.repeat(60));

    // Only show YoY insights if we have comparison data
    if (total2025 > 0) {
      if (change < 0) {
        console.log(`   ⚠️  MQL volume down ${Math.abs(percentChange)}% YoY - needs attention`);
      } else {
        console.log(`   ✅ MQL volume up ${percentChange}% YoY - great progress`);
      }

      if (meetingRate2026 < meetingRate2025) {
        console.log(`   ⚠️  Meeting rate declined by ${(meetingRate2025 - meetingRate2026).toFixed(1)}pp`);
      } else {
        console.log(`   ✅ Meeting rate improved by ${(meetingRate2026 - meetingRate2025).toFixed(1)}pp`);
      }
    } else {
      console.log('   ℹ️  No 2025 data available for YoY comparison');
    }

    if (topSources2026.length > 0) {
      console.log(`   📊 Top source: ${topSources2026[0].source} (${topSources2026[0].percentage}%)`);
    }

    if (topEvents2026.length > 0) {
      console.log(`   🎪 Top event type: ${topEvents2026[0].type} (${topEvents2026[0].percentage}%)`);
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Report complete!');
    console.log('='.repeat(60));
    console.log();

  } catch (error) {
    console.error('\n❌ Error generating report:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the report
generateMQLReport();
