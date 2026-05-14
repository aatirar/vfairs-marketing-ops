---
name: slack-campaigns
description: Query marketing campaigns from the Campaign Tracker. Filter by status, owner, keyword, or show all campaigns with assigned owners and metadata.
allowed-tools: Bash(node*), Read, Write
disable-model-invocation: false
---

# Slack Campaigns Query

Search and display marketing campaigns from your Campaign Tracker with owners and metadata.

## What This Does

When you use `/slack-campaigns [query]`, this skill will:

1. **Fetch** all campaigns from your Slack Campaign Tracker using the Lists API
2. **Filter** based on your query (status, owner, keyword, or show all)
3. **Display** campaigns with:
   - Campaign name
   - Status (planning, in progress, launched, completed)
   - Campaign owner/team
   - Launch dates
   - Campaign type/channel
   - Budget or other metadata

## How to Use

**Show all campaigns:**
```
/slack-campaigns
/slack-campaigns all
```

**Filter by status:**
```
/slack-campaigns in progress
/slack-campaigns launched
/slack-campaigns planning
/slack-campaigns completed
```

**Filter by owner:**
```
/slack-campaigns huda
/slack-campaigns aatir
```

**Search by keyword:**
```
/slack-campaigns webinar
/slack-campaigns AI summit
/slack-campaigns linkedin
/slack-campaigns Q1 2026
```

**Combine filters:**
```
/slack-campaigns in progress huda
/slack-campaigns Q1 webinar
```

## Output Format

The skill displays campaigns grouped by status:

```
🟠 IN PROGRESS (8)
1. 🟠 GTM AI Summit - Panel Sponsorship
   Owner: Huda
   Status: In Progress
   Launch: 📅 Mar 15, 2026
   Channel: Event
   ID: Rec0XYZ123

✅ LAUNCHED (5)
📋 PLANNING (12)
```

## Status Indicators

- 📋 **Planning** - Campaign being planned
- 🟠 **In Progress** - Actively being executed
- 🚀 **Launched** - Campaign is live
- ✅ **Completed** - Campaign finished
- ⏸️ **On Hold** - Paused campaigns
- ❌ **Cancelled** - Cancelled campaigns

## Metadata Displayed

- **Campaign name** - Full campaign title
- **Owner** - Team member responsible
- **Status** - Current state
- **Launch date** - Go-live or start date
- **Channel** - Marketing channel (webinar, email, event, social, etc.)
- **Campaign type** - Category or initiative
- **Budget** - If tracked in the list
- **Notes** - Additional context

## Technical Details

**Data source:** Slack List ID `F09VB7V9NFR` (Campaign Tracker)

**API method:** `slackLists.items.list` via Slack Web API

**Authentication:** Uses `SLACK_USER_TOKEN` from `.env`

**Field mapping:**
- Campaign name field (rich_text or name)
- Status field (select)
- Owner field (user)
- Date fields (launch date, end date)
- Channel/type fields (select or text)
- Budget fields (number)
- Notes/description fields (text or rich_text)

**Script location:** `vFairs/slack-campaigns-query.js`

## Implementation

The skill executes a Node.js script that:
1. Authenticates with Slack using user token
2. Calls `slackLists.items.list` API with Campaign Tracker ID
3. Parses the `fields` array for each campaign
4. Filters based on query parameter (status, owner, keyword)
5. Formats output with:
   - Status grouping
   - Owner highlighting
   - Date formatting (with overdue warnings)
   - Metadata display

## Use Cases

- **Team sync**: `/slack-campaigns in progress` - see active campaigns
- **Planning**: `/slack-campaigns huda` - see Huda's campaigns
- **Search**: `/slack-campaigns webinar` - find all webinar campaigns
- **Review**: `/slack-campaigns Q1 2026` - quarterly planning
- **Overview**: `/slack-campaigns` - see full campaign pipeline
- **Owner tracking**: `/slack-campaigns completed aatir` - see what you've shipped

Perfect for:
- Weekly marketing meetings
- Campaign planning sessions
- Owner accountability tracking
- Resource allocation
- Quarterly reviews

Run anytime you need campaign visibility!
