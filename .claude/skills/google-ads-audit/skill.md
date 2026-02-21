---
name: google-ads-audit
description: Generate comprehensive Google Ads audit report analyzing wasted spend, low CTRs, underperforming campaigns/ad groups, and providing actionable recommendations for optimization.
allowed-tools: mcp__google-ads__*, Read, Write
disable-model-invocation: false
---

# Google Ads Audit Skill

Generates a professional-grade Google Ads audit report by analyzing your account data via the Google Ads API MCP server.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, follow these steps:

### Step 1: List Available Customer Accounts

Call the Google Ads MCP tool to get all accessible customer accounts:

```
mcp__google-ads__list_accessible_customers
```

This returns all Google Ads accounts you have access to. Focus on vFairs accounts (customer IDs starting with the vFairs account prefix).

### Step 2: Pull Campaign Performance Data (Last 30 Days)

For each vFairs customer account, execute this GAQL query:

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign_budget.amount_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.cost_per_conversion
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```

### Step 3: Pull Ad Group Performance Data

```sql
SELECT
  campaign.name,
  ad_group.id,
  ad_group.name,
  ad_group.status,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.cost_micros,
  metrics.conversions,
  metrics.cost_per_conversion
FROM ad_group
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```

### Step 4: Pull Keyword Quality Scores (Low Performers Only)

```sql
SELECT
  campaign.name,
  ad_group.name,
  ad_group_criterion.keyword.text,
  ad_group_criterion.keyword.match_type,
  ad_group_criterion.quality_info.quality_score,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions
FROM keyword_view
WHERE segments.date DURING LAST_30_DAYS
AND ad_group_criterion.quality_info.quality_score < 6
ORDER BY metrics.cost_micros DESC
LIMIT 50
```

### Step 5: Pull Search Terms Report (Top 100 by Spend)

```sql
SELECT
  campaign.name,
  ad_group.name,
  search_term_view.search_term,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.cost_micros,
  metrics.conversions,
  metrics.cost_per_conversion
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
LIMIT 100
```

### Step 6: Analyze and Generate Report

Using the data collected, perform this analysis:

1. **Wasted Spend Analysis**
   - Identify campaigns/ad groups with high spend but zero conversions
   - Flag keywords with Quality Score < 5 consuming significant budget
   - Calculate potential monthly savings

2. **CTR Performance Review**
   - Compare campaign CTRs against B2B SaaS benchmarks (1.5-3%)
   - Identify ad groups with CTR < 1%
   - Suggest ad copy improvements

3. **Budget Optimization**
   - Rank campaigns by ROAS or CPA efficiency
   - Recommend budget increases for top performers
   - Recommend pauses for campaigns with CPA > 2x target

4. **Search Terms Opportunities**
   - Identify high-performing search terms not yet added as keywords
   - Suggest negative keywords for irrelevant search terms
   - Propose new ad group structures

5. **Generate Action Plan**
   - Prioritize recommendations by estimated impact (High/Medium/Low)
   - Format as markdown report
   - Save to `outputs/vfairs/google-ads-audit-[YYYY-MM-DD].md`

---

## What This Audit Covers

1. **Wasted Spend Analysis**
   - Campaigns/ad groups with high spend but low conversions
   - Keywords with low Quality Scores consuming budget
   - Search terms with impressions but no clicks

2. **CTR Performance Review**
   - Click-Through Rates across campaigns and ad groups
   - Underperforming ads dragging down CTR
   - Comparison against industry benchmarks

3. **Campaign & Ad Group Performance**
   - Rankings by ROI and conversion metrics
   - Ad groups that should be paused or restructured
   - Top performers for budget reallocation

4. **Budget Optimization Recommendations**
   - Budget increases for high-performing campaigns
   - Budget cuts or pauses for underperformers
   - Potential savings calculations

5. **Ad Copy Analysis**
   - Ad copy engagement issues
   - Improvement suggestions based on best practices
   - A/B testing opportunities

6. **Landing Page Audit**
   - Landing page performance metrics
   - Pages with high bounce rates
   - Landing page improvement suggestions

7. **New Ad Group Opportunities**
   - Search terms report for expansion keywords
   - New ad groups based on user intent patterns
   - Gaps in current campaign structure

## Prerequisites

### 1. Google Ads API Credentials

You need three credentials configured in `vFairs/.env`:
- `GOOGLE_ADS_DEVELOPER_TOKEN` - 22-character token from Google Ads API Center
- `GOOGLE_PROJECT_ID` - Your Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to OAuth2 credentials JSON file

See setup guide: `.claude/skills/google-ads-audit/SETUP.md`

### 2. MCP Server Configuration

The Google Ads MCP server must be configured in `.mcp.json`:
```json
{
  "mcpServers": {
    "google-ads": {
      "command": "pipx",
      "args": ["run", "--spec", "git+https://github.com/googleads/google-ads-mcp.git", "google-ads-mcp"],
      "env": {
        "GOOGLE_ADS_DEVELOPER_TOKEN": "...",
        "GOOGLE_PROJECT_ID": "...",
        "GOOGLE_APPLICATION_CREDENTIALS": "..."
      }
    }
  }
}
```

### 3. First-Time OAuth

On first run, you'll be prompted to authorize access in your browser:
1. A browser window will open
2. Sign in with your Google Ads account
3. Grant permissions
4. Return to Claude Code

The token is cached for future runs.

## Data Collected

The audit analyzes:

**Campaign Level:**
- Campaign names, status, budget, spend
- Impressions, clicks, CTR, avg CPC
- Conversions, conversion rate, cost per conversion
- Campaign type (Search, Display, Video, etc.)

**Ad Group Level:**
- Ad group names, status, bid strategy
- Performance metrics (impressions, clicks, conversions)
- Ad group structure and organization

**Ad Level:**
- Ad copy (headlines, descriptions)
- Ad performance metrics
- Ad strength and quality indicators

**Keyword Level:**
- Keyword text and match types
- Quality Scores
- Keyword-level performance
- Search impression share

**Search Terms:**
- Actual search queries triggering ads
- Match type performance
- Negative keyword opportunities

**Landing Pages:**
- Destination URLs
- Landing page experience scores
- Bounce rate indicators (if GA4 linked)

## Output Format

The audit report includes:

### Executive Summary
- Account health score
- Total spend analysis
- Key findings (top 3-5 issues)
- Estimated potential savings

### Detailed Analysis

#### 1. Wasted Spend Report
```
🚨 Top Wasted Spend Opportunities

