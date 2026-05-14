/**
 * h1-h2-audit-sheets.js
 *
 * Reads all batch JSON files from outputs/h1-h2-audit/
 * and creates a formatted Google Spreadsheet with the H1/H2 messaging audit.
 *
 * Columns: Page URL | Current H1 | Assessment | Alternative H1s | Current H2s | Alternative H2s
 *
 * Usage: node h1-h2-audit-sheets.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const AUDIT_DIR = path.join(__dirname, '../../outputs/h1-h2-audit');
const SHARE_EMAIL = process.env.GOOGLE_SHEETS_SHARE_EMAIL || null;
const EXISTING_SPREADSHEET_ID = process.env.H1_H2_AUDIT_SPREADSHEET_ID || process.env.AUDIT_DEBT_SPREADSHEET_ID || null;

const COLUMNS = [
  'Page URL',
  'Current H1',
  'Assessment',
  'Alternative H1s',
  'Current H2s',
  'Alternative H2s'
];

const COLUMN_WIDTHS = [
  320, // Page URL
  320, // Current H1
  480, // Assessment
  520, // Alternative H1s
  360, // Current H2s
  520  // Alternative H2s
];

function formatAlternatives(items) {
  if (!items || items.length === 0) return '';
  return items.map((item, i) => {
    const option = item.option || item;
    const rationale = item.rationale ? `\n→ ${item.rationale}` : '';
    return `${i + 1}. ${option}${rationale}`;
  }).join('\n\n');
}

function loadAllBatches() {
  const files = fs.readdirSync(AUDIT_DIR)
    .filter(f => f.match(/^batch-\d+\.json$/))
    .sort();

  const allPages = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(AUDIT_DIR, file), 'utf8');
    const batch = JSON.parse(content);
    allPages.push(...batch);
    console.log(`  Loaded ${file} — ${batch.length} pages`);
  }
  return allPages;
}

async function createSheet(pages) {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  const today = new Date().toISOString().split('T')[0];
  const tabTitle = `H1-H2 Audit ${today}`;

  let spreadsheetId, sheetId, sheetUrl;

  if (EXISTING_SPREADSHEET_ID) {
    spreadsheetId = EXISTING_SPREADSHEET_ID;

    // Delete existing tab with the same name if present
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existing = meta.data.sheets.find(s => s.properties.title === tabTitle);
    if (existing) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ deleteSheet: { sheetId: existing.properties.sheetId } }] }
      });
      console.log(`  Deleted existing tab "${tabTitle}"`);
    }

    const addResp = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: tabTitle,
              gridProperties: { frozenRowCount: 1 }
            }
          }
        }]
      }
    });
    sheetId = addResp.data.replies[0].addSheet.properties.sheetId;
    sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  } else {
    const createResp = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `vFairs H1/H2 Messaging Audit — ${today}` },
        sheets: [{
          properties: {
            title: tabTitle,
            gridProperties: { frozenRowCount: 1 }
          }
        }]
      }
    });
    spreadsheetId = createResp.data.spreadsheetId;
    sheetId = createResp.data.sheets[0].properties.sheetId;
    sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  // Build rows
  const rows = [COLUMNS];
  for (const page of pages) {
    rows.push([
      page.url || '',
      page.current_h1 || '',
      page.assessment || '',
      formatAlternatives(page.alternative_h1s),
      (page.current_top_h2s || []).join('\n'),
      formatAlternatives(page.alternative_h2s)
    ]);
  }

  // Write data
  const writeRange = EXISTING_SPREADSHEET_ID ? `'${tabTitle}'!A1` : `${tabTitle}!A1`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: writeRange,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  });

  // Formatting requests
  const formatRequests = [];

  // Header: dark background, white bold text
  formatRequests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.08, green: 0.08, blue: 0.08 },
          textFormat: {
            foregroundColor: { red: 1, green: 1, blue: 1 },
            bold: true,
            fontSize: 11
          },
          horizontalAlignment: 'LEFT',
          verticalAlignment: 'MIDDLE'
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
    }
  });

  // Header row height
  formatRequests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 36 },
      fields: 'pixelSize'
    }
  });

  // Column widths
  COLUMN_WIDTHS.forEach((width, i) => {
    formatRequests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: width },
        fields: 'pixelSize'
      }
    });
  });

  // Data rows: wrap text, align top
  if (rows.length > 1) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rows.length },
        cell: {
          userEnteredFormat: {
            wrapStrategy: 'WRAP',
            verticalAlignment: 'TOP',
            textFormat: { fontSize: 10 }
          }
        },
        fields: 'userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)'
      }
    });
  }

  // Alternating row colours for readability
  pages.forEach((_, i) => {
    const rowIndex = i + 1;
    const bg = i % 2 === 0
      ? { red: 1, green: 1, blue: 1 }           // white
      : { red: 0.96, green: 0.97, blue: 1.0 };  // very light blue

    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1 },
        cell: { userEnteredFormat: { backgroundColor: bg } },
        fields: 'userEnteredFormat(backgroundColor)'
      }
    });
  });

  // URL column: blue, underline to make links obvious
  if (rows.length > 1) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: {
              foregroundColor: { red: 0.12, green: 0.33, blue: 0.72 },
              underline: true,
              fontSize: 10
            }
          }
        },
        fields: 'userEnteredFormat(textFormat)'
      }
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests }
  });

  // Share with user's Google account
  if (SHARE_EMAIL && !EXISTING_SPREADSHEET_ID) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: SHARE_EMAIL
      },
      sendNotificationEmail: false
    });
    console.log(`  Shared with ${SHARE_EMAIL}`);
  }

  return sheetUrl;
}

async function main() {
  console.log('Loading batch files...');
  const pages = loadAllBatches();
  console.log(`Total pages: ${pages.length}`);

  console.log('Creating Google Sheet...');
  const url = await createSheet(pages);

  console.log('\n✓ Done!');
  console.log(url);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
