# Contributing

How to add new skills, scripts, context files, or playbooks to vFairs Marketing OS. Keep it consistent and the repo stays useful for the whole team.

---

## Before you contribute

1. **Read [SKILLS.md](SKILLS.md) first.** Make sure the thing you're about to build doesn't already exist. Marketing problems repeat; if there's a 90%-fit skill, extend it instead of duplicating.
2. **Run `npm run verify`.** If your machine isn't set up correctly, contributions will be hard to test.
3. **Read [`context/messaging/voice.md`](../context/messaging/voice.md).** Brand rules apply to anything you write that generates vFairs copy.

---

## Adding a new skill

Skills live at `.claude/skills/<skill-name>/SKILL.md`. The folder name is the slash-command (so `/audit-debt` lives at `.claude/skills/audit-debt/`).

### Folder structure

```
.claude/skills/your-skill/
├── SKILL.md              # Required. Frontmatter + instructions
├── references/           # Optional. Files SKILL.md references
│   ├── examples.md
│   └── frameworks.md
└── scripts/              # Optional. Helper scripts for this skill
    └── helper.js
```

### SKILL.md frontmatter

Every SKILL.md starts with this YAML frontmatter:

```yaml
---
name: your-skill-name
version: 1.0.0
description: When the user wants to [job], use this skill. Also use when the user mentions "[trigger phrase 1]", "[trigger phrase 2]", or "[trigger phrase 3]". For [related job], see [other-skill].
---
```

**Critical:** the `description` field is what Claude uses to decide whether to invoke your skill. It must:
- Start with the situation the skill is for ("When the user wants to...")
- List 3-5 explicit trigger phrases the user might say
- Cross-reference related skills so the user can be steered correctly

Bad description: `"This skill helps with copy"`
Good description: `"When the user wants to write, rewrite, or improve marketing copy for any page — including homepage, landing pages, pricing pages. Also use when the user says 'write copy for,' 'improve this copy,' 'rewrite this page,' 'marketing copy,' 'headline help,' or 'CTA copy.' For email copy, see email-sequence."`

### SKILL.md body

After the frontmatter, structure as:

1. **Identity / role**: "You are an expert in X. Your job is Y."
2. **Initial assessment**: any context to check first (e.g. `Read context/messaging/voice.md`, ask clarifying questions)
3. **Execution steps**: numbered, concrete steps with example commands
4. **Hard rules**: brand rules, never-do-this constraints, security rules
5. **Output format**: what the final artifact looks like

### Conventions

- **Reference repo-relative paths.** Never write `C:\Users\...` or `/Users/User/...`. Use `outputs/...`, `data/...`, `scripts/...`.
- **Load context, don't duplicate.** If a skill needs the vFairs voice rules, instruct it to `Read context/messaging/voice.md`. Don't paste them inline.
- **Save artifacts to `outputs/`** so the next skill in a chain can read them.
- **Credential references must be env-var-based.** Never hardcode a token in a SKILL.md. Use `process.env.X` references in any embedded code.
- **Mac + Windows aware.** If the skill suggests shell commands, branch on `process.platform` (`darwin` vs `win32`) where syntax differs.

### Testing a new skill

1. Restart Claude Code so it picks up the new `.claude/skills/<name>/` folder.
2. Run `/your-skill-name` and watch for: frontmatter loaded? trigger phrases work? required context files found?
3. Run with edge cases — missing URL, no internet, ambiguous input.
4. Have one other marketer test it from scratch on their machine.

---

## Adding a new script

Scripts live in `scripts/<category>/`:

| Folder | What goes here |
|---|---|
| `scripts/reporting/` | MQL, ads, GSC, marketing-report scripts. Read live data, write summaries |
| `scripts/automation/` | Slack queries, audit-debt, morning briefings, anything that talks to a third-party system to make a change |
| `scripts/analysis/whales/` | Whale prospect tracking |
| `scripts/analysis/outbound/` | Outbound campaign analysis |
| `scripts/content-ops/` | Anything that generates content artifacts (images, PDFs, decks) |
| `scripts/utils/` | Shared helpers, connection tests, sync, setup |
| `scripts/workflows/` | n8n workflow JSON exports |

### Conventions

