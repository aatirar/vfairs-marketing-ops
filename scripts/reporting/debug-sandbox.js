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

  // Check how many rows actually exist
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const rawSheet = meta.data.sheets.find(s => s.properties.title === 'Raw Data');
  console.log('Raw Data sheet grid size:', rawSheet.properties.gridProperties);

  // Pull a larger range
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Raw Data'!A1:Z50000",
  });
  const rows = res.data.values || [];
  console.log('Total rows returned:', rows.length);

  // Check unique years in col 24 (index 24)
  const years = {};
  rows.slice(1).forEach(r => {
    const y = r[24];
    if (y) years[y] = (years[y] || 0) + 1;
  });
  console.log('\nYear distribution (col 24):', years);

  // Also check col 21 (Booking Date) for a sample
  console.log('\nSample rows (rows 2-6):');
  rows.slice(1, 6).forEach((r, i) => {
    console.log(`Row ${i+2}: Year=${r[24]}, BookingDate=${r[21]}, BookingDateFmt=${r[22]}, Customer=${r[2]}, Amount=${r[6]}`);
  });

  // Check last 5 rows
  console.log('\nLast 5 data rows:');
  rows.slice(-5).forEach((r, i) => {
    console.log(`Row: Year=${r[24]}, BookingDate=${r[21]}, Customer=${r[2]}, Amount=${r[6]}`);
  });
}

main().catch(console.error);
