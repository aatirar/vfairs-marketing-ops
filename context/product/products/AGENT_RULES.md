# AGENT_RULES.md — vFairs Capability Library Authoring Brief

**Read this in full before writing or editing any file in `platform-modules/`, `event-types/`, or `industries/`.**

This brief is the contract every author (human or agent) follows when adding a capability reference to this library. The library exists so downstream skills (`/page-builder`, `/comparison-page`, `/re-write`, `/sales-pitch`, `/write-landing-page`, `/landing-page-review`) can pull canonical product context from one place instead of re-scraping vfairs.com.

The reference file — and the quality bar — is `platform-modules/mobile-event-app.md`. Read it before you write anything.

---

## 1. Hard constraints (non-negotiable)

These override everything else. A file that breaks any of these is rejected.

### 1.1 No hallucination, no invention
Every claim, feature, integration, certification, customer quote, metric, FAQ, or KB article reference MUST trace to one of:
- `https://www.vfairs.com/*`
- `https://help.vfairs.com/knowledge/*`

If a fact isn't on one of those two sources, leave it out and flag it in the gap notes you return. Do **not** validate vFairs facts against general AI knowledge. Do **not** fill from competitor pages, third-party reviews, or memory.

### 1.2 No NFC anywhere on check-in (or any file)
vFairs check-in supports three modalities only:
- QR codes
- RFID smart badges
- AI facial recognition

Never write "NFC", "NFC tap", "NFC badges" anywhere in this library. If a source page seems to imply NFC, double-check it isn't actually referring to RFID — and if you're unsure, leave it out.

### 1.3 No em dashes in body copy
Use hyphens or rephrase sentences. Em dashes (`—`) are allowed only as section dividers (`---`) in Markdown. Body copy uses ` - ` or commas.

Wrong: "Personalized agenda — built from speakers and tracks"
Right: "Personalized agenda, built from speakers and tracks"
Right: "Personalized agenda - built from speakers and tracks"

### 1.4 No "It's not X, it's Y" sentence structures
This is an AI tell. Rephrase as a direct positive claim.

### 1.5 No AI metaphors or dramatic imagery
No "command center," no "ship features to a whisper," no "your event, supercharged." Use concrete, specific language.

### 1.6 No invented pricing
Section 9 always references `context/vfairs/pricing.md`. Do not guess, anchor, or estimate. If the marketing page shows no prices, write: "No public pricing. Quote depends on event size, feature selection, and packaging. See `context/vfairs/pricing.md` for current indicative ranges."

### 1.7 Preserve vFairs verbatim marketing language
In sections 2 (Positioning) and 10 (FAQ), preserve the brand's own words. Downstream skills depend on this so they don't paraphrase the brand voice incorrectly. Lightly trim only — do not rewrite.

### 1.8 No triple negation
Never stack three "No X. No Y. No Z." sentences. Two is the ceiling.

---

## 2. File structure (13 sections)

Every capability file in `platform-modules/` follows this exact structure. Section numbering matches `mobile-event-app.md`.

### Frontmatter block (top of file, before section 1)

```markdown
# vFairs [Module Name] — Capability Reference

**Type:** Platform Module (Attendee-facing | Admin-facing | Sponsor-facing | Cross-cutting)
**Last updated:** YYYY-MM-DD
**Source URLs:**
- Marketing page: https://www.vfairs.com/[slug]/
- Knowledge base: https://help.vfairs.com/knowledge/[section]

---
```

### Section 1: One-liner
One paragraph (1-3 sentences) describing what the module does and who it's for. Synthesized from the marketing page intro.

**Example from mobile-event-app.md:**
> A configurable mobile app (iOS + Android) that gives every attendee a personalized agenda, networking, push notifications, lead capture, and on-site check-in, available either inside the shared vFairs container app or as a fully white-labeled standalone app in the App Store and Google Play.

### Section 2: Positioning (from marketing page)
Pull verbatim:
- **Headline** (H1 from the marketing page, in quotes)
- **Sub-head** (subtitle / hero supporting copy, in quotes)
- **Primary buyer outcomes the page is sold against** (3-6 bullets, paraphrased from the value-prop blocks below the hero)

