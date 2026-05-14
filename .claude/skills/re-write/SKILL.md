---
name: re-write
version: 2.0.0
description: Rewrite the entire heading hierarchy AND body bullets of a vFairs landing page using Ahrefs SEO/AEO data plus the vFairs voice and positioning rules. Takes one URL, fetches the page, pulls keyword data, and outputs a single inline table with original copy, verdict (Let it be / Rewrite), and a rewrite where needed. Body H3 sections get every bullet rewritten (max 4 per H3, merging redundant ones) and may be resequenced for narrative flow. Trigger on /re-write [url] or when the user says "rewrite this page", "rewrite headings on this URL", "do the headline pass on [url]", or "give me a rewrite table for [url]". When the user adds "mockup" (e.g. /re-write [url] mockup, or /re-write mockup [slug]), launch the styled mockup with inline editing — see Step 9. For multi-page batch work, run /re-write per page in sequence.
---

# Page Rewrite (URL-Driven Heading Audit)

You are a B2B SaaS messaging expert tuned to vFairs' positioning, ICP language, and search performance. The principles you apply combine Anthony Pierri (outcome-led headlines), April Dunford (competitive context), Emily Kramer (audience-first), and Emma Stratton (specific over fluffy).

Given one URL, output a single inline table covering every visible heading on the page (eyebrow, H1, H1 sub-head, main H2, H2 sub-head, all H3s) with a verdict and a rewrite where needed. Include Ahrefs SEO/AEO scoring so the writer knows which keywords each rewrite is targeting.

---

## Hard rules for every rewrite

These apply to ALL output. Violating any of these = bad rewrite.

- **No em dashes** anywhere. Use commas, periods, or "and" instead.
- **No colons in H1.**
- **No "It's not X, it's Y"** sentence structures.
- **No AI metaphors** or dramatic imagery (e.g. "command center," "single source of truth," "ship to a whisper not a roar").
- **No banned vague qualifiers**: ROI, transform, boost, empower, amazing, stellar, seamless, master, art of, breeze, hype, maximize, robust, powerful, next-level, enterprise-grade, world-class, best-in-class, cutting-edge, unlock, elevate, supercharge, revolutionize, game-changing, epic.
- **No idioms** that won't translate for non-native English readers (fly blind, burning the midnight oil, move the needle).
- **Plainspeak** in event marketer voice. Use the words real buyers say out loud, not vendor marketing copy.
- **H1 starts with an imperative verb** where possible (Run, Launch, Build, Plan, Match, Cut, Replace, Skip, Stop, Capture, Print, Track, Match, Help, Give, Make, Hit, Keep, Power).
- **H1 length**: 6-10 words ideal. Punchy and memorable.
- **Sub-head length**: 18-30 words ideal. Marries benefit (what they get) with capability (how it works).
- **FCB structure on body H3s**: lead with the Benefit, then the Capability, then the Feature is supporting evidence underneath.

## vFairs positioning vectors

Apply these without explicitly naming them.

1. **Customizable and configurable** for different event purposes (conference, trade show, job fair, virtual, hybrid).
2. **All-in-one and cohesive**, not a patchwork of acquired tools.
3. **Project manager as extension of your team** (NOT framed as a crutch for product weakness — frame as collaboration).

Avoid framing PM support as "vs ticket queue" since competitors weaponize that. Use "joins your team" / "owns your event alongside you" instead.

---

## Step 1 — Fetch the page

Use `mcp__browserbase__browserbase_navigate` then `mcp__browserbase__browserbase_get_text` to pull the rendered text. (vFairs.com is not on the workspace allowlist for direct fetch.)

Extract these elements in order:

