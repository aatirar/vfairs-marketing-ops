---
name: page-builder
description: Build a complete, research-backed content brief for a vFairs solution, product, feature, or industry page. Takes a keyword (e.g. "convention management software", "festival app", "AI matchmaking", "event software for non-profits"), researches the domain + competitors, maps vFairs capabilities, and writes the full page — H1, subheading, all section copy, bullets, FAQ, CTAs — as a production-ready .md file.
allowed-tools: mcp__tavily__tavily_search, mcp__tavily__tavily_extract, mcp__tavily__tavily_research, mcp__duckduckgo__search, mcp__duckduckgo__fetch_content, Read, Write
---

# Page Builder Skill

Produces a full, production-ready page content brief for vFairs.com. Follows the writing guide at `.claude/skills/page-builder/writing-guide.md`.

---

## INPUT

```
/page-builder "[keyword]" [optional: solution|product|feature|industry]
```

**Examples:**
```
/page-builder "convention management software"
/page-builder "festival app" product
/page-builder "AI matchmaking" feature
/page-builder "event software for non-profits" industry
```

If page type is not specified, infer it from the keyword:
- Describes an event format or end-to-end solution → **solution**
- Describes a specific tool/app the attendee or organizer uses → **product**
- Describes one specific capability within the platform → **feature**
- Describes a vertical, audience type, or industry → **industry**

---

## PHASE 0: Read the Writing Guide

Before doing anything else, read the full writing guide:
```
.claude/skills/page-builder/writing-guide.md
```

This guide defines all fold structures, copy principles, vocabulary rules, and page-type checklists. Follow it throughout.

Also read:
```
context/vfairs/about-vfairs.md
context/vfairs/vfairs-overview.md
```

---

## PHASE 1: Domain Research

Understand the domain this keyword lives in. The goal is to know: what does success look like for someone searching this keyword? What problems do they face? What do they need from software?

### Step 1A: Deep research pass

Call `mcp__tavily__tavily_research`:
- query: `"[keyword] software features use cases event management 2025 2026"`
- search_depth: "advanced"
- max_results: 10

Capture: what this domain is, who uses it, what their key jobs-to-be-done are, industry-specific vocabulary, pain points.

### Step 1B: What do buyers care about?

Call `mcp__tavily__tavily_search`:
- query: `"[keyword] what to look for when choosing software buyers guide"`
- max_results: 8

Capture: evaluation criteria, must-have features, common objections.

---

## PHASE 2: Competitor Messaging Analysis

Research the top-ranking pages for this keyword and extract their messaging patterns.

### Step 2A: Find top-ranking competitors

Call `mcp__tavily__tavily_search`:
- query: `"[keyword]"` (exact keyword, no additions)
- max_results: 10

Identify the top 3–5 ranking pages that are direct competitors or category players (not vFairs). Skip directories, Wikipedia, and news articles.

### Step 2B: Extract competitor page content

Call `mcp__tavily__tavily_extract` on the top 3 competitor URLs:
- extract_depth: "advanced"
- query: "headline value proposition features differentiators"

