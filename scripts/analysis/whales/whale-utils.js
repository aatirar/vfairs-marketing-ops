/**
 * Whale Tracking Utilities
 * Shared scoring and health calculation logic for whale tracking system
 */

// Whale Qualification Criteria
const WHALE_CRITERIA = {
  minRevenue: 50000000,        // $50M
  minICPScore: 60,             // ICP Score > 60
  priorityIndustries: [
    'non-profit',
    'nonprofit',
    'non profit',
    'associations',
    'event agencies',
    'finance',
    'pharma',
    'pharmaceutical',
    'healthcare',
    'health care',
    'tech',
    'technology',
    'software',
    'higher education',
    'education management',
    'retail',
    'consumer',
    'financial services'
  ]
};

// Deal Pipeline Stages (Sales Pipeline)
const DEAL_STAGES = {
  'Discovery': { order: 1, multiplier: 1.0 },
  'Follow-up': { order: 2, multiplier: 1.05 },
  'Proposal/Quote': { order: 3, multiplier: 1.15 },
  'Contract/Legal Review': { order: 4, multiplier: 1.3 },
  'Closed Won': { order: 5, multiplier: 2.0 },
  'Closed Lost': { order: 6, multiplier: 0 }
};

// Time Decay (Aggressive after 2 months)
const TIME_DECAY = {
  ranges: [
    { min: 0, max: 14, multiplier: 1.0, label: 'Fresh' },
    { min: 15, max: 30, multiplier: 0.95, label: 'Active' },
    { min: 31, max: 60, multiplier: 0.85, label: 'Aging' },
    { min: 61, max: 90, multiplier: 0.60, label: 'Old' },
    { min: 91, max: Infinity, multiplier: 0.30, label: 'Ancient' }
  ]
};

// Stagnation Penalty (30+ days = stalled)
const STAGNATION_PENALTY = {
  ranges: [
    { min: 0, max: 14, multiplier: 1.0, label: 'Moving' },
    { min: 15, max: 29, multiplier: 0.95, label: 'Slowing' },
    { min: 30, max: 60, multiplier: 0.70, label: 'Stalled' },
    { min: 61, max: Infinity, multiplier: 0.40, label: 'Severely Stalled' }
  ]
};

// Health Status Thresholds
const HEALTH_STATUS = {
  ranges: [
    { min: 80, max: 100, status: '🔥 Hot', label: 'Hot' },
    { min: 60, max: 79, status: '✅ Healthy', label: 'Healthy' },
    { min: 40, max: 59, status: '⚠️ Cooling', label: 'Cooling' },
    { min: 20, max: 39, status: '🧊 Cold', label: 'Cold' },
    { min: 0, max: 19, status: '💀 Dead', label: 'Dead' }
  ]
};

/**
 * Check if a contact qualifies as a whale
 */
function isWhale(contact) {
  const revenue = parseRevenue(contact.annualRevenue);
  const icpScore = parseInt(contact.icpScore) || 0;
  const industry = (contact.industry || '').toLowerCase();

  // Primary qualifier: Revenue threshold
  const meetsRevenue = revenue >= WHALE_CRITERIA.minRevenue;

  // Bonus: ICP score (if available)
  const meetsICP = icpScore >= WHALE_CRITERIA.minICPScore;
  const hasICP = icpScore > 0;

  // Bonus: Priority industry match
  const isPriorityIndustry = WHALE_CRITERIA.priorityIndustries.some(
    ind => industry.includes(ind.toLowerCase())
  );

  // Qualification logic:
  // - Must have revenue ≥ $50M
  // - Priority industry is a strong bonus
  // - ICP score is optional but boosts score when available
  const qualifies = meetsRevenue;

  return {
    qualifies,
    revenue,
    icpScore,
    isPriorityIndustry,
    hasICP,
    reasons: {
      revenue: meetsRevenue ? '✅' : '❌',
      icp: hasICP ? (meetsICP ? '✅' : '⚠️') : 'N/A',
      industry: isPriorityIndustry ? '✅' : '➖'
    }
  };
}

/**
 * Parse annual revenue from various formats
 */
