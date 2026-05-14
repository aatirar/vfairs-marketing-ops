---
name: find-whales
description: Scan MQL data and HubSpot to identify high-value whale prospects ($50M+ revenue, ICP 60+). Adds new whales to tracking system.
allowed-tools: Bash(node*), Read
disable-model-invocation: false
---

# Find Whales - Whale Discovery & Onboarding

Scans MQL data from Google Sheets and HubSpot to identify new high-value whale prospects based on revenue, ICP score, and industry criteria.

## What This Does

1. Fetches all MQL contacts from Google Sheets
2. Filters for whale qualification criteria:
   - Annual Revenue ≥ $50 Million
   - ICP Lead Score ≥ 60
   - Priority industries (optional bonus)
3. Queries HubSpot API for associated deals
4. Calculates base whale score (0-100)
5. Calculates initial health score with decay factors
6. Adds new whales to tracking database
7. Displays summary of newly discovered whales

## Whale Qualification Criteria

**Required:**
- Annual Revenue: $50M or higher

**Bonus Factors:**
- ICP Score: 60+ (optional bonus when available)
- Priority Industries: Significantly boosts score

**Priority Industries:**
- Non-profits & Associations
- Event Agencies
- Finance & Pharma
- Healthcare & Tech
- Higher Education & Education Management
- Retail & Consumer

## Scoring Algorithm

**Base Score with ICP** (0-100):
- Revenue Score (0-50 points):
  - $500M+: 50 points
  - $100M-$500M: 45 points
  - $50M-$100M: 35 points
- ICP Score (0-40 points): Scaled from contact's ICP score
- Industry Bonus (0-10 points): +10 if priority industry

**Base Score without ICP** (0-100):
- Revenue Score (0-70 points):
  - $500M+: 70 points
  - $100M-$500M: 65 points
  - $50M-$100M: 55 points
- Industry Bonus (0-30 points): +30 if priority industry (more weight when ICP missing)

**Health Score** (0-100):
- Base Score × Time Decay × Stage Multiplier × Stagnation Penalty
- Fresh whales (0-14 days): No decay
- Aggressive decay after 60+ days

## How to Run

```
/find-whales
```

The skill will automatically:
- Connect to Google Sheets and HubSpot
- Scan all MQL contacts
- Identify new whales not yet tracked
- Add them to the whale tracker database
- Display summary of new whales found

## Output Format

```
🐋 WHALE FINDER - Scanning for High-Value Prospects
============================================================
🔐 Authenticating with Google Sheets...
   ✓ Authenticated

📥 Fetching MQL data from Google Sheets...
   ✓ Loaded XXX contacts

📂 Loading existing whale tracker...
   ✓ Currently tracking XX whales

🔍 Scanning for whale prospects...
   🐋 Found whale: Acme Corp ($250M)
   🐋 Found whale: TechGiant ($500M)

📊 Scan Results:
   🆕 New whales found: 5
   ✓ Already tracked: 12
   ❌ Not qualified: 250

🐋 NEW WHALES ADDED:
============================================================
1. 🔥 Hot Acme Corp
   Revenue: $250M | ICP: 90 | Health: 92
   Deal: Proposal/Quote

2. ✅ Healthy TechGiant
   Revenue: $500M | ICP: 85 | Health: 78
   Deal: Discovery
```

## When to Use

Use this skill to:
- Discover new whale prospects from recent MQLs
- Onboard high-value leads into tracking system
- Get initial health scores for new prospects
- Identify priority targets for sales focus

**Recommended frequency:** Weekly or after major lead generation campaigns

## Data Source

- **Google Sheet**: Live MQL data (Sheet ID: 1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY)
- **HubSpot API**: Deal stage and activity data
- **Output**: `vFairs/data/whale-tracker.json`

## Technical Details

**Script location:** `vFairs/scripts/whale-finder.js`

**Prerequisites:**
- Google Sheets API credentials (`vFairs/google-credentials.json`)
- HubSpot API access token (`.env` file)
- `googleapis` and `axios` npm packages

**Performance:** Typically completes in 5-15 seconds depending on contact count

## Next Steps

After finding whales, use `/whale-board` to:
- View fantasy league leaderboard
- Monitor whale health over time
- Track deal progression
- Identify stalled opportunities
