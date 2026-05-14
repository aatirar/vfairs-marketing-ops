/**
 * ICP Persona Analysis
 *
 * Normalises champion titles into buyer personas, then cross-references
 * persona vs event type, industry, spend tier, and lead source to find
 * ICP clusters.
 *
 * No API calls — reads from top-customers-hubspot.json.
 *
 * Output: outputs/icp/icp-persona-report.md
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, '../../outputs/icp/top-customers-hubspot.json');
const OUTPUT = path.join(__dirname, '../../outputs/icp/icp-persona-report.md');

// ---------------------------------------------------------------------------
// Persona classifier
// ---------------------------------------------------------------------------

const PERSONA_RULES = [
  {
    persona: 'Events',
    keywords: [
      'event', 'conference', 'convention', 'exhibition', 'expo', 'meetings',
      'tradeshow', 'trade show', 'logistics', 'venue', 'hospitality',
    ],
  },
  {
    persona: 'HR / Talent',
    keywords: [
      'human resources', 'hr ', ' hr,', 'talent', 'recruitment', 'recruiting',
      'people ops', 'people operations', 'workforce', 'benefits',
      'employee experience', 'onboarding', 'hrbp', 'chief people',
    ],
  },
  {
    persona: 'Marketing',
    keywords: [
      'marketing', 'brand', 'communications', 'comms', 'content', 'demand gen',
      'growth', 'digital', 'campaign', 'engagement', 'media', 'advertising',
      'social media', 'public relations', 'pr ',
    ],
  },
  {
    persona: 'Executive',
    keywords: [
      'ceo', 'coo', 'cfo', 'cto', 'cmo', 'chief ', 'president', 'vp ',
      'vice president', 'svp', 'evp', 'managing director', 'executive director',
      'owner', 'founder', 'partner', 'principal',
    ],
  },
  {
    persona: 'IT / Operations',
    keywords: [
      'it ', 'information technology', 'technology', 'systems', 'platform',
      'digital experience', 'operations', 'ops', 'project manager',
      'program manager', 'programme', 'process', 'analyst',
    ],
  },
  {
    persona: 'Education / Program',
    keywords: [
      'education', 'academic', 'curriculum', 'program specialist', 'program director',
      'learning', 'training', 'development', 'university', 'professor',
      'dean', 'provost', 'registrar',
    ],
  },
];

function classifyPersona(title) {
  if (!title || title.trim() === '') return 'Unknown';
  const t = title.toLowerCase();
  for (const rule of PERSONA_RULES) {
    if (rule.keywords.some(k => t.includes(k))) return rule.persona;
  }
  return 'Other';
}

// Normalise lead source labels
function normSource(s) {
  if (!s) return 'Unknown';
  const map = {
    OFFLINE:        'Offline / Sales-led',
    PAID_SEARCH:    'Paid Search',
    ORGANIC_SEARCH: 'Organic Search',
    DIRECT_TRAFFIC: 'Direct',
    SOCIAL_MEDIA:   'Social',
    REFERRALS:      'Referral',
    EMAIL:          'Email',
  };
  return map[s] || s;
}

// Spend tier
function spendTier(spend) {
  if (spend >= 200000) return '$200K+';
  if (spend >= 100000) return '$100K-200K';
  if (spend >= 50000)  return '$50K-100K';
  return '<$50K';
}

// Simple tally helper
function tally(arr, keyFn) {
  const out = {};
  arr.forEach(v => {
    const k = keyFn(v);
    if (!out[k]) out[k] = { count: 0, spend: 0, items: [] };
    out[k].count++;
    out[k].spend += v.totalSpend || 0;
    out[k].items.push(v);
  });
  return Object.entries(out).sort((a, b) => b[1].count - a[1].count);
}

function pct(n, total) { return `${Math.round(n / total * 100)}%`; }
function money(n) { return '$' + Math.round(n).toLocaleString(); }

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const customers = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const N = customers.length;

  // Enrich each customer with derived fields
  customers.forEach((c, i) => {
    c._rank    = i + 1;
    c._persona = classifyPersona(c.hs?.championTitle);
    c._source  = normSource(c.hs?.leadSource);
    c._tier    = spendTier(c.totalSpend);
    c._empBand = empBand(c.hs?.employeeCount);
  });

  const lines = [];
  const out = (...args) => lines.push(args.join(''));

  out('# vFairs ICP Analysis — Top 100 Active Customers (2024+)');
  out('');
  out('> Generated: ', new Date().toISOString().split('T')[0]);
  out('> Source: Sandbox Sheet + HubSpot · Matched: ', customers.filter(c => c.hs?.companyId).length, '/100');
  out('');

  // -------------------------------------------------------------------------
  // 1. Persona breakdown
  // -------------------------------------------------------------------------
  out('## 1. Buyer Personas (Champion Titles)');
  out('');
  out('| Persona | # Customers | Avg ACV | % of Top 100 |');
  out('|---|---|---|---|');
  const personaTally = tally(customers, c => c._persona);
  personaTally.forEach(([persona, d]) => {
    const avg = money(d.spend / d.count);
    out(`| **${persona}** | ${d.count} | ${avg} | ${pct(d.count, N)} |`);
  });
  out('');

  // Persona × event type heatmap
  out('### Persona × Primary Event Type');
  out('');
  const personas     = personaTally.map(([p]) => p);
  const eventTypes   = [...new Set(customers.map(c => c.primaryEventType || 'Unknown'))].sort();
  const heatmap      = {};
  customers.forEach(c => {
    const key = `${c._persona}||${c.primaryEventType || 'Unknown'}`;
    heatmap[key] = (heatmap[key] || 0) + 1;
  });

  out('| Event Type | ', personas.join(' | '), ' |');
  out('|---|', personas.map(() => '---').join('|'), '|');
  eventTypes.forEach(et => {
    const row = personas.map(p => heatmap[`${p}||${et}`] || '·');
    out(`| ${et} | `, row.join(' | '), ' |');
  });
  out('');

  // -------------------------------------------------------------------------
  // 2. Industry clusters
  // -------------------------------------------------------------------------
  out('## 2. Industry Clusters');
  out('');
  out('| Industry | Customers | Total Spend | Avg ACV | Top Persona | Top Event Type |');
  out('|---|---|---|---|---|---|');

  const industryTally = tally(customers, c => c.primaryIndustry || 'Unknown');
  industryTally.slice(0, 15).forEach(([industry, d]) => {
    const avgACV   = money(d.spend / d.count);
    const topPersona = topValue(d.items, c => c._persona);
    const topEvent   = topValue(d.items, c => c.primaryEventType || '?');
    out(`| ${industry} | ${d.count} | ${money(d.spend)} | ${avgACV} | ${topPersona} | ${topEvent} |`);
  });
  out('');

  // -------------------------------------------------------------------------
  // 3. Geography breakdown
  // -------------------------------------------------------------------------
  out('## 3. Geography');
  out('');
  out('| Country | Customers | Total Spend | Avg ACV |');
  out('|---|---|---|---|');
  tally(customers, c => c.primaryCountry || 'Unknown').forEach(([country, d]) => {
    out(`| ${country} | ${d.count} | ${money(d.spend)} | ${money(d.spend / d.count)} |`);
  });
  out('');

  // -------------------------------------------------------------------------
  // 4. Company size
  // -------------------------------------------------------------------------
  out('## 4. Company Size (Employee Count)');
  out('');
  out('| Size Band | Customers | Avg ACV |');
  out('|---|---|---|');
  tally(customers, c => c._empBand).forEach(([band, d]) => {
    out(`| ${band} | ${d.count} | ${money(d.spend / d.count)} |`);
  });
  out('');

  // -------------------------------------------------------------------------
  // 5. Lead source breakdown
  // -------------------------------------------------------------------------
  out('## 5. How Top Customers Found vFairs');
  out('');
  out('| Source | Customers | % | Total Spend | Avg ACV |');
  out('|---|---|---|---|---|');
  tally(customers, c => c._source).forEach(([src, d]) => {
    out(`| ${src} | ${d.count} | ${pct(d.count, N)} | ${money(d.spend)} | ${money(d.spend / d.count)} |`);
  });
  out('');
  out('> **Note:** "Offline / Sales-led" includes in-person sourcing, referrals, and deals where digital attribution');
  out('> was not tracked. This is likely understated — many "Unknown" deals are also sales-sourced.');
  out('');

  // -------------------------------------------------------------------------
  // 6. Contract type breakdown (product mix)
  // -------------------------------------------------------------------------
  out('## 6. Product Mix (Contract Types)');
  out('');
  const contractTally = {};
  customers.forEach(c => {
    (c.contractTypes || []).forEach(ct => {
      if (!ct) return;
      if (!contractTally[ct]) contractTally[ct] = { count: 0, spend: 0 };
      contractTally[ct].count++;
      contractTally[ct].spend += c.totalSpend;
    });
  });
  out('| Contract Type | Customers | Avg ACV |');
  out('|---|---|---|');
  Object.entries(contractTally)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([ct, d]) => {
      out(`| ${ct} | ${d.count} | ${money(d.spend / d.count)} |`);
    });
  out('');

  // -------------------------------------------------------------------------
  // 7. ICP cluster synthesis
  // -------------------------------------------------------------------------
  out('## 7. ICP Cluster Synthesis');
  out('');
  out('Based on the above, three distinct ICP clusters emerge:');
  out('');

  // Compute cluster stats
  const clusters = [
    {
      name: 'Cluster A — The Professional Association',
      filter: c => {
        const ind = (c.primaryIndustry || '').toLowerCase();
        return ind.includes('non-profit') || ind.includes('association') ||
               ind.includes('civic') || ind.includes('research') ||
               (c.primaryEventType === 'Conference' && (ind.includes('education') || ind.includes('higher ed')));
      },
      description: 'Nonprofits, professional associations, and academic bodies that run annual conferences as their primary member-facing activity. The conference IS the product — not a side initiative.',
    },
    {
      name: 'Cluster B — The Enterprise Corp Running Recurring Internal Events',
      filter: c => {
        const ind = (c.primaryIndustry || '').toLowerCase();
        return (ind.includes('technology') || ind.includes('software') || ind.includes('financial') ||
                ind.includes('telecom') || ind.includes('insurance') || ind.includes('pharmaceutical') ||
                ind.includes('healthcare') || ind.includes('semiconductor')) &&
               c.primaryEventType === 'Conference';
      },
      description: 'Mid-to-large enterprises (tech, finance, pharma, telecom) running recurring internal or partner-facing conferences, summits, and benefits fairs. Events are a cost centre with an internal champion.',
    },
    {
      name: 'Cluster C — The HR / Workforce Events Buyer',
      filter: c =>
        ['Job Fair', 'Career Fair', 'Benefits Fair', 'Onboarding Fair'].includes(c.primaryEventType),
      description: 'Organizations running job fairs, career fairs, benefits enrolment fairs, and onboarding events. The buyer is almost always HR or Talent Acquisition. High repeatability — these events happen multiple times per year.',
    },
  ];

  clusters.forEach(cl => {
    const members = customers.filter(cl.filter);
    if (!members.length) return;
    const totalSpend = members.reduce((s, c) => s + c.totalSpend, 0);
    const avgACV     = totalSpend / members.length;
    const topCountry = topValue(members, c => c.primaryCountry);
    const topPersona = topValue(members, c => c._persona);
    const topSource  = topValue(members, c => c._source);

    out(`### ${cl.name}`);
    out('');
    out(`**${cl.description}**`);
    out('');
    out(`| | Value |`);
    out(`|---|---|`);
    out(`| Size | ${members.length} customers |`);
    out(`| Total spend (2024+) | ${money(totalSpend)} |`);
    out(`| Average ACV | ${money(avgACV)} |`);
    out(`| Top country | ${topCountry} |`);
    out(`| Top buyer persona | ${topPersona} |`);
    out(`| Top acquisition source | ${topSource} |`);
    out('');

    out('**Sample accounts:**');
    members.slice(0, 8).forEach(c => {
      out(`- ${c.name} (${money(c.totalSpend)}, ${c.primaryEventType}, ${c.primaryCountry})`);
    });
    out('');
  });

  // -------------------------------------------------------------------------
  // 8. Lookalike signals (actionable output)
  // -------------------------------------------------------------------------
  out('## 8. Lookalike Signals for Prospecting');
  out('');
  out('If a prospect matches 6+ of these signals, they are likely ICP-grade:');
  out('');
  out('### Cluster A — Professional Association / Nonprofit');
  out('');
  out('- [ ] Nonprofit or professional membership association');
  out('- [ ] Runs an annual conference with 500-5,000 attendees');
  out('- [ ] US, UK, or Canada HQ');
  out('- [ ] 10-500 employees (small team, events are outsourced/platformised)');
  out('- [ ] Buyer title contains "Events", "Conference", or "Director"');
  out('- [ ] Industry: Education, Healthcare, Engineering, Finance, Legal, or Science');
  out('- [ ] Has run the same event for 3+ years (recurring by mandate)');
  out('- [ ] Previously used Cvent, Hopin, or manual/spreadsheet management');
  out('');
  out('### Cluster B — Enterprise Recurring Conferences');
  out('');
  out('- [ ] 500-50,000 employees');
  out('- [ ] Industry: Tech, Software, Financial Services, Pharma, Telecom, Insurance');
  out('- [ ] Runs 2-10 internal events per year (SKOs, partner summits, customer conferences)');
  out('- [ ] US, UK, Canada, or Germany HQ');
  out('- [ ] Uses Salesforce or HubSpot (enterprise infra signal)');
  out('- [ ] Buyer title contains "Marketing", "Events", or "Senior Manager"');
  out('- [ ] Has a dedicated events budget line item');
  out('- [ ] Pain: scattered tools, poor attendee data, no single platform');
  out('');
  out('### Cluster C — HR / Workforce Events');
  out('');
  out('- [ ] Runs job fairs, career fairs, or benefits enrolment events');
  out('- [ ] 200+ employees (large enough to have recurring HR events)');
  out('- [ ] Buyer title contains "HR", "Talent", "People", or "Benefits"');
  out('- [ ] Events happen 2-6× per year (high repeat purchase signal)');
  out('- [ ] US-based (strongest market for this use case)');
  out('- [ ] Currently using Handshake, Brazen, or generic virtual meeting tools');
  out('- [ ] Government agencies, universities, large enterprises all qualify');
  out('');

  // -------------------------------------------------------------------------
  // 9. Data gaps / what Clay still needs to fill
  // -------------------------------------------------------------------------
  out('## 9. Remaining Data Gaps (Clay / Manual)');
  out('');
  out('| Field | # Missing | Priority | Notes |');
  out('|---|---|---|---|');
  const missingEmp  = customers.filter(c => !c.hs?.employeeCount).length;
  const missingRev  = customers.filter(c => !c.hs?.annualRevenue).length;
  const missingType = customers.filter(c => !c.hs?.companyType).length;
  const missingTitle = customers.filter(c => !c.hs?.championTitle).length;
  const unmatched   = customers.filter(c => !c.hs?.companyId).length;
  out(`| Employee count | ${missingEmp} | High | Core firmographic for sizing |`);
  out(`| Revenue range | ${missingRev} | High | Budget signal — hard to get free |`);
  out(`| Company type (assoc/corp/gov) | ${missingType} | High | Separates Cluster A from B |`);
  out(`| Champion title | ${missingTitle} | Medium | Already have 72/100 |`);
  out(`| Tech stack (CRM/event platform) | 100 | Medium | BuiltWith or Clay |`);
  out(`| Prior event platform | 100 | Medium | Best sourced from Gong transcripts |`);
  out(`| HubSpot unmatched | ${unmatched} | Low | Manual lookup for 17 accounts |`);
  out('');

  // Raw title list for reference
  out('## Appendix: All Champion Titles (Raw)');
  out('');
  out('| Rank | Company | Title | Persona |');
  out('|---|---|---|---|');
  customers.forEach(c => {
    const title = c.hs?.championTitle || '—';
    out(`| ${c._rank} | ${c.name.substring(0, 40)} | ${title} | ${c._persona} |`);
  });

  // Write output
  const report = lines.join('\n');
  fs.writeFileSync(OUTPUT, report);
  console.log(`Report saved: ${OUTPUT}`);

  // Console summary
  console.log('\n=== PERSONA BREAKDOWN ===');
  personaTally.forEach(([p, d]) => {
    console.log(`  ${p.padEnd(22)} ${String(d.count).padStart(3)} customers   avg ACV ${money(d.spend / d.count)}`);
  });

  console.log('\n=== LEAD SOURCE SUMMARY ===');
  tally(customers, c => c._source).forEach(([s, d]) => {
    console.log(`  ${s.padEnd(22)} ${String(d.count).padStart(3)}   avg ACV ${money(d.spend / d.count)}`);
  });

  console.log('\n=== CLUSTERS ===');
  clusters.forEach(cl => {
    const members = customers.filter(cl.filter);
    const avg = members.length ? money(members.reduce((s,c) => s+c.totalSpend,0)/members.length) : '-';
    console.log(`  ${cl.name.substring(0, 50).padEnd(50)} ${members.length} customers   avg ACV ${avg}`);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function topValue(arr, keyFn) {
  const counts = {};
  arr.forEach(v => { const k = keyFn(v); counts[k] = (counts[k] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '?';
}

function empBand(raw) {
  const n = parseInt(raw);
  if (isNaN(n) || !raw) return 'Unknown';
  if (n < 50)    return '1-49 (SMB)';
  if (n < 200)   return '50-199 (SMB+)';
  if (n < 1000)  return '200-999 (Mid-Market)';
  if (n < 5000)  return '1K-4,999 (Enterprise)';
  if (n < 25000) return '5K-24,999 (Large Enterprise)';
  return '25K+ (Global)';
}

main();