function parseRevenue(revenueStr) {
  if (!revenueStr) return 0;

  // Remove quotes, commas, dollar signs
  let cleaned = String(revenueStr)
    .replace(/["$,]/g, '')
    .trim();

  // Handle "Million" or "Billion" suffix
  if (cleaned.toLowerCase().includes('million')) {
    const num = parseFloat(cleaned);
    return num * 1000000;
  }
  if (cleaned.toLowerCase().includes('billion')) {
    const num = parseFloat(cleaned);
    return num * 1000000000;
  }

  // Handle "M" or "B" suffix
  if (cleaned.match(/(\d+\.?\d*)\s*M$/i)) {
    const num = parseFloat(cleaned);
    return num * 1000000;
  }
  if (cleaned.match(/(\d+\.?\d*)\s*B$/i)) {
    const num = parseFloat(cleaned);
    return num * 1000000000;
  }

  // Handle "k" suffix
  if (cleaned.match(/(\d+\.?\d*)\s*k$/i)) {
    const num = parseFloat(cleaned);
    return num * 1000;
  }

  // Plain number
  return parseFloat(cleaned) || 0;
}

/**
 * Calculate base whale score (0-100)
 * When ICP score is missing, industry becomes more important
 */
function calculateBaseScore(revenue, icpScore, isPriorityIndustry) {
  const hasICP = icpScore && icpScore > 0;

  if (hasICP) {
    // Full scoring with ICP
    // Revenue score (0-50 points)
    let revenueScore = 0;
    if (revenue >= 500000000) revenueScore = 50;        // $500M+
    else if (revenue >= 100000000) revenueScore = 45;   // $100M-$500M
    else if (revenue >= 50000000) revenueScore = 35;    // $50M-$100M
    else revenueScore = 0;

    // ICP score (0-40 points, scaled from 0-100)
    const icpPoints = (icpScore / 100) * 40;

    // Industry bonus (0-10 points)
    const industryBonus = isPriorityIndustry ? 10 : 0;

    return Math.min(100, revenueScore + icpPoints + industryBonus);
  } else {
    // Scoring without ICP (revenue + industry only)
    // Revenue score (0-70 points, expanded from 50)
    let revenueScore = 0;
    if (revenue >= 500000000) revenueScore = 70;        // $500M+
    else if (revenue >= 100000000) revenueScore = 65;   // $100M-$500M
    else if (revenue >= 50000000) revenueScore = 55;    // $50M-$100M
    else revenueScore = 0;

    // Industry bonus (0-30 points, expanded from 10)
    // More important when ICP is missing
    const industryBonus = isPriorityIndustry ? 30 : 0;

    return Math.min(100, revenueScore + industryBonus);
  }
}

/**
 * Get multiplier for time-based decay
 */
function getTimeDecayMultiplier(daysSinceCreated) {
  const range = TIME_DECAY.ranges.find(
    r => daysSinceCreated >= r.min && daysSinceCreated <= r.max
  );
  return range ? { multiplier: range.multiplier, label: range.label } : { multiplier: 0.30, label: 'Ancient' };
}

/**
 * Get multiplier for stagnation penalty
 */
function getStagnationMultiplier(daysInStage) {
  const range = STAGNATION_PENALTY.ranges.find(
    r => daysInStage >= r.min && daysInStage <= r.max
  );
  return range ? { multiplier: range.multiplier, label: range.label } : { multiplier: 0.40, label: 'Severely Stalled' };
}

/**
 * Get stage multiplier
 */
function getStageMultiplier(stageName) {
  const stage = DEAL_STAGES[stageName];
  return stage ? { multiplier: stage.multiplier, order: stage.order } : { multiplier: 1.0, order: 0 };
}

/**
 * Calculate current health score with all factors
 */
function calculateHealthScore(baseScore, daysSinceCreated, daysInStage, currentStage) {
  const timeDecay = getTimeDecayMultiplier(daysSinceCreated);
  const stagnation = getStagnationMultiplier(daysInStage);
  const stage = getStageMultiplier(currentStage);

  // If Closed Lost, health is 0
  if (currentStage === 'Closed Lost') {
    return {
      health: 0,
      breakdown: {
        baseScore,
        timeDecay: timeDecay.multiplier,
        stageMultiplier: 0,
        stagnationPenalty: 0,
        closedLost: true
      }
    };
  }

  // If Closed Won, health is boosted massively
  if (currentStage === 'Closed Won') {
    return {
      health: 100,
      breakdown: {
        baseScore,
        timeDecay: 1.0,
        stageMultiplier: stage.multiplier,
        stagnationPenalty: 1.0,
        closedWon: true
      }
    };
  }

  // Normal calculation
  const health = Math.min(100, Math.round(
    baseScore * timeDecay.multiplier * stagnation.multiplier * stage.multiplier
  ));

  return {
    health,
    breakdown: {
      baseScore,
      timeDecay: timeDecay.multiplier,
      timeDecayLabel: timeDecay.label,
      stageMultiplier: stage.multiplier,
      stagnationPenalty: stagnation.multiplier,
      stagnationLabel: stagnation.label
    }
  };
}

/**
 * Get health status indicator
 */
function getHealthStatus(health) {
  const range = HEALTH_STATUS.ranges.find(
    r => health >= r.min && health <= r.max
  );
  return range ? range.status : '💀 Dead';
}

/**
 * Check if whale should be archived
 */
function shouldArchive(whale) {
  // Archive if Closed Lost
  if (whale.dealInfo && whale.dealInfo.currentStage === 'Closed Lost') {
    return { shouldArchive: true, reason: 'Closed Lost' };
  }

  // Archive if health is dead for 30+ days
  if (whale.whaleMetrics.currentHealth < 20 && whale.activityMetrics.daysSinceCreated > 120) {
    return { shouldArchive: true, reason: 'Dead for 30+ days' };
  }

  return { shouldArchive: false, reason: null };
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format revenue as readable string
 */
function formatRevenue(revenue) {
  if (revenue >= 1000000000) {
    return `$${(revenue / 1000000000).toFixed(1)}B`;
  }
  if (revenue >= 1000000) {
    return `$${(revenue / 1000000).toFixed(0)}M`;
  }
  if (revenue >= 1000) {
    return `$${(revenue / 1000).toFixed(0)}K`;
  }
  return `$${revenue}`;
}

module.exports = {
  WHALE_CRITERIA,
  DEAL_STAGES,
  TIME_DECAY,
  STAGNATION_PENALTY,
  HEALTH_STATUS,
  isWhale,
  parseRevenue,
  calculateBaseScore,
  getTimeDecayMultiplier,
  getStagnationMultiplier,
  getStageMultiplier,
  calculateHealthScore,
  getHealthStatus,
  shouldArchive,
  daysBetween,
  formatRevenue
};
