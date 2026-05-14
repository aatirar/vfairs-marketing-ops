const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const CSV_2026 = path.join(DATA_DIR, 'mqls-ytd-2026.csv');
const CSV_2025 = path.join(DATA_DIR, 'mqls-jan-2025.csv');
const REPORT_OUTPUT = path.join(DATA_DIR, 'mql-analysis-report.md');

/**
 * Parse CSV file (simple parser for our format)
 */
function parseCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return [];
    }

    // Parse header
    const header = parseCSVLine(lines[0]);

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === header.length) {
        const row = {};
        header.forEach((key, idx) => {
          row[key.trim()] = values[idx];
        });
        rows.push(row);
      }
    }

    return rows;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return [];
  }
}

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
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Extract month from date string (format: "2026-01-15 10:55" or ISO)
 */
function getMonth(dateString) {
  if (!dateString) return 'Unknown';

  // Handle both formats: "2026-01-15 10:55" and ISO
  const match = dateString.match(/(\d{4})-(\d{2})/);
  if (match) {
    const year = match[1];
    const month = match[2];
    return `${year}-${month}`;
  }

  return 'Unknown';
}

/**
 * Get month name from YYYY-MM format
 */
function getMonthName(yearMonth) {
  if (yearMonth === 'Unknown') return 'Unknown';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [year, month] = yearMonth.split('-');
  const monthName = months[parseInt(month, 10) - 1];

  return `${monthName} ${year}`;
}

/**
 * Analyze MQL data
 */
function analyzeMQLs(mqls, year) {
  const analysis = {
    total: mqls.length,
    byMonth: {},
    bySource: {},
    byProductType: {},
    byEventType: {},
    withMeetings: 0,
    withDeals: 0,
    avgDealsPerMQL: 0,
    topSources: [],
    topProducts: [],
    topEvents: []
  };

  let totalDeals = 0;

  mqls.forEach(mql => {
    // Monthly breakdown
    const month = getMonth(mql['Create Date']);
    analysis.byMonth[month] = (analysis.byMonth[month] || 0) + 1;

    // Source analysis
    const source = mql['Original Source'] || 'Unknown';
    analysis.bySource[source] = (analysis.bySource[source] || 0) + 1;

    // Product type
    const productType = mql['Product Type'] || 'Not specified';
    analysis.byProductType[productType] = (analysis.byProductType[productType] || 0) + 1;

    // Event type
    const eventType = mql['What kind of event are you planning'] || 'Not specified';
    analysis.byEventType[eventType] = (analysis.byEventType[eventType] || 0) + 1;

    // Meeting booked
    if (mql['Date of last meeting booked in meetings tool']) {
      analysis.withMeetings++;
    }

    // Deals
    const deals = parseInt(mql['Number of Associated Deals'] || '0', 10);
    if (deals > 0) {
      analysis.withDeals++;
      totalDeals += deals;
    }
  });

  // Calculate averages
  analysis.avgDealsPerMQL = mqls.length > 0 ? (totalDeals / mqls.length).toFixed(2) : 0;
  analysis.meetingRate = mqls.length > 0 ? ((analysis.withMeetings / mqls.length) * 100).toFixed(1) : 0;
  analysis.dealRate = mqls.length > 0 ? ((analysis.withDeals / mqls.length) * 100).toFixed(1) : 0;

  // Top sources
  analysis.topSources = Object.entries(analysis.bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count, percentage: ((count / mqls.length) * 100).toFixed(1) }));

  // Top products
  analysis.topProducts = Object.entries(analysis.byProductType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product, count]) => ({ product, count, percentage: ((count / mqls.length) * 100).toFixed(1) }));

  // Top event types
  analysis.topEvents = Object.entries(analysis.byEventType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([event, count]) => ({ event, count, percentage: ((count / mqls.length) * 100).toFixed(1) }));

  return analysis;
}

