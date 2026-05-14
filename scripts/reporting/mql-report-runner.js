/**
 * MQL Report Runner - uses correct credentials path from .config/
 */
const { google } = require('googleapis');
const { parse: parseCSV } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';
const DATA_2025_CSV = path.join(__dirname, '../../data/mqls/ytd-mqls-2025.csv');

const COLUMNS = {
  YEAR: 0, MONTH: 1, DATE: 2, ORIGINAL_SOURCE: 3, SOURCE_DRILL_1: 4,
  SOURCE_DRILL_2: 5, LEAD_STATUS: 6, GEOGRAPHY: 7, EVENT_PLANNING: 8,
  EVENT_TYPE: 9, INDUSTRY: 10, ICP_SCORE: 11, MEETING_BOOKED: 12,
  FIRST_MEETING_DATE: 13, CONTACT_VID: 14, IP_CITY: 15, FIRST_PAGE: 16,
  COMPANY: 17, ANNUAL_REVENUE: 18, FIRST_NAME: 19, LAST_NAME: 20,
  EMAIL: 21, OWNER_NAME: 22, COMPANY_DOMAIN: 23
};

const CSV_HEADERS = {
  CREATE_DATE: 'Create Date',
  MEETING_BOOKED: 'Meeting booked in calendar',
  ORIGINAL_SOURCE: 'Original Source',
  GEOGRAPHY: 'Geography'
};

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  return await auth.getClient();
}

async function fetchSheetData(authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // First, get the spreadsheet metadata to find the actual sheet tab name
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetTitles = meta.data.sheets.map(s => s.properties.title);
  console.log('   Available sheets: ' + sheetTitles.join(', '));
  const sheetName = sheetTitles[0]; // Use first sheet

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName + '!A:Z'
  });
  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];
  return rows.slice(1);
}

function parse2025Data() {
  if (!fs.existsSync(DATA_2025_CSV)) {
    console.error('2025 CSV not found at: ' + DATA_2025_CSV);
    return [];
  }
  const content = fs.readFileSync(DATA_2025_CSV, 'utf8');
  const records = parseCSV(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });
  console.log('   Parsed ' + records.length + ' records from 2025 CSV');
  return records;
}

function filterByDateRange(data, startDate, endDate, dateColumn) {
  if (dateColumn === undefined) dateColumn = COLUMNS.DATE;
  return data.filter(row => {
    const dateStr = row[dateColumn];
    if (!dateStr) return false;
    const clean = String(dateStr).replace(/^"(.*)"$/, '$1');
    const d = new Date(clean);
    if (isNaN(d.getTime())) return false;
    return d >= startDate && d <= endDate;
  });
}

function calculateMeetingRate(data, meetingColumn) {
  if (meetingColumn === undefined) meetingColumn = COLUMNS.MEETING_BOOKED;
  const total = data.length;
  if (total === 0) return 0;
  const n = data.filter(row => {
    const v = row[meetingColumn];
    if (!v) return false;
    const c = String(v).replace(/^"(.*)"$/, '$1').toLowerCase().trim();
    return c === 'true' || c === 'yes' || c === '1';
  }).length;
  return (n / total) * 100;
}

function getTopSources(data, limit) {
  limit = limit || 5;
  const counts = {};
  data.forEach(row => {
    const s = row[COLUMNS.ORIGINAL_SOURCE];
    if (s) counts[s] = (counts[s] || 0) + 1;
  });
  const total = data.length || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([source, count]) => ({ source, count, percentage: ((count / total) * 100).toFixed(1) }));
}

function getTopEventTypes(data, limit) {
  limit = limit || 5;
  const counts = {};
  data.forEach(row => {
    const e = row[COLUMNS.EVENT_TYPE];
    if (e) counts[e] = (counts[e] || 0) + 1;
  });
  const total = data.length || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type, count]) => ({ type, count, percentage: ((count / total) * 100).toFixed(1) }));
}

