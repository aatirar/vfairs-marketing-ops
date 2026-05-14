---
name: audit-debt
description: Marketing debt auditor. Pulls product releases from Slack + Granola, evaluates significance, checks relevant marketing pages, researches competitor positioning, proposes messaging, and pushes all action items to a new Google Sheet.
allowed-tools: Bash, Read, Write, mcp__tavily__tavily_extract, mcp__tavily__tavily_search, mcp__granola__search_meetings, mcp__granola__get_meeting_transcript, mcp__granola__get_meeting_documents
---

# /audit-debt — Marketing Debt Auditor

Keeps the vFairs marketing site in sync with what the product actually does.

Pulls new product releases from Slack and Granola meeting notes, evaluates whether each change is significant enough to require a website update, then audits all relevant marketing pages and generates specific action items in a Google Sheet.

---

## EXECUTION STEPS

### STEP 1 — Fetch Slack Releases

Run the Slack fetcher:
```bash
node scripts/automation/audit-debt-slack.js 7 > /tmp/audit-debt-releases.json 2>/tmp/audit-debt-slack-err.txt
```

Read the output:
```bash
cat /tmp/audit-debt-releases.json
```

If the file is empty or there's an error in `/tmp/audit-debt-slack-err.txt`, report the Slack error to the user and stop.

Count releases. You'll see each one has a `significance` field:
- `skip` — pre-filtered as bug/config/cosmetic. Include in the sheet as skipped rows but don't audit them.
- `high` — always audit
- `evaluate` — read the KB article to decide

---

### STEP 2 — Fetch Granola Meeting Notes

Search for recent product update meetings using:
- `mcp__granola__search_meetings` with query `"Pod"` (matches Pod 1, Pod 2, Pod 3, etc.)
- `mcp__granola__search_meetings` with query `"Product Updates"`

Filter to meetings from the last 7 days only (check meeting date).

For each matching meeting, call `mcp__granola__get_meeting_documents` to get the summary/notes. Look for mentions of:
- New features, capabilities, or modules shipped
- Anything described as "we shipped," "we launched," "now live," "new in this sprint"

Cross-reference against the Slack releases. If a Granola meeting mentions a feature that wasn't in Slack (or adds useful context to one that was), note it. Don't duplicate — just enrich.

---

### STEP 3 — Evaluate Significance for "evaluate" Items

For each release with `significance: "evaluate"`:

1. Fetch the KB article using `mcp__tavily__tavily_extract` with the `kbArticleUrl`
2. If Tavily returns an error or requires auth, try `mcp__tavily__tavily_search` with the feature name as query
3. Read the article and ask: **"Would a buyer care about this when evaluating vFairs?"**

Promote to `high` if any of these are true:
- It adds a capability buyers compare across platforms (scheduling, automation, integrations, reporting)
- It removes a known limitation (if KB article mentions "previously you couldn't...")
- It affects a workflow that appears on a marketing page (registration flow, check-in, virtual lobby, lead capture)
- It's visible to event attendees (not just admin backend config)

Keep as `skip` if:
- Pure backend/admin UI change with no attendee or organizer workflow impact
- Cosmetic label/icon change
- Performance improvement with no new capability
- Internal tooling only

---

### STEP 4 — Build Action Items

For each `high` or `medium` significance release, do the following:

#### 4a. Map Module to Affected Pages

Use this mapping (check all pages listed for the module):

```
Email / SMS Campaigns →
  /event-management-platform/event-registration-software/
  /event-management-platform/in-person-conference/
  /event-management-platform/virtual-conference/

Registration →
  /event-management-platform/event-registration-software/
  /event-management-platform/event-ticketing-software/

Ticketing →
  /event-management-platform/event-ticketing-software/
  /event-management-platform/event-registration-software/

Mobile App →
  /event-management-platform/mobile-event-app/
  /event-management-platform/in-person-conference/
  /event-management-platform/in-person-trade-show/

Virtual Platform →
  /event-management-platform/virtual-event-platform/
  /event-management-platform/virtual-conference/
  /event-management-platform/virtual-trade-show/
  /event-management-platform/virtual-job-fair/

Check-In →
  /event-management-platform/event-check-in-and-badge-printing/
  /event-management-platform/in-person-conference/
  /event-management-platform/in-person-trade-show/
  /event-management-platform/in-person-job-fair/

Badge Printing →
  /event-management-platform/event-check-in-and-badge-printing/

Lead Capture →
  /features/event-lead-capture/
  /event-management-platform/in-person-trade-show/
  /event-management-platform/virtual-trade-show/

Networking →
  /event-management-platform/virtual-event-platform/
  /event-management-platform/virtual-conference/
  /event-management-platform/mobile-event-app/

Exhibitor / Sponsor →
  /event-management-platform/in-person-trade-show/
  /event-management-platform/virtual-trade-show/
  /event-management-platform/in-person-conference/
  /event-management-platform/virtual-conference/

Analytics / Reporting →
  https://www.vfairs.com/
  /event-management-platform/event-registration-software/
  /event-management-platform/virtual-event-platform/

Integrations →
  https://www.vfairs.com/
  /event-management-platform/event-registration-software/

Job Fair →
  /event-management-platform/in-person-job-fair/
  /event-management-platform/virtual-job-fair/
```

