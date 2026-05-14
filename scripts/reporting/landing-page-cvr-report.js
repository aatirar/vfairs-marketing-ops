/**
 * Landing Page Conversion Rate Report
 *
 * For each key page on vFairs.com, reports monthly sessions (GA4) and MQLs
 * (HubSpot first-touch attribution via Google Sheet) from Jan 2025 onwards.
 *
 * Attribution model:
 *   - Sessions: total GA4 sessions that included the page in any given month
 *   - MQLs: contacts whose "First Page Seen" (col P) matches this page,
 *     bucketed by Contact Create Date (col Y)
 *   - CVR: MQLs / Sessions
 *
 * Output: A new Google Sheet with merged month headers, formatted CVR%, and
 *         frozen header rows.
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const GA4_PROPERTY_ID = '269289033'; // vFairs GA4 property
const HUBSPOT_SHEET_ID = '1r7QiPKC_ktXuw1JW5tx6fN-8DMu3HdQSxus87Zc_zVQ';

// Column indices (0-based) in the HubSpot sheet — P=15, Y=24
// Set by user; header-detection below logs a warning if the sheet disagrees.
const COL_FIRST_PAGE_SEEN = 15; // P — "First Page Seen"
const COL_CONTACT_CREATE_DATE = 24; // Y — "Contact Create Date"

// ---------------------------------------------------------------------------
// Output spreadsheet
//
// The service account cannot create new Drive files (storage quota).
// To use: create a blank Google Sheet in your Drive, share it with
//   claude-homebase@gdrive-mcp-456412.iam.gserviceaccount.com (Editor)
// then set CVR_SPREADSHEET_ID= in .env
// ---------------------------------------------------------------------------
const OUTPUT_SPREADSHEET_ID = process.env.CVR_SPREADSHEET_ID || null;

// ---------------------------------------------------------------------------
// Key Pages — { label, path }
// path must match GA4 pagePath exactly (or a prefix for contact-us)
// ---------------------------------------------------------------------------

const KEY_PAGES = [
  // Home
  { label: 'Home Page', path: '/' },

  // Main Product Pages
  { label: 'Event Registration Software', path: '/event-management-platform/event-registration-software/' },
  { label: 'Event Ticketing Software', path: '/event-management-platform/event-ticketing-software/' },
  { label: 'Mobile Event App', path: '/event-management-platform/mobile-event-app/' },
  { label: 'Virtual Event Platform', path: '/event-management-platform/virtual-event-platform/' },
  { label: 'Onsite Badge Printing', path: '/event-management-platform/onsite-event-badge-printing/' },
  { label: 'Onsite Check-In', path: '/event-management-platform/onsite-event-check-in/' },
  { label: 'Event Lead Capture', path: '/features/event-lead-capture/' },

  // Feature Pages
  { label: 'Facial Recognition', path: '/features/facial-recognition/' },
  { label: 'Event Planning', path: '/features/event-planning/' },
  { label: 'Event Marketing', path: '/features/event-marketing/' },
  { label: 'Sponsor & Exhibitor Mgmt', path: '/features/sponsor-exhibitor-management/' },
  { label: 'Event Builder', path: '/features/event-builder/' },
  { label: 'Event Content Management', path: '/features/event-content-management/' },
  { label: 'AI Writing Assistant', path: '/features/ai-writing-assistant/' },
  { label: 'Attendee Experience', path: '/features/attendee-experience/' },
  { label: 'Event Networking', path: '/features/event-networking/' },
  { label: 'Event Gamification', path: '/features/event-gamification/' },
  { label: 'Smart Matchmaking', path: '/features/smart-matchmaking/' },
  { label: 'In-Person Events', path: '/event-management-platform/in-person-events/' },

  // Solution Pages
  { label: 'In-Person Conference', path: '/event-management-platform/in-person-conference/' },
  { label: 'In-Person Trade Show', path: '/event-management-platform/in-person-trade-show/' },
  { label: 'In-Person Job Fair', path: '/event-management-platform/in-person-job-fair/' },
  { label: 'Virtual Conference', path: '/event-management-platform/virtual-conference/' },
  { label: 'Virtual Trade Show', path: '/event-management-platform/virtual-trade-show/' },
  { label: 'Virtual Job Fair', path: '/event-management-platform/virtual-job-fair/' },
  { label: 'Hybrid Event', path: '/event-management-platform/hybrid-event/' },
  { label: 'Webinar Solutions', path: '/features/webinar-solutions/' },
  { label: 'Integrations', path: '/features/integrations/' },
  { label: 'Accessibility', path: '/features/accessibility/' },
  { label: 'Floor Plan Builder', path: '/features/floor-plan-builder/' },

  // Pricing & Contact
  { label: 'Pricing', path: '/pricing/' },
  { label: 'Contact Us (Demo)', path: '/contact-us/' },

  // SEM Landing Pages
  { label: 'LP: vFairs Event Platform', path: '/lp/vfairs-event-platform-new' },
  { label: 'LP: vs Cvent', path: '/lp/competitor/vfairs-vs-cvent' },
  { label: 'LP: vs Eventbrite', path: '/lp/competitor/vfairs-vs-eventbrite' },
  { label: 'LP: vs Goldcast', path: '/lp/competitor/vfairs-vs-goldcast' },
  { label: 'LP: vs On24', path: '/lp/competitor/vfairs-vs-on24' },
  { label: 'LP: vs Spotme', path: '/lp/competitor/vfairs-vs-spotme' },
  { label: 'LP: vs Webex', path: '/lp/competitor/vfairs-vs-webex' },
  { label: 'LP: vs Whova', path: '/lp/competitor/vfairs-vs-whova' },
  { label: 'LP: Abstract Mgmt Software', path: '/lp/platform/abstract-management-software-new' },
  { label: 'LP: Badge Printing', path: '/lp/platform/badge-printing-new-a' },
  { label: 'LP: Conference Check-in & Badge Printing', path: '/lp/platform/conference-check-ins-and-badge-printing' },
  { label: 'LP: Conference Management', path: '/lp/platform/conference-management-new' },
  { label: 'LP: Corporate Event Mgmt', path: '/lp/platform/corporate-event-management-software' },
  { label: 'LP: Enterprise Event Mgmt', path: '/lp/platform/enterprise-event-management-new' },
  { label: 'LP: Event Check-in App (C)', path: '/lp/platform/event-check-in-attendance-app-new-c' },
  { label: 'LP: Event Check-in App (D)', path: '/lp/platform/event-check-in-attendance-app-new-d' },
  { label: 'LP: Event Coordinator Software', path: '/lp/platform/event-coordinator-software' },
  { label: 'LP: Event Management Platform', path: '/lp/platform/event-management-platform-new' },
  { label: 'LP: Event Management Platform (B)', path: '/lp/platform/event-management-platform-new-b' },
  { label: 'LP: Event Organizer Software', path: '/lp/platform/event-organizer-software' },
  { label: 'LP: Event Planning Software', path: '/lp/platform/event-planning-software' },
  { label: 'LP: Event Production Software', path: '/lp/platform/event-production-software' },
  { label: 'LP: Event Registration Software', path: '/lp/platform/event-registration-software-new' },
  { label: 'LP: Event Ticketing Software', path: '/lp/platform/event-ticketing-software-new' },
  { label: 'LP: Hybrid Conference', path: '/lp/platform/hybrid-conference-new' },
  { label: 'LP: Hybrid Event Platform', path: '/lp/platform/hybrid-event-platform-new' },
  { label: 'LP: Lead Capture App', path: '/lp/platform/lead-capture-app-new' },
  { label: 'LP: Mobile Event App (B)', path: '/lp/platform/mobile-event-app-new-b' },
  { label: 'LP: Mobile Event App (C)', path: '/lp/platform/mobile-event-app-new-c' },
  { label: 'LP: Non-profits Event Platform', path: '/lp/platform/non-profits-event-platform' },
  { label: 'LP: Virtual Career Fair', path: '/lp/platform/virtual-career-fair-new' },
  { label: 'LP: Virtual Conference', path: '/lp/platform/virtual-conference-new' },
  { label: 'LP: Virtual Education Fair', path: '/lp/platform/virtual-education-fair-new' },
  { label: 'LP: Virtual Events', path: '/lp/platform/virtual-events-new' },
  { label: 'LP: Virtual Events (B)', path: '/lp/platform/virtual-events-new-b' },
  { label: 'LP: Virtual Events (C)', path: '/lp/platform/virtual-events-new-c' },
  { label: 'LP: Virtual Exhibition Fair', path: '/lp/platform/virtual-exhibition-fair-new' },
  { label: 'LP: Virtual Open Day', path: '/lp/platform/virtual-open-day-new' },
  { label: 'LP: Virtual Trade Shows', path: '/lp/platform/virtual-trade-shows-new' },
  { label: 'LP: White Label App', path: '/lp/platform/white-label-app' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateMonths() {
  const months = [];
  let year = 2025, month = 1;
  const now = new Date();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      year,
      month,
      key: `${year}${String(month).padStart(2, '0')}`,
      label: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return months;
}

// Normalise a URL/path to a canonical path string (lowercase, no trailing
// slash except for root, no query string).  Returns null for irrelevant paths.
function normalizePath(raw) {
  if (!raw) return null;
  try {
    let p = raw.trim();
    // Strip domain if full URL
    if (/^https?:\/\//i.test(p)) {
      const u = new URL(p);
      p = u.pathname; // intentionally drop query string for matching
    }
    // Lowercase
    p = p.toLowerCase();
    // Strip trailing slash (except root)
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  } catch {
    return null;
  }
}

// Build a lookup map from every normalized path variant → canonical KEY_PAGES path
function buildPathLookup() {
  const lookup = new Map();
  for (const page of KEY_PAGES) {
    const canonical = page.path;
    const norm = normalizePath(canonical);
    lookup.set(norm, canonical);
    // Also map the with-slash / without-slash variant
    const alt = norm.endsWith('/') ? norm.slice(0, -1) : norm + '/';
    lookup.set(alt === '' ? '/' : alt, canonical);
  }
  return lookup;
}

const PATH_LOOKUP = buildPathLookup();

function matchPath(rawPath) {
  const norm = normalizePath(rawPath);
  if (!norm) return null;
  if (PATH_LOOKUP.has(norm)) return PATH_LOOKUP.get(norm);
  // Special case: contact-us with any query string
  if (norm.startsWith('/contact-us')) return '/contact-us/';
  return null;
}

// GA4 in_list_filter values — canonical paths + slash-stripped variants
function buildGA4PathList() {
  const set = new Set();
  for (const page of KEY_PAGES) {
    set.add(page.path);
    const alt = page.path.length > 1 && page.path.endsWith('/')
      ? page.path.slice(0, -1)
      : page.path + '/';
    set.add(alt);
  }
  return [...set];
}

function parseHubspotDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  // Try MM/DD/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
  return null;
}

// ---------------------------------------------------------------------------
// GA4
// ---------------------------------------------------------------------------

async function fetchGA4Sessions(authClient) {
  console.log('📊 Querying GA4 sessions...');
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: authClient });

  const allPaths = buildGA4PathList();

  // Use orGroup: in_list for most pages + BEGINS_WITH for contact-us
  const nonContactPaths = allPaths.filter(p => !p.startsWith('/contact-us'));
  const dimensionFilter = {
    orGroup: {
      expressions: [
        {
          filter: {
            fieldName: 'pagePath',
            inListFilter: { values: nonContactPaths },
          },
        },
        {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'BEGINS_WITH', value: '/contact-us' },
          },
        },
      ],
    },
  };

  let allRows = [];
  let offset = 0;
  const pageSize = 100000;

  while (true) {
    const res = await analyticsdata.properties.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      requestBody: {
        dateRanges: [{ startDate: '2025-01-01', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }, { name: 'yearMonth' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter,
        limit: pageSize,
        offset,
      },
    });

    const rows = res.data.rows || [];
    allRows = allRows.concat(rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`  → ${allRows.length} GA4 rows retrieved`);

  // Build sessionMap: { canonical_path: { yearMonth_key: sessions } }
  const sessionMap = {};
  for (const page of KEY_PAGES) sessionMap[page.path] = {};

  for (const row of allRows) {
    const rawPath = row.dimensionValues[0].value;
    const yearMonth = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value, 10) || 0;
    const canonical = matchPath(rawPath);
    if (!canonical) continue;
    sessionMap[canonical][yearMonth] = (sessionMap[canonical][yearMonth] || 0) + sessions;
  }

  return sessionMap;
}

// ---------------------------------------------------------------------------
// HubSpot Google Sheet
// ---------------------------------------------------------------------------

async function fetchMQLs(authClient) {
  console.log('📋 Reading HubSpot sheet...');
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: HUBSPOT_SHEET_ID,
    range: 'A:AZ',
  });

  const rows = res.data.values || [];
  if (rows.length === 0) throw new Error('HubSpot sheet is empty');

  // Use columns P (15) and Y (24) exactly as specified by user.
  // Log a header-verification warning if the sheet headers disagree.
  const firstPageCol = COL_FIRST_PAGE_SEEN;
  const createDateCol = COL_CONTACT_CREATE_DATE;

  const header = (rows[0] || []).map(h => (h || '').trim());
  const fpHeader = header[firstPageCol] || '(blank)';
  const cdHeader = header[createDateCol] || '(blank)';
  console.log(`  → Col P(${firstPageCol}): "${fpHeader}" | Col Y(${createDateCol}): "${cdHeader}"`);
  if (!fpHeader.toLowerCase().includes('page') && !fpHeader.toLowerCase().includes('url')) {
    console.warn(`  ⚠️  Col P header "${fpHeader}" doesn't look like a page URL column — double-check`);
  }
  console.log(`  → ${rows.length - 1} data rows`);

  const mqlMap = {};
  for (const page of KEY_PAGES) mqlMap[page.path] = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const rawPage = row[firstPageCol] || '';
    const rawDate = row[createDateCol] || '';
    if (!rawPage || !rawDate) continue;

    const d = parseHubspotDate(rawDate);
    if (!d || d.getFullYear() < 2025) continue;

    const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const canonical = matchPath(rawPage);
    if (!canonical) continue;

    mqlMap[canonical][yearMonth] = (mqlMap[canonical][yearMonth] || 0) + 1;
  }

  return mqlMap;
}

// ---------------------------------------------------------------------------
// Build output sheet
// ---------------------------------------------------------------------------

async function createOutputSheet(authClient, sessionMap, mqlMap, months) {
  console.log('📝 Building output spreadsheet...');
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  if (!OUTPUT_SPREADSHEET_ID) {
    throw new Error(
      'CVR_SPREADSHEET_ID is not set.\n' +
      '  1. Create a blank Google Sheet in your Drive\n' +
      '  2. Share it with claude-homebase@gdrive-mcp-456412.iam.gserviceaccount.com (Editor)\n' +
      '  3. Add CVR_SPREADSHEET_ID=<sheet_id_from_url> to .env\n' +
      '  4. Re-run this script'
    );
  }

  const spreadsheetId = OUTPUT_SPREADSHEET_ID;
  const tabTitle = `CVR ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

  // Delete existing tab with same name if present, then create fresh
  let sheetId;
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTab = meta.data.sheets.find(s => s.properties.title === tabTitle);

  if (existingTab) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ deleteSheet: { sheetId: existingTab.properties.sheetId } }] },
    });
  }

  const addResp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: tabTitle } } }] },
  });
  sheetId = addResp.data.replies[0].addSheet.properties.sheetId;

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;

  // --- Build row data ---
  const NUM_MONTHS = months.length;
  const TOTAL_COLS = 1 + NUM_MONTHS * 3;

  // Row 0 (index): blank, then month labels spanning 3 cols each
  const row0 = [''];
  months.forEach(m => row0.push(m.label, '', ''));

  // Row 1: column headers
  const row1 = ['Page Name'];
  months.forEach(() => row1.push('Sessions', 'MQLs', 'CVR'));

  // Data rows
  const dataRows = KEY_PAGES.map(page => {
    const row = [page.label];
    months.forEach(m => {
      const sessions = sessionMap[page.path]?.[m.key] || 0;
      const mqls = mqlMap[page.path]?.[m.key] || 0;
      const cvr = sessions > 0 ? mqls / sessions : 0;
      row.push(sessions, mqls, cvr);
    });
    return row;
  });

  const allValues = [row0, row1, ...dataRows];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabTitle}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allValues },
  });

  // --- Formatting requests ---
  const requests = [];
  const DATA_START_ROW = 2; // 0-indexed row 2
  const NUM_DATA_ROWS = KEY_PAGES.length;
  // sheetId is already declared above from the addSheet response

  // Merge month-header cells (row 0): cols 1..3, 4..6, etc.
  months.forEach((_, i) => {
    const startCol = 1 + i * 3;
    requests.push({
      mergeCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: startCol, endColumnIndex: startCol + 3 },
        mergeType: 'MERGE_ALL',
      },
    });
  });

  // Month header row style: dark blue bg, white bold text, centered
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.18, green: 0.37, blue: 0.58 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // Column header row style: light blue bg, bold, centered
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.78, green: 0.87, blue: 0.95 },
          textFormat: { bold: true },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // Page Name column (A): left-aligned
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: DATA_START_ROW, endRowIndex: DATA_START_ROW + NUM_DATA_ROWS, startColumnIndex: 0, endColumnIndex: 1 },
      cell: { userEnteredFormat: { horizontalAlignment: 'LEFT' } },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  });

  // Sessions + MQLs columns: center-aligned
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: DATA_START_ROW, endRowIndex: DATA_START_ROW + NUM_DATA_ROWS, startColumnIndex: 1, endColumnIndex: TOTAL_COLS },
      cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  });

  // CVR columns: percentage format
  months.forEach((_, i) => {
    const cvrCol = 1 + i * 3 + 2; // 0-indexed
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: DATA_START_ROW, endRowIndex: DATA_START_ROW + NUM_DATA_ROWS, startColumnIndex: cvrCol, endColumnIndex: cvrCol + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.00%' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  });

  // Freeze rows 1-2 and column A
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 2, frozenColumnCount: 1 } },
      fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount',
    },
  });

  // Auto-resize column A (page names)
  requests.push({
    autoResizeDimensions: {
      dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
    },
  });

  // Set fixed widths for sessions/MQLs/CVR columns (70 / 55 / 65 px)
  months.forEach((_, i) => {
    const base = 1 + i * 3;
    const widths = [70, 55, 65];
    widths.forEach((w, j) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: base + j, endIndex: base + j + 1 },
          properties: { pixelSize: w },
          fields: 'pixelSize',
        },
      });
    });
  });

  // Alternating row shading for readability
  for (let r = 0; r < NUM_DATA_ROWS; r++) {
    if (r % 2 === 0) continue; // only shade odd rows
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: DATA_START_ROW + r, endRowIndex: DATA_START_ROW + r + 1, startColumnIndex: 0, endColumnIndex: TOTAL_COLS },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.96, green: 0.96, blue: 0.96 } } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  return { spreadsheetId, spreadsheetUrl };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const months = generateMonths();
  console.log(`\n🚀 Landing Page CVR Report`);
  console.log(`   Pages: ${KEY_PAGES.length} | Months: ${months.length} (${months[0].label} → ${months[months.length - 1].label})\n`);

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
  });
  const authClient = await auth.getClient();

  let sessionMap;
  try {
    sessionMap = await fetchGA4Sessions(authClient);
  } catch (err) {
    console.error(`\n⚠️  GA4 fetch failed: ${err.message}`);
    console.error('   Make sure the service account has Viewer access to the GA4 property.');
    console.error('   Continuing with 0 sessions — MQL data will still be written.\n');
    sessionMap = {};
    for (const page of KEY_PAGES) sessionMap[page.path] = {};
  }

  const mqlMap = await fetchMQLs(authClient);

  const { spreadsheetUrl } = await createOutputSheet(authClient, sessionMap, mqlMap, months);

  // Print a quick sanity-check summary
  console.log('\n--- Quick Summary (total across all months) ---');
  let grandSessions = 0, grandMQLs = 0;
  for (const page of KEY_PAGES) {
    const totalSessions = Object.values(sessionMap[page.path] || {}).reduce((a, b) => a + b, 0);
    const totalMQLs = Object.values(mqlMap[page.path] || {}).reduce((a, b) => a + b, 0);
    if (totalSessions > 0 || totalMQLs > 0) {
      const cvr = totalSessions > 0 ? ((totalMQLs / totalSessions) * 100).toFixed(2) : 'N/A';
      console.log(`  ${page.label.padEnd(45)} | Sessions: ${String(totalSessions).padStart(6)} | MQLs: ${String(totalMQLs).padStart(4)} | CVR: ${cvr}%`);
    }
    grandSessions += totalSessions;
    grandMQLs += totalMQLs;
  }
  console.log(`\n  TOTAL | Sessions: ${grandSessions} | MQLs: ${grandMQLs} | Overall CVR: ${grandSessions > 0 ? ((grandMQLs / grandSessions) * 100).toFixed(2) : 'N/A'}%`);

  console.log(`\n✅ Report created: ${spreadsheetUrl}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