async function run() {
  console.log('');
  console.log('HUBSPOT MQL REPORT (from Google Sheets)');
  console.log('='.repeat(60));
  console.log('Authenticating with Google Sheets...');
  const authClient = await authenticate();
  console.log('   Authenticated');

  console.log('Fetching 2026 MQL data from Google Sheets...');
  const allData2026 = await fetchSheetData(authClient);
  console.log('   Loaded ' + allData2026.length + ' total rows');

  const today = new Date();
  const currentYear = today.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const data2026 = filterByDateRange(allData2026, startOfYear, today);
  console.log('   Filtered to ' + data2026.length + ' rows for 2026 YTD');

  console.log('Loading 2025 comparison data...');
  const all2025Data = parse2025Data();
  const lastYearStart = new Date(currentYear - 1, 0, 1);
  const lastYearEnd = new Date(currentYear - 1, today.getMonth(), today.getDate());
  const data2025 = filterByDateRange(all2025Data, lastYearStart, lastYearEnd, CSV_HEADERS.CREATE_DATE);
  console.log('   Filtered to ' + data2025.length + ' rows from 2025 (' + lastYearStart.toLocaleDateString() + ' - ' + lastYearEnd.toLocaleDateString() + ')');

  const total2026 = data2026.length;
  const total2025 = data2025.length;
  const change = total2026 - total2025;
  const percentChange = total2025 > 0
    ? ((change / total2025) * 100).toFixed(1)
    : (total2026 > 0 ? '+inf' : '0.0');

  const meetingRate2026 = calculateMeetingRate(data2026);
  const meetingRate2025 = calculateMeetingRate(data2025, CSV_HEADERS.MEETING_BOOKED);
  const topSources2026 = getTopSources(data2026);
  const topEvents2026 = getTopEventTypes(data2026);


  console.log('');
  console.log('='.repeat(60));
  console.log('YEAR-OVER-YEAR COMPARISON (Jan 1 - ' + today.toLocaleDateString() + ')');
  console.log('='.repeat(60));
  console.log('');

  console.log('MQL Volume:');
  console.log('   2026 YTD: ' + total2026);
  console.log('   2025 YTD: ' + total2025);
  if (total2025 === 0) {
    console.log('   Change:   N/A (no 2025 data)');
  } else {
    console.log('   Change:   ' + (change >= 0 ? '+' : '') + change + ' (' + (change >= 0 ? '+' : '') + percentChange + '%) ' + (change >= 0 ? '[UP]' : '[DOWN]'));
  }

  console.log('');
  console.log('Meeting Booking Rate:');
  console.log('   2026: ' + meetingRate2026.toFixed(1) + '%');
  console.log('   2025: ' + meetingRate2025.toFixed(1) + '%');
  if (total2025 === 0) {
    console.log('   Change: N/A');
  } else {
    const rc = meetingRate2026 - meetingRate2025;
    console.log('   Change: ' + (rc >= 0 ? '+' : '') + rc.toFixed(1) + 'pp ' + (rc >= 0 ? '[UP]' : '[DOWN]'));
  }

  console.log('');
  console.log('Top Sources (2026):');
  if (topSources2026.length === 0) {
    console.log('   No source data available');
  } else {
    topSources2026.forEach((item, idx) => {
      console.log('   ' + (idx + 1) + '. ' + item.source + ': ' + item.count + ' (' + item.percentage + '%)');
    });
  }

  console.log('');
  console.log('Top Event Types (2026):');
  if (topEvents2026.length === 0) {
    console.log('   No event type data available');
  } else {
    topEvents2026.forEach((item, idx) => {
      console.log('   ' + (idx + 1) + '. ' + item.type + ': ' + item.count + ' (' + item.percentage + '%)');
    });
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Key Insights:');
  console.log('='.repeat(60));
  if (total2025 > 0) {
    if (change < 0) {
      console.log('   MQL volume DOWN ' + Math.abs(percentChange) + '% YoY - needs attention');
    } else {
      console.log('   MQL volume UP ' + percentChange + '% YoY - great progress');
    }
    const rateChange = meetingRate2026 - meetingRate2025;
    if (rateChange < 0) {
      console.log('   Meeting rate DECLINED by ' + Math.abs(rateChange).toFixed(1) + 'pp');
    } else {
      console.log('   Meeting rate IMPROVED by ' + rateChange.toFixed(1) + 'pp');
    }
  } else {
    console.log('   No 2025 data available for YoY comparison');
  }
  if (topSources2026.length > 0) {
    console.log('   Top source: ' + topSources2026[0].source + ' (' + topSources2026[0].percentage + '%)');
  }
  if (topEvents2026.length > 0) {
    console.log('   Top event type: ' + topEvents2026[0].type + ' (' + topEvents2026[0].percentage + '%)');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Report complete!');
  console.log('='.repeat(60));
}

run().catch(e => {
  console.error('ERROR: ' + e.message);
  console.error(e.stack);
  process.exit(1);
});
