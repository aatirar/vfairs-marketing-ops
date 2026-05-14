/**
 * Whale Tracker - Fantasy League Leaderboard
 * Updates whale health scores and displays fantasy league standings
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const whaleUtils = require('./whale-utils');

// Configuration
const WHALE_TRACKER_PATH = path.join(__dirname, '../../../data/whale-tracker.json');
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

/**
 * Load whale tracker data
 */
function loadWhaleTracker() {
  try {
    if (fs.existsSync(WHALE_TRACKER_PATH)) {
      return JSON.parse(fs.readFileSync(WHALE_TRACKER_PATH, 'utf8'));
    }
  } catch (error) {
    console.error('❌ Error loading whale tracker:', error.message);
    process.exit(1);
  }

  console.error('❌ Whale tracker not found. Run /find-whales first to discover whales.');
  process.exit(1);
}

/**
 * Save whale tracker data
 */
function saveWhaleTracker(data) {
  try {
    fs.writeFileSync(WHALE_TRACKER_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error saving whale tracker:', error.message);
    return false;
  }
}

/**
 * Get deal details from HubSpot
 */
async function getDealDetails(dealId) {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      params: {
        properties: 'dealname,dealstage,amount,closedate,pipeline,hs_lastmodifieddate,createdate'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`⚠️  Error fetching deal ${dealId}:`, error.message);
    return null;
  }
}

/**
 * Update whale health score
 */
async function updateWhaleHealth(whale) {
  const now = new Date();

  // Update activity metrics
  whale.activityMetrics.daysSinceCreated = whaleUtils.daysBetween(
    whale.firstDetected,
    now
  );

  // If whale has a deal, fetch latest deal info
  if (whale.dealInfo && whale.dealInfo.dealId) {
    const dealDetails = await getDealDetails(whale.dealInfo.dealId);

    if (dealDetails) {
      const currentStage = dealDetails.properties.dealstage || 'Discovery';
      const lastModified = new Date(dealDetails.properties.hs_lastmodifieddate || dealDetails.properties.createdate);

      // Check if stage changed
      if (currentStage !== whale.dealInfo.currentStage) {
        // Stage changed! Add to history
        whale.dealInfo.stageHistory.push({
          stage: whale.dealInfo.currentStage,
          entered: whale.dealInfo.stageEnteredDate,
          exited: now.toISOString(),
          duration: whaleUtils.daysBetween(whale.dealInfo.stageEnteredDate, now)
        });

        // Update current stage
        whale.dealInfo.currentStage = currentStage;
        whale.dealInfo.stageEnteredDate = lastModified.toISOString();
      }

      // Update days in stage
      whale.dealInfo.daysInStage = whaleUtils.daysBetween(
        whale.dealInfo.stageEnteredDate,
        now
      );

      // Update deal amount
      whale.dealInfo.dealAmount = parseFloat(dealDetails.properties.amount) || 0;
    }
  }

  // Recalculate health score
  const currentStage = whale.dealInfo ? whale.dealInfo.currentStage : 'Discovery';
  const daysInStage = whale.dealInfo ? whale.dealInfo.daysInStage : whale.activityMetrics.daysSinceCreated;

  const healthCalc = whaleUtils.calculateHealthScore(
    whale.whaleMetrics.baseScore,
    whale.activityMetrics.daysSinceCreated,
    daysInStage,
    currentStage
  );

  // Update whale metrics
  whale.whaleMetrics.currentHealth = healthCalc.health;
  whale.whaleMetrics.status = whaleUtils.getHealthStatus(healthCalc.health);
  whale.healthBreakdown = healthCalc.breakdown;
  whale.lastUpdated = now.toISOString();

  return whale;
}

/**
 * Display fantasy league leaderboard
 */
