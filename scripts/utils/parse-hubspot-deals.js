// Usage: node scripts/utils/parse-hubspot-deals.js <path-to-tool-results-file>
// The input file should be the raw text output from a HubSpot MCP search-objects call.
const fs = require('fs');
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node parse-hubspot-deals.js <path-to-tool-results-file>');
  process.exit(1);
}
const content = fs.readFileSync(inputPath, 'utf8');
const json = JSON.parse(content);
const data = JSON.parse(json[0].text);
const deals = data.results;
console.log('Total deals:', deals.length);
const byStage = {};
let totalAmount = 0;
deals.forEach(function(d) {
  const stage = d.properties.dealstage || 'unknown';
  const amount = parseFloat(d.properties.amount) || 0;
  if (!byStage[stage]) byStage[stage] = {count: 0, amount: 0};
  byStage[stage].count++;
  byStage[stage].amount += amount;
  totalAmount += amount;
});
console.log(JSON.stringify({byStage: byStage, totalAmount: totalAmount, paging: data.paging}, null, 2));
// Show sample deals
console.log('\nSample deals:');
deals.slice(0, 5).forEach(function(d) {
  console.log(d.properties.dealname, '|', d.properties.dealstage, '|', d.properties.amount, '|', d.properties.createdate);
});
