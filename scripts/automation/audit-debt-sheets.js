/**
 * audit-debt-sheets.js
 *
 * Creates a new Google Spreadsheet with marketing debt action items.
 * Reads action items from a JSON file and writes them to a formatted sheet.
 *
 * Usage: node audit-debt-sheets.js <path-to-action-items.json>
 * Output: Google Sheets URL printed to stdout
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');

// Optional: set GOOGLE_SHEETS_SHARE_EMAIL in .env to auto-share the sheet with your account
const SHARE_EMAIL = process.env.GOOGLE_SHEETS_SHARE_EMAIL || null;

// Optional: set AUDIT_DEBT_SPREADSHEET_ID in .env to write a new tab into an existing spreadsheet
// (needed when the service account can't create new Drive files due to storage quota)
// To use: create a blank Google Sheet in your own Drive, share it with the service account as Editor,
// then set AUDIT_DEBT_SPREADSHEET_ID to its ID (from the URL)
const EXISTING_SPREADSHEET_ID = process.env.AUDIT_DEBT_SPREADSHEET_ID || null;

const COLUMNS = [
  'Date Detected',
  'JIRA ID',
  'Feature Name',
  'Module',
  'App',
  'Tags',
  'Deploy Date',
  'KB Article',
  'Significance',
  'Skip Reason',
  'Affected Pages',
  'Action Type',
  'Specific Action',
  'Suggested Copy / Notes',
  'Competitor Positioning',
  'Proposed Messaging (Pierri)',
  'Priority',
  'Status'
];

// Column widths in pixels
const COLUMN_WIDTHS = [
  120, // Date Detected
  90,  // JIRA ID
  260, // Feature Name
  160, // Module
  120, // App
  180, // Tags
  130, // Deploy Date
  200, // KB Article
  100, // Significance
  200, // Skip Reason
  300, // Affected Pages
  150, // Action Type
  400, // Specific Action
  400, // Suggested Copy
  450, // Competitor Positioning
  450, // Proposed Messaging
  80,  // Priority
  100  // Status
];

// Column index constants (0-based) — update if COLUMNS array changes
const COL = {
  DATE: 0, JIRA: 1, FEATURE: 2, MODULE: 3, APP: 4, TAGS: 5,
  DEPLOY: 6, KB: 7, SIG: 8, SKIP: 9, PAGES: 10,
  ACTION_TYPE: 11, SPECIFIC: 12, SUGGESTED: 13,
  COMPETITOR: 14, MESSAGING: 15, PRIORITY: 16, STATUS: 17
};

const STATUS_DROPDOWN = ['New', 'In Progress', 'Done', 'Wont Fix'];
const PRIORITY_DROPDOWN = ['P0', 'P1', 'P2'];
const ACTION_TYPE_DROPDOWN = [
  'Update Copy',
  'Add Section',
  'New Page',
  'Update Screenshot',
  'Add Feature Bullet',
  'Update Headline',
  'Add FAQ Entry',
  'No Action Needed'
];

function getHeaderStyle() {
  return {
    backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
    textFormat: {
      foregroundColor: { red: 1, green: 1, blue: 1 },
      bold: true,
      fontSize: 11
    },
    horizontalAlignment: 'LEFT',
    verticalAlignment: 'MIDDLE'
  };
}

function getRowStyle(isSkipped) {
  if (isSkipped) {
    return {
      backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
      textFormat: { foregroundColor: { red: 0.6, green: 0.6, blue: 0.6 } }
    };
  }
  return null;
}

function significanceColor(sig) {
  if (sig === 'high') return { red: 0.85, green: 0.93, blue: 0.83 }; // green
  if (sig === 'medium') return { red: 1.0, green: 0.95, blue: 0.8 };  // yellow
  if (sig === 'skip') return { red: 0.95, green: 0.95, blue: 0.95 };  // grey
  return null;
}

async function createSheet(actionItems) {
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
  const tabTitle = `Audit ${today}`;

  let spreadsheetId, sheetId, sheetUrl;

  if (EXISTING_SPREADSHEET_ID) {
    // Add a new tab to the existing spreadsheet
    spreadsheetId = EXISTING_SPREADSHEET_ID;
    const addSheetResp = await sheets.spreadsheets.batchUpdate({
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
    sheetId = addSheetResp.data.replies[0].addSheet.properties.sheetId;
    sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
  } else {
    // Create a new spreadsheet (requires service account to have Drive storage)
    const createResp = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `Marketing Debt Tracker — ${today}` },
        sheets: [{
          properties: {
            title: 'Action Items',
            gridProperties: { frozenRowCount: 1 }
          }
        }]
      }
    });
    spreadsheetId = createResp.data.spreadsheetId;
    sheetId = createResp.data.sheets[0].properties.sheetId;
    sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }

  // 2. Prepare row data
  const rows = [COLUMNS]; // header row

  for (const item of actionItems) {
    rows.push([
      today,
      item.jiraId || '',
      item.featureName || '',
      item.module || '',
      item.app || '',
      (item.tags || []).join(', '),
      item.deploymentDate || '',
      item.kbArticleUrl || '',
      item.significance || '',
      item.skipReason || '',
      (item.affectedPages || []).join('\n'),
      item.actionType || '',
      item.specificAction || '',
      item.suggestedCopy || '',
      item.competitorPositioning || '',
      item.proposedMessaging || '',
      item.priority || '',
      'New'
    ]);
  }

  // 3. Write all data
  const writeRange = EXISTING_SPREADSHEET_ID ? `'${tabTitle}'!A1` : 'Action Items!A1';
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: writeRange,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  });

  // 4. Apply formatting
  const formatRequests = [];

  // Header row style
  formatRequests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: getHeaderStyle() },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
    }
  });

  // Set row height for header
  formatRequests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 32 },
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

  // Data row wrap + valign top
  if (rows.length > 1) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rows.length },
        cell: {
          userEnteredFormat: {
            wrapStrategy: 'WRAP',
            verticalAlignment: 'TOP'
          }
        },
        fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
      }
    });
  }

  // Color significance column (column I = index 8) per significance level
  actionItems.forEach((item, i) => {
    const rowIndex = i + 1;
    const color = significanceColor(item.significance);
    if (color) {
      formatRequests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: COL.SIG, endColumnIndex: COL.SIG + 1 },
          cell: { userEnteredFormat: { backgroundColor: color } },
          fields: 'userEnteredFormat(backgroundColor)'
        }
      });
    }
    // Dim entire row if skipped
    if (item.significance === 'skip') {
      formatRequests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1 },
          cell: { userEnteredFormat: getRowStyle(true) },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });
    }
  });

  // Status dropdown
  formatRequests.push({
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: COL.STATUS, endColumnIndex: COL.STATUS + 1 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: STATUS_DROPDOWN.map(v => ({ userEnteredValue: v })) },
        strict: true, showCustomUi: true
      }
    }
  });

  // Priority dropdown
  formatRequests.push({
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: COL.PRIORITY, endColumnIndex: COL.PRIORITY + 1 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: PRIORITY_DROPDOWN.map(v => ({ userEnteredValue: v })) },
        strict: true, showCustomUi: true
      }
    }
  });

  // Action Type dropdown
  formatRequests.push({
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: COL.ACTION_TYPE, endColumnIndex: COL.ACTION_TYPE + 1 },
      rule: {
        condition: { type: 'ONE_OF_LIST', values: ACTION_TYPE_DROPDOWN.map(v => ({ userEnteredValue: v })) },
        strict: false, showCustomUi: true
      }
    }
  });

  // Competitor Positioning + Proposed Messaging — teal header to visually group them
  formatRequests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: COL.COMPETITOR, endColumnIndex: COL.MESSAGING + 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.05, green: 0.39, blue: 0.45 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)'
    }
  });

  // Apply KB Article as hyperlink formula if possible
  // (already written as plain text — hyperlink formatting would require separate pass)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: formatRequests }
  });

  // 5. Share with user email if configured (only needed when creating a new file)
  if (SHARE_EMAIL && !EXISTING_SPREADSHEET_ID) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: SHARE_EMAIL
      },
      sendNotificationEmail: false
    });
  }

  return { spreadsheetId, sheetUrl, title: tabTitle };
}

// Main
const inputFile = process.argv[2];
if (!inputFile) {
  process.stderr.write('Usage: node audit-debt-sheets.js <path-to-action-items.json>\n');
  process.exit(1);
}

let actionItems;
try {
  actionItems = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
} catch (err) {
  process.stderr.write(`Failed to read input file: ${err.message}\n`);
  process.exit(1);
}

createSheet(actionItems).then(({ sheetUrl, title }) => {
  process.stdout.write(`\n✅ Sheet created: ${title}\n📊 ${sheetUrl}\n`);
}).catch(err => {
  process.stderr.write(`Google Sheets error: ${err.message}\n`);
  process.exit(1);
});
