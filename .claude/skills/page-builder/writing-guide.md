# vFairs Page Writing Guide

> Reference doc for the `/page-builder` skill. Defines the architecture, fold structure, and copy principles for every solution, product, feature, and industry page on vFairs.com.

---

## 1. Page Taxonomy

There are four distinct page types. Each has a different primary reader and a different job to do.

| Page Type | Example | Primary Reader | Reader's Job-to-be-Done |
|---|---|---|---|
| **Solution page** | In-Person Conference | Event organizer planning a specific event format | "Can vFairs handle my specific event type end-to-end?" |
| **Product page** | Mobile Event App | Buyer evaluating a specific product | "Does this product do what I need it to do?" |
| **Feature page** | Floor Plan Builder | Champion user evaluating one specific capability | "How does this feature work and will it solve my problem?" |
| **Industry page** | Event Management Services | Vertical-specific buyer (agency, association, nonprofit) | "Does vFairs understand my world and work for my use case?" |

Each page type shares the same **fold architecture** but differs in:
- The specificity of the H1
- The depth of capability detail vs. breadth of coverage
- The vocabulary and framing of value

---

## 2. The 9-Fold Page Architecture

Every page uses this sequence. Not all folds are required on every page — see the per-type notes below.

```
[1] HERO             — Problem statement + outcome claim + CTA
[2] TRUST STRIP      — Logos + awards (credibility shortcut)
[3] FEATURE SECTIONS — 4–8 capability blocks (the page's core)
[4] SOCIAL PROOF     — Customer quote(s) + stat or case study
[5] USE CASE GRID    — Event types or verticals this applies to
[6] PRODUCT TOUR     — Embedded demo / see-it-in-action block
[7] RELATED CONTENT  — Case study, blog post, or guide (SEO value + nurture)
[8] FAQ              — 4–6 questions handling real objections
[9] CLOSING CTA      — Final conversion moment
```

### Which folds apply by page type

| Fold | Solution | Product | Feature | Industry |
|---|---|---|---|---|
| Hero | ✅ | ✅ | ✅ | ✅ |
| Trust Strip | ✅ | ✅ | ✅ | ✅ |
| Feature Sections | ✅ 6–8 | ✅ 5–7 | ✅ 4–5 + How It Works | ✅ 6–8 |
| Social Proof | ✅ | ✅ | ✅ | ✅ |
| Use Case Grid | ✅ | optional | ❌ | ✅ |
| Product Tour | optional | ✅ | ❌ | ✅ |
| Related Content | optional | ✅ | ✅ | optional |
| FAQ | ✅ | ✅ | ✅ | ✅ |
| Closing CTA | ✅ | ✅ | ✅ | ✅ |

---

## 3. Fold-by-Fold Writing Instructions

### FOLD 1: Hero

The hero has three components: H1, subheading, and CTA. This is the most important fold. If the reader doesn't stay here, nothing else matters.

**H1 formula — Anthony Pierri's ICP + Outcome model:**

> [Outcome] for [Specific ICP] — without [Key Friction]

The H1 should answer: *"What does this page help me achieve?"* — NOT: *"What is this product called?"*