- **Use `path.join(__dirname, ...)`** for any file access. Never hardcode paths.
- **Load `.env` from the repo root**: `require('dotenv').config({ path: path.join(__dirname, '../../.env') })` (adjust depth for your script location).
- **Check required env vars up front and exit with a clear error** if missing. See `scripts/utils/sync-data.js` for the pattern.
- **No leaked credentials.** Run `grep -E "pat-na1-|xoxp-|GOCSPX-|apify_api_|eyJhbGciOiJ" your-script.js` before committing. If anything matches, you have a secret in plaintext.
- **Output to `outputs/`** for anything a downstream skill might consume. Use a `.md`, `.json`, or `.csv` extension.
- **Top-of-file docstring** with: purpose, usage example, required env vars.

### Adding npm package dependencies

The single root `package.json` has the deps for all scripts. If your new script needs a new package:

```bash
npm install --save your-package
```

Then commit `package.json` AND `package-lock.json`. The reviewer should be able to `npm install` and have everything work.

### Testing a script

```bash
node scripts/<category>/your-script.js
```

Run from the repo root. If your script needs env vars, set them in `.env` (never in shell, never in the script).

---

## Adding context files

Context files live in `context/<subfolder>/`:

| Subfolder | What goes here |
|---|---|
| `context/company/` | About vFairs, marketing strategy, pricing, overview |
| `context/product/` | Features, modalities, branding (style guide, logos, fonts) |
| `context/icp/` | Personas, ICP scoring rubric, customer segments |
| `context/competitors/` | Per-competitor briefs (Cvent, Bizzabo, Whova, etc.) |
| `context/messaging/` | Voice, tone, hard avoids, jargon list |
| `context/playbooks/` | Process docs, framework references, expert primers |

Use `.md` for all context files. Keep them focused — one topic per file. Cross-link with relative paths.

---

## Adding a new playbook

If you find yourself chaining 3+ skills together regularly, codify it in [PLAYBOOKS.md](PLAYBOOKS.md):

1. Open a PR adding a new section
2. Use the same template as the existing playbooks: Trigger → Sequence → Result → Cadence
3. Number it sequentially

---

## The brand rules (non-negotiable)

Anything you write, generate, or commit must follow [`context/messaging/voice.md`](../context/messaging/voice.md):

- **No em dashes** in vFairs copy
- **No "It's not X, it's Y"** structures
- **No AI metaphors / dramatic imagery**
- **No "enterprise-grade," "robust," "seamless," "command center"**
- **Idioms** are out (non-native English speakers should read smoothly)
- **vFairs check-in is QR + RFID + AI facial recognition.** Never NFC.

These apply to skill descriptions, prompts, generated copy, AND documentation files.

---

## Committing changes

### What to stage

```bash
# Stage your specific changes — never `git add .` or `git add -A`
git add .claude/skills/your-skill/
git add scripts/your-category/your-script.js
git add docs/...
```

### Pre-commit checklist

- [ ] No credentials in plaintext (`grep` for the common token prefixes)
- [ ] No absolute paths (`grep -E "C:\\\\|/Users/" your-changes`)
- [ ] `.env.example` updated if you added env vars
- [ ] `docs/CREDENTIALS.md` updated if you added a credential
- [ ] `docs/SKILLS.md` updated if you added a skill
- [ ] `package.json` + `package-lock.json` committed if you added a dep
- [ ] `npm run verify` still passes
- [ ] Line endings: just trust `.gitattributes` (it normalizes everything to LF)

### Commit message format

```
<scope>: <one-line summary>

- Bullet list of what changed
- And why, if non-obvious
- Cross-reference any related skills / scripts

Example scopes: skills, scripts, context, docs, config
```

Example: `skills: add /webinar-prep for pre-event marketing checks`

### Pull requests

For now, push to `main` since the team is small. As more contributors join, switch to a PR workflow with one reviewer.

---

## Help

- **Setup issues**: `/onboarding` or Aatir or #marketing-ops
- **Skill not invoking**: probably the `description` field's trigger phrases aren't matching the user's intent. Reread the SKILL.md frontmatter section above
- **Script not running**: `npm run verify` first; nine times out of ten it's a missing env var
- **Want feedback before committing**: ask in #marketing-ops; show your SKILL.md or script
