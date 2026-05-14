---
name: fetch-gong-calls
description: Fetch and store Gong call recordings, metadata, transcripts, and AI summaries from the past 7 days into organized local files.
allowed-tools: Agent
disable-model-invocation: false
---

# Fetch Gong Calls Skill

Fetches all Gong calls from the past 7 days and saves recordings, transcripts, and AI summaries to local files.

---

## EXECUTION INSTRUCTIONS

When this skill is invoked, immediately launch the `gong-transcript-fetcher` agent with the following prompt:

> Fetch all Gong calls from the past 7 days. Save recordings metadata, transcripts, and AI summaries to organized local files. Store outputs under `outputs/gong/` (relative to the repo root). Create one file per call named `[YYYY-MM-DD]-[call-title-slug].md` containing the call metadata, participants, transcript, and AI summary. Also create an index file `outputs/gong/index-[YYYY-MM-DD].md` listing all fetched calls with title, date, participants, and duration.

Use `subagent_type: "gong-transcript-fetcher"` when launching the agent.

Report back to the user with a summary of how many calls were fetched and where the files were saved.