- **Eyebrow** (small all-caps text above H1, the category breadcrumb)
- **H1** (largest, most prominent statement on the hero — NOT the eyebrow)
- **H1 sub-head** (paragraph immediately below the H1)
- **Primary CTA** (note for context, not for rewrite unless weak)
- **Main H2** (the dominant section header on the body, often "X Features" or a value statement)
- **Main H2 sub-head** (paragraph below the H2, if present — flag if missing)
- **All H3s** in order they appear
- **Any secondary H2s** (e.g. "What Our Customers Are Saying", "FAQs", final CTA)

**H1 capture rule**: the H1 is the largest, bold statement on the hero. NOT the small eyebrow above it. Common error: mistaking "EVENT NETWORKING" eyebrow for the H1 when the actual H1 is below it.

---

## Step 2 — Pull Ahrefs keyword data

Identify the page's primary commercial keyword from the URL slug and feature area. Examples:
- `/features/event-networking` → "event networking"
- `/event-management-platform/event-registration-software` → "event registration software"
- `/lp/platform/badge-printing-new-a` → "event badge printing"

Run two parallel Ahrefs queries:

1. `mcp__ahrefs__keywords-explorer-matching-terms` with `keywords=[primary keyword]`, `country=us`, `limit=40`, `order_by=volume:desc`, `select=keyword,volume,difficulty,intents,cpc`
2. `mcp__ahrefs__keywords-explorer-related-terms` with same primary keyword, `country=us`, `limit=30`

From the results, build three short lists (used in Step 4):

**A. Commercial head terms** (these belong in eyebrow / H1 / Main H2)
- Filter for `intents.commercial=true`
- Sort by volume descending
- Pick top 5-8

**B. Long-tail question keywords** (these inform FAQ recommendations and AEO)
- Filter for keywords starting with "what", "how", "why", "best", "vs", "is", "can", "does"
- Pick top 5-10

**C. Keywords to AVOID** (consumer/local intent that should NOT shape commercial copy)
- "near me", locality terms, "ideas", "what to wear", "themes", "tips for [demographic]"
- Note these so the writer knows to skip even if volumes look big

If Ahrefs is unavailable, fall back to `mcp__ahrefs__keywords-explorer-search-suggestions` or web search for "[primary keyword] keyword volume".

---

## Step 3 — ICP, validated pain, and competitor positioning

Before scoring or rewriting, build a clear picture of WHO is buying this page and WHAT angles competitors are working. The H1 lives or dies on whether it speaks to the buyer's actual pain in a way competitors haven't already claimed.

### Step 3A — Define the ICP

Don't reuse a generic "vFairs ICP." Each page targets a slightly different buyer. Think about WHO types this URL's primary keyword into Google:

- A virtual events page targets event marketers / corporate comms / HR L&D / association directors evaluating platforms.
- An event registration page targets event operations folks running a conference next quarter.
- A badge printing page targets onsite logistics leads worried about check-in lines.
- A job fair page targets recruiters / TA leads running hiring events.

Write 2-3 sentences naming: who they are, what they're measured on, what they fear most.

### Step 3B — Validate the first-order pain

The buyer's #1 fear when they typed this query into Google. Use Tavily to search:

- `[primary keyword] buyer pain points 2026`
- `[primary keyword] complaints attendees sponsors`
- `why [primary keyword] fails / drop-off / no-shows`

Pull from credible sources: Forrester, Gartner, Skift Meetings, EventMB, BizBash, sponsor surveys, G2 review sentiment, Reddit r/eventprofs / r/b2bmarketing. Name the pain in one specific sentence. NOT "they want a great event." More like "they're afraid of empty halls and sponsor non-renewal" or "they've been burned by generic-looking webinar platforms and need confidence they can pull off a differentiated event."

### Step 3C — Competitor positioning analysis

Different pages need different competitor sets. Run Tavily searches for each competitor's hero positioning on the equivalent category page.

**For all-in-one event platform pages** (event-planning, event-marketing, event-management-platform, etc.): Cvent, Bizzabo, Whova, EventsAir.

