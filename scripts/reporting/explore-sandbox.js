/**
 * Sandbox Sheet Explorer
 * Reads the vFairs Sandbox Sheet to understand structure and find top customers
 */

const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SHEET_ID = '1BOVlYWUzio3X5Qnwec-iXb1CF1rbe1PeRvAE-HpdS88';

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // First: list all sheet tabs
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabs = meta.data.sheets.map(s => s.properties.title);
  console.log('=== SHEET TABS ===');
  tabs.forEach((t, i) => console.log(`  [${i}] ${t}`));

  // Read first 5 rows of each tab to understand structure
  for (const tab of tabs) {
    console.log(`\n=== TAB: "${tab}" — first 5 rows ===`);
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${tab}'!A1:Z5`,
      });
      const rows = res.data.values || [];
      rows.forEach((row, i) => console.log(`  Row ${i + 1}:`, row));
    } catch (e) {
      console.log(`  ERROR reading tab: ${e.message}`);
    }
  }
}

main().catch(console.error);
