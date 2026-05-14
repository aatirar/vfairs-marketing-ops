---
name: morning-report
description: Daily morning briefing — MQL MTD + projection, Google Ads spend MTD, unread work email, Slack tasks + campaigns, today's calendar, and Granola prep notes for each meeting.
allowed-tools: Bash(node*), mcp__google-ads__*, mcp__google-workspace__*, mcp__granola__*, Read, Write
disable-model-invocation: false
---

# Morning Report

Generates a structured daily briefing. Fetch all data first, then compose the final report.

**IMPORTANT:** If any google-workspace tool responds with an authorization URL, stop and show it to the user — they must click it to re-authenticate before you can continue.

---

## EXECUTION INSTRUCTIONS

Steps 1, 2, 3, 4, 5 are all independent and can run in parallel. Step 6 (Granola prep) needs calendar results from Step 4.

---

### Step 1 — MQL MTD Count + Projection

```bash
node scripts/reporting/morning-mql.js
```

---

### Step 2 — Google Ads Spend MTD + Projection

Get customer ID:
```
mcp__google-ads__list_accessible_customers
```

Then query MTD spend. Replace `CUSTOMER_ID` with the vFairs customer ID, and use the first day of the current month and today's date:

```sql
SELECT
  campaign.name,
  campaign.status,
  metrics.cost_micros,
  metrics.clicks,
  metrics.conversions
FROM campaign
WHERE segments.date BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-DD'
  AND campaign.status = 'ENABLED'
ORDER BY metrics.cost_micros DESC
```

```
mcp__google-ads__search(customer_id: "CUSTOMER_ID", query: "...", page_size: 50)
```

Calculate:
- Total MTD spend = sum of cost_micros / 1,000,000
- Daily run rate = total / days elapsed
- Projected EOM = run rate × days in month
- Top 3 campaigns by spend

---

### Step 3 — Work Email (Unread / Needs Attention)

Search for unread inbox emails from the last 2 days:
```
mcp__google-workspace__search_gmail_messages(
  query: "is:unread in:inbox newer_than:2d",
  user_google_email: "<your vFairs email>",
  page_size: 20
)
```

This returns message IDs. Fetch the content for up to 15 messages:
```
mcp__google-workspace__get_gmail_messages_content_batch(
  message_ids: ["id1", "id2", ...],
  user_google_email: "<your vFairs email>"
)
```

From the results, identify emails that likely need a response. Flag:
- Emails from external senders (non-vfairs.com)
- Subject containing: urgent, action required, follow up, re:, approval, decision, FYI
- Exclude automated system notifications, newsletters, and marketing digests

---

### Step 4 — Today's Calendar Events

Get today's meetings. Use today's date in RFC3339 format for time_min (start of day UTC) and time_max (end of day UTC):

```
mcp__google-workspace__get_events(
  user_google_email: "<your vFairs email>",
  calendar_id: "primary",
  time_min: "YYYY-MM-DDT00:00:00+05:00",
  time_max: "YYYY-MM-DDT23:59:59+05:00",
  max_results: 15,
  detailed: true
)
```

Note: Use your local timezone offset (Karachi/PKT = UTC+5, US Eastern = UTC-5, etc.).

---

### Step 5 — Slack: My Tasks + Campaign Tracker

Run both in parallel:

**Your Slack tasks:**
```bash
node scripts/automation/slack-tasks-query.js
```

**Campaign Tracker:**
```bash
node scripts/automation/slack-campaigns-query.js
```

For the morning report:
- Tasks: show in_progress, blocked, follow_up only (skip done/delegated)
- Campaigns: active/in-flight only (skip drafts/completed/archived)

---

### Step 6 — Granola Meeting Prep

For each meeting from Step 4 that has external attendees (skip personal blocks like "Focus time", "OOO", "Lunch"):

1. Search for prior meetings with the same recurring title:
```
mcp__granola__search_meetings(query: "{meeting title}", limit: 5)
```

2. If a prior meeting is found, get its notes:
```
mcp__granola__get_meeting_documents(meeting_id: "{id}")
```

3. Generate a prep note in this format:
   - **Last time (DATE):** [1-2 sentence summary of what was discussed]
   - **Open items:** [any unresolved items or action items mentioned]
   - **Watch for:** [any recurring themes or tensions]

If no prior meeting found: "First occurrence — no prior context."

---

### Step 7 — Compose the Morning Report

Output a clean, scannable briefing in this exact structure:

```
# ☀️ Morning Report — [Full date, e.g. Thursday, March 26]

## 📊 MQL Pulse
[MTD count] MQLs through Day [X] of [N] · Run rate [X]/day → Projected EOM: [N]
Meeting rate: [X]% · vs [last month]: [↑/↓ N]

## 💰 Ads Spend
MTD: $[X,XXX] (Day [X] of [N]) · Run rate: $[X]/day → Projected EOM: $[X,XXX]
Top spenders: [Campaign 1] $X · [Campaign 2] $X · [Campaign 3] $X

## 📬 Email — Needs Attention
[From] — [Subject] — [one-line snippet]
[From] — [Subject] — [one-line snippet]
[Or: "Inbox clear — nothing urgent in the last 2 days"]

## 📅 Today's Meetings
[HH:MM–HH:MM] **[Meeting Title]** | [Attendees]
  > Prep: [Granola note or "First occurrence"]

[Repeat for each meeting]
[Or: "No meetings scheduled today"]

## ✅ My Tasks — Action Needed
🟠 [Task name] [due date if any]
🔴 [Blocked task]
💬 [Follow-up task]
[Or: "All clear — no pending tasks"]

## 🚀 Active Campaigns
[Campaign name] — [status/owner]
[Or: "No active campaigns found"]
```

Keep each section tight — this is a briefing, not a report. Bullets over paragraphs. No summaries or commentary beyond what's shown.
