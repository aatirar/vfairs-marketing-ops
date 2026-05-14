const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function analyzeFile(filePath, label) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length < 2) return;

  const header = parseCSVLine(lines[0]);
  let totalMQLs = 0;
  let withMeetings = 0;
  let withDeals = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 10) continue;

    totalMQLs++;

    // Column 16 (index 16) = Date of last meeting booked
    if (values[16] && values[16].trim()) {
      withMeetings++;
    }

    // Column 17 (index 17) = Number of Associated Deals
    const deals = values[17] ? values[17].trim() : '';
    if (deals && deals !== '0' && deals !== '0.0') {
      withDeals++;
    }
  }

  const meetingRate = totalMQLs > 0 ? ((withMeetings / totalMQLs) * 100).toFixed(1) : 0;
  const dealRate = totalMQLs > 0 ? ((withDeals / totalMQLs) * 100).toFixed(1) : 0;

  console.log(`\n${label}:`);
  console.log(`  Total MQLs: ${totalMQLs}`);
  console.log(`  MQLs with meetings: ${withMeetings} (${meetingRate}%)`);
  console.log(`  MQLs with deals: ${withDeals} (${dealRate}%)`);
}

console.log('='.repeat(60));
console.log('MQL DATA VERIFICATION');
console.log('='.repeat(60));

analyzeFile(path.join(DATA_DIR, 'mqls-ytd-2026.csv'), '2026 (Jan 1-15)');
analyzeFile(path.join(DATA_DIR, 'mqls-jan-2025.csv'), '2025 (Jan 1-15)');

console.log('\n' + '='.repeat(60));
