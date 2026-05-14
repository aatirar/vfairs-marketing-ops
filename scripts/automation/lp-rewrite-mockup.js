/**
 * lp-rewrite-mockup.js
 *
 * Renders a /re-write payload as a vFairs-styled landing page mockup with
 * inline editing. Saves edits back to the payload JSON.
 *
 * Usage:
 *   node lp-rewrite-mockup.js <slug-or-payload-path>
 *
 * Examples:
 *   node lp-rewrite-mockup.js lead-capture-app-new
 *   node lp-rewrite-mockup.js outputs/landing-page-rewrites/lead-capture-app-new-payload.json
 *
 * Behavior:
 *   - Starts a local server on http://localhost:3030
 *   - Auto-opens the mockup in the default browser
 *   - Every heading and bullet is contenteditable
 *   - Save button writes back to the payload (with .bak backup)
 *   - Toggle to view Original vs Revised
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = parseInt(process.env.LP_MOCKUP_PORT || '3030', 10);
const PAYLOAD_DIR = path.join(__dirname, '../../outputs/landing-page-rewrites');

function resolvePayloadPath(arg) {
  if (!arg) {
    console.error('Usage: node lp-rewrite-mockup.js <slug-or-payload-path>');
    process.exit(1);
  }
  if (arg.endsWith('.json')) {
    const abs = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
    if (!fs.existsSync(abs)) {
      console.error(`Payload not found: ${abs}`);
      process.exit(1);
    }
    return abs;
  }
  const slug = arg.replace(/^\/+|\/+$/g, '').replace(/-payload$/, '').replace(/.*\//, '');
  const candidate = path.join(PAYLOAD_DIR, `${slug}-payload.json`);
  if (!fs.existsSync(candidate)) {
    console.error(`Payload not found: ${candidate}`);
    console.error(`Looked for slug "${slug}" in ${PAYLOAD_DIR}`);
    process.exit(1);
  }
  return candidate;
}

function loadPayload(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function pick(elem) {
  if (!elem) return '';
  const r = (elem.revised || '').trim();
  if (r) return r;
  const o = (elem.original || '').trim();
  if (o === '(Not present on page)') return '';
  return o;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function editable(value, dataPath, opts = {}) {
  const tag = opts.tag || 'span';
  const cls = opts.cls || '';
  const placeholder = opts.placeholder || '';
  const display = value || placeholder;
  const isPlaceholder = !value && placeholder;
  return `<${tag} class="ed ${cls}${isPlaceholder ? ' ed-empty' : ''}" contenteditable="true" data-path="${dataPath}" data-placeholder="${escapeHtml(placeholder)}">${escapeHtml(display)}</${tag}>`;
}

function renderHero(p) {
  const e = p.elements || {};
  const eyebrow = pick(e.eyebrow);
  const h1 = pick(e.h1);
  const sub = pick(e.h1_subhead);
  return `
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-left">
        <div class="trust-row">
          <span class="trust-pill"><span class="trust-dot capterra"></span>4.8/5 Capterra</span>
          <span class="trust-pill"><span class="trust-dot g2"></span>4.7/5 G2</span>
          <span class="trust-pill"><span class="trust-dot gartner"></span>Leader Gartner MQ</span>
        </div>
        ${editable(eyebrow, 'elements.eyebrow.revised', { tag: 'div', cls: 'eyebrow', placeholder: '(eyebrow)' })}
        ${editable(h1, 'elements.h1.revised', { tag: 'h1', cls: 'h1' })}
        ${editable(sub, 'elements.h1_subhead.revised', { tag: 'p', cls: 'subhead' })}
        <div class="hero-image-stub">[ hero image ]</div>
      </div>
      <div class="hero-right">
        <div class="form-card">
          <h3 class="form-title">Ready To Capture Leads?</h3>
          <div class="form-stub">
            <div class="field-row"><div class="field-stub">First name</div><div class="field-stub">Last name</div></div>
            <div class="field-stub">Business Email</div>
            <div class="field-stub">Phone Number</div>
            <div class="field-stub">Company Name</div>
            <div class="field-stub">What product are you interested in?</div>
            <div class="field-stub">Event type</div>
            <button class="btn-primary" type="button">Book a Demo</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderTrustStrip() {
  return `
  <section class="trust-strip">
    <div class="container">
      <p class="trust-headline">Trusted By Top Organizations. Recognized by Gartner &amp; G2.</p>
      <div class="logo-row">
        <span class="logo-stub">Gartner MQ</span>
        <span class="logo-stub">G2 Leader</span>
        <span class="logo-stub">G2 Momentum</span>
        <span class="logo-stub">G2 High Performer</span>
      </div>
      <div class="logo-row customer-logos">
        <span class="logo-stub">Logo 1</span>
        <span class="logo-stub">Logo 2</span>
        <span class="logo-stub">Logo 3</span>
        <span class="logo-stub">Cadence</span>
        <span class="logo-stub">Yale</span>
        <span class="logo-stub">Salesforce</span>
        <span class="logo-stub">Harbor</span>
      </div>
    </div>
  </section>`;
}

function renderMainH2(p) {
  const e = p.elements || {};
  const h2 = pick(e.main_h2);
  const sub = pick(e.main_h2_subhead);
  return `
  <section class="main-h2">
    <div class="container narrow">
      ${editable(h2, 'elements.main_h2.revised', { tag: 'h2', cls: 'h2' })}
      ${editable(sub, 'elements.main_h2_subhead.revised', { tag: 'p', cls: 'subhead', placeholder: '(add a subhead)' })}
    </div>
  </section>`;
}

function renderBodyH3s(p) {
  const list = (p.elements && p.elements.body_h3s) || [];
  if (!list.length) return '';
  return `
  <section class="body-sections">
    <div class="container">
      ${list.map((h3, i) => renderH3Block(h3, i)).join('')}
    </div>
  </section>`;
}

function renderH3Block(h3, i) {
  const heading = pick(h3);
  const eyebrow = h3.eyebrow || '';
  const bullets = Array.isArray(h3.bullets) ? h3.bullets : [];
  const isOdd = i % 2 === 1;
  const imgSide = isOdd ? 'image-right' : 'image-left';
  return `
    <div class="h3-block ${imgSide}" data-h3-index="${i}">
      <div class="h3-image-stub">[ image ${i + 1} ]</div>
      <div class="h3-text">
        ${eyebrow ? `<div class="eyebrow small">${escapeHtml(eyebrow)}</div>` : ''}
        ${editable(heading, `elements.body_h3s.${i}.revised`, { tag: 'h3', cls: 'h3' })}
        <ul class="bullets">
          ${bullets.map((b, j) => `
            <li>
              <span class="bullet-icon">✓</span>
              ${editable(pick(b), `elements.body_h3s.${i}.bullets.${j}.revised`, { tag: 'span', cls: 'bullet-text', placeholder: '(bullet)' })}
            </li>
          `).join('')}
        </ul>
      </div>
    </div>`;
}

function renderDifferentiators(p) {
  const list = (p.elements && p.elements.differentiator_h3s) || [];
  if (!list.length) return '';
  return `
  <section class="differentiators">
    <div class="container">
      <h2 class="h2 center">What Sets vFairs Apart?</h2>
      <p class="subhead center">Plan, run, market, and analyze your entire event from start to finish.</p>
      <div class="diff-grid">
        ${list.map((d, i) => `
          <div class="diff-card">
            <div class="diff-icon">★</div>
            ${editable(pick(d), `elements.differentiator_h3s.${i}.revised`, { tag: 'h4', cls: 'h4' })}
            ${d.body ? `<p class="diff-body">${escapeHtml(d.body)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderTestimonials() {
  return `
  <section class="testimonials">
    <div class="container">
      <h2 class="h2 center">What Our Customers Are Saying</h2>
      <div class="testimonial-card">
        <div class="testimonial-stub">[ Customer testimonial carousel — Cadence, Nestle, NHS, Amazon, Cornell ]</div>
      </div>
    </div>
  </section>`;
}

function renderFAQ(p) {
  const list = (p.elements && p.elements.faq_h3s) || [];
  if (!list.length) return '';
  return `
  <section class="faq">
    <div class="container">
      <h2 class="h2">Frequently Asked Questions</h2>
      <div class="faq-list">
        ${list.map((q, i) => `
          <details class="faq-item">
            <summary>
              ${editable(pick(q), `elements.faq_h3s.${i}.revised`, { tag: 'span', cls: 'faq-q' })}
              <span class="faq-toggle">+</span>
            </summary>
            <div class="faq-a">[ Answer placeholder. The /re-write skill suggests answer scaffolds in the .md report. ]</div>
          </details>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderFinalCTA(p) {
  const e = p.elements || {};
  const h2 = pick(e.final_cta_h2);
  const sub = pick(e.final_cta_h3);
  return `
  <section class="final-cta">
    <div class="container narrow center">
      ${editable(h2, 'elements.final_cta_h2.revised', { tag: 'h2', cls: 'h2' })}
      ${editable(sub, 'elements.final_cta_h3.revised', { tag: 'p', cls: 'subhead' })}
      <button class="btn-primary lg" type="button">Request Demo</button>
    </div>
  </section>`;
}

function renderHeader() {
  return `
  <header class="site-header">
    <div class="container header-row">
      <div class="logo">vFairs</div>
      <nav class="nav">
        <button class="btn-primary" type="button">Request Demo</button>
      </nav>
    </div>
  </header>`;
}

function renderSaveBar(payload, payloadPath) {
  return `
  <div id="savebar">
    <div class="savebar-inner">
      <div class="savebar-left">
        <strong>${escapeHtml(payload.url || 'untitled')}</strong>
        <span class="savebar-meta">→ ${escapeHtml(path.basename(payloadPath))}</span>
      </div>
      <div class="savebar-right">
        <label class="toggle">
          <input type="checkbox" id="show-original">
          <span>Show originals</span>
        </label>
        <span id="dirty-count" class="dirty-count">0 edits</span>
        <button id="reset-btn" class="btn-secondary" type="button">Reset</button>
        <button id="save-btn" class="btn-primary" type="button">Save</button>
      </div>
    </div>
  </div>`;
}

function buildOriginalsMap(payload) {
  // Build a flat map of data-path -> original value, so the toggle can swap.
  const out = {};
  const e = payload.elements || {};
  const flat = (key, elem) => {
    if (elem) out[`elements.${key}.revised`] = (elem.original || '').replace(/^\(Not present on page\)$/, '');
  };
  flat('eyebrow', e.eyebrow);
  flat('h1', e.h1);
  flat('h1_subhead', e.h1_subhead);
  flat('main_h2', e.main_h2);
  flat('main_h2_subhead', e.main_h2_subhead);
  flat('final_cta_h2', e.final_cta_h2);
  flat('final_cta_h3', e.final_cta_h3);
  (e.body_h3s || []).forEach((h, i) => {
    out[`elements.body_h3s.${i}.revised`] = (h.original || '');
    (h.bullets || []).forEach((b, j) => {
      out[`elements.body_h3s.${i}.bullets.${j}.revised`] = (b.original || '');
    });
  });
  (e.differentiator_h3s || []).forEach((d, i) => {
    out[`elements.differentiator_h3s.${i}.revised`] = (d.original || '');
  });
  (e.faq_h3s || []).forEach((q, i) => {
    out[`elements.faq_h3s.${i}.revised`] = (q.original || '');
  });
  return out;
}

function renderHTML(payload, payloadPath) {
  const slug = path.basename(payloadPath, '.json').replace(/-payload$/, '');
  const originalsMap = buildOriginalsMap(payload);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>vFairs Mockup — ${escapeHtml(slug)}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  ${renderSaveBar(payload, payloadPath)}
  <main id="page">
    ${renderHeader()}
    ${renderHero(payload)}
    ${renderTrustStrip()}
    ${renderMainH2(payload)}
    ${renderBodyH3s(payload)}
    ${renderDifferentiators(payload)}
    ${renderTestimonials()}
    ${renderFAQ(payload)}
    ${renderFinalCTA(payload)}
  </main>
  <script>
    window.__PAYLOAD__ = ${JSON.stringify(payload)};
    window.__ORIGINALS__ = ${JSON.stringify(originalsMap)};
    ${CLIENT_JS}
  </script>
</body>
</html>`;
}

const CSS = `
:root {
  --navy: #0f1430;
  --navy-soft: #1a1f3a;
  --body: #4a4f63;
  --muted: #8a8f9f;
  --coral: #ff5a3c;
  --coral-dark: #e64a2e;
  --hero-bg: #fdf4ee;
  --section-bg: #ffffff;
  --section-alt: #fafafa;
  --cta-bg: #fff5d6;
  --testimonial-bg: #ff7a5c;
  --line: #e5e7eb;
  --edit-ring: rgba(255, 90, 60, 0.45);
  --edit-bg: rgba(255, 90, 60, 0.06);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: var(--body);
  background: #fff;
  line-height: 1.55;
  font-size: 17px;
}
h1, h2, h3, h4 { color: var(--navy); margin: 0; line-height: 1.18; font-weight: 800; letter-spacing: -0.01em; }
.h1 { font-size: 48px; }
.h2 { font-size: 36px; font-weight: 700; }
.h3 { font-size: 28px; font-weight: 700; }
.h4 { font-size: 20px; font-weight: 700; }
.subhead { font-size: 18px; color: var(--body); margin: 14px 0 0; line-height: 1.55; }
.center { text-align: center; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
.container.narrow { max-width: 820px; }

/* Save bar */
#savebar {
  position: sticky; top: 0; z-index: 50;
  background: var(--navy); color: #fff;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.savebar-inner {
  max-width: 1340px; margin: 0 auto; padding: 12px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.savebar-left { font-size: 13px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.savebar-left strong { color: #fff; }
.savebar-meta { color: rgba(255,255,255,0.6); margin-left: 8px; }
.savebar-right { display: flex; align-items: center; gap: 12px; }
.dirty-count { font-size: 13px; color: rgba(255,255,255,0.7); }
.dirty-count.has-edits { color: #ffd95a; font-weight: 600; }
.toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.toggle input { margin: 0; }

/* Buttons */
.btn-primary {
  background: var(--coral); color: #fff; border: none;
  padding: 11px 22px; font-weight: 600; border-radius: 999px;
  font-size: 15px; cursor: pointer; transition: background 0.15s;
  font-family: inherit;
}
.btn-primary:hover { background: var(--coral-dark); }
.btn-primary.lg { padding: 14px 32px; font-size: 16px; }
.btn-secondary {
  background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3);
  padding: 9px 18px; font-weight: 500; border-radius: 999px;
  font-size: 14px; cursor: pointer; font-family: inherit;
}
.btn-secondary:hover { border-color: rgba(255,255,255,0.6); }

/* Editable */
.ed {
  outline: none;
  transition: background 0.15s, box-shadow 0.15s;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
}
.ed:hover { background: var(--edit-bg); }
.ed:focus { background: var(--edit-bg); box-shadow: 0 0 0 2px var(--edit-ring); }
.ed.ed-edited { background: rgba(255, 217, 90, 0.18); box-shadow: inset 3px 0 0 #ffd95a; }
.ed.ed-empty { color: var(--muted); font-style: italic; }
[data-mode="original"] .ed { background: rgba(0, 0, 0, 0.04); }

/* Header */
.site-header { background: #fff; border-bottom: 1px solid var(--line); }
.header-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 32px; }
.logo { font-weight: 800; font-size: 22px; color: var(--coral); letter-spacing: -0.02em; }

/* Hero */
.hero { background: var(--hero-bg); padding: 56px 0 64px; }
.hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: start; }
.trust-row { display: flex; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
.trust-pill { background: #fff; border: 1px solid var(--line); padding: 6px 12px; border-radius: 999px; font-size: 13px; color: var(--navy-soft); display: inline-flex; align-items: center; gap: 6px; }
.trust-dot { width: 8px; height: 8px; border-radius: 50%; }
.trust-dot.capterra { background: #ff7a5c; }
.trust-dot.g2 { background: #ff5a3c; }
.trust-dot.gartner { background: #0f4a8a; }
.eyebrow { text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: var(--coral); margin-bottom: 14px; }
.eyebrow.small { margin-bottom: 8px; font-size: 11px; }
.hero-image-stub { margin-top: 28px; background: #fff; border: 1px dashed var(--line); border-radius: 12px; padding: 56px; text-align: center; color: var(--muted); font-size: 13px; }
.hero-right { position: sticky; top: 80px; }
.form-card { background: #fff; border-radius: 14px; padding: 28px; box-shadow: 0 6px 30px rgba(15,20,48,0.08); border: 1px solid var(--line); }
.form-title { font-size: 22px; margin-bottom: 16px; color: var(--navy); }
.form-stub { display: flex; flex-direction: column; gap: 10px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field-stub { background: #fafafa; border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: var(--muted); }

/* Trust strip */
.trust-strip { background: #fff; padding: 36px 0 16px; border-bottom: 1px solid var(--line); }
.trust-headline { font-size: 16px; font-weight: 600; color: var(--navy); text-align: center; margin: 0 0 22px; }
.logo-row { display: flex; gap: 18px; flex-wrap: wrap; justify-content: center; margin-bottom: 18px; }
.customer-logos { padding-top: 16px; border-top: 1px solid var(--line); }
.logo-stub { background: #f4f5f8; color: var(--muted); padding: 12px 22px; border-radius: 8px; font-size: 12px; font-weight: 500; }

/* Main H2 */
.main-h2 { padding: 80px 0 32px; text-align: center; }
.main-h2 .h2 { margin-bottom: 12px; }

/* Body H3 sections */
.body-sections { padding: 32px 0 80px; }
.h3-block { display: grid; grid-template-columns: 1fr 1.2fr; gap: 56px; align-items: center; padding: 56px 0; border-bottom: 1px solid var(--line); }
.h3-block:last-child { border-bottom: none; }
.h3-block.image-right { direction: rtl; }
.h3-block.image-right > * { direction: ltr; }
.h3-image-stub { background: var(--section-alt); border: 1px dashed var(--line); border-radius: 12px; padding: 100px 32px; text-align: center; color: var(--muted); font-size: 13px; }
.h3-text { padding: 8px 0; }
.h3-text .h3 { margin: 6px 0 18px; }
.bullets { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 10px; }
.bullets li { display: flex; gap: 12px; align-items: flex-start; }
.bullet-icon {
  flex: 0 0 22px; height: 22px; width: 22px; border-radius: 50%;
  background: var(--coral); color: #fff; font-size: 13px;
  display: flex; align-items: center; justify-content: center; font-weight: 700;
  margin-top: 2px;
}
.bullet-text { flex: 1; }

/* Differentiators */
.differentiators { background: var(--section-alt); padding: 80px 0; text-align: center; }
.differentiators .subhead { max-width: 640px; margin-left: auto; margin-right: auto; margin-bottom: 40px; }
.diff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; text-align: left; }
.diff-card { background: #fff; padding: 32px; border-radius: 14px; border: 1px solid var(--line); }
.diff-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--hero-bg); color: var(--coral); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 20px; }
.diff-body { color: var(--body); font-size: 15px; margin-top: 10px; }

/* Testimonials */
.testimonials { background: var(--testimonial-bg); padding: 80px 0; color: #fff; }
.testimonials .h2 { color: #fff; margin-bottom: 32px; }
.testimonial-card { background: #fff; border-radius: 14px; padding: 80px 32px; text-align: center; color: var(--muted); font-size: 14px; }

/* FAQ */
.faq { padding: 80px 0; background: #fff; }
.faq .h2 { margin-bottom: 32px; }
.faq-list { display: flex; flex-direction: column; gap: 0; border-top: 1px solid var(--line); }
.faq-item { border-bottom: 1px solid var(--line); }
.faq-item summary { padding: 22px 0; cursor: pointer; display: flex; justify-content: space-between; gap: 16px; align-items: center; font-weight: 600; color: var(--navy); font-size: 18px; list-style: none; }
.faq-item summary::-webkit-details-marker { display: none; }
.faq-toggle { font-size: 24px; color: var(--coral); font-weight: 400; flex: 0 0 auto; }
.faq-item[open] .faq-toggle { transform: rotate(45deg); }
.faq-a { padding: 0 0 22px; color: var(--body); font-size: 15px; }
.faq-q { flex: 1; }

/* Final CTA */
.final-cta { background: var(--cta-bg); padding: 96px 0; }
.final-cta .h2 { margin-bottom: 16px; }
.final-cta .subhead { margin-bottom: 28px; }

/* Responsive */
@media (max-width: 900px) {
  .hero-grid { grid-template-columns: 1fr; }
  .h3-block { grid-template-columns: 1fr; gap: 24px; }
  .h3-block.image-right { direction: ltr; }
  .diff-grid { grid-template-columns: 1fr; }
  .h1 { font-size: 36px; }
  .h2 { font-size: 28px; }
  .h3 { font-size: 22px; }
}

/* Toast */
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: var(--navy); color: #fff;
  padding: 14px 20px; border-radius: 10px;
  font-size: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  z-index: 100;
  animation: toast-in 0.2s ease-out;
}
.toast.error { background: #c0392b; }
@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

const CLIENT_JS = `
(function () {
  const editedPaths = new Set();
  const dirtyCount = document.getElementById('dirty-count');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const showOrigToggle = document.getElementById('show-original');

  // Track edits
  document.querySelectorAll('.ed').forEach(el => {
    const initial = el.textContent;
    el.dataset.initial = initial;

    el.addEventListener('input', () => {
      const path = el.dataset.path;
      const current = el.textContent;
      if (current === el.dataset.initial) {
        editedPaths.delete(path);
        el.classList.remove('ed-edited');
      } else {
        editedPaths.add(path);
        el.classList.add('ed-edited');
      }
      updateDirty();
    });

    // Strip empty placeholder italic style on first focus
    el.addEventListener('focus', () => {
      if (el.classList.contains('ed-empty')) {
        el.textContent = '';
        el.classList.remove('ed-empty');
      }
    });
    el.addEventListener('blur', () => {
      if (!el.textContent.trim() && el.dataset.placeholder) {
        el.textContent = el.dataset.placeholder;
        el.classList.add('ed-empty');
      }
    });

    // Block Enter from creating new paragraphs (keep single-line)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
    });
    // Strip rich-text on paste
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });

  function updateDirty() {
    const n = editedPaths.size;
    dirtyCount.textContent = n + (n === 1 ? ' edit' : ' edits');
    dirtyCount.classList.toggle('has-edits', n > 0);
  }

  function setByPath(obj, pathStr, value) {
    const parts = pathStr.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      const nextKey = parts[i + 1];
      const nextIsIndex = /^\\d+$/.test(nextKey);
      if (cur[k] == null) cur[k] = nextIsIndex ? [] : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
  }

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    const payload = JSON.parse(JSON.stringify(window.__PAYLOAD__));
    payload.date_updated = new Date().toISOString().split('T')[0];

    document.querySelectorAll('.ed').forEach(el => {
      if (el.classList.contains('ed-empty')) return;
      const path = el.dataset.path;
      const value = el.textContent.trim();
      setByPath(payload, path, value);
    });

    try {
      const r = await fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.ok) {
        toast('Saved → ' + j.savedTo);
        window.__PAYLOAD__ = payload;
        document.querySelectorAll('.ed-edited').forEach(el => {
          el.classList.remove('ed-edited');
          el.dataset.initial = el.textContent;
        });
        editedPaths.clear();
        updateDirty();
      } else {
        toast('Save failed: ' + (j.error || 'unknown'), true);
      }
    } catch (err) {
      toast('Save failed: ' + err.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  resetBtn.addEventListener('click', () => {
    if (editedPaths.size === 0) return;
    if (!confirm('Discard ' + editedPaths.size + ' unsaved edits?')) return;
    document.querySelectorAll('.ed-edited').forEach(el => {
      el.textContent = el.dataset.initial;
      el.classList.remove('ed-edited');
    });
    editedPaths.clear();
    updateDirty();
  });

  showOrigToggle.addEventListener('change', () => {
    const showingOriginal = showOrigToggle.checked;
    if (showingOriginal) {
      document.body.dataset.mode = 'original';
      document.querySelectorAll('.ed').forEach(el => {
        const orig = window.__ORIGINALS__[el.dataset.path];
        el.dataset.revisedSnapshot = el.textContent;
        if (orig) { el.textContent = orig; el.classList.remove('ed-empty'); }
        else { el.textContent = '(no original)'; el.classList.add('ed-empty'); }
        el.contentEditable = 'false';
      });
    } else {
      delete document.body.dataset.mode;
      document.querySelectorAll('.ed').forEach(el => {
        if (el.dataset.revisedSnapshot != null) {
          el.textContent = el.dataset.revisedSnapshot;
          if (el.textContent.trim()) el.classList.remove('ed-empty');
          delete el.dataset.revisedSnapshot;
        }
        el.contentEditable = 'true';
      });
    }
  });

  // Toast
  function toast(msg, isError) {
    const t = document.createElement('div');
    t.className = 'toast' + (isError ? ' error' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // Cmd/Ctrl+S to save
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveBtn.click();
    }
  });
})();
`;

// ---------------- Server ----------------

function startServer(payloadPath) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
      try {
        const payload = loadPayload(payloadPath);
        const html = renderHTML(payload, payloadPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error: ' + err.message);
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/save') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const updated = JSON.parse(body);
          const backupPath = payloadPath + '.bak';
          fs.copyFileSync(payloadPath, backupPath);
          fs.writeFileSync(payloadPath, JSON.stringify(updated, null, 2) + '\n');
          console.log(`✓ Saved edits to ${path.basename(payloadPath)} (backup at ${path.basename(backupPath)})`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, savedTo: payloadPath }));
        } catch (err) {
          console.error('Save error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  vFairs LP mockup`);
    console.log(`  ----------------`);
    console.log(`  Editing: ${payloadPath}`);
    console.log(`  Open:    ${url}`);
    console.log(`  Stop:    Ctrl+C`);
    console.log('');

    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${opener} ${url}`, () => {});
  });

  return server;
}

if (require.main === module) {
  const arg = process.argv[2];
  const payloadPath = resolvePayloadPath(arg);
  startServer(payloadPath);
}

module.exports = { renderHTML, loadPayload, resolvePayloadPath };
