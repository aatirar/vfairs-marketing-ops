/**
 * lp-rewrite-sheets.js
 *
 * Pushes a /re-write skill output into the "Site Change log" tab of the
 * LP_CVR_HubSpot_SQL_Feb_Apr2026 Google Sheet (or any sheet ID set via
 * LP_REWRITE_SHEET_ID env var).
 *
 * Reads a JSON payload (one rewrite = one payload), upserts the matching URL
 * row in the Site Change log tab, and preserves manually-set Status values.
 *
 * On first run it migrates the legacy 7-column header to the extended schema
 * below without dropping existing data.
 *
 * Usage:
 *   node lp-rewrite-sheets.js <payload.json>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SPREADSHEET_ID = process.env.LP_REWRITE_SHEET_ID || '1Ggx4vh5a9RuF5NN4uFym5gF59d4Wg1CrsognSIadTn0';
const TAB_NAME = 'Site Change log';

const MAX_BODY_H3 = 10;
const MAX_FAQ = 10;

function buildHeader() {
  const cols = ['Page URL', 'Status', 'Date Updated', 'Notes'];
  cols.push('Eyebrow Original', 'Eyebrow Revised');
  cols.push('H1 Original', 'H1 Revised');
  cols.push('H1 Subhead Original', 'H1 Subhead Revised');
  cols.push('Main H2 Original', 'Main H2 Revised');
  cols.push('Main H2 Subhead Original', 'Main H2 Subhead Revised');
  for (let i = 1; i <= MAX_BODY_H3; i++) {
    cols.push(`H3 #${i} Original`, `H3 #${i} Revised`);
  }
  cols.push('Final CTA H2 Original', 'Final CTA H2 Revised');
  cols.push('Final CTA H3 Original', 'Final CTA H3 Revised');
  for (let i = 1; i <= MAX_FAQ; i++) {
    cols.push(`FAQ #${i} Original`, `FAQ #${i} Revised`);
  }
  return cols;
}

function normalizeUrl(url) {
  if (!url) return '';
  return String(url)
    .replace(/^https?:\/\/(www\.)?vfairs\.com/i, '')
    .replace(/\/$/, '')
    .trim()
    .toLowerCase();
}

function setCell(row, header, colName, value) {
  const idx = header.indexOf(colName);
  if (idx >= 0) row[idx] = value == null ? '' : String(value);
}

function setPair(row, header, prefix, original, revised) {
  setCell(row, header, `${prefix} Original`, original || '');
  setCell(row, header, `${prefix} Revised`, revised || '');
}

function buildRowFromPayload(payload, header) {
  const row = new Array(header.length).fill('');
  setCell(row, header, 'Page URL', payload.url);
  setCell(row, header, 'Status', payload.status || '');
  setCell(row, header, 'Date Updated', payload.date_updated || new Date().toISOString().split('T')[0]);
  setCell(row, header, 'Notes', payload.notes || '');

  const e = payload.elements || {};
  if (e.eyebrow) setPair(row, header, 'Eyebrow', e.eyebrow.original, e.eyebrow.revised);
  if (e.h1) setPair(row, header, 'H1', e.h1.original, e.h1.revised);
  if (e.h1_subhead) setPair(row, header, 'H1 Subhead', e.h1_subhead.original, e.h1_subhead.revised);
  if (e.main_h2) setPair(row, header, 'Main H2', e.main_h2.original, e.main_h2.revised);
  if (e.main_h2_subhead) setPair(row, header, 'Main H2 Subhead', e.main_h2_subhead.original, e.main_h2_subhead.revised);

  (e.body_h3s || []).forEach((h, i) => {
    if (i < MAX_BODY_H3) setPair(row, header, `H3 #${i + 1}`, h.original, h.revised);
  });

  if (e.final_cta_h2) setPair(row, header, 'Final CTA H2', e.final_cta_h2.original, e.final_cta_h2.revised);
  if (e.final_cta_h3) setPair(row, header, 'Final CTA H3', e.final_cta_h3.original, e.final_cta_h3.revised);

  (e.faq_h3s || []).forEach((h, i) => {
    if (i < MAX_FAQ) setPair(row, header, `FAQ #${i + 1}`, h.original, h.revised);
  });

  return row;
}

const LEGACY_TO_NEW = {
  'Page URL': 'Page URL',
  'Status': 'Status',
  'Changes': 'Notes',
  'H1': 'H1 Original',
  'Revised H1': 'H1 Revised',
  'H1 Subhead': 'H1 Subhead Original',
  'Revised H1 Subhead': 'H1 Subhead Revised'
};

function migrateRow(oldHeader, oldRow, newHeader) {
  const newRow = new Array(newHeader.length).fill('');
  oldHeader.forEach((oldCol, i) => {
    const newCol = LEGACY_TO_NEW[oldCol] || (newHeader.includes(oldCol) ? oldCol : null);
    if (!newCol) return;
    const newIdx = newHeader.indexOf(newCol);
    if (newIdx >= 0 && oldRow[i] != null) newRow[newIdx] = oldRow[i];
  });
  return newRow;
}

async function getSheetId(sheets, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tab = meta.data.sheets.find(s => s.properties.title === title);
  if (!tab) throw new Error(`Tab "${title}" not found in spreadsheet`);
  return tab.properties.sheetId;
}

async function main() {
  const payloadPath = process.argv[2];
  if (!payloadPath) {
    console.error('Usage: node lp-rewrite-sheets.js <payload.json>');
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  if (!payload.url) {
    console.error('Payload missing required "url" field');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  const newHeader = buildHeader();

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'`
  });
  const allRows = resp.data.values || [];
  const oldHeader = allRows[0] || [];
  const oldDataRows = allRows.slice(1);

  const migratedRows = oldDataRows.map(r => migrateRow(oldHeader, r, newHeader));

  const targetUrlNorm = normalizeUrl(payload.url);
  let foundIndex = -1;
  for (let i = 0; i < migratedRows.length; i++) {
    if (normalizeUrl(migratedRows[i][0]) === targetUrlNorm) {
      foundIndex = i;
      break;
    }
  }

  const newRow = buildRowFromPayload(payload, newHeader);

  if (foundIndex >= 0) {
    const statusIdx = newHeader.indexOf('Status');
    const existingStatus = migratedRows[foundIndex][statusIdx];
    if (!payload.status && existingStatus) newRow[statusIdx] = existingStatus;
    migratedRows[foundIndex] = newRow;
  } else {
    migratedRows.push(newRow);
  }

  const finalRows = [newHeader, ...migratedRows];

  const sheetId = await getSheetId(sheets, TAB_NAME);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        { updateSheetProperties: { properties: { sheetId, gridProperties: { columnCount: Math.max(newHeader.length, 26) } }, fields: 'gridProperties.columnCount' } }
      ]
    }
  });

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1`,
    valueInputOption: 'RAW',
    resource: { values: finalRows }
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 }, wrapStrategy: 'WRAP' } },
            fields: 'userEnteredFormat(textFormat,backgroundColor,wrapStrategy)'
          }
        },
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1 },
            cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
            fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
          }
        }
      ]
    }
  });

  console.log(`✓ Updated "${TAB_NAME}" for ${payload.url}`);
  console.log(`  ${foundIndex >= 0 ? 'Updated existing row' : 'Appended new row'} (row ${(foundIndex >= 0 ? foundIndex : migratedRows.length - 1) + 2})`);
  console.log(`  Schema: ${newHeader.length} columns, ${finalRows.length - 1} data rows`);
}

main().catch(err => {
  console.error('Error:', err.message);
  if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