function displayLeaderboard(tracker, options = {}) {
  const { showAll = false, showStalled = false, showHistory = false } = options;

  console.log('\n🐋 WHALE TRACKER - FANTASY LEAGUE STANDINGS');
  console.log('━'.repeat(80));
  console.log();

  if (showHistory) {
    // Show archived whales (wins/losses)
    console.log('📜 ARCHIVED WHALES (Historical)');
    console.log('━'.repeat(80));

    if (tracker.archivedWhales.length === 0) {
      console.log('   No archived whales yet.\n');
    } else {
      const wins = tracker.archivedWhales.filter(w => w.archiveReason === 'Closed Won');
      const losses = tracker.archivedWhales.filter(w => w.archiveReason === 'Closed Lost');

      console.log(`🏆 WINS (${wins.length}):`);
      wins.forEach((whale, idx) => {
        console.log(`   ${idx + 1}. ${whale.company} - ${whaleUtils.formatRevenue(whale.whaleMetrics.annualRevenue)}`);
        console.log(`      Archived: ${new Date(whale.archivedDate).toLocaleDateString()}`);
        console.log('');
      });

      console.log(`💀 LOSSES (${losses.length}):`);
      losses.forEach((whale, idx) => {
        console.log(`   ${idx + 1}. ${whale.company} - ${whaleUtils.formatRevenue(whale.whaleMetrics.annualRevenue)}`);
        console.log(`      Archived: ${new Date(whale.archivedDate).toLocaleDateString()}`);
        console.log('');
      });
    }
    return;
  }

  // Active whales leaderboard
  let whales = [...tracker.activeWhales];

  if (showStalled) {
    // Filter to only stalled whales (30+ days in stage)
    whales = whales.filter(w =>
      w.dealInfo && w.dealInfo.daysInStage >= 30
    );
    console.log(`⚠️  STALLED WHALES (${whales.length} whales stuck 30+ days)`);
  } else {
    console.log('🏆 TOP WHALES (Ranked by Current Health Score)');
  }

  console.log('━'.repeat(80));

  if (whales.length === 0) {
    console.log('   No whales found. Run /find-whales to discover prospects.\n');
    return;
  }

  // Sort by health score
  whales.sort((a, b) => b.whaleMetrics.currentHealth - a.whaleMetrics.currentHealth);

  // Limit to top 10 unless showAll
  const displayWhales = showAll ? whales : whales.slice(0, 10);

  console.log();
  console.log('Rank | Status | Company                    | Health | Stage              | Days');
  console.log('━'.repeat(80));

  displayWhales.forEach((whale, idx) => {
    const rank = String(idx + 1).padStart(4);
    const status = whale.whaleMetrics.status.padEnd(6);
    const company = `${whale.company.substring(0, 24)} (${whaleUtils.formatRevenue(whale.whaleMetrics.annualRevenue)})`.padEnd(26);
    const health = String(whale.whaleMetrics.currentHealth).padStart(6);
    const stage = (whale.dealInfo ? whale.dealInfo.currentStage : 'No Deal').padEnd(18);
    const days = String(whale.dealInfo ? whale.dealInfo.daysInStage : whale.activityMetrics.daysSinceCreated).padStart(5);

    console.log(`${rank} | ${status} | ${company} | ${health} | ${stage} | ${days}`);
  });

  console.log();
  console.log('━'.repeat(80));

  // Alerts section
  console.log();
  console.log('⚠️  ALERTS:');

  const stalledWhales = whales.filter(w => w.dealInfo && w.dealInfo.daysInStage >= 30);
  const coolingWhales = whales.filter(w =>
    w.whaleMetrics.currentHealth >= 40 &&
    w.whaleMetrics.currentHealth < 60
  );
  const coldWhales = whales.filter(w => w.whaleMetrics.currentHealth < 40);

  if (stalledWhales.length > 0) {
    console.log(`   → ${stalledWhales.length} whale${stalledWhales.length > 1 ? 's' : ''} stalled 30+ days (need intervention)`);
  }
  if (coolingWhales.length > 0) {
    console.log(`   → ${coolingWhales.length} whale${coolingWhales.length > 1 ? 's' : ''} cooling (health 40-59)`);
  }
  if (coldWhales.length > 0) {
    console.log(`   → ${coldWhales.length} whale${coldWhales.length > 1 ? 's' : ''} cold (health < 40) - high risk!`);
  }
  if (stalledWhales.length === 0 && coolingWhales.length === 0 && coldWhales.length === 0) {
    console.log('   ✅ All whales healthy!');
  }

  console.log();

  // Summary stats
  const thisMonthWins = tracker.archivedWhales.filter(w => {
    const archived = new Date(w.archivedDate);
    const now = new Date();
    return w.archiveReason === 'Closed Won' &&
           archived.getMonth() === now.getMonth() &&
           archived.getFullYear() === now.getFullYear();
  }).length;

  console.log(`🏆 WINS THIS MONTH: ${thisMonthWins}`);
  console.log(`💰 Total Whale Pipeline Value: ${whaleUtils.formatRevenue(tracker.metadata.totalPipelineValue)}`);
  console.log(`📊 Average Health Score: ${tracker.metadata.averageHealth}`);
  console.log(`🐋 Active Whales: ${tracker.activeWhales.length} | Archived: ${tracker.archivedWhales.length}`);

  console.log();
  console.log('━'.repeat(80));
  console.log('✅ Leaderboard updated!');
  console.log('━'.repeat(80));
  console.log();
}

