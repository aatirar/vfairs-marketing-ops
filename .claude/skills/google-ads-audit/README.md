# Google Ads Audit Skill

## Quick Start

### ✅ Setup Complete!

Everything is configured and ready to use. Here's what was set up:

1. ✅ Google Ads API credentials in `vFairs/.env`
2. ✅ OAuth2 credentials file in `vFairs/google-ads-credentials.json`
3. ✅ MCP server configured in `.mcp.json`
4. ✅ pipx installed for running MCP server
5. ✅ Permissions enabled for MCP tools
6. ✅ Audit reports directory created

### 🚀 Next Steps

**1. Restart Claude Code**

Close and reopen Claude Code for the MCP server to load.

**2. Approve MCP Server**

When Claude restarts, approve the `google-ads` MCP server when prompted.

**3. Run Your First Audit**

```
/google-ads-audit
```

**4. Complete OAuth (First Time Only)**

- Browser will open automatically
- Sign in with your Google Ads account
- Click "Allow" to grant permissions
- Return to Claude Code

**Done!** Your audit report will be generated and saved to `vFairs/google-ads-audits/`.

---

## What This Skill Does

Generates a comprehensive Google Ads audit report including:

📊 **Performance Analysis**
- Wasted spend identification
- Low CTR campaigns and ad groups
- Underperforming keywords
- Quality Score issues

💡 **Actionable Recommendations**
- Budget reallocation suggestions
- Campaign pause/boost recommendations
- Ad copy improvements
- Landing page optimizations

🎯 **Growth Opportunities**
- New ad group ideas from search terms
- Expansion keyword suggestions
- A/B testing recommendations
- Campaign structure improvements

💰 **Financial Impact**
- Estimated monthly savings
- Potential conversion volume increases
- ROI projections for changes

---

## Example Output

```
📊 GOOGLE ADS AUDIT REPORT
Generated: 2026-02-08
Account: [Your Account Name]
Period: Last 30 Days

==============================================
EXECUTIVE SUMMARY
==============================================

Account Health Score: 72/100 ⚠️

Total Spend (30d): $12,450
Total Conversions: 234
Average CPA: $53.21
Identified Savings: $2,890/month

Top 3 Issues:
1. 🚨 High wasted spend on low QS keywords ($1,200/month)
2. ⚠️ 3 campaigns with CTR < 2% dragging down performance
3. 💡 Search terms reveal 15 untapped keyword opportunities

==============================================
WASTED SPEND ANALYSIS
==============================================

Campaign: Brand Search | Ad Group: Competitor Keywords
Spend: $890 | Conversions: 2 | CPA: $445 (838% above target)
Issue: Quality Scores 3-4, high CPCs ($8.50 avg)
Recommendation: Pause or move to separate campaign with lower budget
Potential Savings: $800/month
---

[... detailed analysis continues ...]

==============================================
ACTION PLAN
==============================================

🔥 HIGH PRIORITY (This Week)
1. Pause 5 keywords with QS < 4 → Save $800/month
2. Increase budget for "Product Launch" campaign by $15/day → +25 conversions/month
3. Add 8 negative keywords to reduce wasted clicks → Save $290/month

⚡ MEDIUM PRIORITY (This Month)
1. Create 3 new ad groups based on search term analysis → +45 conversions/month
2. Rewrite 4 ads with CTR < 1.5% → +0.8% CTR improvement
3. Test new landing page for "Enterprise Solutions" ad group → +12% conversion rate

💡 LOW PRIORITY (Next Quarter)
1. Restructure Display campaign into themed ad groups
2. Implement responsive search ad testing framework
3. Explore Performance Max campaign for product catalog
```

---

## Files

- **`SKILL.md`** - Complete skill documentation
- **`SETUP.md`** - Detailed setup and troubleshooting guide
- **`README.md`** - This file (quick reference)

## Support

See `SETUP.md` for detailed troubleshooting or reach out if you encounter issues!