If the module isn't in this map, flag it as "⚠️ Module not mapped — manual review needed" and skip page auditing for this item.

#### 4b. Scrape Affected Pages

For each affected page URL, call `mcp__tavily__tavily_extract` with:
- `url`: the full vfairs.com URL (e.g. https://www.vfairs.com/event-management-platform/event-registration-software/)

Read the extracted content and look for:
1. Does the page mention this capability at all?
2. Is the capability described accurately (not missing key new aspects)?
3. Is there a feature bullet, section, or FAQ entry that should be added?
4. Does the page have a screenshot or feature preview image that would now be outdated?

#### 4c. Generate the Action Item

For each gap found, create one action item record:

```json
{
  "jiraId": "VFC-36352",
  "featureName": "Manage Follow-up Scheduling in Scheduled Campaign State",
  "module": "Email / SMS Campaigns",
  "app": "Backend Portal",
  "tags": ["Minor Enhancement", "Modular Roadmap"],
  "deploymentDate": "25-Feb-2026",
  "kbArticleUrl": "https://help.vfairs.com/knowledge/...",
  "significance": "high",
  "skipReason": "",
  "affectedPages": [
    "https://www.vfairs.com/event-management-platform/event-registration-software/"
  ],
  "actionType": "Add Feature Bullet",
  "specificAction": "Add a bullet point under the 'Email Marketing' section mentioning that follow-up sequences can now be scheduled within a campaign state. Current copy says 'automate your event emails' without mentioning post-campaign follow-up scheduling capability.",
  "suggestedCopy": "Schedule and automate follow-up email sequences within any campaign state — keep attendees engaged before, during, and after your event.",
  "priority": "P1",
  "competitorPositioning": "CVENT\nHeadline: ...\nKey value props:\n→ ...\nFraming: ...\n\nBIZZABO\n...\n\nDOMINANT PATTERN: ...\n\nDIFFERENTIATION OPPORTUNITY: ...",
  "proposedMessaging": "H1: ...\n\nH2: ...\n\nBULLETS:\n→ ...\n→ ...\n→ ...\n\nCAPABILITIES TO MENTION:\n- ...\n\nDIFFERENTIATION ANGLE: ...\n\nAVOID: ..."
}
```

---

#### 4d. Competitive Research (high significance items only)

For every item with `significance: "high"`, research how competitors describe this feature or capability. This tells you how the market frames it — what language resonates, what angles competitors lead with, and where vFairs can differentiate.

**Competitors to check (in priority order):**
Cvent, Bizzabo, Accelevents, Whova, Swapcard, Rainfocus, EventsAir, Eventify

**Research method — for each competitor:**

1. Run a targeted search:
   ```
   mcp__tavily__tavily_search with query: "[feature name] site:[competitor].com"
   ```
   Examples:
   - `"follow-up email scheduling site:cvent.com"`
   - `"email campaign automation site:bizzabo.com"`

2. If the search returns a relevant product page, call `mcp__tavily__tavily_extract` on that URL to get the full copy.

3. If no result via site: search, try: `"[feature name] [competitor name] event platform"` without site: restriction — the competitor's page often still ranks first.

4. For each competitor where you find relevant copy, extract:
   - The **headline or H1** they use for this capability
   - **1–3 bullet points or value prop statements** they use
   - The **specific outcome language** (what they claim the buyer gets)
   - Any **metrics or proof points** they cite ("3x faster," "save 2 hours per event")
   - Notable **framing angle** (do they lead with time savings? compliance? attendee experience?)

**What to look for across all competitors:**

- **Dominant positioning angle** — what theme keeps appearing? (e.g. "reduce manual work," "keep attendees engaged," "no more chasing RSVPs")
- **Language patterns** — are they using words like "automate," "streamline," "effortless," "on autopilot"?
- **What they avoid saying** — gaps in competitor positioning are opportunities for vFairs
- **Who they're writing for** — do they address the event organizer, the marketing team, or the event planner?

**Compile into this structure for the `competitorPositioning` field:**

```
CVENT
Headline: "Automate your event communication from registration to post-event"
Key value props:
→ "Send targeted emails based on registration status"
→ "Reduce no-shows with automated reminder sequences"
→ "Track open rates and clicks from one dashboard"
Framing: Automation + analytics angle. Leads with the organizer's workload, not the feature itself.

BIZZABO
Headline: "Event email marketing that works while you plan"
Key value props:
→ "Schedule emails in advance across your entire event calendar"
→ "Personalise at scale without adding to your team's workload"
Framing: Scale + personal touch. Leads with the tension between personalisation and efficiency.

[COMPETITOR NOT FOUND: Accelevents — no relevant page found for this feature]

DOMINANT PATTERN ACROSS COMPETITORS:
All 5 competitors lead with the organiser's burden (manual follow-up, chasing attendees) rather than the feature mechanics. Automation and "while you plan" passive framing appears in 4 of 5. Metrics are rare — only Cvent uses a specific claim ("3x open rate vs generic emails"). Whova is the only one that leads with the attendee experience angle rather than organiser efficiency.

DIFFERENTIATION OPPORTUNITY:
Competitors focus on "automating the sequence." None describe the ability to schedule follow-ups within a specific campaign state — this is a specificity angle vFairs could own.
```

You don't need to find every competitor. 3–5 with substantive findings is enough. Note which ones had no relevant page for the feature.

---

#### 4e. Messaging Proposal (Anthony Pierri Principles)

For every `high` significance item, propose a complete messaging block that vFairs could use on the relevant product page(s). Apply Pierri's B2B SaaS messaging principles throughout.

**Pierri's core rules — apply all of these:**

1. **The hero is the customer, not the product.** The headline is about what the customer achieves, not what the feature does. Never lead with the feature name as the headline.

2. **Specificity over superlatives.** Never write "powerful," "robust," "seamless," or "best-in-class." Replace with a specific claim: not "improve attendance" but "cut no-shows by keeping attendees on the hook between sessions."

3. **The "so that" test.** Every bullet must connect the capability to an outcome. Format: "[what you can do] so that [outcome the buyer cares about]." Cut any bullet that fails this test.

4. **Functional job framing.** Buyers hire tools to do a job. Name the job in plain language: "keep attendees informed without logging in every day" not "automated communication workflows."

5. **Before/after contrast.** The best copy makes the painful "before" state vivid, then resolves it. Use this in headlines and subheadlines: "Stop chasing attendees. Follow-up emails that go out on their own."

6. **One message per section.** Don't pack multiple benefits into a headline. Pick the single most important outcome and say only that.

7. **Jargon test.** Read each bullet aloud. If it sounds like a product manager wrote it, rewrite it. Replace "configurable automation workflows" with "set it once and let it run."

8. **The "unlike" frame for differentiation.** If vFairs does something competitors don't, use: "Unlike [other platforms] that [limitation], vFairs lets you [specific thing]."

9. **Write for the person doing the job, not the person buying the software.** Event organisers want to run great events without stress. Write to that goal.

10. **Avoid the "our platform" opener.** Never start a bullet with "Our platform..." or "vFairs..." — start with what the buyer *does* or *gets*.

**Proposed messaging structure:**

```
FEATURE PAGE HEADLINE (H1)
One sentence. Names the outcome, not the feature. Active voice. Under 10 words.
Approach: [verb] + [what the buyer wants] + [context/qualifier if needed]
Bad example: "Follow-up Scheduling in Campaign State"
Good example: "Keep attendees engaged long after the last session ends"

SUBHEADLINE (H2)
One sentence. Explains the mechanism — how vFairs achieves the outcome above.
Approach: What vFairs lets you DO (not what it IS)
Bad example: "vFairs Email Campaign module with enhanced follow-up scheduling"
Good example: "Schedule follow-up sequences directly inside your campaign — they send automatically, even after your event wraps."

FEATURE BULLETS (3–5 max)
Each bullet: [specific capability] + "so that" + [specific outcome]
Written in second person ("you"), present tense, no jargon.
Bullets should cover different angles: one workflow, one outcome, one differentiator.
Format: start each with a verb.

BULLET EXAMPLES:
→ "Schedule follow-up emails to fire automatically at any campaign stage — so you're not manually sending 'did you see our recap?' emails three days after the event."
→ "Set different sequences for confirmed attendees, no-shows, and wait-listed contacts — so every person gets a message that actually applies to them."
→ "See open rates and replies inside the same view you built the campaign — so you don't need to switch tabs to know what's working."

CAPABILITIES TO MENTION (raw list for copywriter reference):
List 3–6 specific things the feature enables, in plain English, drawn from the KB article.
These are the building blocks — not the final copy.
e.g.:
- Can schedule emails to send within a "Scheduled" campaign state (not just active/live)
- Supports time-delay triggers between emails
- Works with existing audience segmentation filters
- Status visible in campaign dashboard

DIFFERENTIATION ANGLE (1 sentence):
What does this feature do that the competitive research shows others don't?
e.g.: "Only vFairs lets you trigger follow-up sequences from within a scheduled campaign state — not just after an event concludes."

WHAT TO AVOID IN COPY:
List 2–3 specific phrases/angles to avoid based on what competitors already own.
e.g.: "Don't lead with 'automation' — Cvent and Bizzabo both own this word. Lead with specificity of the campaign state trigger instead."
```

Store the full messaging block (all sections above) as a single text value in the `proposedMessaging` field.

---

**Priority guidelines:**
- `P0` — Capability is completely missing from a key commercial page (homepage, main product page) and is a commonly compared feature
- `P1` — Capability exists in the product but isn't reflected in marketing copy; meaningful enhancement to an existing feature
- `P2` — Minor improvement, secondary pages only, or nice-to-have addition

**Action Type options:**
- `Update Copy` — existing text needs to be changed to reflect new behavior
- `Add Feature Bullet` — new bullet in a feature list
- `Add Section` — entirely new section needed (feature too significant for a bullet)
- `New Page` — feature warrants a dedicated landing page
- `Update Screenshot` — existing screenshot shows old UI; needs replacement
- `Add FAQ Entry` — new FAQ question addresses a common buyer question about this feature
- `No Action Needed` — page already reflects this capability

One release can produce **multiple action items** (one per affected page, or one per action type if a page needs multiple changes).

---

### STEP 5 — Write Output JSON

Write ALL action items (including skipped ones) to:
```
outputs/audit-debt-items.json
```

Format:
```json
[
  { ...action item... },
  { ...action item... }
]
```

Skipped items should still be included with:
- `significance: "skip"`
- `skipReason: "Bug fix — no buyer-facing change"`
- All other action fields left empty

---

### STEP 6 — Create Google Sheet

Run the sheets writer:
```bash
node scripts/automation/audit-debt-sheets.js outputs/audit-debt-items.json
```

This will print the Google Sheet URL. Share it with the user.

If the script fails with a credentials error, tell the user:
> "Google Sheets write failed. Check that `.config/google-credentials.json` exists and the service account has Google Sheets + Drive API access. To share the sheet with your personal Google account, add `GOOGLE_SHEETS_SHARE_EMAIL=your@email.com` to `.config/.env`."

---

### STEP 7 — Summary Report

After the sheet is created, print a summary:

```
## /audit-debt Complete — [Date]

**Releases scanned:** X (last 7 days)
**Skipped (bug/cosmetic):** X
**Evaluated via KB article:** X
**Significant (audited):** X

**Action items generated:** X
  → P0 (urgent): X
  → P1 (this month): X
  → P2 (next quarter): X

**Pages with gaps found:**
  - /event-management-platform/event-registration-software/ (X items)
  - /event-management-platform/virtual-event-platform/ (X items)
  ...

📊 Google Sheet: [URL]
```

---

## ERROR HANDLING

- **Slack auth error:** Report token/scope issue. The `SLACK_USER_TOKEN` in `.config/.env` may need `channels:history` scope.
- **KB article requires auth:** Note "KB article auth required — evaluated from feature name and module only" in the action item's `suggestedCopy` field.
- **Tavily can't extract a page:** Skip that page's audit, note "Page extraction failed" in `specificAction`.
- **No releases in last 7 days:** Report "No product releases found in #releases channel in the last 7 days." and stop gracefully.
- **Granola no results:** Note "No product update meetings found in Granola for this period" in the summary and continue with Slack data only.

---

## MODULE MAPPING FILE

The module-to-pages mapping above is the source of truth. If a release's module doesn't match any key in the map, log a warning and include the item in the sheet with `affectedPages: []` and `actionType: "⚠️ Module not mapped"` so you can manually assign it.

To update the mapping as vFairs adds new modules/pages, edit the STEP 4 section of this skill.
