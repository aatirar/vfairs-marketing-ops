---
name: whale-board
description: Fantasy league leaderboard for whale prospects. Updates health scores, tracks deal progression, and highlights stalled opportunities.
allowed-tools: Bash(node*), Read
disable-model-invocation: false
---

# Whale Board - Fantasy League Leaderboard

Updates whale health scores by querying HubSpot for latest deal stages and activity, then displays a fantasy league leaderboard of your top whale prospects.

## What This Does

1. Loads whale tracker database
2. For each active whale:
   - Queries HubSpot for latest deal stage
   - Calculates time-based decay
   - Applies stagnation penalty (30+ days = stalled)
   - Updates health score (0-100)
   - Checks for stage progression
3. Archives whales that are Closed Lost or inactive 90+ days
4. Generates fantasy league leaderboard with:
   - Top 10 whales ranked by current health
   - Status indicators (🔥 Hot / ✅ Healthy / ⚠️ Cooling / 🧊 Cold / 💀 Dead)
   - Alerts for stalled/cooling whales
   - Monthly wins & losses
   - Total pipeline value

## Health Score Calculation

**Health = Base Score × Time Decay × Stage Multiplier × Stagnation Penalty**

### Time Decay (Aggressive after 2 months)
- 0-14 days: 1.0 (no decay)
- 15-30 days: 0.95 (5% decay)
- 31-60 days: 0.85 (15% decay)
- 61-90 days: 0.60 (40% decay - AGGRESSIVE)
- 90+ days: 0.30 (70% decay - VERY AGGRESSIVE)

### Deal Stage Multipliers
- Discovery: 1.0
- Follow-up: 1.05
- Proposal/Quote: 1.15
- Contract/Legal Review: 1.3
- Closed Won: 2.0 (jackpot!)
- Closed Lost: 0 (dead whale 💀)

### Stagnation Penalty (30+ days = stalled)
- 0-14 days: 1.0
- 15-29 days: 0.95
- 30-60 days: 0.70 (STALLED)
- 60+ days: 0.40 (SEVERELY STALLED)

### Health Status
- 🔥 Hot (80-100): Active progression, recent activity
- ✅ Healthy (60-79): Normal progress
- ⚠️ Cooling (40-59): Stagnating, needs attention
- 🧊 Cold (20-39): High risk of loss
- 💀 Dead (0-19): Lost or abandoned

## How to Run

**Basic leaderboard (top 10 whales):**
```
/whale-board
```

**Show all whales:**
```
/whale-board --full
```

**Show only stalled whales (30+ days):**
```
/whale-board --stalled
```

**Show historical wins/losses:**
```
/whale-board --history
```

## Output Format

```
🐋 WHALE TRACKER - FANTASY LEAGUE STANDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 TOP WHALES (Ranked by Current Health Score)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rank | Status | Company                    | Health | Stage              | Days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1 | 🔥    | Acme Corp ($250M)          |     92 | Contract/Legal     |    5
   2 | 🔥    | TechGiant ($500M)          |     88 | Proposal/Quote     |   12
   3 | ✅    | StartupCo ($100M)          |     72 | Follow-up          |   18
   4 | ⚠️    | SlowCorp ($150M)           |     55 | Discovery          |   45
   5 | 🧊    | StalledInc ($200M)         |     32 | Discovery          |   78

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  ALERTS:
   → 3 whales stalled 30+ days (need intervention)
   → 2 whales cooling (health 40-59)
   → 1 whale cold (health < 40) - high risk!

🏆 WINS THIS MONTH: 1
💰 Total Whale Pipeline Value: $1.2M
📊 Average Health Score: 68
🐋 Active Whales: 12 | Archived: 8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Leaderboard updated!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## When to Use

Use this skill to:
- **Daily/Weekly**: Monitor whale health and prioritize outreach
- **Before 1:1s**: Review stalled whales with sales team
- **Pipeline reviews**: Track high-value opportunities
- **Strategy sessions**: Identify patterns in wins/losses
- **Quarterly**: Review archived whales to analyze success factors

**Recommended frequency:** Daily for active tracking, weekly for reviews

## Archiving Rules

Whales are automatically archived when:
- Deal stage moves to "Closed Lost"
- Health score < 20 for 30+ days
- Inactive for 120+ days with no activity

Archived whales are moved to historical records but remain viewable with `--history` flag.

## Data Source

- **Input**: `vFairs/data/whale-tracker.json`
- **HubSpot API**: Real-time deal stage and activity updates
- **Output**: Updated whale tracker with refreshed health scores

## Technical Details

**Script location:** `vFairs/scripts/whale-tracker.js`

**Prerequisites:**
- Whale tracker database must exist (run `/find-whales` first)
- HubSpot API access token (`.env` file)
- `axios` npm package

**Performance:** Typically completes in 3-10 seconds depending on whale count

## Alerts & Notifications

The leaderboard automatically highlights:
- Stalled whales (30+ days in same stage)
- Cooling whales (health dropping to 40-59)
- Cold whales (health < 40, high risk of loss)
- Recent stage changes (progression tracked in history)
- Monthly wins (Closed Won this month)

## Integration with Sales Process

Use whale board insights to:
1. **Prioritize outreach**: Focus on 🔥 Hot whales first
2. **Rescue stalled deals**: Intervene on ⚠️ Cooling whales
3. **Course correct**: Re-engage 🧊 Cold whales before loss
4. **Celebrate wins**: Track 🏆 Closed Won conversions
5. **Learn from losses**: Review 💀 Dead whales for patterns

## Pro Tips

- Run `/whale-board --stalled` before weekly pipeline reviews to prepare intervention plans
- Use `--history` to analyze what made successful whales close
- Compare average health score week-over-week to spot trends
- Watch for whales that drop 15+ health points in one week - urgent attention needed
- Celebrate wins publicly with the team using the monthly wins stat!