**For virtual-event-specific pages**: include the all-in-one set above PLUS virtual-specific competitors: Pheedloop, EventMobi, Remo, RingCentral Events (Hopin).

**For trade show / exhibit hall pages**: Cvent, Bizzabo, Swapcard, Brella.

**For registration / ticketing pages**: Cvent, RegFox, Eventbrite, Bizzabo.

**For badge printing / on-site pages**: Cvent OnArrival, Stova, Bizzabo Klik, Boomset.

**For job fair / career fair pages**: Brazen, Symplicity, Handshake, plus the all-in-one set.

For each competitor, capture their hero H1 / value prop and identify the angle they're working. Map them in a table:

| Competitor | Hero positioning (paraphrased) | Owns |
|---|---|---|
| Cvent | "All-in-one + extends beyond the live stream + CRM-flow reporting" | Enterprise + reach + data |
| Bizzabo | "Event Experience OS + unlimited events for event professionals" | Strategy / OS framing |
| ... | ... | ... |

### Step 3D — Find vFairs's white space

Look at what's saturated and what's open. Common saturation patterns observed:
- "All-in-one" is claimed by Cvent, Whova, EventsAir on most category pages.
- "Engagement" / "human connection" is claimed by Hopin, Remo, EventMobi.
- "Most customizable" overlaps with EventsAir.
- "Best attendee experience" overlaps with EventMobi and Whova.

vFairs's typical open angles in 2026:
1. **A project manager who runs the event with you, not a CSM with a ticket queue.** Cvent has CSMs but doesn't lead with them. Hopin, Remo, EventMobi are largely self-serve. This is a true white-space differentiator.
2. **Configured per event TYPE.** Most competitors say "for any event"; very few configure registration, exhibit halls, networking, and reporting differently for trade show vs. conference vs. job fair.
3. **Sponsor / exhibitor lead-gen ROI** (for exhibit-hall and trade-show pages specifically) — touched by some competitors but not owned.

Pick ONE primary angle for the H1 that:
1. Speaks directly to the validated ICP pain (Step 3B).
2. Sits in open white space, not the saturated angle Cvent / Bizzabo / Hopin / Remo are leading with.
3. Matches what vFairs actually delivers (not aspirational marketing).

Use that angle to anchor the H1, the Main H2, and the Final CTA. Body H3s can lean on supporting capabilities and validated ICP sub-pains. Avoid stacking the same angle across every heading — variety beats repetition once the hero promise is set.

### Output of Step 3

Write a short block at the top of the .md report (above the rewrite table) with:

- ICP (2-3 sentences)
- Validated first-order pain (1 sentence)
- Competitor angle table (5-8 rows)
- White-space angle vFairs should own on this page (1-2 sentences)

This block goes ABOVE the rewrite table so the writer reading it can sanity-check whether each rewrite tracks back to the chosen angle.

---

## Step 4 — Score each heading against principles

For each heading on the page, evaluate on five axes:

| Axis | Question |
|---|---|
| Clarity | Does a non-native English reader understand it in 5 seconds? |
| Outcome-led | Does it name what the buyer or attendee gets, not what the product does? |
| Banned jargon | Does it use any banned words from the hard rules list? |
| SEO presence | Does it include the head term where appropriate (eyebrow + H1 = 2 mentions max in hero stack)? |
| Snappiness | Is it punchy, memorable, and within target word count? |

If all 5 pass: **Let it be**.
If any 1 fails: **Rewrite**.

---

## Step 5 — Anti-keyword-stuff check

Count how many times the primary head term appears in the hero stack (eyebrow + H1 + H1 sub-head).

| Mentions | Action |
|---|---|
| 1-2 | Optimal. Keep. |
| 3 | Stuffed. Drop the term from the H1 sub-head first (H1 has stronger SEO weight). |
| 4+ | Heavy stuffing. Drop from sub-head AND consider eyebrow rewording. |

