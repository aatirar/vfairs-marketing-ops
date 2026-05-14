const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../../.config/google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';

async function checkData() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:Z',
  });

  const rows = response.data.values.slice(1);

  console.log('Sample of Revenue and ICP Score data:\n');
  console.log('Company                    | Revenue           | ICP Score');
  console.log('='.repeat(70));

  rows.slice(0, 20).forEach(row => {
    const company = (row[17] || '').substring(0, 25).padEnd(25);
    const revenue = (row[18] || 'N/A').substring(0, 16).padEnd(16);
    const icp = (row[11] || 'N/A').padEnd(10);
    console.log(`${company} | ${revenue} | ${icp}`);
  });

  // Check for any high revenue
  console.log('\n\nHigh Revenue Contacts (with "Million" or "Billion"):');
  const highRevenue = rows.filter(row => {
    const rev = row[18] || '';
    return rev.includes('Million') || rev.includes('Billion');
  }).slice(0, 10);

  if (highRevenue.length > 0) {
    highRevenue.forEach(row => {
      console.log(`  ${row[17]}: ${row[18]} | ICP: ${row[11]}`);
    });
  } else {
    console.log('  None found with "Million" or "Billion"');
  }

  console.log('\n\nHigh ICP Contacts (60+):');
  const highICP = rows.filter(row => parseInt(row[11]) >= 60).slice(0, 10);
  if (highICP.length > 0) {
    highICP.forEach(row => {
      console.log(`  ${row[17]}: ICP ${row[11]} | Revenue: ${row[18]}`);
    });
  } else {
    console.log('  None found with ICP >= 60');
  }

  console.log('\n\nRevenue value distribution:');
  const revenueValues = rows.map(row => row[18]).filter(r => r);
  const sample = [...new Set(revenueValues)].slice(0, 20);
  console.log('  Sample values:', sample.join(', '));

  console.log('\n\nICP Score distribution:');
  const icpValues = rows.map(row => row[11]).filter(r => r);
  const icpSample = [...new Set(icpValues)].slice(0, 20);
  console.log('  Sample values:', icpSample.join(', '));
}

checkData().catch(err => console.error(err));
