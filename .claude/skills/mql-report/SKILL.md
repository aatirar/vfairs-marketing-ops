---
name: mql-report
description: Generate HubSpot MQL report comparing 2026 YTD vs 2025 YTD performance. Fetches live data from Google Sheets, analyzes MQL volume, meeting rates, top sources, and event types.
allowed-tools: Bash(node*), Read
disable-model-invocation: false
---

# MQL Report Generator

Fetches live HubSpot MQL data from Google Sheets and generates year-over-year performance report.

## What This Does

1. Authenticates with Google Sheets using service account
2. Fetches 2026 YTD MQL data from live Google Sheet
3. Compares with 2025 YTD data for same period
4. Analyzes:
   - Total MQL volume and YoY change
   - Meeting booking rates
   - Top traffic sources
   - Top event types
5. Displays formatted report with key insights

## How to Run

Simply invoke the skill:
```
/mql-report
```

The script will automatically:
- Connect to Google Sheets
- Pull latest 2026 data
- Compare with 2025 baseline
- Generate report

## Data Source

**Google Sheet ID**: `1V5F3ziAd5MI2_531CnBvdCQsEwEkEGmipukBxxd2DoY`

**Columns mapped:**
- Year, Month, Date
- Original source (with drill-downs)
- Contact lead status
- Geography
- Event planning details
- Event type
- Industry
- ICP Lead Score
- Meeting booking status
- Company details
- Contact information

## Prerequisites

**Service Account Setup:**
- Service account: `claude-homebase@gdrive-mcp-456412.iam.gserviceaccount.com`
- Credentials: `vFairs/google-credentials.json`
- Google Sheets API must be enabled

**Required packages:**
- `googleapis` (for Google Sheets API)

## Output Format

```
📊 MQL Volume:
   2026 YTD: XXX
   2025 YTD: XXX
   Change: +XX (+XX.X%) ✅

🤝 Meeting Booking Rate:
   2026: XX.X%
   2025: XX.X%
   Change: +X.Xpp

🔍 Top Sources (2026):
   1. SOURCE_NAME: XXX (XX.X%)
   ...

🎪 Top Event Types (2026):
   1. EVENT_TYPE: XXX (XX.X%)
   ...

💡 Key Insights:
   ✅/⚠️ Automatic insights based on data trends
```

## When to Use

Use this skill to:
- Get latest MQL performance numbers
- Check progress against 2025 baseline
- Identify top-performing sources
- Monitor meeting booking rates
- Generate reports for leadership

Run anytime you need updated MQL metrics!

## Technical Details

**Script location:** `vFairs/scripts/mql-report-sheets.js`

**How it works:**
1. Authenticates using service account credentials
2. Fetches all rows from Google Sheet
3. Filters data by YTD date range
4. Calculates metrics (volume, meeting rate, source breakdown)
5. Compares with 2025 data from CSV baseline
6. Formats and displays report

**Performance:** Typically completes in 2-5 seconds