Campaign: [Name] | Ad Group: [Name]
Spend: $X,XXX | Conversions: X | CPA: $XXX (XX% above target)
Issue: Low Quality Score keywords consuming XX% of budget
Recommendation: Pause/refine keywords with QS < 5
Potential Savings: $X,XXX/month
---
```

#### 2. CTR Performance Analysis
```
📊 CTR Performance Breakdown

Campaign: [Name]
Current CTR: X.XX% | Industry Avg: X.XX% | Variance: -X.XX%
Ad Groups Below Benchmark: [List]
Recommendation: [Specific actions]
---
```

#### 3. Budget Reallocation Plan
```
💰 Budget Optimization Recommendations

INCREASE:
✅ Campaign [Name]: +$XXX/day (Current: $XX, ROAS: X.XX)
   Rationale: [Why]

DECREASE:
⚠️ Campaign [Name]: -$XXX/day (Current: $XX, ROAS: X.XX)
   Rationale: [Why]

PAUSE:
🛑 Campaign [Name]: -$XXX/day
   Rationale: [Why]

Projected Impact: +$X,XXX monthly savings, +XX% conversion volume
```

#### 4. Ad Copy Improvements
```
✍️ Ad Copy Optimization Opportunities

Ad Group: [Name]
Current Best Ad: [Headline 1] | [Headline 2]
CTR: X.XX% | Conversions: XX

Suggested Improvements:
1. [Specific headline suggestion with rationale]
2. [Description enhancement]
3. [Call-to-action optimization]

