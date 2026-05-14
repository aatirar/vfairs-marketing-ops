const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const HUBSPOT_EXPORT = path.join(DATA_DIR, 'hubspot-crm-exports-ytd-mqls-2026-2026-01-15.csv');
const OUTPUT_CSV = path.join(DATA_DIR, 'mqls-ytd-2026.csv');

// Our simplified CSV header (18 columns)
const SIMPLIFIED_HEADER = [
  'Record ID',
  'Email',
  'First Name',
  'Last Name',
  'Create Date',
  'Company Name',
  'Job Title',
  'Annual Revenue',
  'Original Source',
  'Original Source Drill-Down 1',
  'Original Source Drill-Down 2',
  'First Conversion',
  'First Page Seen',
  'Last Page Seen',
  'What kind of event are you planning',
  'Product Type',
  'Date of last meeting booked in meetings tool',
  'Number of Associated Deals'
].join(',');

/**
 * Parse CSV line (handles quoted fields with commas)
 */
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

/**
 * Escape CSV value
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert HubSpot export to simplified format
 */
function convertHubSpotExport() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     CONVERT HUBSPOT EXPORT TO SIMPLIFIED FORMAT           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Read HubSpot export
    console.log('📂 Reading HubSpot export...');
    const content = fs.readFileSync(HUBSPOT_EXPORT, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      console.error('❌ Export file is empty or invalid');
      return;
    }

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]);
    console.log(`   ✓ Found ${header.length} columns in HubSpot export\n`);

    // Map our columns to HubSpot export columns
    const columnMap = {
      'Record ID': header.indexOf('Record ID'),
      'Email': -1, // Not in export, will leave empty
      'First Name': header.indexOf('First Name'),
      'Last Name': header.indexOf('Last Name'),
      'Create Date': header.indexOf('Create Date'),
      'Company Name': header.indexOf('Company Name'),
      'Job Title': header.indexOf('Job Title'),
      'Annual Revenue': header.indexOf('Annual Revenue'),
      'Original Source': header.indexOf('Original Source'),
      'Original Source Drill-Down 1': header.indexOf('Original Source Drill-Down 1'),
      'Original Source Drill-Down 2': header.indexOf('Original Source Drill-Down 2'),
      'First Conversion': header.indexOf('First Conversion'),
      'First Page Seen': header.indexOf('First Page Seen'),
      'Last Page Seen': header.indexOf('Last Page Seen'),
      'What kind of event are you planning': header.indexOf('What kind of event are you planning'),
      'Product Type': header.indexOf('Product Type'),
      'Date of last meeting booked in meetings tool': header.indexOf('Date of last meeting booked in meetings tool'),
      'Number of Associated Deals': header.indexOf('Number of Associated Deals')
    };

    console.log('📊 Converting rows...');
    const outputRows = [SIMPLIFIED_HEADER];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length < header.length / 2) {
        // Skip malformed rows
        continue;
      }

      const row = [
        escapeCsvValue(values[columnMap['Record ID']] || ''),
        '', // Email not in export
        escapeCsvValue(values[columnMap['First Name']] || ''),
        escapeCsvValue(values[columnMap['Last Name']] || ''),
        escapeCsvValue(values[columnMap['Create Date']] || ''),
        escapeCsvValue(values[columnMap['Company Name']] || ''),
        escapeCsvValue(values[columnMap['Job Title']] || ''),
        escapeCsvValue(values[columnMap['Annual Revenue']] || ''),
        escapeCsvValue(values[columnMap['Original Source']] || ''),
        escapeCsvValue(values[columnMap['Original Source Drill-Down 1']] || ''),
        escapeCsvValue(values[columnMap['Original Source Drill-Down 2']] || ''),
        escapeCsvValue(values[columnMap['First Conversion']] || ''),
        escapeCsvValue(values[columnMap['First Page Seen']] || ''),
        escapeCsvValue(values[columnMap['Last Page Seen']] || ''),
        escapeCsvValue(values[columnMap['What kind of event are you planning']] || ''),
        escapeCsvValue(values[columnMap['Product Type']] || ''),
        escapeCsvValue(values[columnMap['Date of last meeting booked in meetings tool']] || ''),
        escapeCsvValue(values[columnMap['Number of Associated Deals']] || '0')
      ];

      outputRows.push(row.join(','));
    }

    console.log(`   ✓ Converted ${outputRows.length - 1} MQLs\n`);

    // Write output
    console.log('💾 Writing simplified CSV...');
    fs.writeFileSync(OUTPUT_CSV, outputRows.join('\n') + '\n', 'utf8');
    console.log(`   ✓ Saved to: ${OUTPUT_CSV}\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Successfully created master CSV with ${outputRows.length - 1} MQLs`);
    console.log(`   Format: 18 columns (simplified)`);
    console.log(`   Ready for incremental fetch to append new MQLs\n`);
    console.log('🎉 Conversion complete!\n');

  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

convertHubSpotExport();
