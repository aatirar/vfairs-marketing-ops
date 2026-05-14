---
name: write-landing-page
description: Research and write a full vFairs feature/product/solution landing page. Takes a topic (e.g. "speaker management software", "event badge printing", "hybrid conference platform"), runs keyword research via Ahrefs + SEMRush, researches high-authority sites and Reddit sentiment, analyzes top competitor pages, maps vFairs capabilities, builds a messaging skeleton for user confirmation, then writes production-ready copy following the vFairs landing page template.
allowed-tools: mcp__ahrefs__keywords-explorer-overview, mcp__ahrefs__keywords-explorer-matching-terms, mcp__semrush__keyword_research, mcp__semrush__get_report_schema, mcp__semrush__execute_report, mcp__tavily__tavily_search, mcp__tavily__tavily_extract, mcp__tavily__tavily_research, mcp__duckduckgo__search, mcp__duckduckgo__fetch_content, Read, Write
---

# write-landing-page Skill

Produces production-ready landing page copy for vFairs.com. Combines SEO keyword research, authority domain research, Reddit sentiment, competitive analysis, and vFairs capability mapping — then writes the full page following the vFairs landing page template.

---

## INPUT

```
/write-landing-page "[topic]"
```

**Examples:**
```
/write-landing-page "speaker management software"
/write-landing-page "event badge printing"
/write-landing-page "hybrid conference platform"
/write-landing-page "event registration software"
/write-landing-page "virtual event platform for associations"
```

The topic is usually:
- The primary keyword you want to rank for, OR
- A plain-language description of the feature, product, or solution

If the page type is not clear from the topic, infer it:
- One specific capability within the platform → **feature**
- A standalone product an attendee or organizer uses → **product**
- An event format or end-to-end workflow → **solution**
- A vertical, audience type, or industry → **industry**

---

## PHASE 0: Load Context

Before doing anything else, read these files in parallel:

```
context/vfairs/landing-page-template.md       ← page structure + copy rules
context/vfairs/about-vfairs.md                ← vFairs capabilities + positioning
```

Also read if it exists:
```
context/vfairs/vfairs-overview.md
context/vfairs/marketing-strategy.md
```

Internalize the template's fold architecture, H1/H2 rules, vocabulary bans, and bullet formats. You will apply these throughout.

---

## PHASE 1: Keyword & SEO Research

Goal: Identify the right primary keyword, understand the volume/difficulty landscape, and surface secondary keywords to weave into the page naturally.

### Step 1A: Ahrefs keyword overview

Call `mcp__ahrefs__keywords-explorer-overview`:
- `keywords`: the topic + 8–10 obvious variants (e.g. "[topic] software", "[topic] platform", "[topic] tool", "[topic] system", "best [topic]", "[topic] for events", "conference [topic]", "virtual [topic]")
- `select`: "keyword,volume,difficulty,cpc,traffic_potential,parent_topic,intents"
- `country`: "us"

**Note:** If `intents` throws a column error, retry with `select` using "keyword,volume,difficulty,cpc,traffic_potential,parent_topic" (drop intents).

From the results, identify:
- Primary keyword (highest volume + commercial intent + feasible KD)
- 4–6 secondary keywords to use in H2s and body copy
- Parent topic (this reveals what the SERP is really about — key competitive insight)
- CPC signal (higher CPC = stronger commercial intent)

### Step 1B: Ahrefs matching terms

Call `mcp__ahrefs__keywords-explorer-matching-terms`:
- `keywords`: the primary keyword from Step 1A
- `select`: "keyword,volume,difficulty,cpc,traffic_potential,parent_topic"
- `country`: "us"
- `limit`: 20
- `order_by`: "volume:desc"

From the results, surface:
- Long-tail variants that reveal buyer intent (e.g. "best X for Y", "X vs Y", "X pricing")
- Question-format keywords → these are FAQ opportunities and AI-citation targets
- Any keywords that suggest a specific use case or buyer type

