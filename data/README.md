# data/

This folder holds real business data that the marketing skills and scripts operate on: customer lists, MQL exports, ICP scoring data, Gong transcripts, whale tracker, contracts, and more.

**The contents of this folder are NEVER committed.** Everything except this README is gitignored. The actual data lives in a shared Google Drive folder and is pulled down to your machine on demand.

---

## How it works

1. Aatir (or an admin) maintains a shared Drive folder titled **"vFairs Marketing OS — Data"** at a known folder ID
2. The team's read-only service account (`marketing-os@…`) is added as a viewer on that folder
3. Each marketer's `.env` has `DATA_DRIVE_FOLDER_ID` set to that folder's ID (copy from vault)
4. Running `npm run sync` walks the Drive folder recursively and mirrors its structure into your local `data/`

---

## Commands

```bash
# Pull the latest data (incremental — skips files already present with same size)
npm run sync

# See what would be downloaded, without actually downloading
npm run sync:dry

# Re-download everything (use when you suspect a stale file)
npm run sync:force
```

---

## What's in here

The exact structure mirrors the Drive folder. Typical layout:

```
data/
├── mqls/                          # MQL exports (CSVs)
│   ├── ytd-mqls-2025.csv
│   └── ytd-mqls-2026.csv
├── customers/                     # Active customer lists
│   ├── customer-name-mapping.csv
│   └── customer-list.tsv
├── whales/                        # Whale prospect tracking
│   └── whale-tracker.json
├── hubspot-exports/               # Periodic HubSpot dumps
├── gong-summaries/                # Gong transcripts (if synced)
├── outbound/                      # Outbound campaign data
└── analyst-briefs/                # Gartner / Forrester briefings
```

The Drive folder owner decides what's in here. If a script complains about a missing file, run `npm run sync` first, and check whether that file exists in the Drive folder.

---

## Common errors

### "DATA_DRIVE_FOLDER_ID is not set"
Set it in your local `.env`. Get the value from the team vault entry "vFairs Marketing OS .env values".

### "Folder XYZ not found"
The service account isn't a viewer on that folder. Ask Aatir to share the Drive folder with the service account email (in `.config/google-credentials.json` under `client_email`).

### "Google-native file skipped"
The sync script skips Docs / Sheets / Slides — those would need to be exported to a fixed format. If a script needs a Sheet as CSV, export it manually from Drive and place it in `data/`.

### Quota errors
Google Drive enforces per-day download quotas on service accounts. Use `npm run sync` (incremental) rather than `npm run sync:force` to stay under quota.

---

## Adding new data files

If a marketer creates a data file the team should share:

1. Upload it to the right subfolder in the shared Drive
2. Post in #marketing-ops: "Added `<filename>` to `<subfolder>` in the data folder"
3. Other marketers run `npm run sync` to pull it down

For sensitive files (contracts, individual customer data): consider whether they belong in this shared folder at all. The Drive folder has team-wide read access.