### Section 3: Capability Map
Grouped, sub-headed bullet lists. Use the H2/H3 structure on the marketing page to derive groupings (3.1, 3.2, 3.3, ...). Cross-reference with the KB section headings to add any granular capabilities the marketing page glosses over.

Each capability is a one-line bullet. Bold the feature name, then describe it. Example pattern:
> - **Personalized agenda** built from speakers, sessions, and tracks; supports saved seats and waitlists for capped sessions

Group depth target: 5-15 capability groups per module if the source supports it. Density should match `mobile-event-app.md` (sections 3.1 through 3.16).

### Section 4: Deployment Options
A Markdown table when the module ships in multiple modes (e.g. container vs white-label, on-site vs virtual, self-serve vs managed). Omit the section if there's only one deployment mode.

### Section 5: Integrations
Bulleted list grouped by category (CRMs, video/streaming, calendar, payments, etc.). Only integrations explicitly listed on vfairs.com or help.vfairs.com. If unclear, default to vFairs' core integration list: HubSpot, Salesforce, Marketo, Zoom, standard calendar (ICS/Google/Outlook), CSV export.

### Section 6: Supported Event Types
Bulleted list of formats the module is positioned for. Common values: Conferences, Trade shows, Job fairs / career fairs, Summits, Virtual events, In-person events, Hybrid events. Only include event types the marketing page mentions.

### Section 7: Customer Proof Points
- **G2 rating:** 4.7 / 5 across 1,758 verified reviews (vFairs-wide; reuse unless source says otherwise)
- **Analyst recognition:** Gartner Magic Quadrant Leader; G2 Momentum Leader, Leader, High Performer (Enterprise) (reuse)
- **Customer quotes** pulled verbatim from this specific marketing page (attribute as shown: name, segment, or "Verified User, Industry")
- **Case study metrics** if the page references a named case study

If the page has no quotes or case studies, write "No quotes or case studies surfaced on the marketing page" and skip the bullet.

### Section 8: Support Model
Standard vFairs support model unless the page says otherwise:
- Dedicated project manager assigned per event
- 24/7 live chat during event windows
- Email support
- Knowledge base + Support Portal

### Section 9: Pricing Notes
Always references `context/vfairs/pricing.md`. Do not invent numbers. Default copy:
> No public pricing. Quote depends on event size, feature selection, and packaging. See `context/vfairs/pricing.md` for current indicative ranges.

### Section 10: FAQ (verbatim from marketing page)
Pull every Q&A on the page verbatim. Preserve the brand voice exactly. If the page has no FAQ, write "No FAQ block on the marketing page" and skip.

### Section 11: Related vFairs Modules
Bulleted list of sister modules with brief descriptions. Cross-link using `[Module Name](module-file.md)` format for any file already created in `platform-modules/`. Common related modules to cross-link:
- [Mobile Event App](mobile-event-app.md)
- [Badge Printing](badge-printing.md)
- [Check-In](check-in.md)
- [Event Registration](event-registration.md)
- [Event Ticketing](event-ticketing.md)
- [Virtual Event Platform](virtual-event-platform.md)
- [Lead Capture](lead-capture.md)
- [Speaker Management](speaker-management.md)
- [Exhibitor Portal](exhibitor-portal.md)
- [Abstract Management Software](abstract-management-software.md)
- [Event Analytics](event-analytics.md)
- [Event Marketing](event-marketing.md)
- [Integrations](integrations.md)

### Section 12: Source Knowledge-Base Articles (admin-facing)
List of relevant KB article titles, grouped by topic, pulled from the help.vfairs.com section for this module. Format matches mobile-event-app.md section 12. Titles only - no URLs needed (the section URL is in the frontmatter).

### Section 13 (optional)
Not always used. If the module has a unique extra dimension (e.g. integrations has "What's missing" gaps, virtual-event-platform has "3D environments gallery"), add a section 13 with a clear header. Otherwise stop at section 12.

---

## 3. Target length and density

- **Target length:** 250-500 lines per file
- **Density bar:** match `mobile-event-app.md` (350+ lines, 16 capability sub-sections, 13 verbatim FAQs)
- If the source pages are thin, the file will be shorter. Don't pad with invented features. Flag thin sources in your gap report.
- If the source pages are dense (e.g. event-registration, virtual-event-platform), the file may exceed 500 lines. That's fine.