/**
 * Main tracker function
 */
async function runWhaleTracker(options = {}) {
  console.log('\n🐋 WHALE TRACKER - Updating Whale Health Scores');
  console.log('='.repeat(60));

  try {
    // Load whale tracker
    console.log('📂 Loading whale tracker...');
    const tracker = loadWhaleTracker();
    console.log(`   ✓ Loaded ${tracker.activeWhales.length} active whales\n`);

    if (options.showHistory) {
      // Just show history, no updates
      displayLeaderboard(tracker, options);
      return;
    }

    // Update health scores for all active whales
    console.log('🔄 Updating whale health scores...');
    const updatedWhales = [];
    const archivedWhales = [];

    for (const whale of tracker.activeWhales) {
      const updated = await updateWhaleHealth(whale);

      // Check if should be archived
      const archiveCheck = whaleUtils.shouldArchive(updated);
      if (archiveCheck.shouldArchive) {
        console.log(`   💀 Archiving: ${updated.company} (${archiveCheck.reason})`);
        tracker.archivedWhales.push({
          ...updated,
          archivedDate: new Date().toISOString(),
          archiveReason: archiveCheck.reason,
          daysTracked: whaleUtils.daysBetween(updated.firstDetected, new Date())
        });
        archivedWhales.push(updated);
      } else {
        updatedWhales.push(updated);
      }
    }

    console.log(`   ✓ Updated ${updatedWhales.length} whales`);
    if (archivedWhales.length > 0) {
      console.log(`   📦 Archived ${archivedWhales.length} whales`);
    }

    // Update tracker
    tracker.activeWhales = updatedWhales;
    tracker.metadata.totalActiveWhales = updatedWhales.length;
    tracker.metadata.totalArchivedWhales = tracker.archivedWhales.length;
    tracker.metadata.lastUpdated = new Date().toISOString();
    tracker.metadata.totalPipelineValue = updatedWhales.reduce(
      (sum, w) => sum + (w.dealInfo?.dealAmount || 0),
      0
    );
    tracker.metadata.averageHealth = updatedWhales.length > 0
      ? Math.round(
          updatedWhales.reduce((sum, w) => sum + w.whaleMetrics.currentHealth, 0) /
          updatedWhales.length
        )
      : 0;

    // Save updated tracker
    console.log('\n💾 Saving updated whale tracker...');
    const saved = saveWhaleTracker(tracker);
    if (saved) {
      console.log(`   ✓ Saved to ${WHALE_TRACKER_PATH}\n`);
    }

    // Display leaderboard
    displayLeaderboard(tracker, options);

  } catch (error) {
    console.error('\n❌ Error updating whale tracker:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  showAll: args.includes('--full'),
  showStalled: args.includes('--stalled'),
  showHistory: args.includes('--history')
};

// Run the tracker
runWhaleTracker(options);