**H1 rules:**
- Name the specific reader or situation, not a generic "you"
- Lead with the outcome they want, not the feature you have
- Avoid category-naming (don't just say "In-Person Conference Platform")
- Max 10 words — if it needs more than that, it's a subheading idea

**H1 examples (strong vs weak):**

| Weak (current vFairs pattern) | Strong (Pierri-informed) |
|---|---|
| "In-Person Conference Platform \| vFairs" | "Run a Flawless In-Person Conference — From Registration to Recap" |
| "Mobile Event App (Attendee Networking & Engagement)" | "Keep Every Attendee Connected Before, During, and After Your Event" |
| "Design Perfect Event Layouts with vFairs' Event Floor Plan Builder" | "Build Your Event Floor Plan in Minutes — No Design Skills Needed" |
| "Host Bespoke Events for Your Clients with vFairs" | "Give Every Client a Custom Event Experience — Under One Platform" |

**Subheading rules (Emma Stratton's clarity test):**
- Expand on the H1 with 1–2 specifics: *who* benefits and *what* changes for them
- Use concrete nouns and verbs — no abstract promises ("transform," "empower," "elevate")
- Mention 2–3 specific capabilities or outcomes, comma-separated
- Max 30 words
- Run the "so what?" test: if the subheading doesn't answer "so I can ___", rewrite it

**Subheading example:**

> "Give attendees a branded app for personalized schedules, live Q&A, push notifications, and on-the-ground wayfinding — all managed from one dashboard."

**CTAs:**
- Primary: `See [Product] in Action` or `Book a Demo`
- Secondary: `Watch 2-Min Overview` or `See Pricing`
- Never: "Get Started," "Learn More," "Submit"

---

### FOLD 2: Trust Strip

A horizontal row of 6–8 customer logos + 2–3 award badges. No copy needed.

**Rules:**
- Show logos from recognizable companies relevant to the ICP of this page
- For industry pages: bias toward logos from that industry
- For feature/product pages: show the most prestigious/recognizable logos regardless of vertical
- Awards to include: G2 Leader, Gartner Magic Quadrant, Capterra

---

### FOLD 3: Feature Sections

The core of the page. Each section = one specific capability block.

**Block anatomy:**
```
H2: [Outcome-led headline]
Body: 1–2 sentence setup explaining the problem this solves
Bullets: 3–5 "so that" bullets (capability → result)
Visual: Screenshot, GIF, or illustration
[Optional] Secondary CTA: "See How It Works" (links to demo video)
```

**H2 rules (current vFairs pattern vs. recommended):**

The current vFairs pattern is verb-first: "Simplify Event Registration," "Ease On-site Badging." These are okay but weak because they describe an action, not an outcome. Apply April Dunford's differentiator framing: don't just say what the feature does — say what you can do *now* that you couldn't do before, and *why that matters*.

| Verb-First (current) | Outcome-First (recommended) |
|---|---|
| "Simplify Event Registration & Ticketing" | "Fill Every Seat Without Chasing Registrations" |
| "Ease On-site Badging & Check-in" | "Get 500 Attendees Checked In Before Your Opening Keynote" |
| "Manage Multi-Track Agendas With Ease" | "Let Attendees Build Their Own Day — You Just Set the Schedule" |
| "Measure your Event with Reports & Analytics" | "Prove Event ROI to Every Stakeholder in One Report" |

**Bullet rules (Anthony Pierri's "so that" structure):**

Every bullet = *[What vFairs does]* so that *[attendee/organizer outcome]*.

The "so that" doesn't have to be explicit — but the outcome must be implied.

- ❌ "Enable hassle-free transactions with secure online payment integrations."
- ✅ "Process payments in 12+ currencies so international attendees register without friction."

- ❌ "Keep attendees informed about important announcements with push notifications."
- ✅ "Push real-time alerts — room changes, speaker delays, sponsor promos — directly to attendee phones."

**Body copy setup sentence:**

Before the bullets, write 1–2 sentences framing the *problem* this capability solves. This is April Dunford's "context before claim" principle — help the reader understand *why* this matters before you tell them what you do.

- ❌ Jumping straight to bullets with no setup
- ✅ "At large conferences, badge printing queues are where first impressions go to die. vFairs' on-site check-in system eliminates them."

**Number of feature sections by page type:**
- Solution page: 6–8 (covers the full event lifecycle)
- Product page: 5–7 (goes deeper on one product's capabilities)
- Feature page: 4–5 + a dedicated "How It Works" mini-fold (3 steps)
- Industry page: 6–8 (covers breadth relevant to that vertical's concerns)

---

### FOLD 4: Social Proof

One or two customer quotes + one data point. Placed mid-page to re-establish credibility before the reader considers leaving.

**Quote rules:**
- Must be specific, not generic. Generic: "vFairs is great." Specific: "vFairs badge printing allowed us to have people quickly scan in and print the needed badge upon entry. No hassle."
- Include: Name, Title, Company
- Pair with a stat if available: "450% increase in onsite check-in speed" or customer logo

**Case study callout format:**
```
[Company Logo]
[Key metric] — [Outcome in 5 words]
"[Direct customer quote — 1–2 sentences]"
— [Name], [Title]
[Link: Read the full story →]
```

---

### FOLD 5: Use Case Grid (Solution & Industry pages)

A grid of 6–8 event types or sub-verticals this solution applies to. Each cell = event type name + 1-sentence description.

**Rules:**
- For solution pages: show event format variations (in-person conference, hybrid summit, trade show, etc.)
- For industry pages: show event types the vertical commonly runs
- Descriptions should be outcome-led: not "host conferences" but "drive thought leadership at flagship annual events"

---

### FOLD 6: Product Tour (Product & Industry pages)

An embedded interactive demo or video. Short copy setup:

```
Eyebrow: "See It in Action"
H2: "Watch [Product Name] Work in 3 Minutes"
Body: "No sales call required. See how [specific use case] works from setup to event day."
CTA: "Start Product Tour" or "Watch Demo"
```

---

### FOLD 7: Related Content

One featured resource — case study, guide, or blog post — relevant to the page topic.

```
Eyebrow: "From the vFairs Library"
Title: [Linked resource title]
Description: 1-sentence summary
CTA: "Read the Story →" or "Download the Guide →"
```

---

### FOLD 8: FAQ

4–6 questions. Each FAQ should handle a real objection or concern — not just repeat feature descriptions.

**Source FAQs from:**
- "Is vFairs right for my [event size / format / industry]?"
- "How long does setup take?"
- "Does it integrate with [specific tool]?"
- "Can we white-label the app / event page?"
- "What support do you provide on event day?"

**Format:**
```
Q: [Specific, realistic question a buyer would actually ask]
A: [Direct, honest answer — 2–4 sentences. Specific over vague.]
```

**Rules:**
- Don't write FAQ questions no one asks ("What is vFairs?")
- Don't write vague answers that could apply to any product
- If the answer involves a nuance or caveat, include it — this is where you build trust

---

### FOLD 9: Closing CTA

The last fold. Recaps the core value promise and presents the CTA again.

```
H2: [Restate the core outcome from the H1 — different words]
Body: 1 sentence. Reduce perceived risk. ("No commitment required. See the platform live in 30 minutes.")
Primary CTA: "Book a Demo"
Secondary CTA: "Talk to an Expert" or "See Pricing"
```

---

## 4. Vocabulary & Voice Rules

### Words to always avoid (Emma Stratton's jargon list — adapted for vFairs)

| Jargon | Plain alternative |
|---|---|
| Seamless | Smooth / Simple / Without friction |
| Leverage | Use |
| Empower | Let / Give / Help |
| Facilitate | Run / Make possible |
| Bespoke | Custom / Tailored |
| Holistic | Complete / Full-picture |
| Robust | Capable / Powerful |
| Elevate | Improve / Lift / Step up |
| Transform | Change / Rebuild / Redefine |
| Unleash | Unlock / Access / Surface |
| Intuitive | Easy to use / Takes 5 minutes to learn |
| Best-in-class | Top-rated / #1-rated on G2 |
| Cutting-edge | [Just describe what it actually does] |
| World-class | [Cite the Gartner/G2 recognition instead] |

### Hard avoids (vFairs brand rules)
- Em dashes in body copy
- "It's not X, it's Y" sentence structures
- AI-sounding metaphors ("ship features to a whisper")
- Vague abstract language without a specific scenario behind it

### Tone calibration

vFairs speaks to event professionals who have been burned by tech that over-promised and under-delivered. The tone should be:
- **Confident but specific** — don't claim "best" without proof
- **Direct** — buyers are busy; say it plainly
- **Operational** — use the language of event day, not marketing day
- **Professional but not stiff** — no corporate speak; no exclamation points

---

## 5. Positioning Framework (April Dunford)

Every page should establish context before making claims. For each page, answer these before writing:

1. **Who is the direct competitor / alternative?** (What does this reader do today without vFairs?)
2. **What is the unique capability vFairs has vs. that alternative?**
3. **What value does that capability unlock that the alternative can't?**
4. **Who specifically benefits most from that value?**

This 4-part answer shapes the H1 + H2 framing.

**Example for Mobile Event App:**
1. Competitor/alternative: Generic event app builders or no-app experience
2. Unique capability: Fully integrated with vFairs backend — registration, agenda, badge printing, networking all sync automatically
3. Value unlocked: Organizers don't manage two systems; attendees don't switch between apps
4. Best fit: Mid-to-large event organizers running multi-track in-person or hybrid events

**Resulting H1 idea:** "One App That Runs Your Entire Event — Not Just the Agenda"

---

## 6. Emily Kramer's Messaging Ladder

Every page should ladder from bottom to top:

```
Features       → What it does (the capability)
     ↓
Benefits       → What the user can do now (the immediate value)
     ↓
Outcomes       → What changes about their event / business (the real goal)
     ↓
Positioning    → Why vFairs is the best choice for this specific reader
```

The current vFairs pages live mostly at the **Feature** and **Benefit** levels. The goal is to get pages to lead at the **Outcome** and **Positioning** level, with features and benefits as supporting evidence.

**Messaging ladder example (Badge Printing):**

- Feature: "QR-based onsite check-in using mobile event app"
- Benefit: "Attendees scan in without waiting for a staff member to find their name"
- Outcome: "Your team spends event morning on hospitality, not a check-in queue"
- Positioning: "The only event platform where check-in, badge printing, and the attendee app are one system — no third-party hardware required"

---

## 7. SEO Integration Notes

- H1 should include the primary keyword naturally (it usually will if you're naming the event type or feature correctly)
- H2s can include secondary/long-tail keywords — but only if they read naturally
- Meta title: `[Primary Keyword] | vFairs` — keep under 60 characters
- Meta description: Lead with the outcome (mirrors H1 + subheading), include a feature or proof point, end with CTA. Under 155 characters.
- FAQ questions should mirror "People Also Ask" language — write them as someone would type them into Google

---

## 8. Page-Type-Specific Checklist

### Solution Page
- [ ] H1 names the specific event format and the outcome for the organizer
- [ ] Feature sections follow the full event lifecycle (registration → check-in → engagement → analytics)
- [ ] At least one quote references a real event outcome, not a product feature
- [ ] FAQ addresses "is this right for my event size?" and "how does onsite support work?"
- [ ] Use case grid shows sub-formats or related event types

### Product Page
- [ ] H1 focuses on what attendees OR organizers can do — not what the product is called
- [ ] Feature sections highlight the cross-functional benefits (sponsor visibility + attendee experience + organizer control)
- [ ] Includes a "See How It Works" embedded tour or video
- [ ] FAQ addresses integration with other vFairs products and third-party tools

### Feature Page
- [ ] H1 leads with the output of using the feature, not the feature name
- [ ] Includes a 3-step "How It Works" mini-fold
- [ ] Bullets are granular — explains specific actions within the feature, not just its existence
- [ ] FAQ addresses "how long does it take to set up" and "what can I customize"

### Industry Page
- [ ] H1 uses ICP vocabulary — the words this vertical uses to describe their job
- [ ] Social proof logos include recognizable names from this vertical
- [ ] Feature sections are filtered to what *this audience* cares about most (not all 20 vFairs features)
- [ ] FAQ addresses "does vFairs work for my event size / type / compliance needs"
- [ ] Use case grid shows the specific event formats this vertical runs

---

## 9. Quick Reference: Fold Copy Templates

### Hero
```
[Eyebrow — optional: "For [industry/format]"]
H1: [Outcome] for [ICP] — [differentiator or anti-friction]
Subheading: [2–3 specific capabilities], [outcome 1], and [outcome 2] — all from one platform.
CTA: See It in Action  |  Watch 2-Min Overview
```

### Feature Section
```
H2: [Outcome-led headline — what changes for the reader]
Setup: [1–2 sentences framing the problem this solves]
• [Capability] — so [attendee/organizer] can [specific outcome]
• [Capability] — so [attendee/organizer] can [specific outcome]
• [Capability] — so [attendee/organizer] can [specific outcome]
[Visual: screenshot or illustration]
[Optional CTA: See How It Works →]
```

### FAQ
```
Q: [Specific, realistic buyer question]
A: [Direct 2–4 sentence answer. Specific. Honest about nuances.]
```

### Closing CTA
```
H2: [Restate core outcome — different words than H1]
Body: No commitment required. See [specific capability] in action in 30 minutes.
CTA: Book a Demo  |  Talk to an Expert
```