A/B Test Idea: [Specific test setup]
```

#### 5. New Ad Group Opportunities
```
🎯 New Ad Group Expansion Ideas

Search Intent: [Theme/Topic]
Current Gap: [What's missing]
Suggested Keywords: [List of 5-10 keywords]
Estimated Search Volume: XX,XXX/month
Recommended Budget: $XXX/day
Expected CPA: $XX (based on similar ad groups)
```

#### 6. Landing Page Recommendations
```
🌐 Landing Page Performance Issues

URL: [Landing Page URL]
Traffic: X,XXX clicks | Bounce Rate: XX%
Conversion Rate: X.XX% (Account Avg: X.XX%)

Issues Identified:
- [Specific issue 1]
- [Specific issue 2]

Recommendations:
1. [Actionable fix]
2. [Alternative landing page suggestion]
```

### Action Plan

Priority-ranked list of next steps:

```
🔥 HIGH PRIORITY (Implement This Week)
1. [Action item with expected impact]
2. [Action item with expected impact]

⚡ MEDIUM PRIORITY (Implement This Month)
1. [Action item]
2. [Action item]

💡 LOW PRIORITY (Consider for Next Quarter)
1. [Action item]
2. [Action item]
```

## Audit Frequency

**Recommended schedule:**
- **Weekly Quick Check:** Review top 3 campaigns for budget/performance shifts
- **Monthly Deep Audit:** Full account analysis with this skill
- **Quarterly Strategic Review:** Combine audit with broader marketing strategy

## GAQL Queries Used

The skill uses Google Ads Query Language (GAQL) to extract data:

```sql
-- Campaign Performance
SELECT campaign.name, campaign.status, campaign_budget.amount_micros,
       metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros,
       metrics.conversions, metrics.cost_per_conversion
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC

-- Ad Group Performance
SELECT ad_group.name, ad_group.status, metrics.impressions,
       metrics.clicks, metrics.ctr, metrics.conversions
FROM ad_group
WHERE segments.date DURING LAST_30_DAYS

-- Keyword Quality Scores
SELECT ad_group.name, ad_group_criterion.keyword.text,
       ad_group_criterion.quality_info.quality_score,
       metrics.impressions, metrics.clicks, metrics.cost_micros
FROM keyword_view
WHERE segments.date DURING LAST_30_DAYS
AND ad_group_criterion.quality_info.quality_score < 6

-- Search Terms Analysis
SELECT search_term_view.search_term, metrics.impressions,
       metrics.clicks, metrics.cost_micros, metrics.conversions
FROM search_term_view
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
LIMIT 100
```

## Tips for Best Results

1. **Run During Business Hours:** First-time OAuth setup requires browser access
2. **Review Last 30 Days:** Default timeframe balances recency with statistical significance
3. **Have Benchmarks Ready:** Know your target CPA, ROAS, and CTR goals
4. **Save Reports:** Audit reports are automatically saved to `vFairs/google-ads-audits/[date].md`
5. **Compare Over Time:** Run monthly to track improvement trends

## Troubleshooting

**"MCP server not available"**
- Restart Claude Code after configuring `.mcp.json`
- Verify pipx is installed: `python -m pipx --version`
- Check MCP server logs in Claude Code debug console

**"No customer accounts found"**
- Verify your Google account has access to Google Ads accounts
- Check that accounts are not suspended
- Ensure you completed OAuth authorization

**"Developer token in test mode"**
- Test tokens can only access test accounts
- Apply for production access in Google Ads API Center
- Approval typically takes 1-2 business days

**"Query limit exceeded"**
- Google Ads API has rate limits (15k ops/day for test, higher for production)
- Wait 1 hour and retry
- Consider running audit less frequently

## When to Use

Use this skill when you need to:
- Identify where ad budget is being wasted
- Improve overall account performance and ROI
- Prepare for monthly marketing reviews
- Onboard a new Google Ads account
- Diagnose sudden performance drops
- Plan quarterly budget allocations
- Generate reports for stakeholders

**Pro tip:** Run this audit BEFORE quarterly planning meetings to have data-driven recommendations ready!
