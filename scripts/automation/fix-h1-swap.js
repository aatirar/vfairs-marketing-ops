/**
 * fix-h1-swap.js
 *
 * For product/feature pages where agents captured the eyebrow <span class="sub-heading">
 * as current_h1, and the real <h1> tag as current_subheading — swap them.
 *
 * Affects: /event-management-platform/* and /features/* pages (batches 01-05)
 * SEM LP pages (batches 06-10) are correct — no changes there.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.join(__dirname, '../../outputs/h1-h2-audit');

// URLs whose current_h1 and current_subheading need to be swapped
const SWAP_URLS = new Set([
  // Batch-01 (product pages)
  'https://www.vfairs.com/event-management-platform/event-registration-software/',
  'https://www.vfairs.com/event-management-platform/event-ticketing-software/',
  'https://www.vfairs.com/event-management-platform/virtual-event-platform/',
  'https://www.vfairs.com/event-management-platform/onsite-event-badge-printing/',
  'https://www.vfairs.com/event-management-platform/onsite-event-check-in/',
  'https://www.vfairs.com/features/event-lead-capture/',
  // Batch-02 (feature pages)
  'https://www.vfairs.com/features/facial-recognition/',
  'https://www.vfairs.com/features/event-planning/',
  'https://www.vfairs.com/features/sponsor-exhibitor-management/',
  'https://www.vfairs.com/features/event-builder/',
  'https://www.vfairs.com/features/event-content-management/',
  // Batch-03 (feature pages)
  'https://www.vfairs.com/features/ai-writing-assistant/',
  'https://www.vfairs.com/features/attendee-experience/',
  'https://www.vfairs.com/features/event-networking/',
  'https://www.vfairs.com/features/event-gamification/',
  'https://www.vfairs.com/features/smart-matchmaking/',
  // Batch-04 (solution pages)
  'https://www.vfairs.com/event-management-platform/in-person-conference/',
  'https://www.vfairs.com/event-management-platform/in-person-trade-show/',
  'https://www.vfairs.com/event-management-platform/in-person-job-fair/',
  'https://www.vfairs.com/event-management-platform/virtual-conference/',
  'https://www.vfairs.com/event-management-platform/virtual-trade-show/',
  'https://www.vfairs.com/event-management-platform/virtual-job-fair/',
  // Batch-05 (feature pages)
  'https://www.vfairs.com/features/webinar-solutions/',
  'https://www.vfairs.com/features/integrations/',
  'https://www.vfairs.com/features/accessibility/',
  'https://www.vfairs.com/features/floor-plan-builder/',
]);

let totalFixed = 0;

const files = fs.readdirSync(AUDIT_DIR)
  .filter(f => f.match(/^batch-\d+\.json$/))
  .sort();

for (const file of files) {
  const filePath = path.join(AUDIT_DIR, file);
  const pages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  for (const page of pages) {
    if (SWAP_URLS.has(page.url)) {
      const oldH1 = page.current_h1;
      const oldSub = page.current_subheading;
      page.current_h1 = oldSub;
      page.current_subheading = oldH1;
      console.log(`  SWAPPED [${file}]: ${page.url}`);
      console.log(`    eyebrow (was H1): "${oldH1}"`);
      console.log(`    real H1 (was sub): "${oldSub}"`);
      totalFixed++;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(pages, null, 2));
    console.log(`  Saved ${file}\n`);
  }
}

console.log(`\nDone. Fixed ${totalFixed} pages.`);
