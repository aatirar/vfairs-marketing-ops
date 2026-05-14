---
name: fetch-gong-range
description: Fetch Gong calls for a specific date range and save transcripts + index file. Use for YTD historical backfill. Args: FROM_DATE TO_DATE (both YYYY-MM-DD).
allowed-tools: Agent
disable-model-invocation: false
---

# Fetch Gong Calls (Date Range) Skill

Fetches all Gong calls within a specified date range and saves transcripts and an index file to local storage. Designed for historical backfill in the YTD analysis pipeline.

---

## Usage

```
/fetch-gong-range 2026-01-01 2026-01-07
/fetch-gong-range 2026-03-17 2026-03-25
```

Both arguments are required. Format: `YYYY-MM-DD`. Recommended range: 7–10 days per run to stay within Gong API pagination limits.

---

## EXECUTION INSTRUCTIONS

Parse `FROM_DATE` and `TO_DATE` from the skill args. Validate both are in `YYYY-MM-DD` format. If either is missing or malformed, stop and ask the user to provide both dates.

Then immediately launch the `gong-transcript-fetcher` agent with this prompt (substituting the actual dates):

---

**AGENT PROMPT:**

> Fetch all Gong calls from **[FROM_DATE]** to **[TO_DATE]** (inclusive). Save recordings metadata, transcripts, and AI summaries to organized local files.
>
> Storage location: `outputs/gong/` (relative to the repo root).
>
> **Transcript files:** Create one `.md` file per call in `outputs/gong/transcripts/`. Name each file `[YYYY-MM-DD]-[call-title-slug].md` using the call date and a slugified version of the call title (lowercase, spaces to hyphens, max 60 chars). Each file should contain: call metadata (ID, date, duration, direction, primary rep, URL, system, language), participants, AI summary, key points, action items, topics discussed, and full transcript.
>
> If a file with the same name already exists in `outputs/gong/transcripts/`, skip it — do not overwrite.
>
> **Index file:** Create `outputs/gong/index-[TO_DATE].md` listing all fetched calls. Columns: Title, Date, Duration, Direction, Primary Rep, File Path. If an index file for `[TO_DATE]` already exists, append new calls rather than overwriting.
>
> When done, report: total calls fetched, how many were skipped (already existed), and the index file path.

---

Use `subagent_type: "gong-transcript-fetcher"` when launching the agent.

After the agent completes, report back to the user:
- Date range fetched
- Total calls saved
- Calls skipped (already on disk)
- Index file path: `outputs/gong/index-[TO_DATE].md`