For each competitor, capture:
- H1 / main headline
- Subheading / hero description
- Top 3 value propositions or capability claims
- Any specific differentiators they emphasize
- Vocabulary they use (what words do they use for the ICP's problems?)

### Step 2C: Identify messaging gaps and opportunities

After extracting 3 competitors, synthesize:
1. What messaging themes appear on every competitor page? (table stakes — must address)
2. What is everyone saying the same way? (opportunity to zig)
3. What is no one saying that vFairs can credibly say? (differentiation opening)
4. What vocabulary does this audience use that should appear in our copy?

---

## PHASE 3: vFairs Capability Mapping

Map what vFairs actually has that is relevant to this keyword. This is the most important phase — the page can only be as strong as the capability claims behind it.

### Step 3A: Read vFairs context

Read the following files to understand vFairs' full capability set:
- `context/vfairs/about-vfairs.md`
- `context/vfairs/vfairs-overview.md`

Cross-reference what vFairs does against the keyword domain.

### Step 3B: Search for relevant vFairs pages

Call `mcp__duckduckgo__search`:
- query: `site:vfairs.com "[keyword]"` OR `site:vfairs.com "[related feature]"`
- max_results: 5

If relevant vFairs pages are found, extract them with `mcp__tavily__tavily_extract` to understand how vFairs currently covers this topic.

### Step 3C: Capability confidence check

After the above research, assess vFairs' coverage of this keyword across these dimensions:

```
CAPABILITY INVENTORY — [keyword]

Core capabilities (vFairs clearly has these):
- [capability 1]
- [capability 2]
...

Adjacent capabilities (vFairs has related features that apply):
- [capability] — relates via [connection]
...

Uncertain capabilities (may exist but not confirmed):
- [capability] — [what needs clarification]

Confirmed NOT available:
- [capability] — [source of confidence]
```

**If there are more than 2 "uncertain" capabilities:** Stop and ask the user a focused set of questions before proceeding. Format:

```
Before I write the page, I need to confirm a few things about vFairs' capabilities for "[keyword]":

1. Does vFairs support [specific feature]? If so, what does it look like in the product?
2. Can [specific workflow] be done natively, or does it require an integration?
3. [Additional question]

Answer as many as you know — I'll work with what you give me.
```

Wait for user response before proceeding to Phase 4.

---

## PHASE 4: Value Proposition Development

Synthesize the research into the specific value propositions and capability points this page will focus on.

### Apply the Dunford 4-part framework:

For this keyword, define:

1. **Competitive alternative** — what does this reader do today without vFairs?
2. **Unique capabilities** — what does vFairs do that the alternative can't (or does worse)?
3. **Value delivered** — what changes for the reader because of those capabilities?
4. **Best-fit reader** — who specifically benefits most?

### Apply the Kramer messaging ladder:

Map the key features up the ladder:
```
Feature → Benefit → Outcome → Positioning statement
```

Do this for the top 5–6 capabilities you'll write feature sections for.

### Output of Phase 4:

Before writing the page, produce a "messaging skeleton":

```
## Messaging Skeleton — [keyword]

**Page type:** [solution / product / feature / industry]
**Primary ICP:** [specific person or role]
**Core outcome promise:** [what changes for them after using vFairs for this]
**Competitive alternative they're coming from:** [what they do today]
**Top differentiator:** [what vFairs does that competitors can't match on this page]

**Value propositions (in priority order):**
1. [VP 1] — supported by: [capability]
2. [VP 2] — supported by: [capability]
3. [VP 3] — supported by: [capability]
4. [VP 4] — supported by: [capability]
5. [VP 5] — supported by: [capability]

**Feature sections to write:** [list]
**FAQ questions to address:** [list]
**Keywords to include naturally:** [list]
```

Show this to the user and ask: "Does this messaging direction look right? Any capabilities to add or reprioritize before I write the full page?"

**Wait for user confirmation before proceeding to Phase 5.**

---

## PHASE 5: Write the Full Page

Now write the complete page content following the writing guide's 9-fold architecture. Produce a structured `.md` file.

### Copy quality checklist (apply before finalizing each fold):

- [ ] H1 leads with outcome, not feature name
- [ ] Subheading uses concrete nouns, not abstract verbs
- [ ] Every H2 (feature section headline) = outcome-led, not action-led
- [ ] Every bullet = capability → outcome (implicit or explicit "so that")
- [ ] Setup sentences for each feature section frame the problem first
- [ ] No jargon from the banned vocabulary list (seamless, leverage, empower, facilitate, holistic, robust, elevate, transform, unleash, best-in-class, cutting-edge)
- [ ] No em dashes in body copy
- [ ] No "It's not X, it's Y" structures
- [ ] CTAs are action + value ("See [X] in Action") not generic ("Learn More")
- [ ] FAQ answers are specific and honest, not vague

---

## OUTPUT FORMAT

Save to: `outputs/vfairs/pages/[keyword-slug]-page-[YYYY-MM-DD].md`

```markdown
# Page Content Brief: [Keyword]

**Page type:** [solution / product / feature / industry]
**Target keyword:** [primary keyword]
**Secondary keywords:** [list]
**Date:** [today]

---

## SEO Metadata

**Page title:** [Primary Keyword | vFairs] — max 60 chars
**Meta description:** [Outcome + proof point + CTA] — max 155 chars
**URL slug:** `/[type]/[keyword-slug]/` (suggested)

---

## FOLD 1: HERO

**H1:**
[headline — max 10 words]

**Subheading:**
[1–2 sentences — concrete capabilities + outcome]

**Primary CTA:** [button text]
**Secondary CTA:** [button text]

---

## FOLD 2: TRUST STRIP

**Logo recommendations:** [6–8 customer logos relevant to this ICP]
**Awards to show:** [G2, Gartner, Capterra badges]

---

## FOLD 3: FEATURE SECTIONS

### Section 1: [Outcome-led H2]

**Setup:** [1–2 sentences framing the problem]

- [Bullet 1: capability → outcome]
- [Bullet 2: capability → outcome]
- [Bullet 3: capability → outcome]
- [Bullet 4: capability → outcome — optional]
- [Bullet 5: capability → outcome — optional]

**Visual suggestion:** [what to show in the screenshot/illustration]
**Secondary CTA:** [optional — "See How It Works →"]

---

### Section 2: [Outcome-led H2]
[same structure]

---

[Repeat for all 4–8 sections]

---

## FOLD 4: SOCIAL PROOF

**Featured quote:**
> "[Specific customer quote — ideally outcome-focused]"
> — [Name], [Title], [Company]

**Supporting stat:** [Key metric if available]
**Case study link:** [If applicable]

---

## FOLD 5: USE CASE GRID
*(Solution and Industry pages only)*

**Grid heading:** [e.g. "Built for Every [Format/Vertical] You Run"]

| Event Type | 1-sentence description |
|---|---|
| [Type 1] | [Outcome-led description] |
| [Type 2] | [Outcome-led description] |
[6–8 rows]

---

## FOLD 6: PRODUCT TOUR
*(Product and Industry pages)*

**Eyebrow:** See It in Action
**H2:** [Watch / Try] [Product Name] in [X] Minutes
**Body:** [1–2 sentences. No sales call framing. Specific outcome visible.]
**CTA:** Start Product Tour

---

## FOLD 7: RELATED CONTENT
*(Optional)*

**Featured resource:**
- Type: [Case study / Guide / Blog post]
- Title: [Resource title]
- Description: [1 sentence]
- CTA: [Read the Story → / Download →]

---

## FOLD 8: FAQ

**Q1:** [Realistic buyer question]
**A:** [Direct, specific, 2–4 sentence answer]

**Q2:** [Realistic buyer question]
**A:** [Direct, specific, 2–4 sentence answer]

[4–6 total Q&As]

---

## FOLD 9: CLOSING CTA

**H2:** [Restate core outcome — different words than H1]
**Body:** [1 sentence. Reduce perceived risk.]
**Primary CTA:** Book a Demo
**Secondary CTA:** Talk to an Expert

---

## RESEARCH APPENDIX

### Messaging Skeleton
[Paste the Phase 4 messaging skeleton here]

### Competitor Messaging Snapshot
| Competitor | H1 | Top VPs | Vocabulary |
|---|---|---|---|
| [Name] | [H1] | [VPs] | [Key words] |
[3 rows]

### Messaging Differentiation Notes
- Table stakes (everyone says): [list]
- vFairs differentiation opportunity: [list]
- Vocabulary from this audience: [list]
```

---

## IMPORTANT RULES

1. **Never fabricate vFairs capabilities.** If you're not sure vFairs has it, ask (Phase 3C) or flag it with `[VERIFY]`.
2. **Confirm messaging direction before writing** (end of Phase 4). Do not skip this check-in.
3. **Follow the writing guide's vocabulary rules.** The banned word list is non-negotiable.
4. **Output every fold** — don't skip folds just because you have less research for them. Use `[TBD — suggest pulling from X]` if you're missing a specific asset like a customer quote.
5. **Save to outputs/vfairs/pages/** — create the directory if it doesn't exist.
