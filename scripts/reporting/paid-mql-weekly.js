/**
 * Ad-hoc: Weekly Paid Search MQL trend Jan-May 2026
 * Cross-checks Google Ads conversion drop against actual MQL volume.
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../.config/google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';

const COLUMNS = {
  YEAR: 0, MONTH: 1, DATE: 2, ORIGINAL_SOURCE: 3, SOURCE_DRILL_1: 4,
  SOURCE_DRILL_2: 5, MEETING_BOOKED: 12,
};

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

function fmt(d) { return d.toISOString().slice(0, 10); }

(async () => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: 'MQL!A:Z',
  });
  const rows = (resp.data.values || []).slice(1);

  const start = new Date('2026-01-01');
  const end = new Date('2026-05-08T23:59:59Z');

  // Identify what counts as "paid". Print distinct source + drill1 to be sure.
  const sourceCounts = {};
  rows.forEach(r => {
    const d = new Date(r[COLUMNS.DATE]);
    if (isNaN(d) || d < start || d > end) return;
    const key = `${r[COLUMNS.ORIGINAL_SOURCE]||''} | ${r[COLUMNS.SOURCE_DRILL_1]||''}`;
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  });

  console.log('=== Top 25 source combinations Jan-May 2026 ===');
  Object.entries(sourceCounts).sort((a,b)=>b[1]-a[1]).slice(0,25)
    .forEach(([k,v]) => console.log(`  ${v}\t${k}`));

  // Filter to Paid Search — HubSpot stores this as PAID_SEARCH
  const isPaidSearch = (r) => {
    const s = (r[COLUMNS.ORIGINAL_SOURCE] || '').toUpperCase().trim();
    return s === 'PAID_SEARCH';
  };

  const paid = rows.filter(r => {
    const d = new Date(r[COLUMNS.DATE]);
    if (isNaN(d) || d < start || d > end) return false;
    return isPaidSearch(r);
  });

  console.log(`\n=== Paid Search MQLs Jan-May 2026: ${paid.length} ===`);

  // Weekly bucket
  const buckets = {};
  paid.forEach(r => {
    const wk = fmt(startOfWeek(new Date(r[COLUMNS.DATE])));
    if (!buckets[wk]) buckets[wk] = { count: 0, meetings: 0 };
    buckets[wk].count++;
    const m = String(r[COLUMNS.MEETING_BOOKED] || '').toLowerCase();
    if (m === 'true' || m === 'yes' || m === '1') buckets[wk].meetings++;
  });

  console.log('\nWeek\t\tMQLs\tMeetings\tMeeting%');
  Object.keys(buckets).sort().forEach(wk => {
    const b = buckets[wk];
    const pct = (100 * b.meetings / b.count).toFixed(1);
    console.log(`${wk}\t${b.count}\t${b.meetings}\t\t${pct}%`);
  });

  // Also: All MQLs by week (paid + organic + everything) for context
  const allBuckets = {};
  rows.forEach(r => {
    const d = new Date(r[COLUMNS.DATE]);
    if (isNaN(d) || d < start || d > end) return;
    const wk = fmt(startOfWeek(d));
    allBuckets[wk] = (allBuckets[wk] || 0) + 1;
  });
  console.log('\n=== Total MQLs by week ===');
  console.log('Week\t\tAll MQLs');
  Object.keys(allBuckets).sort().forEach(wk => {
    console.log(`${wk}\t${allBuckets[wk]}`);
  });
})().catch(e => { console.error(e); process.exit(1); });