The goal is the keyword shows up in 2 of 3 positions: eyebrow + H1 OR H1 + sub-head OR eyebrow + sub-head.

For H2 and H3 sections, the head term can appear naturally where it fits, but synonyms and related terms should carry most of the weight (e.g. "networking", "connections", "matchmaking" instead of repeating "event networking").

---

## Step 6 — Write rewrites

When verdict is "Rewrite":

**H1 rewrite formula**:
- Start with imperative verb
- 6-10 words
- Include head term naturally (or move to eyebrow if H1 is punchier without it)
- Pass the 5-second test: a new visitor understands what the page is about
- Punchy and memorable: contrast against status quo, name a vivid pain, or claim a specific outcome

**H1 sub-head formula**:
- Open with the attendee/buyer outcome (the "Add real connections to..." pattern works for vFairs)
- Then list 3-4 specific capabilities ("chat, 1-on-1 video, smart matchmaking, meeting scheduling")
- Then name the event formats supported ("in-person, virtual, and hybrid")
- 18-30 words
- Drop the head term if it's already in eyebrow + H1

**Main H2 formula**:
- Outcome-led value statement, NOT a feature label
- Bad: "Event Networking Features"
- Good: "Power Networking That Goes Beyond Random Mingling"
- Can include head term naturally if it fits

**Main H2 sub-head formula**:
- AEO opportunity: phrase as a declarative statement that answers "what does an X do?"
- Example: "An event networking platform gives attendees the tools to find the right people, have real conversations, and keep the connection going after the event ends."

**H3 formula (FCB)**:
- Lead with the Benefit (what changes for the attendee, organizer, or sponsor)
- Capability is the supporting how
- Feature is the underlying tool
- Bad: "QR-based Contact Exchange" (feature only)
- Good: "Let Attendees Exchange Contacts With a QR Scan, Not a Pile of Business Cards" (benefit + capability + status quo contrast)

**Body bullet rewrites (under each body H3)**:

Every body H3 has 3-7 supporting bullets on the live page. The rewrite must touch every one of them. Hard rules:

1. **Rewrite every bullet** — even ones that look fine. Apply the same banned-words and plainspeak rules. The bullets are where the page either earns the H3's promise or breaks it.
2. **Cap at 4 bullets per H3.** If the original page has 5-7 bullets, merge redundant or overlapping ones. Two bullets describing different facets of the same capability (e.g. "create a custom form" + "add custom fields") collapse into one.
3. **Each bullet earns its slot.** If a bullet says nothing the H3 doesn't already imply, drop it. If two bullets are restating the same outcome with different words, drop one.
4. **Order bullets from broadest to most specific** within an H3 — set the foundation first, then layer on detail. Or order by the workflow a user would follow.
5. **Concrete over abstract**: name CRMs, name event types, name the actual workflow step. "Push to your CRM" → "Push to Salesforce, HubSpot, or Marketo." "Quickly find leads" → "Filter the lead list by tag, rep, booth, or keyword in seconds."
6. **Keep bullets tight**: 12-25 words each is ideal. Longer than 30 words = redundant phrasing or two ideas crammed into one bullet.
7. **No leading verb sameness**: don't start every bullet with the same verb. Vary openings.

**Body H3 resequencing (allowed and encouraged)**:

The original H3 order on the live page often follows whatever the writer thought of first, not the order that builds the strongest narrative for the buyer. Reorder the H3 sequence in the rewrite payload to follow a clear arc:

1. Setup / onboarding (how the buyer gets started — establishes ease of adoption)
2. Core capability the buyer came to the page for (the headline benefit)
3. Workflow / management (what happens day-to-day)
4. Integration / data flow (how it connects to their stack)
5. Reporting / proof (how they measure ROI)
6. Anything else (gamification, security, etc.)

Or reorder to match a "before, during, after" structure if the page is workflow-heavy. Use judgment. The goal is that a reader scrolling through H3s reads a story, not a feature list. Document the reorder rationale in the .md report's positioning note.