/**
 * Generate markdown report
 */
function generateReport(analysis2026, analysis2025) {
  const now = new Date();

  // Calculate YoY changes
  const yoyChange = analysis2026.total - analysis2025.total;
  const yoyPercentage = analysis2025.total > 0
    ? (((analysis2026.total - analysis2025.total) / analysis2025.total) * 100).toFixed(1)
    : 'N/A';

  const meetingRateChange = (parseFloat(analysis2026.meetingRate) - parseFloat(analysis2025.meetingRate)).toFixed(1);
  const dealRateChange = (parseFloat(analysis2026.dealRate) - parseFloat(analysis2025.dealRate)).toFixed(1);

  let report = `# vFairs MQL Analysis Report

**Generated:** ${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}

**Period:** January 1-15 (2026 vs 2025)

---

## Executive Summary

### Year-over-Year Performance (January 1-15)

| Metric | Jan 2026 | Jan 2025 | Change | % Change |
|--------|----------|----------|--------|----------|
| **Total MQLs** | ${analysis2026.total.toLocaleString()} | ${analysis2025.total.toLocaleString()} | ${yoyChange >= 0 ? '+' : ''}${yoyChange.toLocaleString()} | ${yoyChange >= 0 ? '📈' : '📉'} ${yoyPercentage}% |
| **Meeting Rate** | ${analysis2026.meetingRate}% | ${analysis2025.meetingRate}% | ${meetingRateChange >= 0 ? '+' : ''}${meetingRateChange}% | ${meetingRateChange >= 0 ? '📈' : '📉'} |
| **Deal Rate** | ${analysis2026.dealRate}% | ${analysis2025.dealRate}% | ${dealRateChange >= 0 ? '+' : ''}${dealRateChange}% | ${dealRateChange >= 0 ? '📈' : '📉'} |
| **Avg Deals/MQL** | ${analysis2026.avgDealsPerMQL} | ${analysis2025.avgDealsPerMQL} | ${(analysis2026.avgDealsPerMQL - analysis2025.avgDealsPerMQL).toFixed(2)} | ${analysis2026.avgDealsPerMQL >= analysis2025.avgDealsPerMQL ? '📈' : '📉'} |

`;

  // Key insights
  report += `### 🎯 Key Insights\n\n`;

  if (yoyChange > 0) {
    report += `- ✅ **MQL volume UP ${Math.abs(yoyPercentage)}%** YoY - strong growth trajectory\n`;
  } else {
    report += `- ⚠️ **MQL volume DOWN ${Math.abs(yoyPercentage)}%** YoY - needs attention\n`;
  }

  if (parseFloat(analysis2026.meetingRate) > parseFloat(analysis2025.meetingRate)) {
    report += `- ✅ **Meeting booking rate improved** by ${Math.abs(meetingRateChange)}pp - better lead quality\n`;
  } else {
    report += `- ⚠️ **Meeting booking rate declined** by ${Math.abs(meetingRateChange)}pp - review qualification\n`;
  }

  if (analysis2026.topSources[0]) {
    report += `- 📊 **Top source:** ${analysis2026.topSources[0].source} (${analysis2026.topSources[0].percentage}% of MQLs)\n`;
  }

  if (analysis2026.topProducts[0]) {
    report += `- 🎪 **Top product:** ${analysis2026.topProducts[0].product} (${analysis2026.topProducts[0].percentage}% of MQLs)\n`;
  }

  report += `\n---\n\n`;

  // Monthly trends for 2026
  report += `## 📅 Daily Breakdown (January 2026)\n\n`;
  report += `| Month | MQLs | % of Total |\n`;
  report += `|-------|------|------------|\n`;

  const sortedMonths2026 = Object.entries(analysis2026.byMonth)
    .filter(([month]) => month !== 'Unknown')
    .sort((a, b) => a[0].localeCompare(b[0]));

  sortedMonths2026.forEach(([month, count]) => {
    const percentage = ((count / analysis2026.total) * 100).toFixed(1);
    report += `| ${getMonthName(month)} | ${count.toLocaleString()} | ${percentage}% |\n`;
  });

  report += `\n---\n\n`;

  // Source analysis comparison
  report += `## 🔍 Source Analysis\n\n`;
  report += `### 2026 Top Sources\n\n`;
  report += `| Rank | Source | MQLs | % of Total |\n`;
  report += `|------|--------|------|------------|\n`;

  analysis2026.topSources.forEach((item, idx) => {
    report += `| ${idx + 1} | ${item.source} | ${item.count.toLocaleString()} | ${item.percentage}% |\n`;
  });

  report += `\n### 2025 Top Sources (for comparison)\n\n`;
  report += `| Rank | Source | MQLs | % of Total |\n`;
  report += `|------|--------|------|------------|\n`;

  analysis2025.topSources.forEach((item, idx) => {
    report += `| ${idx + 1} | ${item.source} | ${item.count.toLocaleString()} | ${item.percentage}% |\n`;
  });

  report += `\n---\n\n`;

  // Product type analysis
  report += `## 🎪 Product Type Breakdown\n\n`;
  report += `### 2026\n\n`;
  report += `| Product Type | MQLs | % of Total |\n`;
  report += `|--------------|------|------------|\n`;

  analysis2026.topProducts.forEach(item => {
    report += `| ${item.product} | ${item.count.toLocaleString()} | ${item.percentage}% |\n`;
  });

  report += `\n### 2025\n\n`;
  report += `| Product Type | MQLs | % of Total |\n`;
  report += `|--------------|------|------------|\n`;

  analysis2025.topProducts.forEach(item => {
    report += `| ${item.product} | ${item.count.toLocaleString()} | ${item.percentage}% |\n`;
  });

  report += `\n---\n\n`;

  // Event type analysis
  report += `## 🎯 Event Type Trends\n\n`;
  report += `### 2026 Top Event Types\n\n`;
  report += `| Event Type | MQLs | % of Total |\n`;
  report += `|------------|------|------------|\n`;

  analysis2026.topEvents.forEach(item => {
    report += `| ${item.event} | ${item.count.toLocaleString()} | ${item.percentage}% |\n`;
  });

  report += `\n---\n\n`;

  // Conversion metrics
  report += `## 📊 Conversion Quality\n\n`;
  report += `| Metric | 2026 | 2025 | Change |\n`;
  report += `|--------|------|------|--------|\n`;
  report += `| MQLs with meetings booked | ${analysis2026.withMeetings.toLocaleString()} (${analysis2026.meetingRate}%) | ${analysis2025.withMeetings.toLocaleString()} (${analysis2025.meetingRate}%) | ${meetingRateChange >= 0 ? '+' : ''}${meetingRateChange}pp |\n`;
  report += `| MQLs with deals | ${analysis2026.withDeals.toLocaleString()} (${analysis2026.dealRate}%) | ${analysis2025.withDeals.toLocaleString()} (${analysis2025.dealRate}%) | ${dealRateChange >= 0 ? '+' : ''}${dealRateChange}pp |\n`;
  report += `| Average deals per MQL | ${analysis2026.avgDealsPerMQL} | ${analysis2025.avgDealsPerMQL} | ${(analysis2026.avgDealsPerMQL - analysis2025.avgDealsPerMQL).toFixed(2)} |\n`;

  report += `\n---\n\n`;

  // Recommendations
  report += `## 💡 Recommendations\n\n`;

  if (yoyChange < 0) {
    report += `### 1. Address MQL Volume Decline\n`;
    report += `- Review top-performing sources from 2025 and increase investment\n`;
    report += `- Analyze why ${analysis2025.topSources[0]?.source || 'top source'} performance may have changed\n`;
    report += `- Consider launching new campaigns to fill the gap\n\n`;
  }

  if (parseFloat(analysis2026.meetingRate) < parseFloat(analysis2025.meetingRate)) {
    report += `### ${yoyChange < 0 ? '2' : '1'}. Improve Meeting Booking Rate\n`;
    report += `- Current rate (${analysis2026.meetingRate}%) is below 2025 (${analysis2025.meetingRate}%)\n`;
    report += `- Review lead qualification criteria\n`;
    report += `- Optimize meeting booking CTAs and follow-up sequences\n\n`;
  }

  if (analysis2026.topProducts[0]) {
    const topProduct = analysis2026.topProducts[0].product;
    report += `### ${yoyChange < 0 ? '3' : '2'}. Leverage Top Performing Product\n`;
    report += `- **${topProduct}** is driving ${analysis2026.topProducts[0].percentage}% of MQLs\n`;
    report += `- Consider creating dedicated campaigns for this product type\n`;
    report += `- Replicate success factors to other product lines\n\n`;
  }

  report += `---\n\n`;
  report += `*Report generated by vFairs Marketing OS — MQL Analysis*\n`;

  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         vFAIRS MQL TREND ANALYSIS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Load data
    console.log('📂 Loading MQL data...');
    const mqls2026 = parseCSV(CSV_2026);
    const mqls2025 = parseCSV(CSV_2025);

    if (mqls2026.length === 0) {
      console.error('❌ No 2026 data found. Please run fetch-mqls-incremental.js first.');
      return;
    }

    if (mqls2025.length === 0) {
      console.error('⚠️  No 2025 data found for comparison. Analysis will be limited.');
    }

    console.log(`   ✓ Loaded ${mqls2026.length.toLocaleString()} MQLs from 2026`);
    console.log(`   ✓ Loaded ${mqls2025.length.toLocaleString()} MQLs from 2025\n`);

    // Analyze
    console.log('📊 Analyzing trends...');
    const analysis2026 = analyzeMQLs(mqls2026, 2026);
    const analysis2025 = analyzeMQLs(mqls2025, 2025);
    console.log('   ✓ Analysis complete\n');

    // Generate report
    console.log('📝 Generating report...');
    const report = generateReport(analysis2026, analysis2025);

    // Save to file
    fs.writeFileSync(REPORT_OUTPUT, report, 'utf8');
    console.log(`   ✓ Report saved to: ${REPORT_OUTPUT}\n`);

    // Print summary to console
    console.log('═══════════════════════════════════════════════════════════');
    console.log('QUICK SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const yoyChange = analysis2026.total - analysis2025.total;
    const yoyPercentage = analysis2025.total > 0
      ? (((analysis2026.total - analysis2025.total) / analysis2025.total) * 100).toFixed(1)
      : 'N/A';

    console.log(`📈 Total MQLs:`);
    console.log(`   2026: ${analysis2026.total.toLocaleString()}`);
    console.log(`   2025: ${analysis2025.total.toLocaleString()}`);
    console.log(`   Change: ${yoyChange >= 0 ? '+' : ''}${yoyChange.toLocaleString()} (${yoyChange >= 0 ? '+' : ''}${yoyPercentage}%)\n`);

    console.log(`🤝 Meeting Rate:`);
    console.log(`   2026: ${analysis2026.meetingRate}%`);
    console.log(`   2025: ${analysis2025.meetingRate}%\n`);

    console.log(`💼 Top Source (2026): ${analysis2026.topSources[0]?.source || 'N/A'} (${analysis2026.topSources[0]?.percentage || '0'}%)\n`);

    console.log(`🎪 Top Product (2026): ${analysis2026.topProducts[0]?.product || 'N/A'} (${analysis2026.topProducts[0]?.percentage || '0'}%)\n`);

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📄 Full report available at: ${REPORT_OUTPUT}\n`);
    console.log('🎉 Analysis complete!\n');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
