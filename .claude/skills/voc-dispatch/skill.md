---
name: voc-dispatch
description: Generate the actual artifacts from routed VoC items — case-study outreach emails, copy briefs for landing-page updates, PM one-pagers with verbatim quotes, and the weekly executive memo. The output of this skill is what teams act on, not what they read.
allowed-tools: Read, Glob, Write, Bash
disable-model-invocation: false
---

# /voc-dispatch — Generate Artifacts From Routed Signals

`/voc-route` decides where each theme goes. `/voc-dispatch` produces the actual deliverables that land on someone's desk. This is the artifact-generation step — outreach emails, copy briefs, PM one-pagers, executive memo.

## INPUT

Default: dispatch the most recent routed run at `outputs/voc/routed/`. Optional: `--type case-study` to dispatch only one artifact type.

## ARTIFACTS

### A. Case-study outreach email
For each entry in `outputs/voc/routed/case-study-leads.md`:
- 80-120 word email from the brand team to the customer contact
- Opens by referencing the specific outcome they described, in their words
- Asks for 30 minutes to capture the story
- Single CTA, no marketing fluff
- Output: `outputs/voc/dispatched/case-study-emails/<customer-slug>-<date>.md`

### B. Landing-page copy brief
For each entry in `outputs/voc/routed/objection-map.md`:
- Identifies which page(s) need updates
- Lists the recurring objection in prospect language
- Drafts 2-3 H2/section copy options that address it directly
- Notes which page section it should sit in (Hero / FAQ / specific feature module)
- Output: `outputs/voc/dispatched/copy-briefs/<page-slug>-<date>.md`

### C. PM one-pager
For each capability area in `outputs/voc/routed/product-feedback.md`:
- One-page brief: capability area, # mentions, weighted account list, verbatim quotes (NO summary, just the quotes), suggested next step
- Format matches PM intake template (in `context/vfairs/` if available)
- Output: `outputs/voc/dispatched/pm-onepagers/<capability-slug>-<date>.md`

### D. Executive memo
Synthesize the entries in `outputs/voc/routed/exec-memo.md` into a single 1-page memo:
- 5-7 strategic observations
- Each tied to revenue / segment / competitive implication
- Closes with a specific ask or decision request
- Tone: factual, leadership-grade, no marketing flourish
- Output: `outputs/voc/dispatched/exec-memo-<date>.md`

### E. Testimonial-ready snippets
For each entry in `outputs/voc/routed/testimonial-queue.md`:
- Verbatim quote
- Customer name, title, logo path (if in HubSpot)
- Suggested usage channels (Meta ad / search testimonial page / homepage / sales deck)
- Approval status flag (needs customer approval ✓/✗)
- Output: `outputs/voc/dispatched/testimonials.md` (single rolling file)

## EXECUTION

For each artifact type, read the routing source file, generate the artifact using the verbatim quotes preserved through the pipeline, and write to the dispatched directory.

Print a dispatch summary:
```
┌─ VoC Dispatch — 2026-05-05 ──────────────────────────────────┐
│ Case-study outreach emails:       2 drafted                   │
│ Landing-page copy briefs:         4 drafted (covering 6 pages)│
│ PM one-pagers:                    5 generated                 │
│ Executive memo:                   1 (sent to inbox draft)     │
│ Testimonial snippets:             3 added to library          │
│                                                                │
│ All artifacts: outputs/voc/dispatched/                        │
└────────────────────────────────────────────────────────────────┘
```

## OPERATIONAL RULES

- Verbatim quotes are sacred. Do not rewrite them when generating artifacts. The whole pipeline value depends on the original phrasing surviving every stage.
- Outreach emails must reference the specific customer-described outcome, not generic praise. If the routing entry doesn't have one, hold the email — don't fabricate.
- The executive memo is the only artifact that synthesizes; all others should preserve the source quotes alongside any framing copy.
- Every dispatched artifact should be openable as a standalone file — assume the recipient will not read the upstream synthesis.