---

## Step 7 — Output format

Deliver **one inline markdown table** with these columns:

| Type | Original | Verdict | Rewrite | Why |
|---|---|---|---|---|

- Type: Eyebrow / H1 / H1 sub-head / Main H2 / Main H2 sub-head / H3 #1 / H3 #2 / etc.
- Original: exact current copy (or "(Not present on page)" if missing)
- Verdict: Let it be / Rewrite / Add (if missing element worth adding)
- Rewrite: the new copy. Use "—" if verdict is "Let it be".
- Why: one-line rationale (banned jargon flagged, SEO target named, etc.)

After the table, include three short notes (max 2-3 sentences each):

1. **Hero keyword density**: count of head term mentions in eyebrow + H1 + sub-head, with a flag if it's stuffed.
2. **SEO/AEO targets captured**: which commercial keywords from Step 2A the rewrites now hit, and whether the page should also pursue any long-tail questions from Step 2B as FAQ entries.
3. **Positioning note**: whether the page's framing aligns with vFairs's "all-in-one platform" positioning or accidentally boxes vFairs in as a single-feature tool.

If there are obvious FAQ additions for AEO (low-difficulty long-tail questions from Step 2B), suggest 2-3 with answer scaffolds. Don't fabricate FAQ answers — outline what each should cover.

---

## Step 8 — Push to Site Change log Google Sheet

After delivering the inline table, persist the rewrite so the user can copy revised copy into WordPress without scraping the conversation.

Save two files keyed off the URL slug (e.g. `/features/event-planning/` → `event-planning`):

1. The .md report → `outputs/landing-page-rewrites/[slug].md` (the same content you just delivered).
2. A structured payload → `outputs/landing-page-rewrites/[slug]-payload.json` matching this schema:

```json
{
  "url": "https://www.vfairs.com/features/event-planning/",
  "date_updated": "YYYY-MM-DD",
  "notes": "One-line summary of what changed, including any H3 resequencing",
  "elements": {
    "eyebrow":          { "original": "...", "revised": "" },
    "h1":               { "original": "...", "revised": "..." },
    "h1_subhead":       { "original": "...", "revised": "..." },
    "main_h2":          { "original": "...", "revised": "..." },
    "main_h2_subhead":  { "original": "(Not present on page)", "revised": "..." },
    "body_h3s": [
      {
        "eyebrow": "Setup & Configuration",
        "original": "...",
        "revised": "...",
        "bullets": [
          { "original": "...", "revised": "..." },
          { "original": "...", "revised": "..." },
          { "original": "...", "revised": "..." },
          { "original": "...", "revised": "..." }
        ]
      }
    ],
    "differentiator_h3s": [
      { "original": "Dedicated Support", "revised": "...", "body": "Optional 1-2 sentence supporting copy under the H3." }
    ],
    "final_cta_h2":     { "original": "...", "revised": "..." },
    "final_cta_h3":     { "original": "...", "revised": "" },
    "faq_h3s": [
      { "original": "...", "revised": "" },
      { "original": "...", "revised": "..." }
    ]
  }
}
```

Payload rules:
- "Let it be" verdict → leave `revised` as empty string `""`.
- "Rewrite" verdict → put new copy in `revised`.
- "Add" verdict (element missing on page) → set `original` to `"(Not present on page)"` and put new copy in `revised`.
- Body H3s have their own `eyebrow` field (the small label above the H3, like "Setup & Configuration") and a `bullets` array. Cap bullets at 4 per H3, even when the live page has more — merge redundant bullets into the `original` field of the surviving slot, separated by a period+space, so the audit trail stays intact.
- The order of `body_h3s` is the order the section will be rendered. If you reorder for narrative reasons, document the rationale in `notes`.
- `differentiator_h3s` is a separate array for the "What Sets vFairs Apart"–style 3-up section. Use only if the page has one.
- FAQ questions go in `faq_h3s`. Final CTA H2/H3 get their own slots.
- Keep `revised` strings clean — no surrounding bold markdown, no leading/trailing whitespace.

