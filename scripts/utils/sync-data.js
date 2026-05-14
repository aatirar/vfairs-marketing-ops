#!/usr/bin/env node
/**
 * sync-data.js — pull the latest business data from the shared vFairs Marketing Drive
 *                folder into the local data/ directory.
 *
 * Run from repo root:  node scripts/utils/sync-data.js
 *                  OR: npm run sync
 *
 * Flags:
 *   --force          Re-download every file, even if it exists locally with same size
 *   --dry-run        List what would be downloaded; don't actually download
 *   --folder <id>    Override DATA_DRIVE_FOLDER_ID (handy for testing)
 *
 * Auth: uses the shared service account JSON at .config/google-credentials.json.
 * The service account must be added as Viewer on the Drive folder identified by
 * DATA_DRIVE_FOLDER_ID in .env. See docs/CREDENTIALS.md.
 *
 * Behavior:
 *   - Walks the Drive folder recursively.
 *   - Mirrors the folder structure into data/.
 *   - Skips files already present locally with matching size (unless --force).
 *   - Skips Google-native files (Docs, Sheets) — those have to be exported,
 *     not downloaded raw. If you need a Sheet as CSV, sync it manually for now.
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const REPO_ROOT = path.resolve(__dirname, '../..');
require('dotenv').config({ path: path.join(REPO_ROOT, '.env') });

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const folderArgIdx = args.indexOf('--folder');
const FOLDER_ID = folderArgIdx >= 0 ? args[folderArgIdx + 1] : process.env.DATA_DRIVE_FOLDER_ID;

const CREDS_PATH = path.join(REPO_ROOT, '.config', 'google-credentials.json');
const DATA_DIR = path.join(REPO_ROOT, 'data');

const counts = { downloaded: 0, skipped: 0, exported_skipped: 0, errors: 0 };

function log(msg) { console.log(msg); }

async function authenticate() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(`Service account JSON not found at .config/google-credentials.json. See docs/ONBOARDING.md.`);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDS_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth: await auth.getClient() });
}

async function listFolder(drive, folderId) {
  const files = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents)',
      pageSize: 1000,
      pageToken,
    });
    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return files;
}

async function downloadFile(drive, fileId, destPath) {
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  const dest = fs.createWriteStream(destPath);
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return new Promise((resolve, reject) => {
    res.data.on('end', resolve).on('error', reject).pipe(dest);
  });
}

async function walk(drive, folderId, localPath, depth = 0) {
  const entries = await listFolder(drive, folderId);
  for (const entry of entries) {
    const localEntry = path.join(localPath, entry.name);
    const indent = '  '.repeat(depth);

    if (entry.mimeType === 'application/vnd.google-apps.folder') {
      log(`${indent}📁 ${entry.name}/`);
      await walk(drive, entry.id, localEntry, depth + 1);
    } else if (entry.mimeType.startsWith('application/vnd.google-apps.')) {
      // Google-native file (Doc, Sheet, Slide, etc.) — skip; would need export
      log(`${indent}⊘ ${entry.name} [skip: Google ${entry.mimeType.split('.').pop()}, export manually]`);
      counts.exported_skipped++;
    } else {
      // Real file — check if we already have it
      let needDownload = true;
      if (!FORCE && fs.existsSync(localEntry)) {
        const localSize = fs.statSync(localEntry).size;
        const driveSize = parseInt(entry.size || '0', 10);
        if (localSize === driveSize) {
          log(`${indent}= ${entry.name} [up to date]`);
          counts.skipped++;
          needDownload = false;
        }
      }

      if (needDownload) {
        if (DRY_RUN) {
          log(`${indent}→ ${entry.name} [would download, ${entry.size || '?'} bytes]`);
        } else {
          try {
            await downloadFile(drive, entry.id, localEntry);
            log(`${indent}↓ ${entry.name} [${entry.size || '?'} bytes]`);
            counts.downloaded++;
          } catch (e) {
            log(`${indent}✗ ${entry.name} [error: ${e.message}]`);
            counts.errors++;
          }
        }
      }
    }
  }
}

async function main() {
  log('\n\x1b[1mvFairs Marketing OS — data sync\x1b[0m');
  log('================================\n');

  if (!FOLDER_ID) {
    console.error('ERROR: DATA_DRIVE_FOLDER_ID is not set in .env.');
    console.error('       Get the folder ID from the team vault entry "vFairs Marketing OS .env values"');
    console.error('       (or pass --folder <id>). See docs/CREDENTIALS.md.');
    process.exit(1);
  }

  log(`Drive folder: ${FOLDER_ID}`);
  log(`Local target: ${path.relative(REPO_ROOT, DATA_DIR)}/`);
  log(`Mode:         ${DRY_RUN ? 'DRY RUN' : (FORCE ? 'FORCE re-download' : 'incremental')}`);
  log('');

  const drive = await authenticate();

  // Verify the folder is accessible
  try {
    const meta = await drive.files.get({ fileId: FOLDER_ID, fields: 'name, mimeType' });
    if (meta.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error(`${FOLDER_ID} is not a folder`);
    }
    log(`✓ Connected. Root folder: "${meta.data.name}"\n`);
  } catch (e) {
    if (e.code === 404) {
      console.error(`ERROR: Folder ${FOLDER_ID} not found, or the service account is not added as a viewer on it.`);
      console.error('       Ask Aatir to share the folder with the service account email');
      console.error(`       (found in ${path.relative(REPO_ROOT, CREDS_PATH)} under "client_email").`);
    } else {
      console.error(`ERROR: ${e.message}`);
    }
    process.exit(2);
  }

  await walk(drive, FOLDER_ID, DATA_DIR);

  log('\n' + '='.repeat(50));
  log(`Downloaded:        ${counts.downloaded}`);
  log(`Up to date:        ${counts.skipped}`);
  log(`Google-native:     ${counts.exported_skipped} (skipped — export manually)`);
  log(`Errors:            ${counts.errors}`);
  log('='.repeat(50));

  if (counts.errors > 0) process.exit(1);
  if (DRY_RUN) log('\nDry run complete. Re-run without --dry-run to actually download.\n');
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(2);
});
