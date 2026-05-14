const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL;
const TOKEN = process.env.N8N_API_TOKEN;
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID;

if (!N8N_URL || !TOKEN || !WORKFLOW_ID) {
  console.error('ERROR: N8N_URL, N8N_API_TOKEN, and N8N_WORKFLOW_ID must be set in .env');
  process.exit(1);
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: N8N_URL,
      port: 443,
      path,
      method,
      headers: {
        'X-N8N-API-KEY': TOKEN,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        } else {
          resolve(JSON.parse(raw));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Fetching workflow...');
  const wf = await request('GET', `/api/v1/workflows/${WORKFLOW_ID}`);

  // ── 1. Fetch HubSpot Contacts node: add hs_analytics_last_url to PROPS ──
  const fetchNode = wf.nodes.find(n => n.name === 'Fetch HubSpot Contacts');
  fetchNode.parameters.jsCode = fetchNode.parameters.jsCode.replace(
    "'first_conversion_event_name','hs_analytics_first_url',",
    "'first_conversion_event_name','hs_analytics_first_url','hs_analytics_last_url',"
  );
  console.log('✓ Added hs_analytics_last_url to PROPS');

  // ── 2. Transform to Sheet Rows node: add Last page seen output ──
  const transformNode = wf.nodes.find(n => n.name === 'Transform to Sheet Rows');
  transformNode.parameters.jsCode = transformNode.parameters.jsCode.replace(
    "'First page seen': c.hs_analytics_first_url || '',",
    "'First page seen': c.hs_analytics_first_url || '',\n      'Last page seen': c.hs_analytics_last_url || '',"
  );
  console.log('✓ Added Last page seen to Transform node');

  // ── 3. Write to Sheet node: add column mapping + schema entry ──
  const sheetNode = wf.nodes.find(n => n.name === 'Write to Sheet');
  const cols = sheetNode.parameters.columns;

  // Add to value map (after First page seen)
  const newValue = {};
  for (const [k, v] of Object.entries(cols.value)) {
    newValue[k] = v;
    if (k === 'First page seen') {
      newValue['Last page seen'] = "={{ $('Transform to Sheet Rows').item.json['Last page seen'] }}";
    }
  }
  cols.value = newValue;
  console.log('✓ Added Last page seen to column value map');

  // Add to schema (after First page seen entry)
  const fpIdx = cols.schema.findIndex(s => s.id === 'First page seen');
  cols.schema.splice(fpIdx + 1, 0, {
    id: 'Last page seen',
    displayName: 'Last page seen',
    required: false,
    defaultMatch: false,
    display: true,
    type: 'string',
    canBeUsedToMatch: true,
    removed: false
  });
  console.log('✓ Added Last page seen to schema');

  // ── 4. PUT updated workflow ──
  // Strip any extra settings properties the API rejects
  const { binaryMode, ...cleanSettings } = wf.settings || {};
  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings
  };

  console.log('Pushing update...');
  const fs = require('fs');
  const payloadPath = 'C:\\Users\\User\\AppData\\Local\\Temp\\n8n_payload_debug.json';
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2));
  console.log('Payload written to', payloadPath);
  const result = await request('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, payload);
  console.log(`✓ Done! Workflow "${result.name}" updated. Version: ${result.versionCounter}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
