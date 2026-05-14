const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const whaleUtils = require('./whale-utils');

const CREDENTIALS_PATH = path.join(__dirname, '../../../.config/google-credentials.json');
const SHEET_ID = '1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY';
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const COLUMNS = {
  CONTACT_VID: 14,
  COMPANY: 17,
  ANNUAL_REVENUE: 18,
  ICP_SCORE: 11,
  INDUSTRY: 10
};

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  return await auth.getClient();
}

async function getContactFromHubSpot(contactId) {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        properties: 'icp_lead_score,annualrevenue,industry'
      }
    });
    return response.data.properties;
  } catch (error) {
    return null;
  }
}

async function analyzeWhaleCandidates() {
  console.log('\n🔍 WHALE CANDIDATE ANALYSIS');
  console.log('='.repeat(80));

  // Authenticate
  const authClient = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Fetch data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:Z',
  });

  const rows = response.data.values.slice(1);
  console.log(`\n📊 Analyzing ${rows.length} contacts...\n`);

  const highRevenue = [];
  const highICP = [];
  const bothHigh = [];
  const closeToWhale = [];

  // Sample first 50 contacts to check HubSpot data
  console.log('Checking HubSpot for ICP scores (sampling first 50 contacts)...\n');

  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const row = rows[i];
    const contactId = row[COLUMNS.CONTACT_VID];
    const company = row[COLUMNS.COMPANY] || 'Unknown';
    let revenue = whaleUtils.parseRevenue(row[COLUMNS.ANNUAL_REVENUE]);
    let icpScore = parseInt(row[COLUMNS.ICP_SCORE]) || 0;
    const industry = row[COLUMNS.INDUSTRY] || '';

    // Fetch from HubSpot if missing
    if (contactId && (!icpScore || icpScore === 0)) {
      const hubspotData = await getContactFromHubSpot(contactId);
      if (hubspotData) {
        icpScore = parseInt(hubspotData.icp_lead_score) || icpScore;
        if (!revenue || revenue === 0) {
          revenue = whaleUtils.parseRevenue(hubspotData.annualrevenue) || revenue;
        }
      }
    }

    if (revenue >= 50000000) {
      highRevenue.push({ company, revenue, icpScore, industry });
    }

    if (icpScore >= 60) {
      highICP.push({ company, revenue, icpScore, industry });
    }

    if (revenue >= 50000000 && icpScore >= 60) {
      bothHigh.push({ company, revenue, icpScore, industry });
    }

    // Close to whale: either high revenue OR high ICP (but not both)
    if ((revenue >= 30000000 && icpScore >= 50) ||
        (revenue >= 50000000 && icpScore >= 40)) {
      closeToWhale.push({ company, revenue, icpScore, industry });
    }
  }

  console.log('━'.repeat(80));
  console.log('\n📈 RESULTS:\n');

  console.log(`🐋 WHALES (Revenue ≥ $50M AND ICP ≥ 60): ${bothHigh.length}`);
  if (bothHigh.length > 0) {
    bothHigh.forEach(w => {
      console.log(`   ✅ ${w.company}`);
      console.log(`      Revenue: ${whaleUtils.formatRevenue(w.revenue)} | ICP: ${w.icpScore} | Industry: ${w.industry}`);
    });
  } else {
    console.log('   None found in sample');
  }

  console.log(`\n💰 HIGH REVENUE (≥ $50M, regardless of ICP): ${highRevenue.length}`);
  if (highRevenue.length > 0) {
    highRevenue.slice(0, 10).forEach(w => {
      console.log(`   → ${w.company}`);
      console.log(`      Revenue: ${whaleUtils.formatRevenue(w.revenue)} | ICP: ${w.icpScore || 'N/A'} | Industry: ${w.industry}`);
    });
    if (highRevenue.length > 10) {
      console.log(`   ... and ${highRevenue.length - 10} more`);
    }
  } else {
    console.log('   None found in sample');
  }

  console.log(`\n🎯 HIGH ICP (≥ 60, regardless of revenue): ${highICP.length}`);
  if (highICP.length > 0) {
    highICP.slice(0, 10).forEach(w => {
      console.log(`   → ${w.company}`);
      console.log(`      Revenue: ${whaleUtils.formatRevenue(w.revenue) || 'N/A'} | ICP: ${w.icpScore} | Industry: ${w.industry}`);
    });
    if (highICP.length > 10) {
      console.log(`   ... and ${highICP.length - 10} more`);
    }
  } else {
    console.log('   None found in sample');
  }

  console.log(`\n⭐ CLOSE TO WHALE (Revenue ≥ $30M + ICP ≥ 50, or Revenue ≥ $50M + ICP ≥ 40): ${closeToWhale.length}`);
  if (closeToWhale.length > 0) {
    closeToWhale.slice(0, 10).forEach(w => {
      console.log(`   → ${w.company}`);
      console.log(`      Revenue: ${whaleUtils.formatRevenue(w.revenue)} | ICP: ${w.icpScore} | Industry: ${w.industry}`);
    });
    if (closeToWhale.length > 10) {
      console.log(`   ... and ${closeToWhale.length - 10} more`);
    }
  } else {
    console.log('   None found in sample');
  }

  console.log('\n━'.repeat(80));
  console.log('\n💡 RECOMMENDATIONS:\n');

  if (bothHigh.length === 0) {
    console.log('   ⚠️  No contacts meet both criteria (Revenue ≥ $50M AND ICP ≥ 60)');
    console.log('');
    console.log('   Consider adjusting whale criteria to:');
    console.log('   1. Lower revenue threshold (e.g., $30M)');
    console.log('   2. Lower ICP threshold (e.g., 50)');
    console.log('   3. Use OR logic (high revenue OR high ICP)');
    console.log('   4. Focus on high revenue only (many companies lack ICP scores)');
  }

  console.log('\n━'.repeat(80));
  console.log();
}

analyzeWhaleCandidates().catch(err => console.error(err));
