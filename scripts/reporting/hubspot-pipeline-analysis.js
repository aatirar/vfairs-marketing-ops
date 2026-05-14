/**
 * HubSpot Pipeline Analysis Script
 * Pulls deal pipeline data, stage distribution, contact lifecycle data
 * for vFairs $10M new sales target analysis
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const axios = require('../node_modules/axios');

const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const BASE_URL = 'https://api.hubapi.com';

if (!TOKEN) {
  console.error('ERROR: HUBSPOT_ACCESS_TOKEN not found in environment');
  process.exit(1);
}

const headers = {
  Authorization: 'Bearer ' + TOKEN,
  'Content-Type': 'application/json'
};

// Helper to paginate through all results
async function getAllDeals(filterGroups, properties) {
  let allDeals = [];
  let after = undefined;

  do {
    const body = {
      filterGroups,
      properties,
      limit: 100
    };
    if (after) body.after = after;

    const resp = await axios.default.post(BASE_URL + '/crm/v3/objects/deals/search', body, { headers });
    const results = resp.data.results || [];
    allDeals = allDeals.concat(results);

    after = resp.data.paging && resp.data.paging.next ? resp.data.paging.next.after : null;
  } while (after);

  return allDeals;
}

async function getAllContacts(filterGroups, properties) {
  let allContacts = [];
  let after = undefined;

  do {
    const body = {
      filterGroups,
      properties,
      limit: 100
    };
    if (after) body.after = after;

    const resp = await axios.default.post(BASE_URL + '/crm/v3/objects/contacts/search', body, { headers });
    const results = resp.data.results || [];
    allContacts = allContacts.concat(results);

    after = resp.data.paging && resp.data.paging.next ? resp.data.paging.next.after : null;
  } while (after);

  return allContacts;
}

// Get deal stage names from pipeline
async function getPipelineStages() {
  try {
    const resp = await axios.default.get(BASE_URL + '/crm/v3/pipelines/deals', { headers });
    const pipelines = resp.data.results || [];
    const stageMap = {};

    for (const pipeline of pipelines) {
      for (const stage of (pipeline.stages || [])) {
        stageMap[stage.id] = {
          label: stage.label,
          pipelineName: pipeline.label,
          probability: stage.metadata ? stage.metadata.probability : null,
          order: stage.displayOrder
        };
      }
    }
    return stageMap;
  } catch (e) {
    console.error('Could not fetch pipeline stages:', e.message);
    return {};
  }
}

function formatCurrency(val) {
  if (!val || isNaN(val)) return '$0';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

async function main() {
  console.log('Fetching HubSpot pipeline data...\n');

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const startOf2026 = new Date('2026-01-01').getTime();

  // 1. Get pipeline stage names
  console.log('Fetching pipeline stage definitions...');
  const stageMap = await getPipelineStages();
  console.log('Stages found:', Object.keys(stageMap).length);

  // 2. Get ALL open deals (total pipeline)
  console.log('\nFetching all open deals...');
  const openDeals = await getAllDeals(
    [{
      filters: [{
        propertyName: 'hs_is_closed',
        operator: 'EQ',
        value: 'false'
      }]
    }],
    ['dealname', 'dealstage', 'amount', 'closedate', 'createdate', 'pipeline', 'hs_deal_stage_probability', 'hs_sales_email_last_replied']
  );
  console.log('Open deals found:', openDeals.length);

  // 3. Get deals created in last 30 days
  console.log('\nFetching deals created in last 30 days...');
  const recentDeals = await getAllDeals(
    [{
      filters: [{
        propertyName: 'createdate',
        operator: 'GTE',
        value: String(thirtyDaysAgo)
      }]
    }],
    ['dealname', 'dealstage', 'amount', 'closedate', 'createdate', 'pipeline', 'hs_is_closed']
  );
  console.log('Recent deals found:', recentDeals.length);

  // 4. Get deals closed WON in 2026 YTD
  console.log('\nFetching 2026 YTD closed-won deals...');
  const closedWonDeals = await getAllDeals(
    [{
      filters: [
        {
          propertyName: 'closedate',
          operator: 'GTE',
          value: String(startOf2026)
        },
        {
          propertyName: 'hs_is_closed_won',
          operator: 'EQ',
          value: 'true'
        }
      ]
    }],
    ['dealname', 'dealstage', 'amount', 'closedate', 'createdate', 'pipeline']
  );
  console.log('2026 YTD closed-won deals:', closedWonDeals.length);

  // 5. Get contacts created in last 30 days with lifecycle stage
  console.log('\nFetching contacts created in last 30 days...');
  const recentContacts = await getAllContacts(
    [{
      filters: [{
        propertyName: 'createdate',
        operator: 'GTE',
        value: String(thirtyDaysAgo)
      }]
    }],
    ['lifecyclestage', 'hs_lead_status', 'createdate', 'email']
  );
  console.log('Recent contacts found:', recentContacts.length);

  // 6. Get ALL contacts by lifecycle stage (current snapshot)
  console.log('\nFetching all SQL/opportunity contacts...');
  const sqlContacts = await getAllContacts(
    [{
      filters: [{
        propertyName: 'lifecyclestage',
        operator: 'IN',
        values: ['salesqualifiedlead', 'opportunity', 'marketingqualifiedlead', 'lead', 'subscriber', 'customer']
      }]
    }],
    ['lifecyclestage', 'hs_lead_status', 'createdate']
  );
  console.log('Lifecycle contacts found:', sqlContacts.length);

  // ---- ANALYSIS ----

  // Open deals by stage
  const openByStage = {};
  let totalPipelineValue = 0;
  let totalWeightedValue = 0;
  let dealCount = 0;
  const dealSizes = [];

  for (const deal of openDeals) {
    const stageId = deal.properties.dealstage;
    const amount = parseFloat(deal.properties.amount) || 0;
    const stageInfo = stageMap[stageId] || { label: stageId, pipelineName: 'unknown', probability: null };
    const stageLabel = stageInfo.label || stageId;

    if (!openByStage[stageLabel]) {
      openByStage[stageLabel] = { count: 0, value: 0, stageId, probability: stageInfo.probability, order: stageInfo.order || 999 };
    }
    openByStage[stageLabel].count++;
    openByStage[stageLabel].value += amount;
    totalPipelineValue += amount;
    dealCount++;

    if (amount > 0) {
      const prob = parseFloat(deal.properties.hs_deal_stage_probability) || parseFloat(stageInfo.probability) || 0;
      totalWeightedValue += amount * prob;
      dealSizes.push(amount);
    }
  }

  // Recent deals analysis
  const recentByStage = {};
  let recentTotalValue = 0;
  for (const deal of recentDeals) {
    const stageId = deal.properties.dealstage;
    const amount = parseFloat(deal.properties.amount) || 0;
    const stageInfo = stageMap[stageId] || { label: stageId };
    const stageLabel = stageInfo.label || stageId;

    if (!recentByStage[stageLabel]) {
      recentByStage[stageLabel] = { count: 0, value: 0 };
    }
    recentByStage[stageLabel].count++;
    recentByStage[stageLabel].value += amount;
    recentTotalValue += amount;
  }

  // Closed won 2026 YTD
  let closedWonValue2026 = 0;
  for (const deal of closedWonDeals) {
    closedWonValue2026 += parseFloat(deal.properties.amount) || 0;
  }

  // Avg deal size
  const avgDealSize = dealSizes.length > 0 ? dealSizes.reduce((a, b) => a + b, 0) / dealSizes.length : 0;
  const medianDealSize = dealSizes.length > 0
    ? dealSizes.sort((a, b) => a - b)[Math.floor(dealSizes.length / 2)]
    : 0;

  // Contact lifecycle distribution (recent 30 days)
  const recentContactByStage = {};
  for (const c of recentContacts) {
    const stage = c.properties.lifecyclestage || 'unknown';
    recentContactByStage[stage] = (recentContactByStage[stage] || 0) + 1;
  }

  // All contacts lifecycle distribution
  const allContactByStage = {};
  for (const c of sqlContacts) {
    const stage = c.properties.lifecyclestage || 'unknown';
    allContactByStage[stage] = (allContactByStage[stage] || 0) + 1;
  }

  // ---- PIPELINE COVERAGE ----
  const annualTarget = 10000000;
  const monthlyTarget = annualTarget / 12;
  const daysInYear = 365;
  const today = new Date('2026-02-23');
  const dayOfYear = Math.floor((today - new Date('2026-01-01')) / (1000 * 60 * 60 * 24)) + 1;
  const yearProgress = dayOfYear / daysInYear;
  const ytdTarget = annualTarget * yearProgress;
  const remainingTarget = annualTarget - closedWonValue2026;
  const coverageRatio = totalPipelineValue / remainingTarget;

  // ---- OUTPUT ----
  console.log('\n======================================');
  console.log('PIPELINE ANALYSIS RESULTS');
  console.log('======================================\n');

  console.log('=== TOTAL OPEN PIPELINE ===');
  console.log('Total open deals:', dealCount);
  console.log('Total pipeline value:', formatCurrency(totalPipelineValue));
  console.log('Weighted pipeline value:', formatCurrency(totalWeightedValue));
  console.log('Avg deal size:', formatCurrency(avgDealSize));
  console.log('Median deal size:', formatCurrency(medianDealSize));

  console.log('\n=== DEALS CREATED LAST 30 DAYS ===');
  console.log('New deals created:', recentDeals.length);
  console.log('New pipeline value:', formatCurrency(recentTotalValue));

  console.log('\n=== 2026 YTD CLOSED WON ===');
  console.log('Deals closed won:', closedWonDeals.length);
  console.log('Revenue booked:', formatCurrency(closedWonValue2026));
  console.log('YTD target (day ' + dayOfYear + ' of 365):', formatCurrency(ytdTarget));

  console.log('\n=== OPEN DEALS BY STAGE ===');
  const sortedStages = Object.entries(openByStage).sort((a, b) => (a[1].order || 999) - (b[1].order || 999));
  for (const [stage, data] of sortedStages) {
    const pct = totalPipelineValue > 0 ? ((data.value / totalPipelineValue) * 100).toFixed(1) : '0.0';
    console.log(stage + ': ' + data.count + ' deals | ' + formatCurrency(data.value) + ' (' + pct + '%)' + (data.probability ? ' | Win prob: ' + (data.probability * 100).toFixed(0) + '%' : ''));
  }

  console.log('\n=== RECENT DEALS BY STAGE (Last 30 Days) ===');
  for (const [stage, data] of Object.entries(recentByStage)) {
    console.log(stage + ': ' + data.count + ' deals | ' + formatCurrency(data.value));
  }

  console.log('\n=== CONTACT LIFECYCLE (Last 30 Days New Contacts) ===');
  const lifecycleOrder = ['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'unknown'];
  for (const stage of lifecycleOrder) {
    if (recentContactByStage[stage]) {
      console.log(stage + ': ' + recentContactByStage[stage]);
    }
  }
  for (const [stage, count] of Object.entries(recentContactByStage)) {
    if (!lifecycleOrder.includes(stage)) {
      console.log(stage + ': ' + count);
    }
  }

  console.log('\n=== ALL CONTACTS BY LIFECYCLE STAGE ===');
  for (const stage of lifecycleOrder) {
    if (allContactByStage[stage]) {
      console.log(stage + ': ' + allContactByStage[stage]);
    }
  }
  for (const [stage, count] of Object.entries(allContactByStage)) {
    if (!lifecycleOrder.includes(stage)) {
      console.log(stage + ': ' + count);
    }
  }

  console.log('\n=== PIPELINE COVERAGE vs $10M TARGET ===');
  console.log('Annual new sales target: $10,000,000');
  console.log('Closed won YTD 2026: ' + formatCurrency(closedWonValue2026));
  console.log('Remaining target: ' + formatCurrency(remainingTarget));
  console.log('Total open pipeline: ' + formatCurrency(totalPipelineValue));
  console.log('Coverage ratio: ' + coverageRatio.toFixed(2) + 'x');
  console.log('Weighted pipeline: ' + formatCurrency(totalWeightedValue));
  console.log('Need 2.5-3x coverage = $' + (remainingTarget * 2.5 / 1000000).toFixed(1) + 'M - $' + (remainingTarget * 3 / 1000000).toFixed(1) + 'M pipeline');

  if (coverageRatio >= 3) {
    console.log('Status: ON TRACK (strong pipeline coverage)');
  } else if (coverageRatio >= 2) {
    console.log('Status: AT RISK (below 3x coverage threshold)');
  } else {
    console.log('Status: CRITICAL (pipeline severely undercovered)');
  }

  // Return all data for report writing
  return {
    openDeals: { count: dealCount, totalValue: totalPipelineValue, weightedValue: totalWeightedValue, avgDealSize, medianDealSize, byStage: openByStage },
    recentDeals: { count: recentDeals.length, totalValue: recentTotalValue, byStage: recentByStage },
    closedWon2026: { count: closedWonDeals.length, value: closedWonValue2026 },
    recentContacts: { count: recentContacts.length, byStage: recentContactByStage },
    allContacts: { byStage: allContactByStage },
    coverage: { ratio: coverageRatio, remainingTarget, ytdTarget, dayOfYear },
    stageMap
  };
}

main().catch(e => {
  console.error('FATAL ERROR:', e.message);
  if (e.response) {
    console.error('HTTP Status:', e.response.status);
    console.error('Response:', JSON.stringify(e.response.data, null, 2));
  }
  process.exit(1);
});