### Step 1C: SEMRush related terms

Call `mcp__semrush__keyword_research` first to get the available reports.
Then call `mcp__semrush__get_report_schema` with `report: "phrase_related"`.
Then call `mcp__semrush__execute_report` with:
- `report`: "phrase_related"
- `params`: the schema-compliant object with `database: "us"`, `phrase: "[primary keyword]"`, `display_limit: 30`, `display_sort: "nq_desc"`, `export_columns: ["Ph", "Nq", "Cp", "Co", "Kd"]`

From SEMRush, capture:
- Any keywords Ahrefs missed, especially question-format terms
- Competitive density signals (Co column — high competition = well-monetized)
- Any keywords with high volume + low KD = additional ranking opportunities

### SEO Research Output (produce this before moving on):

```
## SEO Keyword Plan — [topic]

Primary keyword: [keyword] — vol: X, KD: X, CPC: $X
Parent topic: [parent topic] — implication: [what this tells us about the SERP]

Secondary keywords (use in H2s and body copy):
- [keyword] — vol: X, KD: X
- [keyword] — vol: X, KD: X
- [keyword] — vol: X, KD: X

Long-tail / intent keywords:
- [keyword] — [intent signal it reveals]
- [keyword] — [intent signal it reveals]

FAQ / informational keywords (AI citation targets):
- "what is [topic]" — vol: X
- "how to [topic]" — vol: X
- "[topic] vs [alternative]" — vol: X

Keyword strategy note: [1–2 sentences on how to approach this keyword cluster on the page]
```

---

## PHASE 2: Authority Site Research

Goal: Understand the topic deeply from the perspective of authoritative, non-vendor sources. Find the industry vocabulary, buyer priorities, common pain points, and how experts frame this problem.

### Step 2A: Deep domain research

Call `mcp__tavily__tavily_research`:
- `query`: "[topic] best practices guide event management [current year]"
- `search_depth`: "advanced"
- `max_results`: 8
- `include_domains`: G2.com, Capterra.com, Gartner.com, Forbes.com, Eventbrite.com, MeetingsNet.com, BizBash.com, PCMAconvene.org, EventMarketer.com, Skift.com (use whichever are relevant)

Capture:
- How authoritative sources define this topic
- What problems they say buyers face
- What evaluation criteria they name
- Specific vocabulary and terminology used by practitioners

### Step 2B: Buyer language from review sites

Call `mcp__tavily__tavily_search`:
- `query`: "[topic] reviews complaints what to look for G2 Capterra"
- `max_results`: 8

Call `mcp__tavily__tavily_search`:
- `query`: "[topic] buyer guide what matters most choosing software"
- `max_results`: 6

Capture:
- Specific pain language buyers use ("I had to manually re-enter", "we lost track of", "it took forever to")
- Must-have features vs nice-to-haves from buyer perspective
- Common deal-breakers or objections

### Step 2C: Reddit sentiment

Call `mcp__tavily__tavily_search`:
- `query`: "site:reddit.com [topic] event management frustrations OR problems OR recommendations"
- `max_results`: 8

Call `mcp__tavily__tavily_search`:
- `query`: "site:reddit.com [topic] software which one how do you manage"
- `max_results`: 6

Capture:
- Raw, unfiltered language buyers use to describe their problem (this is copywriting gold)
- Specific workflows or pain points mentioned more than once
- Any competitor names mentioned positively or negatively
- Questions people ask on Reddit = potential FAQ content

**Note:** If Tavily blocks Reddit URLs, try `mcp__duckduckgo__search` with the same queries. Extract what you can from search snippets.

### Step 2D: Synthesize buyer intelligence

From all research in Phase 2, compile:

```
## Buyer Intelligence — [topic]

Primary pain: [the #1 frustration buyers have in this area]
Secondary pains: [2–3 more]

How buyers describe the problem (in their own words):
- "[direct quote or paraphrase from research]"
- "[direct quote or paraphrase from research]"
- "[direct quote or paraphrase from research]"

Must-have features (buyers mention these as table stakes):
- [feature]
- [feature]
- [feature]

Nice-to-haves (mentioned but not deal-breakers):
- [feature]

Common objections or fears:
- [objection]
- [objection]

Vocabulary this audience uses:
- [term they use] (not: [vendor term to avoid])
```

---

## PHASE 3: Competitive Analysis

Goal: Find the top 3–5 pages ranking for the primary keyword, understand their messaging strategy, and identify where vFairs can differentiate.

### Step 3A: Find top-ranking competitor pages

Call `mcp__tavily__tavily_search`:
- `query`: "[primary keyword]" (exact keyword, no additions)
- `max_results`: 10

Identify the top 3–5 results that are:
- Direct competitors or category players (event tech vendors, event management tools)
- NOT: vFairs, directories (G2, Capterra), Wikipedia, general blog posts

These are the pages you'll extract next.

### Step 3B: Extract competitor page content

For each of the top 3 competitor URLs, call `mcp__tavily__tavily_extract`:
- `urls`: [competitor URL]
- `extract_depth`: "advanced"

For each competitor, capture:

```
Competitor: [name + URL]
H1: [exact headline text]
Subheading: [exact subheading text]
Core claim / value prop: [what they promise]
Top 3 feature sections: [headings + 1-sentence summary each]
Differentiator they emphasize: [what makes them unique per their own copy]
Vocabulary they use for buyer problems: [specific words/phrases]
What they're NOT saying: [gaps or missed angles]
```

### Step 3C: Competitive synthesis

After extracting all 3 competitors, answer:

1. **Table stakes** — what messaging appears on every competitor page? (Must address these on the vFairs page or buyers will assume vFairs doesn't have it)
2. **Category clichés** — what is everyone saying the same way? (This is where vFairs can zig with specificity or a different angle)
3. **Gaps nobody is owning** — what can vFairs credibly say that competitors aren't saying? (This shapes the H1 and subheading)
4. **Vocabulary to adopt** — what words do competitors use that real buyers clearly respond to?

```
## Competitive Positioning Map — [topic]

Table stakes (every competitor covers these — must address):
- [item]
- [item]

Category clichés (everyone says this the same way):
- [cliché] — vFairs opportunity: [how to say it differently]

Gaps vFairs can own:
- [gap] — vFairs angle: [specific claim or capability]

Vocabulary to adopt:
- [term]
```

---

## PHASE 4: vFairs Capability Mapping

Goal: Confirm exactly what vFairs can credibly claim on this page. Never fabricate or overstate.

### Step 4A: Read vFairs context files

Already read in Phase 0 — apply here. Cross-reference the topic with vFairs' actual capabilities.

### Step 4B: Search for existing vFairs coverage

Call `mcp__duckduckgo__search`:
- `query`: `site:vfairs.com "[topic]"` OR `site:vfairs.com "[closest related feature]"`
- `max_results`: 5

If vFairs pages are found, extract them with `mcp__tavily__tavily_extract` to understand how vFairs currently describes this topic.

### Step 4C: Capability inventory

```
## Capability Inventory — [topic]

Core capabilities (vFairs clearly has these):
- [capability 1]
- [capability 2]
- [capability 3]

Adjacent capabilities (vFairs has related features that apply here):
- [capability] — connects via: [how it applies to this topic]

Uncertain (may exist but not confirmed):
- [VERIFY] [capability] — [what needs clarification]

Not available (confident):
- [capability] — [why we're confident it's not there]
```

**If there are 2+ [VERIFY] items** — stop and ask the user before proceeding:

```
Before I build the messaging skeleton, I need to confirm a few vFairs capabilities for "[topic]":

1. Does vFairs support [specific feature]? What does it look like in the product?
2. Can [specific workflow] be done natively, or does it require a third-party integration?
3. [Additional question if needed]

Answer what you know — I'll flag anything I can't confirm as [VERIFY] in the output.
```

Wait for user response if you stop here.

---

## PHASE 5: Messaging Skeleton

Synthesize everything from Phases 1–4 into a focused messaging direction. This is the strategic layer before the writing starts.

Apply the frameworks from the template:
- **April Dunford:** What does the reader do today without vFairs? What unique capability does vFairs have vs. that alternative? What value does that unlock?
- **Anthony Pierri:** H1 = outcome for the reader, not a product name. Every section headline = what changes, not what the feature does.
- **Emily Kramer:** Feature → Benefit → Outcome → Positioning. Pages should lead at Outcome level.

Produce this skeleton and show it to the user:

```
## Messaging Skeleton — [topic]

Page type: [feature / product / solution / industry]
Primary ICP: [specific role or person — not "event organizers" but "conference managers at associations running 500+ attendee events"]
Core outcome promise: [what changes for them after using vFairs for this]
Competitive alternative they're replacing: [what they do today without vFairs]
Top differentiator: [the one thing vFairs does here that competitors can't match]

Value propositions (priority order):
1. [VP 1] — supported by: [capability]
2. [VP 2] — supported by: [capability]
3. [VP 3] — supported by: [capability]
4. [VP 4] — supported by: [capability]
5. [VP 5] — supported by: [capability]

H1 options (3 candidates):
A. [Option A — outcome-led]
B. [Option B — pain-removal angle]
C. [Option C — differentiator angle, includes primary keyword for SEO]

Recommended H1: [C usually — includes keyword + outcome]
Subheading draft: [one attempt]

Feature sections to write:
1. [Section topic] — angle: [what outcome this section proves]
2. [Section topic] — angle: [what outcome this section proves]
3. [Section topic] — angle: [what outcome this section proves]
4. [Section topic] — angle: [what outcome this section proves]
5. [Section topic] — angle: [what outcome this section proves]
[Add up to 8 for solution/industry pages]

FAQ questions (sourced from research):
1. [Question — informational/featured snippet target]
2. [Question — objection]
3. [Question — integration/compatibility]
4. [Question — setup/onboarding]
5. [Question — pricing/availability]

Primary keyword: [keyword]
Secondary keywords to weave in: [list]
```

**After producing the skeleton, ask:**

> "Does this direction look right? Any capabilities to add, reprioritize, or correct before I write the full page?"

**Wait for user confirmation before proceeding to Phase 6.**

---

## PHASE 6: Write the Full Page

With the confirmed messaging skeleton, write the complete page following the vFairs landing page template. Use the 9-fold architecture — include all folds appropriate for this page type.

### Copy quality checks (apply to every fold before finalizing):

**Hero:**
- [ ] H1 leads with outcome or combines outcome + primary keyword naturally
- [ ] Subheading names 2–3 specific capabilities, no abstract verbs
- [ ] CTAs are action + value, not generic

**Feature sections (each one):**
- [ ] H2 describes what changes for the reader, not what the feature does
- [ ] Setup sentence frames the problem first (Dunford: context before claim)
- [ ] Every bullet implies capability → outcome (Pierri: "so that" structure)
- [ ] No bullet just names a feature without implying what the reader gets

**Vocabulary pass (entire page):**
- [ ] No em dashes anywhere
- [ ] No banned words: seamless, leverage, empower, facilitate, robust, holistic, elevate, transform, intuitive, best-in-class, cutting-edge, world-class, streamline (unless extremely specific)
- [ ] No colons in H2 headings
- [ ] No "It's not X, it's Y" structures
- [ ] No exclamation points
- [ ] No passive voice in bullets

**FAQ:**
- [ ] Questions are what a real buyer would search, not marketing questions
- [ ] Answers are specific and direct — no hedging, no vague non-answers
- [ ] Written for AI citation (clear question + specific answer)

**SEO:**
- [ ] Primary keyword appears in H1 naturally
- [ ] Secondary keywords appear in at least 2–3 H2s naturally
- [ ] At least one FAQ targets an informational keyword from the research
- [ ] Meta title under 60 characters
- [ ] Meta description under 155 characters

---

## OUTPUT FORMAT

Save to: `outputs/vfairs/pages/[keyword-slug]-page-[YYYY-MM-DD].md`

```markdown
# [Primary Keyword] — Page Copy
*Output for: vfairs.com/[suggested-url-slug]/*
*Written: [date]*

---

## SEO Metadata

**Page URL:** `/[suggested path]/`
**Meta Title:** [Primary Keyword | vFairs] — [X chars]
**Meta Description:** [outcome + proof + CTA] — [X chars]
**Primary keyword:** [keyword] — vol: X, KD: X, CPC: $X
**Secondary keywords:** [list with vol/KD]
**SEO strategy note:** [1–2 sentences on keyword approach]

---

## FOLD 1: HERO

**H1:**
[Headline]

**Subheading:**
[Subheading]

**Primary CTA:** [button text]
**Secondary CTA:** [button text]

---

## FOLD 2: TRUST STRIP

**Logo recommendations:** [6–8 relevant customer logos]
**Badges:** G2 Leader, Gartner Magic Quadrant, Capterra

---

## FOLD 3: FEATURE SECTIONS

### [Outcome-led H2]

[1–2 sentence setup — frames the problem]

- [Capability so that outcome]
- [Capability so that outcome]
- [Capability so that outcome]
- [Capability so that outcome]
- [Capability so that outcome — optional]

**Visual suggestion:** [what to show]

---

[Repeat for all sections]

---

## FOLD 4: SOCIAL PROOF

**Quote:**
"[Specific customer quote]"
— [Name], [Title], [Company]

**Stat:** [Key metric]
**Badges:** G2 rating + review count

---

## FOLD 5: USE CASE GRID
*(if solution or industry page)*

**Heading:** [Built for every X you run]

| Type | Description |
|---|---|
| [Type] | [1-sentence outcome-led description] |

---

## FOLD 7: RELATED CONTENT

**Eyebrow:** From the vFairs Library
**Resource:** [Title — linked]
**Description:** [1 sentence]
**CTA:** Read the Story →

---

## FOLD 8: FAQ

**Q:** [Question]
**A:** [Answer — 2–4 sentences, specific, honest]

[Repeat for 4–6 questions]

---

## FOLD 9: CLOSING CTA

**H2:** [Restate outcome — different words than H1]
**Body:** No commitment required. See [specific capability] live in 30 minutes.
**CTA:** Book a Demo | Talk to an Expert

---

## RESEARCH APPENDIX

### SEO Keyword Plan
[Paste from Phase 1 output]

### Buyer Intelligence
[Paste from Phase 2 output]

### Competitive Positioning Map
[Paste from Phase 3 output]

### Messaging Skeleton
[Paste confirmed skeleton from Phase 5]
```

---

## RULES

1. **Never fabricate vFairs capabilities.** If uncertain, ask (Phase 4C) or flag with `[VERIFY]` in the output.
2. **Always confirm the messaging skeleton before writing.** End of Phase 5 is a mandatory check-in — do not skip it.
3. **Apply every vocabulary rule from the template.** The banned word list is non-negotiable.
4. **Research informs copy — not the other way around.** Don't write the page and then look for research to support it. The buyer language, Reddit complaints, and competitor gaps you found in Phases 2–3 should show up in the copy.
5. **Save all research in the appendix.** The output file should be a complete artifact — anyone picking it up later should see why every copy decision was made.
6. **Output every fold.** If you don't have a customer quote for social proof, write `[TBD — recommend pulling from vFairs G2 reviews for [topic]]`. Don't skip folds.
7. **Ask before writing, not after.** The Phase 5 check-in exists so you don't waste effort writing a page in the wrong direction. Use it.