---

## 4. Sourcing workflow

For each module:

### Step A: Find the marketing page
1. Try the obvious URL first: `https://www.vfairs.com/event-management-platform/[slug]/`
2. If 404, try variants:
   - `https://www.vfairs.com/[slug]/`
   - `https://www.vfairs.com/[slug]-software/`
   - `https://www.vfairs.com/[singular-or-plural-toggle]/`
3. If still no luck, WebFetch `https://www.vfairs.com/event-management-platform/` and search the page for the right link
4. Last resort: WebFetch `https://www.vfairs.com/sitemap.xml` or the homepage nav

**URL pattern exceptions:**
- Virtual event platform: `https://www.vfairs.com/virtual-event-platform/`
- Integrations: `https://www.vfairs.com/integrations/` (not under event-management-platform)
- Event marketing: may be under `/event-marketing-services/` or similar

### Step B: Find the KB section
1. Try: `https://help.vfairs.com/knowledge/[module-slug]`
2. If 404, try variants of the slug
3. If still nothing, WebFetch `https://help.vfairs.com/knowledge` and search for the right section
4. The KB section listing gives you article titles for section 12 of your file

### Step C: Cross-reference
- Marketing page = sections 1, 2, 4, 5, 6, 7, 10
- KB section listing = section 12 (article titles) and adds granular capabilities for section 3
- Pricing.md = section 9
- Always-on vFairs context = section 8

### Step D: Author the file
- Use the template from `mobile-event-app.md`
- Match the prose voice
- Match the bullet patterns
- Verify every claim is sourced

---

## 5. Naming conventions

- **Files:** kebab-case, .md extension. Match the module slug used on vFairs URLs where possible.
  - Right: `event-registration.md`, `badge-printing.md`, `lead-capture.md`, `virtual-event-platform.md`
  - Wrong: `EventRegistration.md`, `event_registration.md`, `eventregistration.md`
- **Frontmatter Type:** "Platform Module" + parenthetical role (Attendee-facing, Admin-facing, Sponsor-facing, Cross-cutting)
- **Last updated:** ISO date YYYY-MM-DD

---

## 6. Cross-linking rules

- Section 11 lists every related module with a 1-line description
- Use `[Module Name](module-file.md)` for any module file that already exists in `platform-modules/`
- For modules not yet built, list the name in plain text without a link
- Always include Mobile Event App, Check-In, and Lead Capture as cross-links unless the module being documented IS one of those (in which case skip the self-reference)

---

## 7. Output location

All platform-module files: `/Users/User/Documents/Documents/AI Projects/HomeBase/context/vfairs/products/platform-modules/[slug].md`

Do not write files anywhere else.

---

## 8. Gap reporting

When you finish a file, report back:
1. The file path you created
2. The exact source URLs you used (marketing + KB)
3. Any URL variants you had to try before finding the right one
4. Any facts you wanted to include but couldn't source (gaps)
5. Whether the source pages felt thin (i.e. file may need a follow-up pass)

This gap report goes back to the orchestrator and may be surfaced to Aatir.

---

## 9. Checklist before submitting a file

- [ ] Frontmatter block present (Type, Last updated, Source URLs)
- [ ] All 12 numbered sections present (or section 4/7/10 marked "skipped" with reason if no source data)
- [ ] No em dashes in body copy
- [ ] No NFC references anywhere
- [ ] No invented pricing — section 9 references pricing.md
- [ ] No "It's not X, it's Y" structures
- [ ] No AI metaphors
- [ ] No triple negation
- [ ] Section 2 headline and sub-head are verbatim from marketing page (in quotes)
- [ ] Section 10 FAQ is verbatim from marketing page
- [ ] Section 11 cross-links use `[Module Name](module-file.md)` syntax
- [ ] File saved as kebab-case .md in `platform-modules/`
- [ ] Every claim traces to vfairs.com or help.vfairs.com (no general AI knowledge)

---

## 10. Reference file

When in doubt, mirror `platform-modules/mobile-event-app.md`. It is the canonical example. Read it before you write.