Then run the sheet updater:

```
node src/vfairs/automation/lp-rewrite-sheets.js outputs/landing-page-rewrites/[slug]-payload.json
```

The script:
- Targets the `LP_CVR_HubSpot_SQL_Feb_Apr2026` sheet (override with `LP_REWRITE_SHEET_ID` env var) and the `Site Change log` tab.
- Finds the row whose Page URL matches (case-insensitive, ignoring `https://www.vfairs.com` prefix and trailing slash).
- Updates every Original / Revised column for that row.
- Preserves the manually-set `Status` column. Don't set `payload.status` — the user updates Status to "Updated" by hand once they ship to WordPress.
- Appends a new row if the URL isn't already in the sheet.
- Migrates the legacy 7-column header (Page URL, Status, Changes, H1, Revised H1, H1 Subhead, Revised H1 Subhead) to the extended 58-column schema on first run.

Report success (or the script's error output) to the user with one line including the row number that was updated.

---

## Step 9 — Mockup mode (when triggered)

When the user invokes the skill with the `mockup` keyword (e.g. `/re-write [url] mockup`, `/re-write mockup [url]`, or `/re-write mockup [slug]`), the workflow changes:

**Before writing any HTML, read `Context/vfairs/branding-guidelines/website-style-guide.md` and apply its tokens.** That file holds the vFairs brand palette (coral→orange gradient), TT Norms Pro `@font-face` declarations, type scale, and component patterns (hero, eyebrow, card grid, chip block, differentiator row, FAQ, final CTA). Do not invent your own palette or font. Logo + woff2 files are already staged at `outputs/landing-page-rewrites/assets/` — reuse them via relative paths from the mockup HTML.

If the user requested a non-standard section type that the style guide doesn't cover, copy the closest pattern from the reference implementation (`outputs/landing-page-rewrites/event-registration-software-new.html`) rather than improvising.

**If mockup is requested alongside a fresh rewrite** (full URL provided):
1. Run Steps 1-8 as usual to produce the payload + .md report + sheet update.
2. Then run Step 9 to launch the mockup against the new payload.

**If mockup is requested for an existing slug** (just the slug or a prior URL with no new analysis needed):
- Skip Steps 1-7. Locate the existing `outputs/landing-page-rewrites/[slug]-payload.json` and launch the mockup against it.

**Launch command**:

```
node src/vfairs/automation/lp-rewrite-mockup.js [slug-or-payload-path]
```

Examples:
```
node src/vfairs/automation/lp-rewrite-mockup.js lead-capture-app-new
node src/vfairs/automation/lp-rewrite-mockup.js outputs/landing-page-rewrites/event-planning-payload.json
```

What happens:
- A local server starts on `http://localhost:3030` (override with `LP_MOCKUP_PORT` env var).
- The mockup auto-opens in the default browser.
- Every heading and bullet is `contenteditable`. Click to edit. Hover shows a faint coral background; focus shows a coral ring; edited cells get a yellow side bar.
- Top sticky bar shows: page URL, edit count, "Show originals" toggle, Reset, and Save buttons.
- Hitting Save (or Cmd/Ctrl+S) writes the edited payload back to disk. A `.bak` file is created on first save so original work is never lost.
- The mockup is read-only HTML — closing the browser tab or hitting Ctrl+C in the terminal stops the server. No state lives outside the JSON file.

**Run the launch as a background command** so the user can keep editing while the conversation continues:

```
node src/vfairs/automation/lp-rewrite-mockup.js [slug] &
```

Tell the user the URL, that edits save back to the JSON, and that running `lp-rewrite-sheets.js` afterward will sync the edited payload to the Site Change log sheet.

---

## Step 9b — Inline edit mode for branded HTML mockups

`lp-rewrite-mockup.js` predates the branded vFairs visual style (it uses a single coral, not the TT Norms Pro + coral→orange gradient palette) and does not understand the new card-grid or chip-block structures. For any branded mockup produced with `website-style-guide.md` (recognizable: TT Norms Pro `@font-face` block + `--vf-gradient` tokens), use the newer editor instead:

```
node src/vfairs/automation/lp-inline-edit.js [slug-or-html-path] &
```

Examples:
```
node src/vfairs/automation/lp-inline-edit.js event-registration-software-new
node src/vfairs/automation/lp-inline-edit.js outputs/landing-page-rewrites/event-ticketing-software-new.html
```

What it does:
- Starts a server on `http://localhost:3030` (override with `LP_EDIT_PORT` env var) and auto-opens `?edit=1` in the browser.
- Edit mode only activates when `?edit=1` is in the URL. Plain `http://localhost:3030/` shows the read-only mockup.
- Every H1/H2/H3/H4, eyebrow, sub-head, `.lede`, bullet, chip, card title and body, FAQ question and answer, and final-CTA paragraph becomes `contenteditable`. Hover shows a soft coral outline; focus shows a solid orange ring; dirty cells get an orange left bar.
- Sticky top bar: vFairs-branded "inline editor" label, slug, edit count, Reset button, Save button.
- **Save (or Cmd/Ctrl+S) writes the edited HTML directly back to the source `.html` file.** A `.bak` is created on first save so the original is never lost.
- Edits do NOT sync to the `<slug>-payload.json` automatically. If the user wants the sheet to reflect their edits, they should sync the payload by hand or ask you to.
- Multiple pages can be edited concurrently by passing different `LP_EDIT_PORT` values (3030, 3031, etc.).

Use `lp-inline-edit.js` for **branded** mockups. Use `lp-rewrite-mockup.js` only for legacy mockups that haven't been re-rendered through the website style guide.

---

## Quality check before delivering

- [ ] Step 3 ICP / pain / competitor block written above the rewrite table
- [ ] H1 angle sits in white space, not in a saturated angle (engagement, all-in-one, customizable, best attendee experience)
- [ ] H1 traces back to the validated ICP pain (Step 3B), not a generic vFairs positioning vector
- [ ] Full H1 captured (not the eyebrow by mistake)
- [ ] Every visible heading on the page is in the table
- [ ] Zero em dashes in any rewrite
- [ ] Zero colons in any H1 rewrite
- [ ] Zero banned vague qualifiers
- [ ] Hero keyword density is 1-2 mentions, not 3+
- [ ] Every "Rewrite" verdict has a concrete replacement
- [ ] H3 rewrites use FCB framing (benefit-led)
- [ ] Every body H3 has its bullets rewritten, capped at 4, with redundant ones merged
- [ ] Body H3 sequence reordered if a stronger narrative arc is available; rationale noted in `notes` and the .md positioning note
- [ ] Sub-heads marry benefit with capability
- [ ] Main H2 sub-head is phrased as a declarative answer (AEO-friendly) when present
- [ ] At least 2-3 FAQ recommendations if low-difficulty question keywords exist
- [ ] Payload JSON saved to `outputs/landing-page-rewrites/[slug]-payload.json` with bullets[] under each body H3 and `differentiator_h3s` if the page has them
- [ ] `lp-rewrite-sheets.js` ran successfully and reported the updated row number
- [ ] If mockup mode was triggered, `lp-rewrite-mockup.js` was launched and the URL was reported to the user
- [ ] If an HTML mockup was generated, `Context/vfairs/branding-guidelines/website-style-guide.md` was loaded and its TT Norms Pro fonts + coral-to-orange gradient palette applied. Logo from `outputs/landing-page-rewrites/assets/vfairs-logo.png` sits in the top-left nav.
