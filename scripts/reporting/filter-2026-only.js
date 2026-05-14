const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const INPUT_CSV = path.join(DATA_DIR, 'mqls-ytd-2026.csv');
const OUTPUT_CSV = path.join(DATA_DIR, 'mqls-ytd-2026-clean.csv');

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

console.log('Filtering 2026 MQLs only...\n');

const content = fs.readFileSync(INPUT_CSV, 'utf8');
const lines = content.split('\n');

const outputLines = [lines[0]]; // Keep header
let count2026 = 0;
let countOther = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const values = parseCSVLine(line);
  if (values.length < 5) continue;

  const createDate = values[4]; // Column 5 = Create Date

  if (createDate && createDate.startsWith('2026-')) {
    outputLines.push(line);
    count2026++;
  } else {
    countOther++;
  }
}

fs.writeFileSync(OUTPUT_CSV, outputLines.join('\n') + '\n', 'utf8');

console.log(`✓ Filtered ${count2026} MQLs from 2026`);
console.log(`✓ Removed ${countOther} MQLs from other years`);
console.log(`✓ Output: ${OUTPUT_CSV}`);
