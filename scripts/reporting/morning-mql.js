/**
 * Morning Report - MQL MTD Count + End-of-Month Projection
 *
 * Fetches current month's MQL count from Google Sheets and projects
 * to end of month based on run rate.
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';

const COLUMNS = {
  YEAR: 0,
  MONTH: 1,
  DATE: 2,
  MEETING_BOOKED: 12,
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function getAuth() {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return auth;
}

async function fetchMQLMTD() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const todayDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'A2:Z',
  });

  const rows = response.data.values || [];

  let mtdCount = 0;
  let mtdMeetings = 0;

  // Also gather last month for comparison
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  let lastMonthCount = 0;

  for (const row of rows) {
    const year = parseInt(row[COLUMNS.YEAR]);
    const month = parseInt(row[COLUMNS.MONTH]);

    if (year === currentYear && month === currentMonth) {
      mtdCount++;
      if (row[COLUMNS.MEETING_BOOKED] === 'Yes') mtdMeetings++;
    }

    if (year === lastMonthYear && month === lastMonth) {
      lastMonthCount++;
    }
  }

  const meetingRate = mtdCount > 0 ? ((mtdMeetings / mtdCount) * 100).toFixed(1) : '0.0';
  const dailyRunRate = mtdCount / todayDay;
  const projection = Math.round(dailyRunRate * daysInMonth);
  const daysRemaining = daysInMonth - todayDay;

  return {
    currentMonth: MONTH_NAMES[currentMonth - 1],
    currentYear,
    todayDay,
    daysInMonth,
    daysRemaining,
    mtdCount,
    mtdMeetings,
    meetingRate,
    projection,
    dailyRunRate: dailyRunRate.toFixed(1),
    lastMonthCount,
    lastMonth: MONTH_NAMES[lastMonth - 1],
  };
}

fetchMQLMTD()
  .then(d => {
    const projDiff = d.projection - d.lastMonthCount;
    const projSymbol = projDiff >= 0 ? '↑' : '↓';

    console.log(`📊 MQL MTD — ${d.currentMonth} ${d.currentYear}`);
    console.log(`   ${d.mtdCount} MQLs through Day ${d.todayDay} of ${d.daysInMonth}`);
    console.log(`   Run rate: ${d.dailyRunRate}/day → Projected EOM: ${d.projection}`);
    console.log(`   Meeting rate: ${d.meetingRate}% (${d.mtdMeetings}/${d.mtdCount} booked)`);
    console.log(`   ${d.lastMonth} final: ${d.lastMonthCount} → ${projSymbol}${Math.abs(projDiff)} vs last month`);
  })
  .catch(err => {
    console.error('MQL fetch failed:', err.message);
    process.exit(1);
  });
