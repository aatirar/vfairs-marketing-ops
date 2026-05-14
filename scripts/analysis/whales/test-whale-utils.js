/**
 * Test whale utilities to ensure scoring algorithms work correctly
 */

const whaleUtils = require('./whale-utils');

console.log('🧪 Testing Whale Utilities\n');

// Test 1: Revenue parsing
console.log('1. Revenue Parsing Tests:');
console.log('   "$250 Million":', whaleUtils.formatRevenue(whaleUtils.parseRevenue('250 Million')));
console.log('   "3.3 Billion":', whaleUtils.formatRevenue(whaleUtils.parseRevenue('3.3 Billion')));
console.log('   "76.1 Million":', whaleUtils.formatRevenue(whaleUtils.parseRevenue('76.1 Million')));
console.log('   "854.9 Million":', whaleUtils.formatRevenue(whaleUtils.parseRevenue('854.9 Million')));
console.log('');

// Test 2: Whale qualification
console.log('2. Whale Qualification Tests:');
const testContact1 = {
  annualRevenue: '250 Million',
  icpScore: 85,
  industry: 'Technology'
};
const result1 = whaleUtils.isWhale(testContact1);
console.log('   Tech company $250M, ICP 85:', result1.qualifies ? '✅ WHALE' : '❌ Not whale');
console.log('   Revenue:', whaleUtils.formatRevenue(result1.revenue), '| ICP:', result1.icpScore, '| Priority Industry:', result1.isPriorityIndustry);

const testContact2 = {
  annualRevenue: '30 Million',
  icpScore: 70,
  industry: 'Retail'
};
const result2 = whaleUtils.isWhale(testContact2);
console.log('   Retail company $30M, ICP 70:', result2.qualifies ? '✅ WHALE' : '❌ Not whale (revenue too low)');
console.log('');

// Test 3: Base score calculation
console.log('3. Base Score Calculation:');
const score1 = whaleUtils.calculateBaseScore(250000000, 85, true);
console.log('   $250M, ICP 85, Priority Industry:', score1, '/100');

const score2 = whaleUtils.calculateBaseScore(500000000, 90, false);
console.log('   $500M, ICP 90, Not Priority:', score2, '/100');
console.log('');

// Test 4: Health score with decay
console.log('4. Health Score Tests:');
const health1 = whaleUtils.calculateHealthScore(85, 10, 5, 'Proposal/Quote');
console.log('   10 days old, 5 days in Proposal/Quote:');
console.log('   Health:', health1.health, '| Status:', whaleUtils.getHealthStatus(health1.health));
console.log('   Breakdown:', health1.breakdown);
console.log('');

const health2 = whaleUtils.calculateHealthScore(85, 75, 45, 'Discovery');
console.log('   75 days old, 45 days in Discovery (STALLED):');
console.log('   Health:', health2.health, '| Status:', whaleUtils.getHealthStatus(health2.health));
console.log('   Breakdown:', health2.breakdown);
console.log('');

const health3 = whaleUtils.calculateHealthScore(85, 10, 5, 'Closed Won');
console.log('   Closed Won:');
console.log('   Health:', health3.health, '| Status:', whaleUtils.getHealthStatus(health3.health));
console.log('');

console.log('✅ All utility tests complete!');
